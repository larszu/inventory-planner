// ───────────────────────────────────────────────────────────────────────────
// Der Stand während des Beladens.
//
// Die wichtigste Aussage dieser Datei steht im letzten Block: aus der Reihe
// laden wird GEMELDET und nicht verboten. Ein Werkzeug, das am Dock „nein"
// sagt, wird umgangen — und dann weiss es gar nichts mehr.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import {
  befundFuer,
  befundText,
  fortschritt,
  geladenAus,
  karussell,
  naechstes,
  scanInLadung,
  schichten,
} from '../lib/beladen'
import { packe } from '../lib/loadPacker'
import type { LoadPlan, PackStueck } from '../lib/loadPacker'
import type { Ladung, LadungsStueck } from '../types/load'
import type { InventoryItem, StorageNode } from '../types/inventory'
import type { Vehicle } from '../types/vehicle'

const now = '2026-09-18T00:00:00.000Z'

const auto = (patch: Partial<Vehicle> = {}): Vehicle => ({
  id: 'v1',
  name: 'Sprinter',
  kind: 'transporter',
  cargoMm: { lengthMm: 2000, widthMm: 700, heightMm: 1400 },
  obstructions: [],
  createdAt: now,
  updatedAt: now,
  ...patch,
})

const pack = (id: string, x: number, y: number, z: number): PackStueck => ({
  id,
  label: id,
  sizeMm: { x, y, z },
  weightKg: 20,
})

/** Ein Plan mit vier Stücken: zwei unten, zwei darauf. */
const planMitStapel = (): LoadPlan =>
  packe(auto(), [pack('a', 600, 600, 600), pack('b', 600, 600, 600), pack('c', 600, 600, 600), pack('d', 600, 600, 600)])

const stueck = (patch: Partial<LadungsStueck> & { id: string }): LadungsStueck => ({
  label: patch.id,
  herkunft: 'container',
  quantity: 1,
  ...patch,
})

const ladung = (stuecke: LadungsStueck[]): Ladung => ({
  id: 'l1',
  name: 'Testfahrt',
  vehicleId: 'v1',
  stuecke,
  createdAt: now,
  updatedAt: now,
})

describe('Schichten', () => {
  it('gruppiert nach Höhe, von unten nach oben', () => {
    const s = schichten(planMitStapel())

    expect(s.length).toBeGreaterThan(1)
    expect(s[0]!.yMm).toBe(0)
    expect(s[0]!.yMm).toBeLessThan(s[1]!.yMm)
  })

  it('sortiert innerhalb der Schicht nach Ladeschritt', () => {
    const s = schichten(planMitStapel())
    const schritte = s[0]!.placements.map((p) => p.ladeSchritt)

    expect([...schritte].sort((a, b) => a - b)).toEqual(schritte)
  })
})

describe('Das nächste Stück', () => {
  it('ist der kleinste offene Ladeschritt', () => {
    const plan = planMitStapel()
    expect(naechstes(plan, new Map())!.ladeSchritt).toBe(1)
  })

  it('bleibt beim übersprungenen Stück stehen, statt es zu verlieren', () => {
    // Wer Schritt 2 lädt, ohne Schritt 1 geladen zu haben, bekommt weiterhin
    // Schritt 1 angeboten. Ein Werkzeug, das ab dem zuletzt Geladenen
    // weiterzählt, verliert das Uebersprungene lautlos.
    const plan = planMitStapel()
    const zweites = plan.placements.find((p) => p.ladeSchritt === 2)!
    const geladen = new Map([[zweites.stueckId, now]])

    expect(naechstes(plan, geladen)!.ladeSchritt).toBe(1)
  })

  it('ist `undefined`, wenn alles steht', () => {
    const plan = planMitStapel()
    const alle = new Map(plan.placements.map((p) => [p.stueckId, now]))

    expect(naechstes(plan, alle)).toBeUndefined()
  })
})

describe('Fortschritt', () => {
  it('zählt Stücke und Gewicht — und was kein Gewicht hat', () => {
    const plan = planMitStapel()
    const stuecke = [
      stueck({ id: 'a', dimensions: { weightKg: 20 } }),
      stueck({ id: 'b' }),
      stueck({ id: 'c', dimensions: { weightKg: 30 } }),
      stueck({ id: 'd' }),
    ]
    const geladen = new Map([
      ['a', now],
      ['b', now],
    ])

    const f = fortschritt(plan, geladen, stuecke)
    expect(f.geladen).toBe(2)
    expect(f.geladenKg).toBe(20)
    expect(f.ohneGewicht).toBe(1)
  })
})

describe('Was gegen das Laden JETZT spricht', () => {
  it('meldet fehlende Träger — das ist der harte Fall', () => {
    const plan = planMitStapel()
    const oben = plan.placements.find((p) => p.position.y > 0)!
    const b = befundFuer(plan, new Map(), oben.stueckId)

    expect(b.darunter.length).toBeGreaterThan(0)
    expect(befundText(b)).toContain('stands on')
  })

  it('meldet übersprungene Stücke — das ist der weiche Fall', () => {
    // Ein Stück auf dem BODEN mit dem hoechsten Ladeschritt: es hat sicher
    // Vorgaenger und sicher keinen Traeger. Die genaue Zahl der Vorgaenger
    // haengt an der Anordnung und gehoert nicht in die Zusage — gepruefft
    // wird, DASS gemeldet wird, und dass es der weiche Fall ist.
    const plan = planMitStapel()
    const unten = plan.placements
      .filter((p) => p.position.y === 0)
      .sort((a, b) => b.ladeSchritt - a.ladeSchritt)
    const spaeter = unten[0]!
    const b = befundFuer(plan, new Map(), spaeter.stueckId)

    expect(b.darunter).toEqual([])
    expect(b.davor.length).toBeGreaterThan(0)
    expect(b.davor.every((p) => p.ladeSchritt < spaeter.ladeSchritt)).toBe(true)
    expect(befundText(b)).toContain('reach past')
  })

  it('schweigt, wenn das Stück an der Reihe ist', () => {
    const plan = planMitStapel()
    const erstes = plan.placements.find((p) => p.ladeSchritt === 1)!

    expect(befundText(befundFuer(plan, new Map(), erstes.stueckId))).toBe('')
  })

  it('verbietet nichts — der Befund ist eine Auskunft', () => {
    // Die Gegenprobe zur Haltung: es gibt keine Funktion, die „nein" sagt.
    // `befundFuer` liefert Listen, und was damit geschieht, entscheidet die
    // Oberfläche — und dort der Mensch.
    const plan = planMitStapel()
    const oben = plan.placements.find((p) => p.position.y > 0)!
    const b = befundFuer(plan, new Map(), oben.stueckId)

    expect(Array.isArray(b.davor)).toBe(true)
    expect(Array.isArray(b.darunter)).toBe(true)
  })
})

describe('Scannen in eine Ladung', () => {
  const node: StorageNode = {
    id: 'n1',
    name: 'Case 7',
    kind: 'case',
    code: 'C7',
    createdAt: now,
    updatedAt: now,
  }
  const item: InventoryItem = {
    id: 'i1',
    model: 'Shure ULXD2',
    quantity: 4,
    code: 'A-12',
    createdAt: now,
    updatedAt: now,
  }
  const quellen = { items: [item], nodes: [node], units: [] }
  const l = ladung([stueck({ id: 's1', nodeId: 'n1', label: 'Case 7' })])

  it('findet das Stück über den Case-Code', () => {
    const e = scanInLadung('C7', l, quellen)
    expect(e.art).toBe('stueck')
    if (e.art === 'stueck') expect(e.stueck.id).toBe('s1')
  })

  it('unterscheidet „gehört nicht zu dieser Fahrt" von „kenne ich nicht"', () => {
    // Der teurere Fall von beiden: jemand trägt ein bekanntes Case zum
    // falschen LKW. Als „unbekannt" gemeldet sähe das aus wie ein kaputter
    // Aufkleber.
    const fremd = scanInLadung('A-12', l, quellen)
    expect(fremd.art).toBe('nicht-in-ladung')
    if (fremd.art === 'nicht-in-ladung') expect(fremd.was).toBe('Shure ULXD2')

    expect(scanInLadung('XYZ', l, quellen).art).toBe('unbekannt')
  })

  it('nimmt einen leeren Code nicht als Treffer', () => {
    expect(scanInLadung('   ', l, quellen).art).toBe('unbekannt')
  })
})

describe('Der Lade-Stand überlebt das Speichern', () => {
  it('liest `geladenAm` aus der Ladung', () => {
    const l = ladung([
      stueck({ id: 'a', geladenAm: '2026-09-18T07:10:00.000Z' }),
      stueck({ id: 'b' }),
    ])
    const g = geladenAus(l)

    expect(g.size).toBe(1)
    expect(g.get('a')).toBe('2026-09-18T07:10:00.000Z')
    expect(g.has('b')).toBe(false)
  })
})

describe('Der Lade-Streifen', () => {
  it('trägt jedes Stück des Plans, nicht einen Ausschnitt', () => {
    const plan = planMitStapel()
    expect(karussell(plan, new Map()).length).toBe(plan.placements.length)
  })

  it('steht in Plan-Reihenfolge', () => {
    const schritte = karussell(planMitStapel(), new Map()).map((e) => e.placement.ladeSchritt)
    expect([...schritte].sort((a, b) => a - b)).toEqual(schritte)
  })

  it('kennt genau ein „aktuell"', () => {
    const plan = planMitStapel()
    const rollen = karussell(plan, new Map()).map((e) => e.rolle)
    expect(rollen.filter((r) => r === 'aktuell').length).toBe(1)
    expect(rollen[0]).toBe('aktuell')
  })

  it('rückt das „aktuell" weiter, sobald geladen wurde', () => {
    const plan = planMitStapel()
    const erstes = plan.placements.find((p) => p.ladeSchritt === 1)!
    const streifen = karussell(plan, new Map([[erstes.stueckId, now]]))

    expect(streifen[0]!.rolle).toBe('geladen')
    expect(streifen[1]!.rolle).toBe('aktuell')
  })

  it('lässt ein übersprungenes Stück an seinem Platz stehen', () => {
    // Wer Schritt 2 lädt, findet es weiterhin an Position 2 — als erledigt.
    // Nach vorn zu sortieren verfälschte die Reihenfolge, an der sich beim
    // Abladen jemand orientiert.
    const plan = planMitStapel()
    const zweites = plan.placements.find((p) => p.ladeSchritt === 2)!
    const streifen = karussell(plan, new Map([[zweites.stueckId, now]]))

    expect(streifen[1]!.placement.stueckId).toBe(zweites.stueckId)
    expect(streifen[1]!.rolle).toBe('geladen')
    // Und „aktuell" bleibt das übersprungene erste Stück.
    expect(streifen[0]!.rolle).toBe('aktuell')
  })

  it('hat kein „aktuell" mehr, wenn alles steht', () => {
    const plan = planMitStapel()
    const alle = new Map(plan.placements.map((p) => [p.stueckId, now]))
    expect(karussell(plan, alle).every((e) => e.rolle === 'geladen')).toBe(true)
  })
})
