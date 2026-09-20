// ───────────────────────────────────────────────────────────────────────────
// EINBAUTEN DES FAHRZEUGS — anlegen, prüfen, und was sie eine geplante
// Ladung kosten.
//
// NUTZER-FRAGE: „Gibt es schon ein Feld wo ich Fahrzeuge hinzufügen, ändern
// und löschen kann? Ich muss ja alle Daten bearbeiten können. Auch 3d
// Laderaum anpassen."
//
// Die Ansicht „Fahrzeuge" konnte anlegen und löschen, und ändern liess sich
// das Raster, die Kantenformen und die Wiegedaten. Der Laderaum selbst —
// Länge, Breite, Höhe, die Ladeöffnung — stand nach dem Anlegen fest, und
// HINDERNISSE liessen sich überhaupt nicht eintragen: das Formular legte
// `obstructions: []` an, gezeichnet wurden sie in Draufsicht und 3D, und
// hinein kamen sie nur über den Import. Für einen ausgebauten Bus ist der
// Radkasten aber die wichtigste Angabe überhaupt.
//
// ─── WAS HIER GEPRÜFT WIRD, UND WARUM NICHT ABGELEHNT ─────────────────────
//
// Ein Hindernis, das aus dem Laderaum ragt, ist fast immer ein Tippfehler —
// aber eben nur fast immer: ein Aufbau darf an der Öffnung überstehen, und
// wer gerade misst, hat Zwischenstände. Die Prüfung MELDET deshalb und
// verbietet nicht. Was sie nicht meldet, fällt später dem Packer auf, und
// dort steht keine Zahl daneben.
//
// ─── UND WARUM DIE VERANKERTEN EXTRA GEZÄHLT WERDEN ───────────────────────
//
// Wer den Laderaum ändert, ändert die Grundlage einer Ladung, die vielleicht
// schon geplant ist. Der Packer rechnet danach neu — das ist richtig und
// kostet nichts, denn seine Platzierungen sind Vorschläge.
//
// VERANKERTE Stücke sind es nicht. Sie stehen dort, weil ein Mensch sie
// hingestellt hat, und der hatte einen Grund, den der Packer nicht kennt.
// Ein kleinerer Laderaum oder ein neuer Radkasten kann sie ungültig machen;
// sie dann still zu verschieben hiesse, diese Entscheidung wegzuräumen. Also
// werden sie GENANNT, mit Namen und Grund, und der Mensch entscheidet.
//
// REIN: keine Uhr, kein Store, kein IO.
// ───────────────────────────────────────────────────────────────────────────

import { liegtInnerhalb, masseInLage, quader, ueberlappt } from './loadPacker'
import type { LoadPlan, Vec3 } from './loadPacker'
import type { Ladung } from '../types/load'
import { quaderFrei } from './kontur'
import type { CargoObstruction, Vehicle } from '../types/vehicle'
import { format, quelle, type Uebersetzen } from '../../i18n/quelle'

export type HindernisBefundArt =
  | 'ohne-namen'
  | 'ohne-masse'
  | 'ragt-hinaus'
  | 'in-der-raumform'
  | 'ueberschneidet'

export interface HindernisBefund {
  art: HindernisBefundArt
  text: string
}

const raumVon = (v: { cargoMm: Vehicle['cargoMm'] }): Vec3 => ({
  x: v.cargoMm.widthMm,
  y: v.cargoMm.heightMm,
  z: v.cargoMm.lengthMm,
})

/**
 * Was an einem Einbau nicht stimmt. Leere Liste heisst: nichts aufgefallen.
 *
 * `andere` sind die übrigen Einbauten desselben Fahrzeugs — der zu prüfende
 * gehört NICHT hinein, sonst überschneidet er sich mit sich selbst.
 */
export function hindernisBefunde(
  vehicle: Pick<Vehicle, 'cargoMm' | 'kanten'>,
  h: CargoObstruction,
  andere: readonly CargoObstruction[],
  t: Uebersetzen = quelle,
): HindernisBefund[] {
  const out: HindernisBefund[] = []

  if (!h.name.trim()) {
    out.push({
      art: 'ohne-namen',
      text: t('obstacle.noName', 'The built-in has no name. On a load plan it would be a box nobody can place.'),
    })
  }
  if (h.sizeMm.x <= 0 || h.sizeMm.y <= 0 || h.sizeMm.z <= 0) {
    out.push({
      art: 'ohne-masse',
      text: t('obstacle.noSize', 'A built-in without measurements takes no space — and then it is not one.'),
    })
    // Ohne Masse sind die übrigen Prüfungen ohne Aussage.
    return out
  }

  const raum = raumVon(vehicle)
  const q = quader(h.originMm, h.sizeMm)

  if (!liegtInnerhalb(q, raum)) {
    out.push({
      art: 'ragt-hinaus',
      text: format(
        t('obstacle.outside', 'Sticks out of the cargo space ({l} x {b} x {h} mm). Usually a typo — the packer would count space that is not there.'),
        { l: vehicle.cargoMm.lengthMm, b: vehicle.cargoMm.widthMm, h: vehicle.cargoMm.heightMm },
      ),
    })
  } else if (!quaderFrei(vehicle.kanten, raum, h.originMm, h.sizeMm)) {
    // Erst wenn es überhaupt im Quader liegt, sagt die Raumform etwas.
    out.push({
      art: 'in-der-raumform',
      text: t('obstacle.inShape', 'Reaches into a chamfer or rounding — there is no room there in the first place.'),
    })
  }

  for (const a of andere) {
    if (ueberlappt(q, quader(a.originMm, a.sizeMm))) {
      out.push({
        art: 'ueberschneidet',
        text: format(t('obstacle.overlaps', 'Overlaps "{name}" — the space would be subtracted twice.'), {
          name: a.name || '—',
        }),
      })
    }
  }

  return out
}

export interface BetroffenesStueck {
  stueckId: string
  label: string
  grund: 'raus' | 'raumform' | 'im-einbau'
  /** Der Einbau, in dem es steht — nur bei `im-einbau`. */
  mit?: string
}

/** Ein von Hand gesetztes Stück, auf seine Geometrie eingedampft. */
export interface VerankertesStueck {
  stueckId: string
  label: string
  position: Vec3
  sizeMm: Vec3
}

/**
 * Die verankerten Stücke eines gerechneten Plans.
 *
 * Für die Ansichten, die den Plan ohnehin vor sich haben.
 */
export const verankerteAusPlan = (plan: LoadPlan | null): VerankertesStueck[] =>
  (plan?.placements ?? [])
    .filter((p) => p.verankert)
    .map((p) => ({ stueckId: p.stueckId, label: p.label, position: p.position, sizeMm: p.sizeMm }))

/**
 * Die verankerten Stücke ALLER Ladungen, die dieses Fahrzeug fahren.
 *
 * OHNE den Packer zu rufen — und das ist der Punkt: ein verankertes Stück
 * trägt seine Lage selbst (`fixiert`), es braucht keine Rechnung, um zu
 * wissen, wo es steht. Die Fahrzeug-Ansicht kann die Frage damit stellen,
 * ohne für jede Ladung einen Plan zu packen, den niemand sehen will.
 */
export function verankerteAusLadungen(
  ladungen: readonly Ladung[],
  vehicleId: string,
): VerankertesStueck[] {
  const out: VerankertesStueck[] = []
  for (const l of ladungen) {
    if (l.vehicleId !== vehicleId) continue
    for (const s of l.stuecke) {
      if (!s.fixiert || !s.dimensions) continue
      // Ein Stück ohne vollständige Masse steht zwar verankert da, lässt sich
      // aber nicht prüfen: es hätte keinen Hüllquader. Es fällt hier heraus
      // statt mit Nullen zu rechnen — eine Kiste der Grösse 0 läge überall
      // und nirgends.
      const { widthMm, heightMm, depthMm } = s.dimensions
      if (!widthMm || !heightMm || !depthMm) continue
      const grund: Vec3 = { x: widthMm, y: heightMm, z: depthMm }
      out.push({
        stueckId: s.id,
        label: s.label,
        position: s.fixiert.position,
        sizeMm: masseInLage(grund, s.fixiert.lage),
      })
    }
  }
  return out
}

/**
 * Welche VERANKERTEN Stücke ein geänderter Laderaum ungültig macht.
 *
 * Gefragt wird gegen den NEUEN Stand, bevor er gespeichert wird: wer die
 * Länge kürzt, soll vorher lesen, welche drei Kisten dann draussen stehen —
 * und nicht hinterher suchen, warum der Plan anders aussieht.
 *
 * Nicht verankerte Platzierungen kommen hier gar nicht erst an. Sie sind
 * Vorschläge des Packers; dass sie sich ändern, ist keine Nachricht.
 */
export function verankerteBetroffen(
  neu: Pick<Vehicle, 'cargoMm' | 'kanten' | 'obstructions'>,
  verankerte: readonly VerankertesStueck[],
): BetroffenesStueck[] {
  const raum = raumVon(neu)
  const out: BetroffenesStueck[] = []

  for (const p of verankerte) {
    const q = quader(p.position, p.sizeMm)
    if (!liegtInnerhalb(q, raum)) {
      out.push({ stueckId: p.stueckId, label: p.label, grund: 'raus' })
      continue
    }
    if (!quaderFrei(neu.kanten, raum, p.position, p.sizeMm)) {
      out.push({ stueckId: p.stueckId, label: p.label, grund: 'raumform' })
      continue
    }
    const einbau = neu.obstructions.find((h) => ueberlappt(q, quader(h.originMm, h.sizeMm)))
    if (einbau) {
      out.push({ stueckId: p.stueckId, label: p.label, grund: 'im-einbau', mit: einbau.name })
    }
  }

  return out
}

/** Der Satz zu einem betroffenen Stück — je Grund einer, nicht zusammengesetzt. */
export function betroffenText(b: BetroffenesStueck, t: Uebersetzen = quelle): string {
  if (b.grund === 'raus') {
    return format(t('affected.outside', '{label} would stand outside the cargo space.'), { label: b.label })
  }
  if (b.grund === 'raumform') {
    return format(t('affected.shape', '{label} would stand in a chamfer or rounding.'), { label: b.label })
  }
  return format(t('affected.inObstacle', '{label} would stand inside "{name}".'), {
    label: b.label,
    name: b.mit ?? '—',
  })
}

/**
 * Ein Radkasten-Paar, links und rechts an derselben Stelle der Länge.
 *
 * Der Laderaum hat seinen Ursprung hinten-links-unten; `x` läuft quer, `z` in
 * die Länge. Links heisst also `x = 0`, rechts `x = Breite − Kastenbreite`.
 * Beide am Boden (`y = 0`) — ein Radkasten, der in der Luft hängt, ist keiner.
 */
export function radkastenPaar(
  vehicle: Pick<Vehicle, 'cargoMm'>,
  masse: { breiteMm: number; laengeMm: number; hoeheMm: number },
  abstandVonHintenMm: number,
  name: string,
  t: Uebersetzen = quelle,
): CargoObstruction[] {
  const size: Vec3 = { x: masse.breiteMm, y: masse.hoeheMm, z: masse.laengeMm }
  const rechtsX = Math.max(0, vehicle.cargoMm.widthMm - masse.breiteMm)
  const z = Math.max(0, abstandVonHintenMm)
  const benennen = (seite: string) => (name.trim() ? `${name.trim()} ${seite}` : seite)
  return [
    {
      name: benennen(t('obstacle.left', 'left')),
      kind: 'radkasten',
      originMm: { x: 0, y: 0, z },
      sizeMm: size,
    },
    {
      name: benennen(t('obstacle.right', 'right')),
      kind: 'radkasten',
      originMm: { x: rechtsX, y: 0, z },
      sizeMm: size,
    },
  ]
}
