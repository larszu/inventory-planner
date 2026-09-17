import { describe, expect, it } from 'vitest'
import {
  gesamtGewicht,
  gruppen,
  stueckeAusBedarf,
  stueckeAusContainern,
  stueckeAusCsv,
  unplanbar,
} from '../lib/ladung'
import type { InventoryItem, StorageNode } from '../types/inventory'
import type { Ladung } from '../types/load'

// ───────────────────────────────────────────────────────────────────────────
// Die Ladung füllen (Ladeplanung, Issue #26).
//
// Zwei Fehler wären hier teuer und beide sind still:
//
//   1. Ein Transport-Case UND die Cases darin auf der Ladung — dasselbe
//      Gewicht zweimal, und niemandem fällt es auf.
//   2. Eine CSV-Zeile ohne Maße, die mit einer Standardkiste aufgefüllt wird.
//      Daraus entsteht eine Ladeplanung, die vollständig AUSSIEHT.
//
// Beide haben einen eigenen Test.
// ───────────────────────────────────────────────────────────────────────────

const node = (id: string, name: string, over: Partial<StorageNode> = {}): StorageNode => ({
  id,
  name,
  kind: 'case',
  createdAt: '2026-09-17T00:00:00.000Z',
  updatedAt: '2026-09-17T00:00:00.000Z',
  ...over,
})

const ladungMit = (stuecke: Ladung['stuecke']): Ladung => ({
  id: 'l1',
  name: 'Samstag',
  stuecke,
  createdAt: '2026-09-17T00:00:00.000Z',
  updatedAt: '2026-09-17T00:00:00.000Z',
})

describe('Aus dem Bestand', () => {
  const baum: StorageNode[] = [
    node('t1', 'Transport-Case 1', { kind: 'transportCase', dimensions: { widthMm: 1200, heightMm: 900, depthMm: 800, weightKg: 60 } }),
    node('c1', 'Case A', { parentId: 't1', dimensions: { widthMm: 600, heightMm: 400, depthMm: 400, weightKg: 18 } }),
    node('c2', 'Case B', { parentId: 't1' }),
    node('c3', 'Case C', { dimensions: { widthMm: 600, heightMm: 400, depthMm: 400, weightKg: 22 } }),
    node('r1', 'Regal 3', { kind: 'shelf' }),
  ]

  it('macht aus ausgewählten Containern Stücke', () => {
    const s = stueckeAusContainern(baum, ['c3'])
    expect(s).toHaveLength(1)
    expect(s[0]!.label).toBe('Case C')
    expect(s[0]!.nodeId).toBe('c3')
    expect(s[0]!.herkunft).toBe('container')
  })

  it('zählt ein verschachteltes Case NICHT doppelt, wenn sein Transport-Case mitgewählt ist', () => {
    // Sonst stünde dasselbe Gewicht zweimal auf der Ladung.
    const s = stueckeAusContainern(baum, ['t1', 'c1', 'c2'])

    expect(s).toHaveLength(1)
    expect(s[0]!.nodeId).toBe('t1')
  })

  it('nimmt das Case einzeln, wenn sein Transport-Case NICHT gewählt ist', () => {
    const s = stueckeAusContainern(baum, ['c1'])
    expect(s.map((x) => x.nodeId)).toEqual(['c1'])
  })

  it('ignoriert Lagerplätze — ein Regal fährt nicht mit', () => {
    expect(stueckeAusContainern(baum, ['r1'])).toHaveLength(0)
  })

  it('übernimmt Maße und Transport-Angaben des Containers', () => {
    const mitRollen = node('c9', 'Packcase', {
      dimensions: { widthMm: 1200, heightMm: 800, depthMm: 600, weightKg: 45 },
      transport: { castors: { heightMm: 100, includedInHeightMm: false, kind: 'swivelAuto' } },
    })

    const s = stueckeAusContainern([mitRollen], ['c9'])
    expect(s[0]!.dimensions?.weightKg).toBe(45)
    expect(s[0]!.transport?.castors?.heightMm).toBe(100)
  })
})

describe('Aus dem Bedarf des Plans', () => {
  const items: InventoryItem[] = [
    {
      id: 'i1',
      model: 'Sennheiser EW 500',
      quantity: 4,
      deviceTypeId: 'typ-ew500',
      dimensions: { widthMm: 210, heightMm: 44, depthMm: 190, weightKg: 1.2 },
      createdAt: '',
      updatedAt: '',
    } as InventoryItem,
  ]

  it('findet den Artikel über die Katalog-Id und übernimmt seine Maße', () => {
    const s = stueckeAusBedarf([{ key: 'k1', label: 'Sennheiser EW 500', deviceTypeId: 'typ-ew500', quantity: 2 }], items)

    expect(s[0]!.itemId).toBe('i1')
    expect(s[0]!.quantity).toBe(2)
    expect(s[0]!.dimensions?.weightKg).toBe(1.2)
  })

  it('findet ihn ersatzweise über den Namen', () => {
    const s = stueckeAusBedarf([{ key: 'k1', label: '  sennheiser ew 500 ', quantity: 1 }], items)
    expect(s[0]!.itemId).toBe('i1')
  })

  it('erfindet keine Maße, wenn kein Artikel passt', () => {
    const s = stueckeAusBedarf([{ key: 'k2', label: 'Unbekanntes Gerät', quantity: 3 }], items)

    expect(s[0]!.itemId).toBeUndefined()
    expect(s[0]!.dimensions).toBeUndefined()
    expect(s[0]!.quantity).toBe(3)
  })
})

describe('Aus CSV', () => {
  it('liest Maße und Menge, auch mit Komma als Dezimaltrennzeichen', () => {
    const s = stueckeAusCsv([
      { label: 'Stagebox', quantity: '2', widthMm: '600', heightMm: '400', depthMm: '400', weightKg: '12,5' },
    ])

    expect(s[0]!.quantity).toBe(2)
    expect(s[0]!.dimensions?.weightKg).toBe(12.5)
  })

  it('füllt fehlende Maße NICHT mit einer Standardkiste auf', () => {
    // Der teuerste Fehler dieser Datei. Eine erfundene Kiste macht aus einer
    // unvollständigen Liste eine Planung, die vollständig aussieht.
    const s = stueckeAusCsv([{ label: 'Kiste ohne Angaben', quantity: '1' }])

    expect(s[0]!.dimensions).toBeUndefined()
    expect(s[0]!.quantity).toBe(1)
  })

  it('nimmt auch eine teilweise vermessene Zeile an, ohne den Rest zu raten', () => {
    const s = stueckeAusCsv([{ label: 'Halb', weightKg: '30' }])

    expect(s[0]!.dimensions?.weightKg).toBe(30)
    expect(s[0]!.dimensions?.widthMm).toBeUndefined()
  })

  it('überspringt eine Zeile ohne Bezeichnung', () => {
    // Eine Position, die am Dock niemand wiedererkennt, ist keine Position.
    expect(stueckeAusCsv([{ label: '   ', weightKg: '10' }, { quantity: '5' }])).toHaveLength(0)
  })

  it('nimmt eine Menge von 0 oder Unsinn nicht an und setzt 1', () => {
    expect(stueckeAusCsv([{ label: 'A', quantity: '0' }])[0]!.quantity).toBe(1)
    expect(stueckeAusCsv([{ label: 'B', quantity: 'viele' }])[0]!.quantity).toBe(1)
  })

  it('übernimmt eine Abladegruppe, wenn die Spalte da ist', () => {
    expect(stueckeAusCsv([{ label: 'A', gruppe: ' Licht ' }])[0]!.gruppe).toBe('Licht')
    expect(stueckeAusCsv([{ label: 'B', gruppe: '  ' }])[0]!.gruppe).toBeUndefined()
  })
})

describe('Was sich nicht rechnen lässt', () => {
  it('meldet ein Stück ohne Maße — es fährt mit, aber nicht in der Geometrie', () => {
    const l = ladungMit([{ id: 's1', label: 'Unvermessen', herkunft: 'csv', quantity: 1 }])
    const u = unplanbar(l)

    expect(u).toHaveLength(1)
    expect(u[0]!.grund).toBe('keine-masse')
    expect(u[0]!.label).toBe('Unvermessen')
  })

  it('unterscheidet „keine Maße" von „kein Gewicht"', () => {
    const l = ladungMit([
      { id: 's1', label: 'Ohne Gewicht', herkunft: 'csv', quantity: 1, dimensions: { widthMm: 600, heightMm: 400, depthMm: 400 } },
    ])

    expect(unplanbar(l)[0]!.grund).toBe('kein-gewicht')
  })

  it('meldet nichts, wenn alles da ist', () => {
    const l = ladungMit([
      { id: 's1', label: 'Vollständig', herkunft: 'container', quantity: 1, dimensions: { widthMm: 600, heightMm: 400, depthMm: 400, weightKg: 20 } },
    ])

    expect(unplanbar(l)).toHaveLength(0)
  })
})

describe('Gesamtgewicht', () => {
  it('rechnet mit der Menge und sagt, wie viele Stücke kein Gewicht tragen', () => {
    const l = ladungMit([
      { id: 's1', label: 'A', herkunft: 'csv', quantity: 3, dimensions: { weightKg: 10 } },
      { id: 's2', label: 'B', herkunft: 'csv', quantity: 1, dimensions: { weightKg: 5 } },
      { id: 's3', label: 'C', herkunft: 'csv', quantity: 2 },
    ])

    const g = gesamtGewicht(l)
    expect(g.bekanntKg).toBe(35)
    // Die zweite Zahl ist der Punkt: die Summe allein wäre eine Behauptung.
    expect(g.ohneGewicht).toBe(1)
  })
})

describe('Abladegruppen', () => {
  it('nennt jede Gruppe einmal, in der Reihenfolge des ersten Auftretens', () => {
    const l = ladungMit([
      { id: 's1', label: 'A', herkunft: 'csv', quantity: 1, gruppe: 'Ton' },
      { id: 's2', label: 'B', herkunft: 'csv', quantity: 1, gruppe: 'Licht' },
      { id: 's3', label: 'C', herkunft: 'csv', quantity: 1, gruppe: 'Ton' },
      { id: 's4', label: 'D', herkunft: 'csv', quantity: 1 },
    ])

    expect(gruppen(l)).toEqual(['Ton', 'Licht'])
  })
})
