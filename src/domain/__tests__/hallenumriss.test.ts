// ───────────────────────────────────────────────────────────────────────────
// Der Umriss der Halle.
//
// DER BEFUND, DER DIESE DATEI NÖTIG MACHT: Grundriss und 3D-Raum rechneten
// ihn zuerst jeder für sich. Im Bild war der Boden im Raum zwei Meter
// grösser als der Umriss im Grundriss — und beide behaupteten, dieselbe
// Halle zu meinen.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { hallenUmriss } from '../lib/hallenumriss'
import type { StorageNode } from '../types/inventory'

const now = '2026-09-18T00:00:00.000Z'

const knoten = (patch: Partial<StorageNode> & { id: string }): StorageNode => ({
  name: patch.id,
  kind: 'shelf',
  createdAt: now,
  updatedAt: now,
  ...patch,
})

describe('Erst die Messung', () => {
  it('nimmt die Grundfläche des obersten Knotens', () => {
    const nodes = [
      knoten({ id: 'h', kind: 'depot', stellplatz: { xMm: 0, zMm: 0, breiteMm: 12000, tiefeMm: 8000 } }),
      knoten({ id: 'a', parentId: 'h', stellplatz: { xMm: 1000, zMm: 1000, breiteMm: 4000, tiefeMm: 800 } }),
    ]
    expect(hallenUmriss(nodes)).toEqual({
      xMm: 0,
      zMm: 0,
      breiteMm: 12000,
      tiefeMm: 8000,
      vermessen: true,
    })
  })

  it('lässt ein Regal, das über die Halle ragt, darüber ragen', () => {
    // Die gemessene Halle ist die gemessene Halle. Sie zu vergrössern, damit
    // alles hineinpasst, wäre eine Behauptung über das Gebäude — und der
    // Grundriss zeigt gerade dann, dass da etwas nicht stimmt.
    const nodes = [
      knoten({ id: 'h', kind: 'depot', stellplatz: { xMm: 0, zMm: 0, breiteMm: 2000, tiefeMm: 2000 } }),
      knoten({ id: 'a', parentId: 'h', stellplatz: { xMm: 1000, zMm: 1000, breiteMm: 9000, tiefeMm: 800 } }),
    ]
    expect(hallenUmriss(nodes)!.breiteMm).toBe(2000)
  })
})

describe('Sonst die Hülle', () => {
  const nodes = [
    knoten({ id: 'a', stellplatz: { xMm: 1000, zMm: 2000, breiteMm: 4000, tiefeMm: 800 } }),
    knoten({ id: 'b', stellplatz: { xMm: 6000, zMm: 1000, breiteMm: 1000, tiefeMm: 3000 } }),
  ]

  it('umschliesst, was steht, mit Rand', () => {
    expect(hallenUmriss(nodes, 500)).toEqual({
      xMm: 500,
      zMm: 500,
      breiteMm: 7000,
      tiefeMm: 4000,
      vermessen: false,
    })
  })

  it('sagt, dass sie NICHT vermessen ist', () => {
    // Der Unterschied gehört ins Bild: eine gerechnete Hülle ist keine
    // Auskunft über das Gebäude.
    expect(hallenUmriss(nodes)!.vermessen).toBe(false)
  })
})

describe('Zwei Hallen sind keine vermessene Fläche', () => {
  it('nimmt die Hülle und sagt, dass sie gerechnet ist', () => {
    // Der Platz ZWISCHEN zwei Hallen ist nicht gemessen. Ihn als vermessen
    // auszugeben hiesse, ein Stück Gelände zu behaupten.
    const nodes = [
      knoten({ id: 'h1', kind: 'depot', stellplatz: { xMm: 0, zMm: 0, breiteMm: 2000, tiefeMm: 2000 } }),
      knoten({ id: 'h2', kind: 'depot', stellplatz: { xMm: 9000, zMm: 0, breiteMm: 2000, tiefeMm: 2000 } }),
    ]
    const u = hallenUmriss(nodes, 0)!
    expect(u.vermessen).toBe(false)
    expect(u.breiteMm).toBe(11000)
  })
})

describe('Ein Regal auf oberster Ebene ist keine Halle', () => {
  it('umschliesst beide, statt auf das erste zu schrumpfen', () => {
    // Der Befund, der die Funktion geändert hat: sie nahm den ersten
    // Wurzelknoten mit Grundfläche — und das war ein Regal.
    const nodes = [
      knoten({ id: 'a', stellplatz: { xMm: 1000, zMm: 2000, breiteMm: 4000, tiefeMm: 800 } }),
      knoten({ id: 'b', stellplatz: { xMm: 6000, zMm: 1000, breiteMm: 1000, tiefeMm: 3000 } }),
    ]
    expect(hallenUmriss(nodes, 0)!.breiteMm).toBe(6000)
    expect(hallenUmriss(nodes)!.vermessen).toBe(false)
  })
})

describe('Ohne beides gibt es keine Halle', () => {
  it('liefert null statt einer Vorgabe', () => {
    expect(hallenUmriss([])).toBeNull()
    expect(hallenUmriss([knoten({ id: 'a' })])).toBeNull()
  })
})
