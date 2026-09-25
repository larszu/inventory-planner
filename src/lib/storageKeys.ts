// ───────────────────────────────────────────────────────────────────────────
// Die localStorage-Schlüssel dieser App — an einer Stelle.
//
// Übernommen aus dem Cable-Planner (`lib/storageKeys.ts`), mit einem
// Unterschied, der ausdrücklich gewollt ist: das Präfix lautet
// `inventory-planner:` und nicht `cable-planner:`.
//
// WARUM DAS KEIN DATENVERLUST IST. Diese App läuft unter einer eigenen
// Herkunft; der localStorage des Cable-Planners ist für sie ohnehin
// unerreichbar, gleicher Schlüssel oder nicht. Das Präfix mitzuschleppen
// würde also nichts retten und dafür behaupten, hier läge dieselbe Ablage.
//
// Der Weg für vorhandene Bestände ist der, den ADR-006 vorsieht: die
// portable Datei (`avplan-inventory`, `domain/lib/inventoryPortable.ts`).
// Sie ist zwischen den Apps byte-gleich eingefroren und genau dafür da.
// ───────────────────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  /** Der Bestand: Artikel, Lagerbaum, Sets, serialisierte Einheiten. */
  inventory: 'inventory-planner:inventory',
  /** Ausgabe-/Rückgabe-Belege. Eigener Schlüssel — Betriebszustand EINES
   *  Lagers, und nicht Teil des Katalogs, der zwischen den Apps wandert. */
  checkouts: 'inventory-planner:checkouts',
  /** Umlagerungen im Lagerbaum. */
  storageMoves: 'inventory-planner:storageMoves',
  /**
   * Die selbst angelegten Fristarten des Hauses (Format-Version 7).
   *
   * Eigener Schlüssel, weil sie Stammdaten sind und kein Bestand: wer alle
   * Artikel löscht, hat immer noch dieselben Prüfarten. Im Bestands-Blob
   * hätte jedes Schreiben sie mit angefasst — für ein Feld, das mit dem
   * Bestand nichts zu tun hat.
   */
  fristArten: 'inventory-planner:fristArten',
  /**
   * Die Fahrzeuge des Hauses (Ladeplanung).
   *
   * Eigener Schluessel aus demselben Grund wie die Fristarten: Stammdaten,
   * kein Bestand. Ein Fahrzeug ueberdauert jeden Bestand, und wer alle
   * Artikel loescht, hat immer noch dieselben Fahrzeuge.
   */
  vehicles: 'inventory-planner:vehicles',
  /**
   * Die Ladungen. Betriebszustand EINER Fahrt, kein Katalog -- dieselbe
   * Begruendung wie bei den Ausgabescheinen.
   */
  loads: 'inventory-planner:loads',
  /**
   * Die Flaechen der Halle: Stellflaechen, Pickzonen, Verkehrswege, Tore.
   *
   * Eigener Schluessel aus demselben Grund wie die Fahrzeuge: Stammdaten des
   * Hauses, kein Bestand. Wer alle Artikel loescht, hat immer noch dieselbe
   * Halle mit denselben Toren.
   */
  hallenflaechen: 'inventory-planner:hallenflaechen',
  /**
   * Der Ausbau der Cases: Innenmasse, Wandstaerke, Steg.
   *
   * Eigener Schluessel, und zwar nicht nur aus dem ueblichen Grund
   * (Stammdaten, kein Bestand). Der Ausbau steht bewusst AUSSERHALB des
   * portablen Formats: `StorageNode` reist zwischen den Planern, und ein
   * Feld dort waere ein Versionssprung in allen Repos -- fuer eine Angabe,
   * die am anderen Ende niemandem hilft. Die Begruendung steht ausfuehrlich
   * in `domain/types/caseAusbau.ts`.
   */
  caseAusbau: 'inventory-planner:caseAusbau',
  /**
   * Die eigenen Case-Vorlagen des Hauses.
   *
   * Eigener Schluessel aus demselben Grund wie die Fahrzeuge: Stammdaten,
   * kein Bestand. Wer alle Artikel loescht, hat immer noch dieselben
   * ausgemessenen Case-Modelle -- und die sind der eigentliche Wert des
   * Katalogs, weil die mitgelieferten Vorlagen bewusst keine Masse tragen.
   */
  caseVorlagen: 'inventory-planner:caseVorlagen',
  /**
   * Die Rack-Bestückungen, die der Signal-Plan herübergereicht hat
   * (`avplan-rack-belegung`, siehe `lib/rackBelegungFormat.ts`).
   *
   * Eigener Schlüssel, weil sie dem PLAN gehören und hier nur gelesen werden:
   * eine neue Datei ersetzt den Stand ganz, statt sich mit ihm zu mischen.
   */
  planRacks: 'inventory-planner:planRacks',
  /**
   * Die Geraetebibliothek: Server-Adresse, angemeldeter Nutzer und der Cache
   * des letzten Abgleichs. Nicht Teil des portablen Formats — der Cache
   * gehoert dem Server, nicht dem Lager.
   */
  deviceLibrary: 'inventory-planner:deviceLibrary',
  /**
   * Das Anmelde-Token der Bibliothek, getrennt vom Rest: es darf in keinen
   * Export und in kein Log. `localStorage` auch in der Desktop-Fassung, weil
   * der Hauptprozess bewusst kein IPC anbietet (electron/main.cjs).
   */
  deviceLibraryToken: 'inventory-planner:deviceLibraryToken',
} as const
