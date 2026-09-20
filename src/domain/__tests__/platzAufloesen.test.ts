// ───────────────────────────────────────────────────────────────────────────
// „Regal A Ebene 1" wird zu einem Lagerplatz.
//
// DIE WICHTIGSTE AUSSAGE steht im Block „Mehrdeutig ist ein Ergebnis": zwei
// Regale mit demselben Namen ergeben KEINE Antwort. Sich für eines zu
// entscheiden wäre geraten — und geraten sieht genauso aus wie gewusst.
//
// DIE ZWEITE steht in „Der Aufkleber schlägt den Namen": wer ein Regal
// umbenennt, ändert nicht das Etikett, das daran klebt.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { platzAbsageText, platzAufloesen } from '../lib/platzAufloesen'
import { SCHEMA_A1 } from '../lib/platzkennung'
import type { StorageNode } from '../types/inventory'

const now = '2026-09-18T00:00:00.000Z'

const n = (id: string, name: string, patch: Partial<StorageNode> = {}): StorageNode => ({
  id,
  name,
  kind: 'shelf',
  createdAt: now,
  updatedAt: now,
  ...patch,
})

/** Halle 1 › Regal A › Ebene 1/2, dazu ein zweites Regal in Halle 2. */
const lager: StorageNode[] = [
  n('h1', 'Halle 1', { kind: 'depot' }),
  n('h2', 'Halle 2', { kind: 'depot' }),
  n('rA', 'Regal A', { parentId: 'h1', code: 'A' }),
  n('rA2', 'Regal A', { parentId: 'h2' }),
  n('e1', 'Ebene 1', { kind: 'bin', parentId: 'rA', code: 'A1' }),
  n('e2', 'Ebene 2', { kind: 'bin', parentId: 'rA', code: 'A2' }),
]

describe('Der Aufkleber schlägt den Namen', () => {
  it('findet über die Kennung', () => {
    const r = platzAufloesen('A1', lager)
    expect(r).toMatchObject({ art: 'treffer', weg: 'code' })
    expect(r.art === 'treffer' && r.node.id).toBe('e1')
  })

  it('nimmt Kleinschreibung und Leerzeichen an', () => {
    expect(platzAufloesen('  a1 ', lager).art).toBe('treffer')
  })

  it('liest „A 1" über das Hausschema', () => {
    const r = platzAufloesen('A 1', lager, SCHEMA_A1)
    expect(r).toMatchObject({ art: 'treffer', weg: 'schema' })
    expect(r.art === 'treffer' && r.node.id).toBe('e1')
  })
})

describe('Der Pfad, wie ein Mensch ihn tippt', () => {
  it('trifft über zwei Glieder', () => {
    const r = platzAufloesen('Regal A › Ebene 2', lager)
    expect(r).toMatchObject({ art: 'treffer', weg: 'pfad' })
    expect(r.art === 'treffer' && r.node.id).toBe('e2')
  })

  it('nimmt auch / und > als Trenner', () => {
    expect(platzAufloesen('Regal A / Ebene 2', lager).art).toBe('treffer')
    expect(platzAufloesen('Regal A > Ebene 2', lager).art).toBe('treffer')
  })

  it('darf abkürzen — niemand tippt die volle Kette', () => {
    // „Halle 1" steht darüber und fehlt hier. Der Pfad trifft trotzdem.
    const r = platzAufloesen('Halle 1 › Ebene 1', lager)
    expect(r.art === 'treffer' && r.node.id).toBe('e1')
  })

  it('trifft nicht, wenn die Reihenfolge nicht stimmt', () => {
    expect(platzAufloesen('Ebene 1 › Regal A', lager).art).toBe('absage')
  })
})

describe('Mehrdeutig ist ein Ergebnis und kein Fehler', () => {
  it('entscheidet sich bei zwei gleichnamigen Regalen NICHT', () => {
    const r = platzAufloesen('Regal A', lager)
    expect(r).toMatchObject({ art: 'absage', grund: 'mehrdeutig' })
    expect(r.art === 'absage' && r.kandidaten).toHaveLength(2)
  })

  it('wird eindeutig, sobald der Pfad dazukommt', () => {
    const r = platzAufloesen('Halle 2 / Regal A', lager)
    expect(r.art === 'treffer' && r.node.id).toBe('rA2')
  })

  it('nennt die Kandidaten im Klartext', () => {
    const r = platzAufloesen('Regal A', lager)
    expect(r.art === 'absage' && platzAbsageText(r, lager)).toContain('Halle 1 › Regal A')
  })
})

describe('Was keine Antwort ergibt', () => {
  it('leer ist leer und nicht unbekannt', () => {
    expect(platzAufloesen('   ', lager)).toMatchObject({ art: 'absage', grund: 'leer' })
  })

  it('unbekannt sagt unbekannt', () => {
    const r = platzAufloesen('Regal Z', lager)
    expect(r).toMatchObject({ art: 'absage', grund: 'unbekannt' })
    expect(r.art === 'absage' && platzAbsageText(r, lager)).toBe('No location of that name or code.')
  })
})
