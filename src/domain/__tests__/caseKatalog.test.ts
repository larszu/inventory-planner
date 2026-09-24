import { describe, expect, it } from 'vitest'
import {
  alleVorlagen,
  hatMasse,
  hatUebernehmbares,
  massAuskunft,
  massZeile,
  MITGELIEFERTE_VORLAGEN,
  vorlageAusCase,
} from '../lib/caseKatalog'

// Der Katalog trägt seit 2026-09-24 Datenblatt-Zahlen. Diese Tests prüfen
// nicht, ob die Zahlen STIMMEN — das kann kein Test —, sondern dass jede
// Zahl eine Quelle hat und in sich schlüssig ist. Ein Tippfehler in einer
// Innenhöhe fällt über Deckel + Unterteil auf.
describe('die mitgelieferten Vorlagen', () => {
  it('tragen an jeder Hersteller-Zahl eine Adresse', () => {
    for (const v of MITGELIEFERTE_VORLAGEN) {
      expect(v.herkunft, v.id).toBe('hersteller')
      expect(v.quelle, v.id).toMatch(/^https:\/\/\S+ \(abgerufen \d{4}-\d{2}-\d{2}\)$/)
    }
  })

  it('haben eindeutige Kennungen', () => {
    const ids = MITGELIEFERTE_VORLAGEN.map((v) => v.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('decken die fünf gefragten Hersteller ab', () => {
    const hersteller = new Set(MITGELIEFERTE_VORLAGEN.map((v) => v.hersteller))
    expect([...hersteller].sort()).toEqual(['Amptown', 'Casetec', 'Gäng-Case', 'Nanuk', 'Peli'])
  })

  const schalen = MITGELIEFERTE_VORLAGEN.filter((v) => v.art === 'schaum')

  it('Hartschalen: innen kleiner als aussen, in jeder Achse', () => {
    for (const v of schalen) {
      expect(hatMasse(v), v.id).toBe(true)
      expect(v.innenMm!.widthMm!, v.id).toBeLessThan(v.aussenMm!.widthMm!)
      expect(v.innenMm!.depthMm!, v.id).toBeLessThan(v.aussenMm!.depthMm!)
      expect(v.innenMm!.heightMm!, v.id).toBeLessThan(v.aussenMm!.heightMm!)
    }
  })

  it('Hartschalen: Deckel plus Unterteil ergibt die Innenhöhe (±3 mm Zoll-Rundung)', () => {
    for (const v of schalen) {
      expect(Math.abs(v.deckelMm! + v.unterteilMm! - v.innenMm!.heightMm!), v.id).toBeLessThanOrEqual(3)
    }
  })

  it('Racks: Höheneinheiten immer, Aussenmass nur wo veröffentlicht', () => {
    const racks = MITGELIEFERTE_VORLAGEN.filter((v) => v.art === 'rack')
    expect(racks.length).toBeGreaterThan(0)
    for (const v of racks) {
      expect(v.hoeheHE, v.id).toBeGreaterThan(0)
      expect(hatUebernehmbares(v), v.id).toBe(true)
      // Ein Rack von n HE ist mindestens n × 44,45 mm hoch.
      if (v.aussenMm?.heightMm) expect(v.aussenMm.heightMm, v.id).toBeGreaterThan(v.hoeheHE! * 44.45)
    }
    // Amptown veröffentlicht keine Aussenmasse — und dann steht auch keins da.
    for (const v of racks.filter((r) => r.hersteller === 'Amptown')) expect(v.aussenMm, v.id).toBeUndefined()
  })
})

describe('die Auskunft', () => {
  const peli = MITGELIEFERTE_VORLAGEN.find((v) => v.id === 'peli-1510')!
  const amptown = MITGELIEFERTE_VORLAGEN.find((v) => v.id === 'amptown-krs-3he')!
  const peli1620 = MITGELIEFERTE_VORLAGEN.find((v) => v.id === 'peli-1620')!

  it('nennt die Zahlen einer Schale', () => {
    expect(massZeile(peli)).toEqual([
      'outside 559 × 351 × 229 mm',
      'inside 502 × 279 × 193 mm',
      'lid 45 mm + base 147 mm',
      '5.44 kg empty',
    ])
  })

  it('nennt ein fehlendes Leergewicht nicht als null', () => {
    expect(massZeile(peli1620).join(' ')).not.toMatch(/kg/)
  })

  it('sagt beim Rack ohne Aussenmass, dass es nicht veröffentlicht ist', () => {
    expect(massZeile(amptown)).toEqual(['3 U', '360 mm mounting depth'])
    expect(massAuskunft(amptown)).toMatch(/^outer dimensions not published/)
  })
})

describe('eigene Vorlagen', () => {
  it('gewinnen gegen die mitgelieferte derselben Kennung', () => {
    const eigen = vorlageAusCase(
      'peli-1510', 'Peli', '1510',
      { widthMm: 560, depthMm: 352, heightMm: 230 },
      { widthMm: 500, depthMm: 278, heightMm: 190 },
      'schaum', 'nachgemessen, Lager Nord',
    )!
    const v = alleVorlagen([eigen]).find((x) => x.id === 'peli-1510')!
    expect(v.herkunft).toBe('gemessen')
    expect(v.innenMm?.widthMm).toBe(500)
  })
})
