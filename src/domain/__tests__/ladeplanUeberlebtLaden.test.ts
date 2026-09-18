// ───────────────────────────────────────────────────────────────────────────
// Überlebt der Ladeplan das Speichern und Laden? (#22, #23)
//
// ─── DER BEFUND, GEMESSEN 2026-09-18 ───────────────────────────────────────
//
// Eine Ladung mit drei verstauten Stücken zeigte nach dem Neuladen „0 von 10
// verstaut". Auch die von Hand gesetzten Kisten standen wieder dort, wohin
// der Packer sie rechnete, und die Abladereihenfolge war wieder alphabetisch.
//
// Der Grund ist kein Fehler im Speichern, sondern im LESEN: `healStueck`
// baut jedes Stück Feld für Feld neu auf — mit Absicht, damit nichts
// Unbekanntes aus einer fremden Datei hereinkommt. Der Preis ist, dass ein
// neues Feld dort eingetragen werden muss, und `fixiert` und `geladenAm`
// waren es nicht.
//
// Dieselbe Falle hat `healNode` schon einmal mit `transport` gestellt. Das
// Repo hat für genau diese Defektform eine Test-Familie — `fristen…`,
// `schaden…`, `mindestmenge…UeberlebtLaden` —, und das hier ist ihr
// vierter Fall.
//
// ─── WAS ER PRÜFT ──────────────────────────────────────────────────────────
//
// Die Heil-Funktion selbst, nicht den Store: sie ist die Stelle, an der ein
// Feld verlorengeht, und sie lässt sich ohne `localStorage` aufrufen.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { healLadung } from '../store/loadStore'

const roh = {
  id: 'l1',
  name: 'Sommershow',
  vehicleId: 'v1',
  gruppenReihenfolge: ['Bühne', 'Licht', 'Ton'],
  stuecke: [
    {
      id: 's1',
      label: 'FOH-Case',
      herkunft: 'container',
      quantity: 1,
      dimensions: { widthMm: 700, heightMm: 800, depthMm: 700, weightKg: 110 },
      gruppe: 'Ton',
      geladenAm: '2026-09-18T07:02:00.000Z',
      fixiert: { position: { x: 100, y: 0, z: 200 }, lage: 'upright' },
    },
  ],
  createdAt: '2026-09-18T00:00:00.000Z',
  updatedAt: '2026-09-18T00:00:00.000Z',
}

describe('Der Ladeplan überlebt das Laden', () => {
  it('behält, was schon verstaut ist', () => {
    const l = healLadung(roh)!
    expect(l.stuecke[0]!.geladenAm).toBe('2026-09-18T07:02:00.000Z')
  })

  it('behält die von Hand gesetzte Lage', () => {
    const l = healLadung(roh)!
    expect(l.stuecke[0]!.fixiert).toEqual({ position: { x: 100, y: 0, z: 200 }, lage: 'upright' })
  })

  it('behält die Abladereihenfolge', () => {
    expect(healLadung(roh)!.gruppenReihenfolge).toEqual(['Bühne', 'Licht', 'Ton'])
  })
})

describe('Was NICHT übernommen wird', () => {
  const mitStueck = (patch: Record<string, unknown>) =>
    healLadung({ ...roh, stuecke: [{ ...roh.stuecke[0], ...patch }] })!.stuecke[0]!

  it('verwirft eine halb gesetzte Lage ganz', () => {
    // Eine Verankerung ohne vollständige Position wäre eine Kiste, die
    // irgendwo steht — der Packer hielte sie dort fest, und niemand könnte
    // sagen, wo „dort" ist. Dieselbe Regel wie bei der halb vermessenen
    // Ladeöffnung in `healVehicle`.
    expect(mitStueck({ fixiert: { position: { x: 100, z: 200 }, lage: 'upright' } }).fixiert).toBeUndefined()
    expect(mitStueck({ fixiert: { position: { x: 100, y: 0, z: 200 } } }).fixiert).toBeUndefined()
    expect(
      mitStueck({ fixiert: { position: { x: 100, y: 0, z: 200 }, lage: 'schraeg' } }).fixiert,
    ).toBeUndefined()
  })

  it('verwirft eine negative Position', () => {
    expect(
      mitStueck({ fixiert: { position: { x: -1, y: 0, z: 200 }, lage: 'upright' } }).fixiert,
    ).toBeUndefined()
  })

  it('macht aus einem leeren Zeitpunkt kein „verstaut"', () => {
    expect(mitStueck({ geladenAm: '' }).geladenAm).toBeUndefined()
    expect(mitStueck({ geladenAm: 42 }).geladenAm).toBeUndefined()
  })

  it('lässt eine fehlende Gruppenreihenfolge fehlen, statt eine zu erfinden', () => {
    const ohne = healLadung({ ...roh, gruppenReihenfolge: undefined })!
    expect(ohne.gruppenReihenfolge).toBeUndefined()
  })

  it('wirft leere Einträge aus der Gruppenreihenfolge', () => {
    const l = healLadung({ ...roh, gruppenReihenfolge: ['Bühne', '', '  ', 'Ton', 7] })!
    expect(l.gruppenReihenfolge).toEqual(['Bühne', 'Ton'])
  })
})
