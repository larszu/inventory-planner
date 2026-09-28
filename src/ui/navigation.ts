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
}

export interface BereichDef {
  id: BereichId
  titel: string
  ansichten: AnsichtDef[]
}

export const bereiche = (t: T): BereichDef[] => [
  {
    id: 'start',
    titel: t('area.start', 'Start'),
    ansichten: [{ id: 'start', titel: t('area.start', 'Start') }],
  },
  {
    id: 'lager',
    titel: t('area.stock', 'Stock'),
    ansichten: [
      { id: 'bestand', titel: t('tab.stock', 'Equipment') },
      { id: 'lager', titel: t('tab.storage', 'Storage places') },
      { id: 'eingang', titel: t('tab.receiving', 'Receiving') },
      { id: 'inventur', titel: t('tab.audit', 'Stocktake') },
      { id: 'bibliothek', titel: t('tab.library', 'Device library') },
    ],
  },
  {
    id: 'packen',
    titel: t('area.pack', 'Pack'),
    ansichten: [
      { id: 'cases', titel: t('tab.cases', 'Cases') },
      { id: 'fahrzeuge', titel: t('tab.vehicles', 'Vehicles') },
      { id: 'ladung', titel: t('tab.load', 'Load') },
      { id: 'stapeln', titel: t('tab.stack', 'Stacking') },
    ],
  },
  {
    id: 'verleih',
    titel: t('area.out', 'Out & back'),
    ansichten: [
      { id: 'ausgabe', titel: t('tab.checkouts', 'Checkout notes') },
      { id: 'subhire', titel: t('tab.subhire', 'Sub-hire') },
    ],
  },
  {
    id: 'auswertung',
    titel: t('area.reports', 'Reports'),
    ansichten: [
      { id: 'bericht', titel: t('tab.report', 'Report') },
      { id: 'werte', titel: t('tab.values', 'Values & damage') },
    ],
  },
]

export const bereichVon = (liste: BereichDef[], a: Ansicht): BereichDef =>
  liste.find((b) => b.ansichten.some((x) => x.id === a)) ?? liste[0]!
