// ───────────────────────────────────────────────────────────────────────────
// DER CASE-LAYOUT-GENERATOR — wie der Inhalt IM Case liegt.
//
// ─── WARUM DAS NICHT DER LADEPACKER IST ────────────────────────────────────
//
// `loadPacker/` packt einen LADERAUM, und das ist eine andere Frage, auch
// wenn beides Quader in eine Kiste legt:
//
//   * Die Öffnung liegt woanders. Ein Laderaum wird von HINTEN beladen
//     (`typen.ts`: „die Öffnung liegt bei z = lengthMm"); ein Case wird von
//     OBEN aufgemacht. Daraus folgt eine andere Reihenfolge: dort zählt die
//     Tiefe, hier die Lage.
//   * `packe()` nimmt ein `Vehicle`. Es fragt nach Nutzlast, Radkästen,
//     Ladeöffnung und Wandeinzügen. Ein Case hat davon nichts, und eines zu
//     erfinden, um den Packer zu füttern, wäre ein Fahrzeug, das es nicht
//     gibt — mit Zahlen, die jemand später für gemessen hält.
//   * Das Ergebnis wird anders benutzt. Ein Ladeplan sagt, WANN etwas ins
//     Auto geht. Ein Case-Layout sagt, WO im Schaum ein Fach sitzt — es wird
//     ausgedruckt und auf die Platte gelegt.
//
// Was gemeinsam ist, wird auch gemeinsam benutzt: `erlaubteLagen` und
// `masseInLage` aus `loadPacker/geometrie` entscheiden hier wie dort, ob ein
// Stück gekippt werden darf. Zwei Antworten auf diese Frage wären eine zu
// viel.
//
// ─── DAS KOORDINATENSYSTEM ─────────────────────────────────────────────────
//
// Millimeter, ganzzahlig, Ursprung in der Ecke hinten-links-unten des
// INNENRAUMS — dieselbe Ecke und dieselben Achsen wie im Laderaum, damit
// niemand zwei Systeme im Kopf halten muss:
//
//   x  nach rechts, 0 = linke Innenwand
//   y  nach oben,   0 = Innenboden   → die Öffnung liegt bei y = heightMm
//   z  nach hinten, 0 = Rückwand
//
// Und die Zeile, an der die Reihenfolge hängt: **was zuletzt hineingelegt
// wird, liegt in der OBERSTEN Lage** und kommt zuerst wieder heraus.
//
// ─── WAS ER IST UND WAS ER NICHT IST ───────────────────────────────────────
//
// Er ist ein VORSCHLAG für eine Fachaufteilung: Lagen von oben gesehen, je
// Fach ein Rechteck mit Mass und Platz. Das ist genug, um Schaum zu
// schneiden oder eine Kiste einzuräumen.
//
// Er ist KEIN Beweis, dass es passt. Schaum gibt nach, Kabel lassen sich
// stopfen, und ein Griff steht über. Deshalb heisst das Ergebnis
// `Vorschlag` und nicht `Plan`, und deshalb steht neben jedem Fach das
// Mass, mit dem gerechnet wurde.
//
// REIN: keine Uhr, kein Store, kein IO.
// ───────────────────────────────────────────────────────────────────────────
import { format, quelle, type Uebersetzen } from '../../i18n/quelle'
import type { CaseAusbau, CaseInnenmass } from '../types/caseAusbau'
import type { PhysicalDimensions, StorageNode } from '../types/inventory'
import type { CaseOrientation, TransportSpec } from '../types/transport'
import { erlaubteLagen, masseInLage } from './loadPacker/geometrie'

/**
 * Der Steg zwischen zwei Fächern, in mm.
 *
 * Eine WERKSTATTZAHL und keine Physik — dieselbe Ehrlichkeit wie bei
 * `VORGABE_STUETZUNG = 0.8` im Ladepacker. 15 mm ist, was ein Steg aus
 * Rasterschaum aushält, ohne beim dritten Herausnehmen umzufallen. Wer es
 * besser weiss, trägt es am Case ein.
 */
export const VORGABE_STEG_MM = 15

/** Das Innenmass — oder der Grund, aus dem es keins gibt. */
export type Innenmass =
  | { bekannt: true; mm: Required<CaseInnenmass>; quelle: 'gemessen' | 'aus-wandstaerke' }
  | { bekannt: false; grund: InnenmassGrund; text: string }

export type InnenmassGrund = 'kein-aussenmass' | 'keine-angabe' | 'wand-zu-dick'

/**
 * Was innen Platz hat.
 *
 * ─── HIER WIRD NICHTS GESCHÄTZT ────────────────────────────────────────────
 *
 * Es gibt genau zwei Wege zu einem Innenmass: jemand hat es gemessen, oder
 * jemand hat die Wandstärke angegeben und wir ziehen sie ab. Gibt es keinen
 * von beiden, ist das Ergebnis `bekannt: false` MIT Grund — und nicht
 * „Aussenmass minus zwei Zentimeter". Ein Rackcase mit 600 mm Aussentiefe
 * hat keine 580 mm innen, und wer nach dieser Zahl Schaum schneidet, hat ihn
 * umsonst geschnitten.
 *
 * Gemessen schlägt gerechnet: liegt ein Innenmass vor, gewinnt es.
 */
export function innenmass(
  node: Pick<StorageNode, 'dimensions'>,
  ausbau?: Pick<CaseAusbau, 'innenMm' | 'wandstaerkeMm'>,
  t: Uebersetzen = quelle,
): Innenmass {
  const gemessen = ausbau?.innenMm
  if (gemessen && gemessen.widthMm && gemessen.heightMm && gemessen.depthMm) {
    return {
      bekannt: true,
      quelle: 'gemessen',
      mm: { widthMm: gemessen.widthMm, heightMm: gemessen.heightMm, depthMm: gemessen.depthMm },
    }
  }

  const aussen: PhysicalDimensions | undefined = node.dimensions
  const wand = ausbau?.wandstaerkeMm
  if (wand === undefined) {
    return {
      bekannt: false,
      grund: 'keine-angabe',
      text: t(
        'caseLayout.noInner',
        'No inside dimensions recorded, and no wall thickness either. The inside does not follow from the outside — shell, foam and lid all take their share, so nothing is computed here.',
      ),
    }
  }
  if (!aussen?.widthMm || !aussen.heightMm || !aussen.depthMm) {
    return {
      bekannt: false,
      grund: 'kein-aussenmass',
      text: t(
        'caseLayout.noOuter',
        'A wall thickness is recorded, but the outside dimensions of the case are not. There is nothing to subtract it from.',
      ),
    }
  }
  const mm = {
    widthMm: aussen.widthMm - 2 * wand,
    heightMm: aussen.heightMm - 2 * wand,
    depthMm: aussen.depthMm - 2 * wand,
  }
  if (mm.widthMm <= 0 || mm.heightMm <= 0 || mm.depthMm <= 0) {
    return {
      bekannt: false,
      grund: 'wand-zu-dick',
      text: format(
        t(
          'caseLayout.wallTooThick',
          'A wall of {wand} mm leaves nothing inside this case. One of the two figures is wrong.',
        ),
        { wand },
      ),
    }
  }
  return { bekannt: true, quelle: 'aus-wandstaerke', mm }
}

/** Ein Stück, wie der Layout-Generator es sieht. */
export interface CaseStueck {
  id: string
  label: string
  /** Kantenlängen in aufrechter Lage. */
  sizeMm: { x: number; y: number; z: number }
  weightKg?: number
  transport?: TransportSpec
  /** Wieviele davon. Jedes Stück bekommt ein eigenes Fach. */
  anzahl?: number
}

/** Ein Fach im Schaum. */
export interface CaseFach {
  stueckId: string
  label: string
  /** Laufende Nummer über das ganze Case, 1-basiert — das steht im Bild. */
  nr: number
  /** Ecke hinten-links des Fachs, im Innenraum. */
  xMm: number
  zMm: number
  /** Lichte Weite des Fachs — das Mass, nach dem geschnitten wird. */
  breiteMm: number
  tiefeMm: number
  /** Was das Stück in dieser Lage aufbaut. */
  hoeheMm: number
  lage: CaseOrientation
  /** Um 90 Grad um die Hochachse gedreht — dann ist breit, was tief war. */
  gedreht: boolean
  weightKg?: number
}

/** Eine Lage: alles, was auf derselben Höhe liegt. */
export interface CaseLage {
  /** Unterkante über dem Innenboden. */
  yMm: number
  /** Höhe dieser Lage — das höchste Stück darin. */
  hoeheMm: number
  faecher: CaseFach[]
}

export type OhnePlatzGrund = 'keine-masse' | 'zu-gross' | 'kein-platz'

export interface OhnePlatz {
  stueckId: string
  label: string
  grund: OhnePlatzGrund
  text: string
}

export interface CaseBefund {
  art: 'kein-innenmass' | 'hoehe-nicht-genutzt' | 'ungewogen'
  text: string
}

export interface CaseVorschlag {
  lagen: CaseLage[]
  ohnePlatz: OhnePlatz[]
  befunde: CaseBefund[]
  /** Das Innenmass, mit dem gerechnet wurde — oder warum nicht. */
  innen: Innenmass
  /** Steg, mit dem gerechnet wurde. */
  stegMm: number
  /** Summe der gesetzten Gewichte, soweit angegeben. */
  gesetztKg: number
  /** Wieviele gesetzte Stücke KEIN Gewicht tragen. */
  ohneGewicht: number
}

export interface CaseLayoutOptions {
  /** Steg zwischen zwei Fächern. Fehlt er am Case, gilt `VORGABE_STEG_MM`. */
  stegMm?: number
  /**
   * Schaum zwischen den Fächern und der Innenwand.
   *
   * FEHLT ER, IST ER SO BREIT WIE DER STEG — und das ist keine Bequemlichkeit,
   * sondern dieselbe Sache: Schaum zwischen Fach und Wand trägt genauso wie
   * Schaum zwischen zwei Fächern, und reisst genauso aus, wenn er fehlt.
   *
   * Bis 2026-09-22 gab es ihn nicht. Das Layout legte die Stücke bündig an die
   * Innenwand, und mit der VORGABE von 1 mm Spiel ragten im Inlay sechs von
   * sieben Taschen über den Rohling. Ein Werkzeug, das bei seinen eigenen
   * Vorgaben fast alles für falsch erklärt, benutzt niemand.
   *
   * Nur waagrecht. Der Boden unter den Taschen ist `bodenMm` im Inlay; der
   * Schaum unter dem Deckel ist eine andere Platte.
   */
  randMm?: number
}

interface Kandidat {
  stueck: CaseStueck
  lage: CaseOrientation
  /** Grundfläche in dieser Lage, ohne Drehung. */
  breiteMm: number
  tiefeMm: number
  hoeheMm: number
}

/**
 * Die flachste erlaubte Lage eines Stücks.
 *
 * FLACH, weil ein Case von oben aufgemacht wird: was niedrig liegt, lässt
 * mehr Lagen darüber zu, und der Deckel geht zu. Erlaubt ist aber nur, was
 * `erlaubteLagen` hergibt — ohne Angabe ist das allein `upright`, und das
 * ist die Hausregel und keine Vorsicht: eine Kiste, von der niemand gesagt
 * hat, dass sie auf der Seite liegen darf, liegt nicht auf der Seite.
 */
function flachsteLage(s: CaseStueck): Kandidat {
  const lagen = erlaubteLagen(s.transport)
  let beste: Kandidat | null = null
  for (const lage of lagen) {
    const m = masseInLage(s.sizeMm, lage)
    const k: Kandidat = { stueck: s, lage, breiteMm: m.x, tiefeMm: m.z, hoeheMm: m.y }
    if (!beste || k.hoeheMm < beste.hoeheMm) beste = k
  }
  // `erlaubteLagen` gibt nie eine leere Liste zurück — ohne Angabe `upright`.
  return beste!
}

/**
 * Das Layout bauen.
 *
 * ─── DAS VERFAHREN, UND WARUM DIESES ───────────────────────────────────────
 *
 * Regal-Packen je Lage („shelf packing"), Stücke nach Höhe absteigend: die
 * hohen zuerst, damit sie die Lagenhöhe bestimmen und die flachen sich
 * darunter einordnen statt eine eigene Lage zu verlangen.
 *
 * Kein Extreme-Point-Solver wie im Laderaum, und zwar mit Absicht. Ein
 * Schaumausschnitt ist ein RECHTECK, und Fächer, die auf halber Höhe
 * überhängen, kann man nicht fräsen. Reihen sind hier nicht die schlechtere
 * Näherung, sondern die richtige Form — dieselbe Begründung, die im
 * Ladepacker das Raster trägt: „wo das gilt, ist freies Packen nicht
 * unnötig, sondern FALSCH".
 *
 * DETERMINISTISCH: derselbe Bestand ergibt dasselbe Layout. Wer nach einem
 * Bild Schaum schneidet, darf beim zweiten Öffnen kein anderes sehen.
 */
export function erzeugeCaseLayout(
  node: Pick<StorageNode, 'dimensions'>,
  ausbau: Pick<CaseAusbau, 'innenMm' | 'wandstaerkeMm' | 'stegMm'> | undefined,
  stuecke: readonly CaseStueck[],
  options: CaseLayoutOptions = {},
  t: Uebersetzen = quelle,
): CaseVorschlag {
  const innen = innenmass(node, ausbau, t)
  const steg = options.stegMm ?? ausbau?.stegMm ?? VORGABE_STEG_MM
  const rand = options.randMm ?? steg
  const befunde: CaseBefund[] = []
  const ohnePlatz: OhnePlatz[] = []

  if (!innen.bekannt) {
    // OHNE INNENMASS WIRD NICHTS GELEGT. Ein Layout auf geratenem Innenmass
    // sähe genauso aus wie eins auf gemessenem — und nach dem einen
    // schneidet jemand Schaum.
    befunde.push({ art: 'kein-innenmass', text: innen.text })
    return {
      lagen: [],
      ohnePlatz: stuecke.map((s) => ({
        stueckId: s.id,
        label: s.label,
        grund: 'kein-platz',
        text: innen.text,
      })),
      befunde,
      innen,
      stegMm: steg,
      gesetztKg: 0,
      ohneGewicht: 0,
    }
  }

  const raum = innen.mm
  // Das Feld, in dem gepackt wird: der Innenraum minus Rand ringsum. Gepackt
  // wird darin ab (0,0) wie bisher, und am Ende wird alles um den Rand
  // verschoben — so bleibt die Packregel eine, und der Rand eine Zeile.
  const feld = {
    widthMm: raum.widthMm - 2 * rand,
    depthMm: raum.depthMm - 2 * rand,
  }
  // Vervielfachen: zwei gleiche Funkstrecken brauchen zwei Fächer.
  const einzeln: CaseStueck[] = []
  for (const s of stuecke) {
    const n = Math.max(1, Math.floor(s.anzahl ?? 1))
    for (let i = 0; i < n; i += 1) {
      einzeln.push(n > 1 ? { ...s, id: `${s.id}#${i + 1}`, label: `${s.label} (${i + 1}/${n})` } : s)
    }
  }

  const kandidaten: Kandidat[] = []
  for (const s of einzeln) {
    if (!(s.sizeMm.x > 0 && s.sizeMm.y > 0 && s.sizeMm.z > 0)) {
      ohnePlatz.push({
        stueckId: s.id,
        label: s.label,
        grund: 'keine-masse',
        text: t(
          'caseLayout.noSize',
          'No dimensions recorded for this item — it cannot be given a compartment.',
        ),
      })
      continue
    }
    kandidaten.push(flachsteLage(s))
  }

  // Hohe zuerst, bei gleicher Höhe die breiteren — und bei völliger
  // Gleichheit die Kennung. Die letzte Stufe ist kein Beiwerk: ohne sie
  // hinge die Reihenfolge an der Eingabereihenfolge, und dasselbe Case
  // sähe nach einem Neuladen anders aus.
  kandidaten.sort(
    (a, b) =>
      b.hoeheMm - a.hoeheMm ||
      b.breiteMm - a.breiteMm ||
      b.tiefeMm - a.tiefeMm ||
      a.stueck.id.localeCompare(b.stueck.id),
  )

  const lagen: CaseLage[] = []
  let nr = 0
  let yMm = 0
  let gesetztKg = 0
  let ohneGewicht = 0

  // Eine Lage aufbauen, solange etwas übrig ist und die Höhe reicht.
  let offen = [...kandidaten]
  while (offen.length > 0) {
    const passenInsFach = offen.filter((k) => k.hoeheMm + yMm <= raum.heightMm)
    if (passenInsFach.length === 0) break

    const lagenHoehe = passenInsFach[0]!.hoeheMm
    const faecher: CaseFach[] = []
    let zMm = 0
    let reiheTiefe = 0
    let xMm = 0
    const gesetztInLage = new Set<string>()

    for (const k of passenInsFach) {
      // Das Stück darf gedreht werden — um die HOCHACHSE. Das ist keine
      // andere `CaseOrientation`: es steht weiter so herum, wie es stehen
      // darf, nur quer. Ein Fach im Schaum kennt keine Fahrtrichtung.
      const varianten: { b: number; tf: number; gedreht: boolean }[] = [
        { b: k.breiteMm, tf: k.tiefeMm, gedreht: false },
        { b: k.tiefeMm, tf: k.breiteMm, gedreht: true },
      ]
      let gesetzt = false
      for (const v of varianten) {
        const brauchtX = xMm === 0 ? v.b : xMm + steg + v.b
        if (brauchtX > feld.widthMm) continue
        const startZ = zMm
        const brauchtZ = startZ + v.tf
        if (brauchtZ > feld.depthMm) continue
        const startX = xMm === 0 ? 0 : xMm + steg
        nr += 1
        faecher.push({
          stueckId: k.stueck.id,
          label: k.stueck.label,
          nr,
          xMm: startX,
          zMm: startZ,
          breiteMm: v.b,
          tiefeMm: v.tf,
          hoeheMm: k.hoeheMm,
          lage: k.lage,
          gedreht: v.gedreht,
          weightKg: k.stueck.weightKg,
        })
        if (k.stueck.weightKg === undefined) ohneGewicht += 1
        else gesetztKg += k.stueck.weightKg
        xMm = startX + v.b
        reiheTiefe = Math.max(reiheTiefe, v.tf)
        gesetztInLage.add(k.stueck.id)
        gesetzt = true
        break
      }
      if (gesetzt) continue

      // Passt nicht mehr in diese Reihe — eine neue anfangen.
      const naechsteZ = reiheTiefe === 0 ? zMm : zMm + reiheTiefe + steg
      if (naechsteZ >= feld.depthMm) continue
      zMm = naechsteZ
      xMm = 0
      reiheTiefe = 0
      for (const v of varianten) {
        if (v.b > feld.widthMm || zMm + v.tf > feld.depthMm) continue
        nr += 1
        faecher.push({
          stueckId: k.stueck.id,
          label: k.stueck.label,
          nr,
          xMm: 0,
          zMm,
          breiteMm: v.b,
          tiefeMm: v.tf,
          hoeheMm: k.hoeheMm,
          lage: k.lage,
          gedreht: v.gedreht,
          weightKg: k.stueck.weightKg,
        })
        if (k.stueck.weightKg === undefined) ohneGewicht += 1
        else gesetztKg += k.stueck.weightKg
        xMm = v.b
        reiheTiefe = v.tf
        gesetztInLage.add(k.stueck.id)
        break
      }
    }

    if (faecher.length === 0) break
    // In den Innenraum zurück: gepackt wurde im Feld ab (0,0).
    for (const f of faecher) {
      f.xMm += rand
      f.zMm += rand
    }
    lagen.push({ yMm, hoeheMm: lagenHoehe, faecher })
    yMm += lagenHoehe + steg
    offen = offen.filter((k) => !gesetztInLage.has(k.stueck.id))
  }

  // Was übrig blieb, steht MIT Grund da.
  for (const k of offen) {
    const passtGarNicht =
      Math.min(k.breiteMm, k.tiefeMm) > Math.max(feld.widthMm, feld.depthMm) ||
      Math.max(k.breiteMm, k.tiefeMm) > Math.max(feld.widthMm, feld.depthMm) ||
      k.hoeheMm > raum.heightMm
    ohnePlatz.push({
      stueckId: k.stueck.id,
      label: k.stueck.label,
      grund: passtGarNicht ? 'zu-gross' : 'kein-platz',
      text: passtGarNicht
        ? format(
            t('caseLayout.tooBig', '{label} is larger than the inside of this case in at least one direction.'),
            { label: k.stueck.label },
          )
        : format(t('caseLayout.noRoom', 'No room left for {label} in this case.'), { label: k.stueck.label }),
    })
  }

  if (ohneGewicht > 0) {
    befunde.push({
      art: 'ungewogen',
      text: format(
        t(
          'caseLayout.unweighed',
          '{n} of the placed items have no weight recorded. The total below is what is known, not what the case weighs.',
        ),
        { n: ohneGewicht },
      ),
    })
  }
  const genutzt = yMm === 0 ? 0 : yMm - steg
  if (lagen.length > 0 && raum.heightMm - genutzt > steg * 2) {
    befunde.push({
      art: 'hoehe-nicht-genutzt',
      text: format(
        t('caseLayout.headroom', '{mm} mm of height stay free above the top layer.'),
        { mm: raum.heightMm - genutzt },
      ),
    })
  }

  return { lagen, ohnePlatz, befunde, innen, stegMm: steg, gesetztKg, ohneGewicht }
}

/**
 * Der Füllgrad der Grundfläche je Lage, 0..1.
 *
 * Grundfläche und nicht Volumen: eine Lage ist so hoch wie ihr höchstes
 * Stück, und der Luftraum über einem flachen Stück daneben ist kein
 * Verschnitt, den jemand beheben könnte — er ist die Folge davon, dass
 * beides in dieselbe Lage soll.
 */
export function fuellgrad(lage: CaseLage, innen: Required<CaseInnenmass>): number {
  const flaeche = innen.widthMm * innen.depthMm
  if (flaeche <= 0) return 0
  const belegt = lage.faecher.reduce((n, f) => n + f.breiteMm * f.tiefeMm, 0)
  return Math.min(1, belegt / flaeche)
}
