// ───────────────────────────────────────────────────────────────────────────
// Wie gross die Halle ist — die eine Antwort für Grundriss und Raum.
//
// ─── WARUM DAS NICHT IN DER ANSICHT STEHT ──────────────────────────────────
//
// Weil es zwei Ansichten gibt. Der Grundriss zeichnet den Umriss, der
// 3D-Raum legt den Boden — und im ersten Anlauf rechnete jede es selbst.
// Das Ergebnis stand im Bild: der Boden im Raum war zwei Meter grösser als
// die Halle, die der Grundriss zeigte, und beide behaupteten, dasselbe
// Gebäude zu meinen.
//
// ─── ERST DIE MESSUNG, DANN DIE HÜLLE, SONST NICHTS ────────────────────────
//
// Wer seine Halle ausgemessen hat, sieht seine Halle. „Die Halle" ist dabei
// ein DEPOT oder ein RAUM auf oberster Ebene und nicht irgendein Knoten mit
// einer Grundfläche: ein Regal ist eine Stelle IN einer Halle, auch wenn
// niemand die Halle eingetragen hat. Der erste Anlauf nahm den ersten
// Wurzelknoten mit `stellplatz` — und schrumpfte den ganzen Plan auf das
// erste Regal, sobald zwei Regale ohne Depot darüber standen.
//
// Zwei vermessene Hallen nebeneinander sind KEINE vermessene Fläche: der
// Platz zwischen ihnen ist nicht gemessen, sondern gerechnet. Dann gilt die
// Hülle, und sie sagt es.
//
// Sonst bleibt die Hülle dessen, was schon steht — und die sagt ausdrücklich
// `vermessen: false`, damit die Ansicht es dazuschreiben kann statt es zu
// verschweigen.
//
// Ohne beides gibt es keine Fläche, und dann ist die Antwort `null` und
// keine Vorgabe-Halle. Eine erfundene Hallengrösse sähe im Plan aus wie eine
// Angabe über das Gebäude — dieselbe Regel, an der `belastbarkeit()` im
// Facility-Planner `watt: null` mit Grund zurückgibt.
//
// REIN: keine Uhr, kein Store, kein IO.
// ───────────────────────────────────────────────────────────────────────────

import type { StorageNode } from '../types/inventory'

export interface HallenUmriss {
  xMm: number
  zMm: number
  breiteMm: number
  tiefeMm: number
  /** `true`, wenn er aus einer Messung stammt und nicht aus der Hülle. */
  vermessen: boolean
}

/** Luft um die Hülle, wenn die Halle nicht vermessen ist. */
export const HUELLEN_RAND = 500

export function hallenUmriss(
  nodes: readonly StorageNode[],
  rand = HUELLEN_RAND,
): HallenUmriss | null {
  const hallen = nodes.filter(
    (n) => !n.parentId && n.stellplatz && (n.kind === 'depot' || n.kind === 'room'),
  )
  if (hallen.length === 1) {
    const s = hallen[0]!.stellplatz!
    return { xMm: s.xMm, zMm: s.zMm, breiteMm: s.breiteMm, tiefeMm: s.tiefeMm, vermessen: true }
  }

  const gestellt = nodes.filter((n) => n.stellplatz)
  if (gestellt.length === 0) return null

  const x1 = Math.min(...gestellt.map((n) => n.stellplatz!.xMm))
  const z1 = Math.min(...gestellt.map((n) => n.stellplatz!.zMm))
  const x2 = Math.max(...gestellt.map((n) => n.stellplatz!.xMm + n.stellplatz!.breiteMm))
  const z2 = Math.max(...gestellt.map((n) => n.stellplatz!.zMm + n.stellplatz!.tiefeMm))

  return {
    xMm: x1 - rand,
    zMm: z1 - rand,
    breiteMm: x2 - x1 + 2 * rand,
    tiefeMm: z2 - z1 + 2 * rand,
    vermessen: false,
  }
}
