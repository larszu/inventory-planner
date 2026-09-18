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

/**
 * Das übliche Packmass-Raster einer Fahrzeugklasse, in mm (#21).
 *
 * Das Packmass der Branche ist 1200 × 600 und 1200 × 800, gerechnet auf
 * 2,40 m Ladebreite: 4 × 600 quer oder 3 × 800 quer, und beides geht auf.
 * Beim LKW ist das der Normalfall, beim Transporter nicht — dort ist die
 * Ladebreite 1,7 m und die Reihe geht nicht auf, also gilt dort kein Raster.
 *
 * ─── 600 UND 800 SIND ZWEI RASTER UND NICHT EINES ──────────────────────────
 *
 * Sie teilen kein brauchbares gemeinsames Netz: der grösste gemeinsame
 * Teiler ist 200, und ein 200er-Netz ist fast dasselbe wie frei. Ein Haus
 * fährt deshalb das eine ODER das andere, und genau das trägt `rasterMm` am
 * Fahrzeug. Wer 600 eingetragen hat und 1200 × 800er Cases lädt, bekommt sie
 * im gemischten Lauf als freie Stücke in die Reste — das ist richtig und
 * nicht ein Mangel des Filters: sie stehen dort nicht in der Reihe.
 * 600 ist die Vorgabe, weil sie die häufigere ist; sie steht hier als
 * Vorgabe und nicht als Wahrheit.
 *
 * Es ist eine VORGABE und keine Messung: sie steht nicht im Fahrzeug,
 * sondern wird gefragt, solange niemand etwas anderes einträgt. Wer ein
 * eigenes Raster fährt, trägt es ein und überschreibt sie.
 */
export function vorgabeRasterMm(kind: VehicleKind): number {
  if (kind === 'lkw75' || kind === 'lkw12' || kind === 'sattelzug') return 600
  return 0
}

/** Das Raster, das für dieses Fahrzeug gilt. */
export const rasterVon = (v: { kind: VehicleKind; rasterMm?: number }): number =>
  v.rasterMm ?? vorgabeRasterMm(v.kind)

/**
 * ─── DIE KANTEN DES LADERAUMS ──────────────────────────────────────────────
 *
 * Ein Hindernis erklärt, was IM Laderaum steht. Es erklärt nicht, dass der
 * Laderaum selbst keine Schachtel ist: die Dachkante eines Transporters ist
 * gerundet, die Wände eines Kastens laufen nach oben zusammen, ein
 * Kofferraum verjüngt sich zum Heck, und über dem Radlauf steht eine
 * Schräge. Das als Quader-Hindernis nachzubauen hiesse, eine Rundung mit
 * Treppenstufen zu beschreiben — und jede Stufe ist entweder zu viel Platz
 * (falsches „passt") oder zu wenig (Platz, den niemand nutzt).
 *
 * Deshalb trägt der Laderaum seine eigenen Kanten. Eine `Kantenform` nimmt
 * EINE der zwölf Kanten des Quaders und bricht sie — gerade (`fase`) oder
 * rund (`rundung`). Damit sind alle vier Fälle oben darstellbar, und zwar
 * mit zwei Zahlen statt mit einer Treppe.
 *
 * ─── WARUM NICHT EIN FREIER GRUNDRISS ──────────────────────────────────────
 *
 * Ein Polygonzug je Höhe wäre allgemeiner. Er wäre aber auch etwas, das
 * jemand mit einem Zollstock am Fahrzeug nicht aufnehmen kann: man misst
 * „die Dachkante ist auf 120 mm gerundet", nicht dreissig Stützpunkte. Das
 * Modell folgt der Messung, nicht der Mathematik.
 *
 * ─── UND DIE HAUSREGEL GILT WEITER ─────────────────────────────────────────
 *
 * Ohne Eintrag ist die Kante SCHARF. Das ist keine Annahme über das
 * Fahrzeug, sondern die konservative Richtung: eine scharfe Kante lässt
 * höchstens Platz ungenutzt. Eine geratene Rundung dagegen gäbe Platz frei,
 * den es vielleicht nicht gibt — und das ist genau die falsche Auskunft, vor
 * der der Kopf dieser Datei warnt.
 */
export type Achse = 'x' | 'y' | 'z'

/** Die beiden Enden einer Achse: `min` = 0, `max` = Kantenlänge. */
export type Seite = 'min' | 'max'

export interface Kantenform {
  /**
   * Die Achse, ENTLANG der die Kante läuft.
   *
   * `z` (Länge) ist der häufigste Fall — die Dachkanten eines Transporters
   * laufen von vorn nach hinten durch.
   */
  achse: Achse
  /**
   * Wo die Kante liegt: die Seiten der beiden ANDEREN Achsen, in
   * Achsenreihenfolge (x vor y vor z).
   *
   * Beispiel: `achse: 'z'`, `seiten: ['max', 'max']` ist die Kante
   * rechts oben, die über die ganze Länge läuft.
   */
  seiten: [Seite, Seite]
  art: 'fase' | 'rundung'
  /** Tiefe des Bruchs entlang der ERSTEN der beiden anderen Achsen, in mm. */
  aMm: number
  /** Tiefe entlang der ZWEITEN. Bei `rundung` zusammen mit `aMm` die
   *  Halbachsen — gleich gross ist der Kreis, ungleich die Ellipse. */
  bMm: number
  /** Wofür sie steht, in den Worten dessen, der gemessen hat. */
  name?: string
}

/** Die beiden Achsen, die eine Kante aufspannt — in Achsenreihenfolge. */
export function andereAchsen(achse: Achse): [Achse, Achse] {
  if (achse === 'x') return ['y', 'z']
  if (achse === 'y') return ['x', 'z']
  return ['x', 'y']
}

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
  /**
   * Was diese Achse LEER trägt, in kg — von der Waage, nicht gerechnet (#24).
   *
   * Ohne sie lässt sich nur sagen, was die LADUNG auf die Achse bringt, und
   * nicht, ob die Achse überladen ist: das Leergewicht verteilt sich nach der
   * Bauart und nicht nach einer Formel. Die Papiere nennen die zulässigen
   * Achslasten, die leeren nennt die Brückenwaage — deshalb steht sie hier
   * als eigene, optionale Angabe und wird nirgends geschätzt.
   */
  leergewichtKg?: number
}

export interface Vehicle {
  id: string
  name: string
  kind: VehicleKind
  /** Der grösste Quader; Kanten und Hindernisse werden davon abgezogen. */
  cargoMm: { lengthMm: number; widthMm: number; heightMm: number }
  /**
   * Gebrochene und gerundete Kanten des Laderaums. Fehlt die Liste, ist der
   * Raum ein scharfkantiger Quader — siehe `Kantenform`.
   */
  kanten?: Kantenform[]
  obstructions: CargoObstruction[]
  aperture?: CargoAperture
  /** Zulässige Zuladung in kg — NICHT das zulässige Gesamtgewicht. */
  nutzlastKg?: number
  leergewichtKg?: number
  zulGesamtgewichtKg?: number
  axles?: Axle[]
  /**
   * Wie weit die vordere Kante der Ladefläche (z = 0) HINTER der Vorderachse
   * liegt, in mm (#24).
   *
   * Ohne diese eine Zahl steht der Laderaum nirgends am Fahrzeug: `axles[]`
   * misst ab der Vorderachse, der Packer ab der vorderen Kante der
   * Ladefläche, und was dazwischen liegt, weiss nur das Fahrzeug. Sie zu
   * raten hiesse, einen Hebelarm zu erfinden — und ein erfundener Hebelarm
   * steht am Ende auf einem Lastverteilungsplan.
   */
  ladeflaecheAbVorderachseMm?: number
  /**
   * Das Packmass-Raster dieses Fahrzeugs in mm (#21). Fehlt es, gilt
   * `vorgabeRasterMm(kind)`; 0 heisst ausdrücklich „ohne Raster".
   */
  rasterMm?: number
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
