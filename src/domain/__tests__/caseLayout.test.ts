import { describe, expect, it } from 'vitest'
import {
  VORGABE_STEG_MM,
  erzeugeCaseLayout,
  fuellgrad,
  innenmass,
  type CaseStueck,
} from '../lib/caseLayout'
import type { StorageNode } from '../types/inventory'

/**
 * DER CASE-LAYOUT-GENERATOR — und die Regel, die ihn ehrlich hält.
 *
 * Gemessen wird vor allem, was er NICHT ausrechnet. Ein Layout auf geratenem
 * Innenmass sähe genauso aus wie eins auf gemessenem, und nach dem einen
 * schneidet jemand Schaum.
 */
const caseNode = (dimensions?: StorageNode['dimensions']): Pick<StorageNode, 'dimensions'> => ({ dimensions })

const stueck = (id: string, x: number, y: number, z: number, rest: Partial<CaseStueck> = {}): CaseStueck => ({
  id,
  label: id,
  sizeMm: { x, y, z },
  ...rest,
})

describe('innenmass', () => {
  it('nimmt das gemessene Innenmass, auch wenn eine Wandstärke dasteht', () => {
    // Gemessen schlägt gerechnet: wer nachgemessen hat, weiss es besser als
    // jede Subtraktion.
    const r = innenmass(caseNode({ widthMm: 600, heightMm: 400, depthMm: 500 }), {
      innenMm: { widthMm: 555, heightMm: 333, depthMm: 444 },
      wandstaerkeMm: 20,
    })
    expect(r).toEqual({
      bekannt: true,
      quelle: 'gemessen',
      mm: { widthMm: 555, heightMm: 333, depthMm: 444 },
    })
  })

  it('rechnet aus der Wandstärke, wenn kein Innenmass gemessen ist', () => {
    const r = innenmass(caseNode({ widthMm: 600, heightMm: 400, depthMm: 500 }), { wandstaerkeMm: 20 })
    expect(r).toEqual({
      bekannt: true,
      quelle: 'aus-wandstaerke',
      mm: { widthMm: 560, heightMm: 360, depthMm: 460 },
    })
  })

  it('SCHÄTZT NICHTS, wenn weder Innenmass noch Wandstärke dasteht', () => {
    // Der Kern der Sache. Ein Rackcase mit 600 mm aussen hat keine 580 mm
    // innen — wieviel es sind, hängt an Schale, Schaum und Deckelform.
    const r = innenmass(caseNode({ widthMm: 600, heightMm: 400, depthMm: 500 }))
    expect(r.bekannt).toBe(false)
    if (r.bekannt) return
    expect(r.grund).toBe('keine-angabe')
    expect(r.text).toMatch(/does not follow from the outside/)
  })

  it('sagt es, wenn die Wandstärke dasteht, aber kein Aussenmass', () => {
    const r = innenmass(caseNode(undefined), { wandstaerkeMm: 20 })
    expect(r.bekannt).toBe(false)
    if (r.bekannt) return
    expect(r.grund).toBe('kein-aussenmass')
  })

  it('widerspricht einer Wand, die dicker ist als das Case', () => {
    // Zwei Angaben, von denen eine falsch sein muss — und das ist eine
    // Auskunft, kein negatives Innenmass.
    const r = innenmass(caseNode({ widthMm: 200, heightMm: 400, depthMm: 500 }), { wandstaerkeMm: 150 })
    expect(r.bekannt).toBe(false)
    if (r.bekannt) return
    expect(r.grund).toBe('wand-zu-dick')
    expect(r.text).toContain('150')
  })
})

describe('erzeugeCaseLayout', () => {
  const innen = { innenMm: { widthMm: 600, heightMm: 300, depthMm: 400 } }

  it('legt ohne Innenmass GAR NICHTS und sagt warum', () => {
    const r = erzeugeCaseLayout(caseNode({ widthMm: 600, heightMm: 300, depthMm: 400 }), undefined, [
      stueck('a', 100, 50, 100),
    ])
    expect(r.lagen).toEqual([])
    // Das Stück verschwindet nicht — es steht mit Grund da.
    expect(r.ohnePlatz).toHaveLength(1)
    expect(r.befunde.map((b) => b.art)).toContain('kein-innenmass')
  })

  it('legt Stücke nebeneinander und lässt einen Steg dazwischen', () => {
    const r = erzeugeCaseLayout(caseNode(), innen, [stueck('a', 200, 50, 100), stueck('b', 200, 50, 100)], {
      stegMm: 20,
      randMm: 0,
    })
    expect(r.lagen).toHaveLength(1)
    const [a, b] = r.lagen[0]!.faecher
    expect(a!.xMm).toBe(0)
    // 200 breit, dann 20 Steg — ohne ihn fiele die Trennwand um.
    expect(b!.xMm).toBe(220)
  })

  it('nimmt den Steg vom Case, wenn keiner mitgegeben wird', () => {
    const r = erzeugeCaseLayout(caseNode(), { ...innen, stegMm: 30 }, [
      stueck('a', 100, 50, 100),
      stueck('b', 100, 50, 100),
    ], { randMm: 0 })
    expect(r.stegMm).toBe(30)
    expect(r.lagen[0]!.faecher[1]!.xMm).toBe(130)
  })

  it('fällt auf die Werkstattzahl zurück, wenn niemand einen Steg nennt', () => {
    const r = erzeugeCaseLayout(caseNode(), innen, [stueck('a', 100, 50, 100)])
    expect(r.stegMm).toBe(VORGABE_STEG_MM)
  })

  it('bleibt lieber in der Reihe und dreht, statt eine neue anzufangen', () => {
    // 400 + 10 + 400 = 810 passt nicht in 600 Breite — quer gelegt sind es
    // 400 + 10 + 100 = 510, und die 400 Tiefe hat das Case. Eine Reihe
    // weniger heisst ein Steg weniger, also mehr Platz.
    const r = erzeugeCaseLayout(caseNode(), innen, [
      stueck('a', 400, 50, 100),
      stueck('b', 400, 50, 100),
    ], { stegMm: 10, randMm: 0 })
    const [a, b] = r.lagen[0]!.faecher
    expect(a!.gedreht).toBe(false)
    expect(b!.gedreht).toBe(true)
    expect(b!.xMm).toBe(410)
    expect(b!.zMm).toBe(0)
  })

  it('fängt eine neue Reihe an, wenn auch gedreht nichts mehr passt', () => {
    // Dasselbe Case, nur flacher: quer gelegt braucht das zweite Stück
    // 400 mm Tiefe, die es hier nicht gibt.
    const r = erzeugeCaseLayout(caseNode(), { innenMm: { widthMm: 600, heightMm: 300, depthMm: 300 } }, [
      stueck('a', 400, 50, 100),
      stueck('b', 400, 50, 100),
    ], { stegMm: 10, randMm: 0 })
    const [a, b] = r.lagen[0]!.faecher
    expect(a!.zMm).toBe(0)
    expect(b!.xMm).toBe(0)
    expect(b!.zMm).toBe(110)
  })

  it('dreht ein Stück um die Hochachse, wenn es sonst nicht passt', () => {
    // Eine Drehung in der Ebene ist KEINE andere Lage — das Stück steht
    // weiter so herum, wie es stehen darf, nur quer.
    const r = erzeugeCaseLayout(caseNode(), { innenMm: { widthMm: 300, heightMm: 300, depthMm: 500 } }, [
      stueck('lang', 450, 50, 120),
    ])
    expect(r.ohnePlatz).toEqual([])
    const f = r.lagen[0]!.faecher[0]!
    expect(f.gedreht).toBe(true)
    expect(f.breiteMm).toBe(120)
    expect(f.tiefeMm).toBe(450)
  })

  it('kippt ein Stück NICHT, solange niemand es erlaubt hat', () => {
    // Hausregel: was nicht angegeben ist, ist nicht beliebig. Ohne
    // `orientations` gilt allein `upright` — dieselbe Zeile wie im
    // Ladepacker.
    const hoch = stueck('hoch', 100, 250, 100)
    const r = erzeugeCaseLayout(caseNode(), { innenMm: { widthMm: 600, heightMm: 150, depthMm: 400 } }, [hoch])
    expect(r.lagen).toEqual([])
    expect(r.ohnePlatz[0]!.grund).toBe('zu-gross')
  })

  it('legt ein Stück flach, wenn die Lage erlaubt ist', () => {
    const flach = stueck('flach', 100, 250, 100, { transport: { orientations: ['upright', 'onSide'] } })
    const r = erzeugeCaseLayout(caseNode(), { innenMm: { widthMm: 600, heightMm: 150, depthMm: 400 } }, [flach])
    expect(r.ohnePlatz).toEqual([])
    expect(r.lagen[0]!.faecher[0]!.lage).toBe('onSide')
  })

  it('stapelt Lagen, wenn die Höhe es hergibt', () => {
    const r = erzeugeCaseLayout(caseNode(), { innenMm: { widthMm: 220, heightMm: 300, depthMm: 220 } }, [
      stueck('a', 200, 100, 200),
      stueck('b', 200, 100, 200),
    ], { stegMm: 10 })
    expect(r.lagen).toHaveLength(2)
    expect(r.lagen[0]!.yMm).toBe(0)
    expect(r.lagen[1]!.yMm).toBe(110)
  })

  it('gibt jedem Stück einer Mehrfachmenge ein eigenes Fach', () => {
    const r = erzeugeCaseLayout(caseNode(), innen, [stueck('funk', 100, 50, 100, { anzahl: 3 })])
    expect(r.lagen[0]!.faecher).toHaveLength(3)
    expect(r.lagen[0]!.faecher.map((f) => f.label)).toEqual(['funk (1/3)', 'funk (2/3)', 'funk (3/3)'])
  })

  it('nennt ein Stück ohne Masse beim Namen, statt es wegzulassen', () => {
    const r = erzeugeCaseLayout(caseNode(), innen, [stueck('ohne', 0, 0, 0)])
    expect(r.ohnePlatz).toEqual([
      expect.objectContaining({ stueckId: 'ohne', grund: 'keine-masse' }),
    ])
  })

  it('zählt Gewichte nur, soweit sie angegeben sind — und sagt, wieviele fehlen', () => {
    const r = erzeugeCaseLayout(caseNode(), innen, [
      stueck('a', 100, 50, 100, { weightKg: 2 }),
      stueck('b', 100, 50, 100),
    ])
    expect(r.gesetztKg).toBe(2)
    expect(r.ohneGewicht).toBe(1)
    expect(r.befunde.map((b) => b.art)).toContain('ungewogen')
  })

  it('ist deterministisch — dieselbe Eingabe in anderer Reihenfolge ergibt dasselbe Bild', () => {
    // Wer nach einem Bild Schaum schneidet, darf beim zweiten Öffnen kein
    // anderes sehen.
    const s = [stueck('a', 120, 40, 90), stueck('b', 200, 60, 100), stueck('c', 80, 40, 80)]
    const vorwaerts = erzeugeCaseLayout(caseNode(), innen, s)
    const rueckwaerts = erzeugeCaseLayout(caseNode(), innen, [...s].reverse())
    expect(rueckwaerts.lagen).toEqual(vorwaerts.lagen)
  })

  it('nummeriert die Fächer fortlaufend über das ganze Case', () => {
    const r = erzeugeCaseLayout(caseNode(), { innenMm: { widthMm: 220, heightMm: 300, depthMm: 220 } }, [
      stueck('a', 200, 100, 200),
      stueck('b', 200, 100, 200),
    ], { stegMm: 10 })
    expect(r.lagen.flatMap((l) => l.faecher).map((f) => f.nr)).toEqual([1, 2])
  })
})

describe('der Rand zur Innenwand', () => {
  const innen = { innenMm: { widthMm: 600, heightMm: 300, depthMm: 400 } }

  it('lässt zwischen Fach und Wand so viel Schaum wie zwischen zwei Fächern', () => {
    // Schaum zwischen Fach und Wand trägt genauso wie Schaum zwischen zwei
    // Fächern — und reisst genauso aus, wenn er fehlt.
    const r = erzeugeCaseLayout(caseNode(), innen, [stueck('a', 100, 50, 100)], { stegMm: 20 })
    const f = r.lagen[0]!.faecher[0]!
    expect(f.xMm).toBe(20)
    expect(f.zMm).toBe(20)
  })

  it('verkleinert das Feld um den Rand auf ALLEN vier Seiten', () => {
    // 600 innen, 15 Rand links und rechts: 570 bleiben. Ein Stück von 580
    // passt ohne Rand, mit Rand nicht mehr.
    const r = erzeugeCaseLayout(caseNode(), innen, [stueck('breit', 580, 50, 100)], { stegMm: 15 })
    expect(r.lagen).toEqual([])
    expect(r.ohnePlatz[0]!.grund).toBe('zu-gross')
  })

  it('lässt sich auf null stellen — dann liegt das Fach an der Wand', () => {
    const r = erzeugeCaseLayout(caseNode(), innen, [stueck('a', 100, 50, 100)], { randMm: 0 })
    expect(r.lagen[0]!.faecher[0]!.xMm).toBe(0)
  })

  it('hält den Rand auch an der rechten und der vorderen Wand ein', () => {
    const r = erzeugeCaseLayout(caseNode(), innen, [
      stueck('a', 250, 50, 150),
      stueck('b', 250, 50, 150),
      stueck('c', 250, 50, 150),
    ], { stegMm: 15 })
    for (const f of r.lagen.flatMap((l) => l.faecher)) {
      expect(f.xMm + f.breiteMm).toBeLessThanOrEqual(600 - 15)
      expect(f.zMm + f.tiefeMm).toBeLessThanOrEqual(400 - 15)
    }
  })
})

describe('fuellgrad', () => {
  it('misst die Grundfläche und nicht das Volumen', () => {
    // Der Luftraum über einem flachen Stück neben einem hohen ist kein
    // Verschnitt, den jemand beheben könnte.
    const r = erzeugeCaseLayout(caseNode(), { innenMm: { widthMm: 200, heightMm: 300, depthMm: 100 } }, [
      stueck('a', 100, 90, 100),
    ], { randMm: 0 })
    expect(fuellgrad(r.lagen[0]!, { widthMm: 200, heightMm: 300, depthMm: 100 })).toBeCloseTo(0.5)
  })

  it('bleibt bei einem Case ohne Grundfläche bei null, statt zu teilen', () => {
    expect(fuellgrad({ yMm: 0, hoeheMm: 0, faecher: [] }, { widthMm: 0, heightMm: 0, depthMm: 0 })).toBe(0)
  })
})
