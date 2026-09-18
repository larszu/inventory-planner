// ───────────────────────────────────────────────────────────────────────────
// Der Packer-Kern (#20, #22).
//
// Die Invarianten stehen zuerst, und sie sind der Grund, warum diese Datei
// existiert: nichts überlappt, nichts schwebt, keine Stapelregel wird
// verletzt. Ein Packer, der eine davon bricht, ist nicht „etwas ungenau" —
// sein Plan ist am Dock unbrauchbar, und zwar erst dort.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { packe } from '../lib/loadPacker'
import type { PackStueck, Placement } from '../lib/loadPacker'
import type { Vehicle } from '../types/vehicle'

const auto = (patch: Partial<Vehicle> = {}): Vehicle => ({
  id: 'v1',
  name: 'Sprinter',
  kind: 'transporter',
  cargoMm: { lengthMm: 3000, widthMm: 1700, heightMm: 1800 },
  obstructions: [],
  createdAt: '2026-09-18T00:00:00.000Z',
  updatedAt: '2026-09-18T00:00:00.000Z',
  ...patch,
})

const stueck = (id: string, x: number, y: number, z: number, patch: Partial<PackStueck> = {}): PackStueck => ({
  id,
  label: id,
  sizeMm: { x, y, z },
  ...patch,
})

/** Überlappen sich zwei gesetzte Stücke echt? */
const kollidiert = (a: Placement, b: Placement): boolean =>
  a.position.x < b.position.x + b.sizeMm.x && b.position.x < a.position.x + a.sizeMm.x &&
  a.position.y < b.position.y + b.sizeMm.y && b.position.y < a.position.y + a.sizeMm.y &&
  a.position.z < b.position.z + b.sizeMm.z && b.position.z < a.position.z + a.sizeMm.z

const keineKollision = (ps: Placement[]) => {
  for (let i = 0; i < ps.length; i += 1) {
    for (let j = i + 1; j < ps.length; j += 1) {
      expect(kollidiert(ps[i]!, ps[j]!), `${ps[i]!.label} überlappt ${ps[j]!.label}`).toBe(false)
    }
  }
}

describe('Die Invarianten', () => {
  const viele: PackStueck[] = Array.from({ length: 24 }, (_, i) =>
    stueck(`c${i}`, 400 + (i % 4) * 100, 300 + (i % 3) * 100, 500, { weightKg: 20 }),
  )

  it('setzt nichts übereinander', () => {
    keineKollision(packe(auto(), viele).placements)
  })

  it('lässt nichts schweben', () => {
    const plan = packe(auto(), viele)
    for (const p of plan.placements) {
      if (p.position.y === 0) continue
      const traeger = plan.placements.filter(
        (o) => o !== p && o.position.y + o.sizeMm.y === p.position.y &&
          o.position.x < p.position.x + p.sizeMm.x && p.position.x < o.position.x + o.sizeMm.x &&
          o.position.z < p.position.z + p.sizeMm.z && p.position.z < o.position.z + o.sizeMm.z,
      )
      expect(traeger.length, `${p.label} schwebt auf y=${p.position.y}`).toBeGreaterThan(0)
    }
  })

  it('bleibt im Laderaum', () => {
    const v = auto()
    for (const p of packe(v, viele).placements) {
      expect(p.position.x + p.sizeMm.x).toBeLessThanOrEqual(v.cargoMm.widthMm)
      expect(p.position.y + p.sizeMm.y).toBeLessThanOrEqual(v.cargoMm.heightMm)
      expect(p.position.z + p.sizeMm.z).toBeLessThanOrEqual(v.cargoMm.lengthMm)
    }
  })

  it('liefert zweimal dasselbe Ergebnis', () => {
    // Ohne diese Zusage ist der Plan wertlos: eine Crew vertraut keiner
    // Anordnung, die sich bei jedem Klick ändert.
    const a = packe(auto(), viele)
    const b = packe(auto(), viele)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})

describe('Was nicht geht, wird benannt', () => {
  it('meldet ein Stück ohne Masse, statt es zu verschweigen', () => {
    const plan = packe(auto(), [stueck('ohne', 0, 0, 0)])
    expect(plan.placements).toEqual([])
    expect(plan.unplaced[0]!.grund).toBe('keine-masse')
    expect(plan.unplaced[0]!.text).toContain('travels')
  })

  it('meldet, was nicht durch die Öffnung passt', () => {
    const v = auto({ aperture: { widthMm: 1200, heightMm: 1300 } })
    const plan = packe(v, [stueck('breit', 1600, 800, 600)])

    expect(plan.placements).toEqual([])
    expect(plan.unplaced[0]!.grund).toBe('passt-nicht-durch-oeffnung')
  })

  it('sagt es, wenn die Öffnung gar nicht erfasst ist — statt „passt"', () => {
    const plan = packe(auto(), [stueck('a', 400, 400, 400)])
    expect(plan.befunde.some((b) => b.art === 'oeffnung-unbekannt')).toBe(true)
    // Und setzt es trotzdem: „nicht gemessen" ist kein Grund, nicht zu planen.
    expect(plan.placements).toHaveLength(1)
  })

  it('meldet, was grösser ist als der Laderaum', () => {
    const plan = packe(auto(), [stueck('riese', 2000, 400, 400)])
    expect(plan.unplaced[0]!.grund).toBe('zu-gross')
  })
})

describe('Stapelregeln', () => {
  it('stellt nichts auf ein Case mit `noLoadOnTop`', () => {
    // Die grössere Grundfläche kommt zuerst dran (First-Fit-Decreasing) und
    // steht damit unten. Genau darauf darf nichts.
    const v = auto({ cargoMm: { lengthMm: 700, widthMm: 700, heightMm: 2000 } })
    const plan = packe(v, [
      stueck('unten', 680, 600, 680, { transport: { noLoadOnTop: true } }),
      stueck('oben', 600, 600, 600),
    ])

    expect(plan.placements.map((p) => p.stueckId)).toEqual(['unten'])
    expect(plan.unplaced[0]!.grund).toBe('stapelregel')
  })

  it('darf SELBST oben stehen — die Regel gilt für seinen Deckel, nicht für seinen Boden', () => {
    const v = auto({ cargoMm: { lengthMm: 700, widthMm: 700, heightMm: 2000 } })
    const plan = packe(v, [
      stueck('gross', 680, 600, 680),
      stueck('klein', 600, 600, 600, { transport: { noLoadOnTop: true } }),
    ])

    expect(plan.placements).toHaveLength(2)
    expect(plan.placements.find((p) => p.stueckId === 'klein')!.position.y).toBe(600)
  })

  it('hält `maxLayers` ein', () => {
    const v = auto({ cargoMm: { lengthMm: 700, widthMm: 700, heightMm: 3000 } })
    const spec = { maxLayers: 2 }
    const plan = packe(v, [
      stueck('a', 600, 600, 600, { transport: spec }),
      stueck('b', 600, 600, 600, { transport: spec }),
      stueck('c', 600, 600, 600, { transport: spec }),
    ])

    expect(plan.placements).toHaveLength(2)
    expect(plan.unplaced[0]!.grund).toBe('stapelregel')
  })

  it('stellt nicht schwer auf leicht', () => {
    const v = auto({ cargoMm: { lengthMm: 700, widthMm: 700, heightMm: 2000 } })
    const plan = packe(v, [
      stueck('leicht', 600, 600, 600, { weightKg: 5 }),
      stueck('schwer', 600, 600, 600, { weightKg: 80 }),
    ])

    // Der schwere kommt zuerst dran (gleiche Fläche, Id-Sortierung) — hier
    // zählt nur, dass am Ende nicht 80 kg auf 5 kg stehen.
    const oben = plan.placements.find((p) => p.position.y > 0)
    const unten = plan.placements.find((p) => p.position.y === 0)
    if (oben && unten) expect(oben.label).not.toBe('schwer')
  })

  it('rechnet die Rollenhöhe mit, wenn sie nicht im Mass steckt', () => {
    // Genau unter die Decke: 1800 mm Laderaum, Case 1750 + 100 Rollen.
    const v = auto({ cargoMm: { lengthMm: 1000, widthMm: 1000, heightMm: 1800 } })
    const mitRollen = {
      castors: { heightMm: 100, includedInHeightMm: false, kind: 'swivel' as const },
    }
    const plan = packe(v, [stueck('rollend', 600, 1750, 600, { transport: mitRollen })])

    expect(plan.placements).toEqual([])
    expect(plan.unplaced[0]!.grund).toBe('zu-gross')
  })
})

describe('Hindernisse', () => {
  it('stellt nichts in den Radkasten', () => {
    const v = auto({
      cargoMm: { lengthMm: 1000, widthMm: 1000, heightMm: 1000 },
      obstructions: [
        { name: 'Radkasten links', kind: 'radkasten', originMm: { x: 0, y: 0, z: 0 }, sizeMm: { x: 300, y: 400, z: 1000 } },
      ],
    })
    const plan = packe(v, [stueck('a', 600, 400, 600)])

    expect(plan.placements).toHaveLength(1)
    // Es muss rechts am Radkasten vorbei.
    expect(plan.placements[0]!.position.x).toBeGreaterThanOrEqual(300)
  })
})

describe('Von Hand gesetzte Stücke', () => {
  it('bleiben stehen, wo sie stehen', () => {
    const v = auto({ cargoMm: { lengthMm: 2000, widthMm: 2000, heightMm: 1000 } })
    const plan = packe(v, [
      stueck('fix', 500, 500, 500, { fixiert: { position: { x: 900, y: 0, z: 900 }, lage: 'upright' } }),
      stueck('rest', 500, 500, 500),
    ])

    const fix = plan.placements.find((p) => p.stueckId === 'fix')!
    expect(fix.position).toEqual({ x: 900, y: 0, z: 900 })
    expect(fix.verankert).toBe(true)
    keineKollision(plan.placements)
  })
})

describe('Ladereihenfolge (#22)', () => {
  const v = auto({ cargoMm: { lengthMm: 3000, widthMm: 700, heightMm: 700 } })
  const stuecke = [
    stueck('buehne', 600, 600, 600, { gruppe: 'Bühne' }),
    stueck('licht', 600, 600, 600, { gruppe: 'Licht' }),
    stueck('ton', 600, 600, 600, { gruppe: 'Ton' }),
  ]

  it('legt die zuerst gebrauchte Gruppe an die Öffnung', () => {
    // Die Öffnung liegt bei z = lengthMm. „Bühne" wird zuerst gebraucht,
    // liegt also am weitesten vorn — grösstes z.
    const plan = packe(v, stuecke, { gruppenReihenfolge: ['Bühne', 'Licht', 'Ton'] })
    const z = (id: string) => plan.placements.find((p) => p.stueckId === id)!.position.z

    expect(z('buehne')).toBeGreaterThan(z('licht'))
    expect(z('licht')).toBeGreaterThan(z('ton'))
  })

  it('nummeriert die Ladeschritte von hinten nach vorn', () => {
    const plan = packe(v, stuecke, { gruppenReihenfolge: ['Bühne', 'Licht', 'Ton'] })
    const schritt = (id: string) => plan.placements.find((p) => p.stueckId === id)!.ladeSchritt

    // Zuerst wird geladen, was zuletzt gebraucht wird.
    expect(schritt('ton')).toBe(1)
    expect(schritt('buehne')).toBe(3)
  })

  it('macht einen Reihenfolge-Konflikt sichtbar, statt ihn still zu lösen', () => {
    // Der Fall aus der Praxis: jemand hat die Ton-Kiste von Hand an die
    // Öffnung gestellt. Damit steht die zuletzt gebrauchte Gruppe vor der
    // zuerst gebrauchten — der Packer räumt sie NICHT weg (sie ist
    // verankert), er sagt, was es kostet.
    const eng = auto({ cargoMm: { lengthMm: 1300, widthMm: 700, heightMm: 700 } })
    const plan = packe(
      eng,
      [
        stueck('buehne', 600, 600, 600, { gruppe: 'Bühne' }),
        stueck('ton', 600, 600, 600, {
          gruppe: 'Ton',
          fixiert: { position: { x: 0, y: 0, z: 700 }, lage: 'upright' },
        }),
      ],
      { gruppenReihenfolge: ['Bühne', 'Licht', 'Ton'] },
    )

    expect(plan.placements).toHaveLength(2)
    expect(plan.befunde.some((b) => b.art === 'reihenfolge-verletzt')).toBe(true)
    expect(plan.befunde.find((b) => b.art === 'reihenfolge-verletzt')!.text).toContain('Bühne')
  })
})

describe('Gewicht', () => {
  it('zählt, was gezählt ist — und sagt, wieviel nicht', () => {
    const plan = packe(auto(), [
      stueck('a', 400, 400, 400, { weightKg: 12 }),
      stueck('b', 400, 400, 400),
    ])

    expect(plan.gesetztKg).toBe(12)
    expect(plan.ohneGewicht).toBe(1)
  })

  it('meldet Überladung, ohne den Plan zu verweigern', () => {
    const v = auto({ nutzlastKg: 100 })
    const plan = packe(v, [stueck('schwer', 600, 600, 600, { weightKg: 400 })])

    expect(plan.placements).toHaveLength(1)
    expect(plan.befunde.some((b) => b.art === 'nutzlast-ueberschritten')).toBe(true)
  })

  it('sagt es, wenn das Fahrzeug keine Nutzlast führt', () => {
    const plan = packe(auto(), [stueck('a', 400, 400, 400, { weightKg: 999 })])
    expect(plan.befunde.some((b) => b.art === 'nutzlast-unbekannt')).toBe(true)
  })
})

describe('Lagen', () => {
  it('kippt ein Stück, wenn es aufrecht nicht passt und gekippt erlaubt ist', () => {
    const v = auto({ cargoMm: { lengthMm: 2000, widthMm: 2000, heightMm: 700 } })
    const plan = packe(v, [
      stueck('lang', 600, 1800, 600, { transport: { orientations: ['upright', 'onSide'] } }),
    ])

    expect(plan.placements).toHaveLength(1)
    expect(plan.placements[0]!.lage).toBe('onSide')
    expect(plan.placements[0]!.sizeMm).toEqual({ x: 1800, y: 600, z: 600 })
  })

  it('kippt NICHT, wenn keine Lage angegeben ist', () => {
    // Fehlende `orientations` heissen „nur aufrecht" und nicht „egal wie".
    const v = auto({ cargoMm: { lengthMm: 2000, widthMm: 2000, heightMm: 700 } })
    const plan = packe(v, [stueck('lang', 600, 1800, 600)])

    expect(plan.placements).toEqual([])
    expect(plan.unplaced[0]!.grund).toBe('zu-gross')
  })
})
