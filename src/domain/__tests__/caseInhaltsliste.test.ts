import { describe, expect, it } from 'vitest'
import { caseInhalt, caseInhaltAlsText } from '../lib/caseInhaltsliste'
import { buildCaseInhaltslisteHtml } from '../lib/inventoryPrint'
import type { InventoryItem, InventoryUnit, StorageNode } from '../types/inventory'

/**
 * DAS DECKELBLATT — und die Gewichtsregel, die es ehrlich hält.
 *
 * Gemessen wird vor allem, wann es KEIN Gesamtgewicht ausweist. Eine Summe,
 * die vollständig aussieht und es nicht ist, ist am Hallenboden gefährlicher
 * als gar keine: jemand hebt danach.
 */
const now = '2026-09-20T00:00:00.000Z'

const knoten = (id: string, name: string, rest: Partial<StorageNode> = {}): StorageNode =>
  ({ id, name, kind: 'case', createdAt: now, updatedAt: now, ...rest }) as StorageNode

const artikel = (id: string, model: string, rest: Partial<InventoryItem> = {}): InventoryItem =>
  ({ id, model, quantity: 1, createdAt: now, updatedAt: now, ...rest }) as unknown as InventoryItem

const einheit = (id: string, itemId: string, rest: Partial<InventoryUnit> = {}): InventoryUnit =>
  ({ id, itemId, condition: 'ok', createdAt: now, updatedAt: now, ...rest }) as unknown as InventoryUnit

describe('caseInhalt', () => {
  it('gibt für einen unbekannten Knoten NICHTS zurück, statt ein leeres Blatt', () => {
    // Ein leeres Blatt für ein Case, das es nicht gibt, wäre eine Auskunft
    // über nichts — und jemand druckte es.
    expect(caseInhalt('gibtsnicht', { items: [], nodes: [], units: [] })).toBeNull()
  })

  it('zählt die Artikel, die direkt darin liegen', () => {
    const c = knoten('c1', 'Case 1')
    const r = caseInhalt('c1', {
      nodes: [c],
      items: [
        artikel('a', 'Sennheiser EW500', { locationId: 'c1', quantity: 2 }),
        artikel('b', 'Shure SM58', { locationId: 'c1', quantity: 4 }),
        artikel('x', 'Woanders', { locationId: 'anderswo' }),
      ],
      units: [],
    })!
    // Alphabetisch nach Modell — eine Liste, die man abhakt, wird gelesen
    // und nicht durchsucht.
    expect(r.zeilen.map((z) => `${z.qty}× ${z.text}`)).toEqual(['2× Sennheiser EW500', '4× Shure SM58'])
    expect(r.stueckzahl).toBe(6)
  })

  it('steigt NICHT in ein Unter-Case hinein — das hat sein eigenes Blatt', () => {
    // Ein Blatt, das den Inhalt der drei Unter-Cases mit aufführt, lässt
    // sich nicht abhaken: man müsste drei Kisten aufmachen, um eine Liste
    // zu prüfen.
    const nodes = [
      knoten('c1', 'Transport-Case'),
      knoten('c2', 'Funk-Case', { parentId: 'c1', code: 'FC-02' }),
    ]
    const r = caseInhalt('c1', {
      nodes,
      items: [artikel('tief', 'Liegt im Unter-Case', { locationId: 'c2' })],
      units: [],
    })!
    expect(r.zeilen).toHaveLength(1)
    expect(r.zeilen[0]!.text).toBe('Funk-Case')
    expect(r.zeilen[0]!.unterCase).toEqual({ id: 'c2', code: 'FC-02' })
  })

  it('trennt eigenes von fremdem Material, auch bei gleichem Modell', () => {
    // Bedarf 67: vier eigene und zwei sub-gemietete Kameras desselben Typs
    // sind nicht sechs Kameras, sondern zwei Zeilen. Wer die Liste abhakt
    // und das nicht sieht, packt fremdes Material ins eigene Regal.
    const r = caseInhalt('c1', {
      nodes: [knoten('c1', 'Case 1')],
      items: [
        artikel('eigen', 'Sony PMW-F55', { locationId: 'c1', quantity: 4 }),
        artikel('fremd', 'Sony PMW-F55', {
          locationId: 'c1',
          quantity: 2,
          ownership: 'subhire',
          supplier: 'Videohaus Meier',
          returnDue: '2026-09-30',
        }),
      ],
      units: [],
    })!
    expect(r.zeilen).toHaveLength(2)
    const fremd = r.zeilen.find((z) => z.ownership)!
    expect(fremd.qty).toBe(2)
    expect(fremd.ownership).toContain('Videohaus Meier')
    expect(r.zeilen.find((z) => !z.ownership)!.qty).toBe(4)
  })

  it('führt serialisierte Einheiten einzeln auf', () => {
    const r = caseInhalt('c1', {
      nodes: [knoten('c1', 'Case 1')],
      items: [artikel('a', 'URSA Broadcast')],
      units: [
        einheit('u1', 'a', { locationId: 'c1', houseRef: 'LZM-04' }),
        einheit('u2', 'a', { locationId: 'c1', houseRef: 'LZM-05', condition: 'defect' }),
      ],
    })!
    expect(r.zeilen).toHaveLength(2)
    expect(r.zeilen[0]!.text).toContain('LZM-04')
    // Ein defektes Stück steht als defekt da — es liegt trotzdem im Case.
    expect(r.zeilen[1]!.condition).toBe('defect')
  })

  it('summiert nur gewogene Positionen und zählt die ungewogenen', () => {
    const r = caseInhalt('c1', {
      nodes: [knoten('c1', 'Case 1', { dimensions: { weightKg: 12 } })],
      items: [
        artikel('a', 'Gewogen', { locationId: 'c1', quantity: 2, dimensions: { weightKg: 1.5 } }),
        artikel('b', 'Ungewogen', { locationId: 'c1', quantity: 1 }),
      ],
      units: [],
    })!
    expect(r.inhaltKg).toBe(3)
    expect(r.ohneGewicht).toBe(1)
    // KEIN Gesamtgewicht, solange etwas fehlt.
    expect(r.gesamtKg).toBeUndefined()
  })

  it('nennt ein Gesamtgewicht erst, wenn Leergewicht UND alles gewogen sind', () => {
    const r = caseInhalt('c1', {
      nodes: [knoten('c1', 'Case 1', { dimensions: { weightKg: 12 } })],
      items: [artikel('a', 'Gewogen', { locationId: 'c1', quantity: 2, dimensions: { weightKg: 1.5 } })],
      units: [],
    })!
    expect(r.gesamtKg).toBe(15)
  })

  it('gibt kein Gesamtgewicht, wenn nur das Leergewicht des Cases fehlt', () => {
    const r = caseInhalt('c1', {
      nodes: [knoten('c1', 'Case 1')],
      items: [artikel('a', 'Gewogen', { locationId: 'c1', dimensions: { weightKg: 2 } })],
      units: [],
    })!
    expect(r.inhaltKg).toBe(2)
    expect(r.gesamtKg).toBeUndefined()
  })

  it('macht eine Zeile ganz ungewogen, wenn EINE ihrer Positionen es ist', () => {
    // Sonst stünde dort ein Gewicht, das für weniger Stücke gilt als die
    // Zahl daneben.
    const r = caseInhalt('c1', {
      nodes: [knoten('c1', 'Case 1')],
      items: [
        artikel('a1', 'Shure SM58', { locationId: 'c1', quantity: 2, dimensions: { weightKg: 0.3 } }),
        artikel('a2', 'Shure SM58', { locationId: 'c1', quantity: 1 }),
      ],
      units: [],
    })!
    expect(r.zeilen).toHaveLength(1)
    expect(r.zeilen[0]!.qty).toBe(3)
    expect(r.zeilen[0]!.weightKg).toBeUndefined()
  })
})

describe('caseInhaltAlsText', () => {
  it('schreibt Kästchen zum Abhaken', () => {
    const r = caseInhalt('c1', {
      nodes: [knoten('c1', 'Case 1', { code: 'C-01' })],
      items: [artikel('a', 'Shure SM58', { locationId: 'c1', quantity: 4 })],
      units: [],
    })!
    const text = caseInhaltAlsText(r)
    expect(text).toContain('Case 1  [C-01]')
    expect(text).toContain('[ ] 4x Shure SM58')
    expect(text).toContain('not weighed')
  })
})

describe('buildCaseInhaltslisteHtml', () => {
  const bau = (nodes: StorageNode[], items: InventoryItem[]) =>
    buildCaseInhaltslisteHtml(caseInhalt('c1', { nodes, items, units: [] })!, '2026-09-20')

  it('sagt beim fehlenden Gewicht, WAS fehlt', () => {
    const html = bau(
      [knoten('c1', 'Case 1')],
      [artikel('a', 'Ungewogen', { locationId: 'c1' })],
    )
    expect(html).toContain('no total')
    expect(html).toContain('not weighed')
  })

  it('nennt beide Lücken, wenn beide bestehen', () => {
    const html = bau([knoten('c1', 'Case 1')], [artikel('a', 'Ungewogen', { locationId: 'c1' })])
    expect(html).toMatch(/not weighed and the empty weight/)
  })

  it('nennt nur das Leergewicht, wenn der Inhalt gewogen ist', () => {
    const html = bau(
      [knoten('c1', 'Case 1')],
      [artikel('a', 'Gewogen', { locationId: 'c1', dimensions: { weightKg: 2 } })],
    )
    expect(html).toContain('the empty weight of the case is not recorded')
    expect(html).not.toContain('positions are not weighed')
  })

  it('maskiert spitze Klammern in einem Namen', () => {
    // Ein Modellname aus einem Import ist Text und kein Markup.
    const html = bau(
      [knoten('c1', 'Case <1>')],
      [artikel('a', '<script>x</script>', { locationId: 'c1' })],
    )
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('trägt Tally-Rot nicht ins Blatt', () => {
    // Der Punkt ist das Aufnahmelicht, und eine Inhaltsliste nimmt nichts
    // auf — dieselbe Regel wie bei der Packliste.
    const html = bau([knoten('c1', 'Case 1')], [artikel('a', 'x', { locationId: 'c1' })])
    expect(html.toUpperCase()).not.toContain('#E0332E')
  })
})
