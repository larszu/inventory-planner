// ───────────────────────────────────────────────────────────────────────────
// Gewicht, Schwerpunkt, Achslast (#24).
//
// DIE WICHTIGSTEN FÄLLE DIESER DATEI SIND DIE, IN DENEN NICHTS HERAUSKOMMT.
// Ein Lastverteilungsplan ist das Papier, nach dem bei einer Kontrolle
// gefragt wird; eine Zahl darauf, die aus geschätzten Fahrzeugdaten stammt,
// sieht aus wie eine Messung. Die Tests halten deshalb vier Stellen fest, an
// denen dieses Modul schweigt, obwohl es rechnen könnte — und je einen Satz
// dazu, warum.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { achslasten, haftungshinweis, schwerpunkt, sicherungsmittel, ueberladung } from '../lib/lastverteilung'
import { packe } from '../lib/loadPacker'
import type { PackStueck } from '../lib/loadPacker'
import type { Vehicle } from '../types/vehicle'

const now = '2026-09-18T00:00:00.000Z'

const auto = (patch: Partial<Vehicle> = {}): Vehicle => ({
  id: 'v1',
  name: 'Sprinter',
  kind: 'transporter',
  cargoMm: { lengthMm: 4000, widthMm: 1800, heightMm: 1900 },
  obstructions: [],
  // Zwei Achsen, 3.665 mm Radstand, Ladefläche 1.100 mm hinter der
  // Vorderachse — die Zahlen eines Sprinter L2, damit die Hebel plausibel
  // sind und ein Fehler im Vorzeichen auffällt.
  axles: [
    { positionMm: 0, maxLastKg: 1850, leergewichtKg: 1300 },
    { positionMm: 3665, maxLastKg: 2500, leergewichtKg: 800 },
  ],
  ladeflaecheAbVorderachseMm: 1100,
  nutzlastKg: 1200,
  createdAt: now,
  updatedAt: now,
  ...patch,
})

const stueck = (id: string, kg?: number, fixiert?: PackStueck['fixiert']): PackStueck => ({
  id,
  label: id,
  sizeMm: { x: 600, y: 600, z: 600 },
  weightKg: kg,
  fixiert,
})

describe('schwerpunkt', () => {
  it('liegt zwischen zwei gleich schweren Stücken', () => {
    const plan = packe(
      auto(),
      [
        stueck('a', 100, { position: { x: 0, y: 0, z: 0 }, lage: 'upright' }),
        stueck('b', 100, { position: { x: 0, y: 0, z: 2000 }, lage: 'upright' }),
      ],
    )
    const sp = schwerpunkt(plan)
    expect(sp.bekannt).toBe(true)
    if (!sp.bekannt) return
    expect(sp.wert.zMm).toBe(1300) // (300 + 2300) / 2
    expect(sp.wert.kg).toBe(200)
    expect(sp.wert.ohneGewicht).toBe(0)
  })

  it('zieht zum schwereren Stück', () => {
    const plan = packe(auto(), [
      stueck('leicht', 50, { position: { x: 0, y: 0, z: 0 }, lage: 'upright' }),
      stueck('schwer', 450, { position: { x: 0, y: 0, z: 2000 }, lage: 'upright' }),
    ])
    const sp = schwerpunkt(plan)
    if (!sp.bekannt) throw new Error('erwartet bekannt')
    expect(sp.wert.zMm).toBeGreaterThan(2000)
  })

  it('zählt die ungewogenen Stücke, statt sie als leicht zu behandeln', () => {
    const plan = packe(auto(), [stueck('a', 100), stueck('b')])
    const sp = schwerpunkt(plan)
    if (!sp.bekannt) throw new Error('erwartet bekannt')
    expect(sp.wert.ohneGewicht).toBe(1)
    expect(sp.wert.kg).toBe(100)
  })

  it('schweigt, wenn kein einziges Stück gewogen ist', () => {
    const sp = schwerpunkt(packe(auto(), [stueck('a'), stueck('b')]))
    expect(sp.bekannt).toBe(false)
  })
})

describe('achslasten', () => {
  const einStueck = (kg: number, z: number) =>
    packe(auto(), [stueck('a', kg, { position: { x: 600, y: 0, z }, lage: 'upright' })])

  it('legt eine Last über der Hinterachse fast ganz auf die Hinterachse', () => {
    // Schwerpunkt bei z = 2565 + 300 → Hebelarm 3965 mm bei 3665 Radstand:
    // etwas HINTER der Hinterachse, die Vorderachse wird entlastet.
    const a = achslasten(einStueck(600, 2265), auto())
    if (!a.bekannt) throw new Error(a.grund)
    const [vorn, hinten] = a.wert
    expect(hinten!.ausLadungKg).toBeGreaterThan(550)
    expect(vorn!.ausLadungKg).toBeLessThan(50)
    expect(vorn!.ausLadungKg + hinten!.ausLadungKg).toBe(600)
  })

  it('verteilt eine Last in der Mitte des Radstands etwa hälftig', () => {
    // Hebelarm = 3665/2 = 1832,5 → z = 1832,5 - 1100 - 300 = 432,5
    const a = achslasten(einStueck(400, 430), auto())
    if (!a.bekannt) throw new Error(a.grund)
    expect(a.wert[0]!.ausLadungKg).toBeCloseTo(200, -1)
    expect(a.wert[1]!.ausLadungKg).toBeCloseTo(200, -1)
  })

  it('rechnet die Leerlast mit und nennt die Überschreitung in kg', () => {
    // 1.800 kg genau über der Hinterachse: 800 kg Leerlast dazu, also 2.600
    // gegen 2.500 zulässig. Mit 1.000 kg wäre nichts überschritten — das
    // Fahrzeug trägt es, die Zuladung nicht, und das sind zwei Grenzen.
    const a = achslasten(einStueck(1800, 2265), auto())
    if (!a.bekannt) throw new Error(a.grund)
    const hinten = a.wert[1]!
    expect(hinten.gesamtKg).toBe(800 + hinten.ausLadungKg)
    expect(hinten.ueberKg).toBe(hinten.gesamtKg! - 2500)
    expect(hinten.ueberKg).toBeGreaterThan(0)
  })

  it('nennt keine Gesamtlast ohne gewogene Leerlast — und keine Überschreitung', () => {
    const ohneLeer = auto({
      axles: [
        { positionMm: 0, maxLastKg: 1850 },
        { positionMm: 3665, maxLastKg: 2500 },
      ],
    })
    const a = achslasten(einStueck(1000, 2265), ohneLeer)
    if (!a.bekannt) throw new Error(a.grund)
    expect(a.wert[1]!.ausLadungKg).toBeGreaterThan(0)
    expect(a.wert[1]!.gesamtKg).toBeUndefined()
    expect(a.wert[1]!.ueberKg).toBeUndefined()
  })

  it('schweigt bei drei Achsen', () => {
    const drei = auto({
      axles: [
        { positionMm: 0, maxLastKg: 7500 },
        { positionMm: 4500, maxLastKg: 11500 },
        { positionMm: 5850, maxLastKg: 11500 },
      ],
    })
    const a = achslasten(einStueck(600, 1000), drei)
    expect(a.bekannt).toBe(false)
    if (a.bekannt) return
    expect(a.grund).toContain('suspension')
  })

  it('schweigt ohne eingetragene Ladeflächen-Lage', () => {
    const a = achslasten(einStueck(600, 1000), auto({ ladeflaecheAbVorderachseMm: undefined }))
    expect(a.bekannt).toBe(false)
  })

  it('schweigt, solange ein Stück ohne Gewicht mitfährt', () => {
    const plan = packe(auto(), [stueck('a', 300), stueck('b')])
    const a = achslasten(plan, auto())
    expect(a.bekannt).toBe(false)
    if (a.bekannt) return
    expect(a.grund).toContain('1')
  })

  it('schweigt ohne Achsen', () => {
    expect(achslasten(einStueck(600, 1000), auto({ axles: undefined })).bekannt).toBe(false)
  })
})

describe('ueberladung', () => {
  it('nennt das Stück, mit dem die Zuladung gerissen wurde', () => {
    // 1.200 kg Zuladung, vier Stücke à 400 kg: das dritte reisst sie.
    const plan = packe(
      auto(),
      ['a', 'b', 'c', 'd'].map((id) => stueck(id, 400)),
    )
    const u = ueberladung(plan, auto())
    if (!u.bekannt) throw new Error(u.grund)
    expect(u.wert).not.toBeNull()
    const reihe = [...plan.placements].sort((a, b) => a.ladeSchritt - b.ladeSchritt)
    expect(u.wert!.label).toBe(reihe[3]!.label)
    expect(u.wert!.ueberKg).toBe(400)
  })

  it('schweigt zu einer Ladung, die passt', () => {
    const u = ueberladung(packe(auto(), [stueck('a', 400)]), auto())
    if (!u.bekannt) throw new Error(u.grund)
    expect(u.wert).toBeNull()
  })

  it('sagt „nicht angegeben" statt null, wenn keine Nutzlast eingetragen ist', () => {
    const u = ueberladung(packe(auto(), [stueck('a', 400)]), auto({ nutzlastKg: undefined }))
    expect(u.bekannt).toBe(false)
  })

  it('zählt die ungewogenen Stücke mit, ohne sie zu wiegen', () => {
    const u = ueberladung(packe(auto(), [stueck('a', 1300), stueck('b')]), auto())
    if (!u.bekannt) throw new Error(u.grund)
    expect(u.wert!.ohneGewicht).toBe(1)
  })
})

describe('was das Modul NICHT tut', () => {
  it('führt die Sicherungsmittel als Liste und nicht als Rechnung', () => {
    const liste = sicherungsmittel()
    expect(liste.length).toBeGreaterThan(2)
    expect(liste.every((s) => s.length > 0)).toBe(true)
  })

  it('erteilt keine Freigabe', () => {
    expect(haftungshinweis()).toContain('no clearance')
  })
})
