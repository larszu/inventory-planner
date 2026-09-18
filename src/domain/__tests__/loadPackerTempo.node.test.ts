// ───────────────────────────────────────────────────────────────────────────
// Wie lange braucht der Packer? (#20, Frage „Web Worker oder nicht")
//
// Das Issue verlangt einen Web Worker, „sonst friert die Oberfläche ein".
// Diese Messung entscheidet, ob das stimmt — eine Zusicherung, die auf einer
// Vermutung beruht, kostet einen Worker samt Nachrichten-Protokoll und
// bringt nichts.
//
// Die Schranke ist bewusst weit (250 ms für 200 Stücke): sie soll den Tag
// melden, an dem der Packer quadratisch wird, und nicht bei jedem langsamen
// CI-Läufer rot werden.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { packe } from '../lib/loadPacker'
import type { PackStueck } from '../lib/loadPacker'
import type { Vehicle } from '../types/vehicle'

const lkw: Vehicle = {
  id: 'v', name: 'LKW 7,5 t', kind: 'lkw75',
  cargoMm: { lengthMm: 6200, widthMm: 2400, heightMm: 2400 },
  obstructions: [],
  createdAt: '2026-09-18T00:00:00.000Z', updatedAt: '2026-09-18T00:00:00.000Z',
}

describe('Tempo', () => {
  it('packt 200 Stücke in unter 250 ms', () => {
    const stuecke: PackStueck[] = Array.from({ length: 200 }, (_, i) => ({
      id: `s${i}`,
      label: `Case ${i}`,
      sizeMm: { x: 400 + (i % 5) * 100, y: 300 + (i % 4) * 150, z: 400 + (i % 3) * 200 },
      weightKg: 10 + (i % 7) * 5,
    }))

    const t0 = performance.now()
    const plan = packe(lkw, stuecke)
    const dauer = performance.now() - t0

    expect(plan.placements.length).toBeGreaterThan(50)
    expect(dauer, `${Math.round(dauer)} ms für 200 Stücke`).toBeLessThan(250)
  })
})
