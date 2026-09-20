// ───────────────────────────────────────────────────────────────────────────
// DER AUSBAU EINES CASES — was INNEN ist.
//
// ─── WARUM DAS EIN EIGENER TYP IST UND NICHT EIN FELD AN `StorageNode` ─────
//
// `StorageNode` reist im portablen Format (`avplan-inventory`), und das liegt
// byte-gleich in den Planern. Ein Feld dort ist ein Versionssprung in allen
// Repos — und genau diese Begründung steht schon in `inventoryPortable.ts`,
// wo `transport` aus demselben Grund NICHT in `PhysicalDimensions` gewandert
// ist.
//
// Zwei Dinge kommen hier dazu, die es noch schwerer machen:
//
//   1. DIE KOPIEN LAUFEN BEREITS AUSEINANDER. Gemessen am 2026-09-20: dieses
//      Repo steht auf Version 8, `cable-planner`, `light-planner`,
//      `multicam-planner` und `packages/inventory-core` der Suite auf 7 —
//      sie kennen `transport` gar nicht. Eine neunte Version obendrauf
//      vertiefte einen Bruch, statt ihn zu schliessen.
//   2. DER AUSBAU GEHT DIE PLANER NICHTS AN. Ein Plan fragt, wie gross und
//      wie schwer ein Case ist und ob es durch die Tür passt. Wie der Schaum
//      darin geschnitten ist, ist eine Eigenschaft DIESES Stücks in DIESEM
//      Lager — es reist nicht mit dem Katalog, weil es am anderen Ende
//      niemandem hilft.
//
// Deshalb: eigener Schlüssel im `localStorage`, wie Fristarten, Fahrzeuge und
// Hallenflächen. Stammdaten des Hauses, kein Bestand.
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
  /** Freie Notiz — „Deckel trägt nichts", „Boden 20 mm Hartschaum". */
  notes?: string
  /** ISO-Zeitstempel. */
  updatedAt: string
}
