// ───────────────────────────────────────────────────────────────────────────
// DER AUSBAU EINES CASES — was INNEN ist.
//
// ─── DIE SCHALE UND DER INNENAUSBAU SIND ZWEI DINGE ────────────────────────
//
// NUTZER, 2026-09-20: „Auch diese racks können ja racks in cases sein oder
// case Deckel haben. Dann sind es ja auch cases, wenn sie mobil sind."
//
// Das ist die richtige Beobachtung, und sie trägt dieses ganze Modell:
// Rack-Sein und Case-Sein sind KEINE Rangfolge, sondern zwei Eigenschaften
// desselben Gegenstands.
//
//   DIE SCHALE   Aussenmass, Leergewicht, Rollen, Deckel, Code. Sie macht
//                ein Ding transportierbar. Sie steht am `StorageNode` und
//                reist im portablen Format mit — der Ladeplaner braucht sie.
//
//   DER AUSBAU   Wie das Innere geteilt ist: Schaum, Divider, Schubladen
//                oder 19-Zoll-Schienen. Er steht HIER und bleibt im Haus.
//
// Ein 19-Zoll-Rack im Maschinenraum hat einen Ausbau und keine Schale. Ein
// Peli-Case hat beides. Ein Rack-Case im Tourbetrieb hat beides, und sein
// Ausbau ist `rack`. Eine Schublade darin hat wieder einen eigenen Ausbau.
// Kein Sonderfall, sondern dieselbe Zeile zweimal gelesen.
//
// ─── WARUM DAS NICHT AM `StorageNode` HÄNGT ────────────────────────────────
//
// `StorageNode` reist im portablen Format (`avplan-inventory`), und das liegt
// byte-gleich in den Planern. Ein Feld dort ist ein Versionssprung in allen
// Repos — dieselbe Begründung, mit der `transport` aus `PhysicalDimensions`
// herausgehalten wurde.
//
// Zwei Dinge kommen hier dazu:
//
//   1. DIE KOPIEN LAUFEN BEREITS AUSEINANDER. Gemessen am 2026-09-20: dieses
//      Repo steht auf Format-Version 8, `cable-planner`, `light-planner`,
//      `multicam-planner` und `packages/inventory-core` der Suite auf 7 —
//      sie kennen `transport` gar nicht. Eine neunte Version obendrauf
//      vertiefte einen Bruch, statt ihn zu schliessen.
//   2. DER AUSBAU GEHT DIE PLANER NICHTS AN. Ein Plan fragt, wie gross und
//      wie schwer ein Case ist und ob es durch die Tür passt. Wie der Schaum
//      darin geschnitten ist, ist eine Eigenschaft DIESES Stücks in DIESEM
//      Lager.
//
// ─── UND WARUM EINE SCHUBLADE KEIN `StorageNodeKind` IST ───────────────────
//
// Weil sie es nicht sein DARF, und das ist gemessen: `healNode` verwirft
// jeden Knoten, dessen `kind` es nicht kennt (`NODE_KINDS`). Ein Stand ohne
// die Art `drawer` löschte beim Laden jede Schublade — samt der Zugehörigkeit
// aller Artikel darin, denn ihr `locationId` zeigte ins Leere.
//
// Die Schublade ist deshalb Teil des AUSBAUS und kein eigener Lagerort. Der
// Preis steht hier, damit ihn niemand suchen muss: eine Schublade lässt sich
// nicht einzeln scannen. Wer das braucht, braucht zuerst einen Formatsprung
// in allen fünf Kopien.
//
// ─── UND WARUM ÜBERHAUPT ETWAS GESPEICHERT WERDEN MUSS ─────────────────────
//
// Weil das Innenmass eines Cases NICHT aus dem Aussenmass folgt. Ein 19-Zoll-
// Rackcase mit 600 mm Aussentiefe hat keine 600 mm nutzbare Tiefe, und
// wieviel es sind, hängt an Schale, Schaum und Deckelform. Wer hier
// „Aussenmass minus zwei Zentimeter" rechnet, liefert eine Zahl, die aussieht
// wie eine Messung — und jemand schneidet danach Schaum.
//
// Das ist dieselbe Regel, an der `belastbarkeit()` im Facility-Planner
// `watt: null` mit Grund zurückgibt, und die `StorageNode.stellplatz` ohne
// Eintrag nirgends stehen lässt statt bei (0,0).
// ───────────────────────────────────────────────────────────────────────────

/** Die nutzbaren Innenmasse eines Cases, in Millimetern. */
export interface CaseInnenmass {
  widthMm?: number
  heightMm?: number
  depthMm?: number
}

/**
 * Wie das Innere geteilt ist.
 *
 *   schaum      Ausschnitte im Schaum, je Stück ein Fach. Der Alltagsfall
 *               beim Peli- oder Nanuk-Case.
 *   divider     Verstellbare Trennwände auf einem Raster. Die Fächer sind
 *               RECHTECKE EINER TEILUNG und nicht je Stück geschnitten —
 *               wer umräumt, steckt die Wand um, statt neu zu schneiden.
 *   schubladen  Übereinanderliegende Auszüge, jeder mit eigenem Innenleben.
 *   rack        19-Zoll-Schienen. Hier zählen Höheneinheiten und nicht
 *               Millimeter, und WAS darin sitzt, weiss der Signalplan.
 */
export type AusbauArt = 'schaum' | 'divider' | 'schubladen' | 'rack'

export const AUSBAU_ARTEN: readonly AusbauArt[] = ['schaum', 'divider', 'schubladen', 'rack']

/**
 * Eine Divider-Teilung.
 *
 * Die Zahlen sind BREITEN und keine Positionen: „200, 200, 150" heisst drei
 * Fächer nebeneinander. Positionen wären dieselbe Angabe zweimal — einmal
 * als Kante, einmal als Abstand — und beim Umstecken liefen sie auseinander.
 */
export interface DividerRaster {
  /** Breiten der Spalten in mm, von links. */
  spaltenMm: number[]
  /** Tiefen der Reihen in mm, von hinten. */
  reihenMm: number[]
}

/** Der Ausbau einer Schublade. KEINE Schublade in der Schublade: eine
 *  Schachtelung ohne Ende ist ein Modell ohne Grund. */
export interface SchubladenInnen {
  art: 'schaum' | 'divider'
  stegMm?: number
  raster?: DividerRaster
}

export interface Schublade {
  id: string
  name: string
  /** Lichte Höhe des Auszugs in mm. Ohne sie wird sie nicht gezeichnet. */
  hoeheMm?: number
  innen?: SchubladenInnen
}

/**
 * Der Rack-Teil eines Cases.
 *
 * ─── WER WAS BESITZT ───────────────────────────────────────────────────────
 *
 * DAS LAGER BESITZT DAS LEERE RACK: wieviele Höheneinheiten das Case hat und
 * wie tief sie sind. Das ist eine Eigenschaft des Gegenstands — ein 12-HE-
 * Case hat zwölf HE, ob etwas darin geplant ist oder nicht.
 *
 * DER PLAN BESITZT, WAS DARIN SITZT. Die Bestückung entsteht im Rack-Builder
 * des Signal-Plans (`GroupPreset.rack.placements`), und sie gehört dorthin:
 * dort hängen Geräte, Ports und die interne Verkabelung daran.
 *
 * Damit gibt es KEINE zweite Wahrheit — und einen Befund, den es vorher nicht
 * geben konnte: belegt der Plan HE 1–14 und hat das Case zwölf, sagt das
 * jemand, bevor der LKW fährt.
 */
export interface RackAusbau {
  /** Höheneinheiten des Cases. */
  hoeheHE?: number
  /** Nutzbare Einbautiefe hinter der Schiene in mm. */
  nutzbareTiefeMm?: number
  /**
   * Die Kennung des Racks im Signal-Plan.
   *
   * EINE ZEICHENKETTE UND KEIN MODELL: das Lager darf kein Plan-Modell
   * kennen (ADR-006, `grenze:check`). Sie ist der Faden zwischen beiden
   * Seiten — was daran hängt, holt sich jede Seite selbst.
   */
  planRef?: string
}

/**
 * Was jemand über das Innere eines Cases weiss.
 *
 * JEDES FELD OPTIONAL, und das ist der Punkt: ein Case, an dem noch niemand
 * nachgemessen hat, soll nicht so aussehen, als hätte es kein Innenmass —
 * es hat eins, es steht nur nicht hier.
 */
export interface CaseAusbau {
  /** Auf welchen `StorageNode` (kind `case`/`transportCase`) sich das bezieht. */
  nodeId: string
  /**
   * Die Art des Innenausbaus. FEHLT SIE, gilt `schaum` — so sind alle
   * Einträge entstanden, die es vor dieser Unterscheidung schon gab.
   */
  art?: AusbauArt
  /**
   * Gemessene Innenmasse. Wenn vorhanden, GEWINNEN sie gegen jede Rechnung
   * aus Aussenmass und Wandstärke: gemessen schlägt gerechnet.
   */
  innenMm?: CaseInnenmass
  /**
   * Wandstärke rundum in mm, als Ersatz für gemessene Innenmasse.
   *
   * Sie ist eine ANGABE des Hauses und keine Vorgabe dieser Anwendung — es
   * gibt hier keinen Vorgabewert. Wer sie einträgt, hat an einer Ecke
   * nachgemessen; wer sie nicht einträgt, bekommt kein Innenmass.
   */
  wandstaerkeMm?: number
  /**
   * Der Steg zwischen zwei Fächern im Schaum, in mm.
   *
   * Ohne Steg fällt die Trennwand zwischen zwei Fächern beim ersten
   * Herausnehmen um. Der Vorgabewert steht in `caseLayout.ts` und ist als
   * das bezeichnet, was er ist: eine Werkstattzahl, keine Physik.
   */
  stegMm?: number
  /** Die Teilung, wenn `art` `divider` ist. */
  raster?: DividerRaster
  /** Die Auszüge, wenn `art` `schubladen` ist. */
  schubladen?: Schublade[]
  /** Die Schienen, wenn `art` `rack` ist. */
  rack?: RackAusbau
  /** Aus welcher Katalog-Vorlage die Schale kommt, falls aus einer. */
  vorlageId?: string
  /** Freie Notiz — „Deckel trägt nichts", „Boden 20 mm Hartschaum". */
  notes?: string
  /** ISO-Zeitstempel. */
  updatedAt: string
}

/** Die Art eines Ausbaus, mit der Vorgabe für Einträge ohne Angabe. */
export const ausbauArt = (a: Pick<CaseAusbau, 'art'> | undefined): AusbauArt => a?.art ?? 'schaum'
