// ───────────────────────────────────────────────────────────────────────────
// Aus der Reifengrösse den Radkasten.
//
// Die Aussage dieser Datei steht im letzten Block: die HÖHE wird nicht
// zurückgegeben. Sie hängt am Abstand zwischen Ladeboden und Achse und steht
// in keiner Reifengrösse — eine gerechnete Höhe sähe im Ladeplan aus wie eine
// gemessene, und der Packer stapelt darauf.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import {
  RADKASTEN_ZUSCHLAG_MM,
  ZOLL_MM,
  liesReifen,
  radkastenAusReifen,
  reifenText,
} from '../lib/reifen'

describe('liesReifen', () => {
  it('rechnet den Aussendurchmesser aus der Bezeichnung', () => {
    // 235/65 R16: Flanke 152,75 mm, Felge 406,4 mm, Durchmesser 711,9 mm.
    const r = liesReifen('235/65 R16')!
    expect(r.breiteMm).toBe(235)
    expect(r.verhaeltnis).toBe(65)
    expect(r.felgeZoll).toBe(16)
    expect(r.flankeMm).toBeCloseTo(152.75, 2)
    expect(r.durchmesserMm).toBeCloseTo(16 * ZOLL_MM + 2 * 152.75, 2)
  })

  it('nimmt die ueblichen Schreibweisen', () => {
    // Sie unterscheiden sich in Leerzeichen und Zusaetzen, nicht in den Zahlen.
    const erwartet = liesReifen('235/65 R16')!.durchmesserMm
    for (const s of ['235/65R16C', '235/65 R 16 C', 'LT235/65R16', ' 235 / 65 R16 ']) {
      expect(liesReifen(s)?.durchmesserMm, s).toBeCloseTo(erwartet, 6)
    }
  })

  it('liest die zweite uebliche Transportergroesse', () => {
    // 225/75 R16C — Sprinter, Ducato, Boxer.
    const r = liesReifen('225/75 R16C')!
    expect(r.flankeMm).toBeCloseTo(168.75, 2)
    expect(Math.round(r.durchmesserMm)).toBe(744)
  })

  it('lehnt die Form OHNE Verhaeltnis ab', () => {
    // `7.50 R16` und `31x10.50 R15` tragen die Flanke nicht in der
    // Bezeichnung. Sie ohne sie zu rechnen hiesse, sie zu raten.
    expect(liesReifen('7.50 R16')).toBeNull()
    expect(liesReifen('31x10.50 R15')).toBeNull()
  })

  it('lehnt ab, was keine Reifengroesse sein kann', () => {
    // Ein Tippfehler, der durchginge, stuende gleich als Radkasten im
    // Laderaum.
    expect(liesReifen('935/65 R16')).toBeNull() // zu breit
    expect(liesReifen('235/05 R16')).toBeNull() // Verhaeltnis zu klein
    expect(liesReifen('235/65 R44')).toBeNull() // Felge zu gross
    expect(liesReifen('')).toBeNull()
    expect(liesReifen('Winterreifen')).toBeNull()
  })

  it('sagt, was es verstanden hat', () => {
    // Damit am Feld sichtbar ist, welche Zahlen gleich im Laderaum stehen.
    expect(reifenText(liesReifen('235/65 R16')!)).toContain('235/65 R16')
    expect(reifenText(liesReifen('235/65 R16')!)).toContain('712')
  })
})

describe('radkastenAusReifen', () => {
  it('legt den Zuschlag auf BEIDE Seiten', () => {
    const r = liesReifen('235/65 R16')!
    const k = radkastenAusReifen(r, 30)
    expect(k.breiteMm).toBe(235 + 60)
    expect(k.laengeMm).toBe(Math.round(r.durchmesserMm) + 60)
  })

  it('nimmt ohne Angabe den ueblichen Zuschlag', () => {
    const r = liesReifen('235/65 R16')!
    expect(radkastenAusReifen(r)).toEqual(radkastenAusReifen(r, RADKASTEN_ZUSCHLAG_MM))
  })

  it('laesst einen Zuschlag von null zu', () => {
    // Ein ausgebauter Kasten kann buendig sein. Null ist eine Angabe.
    const r = liesReifen('235/65 R16')!
    expect(radkastenAusReifen(r, 0).breiteMm).toBe(235)
  })

  it('kippt bei einem negativen Zuschlag nicht ins Kleinere', () => {
    const r = liesReifen('235/65 R16')!
    expect(radkastenAusReifen(r, -100).breiteMm).toBe(235)
  })

  it('GIBT KEINE HOEHE ZURUECK', () => {
    // Die Aussage dieser Datei. Sie haengt am Abstand zwischen Ladeboden und
    // Achse — eine Eigenschaft des Aufbaus, nicht des Reifens.
    const k = radkastenAusReifen(liesReifen("235/65 R16")!) as unknown as Record<string, unknown>
    expect(Object.keys(k).sort()).toEqual(['breiteMm', 'laengeMm'])
    expect('hoeheMm' in k).toBe(false)
  })
})
