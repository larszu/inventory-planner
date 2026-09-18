// ───────────────────────────────────────────────────────────────────────────
// Was in der Halle steht, aber nichts aufnimmt: Stellflächen, Tore, Wege.
//
// ─── WARUM DAS KEIN `StorageNode` IST ──────────────────────────────────────
//
// Ein Tor nimmt nichts auf. Ein Verkehrsweg SOLL nichts aufnehmen. Beide als
// Lager-Knoten zu führen hiesse, dass `itemsInNode` Artikel in einem Tor
// zurückgeben kann und der Baum „Halle 1 › Tor Nord › Shure SM58" anbietet —
// eine Adresse, die es nicht gibt.
//
// Die Trennung ist dieselbe, die das Gebäude-Werkzeug zwischen `Raum` und
// `Trasse` zieht: das eine ist ein Ort, das andere ist etwas, das im Weg
// liegt oder durchgelassen wird.
//
// ─── UND WARUM SIE TROTZDEM MEHR SIND ALS BILD ─────────────────────────────
//
// Eine gezeichnete Fläche, die nichts prüft, ist Dekoration. Diese hier
// tragen zwei Regeln, und beide sind körperlich:
//
//   Ein Regal IM Verkehrsweg oder VOR einem Tor ist ein Befund. Kein
//   Verbot — beim Umbau steht es da —, aber es steht nicht still da.
//
//   Ein Tor hat ein lichtes Mass. Was nicht hindurchpasst, passt nicht
//   hinein, ganz gleich wieviel Platz drinnen ist. Dieselbe Aussage, die
//   `durchOeffnung` im Packer für die Heckklappe macht.
// ───────────────────────────────────────────────────────────────────────────

import type { Stellplatz } from './inventory'

export type FlaechenArt =
  /** Hier darf etwas stehen — Paletten, Cases, Anlieferung. */
  | 'stellflaeche'
  /** Kommissionierzone: hier wird zusammengestellt, nicht gelagert. */
  | 'pickzone'
  /** Muss frei bleiben. Ein Regal darin ist ein Befund. */
  | 'verkehrsweg'
  /** Tor, Tür, Rampe — der Weg hinein und hinaus. */
  | 'tor'
  /** Darf nicht genutzt werden: Löschbereich, Tropfstelle, Nische. */
  | 'sperrflaeche'

export const FLAECHEN_ARTEN: readonly FlaechenArt[] = [
  'stellflaeche',
  'pickzone',
  'verkehrsweg',
  'tor',
  'sperrflaeche',
]

/** Arten, die frei bleiben müssen — ein Lagerort darin ist ein Befund. */
export const FREI_ZU_HALTEN: readonly FlaechenArt[] = ['verkehrsweg', 'tor', 'sperrflaeche']

export interface Hallenflaeche {
  id: string
  name: string
  art: FlaechenArt
  /** Lage und Mass im Grundriss — dieselbe Geometrie wie ein Lagerplatz. */
  stellplatz: Stellplatz
  /**
   * Das lichte Mass eines Tores, in Millimetern.
   *
   * Es steht NICHT in `stellplatz.hoeheMm`: das ist die Höhe des Bauteils,
   * dies ist die Höhe der Öffnung. Bei einem Sektionaltor sind das zwei
   * verschiedene Zahlen, und die falsche kostet ein Case.
   *
   * Fehlt es, wird nichts geprüft — und das steht dann auch da, statt dass
   * eine geratene Zahl wie eine Messung aussieht.
   */
  lichtBreiteMm?: number
  lichtHoeheMm?: number
  notes?: string
  createdAt: string
  updatedAt: string
}
