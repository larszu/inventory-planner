// ───────────────────────────────────────────────────────────────────────────
// Was die Flächen der Halle über den Bestand sagen.
//
// DIE WICHTIGSTE AUSSAGE steht im letzten Block: das engste Tor ist ZWEI
// Tore, wenn das schmalste und das niedrigste verschiedene sind. Eines davon
// „das engste" zu nennen wäre eine Auskunft über ein Tor, das es so nicht
// gibt — und genau daran scheitert dann ein Case.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import {
  engstesTor,
  flaechenUeberlapp,
  passtDurchTor,
  verstellt,
  verstelltText,
} from '../lib/hallenflaechen'
import type { FlaechenArt, Hallenflaeche } from '../types/halle'
import type { StorageNode } from '../types/inventory'

const now = '2026-09-18T00:00:00.000Z'

const flaeche = (
  id: string,
  art: FlaechenArt,
  x: number,
  z: number,
  b = 2000,
  tf = 1000,
  licht?: { b: number; h: number },
): Hallenflaeche => ({
  id,
  name: id,
  art,
  stellplatz: { xMm: x, zMm: z, breiteMm: b, tiefeMm: tf },
  lichtBreiteMm: licht?.b,
  lichtHoeheMm: licht?.h,
  createdAt: now,
  updatedAt: now,
})

const raum = (id: string, x: number, z: number, b: number, tf: number): StorageNode => ({
  id,
  name: id,
  kind: 'depot',
  stellplatz: { xMm: x, zMm: z, breiteMm: b, tiefeMm: tf },
  createdAt: now,
  updatedAt: now,
})

const regal = (id: string, x: number, z: number): StorageNode => ({
  id,
  name: id,
  kind: 'shelf',
  stellplatz: { xMm: x, zMm: z, breiteMm: 1000, tiefeMm: 500 },
  createdAt: now,
  updatedAt: now,
})

describe('Überlapp', () => {
  it('Berührung zählt nicht', () => {
    const a = { xMm: 0, zMm: 0, breiteMm: 1000, tiefeMm: 1000 }
    expect(flaechenUeberlapp(a, { xMm: 1000, zMm: 0, breiteMm: 1000, tiefeMm: 1000 })).toBe(false)
    expect(flaechenUeberlapp(a, { xMm: 999, zMm: 0, breiteMm: 1000, tiefeMm: 1000 })).toBe(true)
  })
})

describe('Was frei bleiben muss', () => {
  const wege = [
    flaeche('gang', 'verkehrsweg', 0, 0, 10000, 2000),
    flaeche('tor-nord', 'tor', 0, 5000, 3000, 400),
    flaeche('brand', 'sperrflaeche', 8000, 8000),
  ]

  it('meldet ein Regal im Verkehrsweg', () => {
    const v = verstellt([regal('A', 1000, 500)], wege)
    expect(v).toHaveLength(1)
    expect(v[0]!.flaeche.id).toBe('gang')
  })

  it('meldet auch das Regal vor dem Tor und in der Sperrfläche', () => {
    const v = verstellt([regal('A', 100, 5100), regal('B', 8100, 8100)], wege)
    expect(v.map((x) => x.flaeche.id).sort()).toEqual(['brand', 'tor-nord'])
  })

  it('meldet NICHT, was auf einer Stellfläche oder in der Pickzone steht', () => {
    // Dort soll etwas stehen. Ein Werkzeug, das auch das meldet, macht seine
    // Meldungen wertlos.
    const erlaubt = [flaeche('stell', 'stellflaeche', 0, 0, 10000, 10000), flaeche('pick', 'pickzone', 0, 0, 10000, 10000)]
    expect(verstellt([regal('A', 1000, 1000)], erlaubt)).toEqual([])
  })

  it('meldet die Halle NICHT, die die Fläche umschliesst', () => {
    // Der Befund, der die Funktion geändert hat: die Halle enthält ihre
    // Tore und überlappt deshalb mit allem darin. Der Plan meldete dreimal
    // „Halle 1 steht auf Tor Nord" — eine Meldung, die immer kommt, liest
    // nach dem zweiten Mal niemand mehr.
    expect(verstellt([raum('Halle 1', 0, 0, 12000, 9000)], wege)).toEqual([])
  })

  it('meldet nichts über Lagerorte ohne Grundfläche', () => {
    const ohne: StorageNode = { id: 'X', name: 'X', kind: 'shelf', createdAt: now, updatedAt: now }
    expect(verstellt([ohne], wege)).toEqual([])
  })

  it('sagt es im Klartext', () => {
    const v = verstellt([regal('Regal A', 1000, 500)], wege)
    expect(verstelltText(v[0]!)).toBe('Regal A stands on gang — that has to stay clear.')
  })
})

describe('Das engste Tor sind zwei Tore', () => {
  it('nimmt Breite und Höhe von verschiedenen Toren', () => {
    // Das schmale Tor ist hoch, das breite ist niedrig. Was durch beide muss,
    // muss durch 2000 breit UND 1800 hoch — obwohl kein einzelnes Tor dieses
    // Mass hat.
    const tore = [
      flaeche('schmal', 'tor', 0, 0, 3000, 400, { b: 2000, h: 3000 }),
      flaeche('niedrig', 'tor', 5000, 0, 3000, 400, { b: 4000, h: 1800 }),
    ]
    expect(engstesTor(tore)).toEqual({ breiteMm: 2000, hoeheMm: 1800, name: 'schmal / niedrig' })
  })

  it('nennt ein Tor beim Namen, wenn es dasselbe ist', () => {
    const tore = [
      flaeche('eng', 'tor', 0, 0, 3000, 400, { b: 2000, h: 1800 }),
      flaeche('weit', 'tor', 5000, 0, 3000, 400, { b: 4000, h: 3000 }),
    ]
    expect(engstesTor(tore)!.name).toBe('eng')
  })

  it('erfindet kein Mass, wo keines steht', () => {
    expect(engstesTor([])).toBeNull()
    expect(engstesTor([flaeche('ohne', 'tor', 0, 0)])).toBeNull()
    // Halb vermessen zählt nicht: eine Breite ohne Höhe ist kein Torblatt.
    expect(engstesTor([flaeche('halb', 'tor', 0, 0, 3000, 400, { b: 2000, h: 0 })])).toBeNull()
  })
})

describe('Passt es durch das Tor', () => {
  const tor = { breiteMm: 2000, hoeheMm: 2200, name: 'Nord' }

  it('lässt durch, was hineinpasst', () => {
    expect(passtDurchTor(tor, { breiteMm: 1800, hoeheMm: 2000, tiefeMm: 800 })).toBe(true)
  })

  it('dreht am Tor, aber kippt nicht', () => {
    // 2400 breit passt nicht — 700 tief schon. Gedreht geht es durch.
    expect(passtDurchTor(tor, { breiteMm: 2400, hoeheMm: 2000, tiefeMm: 700 })).toBe(true)
    // Zu hoch bleibt zu hoch: gekippt stünden die Rollen nicht mehr unten.
    expect(passtDurchTor(tor, { breiteMm: 800, hoeheMm: 2400, tiefeMm: 700 })).toBe(false)
  })
})
