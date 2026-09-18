// ───────────────────────────────────────────────────────────────────────────
// Die Form des Laderaums: Ecken, Kanten, Rundungen.
//
// DIE WICHTIGSTE AUSSAGE DIESER DATEI steht im Block „Bild und Rechnung
// sagen dasselbe": der Grundriss, den jemand sieht, ist derselbe Raum, in
// den der Packer packt. Ein Werkzeug, bei dem das auseinanderläuft, zeigt
// eine Kiste an einer Stelle, an der sie nicht steht.
//
// Die zweite steht in „Die konservative Richtung": wo gerundet wird, darf
// das Bild NIE mehr Platz zeigen, als es gibt. Ein Plan, der zu wenig
// verspricht, kostet eine Fahrt; einer, der zu viel verspricht, kostet den
// Aufbau.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import {
  fehltAnKante,
  kantenVerlustLiter,
  konturBeiHoehe,
  konturFlaeche,
  konturHoehen,
  punktFrei,
  quaderFrei,
  raumMasse,
  wandEinzuege,
} from '../lib/kontur'
import type { Kantenform, Vehicle } from '../types/vehicle'

const now = '2026-09-18T00:00:00.000Z'

const auto = (kanten?: Kantenform[]): Vehicle => ({
  id: 'v1',
  name: 'Sprinter',
  kind: 'transporter',
  cargoMm: { lengthMm: 4000, widthMm: 1800, heightMm: 2000 },
  kanten,
  obstructions: [],
  createdAt: now,
  updatedAt: now,
})

/** Die gerundete Dachkante rechts, über die ganze Länge. */
const dachkanteRechts = (r = 300): Kantenform => ({
  achse: 'z',
  seiten: ['max', 'max'],
  art: 'rundung',
  aMm: r,
  bMm: r,
  name: 'Dachkante rechts',
})

/** Der zum Heck verjüngte Kofferraum, linke Seite. */
const heckSchraegeLinks = (): Kantenform => ({
  achse: 'y',
  seiten: ['min', 'max'],
  art: 'fase',
  aMm: 400,
  bMm: 800,
})

describe('Ohne Eintrag bleibt die Kante scharf', () => {
  it('lässt einen Quader ganz frei', () => {
    const v = auto()
    expect(quaderFrei(v.kanten, raumMasse(v), { x: 0, y: 0, z: 0 }, { x: 1800, y: 2000, z: 4000 })).toBe(true)
  })

  it('zeichnet das volle Rechteck', () => {
    expect(konturFlaeche(konturBeiHoehe(auto(), 0))).toBe(1800 * 4000)
  })

  it('nimmt kein Volumen weg', () => {
    expect(kantenVerlustLiter(auto())).toBe(0)
  })
})

describe('Eine gerundete Dachkante', () => {
  const v = auto([dachkanteRechts(300)])

  it('lässt die Ecke ganz oben rechts nicht mehr zu', () => {
    // 10 mm unter der Decke, 10 mm von der rechten Wand: das ist ausserhalb
    // des Viertelkreises.
    expect(punktFrei(v.kanten, raumMasse(v), { x: 1790, y: 1990, z: 2000 })).toBe(false)
  })

  it('lässt die Mitte der Decke zu', () => {
    expect(punktFrei(v.kanten, raumMasse(v), { x: 900, y: 1990, z: 2000 })).toBe(true)
  })

  it('lässt den Boden unter der Rundung zu — sie greift nur oben', () => {
    expect(punktFrei(v.kanten, raumMasse(v), { x: 1790, y: 0, z: 2000 })).toBe(true)
  })

  it('weist ein hohes Case an der rechten Wand ab, ein niedriges nicht', () => {
    const raum = raumMasse(v)
    const anDerWand = (h: number) =>
      quaderFrei(v.kanten, raum, { x: 1300, y: 0, z: 0 }, { x: 500, y: h, z: 600 })

    expect(anDerWand(1600)).toBe(true)
    expect(anDerWand(2000)).toBe(false)
  })

  it('nimmt der Grundfläche NUR oben etwas weg', () => {
    const unten = konturFlaeche(konturBeiHoehe(v, 0))
    const oben = konturFlaeche(konturBeiHoehe(v, 1990))

    expect(unten).toBe(1800 * 4000)
    expect(oben).toBeLessThan(unten)
  })

  it('verliert ungefähr das Volumen eines Viertelzylinders', () => {
    // r² (1 - π/4) je Meter Länge. Kein „ungefähr" aus Bequemlichkeit: die
    // Rechnung läuft über aufsummierte Grundrisse, und die Sehnen liegen
    // innen — der Verlust ist also etwas GRÖSSER als die glatte Formel.
    const glatt = (300 * 300 * (1 - Math.PI / 4) * 4000) / 1_000_000
    const gemessen = kantenVerlustLiter(v)

    expect(gemessen).toBeGreaterThanOrEqual(glatt)
    expect(gemessen).toBeLessThan(glatt * 1.1)
  })
})

describe('Eine gebrochene Ecke im Grundriss', () => {
  const v = auto([heckSchraegeLinks()])

  it('schneidet die Ecke hinten links weg — in jeder Höhe gleich', () => {
    const unten = konturFlaeche(konturBeiHoehe(v, 0))
    const oben = konturFlaeche(konturBeiHoehe(v, 1999))

    expect(unten).toBeCloseTo(1800 * 4000 - (400 * 800) / 2, 3)
    expect(oben).toBeCloseTo(unten, 3)
  })

  it('weist ein Stück in der Ecke ab', () => {
    expect(quaderFrei(v.kanten, raumMasse(v), { x: 0, y: 0, z: 3800 }, { x: 300, y: 500, z: 200 })).toBe(false)
  })

  it('lässt dasselbe Stück weiter innen zu', () => {
    expect(quaderFrei(v.kanten, raumMasse(v), { x: 500, y: 0, z: 3800 }, { x: 300, y: 500, z: 200 })).toBe(true)
  })
})

describe('Bild und Rechnung sagen dasselbe', () => {
  // Der Kern: was `konturBeiHoehe` zeichnet, muss `quaderFrei` zulassen —
  // und umgekehrt. Geprüft auf einem Gitter über einen Raum mit vier
  // Kanten, darunter zwei, die sich eine Ecke teilen.
  const v = auto([
    dachkanteRechts(300),
    { achse: 'z', seiten: ['min', 'max'], art: 'rundung', aMm: 300, bMm: 300 },
    heckSchraegeLinks(),
    { achse: 'x', seiten: ['min', 'max'], art: 'fase', aMm: 200, bMm: 250 },
  ])
  const raum = raumMasse(v)

  const imPolygon = (punkte: { x: number; z: number }[], p: { x: number; z: number }): boolean => {
    // Konvex und gegen den Uhrzeigersinn: innen liegt links von jeder Kante.
    for (let i = 0; i < punkte.length; i += 1) {
      const a = punkte[i]!
      const b = punkte[(i + 1) % punkte.length]!
      if ((b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x) < -1) return false
    }
    return true
  }

  it('stimmt auf einem Gitter überein', () => {
    let geprueft = 0
    for (let y = 0; y <= raum.y; y += 100) {
      const kontur = konturBeiHoehe(v, y, 48)
      for (let x = 0; x <= raum.x; x += 60) {
        for (let z = 0; z <= raum.z; z += 125) {
          const gerechnet = punktFrei(v.kanten, raum, { x, y, z })
          const gezeichnet = imPolygon(kontur, { x, z })
          // Wo sie sich unterscheiden, ist es die Sehne — und die liegt
          // INNEN. Gezeichnet frei, aber gerechnet belegt darf es nicht
          // geben; andersherum schon, im Rahmen der Sehnentiefe.
          if (gezeichnet) expect(gerechnet, `x=${x} y=${y} z=${z}`).toBe(true)
          geprueft += 1
        }
      }
    }
    expect(geprueft).toBeGreaterThan(10_000)
  })
})

describe('Die konservative Richtung', () => {
  it('zeichnet die Rundung nie grösser als den Raum', () => {
    const v = auto([dachkanteRechts(400)])
    const grob = konturFlaeche(konturBeiHoehe(v, 1900, 3))
    const fein = konturFlaeche(konturBeiHoehe(v, 1900, 64))

    // Gröber aufgelöst heisst WENIGER Fläche, nie mehr.
    expect(grob).toBeLessThanOrEqual(fein + 1)
  })

  it('macht aus einer Kante ohne Tiefe keine Rundung', () => {
    const k: Kantenform = { achse: 'z', seiten: ['max', 'max'], art: 'rundung', aMm: 0, bMm: 300 }
    expect(fehltAnKante(k, 0, 0)).toBe(false)
    expect(konturFlaeche(konturBeiHoehe(auto([k]), 1999))).toBe(1800 * 4000)
  })
})

describe('Startpunkte für den Packer', () => {
  it('rückt von den Wänden ein, an denen etwas gebrochen ist', () => {
    const v = auto([
      { achse: 'z', seiten: ['min', 'min'], art: 'rundung', aMm: 120, bMm: 120 },
      { achse: 'x', seiten: ['min', 'min'], art: 'fase', aMm: 100, bMm: 250 },
    ])
    expect(wandEinzuege(v)).toEqual({ x: [120], z: [250] })
  })

  it('rückt nicht ein, wo an der GEGENÜBERLIEGENDEN Wand gebrochen ist', () => {
    expect(wandEinzuege(auto([dachkanteRechts()]))).toEqual({ x: [], z: [] })
  })
})

describe('Stützhöhen fürs Bild', () => {
  it('führt Boden und Decke, auch ohne Kanten', () => {
    expect(konturHoehen(auto())).toEqual([0, 2000])
  })

  it('legt Stufen dorthin, wo sich der Grundriss ändert', () => {
    const hoehen = konturHoehen(auto([dachkanteRechts(300)]), 4)
    expect(hoehen).toContain(2000)
    expect(hoehen).toContain(1700)
    expect(hoehen.every((y) => y >= 0 && y <= 2000)).toBe(true)
  })
})
