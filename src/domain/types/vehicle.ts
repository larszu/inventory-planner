// ───────────────────────────────────────────────────────────────────────────
// Fahrzeuge — der Laderaum, und warum er kein Quader ist
//
// ─── DER BEFUND, DER DIESE DATEI NÖTIG MACHT ───────────────────────────────
//
// Die Branche lädt nicht nur Sattelzüge. Sie lädt Sprinter, Ducato, Jumper,
// 7,5-Tonner, Anhänger und schlicht den Kofferraum. Deren Laderaum ist kein
// Quader:
//
//   · Radkästen ragen hinein und begrenzen die Breite in Bodennähe
//   · die Heckklappe ist KLEINER als der Innenraum — was nicht durch die
//     Öffnung passt, hilft nicht, dass innen Platz wäre
//   · Wände laufen nach oben zusammen, Sitzbank oder Ersatzrad stehen im Weg
//   · die Nutzlast eines 3,5-Tonners liegt oft unter 1.200 kg; er ist viel
//     schneller überladen als ein Sattelzug
//
// Ein Werkzeug, das den Laderaum als Quader führt, sagt „passt" über eine
// Ladung, die an der Heckklappe scheitert. Das ist keine Ungenauigkeit,
// sondern eine falsche Auskunft.
//
// ─── FÜHRERSCHEINKLASSE ────────────────────────────────────────────────────
//
// Die Zeile, wegen der die Disposition diese Stammdaten ohnehin braucht:
// WER DARF DAS FAHREN. Die 3,5-t-Grenze kostet in der Praxis Termine, und
// sie steht nicht im Laderaum, sondern im Fahrzeugschein.
//
// ─── UND DIE HAUSREGEL ─────────────────────────────────────────────────────
//
// Nichts erfinden. Ein Fahrzeug ohne eingetragene Nutzlast hat keine
// Nutzlast von 0 und auch keine „übliche" — es hat keine Angabe, und die
// Rechnung sagt das, statt eine Zahl zu liefern, die wie eine Messung
// aussieht. Bei einer Kontrolle wiegt die Waage.
// ───────────────────────────────────────────────────────────────────────────

/** Fahrzeugklassen, wie sie in dieser Branche vorkommen. */
export type VehicleKind =
  | 'kofferraum'
  | 'kombi'
  | 'transporter'
  | 'koffer35'
  | 'lkw75'
  | 'lkw12'
  | 'sattelzug'
  | 'anhaenger'

/** Ein Hindernis IM Laderaum: Radkasten, Sitzbank, Ersatzrad, Aufbau. */
export interface CargoObstruction {
  name: string
  kind: 'radkasten' | 'sitzbank' | 'ersatzrad' | 'aufbau' | 'sonstiges'
  /** Ursprung hinten-links-unten im Laderaum, in mm. */
  originMm: { x: number; y: number; z: number }
  sizeMm: { x: number; y: number; z: number }
}

/**
 * Die Öffnung, durch die JEDES Stück muss.
 *
 * `sillHeightMm` zählt fürs Heben, nicht fürs Passen — sie sagt, wie hoch
 * die Ladekante über Grund liegt.
 */
export interface CargoAperture {
  widthMm: number
  heightMm: number
  sillHeightMm?: number
}

/** Eine Achse und ihre zulässige Last. */
export interface Axle {
  /** Abstand von der Vorderachse in mm. */
  positionMm: number
  maxLastKg: number
}

export interface Vehicle {
  id: string
  name: string
  kind: VehicleKind
  /** Der grösste Quader; Hindernisse werden davon abgezogen. */
  cargoMm: { lengthMm: number; widthMm: number; heightMm: number }
  obstructions: CargoObstruction[]
  aperture?: CargoAperture
  /** Zulässige Zuladung in kg — NICHT das zulässige Gesamtgewicht. */
  nutzlastKg?: number
  leergewichtKg?: number
  zulGesamtgewichtKg?: number
  axles?: Axle[]
  /** Ebener Boden? Sonst sind Rollen nutzlos. */
  flatFloor?: boolean
  hebebuehneKg?: number
  /** Wer darf fahren. Der Grund, warum die Disposition diese Daten braucht. */
  fuehrerscheinKlasse?: 'B' | 'BE' | 'C1' | 'C1E' | 'C' | 'CE'
  /** Woher die Zahlen stammen. Ohne Quelle kein Stammdatensatz. */
  quelle?: string
  notes?: string
  createdAt: string
  updatedAt: string
}
