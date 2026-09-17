import { describe, expect, it } from 'vitest'
import { freierRaum, nutzlastFrei, passtDurchOeffnung } from '../lib/laderaum'
import { healVehicle } from '../store/vehicleStore'
import type { Vehicle } from '../types/vehicle'

// ───────────────────────────────────────────────────────────────────────────
// Der Laderaum (Ladeplanung, Issue #18).
//
// Die teuerste Auskunft dieser Datei wäre ein „passt" über ein Fahrzeug,
// dessen Heckklappe niemand vermessen hat. Deshalb liefert jede der drei
// Fragen eine Auskunft, die auch „nicht angegeben" sein darf — und die Tests
// prüfen genau das härter als den Normalfall.
// ───────────────────────────────────────────────────────────────────────────

const transporter = (over: Partial<Vehicle> = {}): Vehicle => ({
  id: 'v1',
  name: 'Transporter',
  kind: 'transporter',
  cargoMm: { lengthMm: 3200, widthMm: 1800, heightMm: 1900 },
  obstructions: [],
  createdAt: '2026-09-17T00:00:00.000Z',
  updatedAt: '2026-09-17T00:00:00.000Z',
  ...over,
})

const radkasten = (name: string, x: number): Vehicle['obstructions'][number] => ({
  name,
  kind: 'radkasten',
  originMm: { x: 0, y: 1200, z: 0 },
  sizeMm: { x, y: 700, z: 350 },
})

describe('Freier Raum', () => {
  it('rechnet den Bruttoquader in Litern', () => {
    // 3,2 m x 1,8 m x 1,9 m = 10,944 m3
    expect(freierRaum(transporter()).bruttoLiter).toBeCloseTo(10944, 0)
  })

  it('zieht Hindernisse ab', () => {
    const v = transporter({ obstructions: [radkasten('links', 150), radkasten('rechts', 150)] })
    const r = freierRaum(v)

    expect(r.hindernisLiter).toBeGreaterThan(0)
    expect(r.nettoLiter).toBeCloseTo(r.bruttoLiter - r.hindernisLiter, 5)
  })

  it('meldet die Bodenbreite ZWISCHEN den Radkästen, nicht die Innenbreite', () => {
    // Das ist der Fehler, den eine reine Volumenrechnung nicht zeigt: unten
    // ist der Wagen schmaler, und dort steht die erste Lage.
    const v = transporter({ obstructions: [radkasten('links', 150), radkasten('rechts', 150)] })

    expect(freierRaum(v).bodenBreiteMm).toBe(1500)
    expect(freierRaum(transporter()).bodenBreiteMm).toBe(1800)
  })

  it('lässt die Bodenbreite nicht negativ werden', () => {
    const v = transporter({ obstructions: [radkasten('links', 2000), radkasten('rechts', 2000)] })
    expect(freierRaum(v).bodenBreiteMm).toBe(0)
  })
})

describe('Passt es durch die Öffnung', () => {
  const mitKlappe = transporter({ aperture: { widthMm: 1500, heightMm: 1800, sillHeightMm: 600 } })

  it('findet die Lage, in der es durchgeht', () => {
    // 1600 breit passt nicht aufrecht, gekippt aber schon.
    const a = passtDurchOeffnung({ widthMm: 1600, heightMm: 700, depthMm: 600 }, mitKlappe)

    expect(a.bekannt).toBe(true)
    if (a.bekannt) {
      expect(a.wert.passt).toBe(true)
      expect(a.wert.lage).not.toBe('upright')
    }
  })

  it('sagt nein, wenn es in keiner Lage durchgeht', () => {
    const a = passtDurchOeffnung({ widthMm: 2000, heightMm: 1900, depthMm: 1850 }, mitKlappe)

    expect(a.bekannt).toBe(true)
    if (a.bekannt) expect(a.wert.passt).toBe(false)
  })

  it('OHNE eingetragene Öffnung ist die Antwort „nicht angegeben", NICHT „passt"', () => {
    // Der wichtigste Test dieser Datei.
    const a = passtDurchOeffnung({ widthMm: 100, heightMm: 100, depthMm: 100 }, transporter())

    expect(a.bekannt).toBe(false)
    if (!a.bekannt) expect(a.grund).toMatch(/aperture/i)
  })

  it('ein Stück ohne vollständige Maße ergibt keine Antwort', () => {
    const a = passtDurchOeffnung({ widthMm: 500, heightMm: 400 }, mitKlappe)
    expect(a.bekannt).toBe(false)
  })

  it('prüft nur die erlaubten Lagen', () => {
    const quer = { widthMm: 1600, heightMm: 700, depthMm: 600 }

    expect(passtDurchOeffnung(quer, mitKlappe, ['upright']).bekannt).toBe(true)
    const nurAufrecht = passtDurchOeffnung(quer, mitKlappe, ['upright'])
    if (nurAufrecht.bekannt) expect(nurAufrecht.wert.passt).toBe(false)
  })

  it('nimmt eine Übersetzung an und liefert sonst die englische Quelle', () => {
    const a = passtDurchOeffnung({ widthMm: 1 }, transporter(), undefined, () => 'Keine Öffnung erfasst.')
    expect(a.bekannt).toBe(false)
    if (!a.bekannt) expect(a.grund).toBe('Keine Öffnung erfasst.')
  })
})

describe('Nutzlast', () => {
  it('rechnet die Restlast', () => {
    const a = nutzlastFrei(transporter({ nutzlastKg: 1150 }), 800)
    expect(a.bekannt).toBe(true)
    if (a.bekannt) expect(a.wert).toBe(350)
  })

  it('wird negativ statt bei null zu klemmen — Überladung muss sichtbar sein', () => {
    const a = nutzlastFrei(transporter({ nutzlastKg: 1150 }), 1400)
    expect(a.bekannt).toBe(true)
    if (a.bekannt) expect(a.wert).toBe(-250)
  })

  it('OHNE eingetragene Nutzlast kommt KEINE Zahl', () => {
    // Eine gerechnete Restlast aus geschätzten Fahrzeugdaten sähe auf dem
    // Ladeplan aus wie eine Messung. Bei der Kontrolle wiegt die Waage.
    const a = nutzlastFrei(transporter(), 800)

    expect(a.bekannt).toBe(false)
    if (!a.bekannt) expect(a.grund).toMatch(/payload/i)
  })
})

describe('Fahrzeuge heilen', () => {
  const roh = {
    name: 'Ducato L2H2',
    kind: 'transporter',
    cargoMm: { lengthMm: 3120, widthMm: 1870, heightMm: 1932 },
  }

  it('nimmt ein Fahrzeug mit Laderaum-Maßen an', () => {
    expect(healVehicle(roh)?.name).toBe('Ducato L2H2')
  })

  it('weist ein Fahrzeug ohne Laderaum-Maße ab', () => {
    expect(healVehicle({ name: 'Ohne Maße', kind: 'transporter' })).toBeNull()
    expect(healVehicle({ ...roh, cargoMm: { lengthMm: 3120, widthMm: 1870 } })).toBeNull()
  })

  it('weist eine unbekannte Fahrzeugklasse ab', () => {
    expect(healVehicle({ ...roh, kind: 'raumschiff' })).toBeNull()
  })

  it('verwirft eine halb vermessene Öffnung ganz', () => {
    // Sonst prüfte passtDurchOeffnung gegen eine erfundene zweite Kante.
    const v = healVehicle({ ...roh, aperture: { widthMm: 1400 } })
    expect(v?.aperture).toBeUndefined()
  })

  it('erfindet keine Nutzlast und keine Führerscheinklasse', () => {
    const v = healVehicle(roh)
    expect(v?.nutzlastKg).toBeUndefined()
    expect(v?.fuehrerscheinKlasse).toBeUndefined()

    expect(healVehicle({ ...roh, nutzlastKg: 0 })?.nutzlastKg).toBeUndefined()
    expect(healVehicle({ ...roh, fuehrerscheinKlasse: 'X' })?.fuehrerscheinKlasse).toBeUndefined()
  })

  it('behält eine gültige Führerscheinklasse — die Zeile, wegen der die Disposition das braucht', () => {
    expect(healVehicle({ ...roh, fuehrerscheinKlasse: 'C1' })?.fuehrerscheinKlasse).toBe('C1')
  })

  it('wirft unbrauchbare Hindernisse weg, statt sie zu raten', () => {
    const v = healVehicle({
      ...roh,
      obstructions: [
        { name: 'Radkasten links', kind: 'radkasten', originMm: { x: 0, y: 1200, z: 0 }, sizeMm: { x: 150, y: 700, z: 350 } },
        { name: 'ohne Maße', kind: 'radkasten' },
        { kind: 'sitzbank', originMm: { x: 0, y: 0, z: 0 }, sizeMm: { x: 1, y: 1, z: 1 } },
      ],
    })

    expect(v?.obstructions).toHaveLength(1)
  })
})
