import { describe, expect, it } from 'vitest'
import {
  MINDEST_STEG_MM,
  VORGABE_SPIEL_MM,
  erzeugeInlay,
  taschenUmriss,
} from '../lib/inlay'
import type { CaseLage } from '../lib/caseLayout'

/**
 * DAS INLAY — und die Zahlen, die es ehrlich halten.
 *
 * Gemessen wird vor allem, was es MELDET: ein zu dünner Steg, eine Tasche
 * über dem Rand, eine Griffmulde, die nicht passt. Nach einem Layout räumt
 * jemand um; nach einem Inlay schneidet jemand einen Schaumblock, den es
 * danach nicht mehr gibt.
 */
const fach = (
  id: string,
  xMm: number,
  zMm: number,
  breiteMm: number,
  tiefeMm: number,
  hoeheMm = 40,
): CaseLage['faecher'][number] => ({
  stueckId: id,
  label: id,
  nr: 1,
  xMm,
  zMm,
  breiteMm,
  tiefeMm,
  hoeheMm,
  lage: 'upright',
  gedreht: false,
})

const lage = (faecher: CaseLage['faecher'], hoeheMm = 60): CaseLage => ({ yMm: 0, hoeheMm, faecher })
const innen = { widthMm: 400, heightMm: 300, depthMm: 300 }

describe('erzeugeInlay', () => {
  it('rechnet ohne Innenmass GAR NICHTS', () => {
    // Dieselbe Regel wie im Layout, und hier wiegt sie schwerer.
    expect(erzeugeInlay(lage([fach('a', 20, 20, 100, 80)]), null)).toBeNull()
  })

  it('macht die Tasche um das Spiel GRÖSSER, je Seite', () => {
    // Ein Fach, das exakt so gross ist wie das Gerät, nimmt es nicht auf.
    const m = erzeugeInlay(lage([fach('a', 50, 50, 100, 80)]), innen, { spielMm: 2 })!
    const t = m.taschen[0]!
    expect(t.xMm).toBe(48)
    expect(t.zMm).toBe(48)
    expect(t.breiteMm).toBe(104)
    expect(t.tiefeMm).toBe(84)
  })

  it('nimmt die Werkstattzahl, wenn niemand ein Spiel nennt', () => {
    const m = erzeugeInlay(lage([fach('a', 50, 50, 100, 80)]), innen)!
    expect(m.spielMm).toBe(VORGABE_SPIEL_MM)
  })

  it('fräst jede Tasche auf die Höhe IHRES Stücks', () => {
    // Ein flaches Gerät neben einem hohen soll nicht versenkt liegen, wo
    // niemand es greift.
    const m = erzeugeInlay(lage([fach('flach', 20, 20, 60, 60, 15), fach('hoch', 200, 20, 60, 60, 55)]), innen)!
    expect(m.taschen.find((t) => t.id === 'flach')!.frästiefeMm).toBe(15)
    expect(m.taschen.find((t) => t.id === 'hoch')!.frästiefeMm).toBe(55)
  })

  it('MELDET eine Tasche, die das Spiel über den Rand schiebt', () => {
    // Zurückgeschoben wird sie NICHT — dann läge sie woanders als im Layout.
    const m = erzeugeInlay(lage([fach('a', 0, 0, 100, 80)]), innen, { spielMm: 3 })!
    expect(m.befunde.map((b) => b.art)).toContain('ueber-rand')
    expect(m.taschen[0]!.xMm).toBe(-3)
  })

  it('MELDET einen Steg, den das Spiel zu dünn gemacht hat', () => {
    // Im Layout standen 10 mm zwischen den Fächern; 2 mm Spiel je Seite
    // fressen davon 4 — es bleiben 6, und das bricht aus.
    const m = erzeugeInlay(
      lage([fach('a', 20, 20, 100, 80), fach('b', 130, 20, 100, 80)]),
      innen,
      { spielMm: 2 },
    )!
    const b = m.befunde.find((x) => x.art === 'steg-zu-duenn')
    expect(b).toBeDefined()
    expect(b!.text).toContain(String(MINDEST_STEG_MM))
  })

  it('schweigt über Stege, die dick genug sind', () => {
    const m = erzeugeInlay(
      lage([fach('a', 20, 20, 100, 80), fach('b', 160, 20, 100, 80)]),
      innen,
      { spielMm: 1 },
    )!
    expect(m.befunde.map((b) => b.art)).not.toContain('steg-zu-duenn')
  })

  it('zählt zwei Taschen ohne gemeinsame Kante NICHT als Steg', () => {
    // Diagonal versetzt: sie haben keinen gemeinsamen Steg, und eine
    // Meldung darüber wäre ein Fehlalarm.
    const m = erzeugeInlay(
      lage([fach('a', 20, 20, 60, 60), fach('b', 90, 150, 60, 60)]),
      innen,
      { spielMm: 1 },
    )!
    expect(m.befunde.map((b) => b.art)).not.toContain('steg-zu-duenn')
  })

  it('legt eine Griffmulde an die Vorderkante', () => {
    const m = erzeugeInlay(lage([fach('a', 100, 50, 100, 80)]), innen)!
    const g = m.taschen[0]!.griff!
    expect(g).toBeDefined()
    // Mittig auf der Tasche.
    expect(g.xMm + g.breiteMm / 2).toBeCloseTo(m.taschen[0]!.xMm + m.taschen[0]!.breiteMm / 2)
  })

  it('lässt die Mulde WEG, wenn sie in die Nachbartasche schnitte', () => {
    // Eine Mulde, die in die Nachbartasche reicht, verbindet zwei Fächer.
    const m = erzeugeInlay(
      lage([fach('vorn', 100, 50, 100, 60), fach('dahinter', 100, 118, 100, 60)]),
      innen,
      { spielMm: 1 },
    )!
    expect(m.taschen[0]!.griff).toBeUndefined()
    expect(m.befunde.map((b) => b.art)).toContain('keine-griffmulde')
  })

  it('lässt die Mulde weg, wenn sie über den Rohling hinausragt', () => {
    const m = erzeugeInlay(lage([fach('a', 100, 220, 100, 70)]), innen, { spielMm: 1 })!
    expect(m.taschen[0]!.griff).toBeUndefined()
  })

  it('macht auf Wunsch gar keine Mulden — und meldet dann auch keine', () => {
    const m = erzeugeInlay(lage([fach('a', 100, 50, 100, 80)]), innen, { ohneGriff: true })!
    expect(m.taschen[0]!.griff).toBeUndefined()
    expect(m.befunde.map((b) => b.art)).not.toContain('keine-griffmulde')
  })

  it('rechnet den Boden auf die Plattenhöhe', () => {
    const m = erzeugeInlay(lage([fach('a', 20, 20, 60, 60)], 50), innen, { bodenMm: 12 })!
    expect(m.aussenMm.heightMm).toBe(62)
  })

  it('warnt vor einem Boden, der nichts trägt', () => {
    const m = erzeugeInlay(lage([fach('a', 20, 20, 60, 60)]), innen, { bodenMm: 3 })!
    expect(m.befunde.map((b) => b.art)).toContain('hoehe-knapp')
  })
})

describe('taschenUmriss', () => {
  it('gibt ohne Mulde ein Rechteck', () => {
    const m = erzeugeInlay(lage([fach('a', 100, 50, 100, 80)]), innen, { ohneGriff: true })!
    expect(taschenUmriss(m.taschen[0]!)).toHaveLength(4)
  })

  it('gibt mit Mulde EINEN Umriss und nicht zwei Rechtecke', () => {
    // Zwei sich überlappende Konturen sind für eine CAM-Software ein
    // Widerspruch — sie weiss dann nicht, was innen ist.
    const m = erzeugeInlay(lage([fach('a', 100, 50, 100, 80)]), innen)!
    const u = taschenUmriss(m.taschen[0]!)
    expect(u).toHaveLength(8)
    // Der Umriss schliesst sich: erster und letzter Punkt haben dieselbe x.
    expect(u[0]!.x).toBe(u[7]!.x)
  })

  it('macht aus einer Mulde über die ganze Breite ein Rechteck', () => {
    // Sonst stünden zwei Punkte auf einer Geraden — harmlos, aber manche
    // CAM-Software stolpert über Kanten der Länge null.
    const m = erzeugeInlay(lage([fach('schmal', 100, 50, 20, 80)]), innen)!
    expect(taschenUmriss(m.taschen[0]!)).toHaveLength(4)
  })
})
