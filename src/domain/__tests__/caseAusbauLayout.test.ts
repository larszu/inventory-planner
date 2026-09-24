import { describe, expect, it } from 'vitest'
import {
  dividerPlan,
  gleichmaessigeTeilung,
  rackGegenPlan,
  rackPlan,
  schubladenPlan,
  type RackBelegung,
} from '../lib/caseAusbauLayout'
import type { CaseStueck } from '../lib/caseLayout'

/**
 * DIE DREI ANDEREN AUSBAU-ARTEN.
 *
 * Gemessen wird vor allem, was sie NICHT tun: die Teilung nicht
 * „optimieren", eine fehlende Auszugshöhe nicht schätzen, und ein Rack ohne
 * angeschlossenen Plan nicht für leer erklären.
 */
const innen = { widthMm: 600, heightMm: 300, depthMm: 400 }

const stueck = (id: string, x: number, y: number, z: number): CaseStueck => ({
  id,
  label: id,
  sizeMm: { x, y, z },
})

describe('dividerPlan', () => {
  it('baut die Fächer aus der Teilung und nicht aus den Stücken', () => {
    // Die Wände stehen, wo der Nutzer sie hingesteckt hat.
    const r = dividerPlan(innen, { spaltenMm: [200, 200], reihenMm: [180, 180] }, [], 10)
    expect(r.faecher).toHaveLength(4)
    expect(r.faecher.map((f) => [f.xMm, f.zMm])).toEqual([
      [0, 0],
      [210, 0],
      [0, 190],
      [210, 190],
    ])
  })

  it('legt ein Stück ins KLEINSTE passende Fach', () => {
    // Sonst blockiert ein kleines Stück das grosse Fach, und das nächste
    // grosse hat keinen Platz mehr.
    const r = dividerPlan(innen, { spaltenMm: [100, 400], reihenMm: [380] }, [stueck('klein', 90, 50, 90)], 10)
    expect(r.faecher[0]!.stuecke.map((s) => s.id)).toEqual(['klein'])
    expect(r.faecher[1]!.stuecke).toEqual([])
  })

  it('dreht ein Stück, wenn es quer passt', () => {
    const r = dividerPlan(innen, { spaltenMm: [120], reihenMm: [380] }, [stueck('lang', 350, 50, 110)], 10)
    expect(r.ohnePlatz).toEqual([])
    expect(r.faecher[0]!.stuecke).toHaveLength(1)
  })

  it('nennt ein Stück, das in KEIN Fach passt, beim Namen', () => {
    const r = dividerPlan(innen, { spaltenMm: [100, 100], reihenMm: [100] }, [stueck('riese', 500, 50, 300)], 10)
    expect(r.ohnePlatz[0]).toMatchObject({ stueckId: 'riese', grund: 'zu-gross' })
  })

  it('unterscheidet „passt nirgends" von „alles voll"', () => {
    // Zwei verschiedene Probleme: das eine löst ein anderes Case, das
    // andere eine andere Teilung.
    const r = dividerPlan(
      innen,
      { spaltenMm: [200], reihenMm: [200] },
      [stueck('a', 190, 50, 190), stueck('b', 190, 50, 190)],
      10,
    )
    expect(r.ohnePlatz[0]!.grund).toBe('kein-platz')
    expect(r.ohnePlatz[0]!.text).toMatch(/full/)
  })

  it('lehnt ein Stück ab, das höher ist als der Innenraum', () => {
    const r = dividerPlan(innen, { spaltenMm: [200], reihenMm: [200] }, [stueck('hoch', 100, 500, 100)], 10)
    expect(r.ohnePlatz[0]!.grund).toBe('zu-gross')
  })

  it('zählt, was die Trennwände selbst wegnehmen', () => {
    // Das fehlt dem Inhalt und steht deshalb da, statt im Füllgrad
    // unterzugehen.
    const r = dividerPlan(innen, { spaltenMm: [200, 200], reihenMm: [180, 180] }, [], 10)
    expect(r.stegFlaecheMm2).toBeGreaterThan(0)
    expect(r.ausnutzung).toBeLessThan(1)
  })

  it('nennt ein Stück ohne Masse, statt es wegzulassen', () => {
    const r = dividerPlan(innen, { spaltenMm: [200], reihenMm: [200] }, [stueck('ohne', 0, 0, 0)], 10)
    expect(r.ohnePlatz[0]).toMatchObject({ grund: 'keine-masse' })
  })

  it('ist deterministisch', () => {
    const s = [stueck('a', 120, 40, 90), stueck('b', 180, 60, 100), stueck('c', 80, 40, 80)]
    const raster = { spaltenMm: [200, 200], reihenMm: [180, 180] }
    const vor = dividerPlan(innen, raster, s, 10)
    const zurueck = dividerPlan(innen, raster, [...s].reverse(), 10)
    expect(zurueck.faecher).toEqual(vor.faecher)
  })
})

describe('gleichmaessigeTeilung', () => {
  it('teilt und zieht die Stege ab', () => {
    const r = gleichmaessigeTeilung({ widthMm: 620, heightMm: 300, depthMm: 400 }, 3, 1, 10)
    // 620 - 2 Stege = 600, durch 3 = 200.
    expect(r.spaltenMm).toEqual([200, 200, 200])
    expect(r.reihenMm).toEqual([400])
  })

  it('legt den Rest in die LETZTE Spalte statt ihn zu verteilen', () => {
    // Verteilte Reste ergäben krumme Masse, nach denen niemand eine Wand
    // absägt.
    const r = gleichmaessigeTeilung({ widthMm: 601, heightMm: 300, depthMm: 400 }, 3, 1, 0)
    expect(r.spaltenMm).toEqual([200, 200, 201])
  })

  it('gibt nichts zurück, wenn die Stege mehr brauchen als da ist', () => {
    const r = gleichmaessigeTeilung({ widthMm: 50, heightMm: 300, depthMm: 400 }, 10, 1, 20)
    expect(r.spaltenMm).toEqual([])
  })
})

describe('schubladenPlan', () => {
  const s = (id: string, hoeheMm?: number) => ({ id, name: id, hoeheMm })

  it('stapelt von unten in der Reihenfolge der Liste', () => {
    // Welcher Auszug unten sitzt, ist eine Entscheidung und kein
    // Rechenergebnis.
    const r = schubladenPlan(innen, [s('a', 100), s('b', 80)])
    expect(r.lagen.map((l) => l.yMm)).toEqual([0, 100])
    expect(r.restHoeheMm).toBe(120)
  })

  it('SCHÄTZT keine fehlende Höhe, sondern nennt den Auszug', () => {
    // Eine angenommene Höhe verschöbe jeden Auszug darüber.
    const r = schubladenPlan(innen, [s('a', 100), s('ohne'), s('c', 80)])
    expect(r.ohneHoehe).toEqual(['ohne'])
    expect(r.lagen.map((l) => l.schublade.id)).toEqual(['a', 'c'])
  })

  it('sagt es, wenn die Auszüge zusammen höher sind als das Case', () => {
    const r = schubladenPlan(innen, [s('a', 200), s('b', 200)])
    expect(r.passtNicht).toBe(true)
    expect(r.restHoeheMm).toBe(0)
  })
})

describe('rackPlan', () => {
  it('sagt es, wenn die Rack-Höhe nicht hinterlegt ist', () => {
    // Wieviele HE das Case hat, ist eine Eigenschaft des Gegenstands — der
    // Plan kann das nicht beantworten.
    const r = rackPlan(undefined, undefined)
    expect(r.einheiten).toEqual([])
    expect(r.befunde.map((b) => b.art)).toEqual(['keine-hoehe'])
  })

  it('zeigt das leere Rack und BEHAUPTET NICHT, dass es leer ist', () => {
    // Der Unterschied ist der ganze Punkt der Trennung: „kein Plan
    // angeschlossen" ist etwas anderes als „nichts drin".
    const r = rackPlan({ hoeheHE: 12 }, undefined)
    expect(r.einheiten).toHaveLength(12)
    expect(r.freiHE).toBe(12)
    expect(r.befunde.map((b) => b.art)).toEqual(['kein-plan'])
    expect(r.befunde[0]!.text).toMatch(/not a statement that it is empty/)
  })

  it('zählt Höheneinheiten von UNTEN', () => {
    const r = rackPlan({ hoeheHE: 4 }, [])
    expect(r.einheiten.map((e) => e.he)).toEqual([1, 2, 3, 4])
  })

  it('trägt die Bestückung des Plans ein', () => {
    const belegung: RackBelegung[] = [{ startHE: 1, hoeheHE: 2, label: 'Mischer' }]
    const r = rackPlan({ hoeheHE: 6 }, belegung)
    expect(r.einheiten[0]!.belegtVon).toBe('Mischer')
    expect(r.einheiten[1]!.belegtVon).toBe('Mischer')
    expect(r.einheiten[2]!.belegtVon).toBeUndefined()
    expect(r.freiHE).toBe(4)
  })

  it('MELDET, wenn der Plan höher baut als das Case ist', () => {
    // Der Befund, den es ohne die Trennung nicht geben konnte — und er
    // kommt, bevor der LKW fährt.
    const r = rackPlan({ hoeheHE: 12 }, [{ startHE: 11, hoeheHE: 4, label: 'Endstufe' }])
    const b = r.befunde.find((x) => x.art === 'ueberbelegt')
    expect(b).toBeDefined()
    expect(b!.text).toContain('14')
    expect(b!.text).toContain('12')
  })

  it('meldet zwei Geräte auf derselben Höheneinheit', () => {
    const r = rackPlan({ hoeheHE: 6 }, [
      { startHE: 1, hoeheHE: 2, label: 'Mischer' },
      { startHE: 2, hoeheHE: 1, label: 'Funk' },
    ])
    expect(r.befunde.some((b) => b.art === 'ueberlappung')).toBe(true)
  })

  it('kommt mit einer leeren Bestückung zurecht, ohne „kein Plan" zu sagen', () => {
    // Eine angeschlossene, aber leere Bestückung ist eine Aussage: das Rack
    // ist wirklich leer.
    const r = rackPlan({ hoeheHE: 4 }, [])
    expect(r.befunde).toEqual([])
    expect(r.freiHE).toBe(4)
  })
})

describe('das Rack gegen die Datei des Plans', () => {
  const plan = {
    hoeheHE: 12,
    belegung: [
      { startHE: 11, hoeheHE: 1, label: 'Patch vorn', seite: 'front' as const },
      { startHE: 11, hoeheHE: 1, label: 'Patch hinten', seite: 'rear' as const },
      { startHE: 1, hoeheHE: 2, label: 'Netzteil' },
    ],
  }

  it('Front- und Rückschiene in derselben HE sind keine Doppelbelegung', () => {
    const r = rackGegenPlan({ hoeheHE: 12, planRef: 'r1' }, plan, true)
    expect(r.befunde.filter((b) => b.art === 'ueberlappung')).toEqual([])
    expect(r.einheiten[10].belegtVon).toBe('Patch vorn / Patch hinten')
    expect(r.freiHE).toBe(9)
  })

  it('ein volles Gerät und eine Blende in derselben HE sind es sehr wohl', () => {
    const r = rackGegenPlan(
      { hoeheHE: 4, planRef: 'r1' },
      { hoeheHE: 4, belegung: [{ startHE: 2, hoeheHE: 1, label: 'Server' }, { startHE: 2, hoeheHE: 1, label: 'Blende', seite: 'rear' }] },
      true,
    )
    expect(r.befunde.some((b) => b.art === 'ueberlappung')).toBe(true)
  })

  it('meldet, wenn der Plan das Rack höher baut, als das Case ist', () => {
    const r = rackGegenPlan({ hoeheHE: 10, planRef: 'r1' }, plan, true)
    expect(r.befunde.map((b) => b.art)).toContain('plan-hoeher')
    expect(r.befunde.map((b) => b.art)).toContain('ueberbelegt')
  })

  it('eine Kennung, die die Datei nicht kennt, heisst „fehlt im Plan“ und nicht „leer“', () => {
    const r = rackGegenPlan({ hoeheHE: 6, planRef: 'weg' }, undefined, true)
    expect(r.befunde.map((b) => b.art)).toEqual(['plan-fehlt'])
    expect(r.befunde[0].text).toMatch(/weg/)
  })

  it('ohne eingelesene Datei ist schlicht nichts angeschlossen', () => {
    const r = rackGegenPlan({ hoeheHE: 6, planRef: 'r1' }, undefined, false)
    expect(r.befunde.map((b) => b.art)).toEqual(['kein-plan'])
  })
})
