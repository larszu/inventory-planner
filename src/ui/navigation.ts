// ───────────────────────────────────────────────────────────────────────────
// Bereiche und Ansichten.
//
// Bis 2026-09-28 standen dreizehn Reiter gleichrangig nebeneinander. Wer die
// App zum ersten Mal öffnete, sah dreizehn Fragen und keine Reihenfolge —
// „Stacking" neben „Stock", „Device library" hinter dem Rand. Jetzt ordnen
// fünf Bereiche nach dem, was jemand gerade vorhat; die Ansichten eines
// Bereichs stehen in der Reihenfolge, in der man sie braucht.
//
// Als Funktion und nicht als Konstante: übersetzte Titel bleiben sonst in der
// Sprache stehen, die beim Laden galt (siehe CLAUDE.md, i18n).
// ───────────────────────────────────────────────────────────────────────────

export const ANSICHT_IDS = [
  'start',
  'bestand',
  'lager',
  'eingang',
  'inventur',
  'bibliothek',
  'cases',
  'fahrzeuge',
  'ladung',
  'stapeln',
  'ausgabe',
  'subhire',
  'bericht',
  'werte',
] as const
export type Ansicht = (typeof ANSICHT_IDS)[number]

export type BereichId = 'start' | 'lager' | 'packen' | 'verleih' | 'auswertung'

type T = (key: string, en: string) => string

export interface AnsichtDef {
  id: Ansicht
  titel: string
  /** Ein Satz: wofür diese Ansicht da ist. */
  frage: string
}

export interface BereichDef {
  id: BereichId
  titel: string
  /** Ein Satz für die Startseite: wann man hierher kommt. */
  wozu: string
  ansichten: AnsichtDef[]
}

export const bereiche = (t: T): BereichDef[] => [
  {
    id: 'start',
    titel: t('area.start', 'Start'),
    wozu: '',
    ansichten: [{ id: 'start', titel: t('area.start', 'Start'), frage: '' }],
  },
  {
    id: 'lager',
    titel: t('area.stock', 'Stock'),
    wozu: t('area.stock.why', 'What you own and where it is. Add equipment, set up shelves and cases, count it.'),
    ansichten: [
      { id: 'bestand', titel: t('tab.stock', 'Equipment'), frage: t('tab.stock.q', 'What do you have, and how many?') },
      { id: 'lager', titel: t('tab.storage', 'Storage places'), frage: t('tab.storage.q', 'Where does it sit — shelves, cases, and what is inside what.') },
      { id: 'eingang', titel: t('tab.receiving', 'Receiving'), frage: t('tab.receiving.q', 'Book in what has arrived.') },
      { id: 'inventur', titel: t('tab.audit', 'Stocktake'), frage: t('tab.audit.q', 'Check that what should be here is here.') },
      { id: 'bibliothek', titel: t('tab.library', 'Device library'), frage: t('tab.library.q', 'Take device data from the shared library instead of typing it.') },
    ],
  },
  {
    id: 'packen',
    titel: t('area.pack', 'Pack'),
    wozu: t('area.pack.why', 'Getting ready for a job: what goes into which case, and how the cases fit into the vehicle.'),
    ansichten: [
      { id: 'cases', titel: t('tab.cases', 'Cases'), frage: t('tab.cases.q', 'Measure a case and lay out what goes inside.') },
      { id: 'fahrzeuge', titel: t('tab.vehicles', 'Vehicles'), frage: t('tab.vehicles.q', 'Your vans and trucks and their cargo space.') },
      { id: 'ladung', titel: t('tab.load', 'Load'), frage: t('tab.load.q', 'Pick the cases for a job and see how they fit into the vehicle.') },
      { id: 'stapeln', titel: t('tab.stack', 'Stacking'), frage: t('tab.stack.q', 'Which case may stand on which, and how high.') },
    ],
  },
  {
    id: 'verleih',
    titel: t('area.out', 'Out & back'),
    wozu: t('area.out.why', 'Equipment that leaves the house: checkout notes, returns, and gear hired in from others.'),
    ansichten: [
      { id: 'ausgabe', titel: t('tab.checkouts', 'Checkout notes'), frage: t('tab.checkouts.q', 'What is out, with whom, and since when.') },
      { id: 'subhire', titel: t('tab.subhire', 'Sub-hire'), frage: t('tab.subhire.q', 'Gear that is not yours, and when it has to go back.') },
    ],
  },
  {
    id: 'auswertung',
    titel: t('area.reports', 'Reports'),
    wozu: t('area.reports.why', 'Overviews to print or pass on: stock report, values, damage.'),
    ansichten: [
      { id: 'bericht', titel: t('tab.report', 'Report'), frage: t('tab.report.q', 'The stock at a glance, ready to print.') },
      { id: 'werte', titel: t('tab.values', 'Values & damage'), frage: t('tab.values.q', 'What it is worth and what is broken.') },
    ],
  },
]

export const bereichVon = (liste: BereichDef[], a: Ansicht): BereichDef =>
  liste.find((b) => b.ansichten.some((x) => x.id === a)) ?? liste[0]!
