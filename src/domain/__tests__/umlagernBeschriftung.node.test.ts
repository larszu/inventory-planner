// ───────────────────────────────────────────────────────────────────────────
// Die Beschriftungen des Umlagerns — und warum sie Funktionen sind.
//
// ─── DER BEFUND, GEMESSEN 2026-09-18 ───────────────────────────────────────
//
// `types/storageMove.ts` trug zwei Tabellen mit deutschen Zeichenketten:
//
//   MOVE_SUBJECT_LABEL = { node: 'Lagerort/Container', … }
//   MOVE_REFUSAL_LABEL = { cycle: 'Ein Container kann nicht in sich selbst', … }
//
// Zweimal falsch. Die Quellsprache dieses Repos ist `en` (E-28) — und eine
// Beschriftungs-Tabelle auf MODULEBENE wird beim Laden einmal gebaut. Sie
// bliebe danach in der Sprache stehen, die damals galt; wer im Betrieb auf
// Deutsch umschaltet, bekäme sie nicht mit. Genau davor warnt `CLAUDE.md`,
// und die Regel stand da, während diese beiden Tabellen sie brachen.
//
// Gesehen hat es kein Wächter: `lang:check` liest JSX-Text, und dies sind
// Zeichenketten in einem Typ-Modul.
//
// ─── WAS DIESE DATEI PRÜFT ─────────────────────────────────────────────────
//
// Nicht nur die Werte, sondern die FORM: dass der Wortlaut sich mit dem
// Übersetzer ändert. Ein Test, der bloss `moveRefusalLabel('cycle')` gegen
// einen Satz hält, wäre auch dann grün, wenn jemand die Tabelle wieder
// einführt und die Funktion nur noch daraus abliest.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { moveRefusalLabel, moveSubjectLabel } from '../types/storageMove'
import { moveRefusal, moveTable } from '../lib/storageMoves'
import type { StorageNode } from '../types/inventory'
import type { StorageMove } from '../types/storageMove'

const now = '2026-09-18T00:00:00.000Z'

/** Ein Wörterbuch-Übersetzer, wie ihn der Store im Betrieb reicht. */
const deutsch = (key: string, en: string): string =>
  ({
    'move.refusal.cycle': 'Ein Container kann nicht in sich selbst.',
    'move.subject.node': 'Lagerort/Container',
    'move.col.at': 'Zeitpunkt',
  })[key] ?? en

describe('Die Beschriftung folgt der Sprache', () => {
  it('liefert ohne Wörterbuch die englische Quelle', () => {
    expect(moveRefusalLabel('cycle')).toBe('A container cannot go inside itself.')
    expect(moveSubjectLabel('node')).toBe('Location/container')
  })

  it('liefert mit Wörterbuch die Übersetzung', () => {
    expect(moveRefusalLabel('cycle', deutsch)).toBe('Ein Container kann nicht in sich selbst.')
    expect(moveSubjectLabel('node', deutsch)).toBe('Lagerort/Container')
  })

  it('ändert sich beim Umschalten — sie ist keine Tabelle von damals', () => {
    // Der Kern dieses Laufs: zweimal dieselbe Kennung, zwei Ergebnisse.
    const vorher = moveRefusalLabel('same-place')
    const nachher = moveRefusalLabel('same-place', (k, en) => (k === 'move.refusal.same' ? 'Liegt schon dort.' : en))
    expect(vorher).not.toBe(nachher)
  })

  it('kennt jede Absage, die `moveRefusal` geben kann', () => {
    const nodes: StorageNode[] = [
      { id: 'a', name: 'A', kind: 'case', createdAt: now, updatedAt: now },
      { id: 'b', name: 'B', kind: 'case', parentId: 'a', createdAt: now, updatedAt: now },
    ]
    const faelle = [
      moveRefusal(nodes, 'node', undefined, 'a'),
      moveRefusal(nodes, 'node', { id: 'a' }, 'weg'),
      moveRefusal(nodes, 'node', { id: 'a' }, 'b'),
      moveRefusal(nodes, 'node', { id: 'b', currentPlaceId: 'a' }, 'a'),
    ]
    expect(faelle).toEqual(['unknown-subject', 'unknown-target', 'cycle', 'same-place'])
    for (const f of faelle) {
      expect(moveRefusalLabel(f!).length, `${f} ohne Satz`).toBeGreaterThan(0)
    }
  })
})

describe('Das Journal-Blatt spricht dieselbe Sprache', () => {
  const moves: StorageMove[] = [
    { at: now, kind: 'node', subjectId: 'a', toId: 'b', toLabel: 'Halle 1 › Regal A' },
  ]

  it('übersetzt die Spaltenköpfe', () => {
    const tabelle = moveTable(moves, [], () => 'A', deutsch)
    expect(tabelle.headers[0]).toBe('Zeitpunkt')
    expect(tabelle.headers[1]).toBe('Kind')
  })

  it('übersetzt die Art in der Zeile und nicht nur den Kopf', () => {
    expect(moveTable(moves, [], () => 'A', deutsch).rows[0]![1]).toBe('Lagerort/Container')
  })
})

describe('Keine Beschriftungs-Tabelle auf Modulebene', () => {
  // Die Ratsche: ein `Record<…, string>` mit Beschriftungen ist genau die
  // Form, die dieser Befund abgeschafft hat. Gemessen wird der Quelltext,
  // weil eine Tabelle im gebauten Zustand nicht mehr von einer Funktion zu
  // unterscheiden ist.
  //
  // WAS SIE NICHT SIEHT: eine Tabelle, die nicht `Record` heisst. Das ist die
  // Grenze einer Textmessung, und sie steht hier, statt dass jemand sie
  // später für eine Zusicherung hält.
  const quelle = readFileSync(resolve(__dirname, '..', 'types', 'storageMove.ts'), 'utf8')

  it('in `storageMove.ts` steht keine mehr', () => {
    expect(/Readonly<Record<[^>]*,\s*string>>/.test(quelle), 'Record<…, string> als Konstante').toBe(false)
  })

  it('und die Funktionen sind exportiert', () => {
    expect(quelle).toMatch(/export function moveSubjectLabel/)
    expect(quelle).toMatch(/export function moveRefusalLabel/)
  })
})
