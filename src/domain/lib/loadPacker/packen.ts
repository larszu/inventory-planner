// ───────────────────────────────────────────────────────────────────────────
// Der Packer-Kern (#20, #22) — freies 3D-Bin-Packing mit Randbedingungen.
//
// ─── WARUM FREI UND NICHT NUR RASTER ───────────────────────────────────────
//
// Das Packmass 1200/800/600 ist für den LKW gemacht und geht dort im Raster
// auf. Die Branche lädt aber nicht nur so: Peli-Cases in allen Grössen,
// weiche Taschen, Stative, Traversenstücke, Rollkoffer — und das meiste davon
// in Sprinter, Ducato, Jumper oder schlicht in den Kofferraum. Dort gibt es
// kein Raster, dort gibt es Radkästen und Reste.
//
// Das Raster kommt später obendrauf (#21) und ist dann ein FILTER auf die
// Kandidatenpositionen, kein zweiter Solver. Zwei Solver hiessen zwei
// Wahrheiten darüber, ob etwas passt.
//
// ─── WAS DIESER PACKER NICHT IST ───────────────────────────────────────────
//
// Er ist nicht optimal, und er behauptet es nicht. First-Fit-Decreasing über
// Extreme Points findet eine BRAUCHBARE Anordnung in Millisekunden; das
// Optimum zu finden ist NP-schwer und für eine Crew am Dock ohne Wert. Der
// verkaufte Wert ist Sichtbarkeit, nicht Dichte.
//
// Deshalb ist auch die Reihenfolge wichtiger als die Dichte (#22): ein Plan,
// der 8 % mehr Raum nutzt, aber die Bühnenkisten hinter das Licht packt,
// kostet am Ladedock mehr Zeit, als er spart.
//
// ─── DETERMINISTISCH ───────────────────────────────────────────────────────
//
// Kein Zufall, nirgends. Jede Sortierung hat einen letzten Schlüssel, der
// eindeutig ist (die Stück-Id), und die Kandidatenpunkte kommen sortiert aus
// `absetzPunkte`. Derselbe Bestand ergibt denselben Plan — eine Crew vertraut
// keinem Plan, der sich bei jedem Klick anders anordnet.
// ───────────────────────────────────────────────────────────────────────────

import type { CaseOrientation } from '../../types/transport'
import type { Vehicle } from '../../types/vehicle'
import { quaderFrei, wandEinzuege } from '../kontur'
import { format, quelle, type Uebersetzen } from '../../../i18n/quelle'
import {
  absetzPunkte,
  bauhoehe,
  erlaubteLagen,
  liegtInnerhalb,
  masseInLage,
  quader,
  stuetzAnteil,
  ueberlappt,
} from './geometrie'
import {
  VORGABE_STUETZUNG,
  type LoadPlan,
  type PackBefund,
  type PackOptions,
  type RasterModus,
  type PackStueck,
  type Placement,
  type Quader,
  type Unplaced,
  type Vec3,
} from './typen'

/** Ein belegter Quader. `s` fehlt bei Hindernissen des Fahrzeugs. */
interface Belegt {
  q: Quader
  s?: PackStueck
}

/** Ein Kandidat: Lage plus die Masse, die sie aufbaut. */
interface Lagevariante {
  lage: CaseOrientation
  masse: Vec3
}

function lagevarianten(s: PackStueck): Lagevariante[] {
  return erlaubteLagen(s.transport).map((lage) => {
    const m = masseInLage(s.sizeMm, lage)
    // Die Bauhöhe ersetzt die reine Kantenlänge: aufrecht auf Rollen ist ein
    // Case höher, als seine Masse sagen — und genau daran scheitert sonst die
    // oberste Lage unter der Decke.
    return { lage, masse: { x: m.x, y: bauhoehe(s.sizeMm, lage, s.transport), z: m.z } }
  })
}

/** Passt diese Silhouette durch die Öffnung? `null` = keine Öffnung erfasst. */
function durchOeffnung(v: Vehicle, masse: Vec3): boolean | null {
  if (!v.aperture) return null
  return masse.x <= v.aperture.widthMm && masse.y <= v.aperture.heightMm
}

/** Die Hindernisse des Laderaums als belegte Quader. */
function hindernisse(v: Vehicle): Quader[] {
  return v.obstructions.map((h) => quader({ ...h.originMm }, { ...h.sizeMm }))
}

/**
 * Darf auf `unten` noch etwas stehen — und wenn ja, wieviel?
 *
 * Drei Regeln aus `TransportSpec`, und alle drei sind Angaben des Cases und
 * keine Vermutungen: `noLoadOnTop` (nichts obendrauf), `maxStackKg` (soviel
 * trägt der Deckel) und `maxLayers` (soviele Lagen im Stapel).
 */
function darfTragen(
  unten: PackStueck | undefined,
  oben: PackStueck,
  lagenDarunter: number,
): { ok: true } | { ok: false; grund: string } {
  if (!unten) return { ok: true }
  const t = unten.transport
  if (t?.noLoadOnTop) return { ok: false, grund: 'noLoadOnTop' }
  if (t?.maxLayers !== undefined && lagenDarunter + 1 > t.maxLayers) {
    return { ok: false, grund: 'maxLayers' }
  }
  if (t?.maxStackKg !== undefined && oben.weightKg !== undefined && oben.weightKg > t.maxStackKg) {
    return { ok: false, grund: 'maxStackKg' }
  }
  // Schwer auf leicht ist auch ohne Zahl eine schlechte Idee. Nur wenn BEIDE
  // ein Gewicht tragen — geraten wird hier nichts.
  if (unten.weightKg !== undefined && oben.weightKg !== undefined && oben.weightKg > unten.weightKg) {
    return { ok: false, grund: 'schwerAufLeicht' }
  }
  return { ok: true }
}

/** Wieviele Lagen liegen unter dieser Position? */
function lagenUnter(pos: Vec3, gesetzt: readonly Belegt[]): number {
  let n = 0
  let y = pos.y
  while (y > 0) {
    const traeger = gesetzt.find((g) => g.q.origin.y + g.q.size.y === y &&
      g.q.origin.x < pos.x + 1 && pos.x < g.q.origin.x + g.q.size.x + 1)
    if (!traeger) break
    y = traeger.q.origin.y
    n += 1
  }
  return n
}

/**
 * Die Tiefen-Vorliebe einer Gruppe (#22).
 *
 * Die Öffnung liegt bei z = lengthMm (siehe `typen.ts`). Die zuerst
 * gebrauchte Gruppe will also GROSSES z. Der Rückgabewert ist der z-Wert, den
 * diese Gruppe am liebsten hätte — der Packer sortiert seine Kandidaten
 * danach, erzwingt ihn aber nicht. Eine erzwungene Schicht liesse Kisten
 * stehen, für die hinten Platz gewesen wäre.
 */
function wunschTiefe(gruppe: string | undefined, reihenfolge: readonly string[], laenge: number): number {
  if (reihenfolge.length === 0) return 0
  const i = gruppe === undefined ? reihenfolge.length - 1 : reihenfolge.indexOf(gruppe)
  const rang = i < 0 ? reihenfolge.length - 1 : i
  // Rang 0 (zuerst gebraucht) -> nahe an der Öffnung, also grosses z.
  const anteil = reihenfolge.length === 1 ? 0 : rang / (reihenfolge.length - 1)
  return Math.round(laenge * (1 - anteil))
}

/**
 * Den Laderaum packen.
 *
 * Reihenfolge der Arbeit:
 *   1. Stücke ohne Masse fallen heraus — benannt, nicht verschwiegen.
 *   2. Verankerte Stücke werden übernommen, wie sie stehen.
 *   3. Der Rest wird nach Gruppe, dann nach Grundfläche absteigend sortiert
 *      (First-Fit-Decreasing) und an den ersten gültigen Absetzpunkt gesetzt.
 *   4. Was nicht passt, wird benannt, MIT GRUND.
 */
/**
 * Ist das Stück ein PACKMASS-Stück?
 *
 * ─── DAS RASTER LIEGT QUER UND NICHT LÄNGS ─────────────────────────────────
 *
 * Gemessen wird nur die BREITE. Die Reihe, die eine Crew erwartet, läuft
 * quer durchs Fahrzeug: 4 × 600 oder 3 × 800 auf 2,40 m, und dann geht es
 * auf. In der LÄNGE läuft die Reihe durch, so weit der Laderaum reicht —
 * ein 1200 mm tiefes Case auf einem 800er Raster steht sauber in seiner
 * Reihe, obwohl 1200 kein Vielfaches von 800 ist.
 *
 * Der erste Anlauf verlangte beide Achsen, und damit fiel genau der
 * Normalfall durch: 1200 × 800 auf 800er Raster galt als krumm. Gemessen am
 * Testfall, nicht im Kopf gerechnet.
 *
 * Die Höhe zählt ohnehin nicht mit — gestapelt wird auf dem, was darunter
 * steht.
 */
const aufsRaster = (masse: Vec3, raster: number): boolean => raster > 0 && masse.x % raster === 0

export function packe(
  v: Vehicle,
  stuecke: readonly PackStueck[],
  options: PackOptions = {},
  t: Uebersetzen = quelle,
): LoadPlan {
  const raum: Vec3 = { x: v.cargoMm.widthMm, y: v.cargoMm.heightMm, z: v.cargoMm.lengthMm }
  const einzuege = wandEinzuege(v)
  const mindest = options.mindestStuetzung ?? VORGABE_STUETZUNG
  const reihenfolge = options.gruppenReihenfolge ?? []
  const raster = options.rasterMm ?? 0
  const rasterModus: RasterModus = options.rasterModus ?? (raster > 0 ? 'raster' : 'frei')

  const placements: Placement[] = []
  const unplaced: Unplaced[] = []
  const befunde: PackBefund[] = []
  // Hindernisse zaehlen als belegt, tragen aber kein Stueck: ein Radkasten
  // hat keine Stapelregeln, er ist einfach im Weg.
  const gesetzt: Belegt[] = hindernisse(v).map((q) => ({ q }))

  if (!v.aperture) {
    befunde.push({
      art: 'oeffnung-unbekannt',
      text: t(
        'pack.noAperture',
        'No loading aperture recorded — nobody checked whether the pieces fit through the door.',
      ),
    })
  }
  if (v.nutzlastKg === undefined) {
    befunde.push({
      art: 'nutzlast-unbekannt',
      text: t('pack.noPayload', 'No payload rating recorded — the weight is added up but not checked.'),
    })
  }

  const brauchbar: PackStueck[] = []
  for (const s of stuecke) {
    if (!(s.sizeMm.x > 0 && s.sizeMm.y > 0 && s.sizeMm.z > 0)) {
      unplaced.push({
        stueckId: s.id,
        label: s.label,
        grund: 'keine-masse',
        text: t('pack.noDims', 'No outer dimensions recorded — it travels, it just cannot be laid out.'),
      })
      continue
    }
    brauchbar.push(s)
  }

  // Die Summen stehen VOR Schritt 2, nicht dazwischen: sie standen dahinter,
  // und damit zählte kein von Hand gesetztes Stück in die Zuladung — der
  // Nutzlast-Befund schwieg genau bei der Ladung, die ein Mensch selbst
  // zusammengeschoben hat.
  let gesetztKg = 0
  let ohneGewicht = 0

  // ── Schritt 2: verankerte Stücke zuerst, unverändert ────────────────────
  //
  // UNVERÄNDERT HEISST NICHT UNGEPRÜFT. Was ein Mensch von Hand absetzt, wird
  // nicht verschoben — das ist der Sinn der Verankerung. Aber eine Lage, die
  // es nicht gibt, ist keine Entscheidung: die Ansichten sagen beim Ziehen,
  // dass sie nicht geht, und wer trotzdem loslässt, hat sie sonst still im
  // Plan. Der Befund bleibt, solange sie drinsteht (ADR-005: verlustfrei
  // oder laut).
  for (const s of brauchbar.filter((x) => x.fixiert)) {
    const fix = s.fixiert!
    const masse = lagevarianten(s).find((l) => l.lage === fix.lage)?.masse ?? masseInLage(s.sizeMm, fix.lage)
    const q = quader({ ...fix.position }, masse)
    const stoert = gesetzt.find((g) => ueberlappt(q, g.q))
    if (!liegtInnerhalb(q, raum) || !quaderFrei(v.kanten, raum, q.origin, q.size)) {
      befunde.push({
        art: 'verankert-ungueltig',
        text: format(
          t('pack.anchoredOutside', '{label} was placed by hand where the cargo space is not — it sticks out.'),
          { label: s.label },
        ),
      })
    } else if (stoert) {
      befunde.push({
        art: 'verankert-ungueltig',
        text: format(
          t('pack.anchoredOverlap', '{label} was placed by hand where {other} already stands.'),
          { label: s.label, other: stoert.s?.label ?? t('pack.obstruction', 'a fixture of the vehicle') },
        ),
      })
    }
    gesetzt.push({ q, s })
    if (s.weightKg === undefined) ohneGewicht += 1
    else gesetztKg += s.weightKg
    placements.push({
      stueckId: s.id,
      label: s.label,
      position: q.origin,
      sizeMm: q.size,
      lage: fix.lage,
      gruppe: s.gruppe,
      weightKg: s.weightKg,
      // Von Hand gesetzt heisst frei gesetzt: wer eine Kiste hinschiebt,
      // trifft das Raster höchstens zufällig, und „im Raster" zu behaupten,
      // wo jemand 40 mm danebenliegt, wäre eine Auskunft über nichts.
      imRaster: raster > 0 && fix.position.x % raster === 0,
      verankert: true,
      ladeSchritt: 0,
    })
  }

  // ── Schritt 3: der Rest ─────────────────────────────────────────────────
  const offen = brauchbar
    .filter((x) => !x.fixiert)
    .sort((a, b) => {
      const ra = reihenfolge.indexOf(a.gruppe ?? '')
      const rb = reihenfolge.indexOf(b.gruppe ?? '')
      // Zuletzt gebrauchte Gruppe wird ZUERST geladen — sie muss nach hinten.
      if (ra !== rb) return rb - ra
      const fa = a.sizeMm.x * a.sizeMm.z
      const fb = b.sizeMm.x * b.sizeMm.z
      if (fa !== fb) return fb - fa
      return a.id < b.id ? -1 : 1
    })

  for (const s of offen) {
    const varianten = lagevarianten(s)

    // Öffnungsprüfung VOR der Platzsuche: ein Stück, das nicht durch die Tür
    // geht, braucht drinnen keinen Platz.
    const passtIrgendwie = varianten.some((lv) => durchOeffnung(v, lv.masse) !== false)
    if (!passtIrgendwie) {
      unplaced.push({
        stueckId: s.id,
        label: s.label,
        grund: 'passt-nicht-durch-oeffnung',
        text: t('pack.tooBigForAperture', 'Does not fit through the loading aperture in any allowed orientation.'),
      })
      continue
    }

    const ziel = wunschTiefe(s.gruppe, reihenfolge, raum.z)
    const punkte = absetzPunkte(gesetzt.map((g) => g.q), raum, einzuege)
      .sort((a, b) => Math.abs(a.z - ziel) - Math.abs(b.z - ziel) || a.y - b.y || a.x - b.x)

    let gesetztHier: Placement | null = null
    // WARUM NICHT „der letzte Grund". Der erste Anlauf merkte sich schlicht
    // den zuletzt gescheiterten Versuch — und meldete damit einen beliebigen:
    // wer als letztes an der Stuetzflaeche scheiterte, bekam „es wuerde
    // kippen", obwohl in Wahrheit kein freier Platz mehr da war. Ein Grund,
    // der von der Reihenfolge der Kandidaten abhaengt, ist keine Auskunft.
    //
    // Gemeldet wird deshalb der AUSSAGEKRAEFTIGSTE: „zu gross" schlaegt
    // „Stapelregel" schlaegt „Stuetzflaeche" schlaegt „kein Platz".
    const gruende = new Set<Unplaced['grund']>()

    suche: for (const lv of varianten) {
      if (durchOeffnung(v, lv.masse) === false) continue
      if (lv.masse.x > raum.x || lv.masse.y > raum.y || lv.masse.z > raum.z) {
        gruende.add('zu-gross')
        continue
      }

      // AUFS RASTER HEISST AUFWÄRTS UND NICHT ZUM NÄCHSTEN. Hier stand
      // `Math.round`, und das ist die falsche Richtung: die Kandidaten sind
      // die AUSSENECKEN der schon gesetzten Quader, und wer eine davon
      // abrundet, schiebt das Stück in seinen Nachbarn hinein. Der Platz
      // fiel dann als Überlapp durch — unsichtbar, und er wäre eine
      // Rasterbreite weiter frei gewesen.
      const imRaster = rasterModus === 'raster' || (rasterModus === 'gemischt' && aufsRaster(lv.masse, raster))
      for (const p of punkte) {
        const pos = imRaster && raster > 0
          ? { x: Math.ceil(p.x / raster) * raster, y: p.y, z: p.z }
          : p
        const q = quader(pos, lv.masse)
        if (!liegtInnerhalb(q, raum)) continue
        // Der Laderaum ist selten eine Schachtel: gerundete Dachkanten,
        // zusammenlaufende Waende, ein zum Heck verjuengter Kofferraum. Der
        // Huellquader allein sagt „passt", wo die Kiste an der Rundung
        // ansteht — und das ist die teure Richtung des Irrtums.
        if (!quaderFrei(v.kanten, raum, pos, lv.masse)) {
          gruende.add('raumform')
          continue
        }
        if (gesetzt.some((g) => ueberlappt(q, g.q))) continue

        const anteil = stuetzAnteil(q, gesetzt.map((g) => g.q))
        if (anteil < mindest) {
          gruende.add('stuetzflaeche')
          continue
        }

        // Wer trägt? Der Quader direkt darunter entscheidet über die
        // Stapelregeln — ein Hindernis (kein Stück) trägt ohne Einwand.
        const traeger = gesetzt.find(
          (g) => g.q.origin.y + g.q.size.y === q.origin.y &&
            g.q.origin.x < q.origin.x + q.size.x && q.origin.x < g.q.origin.x + g.q.size.x &&
            g.q.origin.z < q.origin.z + q.size.z && q.origin.z < g.q.origin.z + g.q.size.z,
        )
        const darf = darfTragen(traeger?.s, s, lagenUnter(pos, gesetzt))
        if (!darf.ok) {
          gruende.add('stapelregel')
          continue
        }

        gesetzt.push({ q, s })
        gesetztHier = {
          stueckId: s.id,
          label: s.label,
          position: q.origin,
          sizeMm: q.size,
          lage: lv.lage,
          gruppe: s.gruppe,
          weightKg: s.weightKg,
          imRaster: imRaster && raster > 0,
          verankert: false,
          ladeSchritt: 0,
        }
        placements.push(gesetztHier)
        break suche
      }
    }

    if (!gesetztHier) {
      const grund = (['zu-gross', 'raumform', 'stapelregel', 'stuetzflaeche'] as const).find((g) =>
        gruende.has(g),
      )
        ?? 'kein-platz'
      unplaced.push({ stueckId: s.id, label: s.label, grund, text: grundText(grund, t) })
      continue
    }

    if (s.weightKg === undefined) ohneGewicht += 1
    else gesetztKg += s.weightKg
  }

  // ── Ladereihenfolge nummerieren ─────────────────────────────────────────
  //
  // Geladen wird von hinten nach vorn: kleines z zuerst. Die Nummer ist der
  // Schritt beim BELADEN — beim Abladen läuft sie rückwärts, und genau das
  // will die Crew wissen.
  const sortiert = [...placements].sort((a, b) => a.position.z - b.position.z || a.position.y - b.position.y || a.position.x - b.position.x)
  sortiert.forEach((p, i) => { p.ladeSchritt = i + 1 })

  befunde.push(...reihenfolgeBefunde(placements, reihenfolge, t))

  if (v.nutzlastKg !== undefined && gesetztKg > v.nutzlastKg) {
    befunde.push({
      art: 'nutzlast-ueberschritten',
      text: t('pack.overPayload', 'The placed weight exceeds the payload rating — the plan fits, the vehicle does not.'),
    })
  }

  return { placements, unplaced, befunde, gesetztKg, ohneGewicht }
}

function grundText(grund: Unplaced['grund'], t: Uebersetzen): string {
  switch (grund) {
    case 'stuetzflaeche':
      return t('pack.noSupport', 'Nowhere to stand with enough of its base supported — it would tip.')
    case 'stapelregel':
      return t('pack.stackRule', 'A stacking rule of the case below forbids it.')
    case 'zu-gross':
      return t('pack.tooBig', 'Larger than the cargo space in every allowed orientation.')
    case 'raumform':
      return t(
        'pack.roomShape',
        'It only clears the free spots where the cargo space is chamfered or rounded — the box measure fits, the vehicle does not.',
      )
    default:
      return t('pack.noRoom', 'No free spot left that it fits into.')
  }
}

/**
 * Wo die Reihenfolge verletzt ist (#22).
 *
 * SICHTBAR MACHEN STATT STILL LÖSEN. Wenn ein Stück einer früher gebrauchten
 * Gruppe hinter einem der später gebrauchten liegt, steht es beim Abladen im
 * Weg. Der Packer ordnet das nicht um — er sagt, was es kostet, und der
 * Mensch entscheidet.
 */
function reihenfolgeBefunde(
  placements: readonly Placement[],
  reihenfolge: readonly string[],
  t: Uebersetzen,
): PackBefund[] {
  if (reihenfolge.length < 2) return []
  const rang = (g?: string) => {
    const i = g === undefined ? -1 : reihenfolge.indexOf(g)
    return i < 0 ? reihenfolge.length : i
  }

  const out: PackBefund[] = []
  for (const g of reihenfolge) {
    const eigene = placements.filter((p) => p.gruppe === g)
    if (eigene.length === 0) continue
    const vorderste = Math.max(...eigene.map((p) => p.position.z + p.sizeMm.z))
    const davor = placements.filter((p) => rang(p.gruppe) > rang(g) && p.position.z + p.sizeMm.z > vorderste)
    if (davor.length > 0) {
      out.push({
        art: 'reihenfolge-verletzt',
        text: format(
          t(
            'pack.orderConflict',
            'Group "{group}" only fits with {n} pieces of a later group standing in front of it.',
          ),
          { group: g, n: davor.length },
        ),
      })
    }
  }
  return out
}
