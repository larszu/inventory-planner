// ───────────────────────────────────────────────────────────────────────────
// Die Kennung eines Lagerplatzes.
//
// DIE WICHTIGSTE AUSSAGE steht im Block „Hin und zurück": was gebaut wurde,
// muss sich zurücklesen lassen. Ohne den Rückweg ist ein gescanntes
// „A-01-02" eine Zeichenkette, die zufällig wie eine Adresse aussieht.
//
// DIE ZWEITE steht in „Was nicht erfunden wird": eine Stufe ohne Wert bricht
// die Kennung ab, statt eine Null einzusetzen — „A-01-00" wäre ein Platz,
// den es gibt.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import {
  ausBuchstabe,
  ebenenKennungen,
  buchstabe,
  kennung,
  kollisionen,
  kollisionText,
  leseKennung,
  OHNE_SCHEMA,
  reihe,
  schemaBeispiel,
  SCHEMA_A1,
  stufenName,
  type Kennungsschema,
} from '../lib/platzkennung'

/** Gross: Gasse als Buchstabe, Feld und Ebene zweistellig mit Bindestrich. */
const GROSS: Kennungsschema = {
  stufen: [
    { art: 'gasse', zeichen: 'buchstaben', stellen: 0 },
    { art: 'feld', zeichen: 'ziffern', stellen: 2 },
    { art: 'ebene', zeichen: 'ziffern', stellen: 2 },
  ],
  trenner: '-',
}

describe('Buchstaben laufen wie Tabellenspalten', () => {
  it('A ist 1, Z ist 26, AA ist 27', () => {
    expect(buchstabe(1)).toBe('A')
    expect(buchstabe(26)).toBe('Z')
    expect(buchstabe(27)).toBe('AA')
    expect(buchstabe(52)).toBe('AZ')
  })

  it('hört nicht bei Z auf', () => {
    // Bei 27 Gassen mit „A1" abzubrechen waere eine Grenze, die niemand
    // erwartet — und die erst auffiele, wenn das Regal schon steht.
    expect(buchstabe(703)).toBe('AAA')
  })

  it('liest zurück, was es gebaut hat', () => {
    for (const n of [1, 26, 27, 52, 703]) {
      expect(ausBuchstabe(buchstabe(n))).toBe(n)
    }
  })

  it('macht aus Unsinn keine Zahl', () => {
    expect(ausBuchstabe('A1')).toBeNull()
    expect(ausBuchstabe('')).toBeNull()
    expect(buchstabe(0)).toBe('')
  })
})

describe('Die Kennung bauen', () => {
  it('baut A1 ohne Trenner', () => {
    expect(kennung(SCHEMA_A1, { reihe: 1, feld: 1 })).toBe('A1')
    expect(kennung(SCHEMA_A1, { reihe: 2, feld: 12 })).toBe('B12')
  })

  it('füllt auf und trennt, wo das Haus es so führt', () => {
    expect(kennung(GROSS, { gasse: 1, feld: 1, ebene: 2 })).toBe('A-01-02')
    expect(kennung(GROSS, { gasse: 27, feld: 11, ebene: 4 })).toBe('AA-11-04')
  })
})

describe('Was nicht erfunden wird', () => {
  it('ohne Schema gibt es keine Kennung — und keinen leeren Text', () => {
    expect(kennung(OHNE_SCHEMA, { reihe: 1 })).toBeNull()
    expect(schemaBeispiel(OHNE_SCHEMA)).toBeNull()
  })

  it('eine Stufe ohne Wert bricht ab, statt eine Null zu setzen', () => {
    // „A-01-00" waere ein Platz, den es gibt. Das ist die teure Richtung.
    expect(kennung(GROSS, { gasse: 1, feld: 1 })).toBeNull()
    expect(kennung(GROSS, { gasse: 1, feld: 1, ebene: 0 })).toBeNull()
  })
})

describe('Hin und zurück', () => {
  it('liest, was es gebaut hat — mit Trenner', () => {
    const werte = { gasse: 3, feld: 7, ebene: 2 }
    expect(leseKennung(GROSS, kennung(GROSS, werte)!)).toEqual(werte)
  })

  it('liest, was es gebaut hat — ohne Trenner', () => {
    expect(leseKennung(SCHEMA_A1, 'B12')).toEqual({ reihe: 2, feld: 12 })
  })

  it('nimmt Kleinschreibung und Leerzeichen an', () => {
    expect(leseKennung(SCHEMA_A1, '  b12 ')).toEqual({ reihe: 2, feld: 12 })
  })

  it('weist ab, was nicht zum Schema passt', () => {
    // Das ist ein Ergebnis und kein Fehler: wer das Etikett am Case scannt
    // statt das am Regal, soll es gesagt bekommen.
    expect(leseKennung(SCHEMA_A1, 'C-01-02')).toBeNull()
    expect(leseKennung(GROSS, 'A1')).toBeNull()
    expect(leseKennung(SCHEMA_A1, '12B')).toBeNull()
    expect(leseKennung(SCHEMA_A1, 'A12X')).toBeNull()
    expect(leseKennung(OHNE_SCHEMA, 'A1')).toBeNull()
  })

  it('entscheidet sich NICHT, wo zwei Lesarten möglich wären', () => {
    // Zwei Ziffern-Stufen ohne Trenner: „1102" ist 1|102 und 11|02 zugleich.
    // Eine Lesart zu waehlen hiesse raten.
    const mehrdeutig: Kennungsschema = {
      stufen: [
        { art: 'feld', zeichen: 'ziffern', stellen: 0 },
        { art: 'ebene', zeichen: 'ziffern', stellen: 0 },
      ],
      trenner: '',
    }
    expect(leseKennung(mehrdeutig, '1102')).toBeNull()
  })
})

describe('Eine ganze Reihe beschriften', () => {
  it('zählt die feinste Stufe am schnellsten', () => {
    // A1, A2, A3, B1 … — nicht A1, B1, C1. Das ist die Reihenfolge des
    // Ablaufens: man geht ein Regal entlang, nicht quer durch die Halle.
    expect(reihe(SCHEMA_A1, { reihe: 2, feld: 3 })).toEqual(['A1', 'A2', 'A3', 'B1', 'B2', 'B3'])
  })

  it('hält fest, was fest ist', () => {
    expect(reihe(GROSS, { feld: 2, ebene: 2 }, { gasse: 1 })).toEqual([
      'A-01-01',
      'A-01-02',
      'A-02-01',
      'A-02-02',
    ])
  })

  it('liefert nichts ohne Grenzen, statt eine zu raten', () => {
    expect(reihe(SCHEMA_A1, { reihe: 2 })).toEqual([])
    expect(reihe(OHNE_SCHEMA, { reihe: 2, feld: 2 })).toEqual([])
  })

  it('liefert lauter lesbare Kennungen', () => {
    for (const k of reihe(GROSS, { gasse: 2, feld: 2, ebene: 2 })) {
      expect(leseKennung(GROSS, k), k).not.toBeNull()
    }
  })
})

describe('Doppelt vergeben wird gemeldet, nicht verhindert', () => {
  it('findet die Doppelten', () => {
    const k = kollisionen([
      { id: '1', code: 'A1' },
      { id: '2', code: 'a1' },
      { id: '3', code: 'A2' },
      { id: '4' },
    ])
    expect(k).toEqual([{ kennung: 'A1', ids: ['1', '2'] }])
  })

  it('zählt einen fehlenden Code nicht als Dopplung', () => {
    expect(kollisionen([{ id: '1' }, { id: '2', code: '  ' }])).toEqual([])
  })

  it('sagt es im Klartext', () => {
    expect(kollisionText({ kennung: 'A1', ids: ['1', '2'] })).toBe('Code A1 is used 2 times.')
  })
})

describe('Die Stufen heissen etwas', () => {
  it('englisch als Quelle, übersetzbar', () => {
    expect(stufenName('gasse')).toBe('Aisle')
    expect(stufenName('ebene', (k, en) => (k === 'code.stage.level' ? 'Ebene' : en))).toBe('Ebene')
  })
})

describe('Die Ebenen eines Regals setzen seine Kennung fort', () => {
  it('hängt die Ebene mit dem Trenner des Hauses an', () => {
    expect(ebenenKennungen('A-01', 3, GROSS)).toEqual({
      kennungen: ['A-01-01', 'A-01-02', 'A-01-03'],
      mitBindestrich: false,
    })
  })

  it('ergänzt einen Bindestrich, wo das Schema keinen Trenner hat — und sagt es', () => {
    // Ohne ihn wäre „A1" + Ebene 2 gleich „A12", und das ist unter diesem
    // Schema Regal A, Feld 12. Zwei Plätze mit derselben Adresse sind
    // schlimmer als eine hässliche Adresse.
    expect(ebenenKennungen('A1', 2, SCHEMA_A1)).toEqual({
      kennungen: ['A1-1', 'A1-2'],
      mitBindestrich: true,
    })
  })

  it('liefert nichts ohne Regal-Kennung, statt eine zu erfinden', () => {
    expect(ebenenKennungen(undefined, 3, SCHEMA_A1).kennungen).toEqual([])
    expect(ebenenKennungen('  ', 3, SCHEMA_A1).kennungen).toEqual([])
    expect(ebenenKennungen('A1', 0, SCHEMA_A1).kennungen).toEqual([])
  })

  it('benutzt die Auffüllung der Ebenen-Stufe, wenn es eine gibt', () => {
    expect(ebenenKennungen('A', 2, GROSS).kennungen).toEqual(['A-01', 'A-02'])
  })
})
