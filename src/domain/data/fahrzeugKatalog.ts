// ───────────────────────────────────────────────────────────────────────────
// Der Startsatz Fahrzeuge — und warum er heute leer ist (#19).
//
// ─── WAS HIER STEHEN SOLL ──────────────────────────────────────────────────
//
// Die Fahrzeuge, die in dieser Branche wirklich fahren: Transporter in ihren
// Radstand- und Dachvarianten, 3,5-t-Koffer mit und ohne Hebebühne, der
// 7,5-Tonner, der Kofferanhänger, der Planensattel als Obergrenze. Jeder
// Eintrag MIT `quelle` — Link aufs Herstellerdatenblatt oder die
// Zulassungsbescheinigung.
//
// ─── UND WARUM ER TROTZDEM LEER IST ────────────────────────────────────────
//
// Weil die Quellen von hier aus nicht erreichbar sind. Gemessen am
// 2026-09-18: `mercedes-benz.de` und selbst `wikipedia.org` antworten mit
// `EGRESS_BLOCKED` — die Datenblätter liegen hinter dem Netzfilter dieser
// Umgebung. Aus einer Suchergebnis-Zusammenfassung Zahlen abzuschreiben,
// die niemand an der genannten Stelle nachlesen kann, wäre genau das, was
// die Hausregel verbietet: „Nichts erfinden."
//
// Eine geratene Nutzlast sieht im Ladeplan aus wie eine Messung, und seit
// #24 steht sie auf einem Lastverteilungsplan. Bei der Kontrolle wiegt die
// Waage.
//
// Varianten sind dabei der eigentliche Fallstrick: derselbe Ducato hat je
// nach Radstand, Dachhöhe und Ausbau andere Innenmasse. Lieber fünf belegte
// Varianten als zwanzig geratene — und lieber keine als fünf erfundene.
//
// ─── WAS DIESE DATEI DESHALB IST ───────────────────────────────────────────
//
// Die Form, nicht der Inhalt. `katalogMaengel` hält fest, was ein Eintrag
// mitbringen muss; der Test `fahrzeugKatalog.test.ts` führt sie aus. Der
// erste Eintrag, den jemand einträgt, muss die Prüfung bestehen — ohne
// Quelle kommt er nicht hinein, und ein Pflichtmass auf 0 auch nicht.
//
// WER EINEN EINTRAG ERGÄNZT, liest das Datenblatt und schreibt seine URL in
// `quelle`. Die Zahlen aus dem eigenen Fahrzeugschein gehören NICHT hierher,
// sondern als eigenes Fahrzeug ins Lager: der Katalog ist der Typ, das
// eigene Fahrzeug ist das Stück Blech, das in der Halle steht.
// ───────────────────────────────────────────────────────────────────────────
import type { Vehicle, VehicleKind } from '../types/vehicle'

/**
 * Ein Katalog-Fahrzeug: ein Typ, kein Fahrzeug.
 *
 * `quelle` ist PFLICHT und nicht optional wie am `Vehicle` — das ist der
 * ganze Unterschied zwischen einem Stammdatensatz und einer Behauptung.
 */
export interface KatalogFahrzeug
  extends Pick<Vehicle, 'name' | 'kind' | 'cargoMm' | 'kanten' | 'obstructions' | 'aperture'> {
  /** Woher die Zahlen stammen — Datenblatt oder Zulassungsbescheinigung. */
  quelle: string
  nutzlastKg?: number
  leergewichtKg?: number
  zulGesamtgewichtKg?: number
  axles?: Vehicle['axles']
  ladeflaecheAbVorderachseMm?: number
  rasterMm?: number
  flatFloor?: boolean
  hebebuehneKg?: number
  fuehrerscheinKlasse?: Vehicle['fuehrerscheinKlasse']
  notes?: string
}

export const FAHRZEUG_KATALOG: readonly KatalogFahrzeug[] = []

/** Die Klassen, für die ein Startsatz gebraucht wird — der offene Rest. */
export const FEHLENDE_KLASSEN: readonly VehicleKind[] = [
  'kofferraum',
  'kombi',
  'transporter',
  'koffer35',
  'lkw75',
  'lkw12',
  'sattelzug',
  'anhaenger',
]

/**
 * Was an einem Eintrag fehlt. Leere Liste heisst: er darf in den Katalog.
 *
 * Geprüft wird nur, was ohne das Fahrzeug entscheidbar ist: dass eine Quelle
 * dasteht, dass die drei Pflichtmasse echte Masse sind und dass keine Zahl
 * als 0 getarnt fehlt. Ob die Zahlen STIMMEN, kann keine Software sagen —
 * dafür steht die Quelle da.
 */
export function katalogMaengel(e: KatalogFahrzeug): string[] {
  const maengel: string[] = []
  if (!e.quelle.trim()) maengel.push('quelle')
  if (!e.name.trim()) maengel.push('name')
  for (const [feld, wert] of [
    ['cargoMm.lengthMm', e.cargoMm.lengthMm],
    ['cargoMm.widthMm', e.cargoMm.widthMm],
    ['cargoMm.heightMm', e.cargoMm.heightMm],
  ] as const) {
    if (!(wert > 0)) maengel.push(feld)
  }
  // Eine 0 ist keine Angabe, sondern eine fehlende, die sich als Messung
  // ausgibt — bei der Nutzlast die teuerste Sorte.
  for (const [feld, wert] of [
    ['nutzlastKg', e.nutzlastKg],
    ['leergewichtKg', e.leergewichtKg],
    ['zulGesamtgewichtKg', e.zulGesamtgewichtKg],
    ['ladeflaecheAbVorderachseMm', e.ladeflaecheAbVorderachseMm],
  ] as const) {
    if (wert !== undefined && !(wert > 0)) maengel.push(feld)
  }
  for (const a of e.axles ?? []) {
    if (!(a.maxLastKg > 0)) maengel.push('axles.maxLastKg')
    if (a.leergewichtKg !== undefined && !(a.leergewichtKg > 0)) maengel.push('axles.leergewichtKg')
  }
  return maengel
}
