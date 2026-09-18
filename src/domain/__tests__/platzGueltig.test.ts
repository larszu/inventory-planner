// ───────────────────────────────────────────────────────────────────────────
// Darf dieses Stück HIER stehen — die eine Antwort für beide Ansichten (#23).
//
// WAS DIESE DATEI FESTHÄLT, ist nicht nur „gültig ja/nein", sondern der
// GRUND. Die Draufsicht und die 3D-Ansicht schreiben ihn hin, solange
// gezogen wird; ein blosses „geht nicht" liesse den Menschen raten, ob es
// die Wand, die Rundung oder die Nachbarkiste ist. Ein Urteil ohne Grund
// wäre deshalb schon ein Fehler, auch wenn es richtig ist.
//
// Die Reihenfolge der Prüfungen ist selbst eine Aussage: wer halb aus dem
// Fahrzeug ragt UND in der Nachbarkiste steckt, soll „ragt heraus" lesen —
// das ist die Auskunft, die er zuerst braucht.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { platzUrteil, platzUrteilText } from '../lib/platzGueltig'
import type { LoadPlan, Placement, Vec3 } from '../lib/loadPacker'
import type { Kantenform, Vehicle } from '../types/vehicle'

const now = '2026-09-18T00:00:00.000Z'

const auto = (kanten?: Kantenform[], hindernis?: boolean): Vehicle => ({
  id: 'v1',
  name: 'Sprinter',
  kind: 'transporter',
  cargoMm: { lengthMm: 4000, widthMm: 1800, heightMm: 2000 },
  kanten,
  obstructions: hindernis
    ? [{ name: 'Radkasten', kind: 'radkasten' as const, originMm: { x: 0, y: 0, z: 2000 }, sizeMm: { x: 300, y: 400, z: 600 } }]
    : [],
  createdAt: now,
  updatedAt: now,
})

const stueck = (
  id: string,
  position: Vec3,
  size: Vec3 = { x: 600, y: 400, z: 400 },
  verankert = false,
): Placement => ({
  stueckId: id,
  label: id.toUpperCase(),
  position,
  sizeMm: size,
  lage: 'upright',
  imRaster: false,
  verankert,
  ladeSchritt: 1,
})

const plan = (...placements: Placement[]): LoadPlan => ({
  placements,
  unplaced: [],
  befunde: [],
  gesetztKg: 0,
  ohneGewicht: 0,
})

describe('platzUrteil', () => {
  it('lässt eine Lage im freien Raum zu', () => {
    const p = plan(stueck('a', { x: 100, y: 0, z: 100 }))
    expect(platzUrteil(auto(), p, 'a', { x: 200, y: 0, z: 300 })).toEqual({ gueltig: true })
  })

  it('nennt „raus", wenn das Stück über die Wand hinausragt', () => {
    const p = plan(stueck('a', { x: 100, y: 0, z: 100 }))
    const u = platzUrteil(auto(), p, 'a', { x: 1500, y: 0, z: 300 })
    expect(u.gueltig).toBe(false)
    expect(u.grund).toBe('raus')
  })

  it('nennt „raumform", wo der Laderaum gerundet ist', () => {
    // Die Dachkante rechts, gerundet — auf Bodenhöhe ist dort nichts weg,
    // also wird oben geprüft: ein Stück, das bis unter die Decke reicht.
    const rundung: Kantenform = {
      achse: 'z',
      seiten: ['max', 'max'],
      art: 'rundung',
      aMm: 400,
      bMm: 400,
    }
    const hoch = { x: 600, y: 2000, z: 400 }
    const p = plan(stueck('a', { x: 0, y: 0, z: 100 }, hoch))
    const u = platzUrteil(auto([rundung]), p, 'a', { x: 1200, y: 0, z: 300 })
    expect(u.gueltig).toBe(false)
    expect(u.grund).toBe('raumform')
  })

  it('nennt „belegt" und WOMIT, wenn dort ein VERANKERTES Stück steht', () => {
    const fest = stueck('b', { x: 800, y: 0, z: 0 }, { x: 600, y: 400, z: 400 }, true)
    const p = plan(stueck('a', { x: 0, y: 0, z: 0 }), fest)
    const u = platzUrteil(auto(), p, 'a', { x: 700, y: 0, z: 0 })
    expect(u.gueltig).toBe(false)
    expect(u.grund).toBe('belegt')
    expect(u.mit).toBe('B')
  })

  it('lässt die Lage zu, wo nur ein Vorschlag des Packers liegt — und sagt es', () => {
    // Gemessen am 2026-09-18: hier stand rot „steht schon dort", und nach dem
    // Loslassen stand beides ordentlich nebeneinander. Der Packer rückt, was
    // er selbst gesetzt hat.
    const p = plan(stueck('a', { x: 0, y: 0, z: 0 }), stueck('b', { x: 800, y: 0, z: 0 }))
    const u = platzUrteil(auto(), p, 'a', { x: 700, y: 0, z: 0 })
    expect(u.gueltig).toBe(true)
    expect(u.grund).toBe('weicht')
    expect(u.mit).toBe('B')
  })

  it('nimmt das Verankerte, wenn beides im Weg liegt', () => {
    const p = plan(
      stueck('a', { x: 0, y: 0, z: 0 }),
      stueck('lose', { x: 700, y: 0, z: 0 }),
      stueck('fest', { x: 750, y: 0, z: 0 }, { x: 600, y: 400, z: 400 }, true),
    )
    const u = platzUrteil(auto(), p, 'a', { x: 700, y: 0, z: 0 })
    expect(u.grund).toBe('belegt')
    expect(u.mit).toBe('FEST')
  })

  it('zählt ein Hindernis wie ein Stück und nennt es beim Namen', () => {
    const p = plan(stueck('a', { x: 0, y: 0, z: 0 }))
    const u = platzUrteil(auto(undefined, true), p, 'a', { x: 100, y: 0, z: 2200 })
    expect(u.grund).toBe('belegt')
    expect(u.mit).toBe('Radkasten')
  })

  it('meldet „raus" zuerst, auch wenn zusätzlich etwas dort steht', () => {
    // Beide Gründe treffen zu. Der Mensch soll den lesen, der ihn zuerst
    // weiterbringt — die Kiste muss ohnehin zurück ins Fahrzeug.
    const p = plan(
      stueck('a', { x: 0, y: 0, z: 0 }),
      stueck('b', { x: 1400, y: 0, z: 0 }, { x: 600, y: 400, z: 400 }, true),
    )
    const u = platzUrteil(auto(), p, 'a', { x: 1500, y: 0, z: 0 })
    expect(u.grund).toBe('raus')
  })

  it('kennt ein Stück nicht, das gar nicht im Plan steht', () => {
    const u = platzUrteil(auto(), plan(), 'weg', { x: 0, y: 0, z: 0 })
    expect(u.gueltig).toBe(false)
  })
})

describe('platzUrteilText', () => {
  it('schweigt zu einer gültigen Lage', () => {
    expect(platzUrteilText({ gueltig: true })).toBe('')
  })

  it('setzt den Namen dessen ein, was im Weg steht', () => {
    expect(platzUrteilText({ gueltig: false, grund: 'belegt', mit: 'Case 4' })).toContain('Case 4')
  })

  it('unterscheidet die Gründe im Wortlaut', () => {
    const saetze = (['raus', 'raumform', 'belegt'] as const).map((grund) =>
      platzUrteilText({ gueltig: false, grund, mit: 'X' }),
    )
    expect(new Set(saetze).size).toBe(3)
    expect(saetze.every((s) => s.length > 0)).toBe(true)
  })

  it('sagt auch zur gültigen Lage etwas, wenn etwas zur Seite rückt', () => {
    const satz = platzUrteilText({ gueltig: true, grund: 'weicht', mit: 'Case 4' })
    expect(satz).toContain('Case 4')
  })
})
