// ───────────────────────────────────────────────────────────────────────────
// Abladegruppen aus der Kategorie (#22).
//
// Die wichtigste Aussage steht im dritten Block: eine von Hand gesetzte
// Gruppe wird NICHT überschrieben. Ein Lauf, der das täte, wäre derselbe
// Gegner wie ein Packer, der eine hingestellte Kiste wieder wegräumt.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import {
  GRUPPEN_VORSCHLAG_REIHENFOLGE,
  gruppeAusKategorie,
  gruppenName,
  gruppenVorschlaege,
} from '../lib/abladegruppen'
import type { InventoryItem } from '../types/inventory'
import type { Ladung, LadungsStueck } from '../types/load'

const now = '2026-09-18T00:00:00.000Z'

const artikel = (id: string, category?: string): InventoryItem =>
  ({ id, name: id, quantity: 1, category, createdAt: now, updatedAt: now }) as unknown as InventoryItem

const stueck = (id: string, itemId?: string, gruppe?: string): LadungsStueck => ({
  id,
  label: id,
  herkunft: itemId ? 'artikel' : 'csv',
  itemId,
  quantity: 1,
  gruppe,
})

const ladung = (stuecke: LadungsStueck[]): Ladung => ({
  id: 'l1',
  name: 'Show',
  stuecke,
  createdAt: now,
  updatedAt: now,
})

describe('gruppeAusKategorie', () => {
  it('ordnet die Kategorien der Suite ihrem Gewerk zu', () => {
    expect(gruppeAusKategorie('Lighting')).toBe('Light')
    expect(gruppeAusKategorie('Microphones')).toBe('Sound')
    expect(gruppeAusKategorie('Cameras')).toBe('Video')
    expect(gruppeAusKategorie('Rigging')).toBe('Rigging')
  })

  it('fasst zusammen, was zusammen abgeladen wird', () => {
    // Drei Kategorien, ein Gewerk: ein Ladeplan mit drei Ein-Stueck-Schichten
    // waere eine Schichtung ohne Nutzen.
    expect(gruppeAusKategorie('Lenses')).toBe(gruppeAusKategorie('Cameras'))
    expect(gruppeAusKategorie('Tripods')).toBe(gruppeAusKategorie('Cameras'))
  })

  it('erfindet nichts', () => {
    // Die Hausregel, und hier ist sie besonders teuer: der Packer schichtet
    // nach Gruppen, ein Stueck in einer erfundenen Gruppe laege also an einer
    // erfundenen Stelle im Laderaum.
    expect(gruppeAusKategorie(undefined)).toBeUndefined()
    expect(gruppeAusKategorie('')).toBeUndefined()
    expect(gruppeAusKategorie('Other')).toBeUndefined()
    expect(gruppeAusKategorie('Zirkuszelt')).toBeUndefined()
  })

  it('nimmt den Uebersetzer entgegen', () => {
    const de = (_k: string, en: string) => (en === 'Light' ? 'Licht' : en)
    expect(gruppeAusKategorie('Lighting', de)).toBe('Licht')
  })
})

describe('gruppenVorschlaege', () => {
  it('zaehlt vorher, was ein Lauf taete', () => {
    const l = ladung([stueck('a', 'i1'), stueck('b', 'i2'), stueck('c')])
    const v = gruppenVorschlaege(l, [artikel('i1', 'Lighting'), artikel('i2', 'Audio')])
    expect(v.setzen).toHaveLength(2)
    expect(v.offen).toBe(1)
    expect(v.behalten).toBe(0)
  })

  it('fasst eine von Hand gesetzte Gruppe nicht an', () => {
    const l = ladung([stueck('a', 'i1', 'Notfallkoffer')])
    const v = gruppenVorschlaege(l, [artikel('i1', 'Lighting')])
    expect(v.setzen).toHaveLength(0)
    expect(v.behalten).toBe(1)
    // Und sie faellt nicht aus der Reihenfolge, nur weil sie niemand kennt.
    expect(v.reihenfolge).toContain('Notfallkoffer')
  })

  it('ein CSV-Stueck hat keine Kategorie und bekommt keine Gruppe', () => {
    // Eine fremde Manifest-Zeile traegt die Taxonomie dieses Hauses nicht.
    const v = gruppenVorschlaege(ladung([stueck('a')]), [])
    expect(v.setzen).toHaveLength(0)
    expect(v.offen).toBe(1)
  })

  it('reiht die Gewerke in Bau-Reihenfolge, Eigene hinten an', () => {
    const l = ladung([
      stueck('a', 'i1'),
      stueck('b', 'i2'),
      stueck('c', 'i3'),
      stueck('d', undefined, 'Catering'),
    ])
    const v = gruppenVorschlaege(l, [
      artikel('i1', 'Cameras'),
      artikel('i2', 'Rigging'),
      artikel('i3', 'Lighting'),
    ])
    expect(v.reihenfolge.slice(0, 3)).toEqual(['Rigging', 'Light', 'Video'])
    expect(v.reihenfolge[v.reihenfolge.length - 1]).toBe('Catering')
  })

  it('nennt nur Gruppen, die auch vorkommen', () => {
    const v = gruppenVorschlaege(ladung([stueck('a', 'i1')]), [artikel('i1', 'Audio')])
    expect(v.reihenfolge).toEqual(['Sound'])
  })
})

describe('Zwei Abladestellen an einer Fahrt', () => {
  // #22: „Zwei Abladestellen an einer Fahrt (Halle A, dann Halle B) sind
  // ausdruecklich abgedeckt."
  //
  // Sie brauchen kein eigenes Feld. Eine Abladestelle IST eine Ordnung der
  // Gruppen: was in Halle A herauskommt, wird frueher gebraucht als alles aus
  // Halle B — und genau danach schichtet der Packer. Ein zweites Feld
  // „Stelle" waere eine zweite Wahrheit ueber dieselbe Reihenfolge und muesste
  // mit ihr abgeglichen werden.
  it('bildet sich als Reihenfolge der Gruppen ab', () => {
    const l: Ladung = {
      ...ladung([
        stueck('a', undefined, 'Halle A · Licht'),
        stueck('b', undefined, 'Halle A · Ton'),
        stueck('c', undefined, 'Halle B · Licht'),
      ]),
      gruppenReihenfolge: ['Halle A · Licht', 'Halle A · Ton', 'Halle B · Licht'],
    }
    const v = gruppenVorschlaege(l, [])
    expect(v.behalten).toBe(3)
    expect(v.setzen).toHaveLength(0)
    // Alle drei bleiben in der Reihenfolge erhalten — der Vorschlag wirft
    // keine Gruppe weg, die es schon gibt.
    expect(new Set(v.reihenfolge)).toEqual(
      new Set(['Halle A · Licht', 'Halle A · Ton', 'Halle B · Licht']),
    )
  })
})

describe('gruppenName', () => {
  it('loest jeden Schluessel der Vorschlagsreihenfolge auf', () => {
    for (const k of GRUPPEN_VORSCHLAG_REIHENFOLGE) {
      expect(gruppenName(k)).not.toBe(k)
    }
  })

  it('gibt einen unbekannten Schluessel unveraendert zurueck', () => {
    expect(gruppenName('Catering')).toBe('Catering')
  })
})
