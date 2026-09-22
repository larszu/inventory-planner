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

/**
 * Die Quelle der Ducato-Zeilen.
 *
 * Fiat Professional, „Ducato / E-Ducato Kastenwagen · Pritschenwagen ·
 * Fahrgestell — Technische Daten", Modelljahr 2024, Blatt „ABMESSUNGEN
 * KASTENWAGEN". Gelesen am 2026-09-22.
 *
 * Steht als Konstante und nicht sechsmal als Zeichenkette: eine Quelle, die
 * man an sechs Stellen pflegen muss, driftet an fuenf davon.
 */
const DUCATO_MY24 =
  'Fiat Professional, Ducato MY2024 Technische Daten (Warentransport), Blatt "ABMESSUNGEN KASTENWAGEN" — '
  + 'https://www.abz-nutzfahrzeuge.de/fileadmin/inhalte/Modelle_Fiat/Ducato/DUCATO_2025/Ducato_MY2024_Warentransport_TechnischeDaten.pdf'

/**
 * Warum die Breite 1422 und nicht 1870 ist.
 *
 * Das Datenblatt nennt beides: „Breite maximal / zwischen den Radkaesten
 * [mm] 1870 / 1422". Der Laderaum ist also oben breiter als unten.
 *
 * DAS HAUS MODELLIERT DAS SONST ANDERS. Die Regel im README lautet: oben ist
 * `cargoMm.widthMm`, unten gehoert als Radkasten unter die Hindernisse, dort
 * wo er auch im Weg ist. Dafuer braucht ein Hindernis drei Masse — und genau
 * eines davon ist nirgends belegt.
 *
 * Breite und Laenge liessen sich herleiten: das Blatt nennt die Bereifung
 * (215/75 R16C), und `radkastenAusReifen` rechnet daraus beides. Die HOEHE
 * gibt diese Funktion mit Absicht nicht zurueck — sie haengt am Abstand
 * zwischen Ladeboden und Achse und steht in keiner Reifengroesse. Ein
 * geschaetzter Wert entscheidet aber genau die Frage, fuer die man ihn
 * braeuchte: ob ein Case neben dem Radkasten steht oder darauf.
 *
 * Bleibt die konservative Annahme: der Radkasten geht durch bis oben. Genau
 * das IST ein Laderaum von 1422 mm Breite ohne Hindernis — dieselbe Aussage,
 * nur ohne eine erfundene Zahl darin. Sie irrt in die sichere Richtung: ein
 * Plan auf 1422 passt auch in ein Fahrzeug, das oben 1870 hat. Ein Plan auf
 * 1870 ohne Radkaesten passt am Dock nicht, und dort merkt man es.
 *
 * Wer die Hoehe einmal am echten Fahrzeug misst, traegt sie als Hindernis
 * ein und setzt die Breite auf 1870 — dann gewinnt der Katalog die 448 mm
 * oberhalb der Radkaesten zurueck.
 */
const DUCATO_BREITE_ZWISCHEN_RADKAESTEN_MM = 1422

/**
 * Ein Ducato-Kastenwagen. Alle sechs Zeilen unterscheiden sich nur in Laenge
 * und Hoehe — der Rest steht im Datenblatt ohne Variantenspalte.
 */
const ducato = (
  variante: string,
  laengeMm: number,
  hoeheMm: number,
  hecktuerHoeheMm: number,
): KatalogFahrzeug => ({
  name: `Fiat Ducato Kastenwagen ${variante}`,
  kind: 'transporter',
  quelle: DUCATO_MY24,
  cargoMm: {
    lengthMm: laengeMm,
    widthMm: DUCATO_BREITE_ZWISCHEN_RADKAESTEN_MM,
    heightMm: hoeheMm,
  },
  obstructions: [],
  aperture: { widthMm: 1562, heightMm: hecktuerHoeheMm },
  // NUTZLAST FEHLT MIT ABSICHT. Das Blatt „ABMESSUNGEN KASTENWAGEN" nennt
  // keine. Eine aus dem zulaessigen Gesamtgewicht gerechnete waere eine
  // Schaetzung, die im Ladeplan wie eine Messung aussieht — und bei der
  // Kontrolle wiegt die Waage.
  notes:
    `Breite: 1870 mm maximal, ${DUCATO_BREITE_ZWISCHEN_RADKAESTEN_MM} mm zwischen den Radkaesten; `
    + 'eingetragen ist die schmale — das entspricht einem Radkasten, der bis oben durchgeht. '
    + 'Seine echte Hoehe steht nicht im Datenblatt; wer sie misst, traegt ihn als Hindernis ein '
    + 'und setzt die Breite auf 1870. Bereifung laut Blatt 215/75 R16C. '
    + 'Ladekantenhoehe laut Blatt 535–610 mm je nach Ausfuehrung — deshalb hier keine. '
    + 'Nutzlast steht nicht im Blatt.',
})

/**
 * Der Startsatz.
 *
 * Sechs belegte Varianten eines Fahrzeugs statt zwanzig geratener aus sechs.
 * Das Issue sagt es selbst: „Lieber fuenf belegte Varianten als zwanzig
 * geratene — und lieber keine als fuenf erfundene."
 */
export const FAHRZEUG_KATALOG: readonly KatalogFahrzeug[] = [
  ducato('L2H1', 3120, 1662, 1520),
  ducato('L2H2', 3120, 1932, 1790),
  ducato('L3H2', 3705, 1932, 1790),
  ducato('L3H3', 3705, 2172, 2030),
  ducato('L4H2', 4070, 1932, 1790),
  ducato('L4H3', 4070, 2172, 2030),
]

/**
 * Die Klassen, für die ein Startsatz noch fehlt — der offene Rest.
 *
 * `transporter` steht hier NICHT mehr: die sechs Ducato-Varianten decken die
 * Klasse belegt ab. Alles andere fehlt weiterhin, und zwar unverändert aus
 * demselben Grund — ohne Datenblatt kein Eintrag.
 */
export const FEHLENDE_KLASSEN: readonly VehicleKind[] = [
  'kofferraum',
  'kombi',
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
