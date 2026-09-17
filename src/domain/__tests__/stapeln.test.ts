import { describe, expect, it } from 'vitest'
import {
  TELLER_TOLERANZ_MM,
  hoeheInLage,
  istRollbar,
  passtAufeinander,
  stapelHoehe,
  stehtAufRollen,
  type StapelStueck,
} from '../lib/stapeln'

// ───────────────────────────────────────────────────────────────────────────
// Stapeln (Ladeplanung, Issue #17).
//
// Der teuerste Fehler dieser Rechnung ist nicht eine falsche Höhe, sondern
// ein STILLES JA. Ein Case, dessen Rollenabstand niemand gemessen hat, darf
// nicht als stapelbar durchgehen — sonst sagt das Werkzeug „passt" über einen
// Turm, den niemand geprüft hat. Test „nicht angegeben ist nicht ja" hält das
// fest.
//
// Der zweitteuerste ist stumpfes Addieren der Höhen. Der Rollenteller
// schluckt einen Teil der Rollenhöhe; wer das übersieht, liegt pro Lage
// 20–40 mm zu hoch, und am Dock geht das Rolltor nicht zu.
// ───────────────────────────────────────────────────────────────────────────

/** Ein 1200×600er Packcase mit Auto-Turn-Rollen und Tellern im Deckel. */
const packcase = (over: Partial<StapelStueck> = {}): StapelStueck => ({
  dimensions: { widthMm: 1200, depthMm: 600, heightMm: 800, weightKg: 45 },
  transport: {
    castors: {
      heightMm: 100,
      includedInHeightMm: false,
      kind: 'swivelAuto',
      insetMm: { x: 80, y: 80 },
    },
    stackTop: {
      recessDepthMm: 25,
      fitsCastorMm: 100,
      dishInsetMm: { x: 80, y: 80 },
      innerProtrusionMm: 20,
    },
    maxStackKg: 200,
  },
  ...over,
})

describe('Höhe in einer Lage', () => {
  it('zählt die Rollen dazu, wenn sie nicht in der Case-Höhe stecken', () => {
    expect(hoeheInLage(packcase())).toBe(900)
  })

  it('zählt sie NICHT doppelt, wenn sie schon drin sind', () => {
    const c = packcase()
    c.transport!.castors!.includedInHeightMm = true
    expect(hoeheInLage(c)).toBe(800)
  })

  it('lässt die Rollenhöhe bei gekipptem Case weg und nimmt die andere Kante', () => {
    expect(hoeheInLage(packcase(), 'onSide')).toBe(1200)
    expect(hoeheInLage(packcase(), 'onEnd')).toBe(600)
  })

  it('liefert null statt einer geschätzten Zahl, wenn das Maß fehlt', () => {
    expect(hoeheInLage({ dimensions: { widthMm: 1200 } })).toBeNull()
    expect(hoeheInLage({})).toBeNull()
  })
})

describe('Stapelhöhe', () => {
  it('zieht die Tellertiefe ab, statt die Höhen stumpf zu addieren', () => {
    // 900 + 900 = 1800, minus min(25, 100) = 1775
    expect(stapelHoehe(packcase(), packcase())).toBe(1775)
  })

  it('versenkt höchstens so tief, wie die Rolle lang ist', () => {
    const unten = packcase()
    unten.transport!.stackTop!.recessDepthMm = 400 // absurd tiefer Teller
    const oben = packcase()
    oben.transport!.castors!.heightMm = 60

    // min(400, 60) = 60 -> 900 + 860 - 60
    expect(stapelHoehe(unten, oben)).toBe(hoeheInLage(unten)! + hoeheInLage(oben)! - 60)
  })

  it('versenkt nichts, wenn unten kein Teller ist', () => {
    const unten = packcase()
    delete unten.transport!.stackTop
    expect(stapelHoehe(unten, packcase())).toBe(1800)
  })

  it('versenkt nichts, wenn das obere Case gekippt steht', () => {
    // Gekippt liegt keine Rolle im Teller.
    expect(stapelHoehe(packcase(), packcase(), 'upright', 'onEnd')).toBe(900 + 600)
  })

  it('liefert null, sobald ein gebrauchtes Maß fehlt', () => {
    expect(stapelHoehe(packcase(), { transport: {} })).toBeNull()
  })
})

describe('Rollbarkeit', () => {
  it('ist auf den Rollen stehend rollbar, gekippt nicht', () => {
    expect(istRollbar(packcase(), 'upright')).toBe(true)
    expect(istRollbar(packcase(), 'onSide')).toBe(false)
    expect(stehtAufRollen('upright')).toBe(true)
    expect(stehtAufRollen('onEnd')).toBe(false)
  })

  it('sagt „unbekannt" statt „nein", wenn keine Rollen gepflegt sind', () => {
    // Ein Case ohne Angabe ist nicht nachweislich rollenlos.
    expect(istRollbar({ dimensions: { heightMm: 400 } })).toBeUndefined()
  })
})

describe('Passt das aufeinander', () => {
  it('sagt ja bei gleichem Casetyp', () => {
    expect(passtAufeinander(packcase(), packcase())).toEqual({ geht: true })
  })

  it('sagt ja auch bei zwei VERSCHIEDENEN Cases, deren Raster zusammenpasst', () => {
    // Das ist der Fall, den ein Flag „stapelbar mit gleichem Typ" verlöre.
    const unten = packcase({ dimensions: { widthMm: 1200, depthMm: 800, heightMm: 600, weightKg: 60 } })
    const oben = packcase({ dimensions: { widthMm: 1200, depthMm: 600, heightMm: 400, weightKg: 30 } })

    expect(passtAufeinander(unten, oben).geht).toBe(true)
  })

  it('achtet auf noLoadOnTop, bevor es irgendetwas anderes prüft', () => {
    const unten = packcase()
    unten.transport!.noLoadOnTop = true
    delete unten.transport!.stackTop // zusätzlich unvollständig

    const b = passtAufeinander(unten, packcase())
    expect(b.geht).toBe(false)
    expect(b.art).toBe('regel')
    expect(b.grund).toMatch(/no load on top/i)
  })

  it('lässt eine freie Lenkrolle nicht durch — sie trifft den Teller nicht', () => {
    const oben = packcase()
    oben.transport!.castors!.kind = 'swivel'

    const b = passtAufeinander(packcase(), oben)
    expect(b.geht).toBe(false)
    expect(b.art).toBe('regel')
    expect(b.grund).toMatch(/swivel/i)
  })

  it('nicht angegeben ist nicht ja: ohne gemessenen Rollenabstand kein Stapel', () => {
    const oben = packcase()
    delete oben.transport!.castors!.insetMm

    const b = passtAufeinander(packcase(), oben)
    expect(b.geht).toBe(false)
    expect(b.art).toBe('nicht-angegeben')
  })

  it('unterscheidet „Regel verletzt" von „nicht angegeben"', () => {
    const ohneRollen = passtAufeinander(packcase(), { dimensions: { heightMm: 300 } })
    expect(ohneRollen.art).toBe('nicht-angegeben')

    const zuSchwer = packcase({ dimensions: { widthMm: 1200, depthMm: 600, heightMm: 800, weightKg: 400 } })
    expect(passtAufeinander(packcase(), zuSchwer).art).toBe('regel')
  })

  it('eine weiche Tasche ohne Belastbarkeitsangabe trägt nichts', () => {
    const tasche: StapelStueck = {
      dimensions: { widthMm: 600, depthMm: 400, heightMm: 300, weightKg: 8 },
      transport: { deformable: { compressibleMm: { z: 50 } } },
    }

    const b = passtAufeinander(tasche, packcase())
    expect(b.geht).toBe(false)
    expect(b.art).toBe('nicht-angegeben')
    expect(b.grund).toMatch(/deformable/i)
  })

  it('ein gekipptes Case oben verriegelt nicht im Teller', () => {
    const b = passtAufeinander(packcase(), packcase(), 'onEnd')
    expect(b.geht).toBe(false)
    expect(b.grund).toMatch(/tilted/i)
  })

  it('weist eine Rolle ab, die grösser ist als der Teller aufnimmt', () => {
    const oben = packcase()
    oben.transport!.castors!.heightMm = 125

    expect(passtAufeinander(packcase(), oben).art).toBe('regel')
  })

  it('weist ein verschobenes Raster ab, lässt aber die Toleranz zu', () => {
    const knapp = packcase()
    knapp.transport!.castors!.insetMm = { x: 80 + TELLER_TOLERANZ_MM, y: 80 }
    expect(passtAufeinander(packcase(), knapp).geht).toBe(true)

    const daneben = packcase()
    daneben.transport!.castors!.insetMm = { x: 80 + TELLER_TOLERANZ_MM + 1, y: 80 }
    const b = passtAufeinander(packcase(), daneben)
    expect(b.geht).toBe(false)
    expect(b.grund).toMatch(/line up/i)
  })

  it('verlangt ein bekanntes Gewicht, sobald eine Höchstlast eingetragen ist', () => {
    const oben: StapelStueck = {
      dimensions: { widthMm: 1200, depthMm: 600, heightMm: 400 }, // kein Gewicht
      transport: packcase().transport,
    }

    const b = passtAufeinander(packcase(), oben)
    expect(b.geht).toBe(false)
    expect(b.art).toBe('nicht-angegeben')
  })

  it('nimmt das Gesamtgewicht inkl. Inhalt, wenn es angegeben ist', () => {
    const schwerGepackt = packcase({ gesamtKg: 250 })
    expect(passtAufeinander(packcase(), schwerGepackt).art).toBe('regel')
  })

  it('liefert die englische Quelle ohne Wörterbuch und nimmt eine Übersetzung an', () => {
    const oben = packcase()
    oben.transport!.castors!.kind = 'swivel'

    expect(passtAufeinander(packcase(), oben).grund).toMatch(/swivel castors/i)
    expect(passtAufeinander(packcase(), oben, 'upright', () => 'Lenkrollen drehen frei.').grund).toBe(
      'Lenkrollen drehen frei.',
    )
  })
})
