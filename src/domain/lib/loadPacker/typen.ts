// ───────────────────────────────────────────────────────────────────────────
// Der Packer — was hineingeht, was herauskommt (#20).
//
// ─── DAS KOORDINATENSYSTEM, EINMAL UND VERBINDLICH ─────────────────────────
//
// Millimeter, Ursprung hinten-links-unten im Laderaum — dieselbe Ecke, die
// `CargoObstruction.originMm` schon nennt. Daraus folgt:
//
//   x  quer zur Fahrtrichtung, 0 = linke Wand,  bis `cargoMm.widthMm`
//   y  nach oben,              0 = Ladefläche,  bis `cargoMm.heightMm`
//   z  in die Tiefe,           0 = HINTEN,      bis `cargoMm.lengthMm`
//
// Und damit die Zeile, an der die Ladereihenfolge hängt: **die Öffnung liegt
// bei z = lengthMm.** Was zuerst wieder heraus soll, liegt bei GROSSEM z.
//
// Das stand bisher nirgends, weil es niemanden gab, der es brauchte:
// `laderaum.ts` rechnet Volumen (Reihenfolge egal) und Bodenbreite (nur x).
// Dieser Packer ist der erste Leser der z-Achse, also wird sie hier
// festgelegt — und nicht in jeder Datei neu vermutet.
//
// ─── EINHEITEN ─────────────────────────────────────────────────────────────
//
// Alles in ganzen Millimetern. Kein Fliesskomma: eine Kiste, die um einen
// Rundungsrest überlappt, ist am Dock genauso im Weg wie eine, die um zehn
// Zentimeter überlappt — und ein Test, der `0.30000000000000004` vergleicht,
// prüft die Fliesskomma-Arithmetik und nicht den Packer.
// ───────────────────────────────────────────────────────────────────────────

import type { CaseOrientation, TransportSpec } from '../../types/transport'

/** Ein Punkt oder ein Mass in Millimetern. */
export interface Vec3 {
  x: number
  y: number
  z: number
}

/** Ein achsparalleler Quader: Ursprung plus Kantenlängen. */
export interface Quader {
  origin: Vec3
  size: Vec3
}

/**
 * Ein Stück, wie der Packer es sieht.
 *
 * Bewusst NICHT `LadungsStueck`: dort ist alles optional, weil eine Ladung
 * auch Stücke ohne Masse führen darf (sie fahren mit, sie fallen nur aus der
 * Geometrie). Hier sind die Masse Pflicht — was keine hat, kommt gar nicht
 * erst herein und steht in `unplaced` mit dem Grund `keine-masse`.
 */
export interface PackStueck {
  id: string
  label: string
  /** Kantenlängen in aufrechter Lage. */
  sizeMm: Vec3
  weightKg?: number
  transport?: TransportSpec
  /** Abladegruppe (#22). Fehlt sie, zählt das Stück zur letzten Gruppe. */
  gruppe?: string
  /**
   * Von Hand gesetzt und damit VERANKERT: der Packer verschiebt es nicht.
   *
   * Das ist die halbe Begründung des ganzen Werkzeugs (#22): „drag any case
   * into place by hand when load order matters more than pure density". Wer
   * eine Kiste hingestellt hat, hat einen Grund, den der Packer nicht kennt.
   */
  fixiert?: { position: Vec3; lage: CaseOrientation }
}

/** Ein gesetztes Stück. */
export interface Placement {
  stueckId: string
  label: string
  /** Ursprung des Hüllquaders, hinten-links-unten. */
  position: Vec3
  /** Kantenlängen IN DER GEWÄHLTEN LAGE — nicht die aufrechten. */
  sizeMm: Vec3
  lage: CaseOrientation
  gruppe?: string
  /** Von Hand gesetzt; der Packer hat es nur übernommen. */
  verankert: boolean
  /**
   * Reihenfolge beim Beladen, 1-basiert. Wer zuletzt gesetzt wird, steht am
   * weitesten vorn und kommt zuerst wieder heraus.
   */
  ladeSchritt: number
}

/** Warum ein Stück nicht gesetzt werden konnte. */
export type UnplacedGrund =
  | 'keine-masse'
  | 'passt-nicht-durch-oeffnung'
  | 'kein-platz'
  | 'stuetzflaeche'
  | 'stapelregel'
  | 'zu-gross'
  /** Der Laderaum ist an der einzigen freien Stelle gebrochen oder gerundet. */
  | 'raumform'

export interface Unplaced {
  stueckId: string
  label: string
  grund: UnplacedGrund
  /** Ein Satz im Klartext — der Grund, nicht die Kennung. */
  text: string
}

/**
 * Ein Befund: etwas ist gesetzt, aber es hat etwas gekostet.
 *
 * Das ist die Regel aus #22 — „Konflikt sichtbar machen statt stillschweigend
 * lösen". Der Packer entscheidet nicht, ob Dichte oder Reihenfolge wichtiger
 * ist; er sagt, was er tun musste, und der Mensch entscheidet.
 */
export interface PackBefund {
  art:
    | 'reihenfolge-verletzt'
    | 'nutzlast-unbekannt'
    | 'nutzlast-ueberschritten'
    | 'oeffnung-unbekannt'
    /** Von Hand an eine Stelle gesetzt, an der es nicht steht (#23). */
    | 'verankert-ungueltig'
  text: string
}

export interface LoadPlan {
  placements: Placement[]
  unplaced: Unplaced[]
  befunde: PackBefund[]
  /** Summe der gesetzten Gewichte, soweit angegeben. */
  gesetztKg: number
  /** Wieviele gesetzte Stücke KEIN Gewicht tragen. */
  ohneGewicht: number
}

export interface PackOptions {
  /**
   * Wieviel der Grundfläche unterstützt sein muss, damit ein Stück steht.
   *
   * 0.8 als Startwert aus #20. Es ist eine Faustzahl und keine Physik: ein
   * Case mit 70 % Auflage steht auf dem Hof und kippt in der Kurve.
   */
  mindestStuetzung?: number
  /**
   * Die Abladegruppen in der Reihenfolge, in der sie GEBRAUCHT werden.
   * Die erste kommt an die Öffnung, die letzte nach hinten.
   */
  gruppenReihenfolge?: readonly string[]
  /** Raster, auf das Positionen gerundet werden. 0 = frei. */
  rasterMm?: number
}

export const VORGABE_STUETZUNG = 0.8
