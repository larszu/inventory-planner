// ───────────────────────────────────────────────────────────────────────────
// Einbauten des Fahrzeugs — prüfen, und was sie eine geplante Ladung kosten.
//
// Zwei Aussagen tragen diese Datei:
//
//  * Die Prüfung MELDET und verbietet nicht. Ein Aufbau darf an der Öffnung
//    überstehen, und wer gerade misst, hat Zwischenstände.
//  * Gezählt werden nur die VERANKERTEN. Was der Packer gesetzt hat, ist ein
//    Vorschlag; dass er sich ändert, ist keine Nachricht.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import {
  betroffenText,
  hindernisBefunde,
  radkastenPaar,
  verankerteAusLadungen,
  verankerteAusPlan,
  verankerteBetroffen,
} from '../lib/hindernisse'
import type { LoadPlan, Placement } from '../lib/loadPacker'
import type { CargoObstruction, Vehicle } from '../types/vehicle'

const now = '2026-09-19T00:00:00.000Z'

const fahrzeug = (over: Partial<Vehicle> = {}) =>
  ({
    cargoMm: { lengthMm: 3000, widthMm: 1700, heightMm: 1800 },
    obstructions: [],
    ...over,
  }) as Vehicle

const einbau = (over: Partial<CargoObstruction> = {}): CargoObstruction => ({
  name: 'Radkasten links',
  kind: 'radkasten',
  originMm: { x: 0, y: 0, z: 1000 },
  sizeMm: { x: 300, y: 350, z: 800 },
  ...over,
})

const platz = (over: Partial<Placement> = {}): Placement =>
  ({
    stueckId: 's1',
    label: 'Amp-Rack',
    position: { x: 500, y: 0, z: 100 },
    sizeMm: { x: 600, y: 600, z: 600 },
    lage: 'aufrecht',
    verankert: true,
    ladeSchritt: 1,
    ...over,
  }) as Placement

const plan = (placements: Placement[]): LoadPlan =>
  ({ placements, unplaced: [], befunde: [] }) as unknown as LoadPlan

describe('hindernisBefunde', () => {
  it('sagt nichts zu einem sauberen Einbau', () => {
    expect(hindernisBefunde(fahrzeug(), einbau(), [])).toEqual([])
  })

  it('meldet einen Einbau ohne Namen', () => {
    const b = hindernisBefunde(fahrzeug(), einbau({ name: '  ' }), [])
    expect(b.map((x) => x.art)).toContain('ohne-namen')
  })

  it('meldet einen Einbau ohne Masse und hoert dann auf', () => {
    // Ohne Masse haben die uebrigen Pruefungen keine Aussage.
    const b = hindernisBefunde(fahrzeug(), einbau({ sizeMm: { x: 0, y: 350, z: 800 } }), [])
    expect(b).toHaveLength(1)
    expect(b[0]!.art).toBe('ohne-masse')
  })

  it('meldet, was aus dem Laderaum ragt', () => {
    const b = hindernisBefunde(fahrzeug(), einbau({ sizeMm: { x: 300, y: 350, z: 4000 } }), [])
    expect(b.map((x) => x.art)).toContain('ragt-hinaus')
    // Mit den Massen des Raums im Satz — sonst muss jemand nachschlagen.
    expect(b[0]!.text).toContain('3000')
  })

  it('meldet eine Ueberschneidung mit einem anderen Einbau', () => {
    const b = hindernisBefunde(fahrzeug(), einbau(), [einbau({ name: 'Ersatzrad' })])
    expect(b.map((x) => x.art)).toContain('ueberschneidet')
    expect(b.find((x) => x.art === 'ueberschneidet')!.text).toContain('Ersatzrad')
  })

  it('haelt zwei Einbauten nebeneinander fuer in Ordnung', () => {
    const rechts = einbau({ name: 'Radkasten rechts', originMm: { x: 1400, y: 0, z: 1000 } })
    expect(hindernisBefunde(fahrzeug(), rechts, [einbau()])).toEqual([])
  })

  it('MELDET und verbietet nicht', () => {
    // Die Befunde sind Text und kein Ergebnis „abgelehnt". Wer gerade misst,
    // hat Zwischenstaende.
    const b = hindernisBefunde(fahrzeug(), einbau({ sizeMm: { x: 300, y: 350, z: 4000 } }), [])
    expect(b.every((x) => typeof x.text === 'string' && x.text.length > 0)).toBe(true)
  })
})

describe('verankerteBetroffen', () => {
  it('meldet ein verankertes Stueck, das nicht mehr hineinpasst', () => {
    const p = plan([platz({ position: { x: 500, y: 0, z: 2600 } })])
    const kuerzer = fahrzeug({ cargoMm: { lengthMm: 2000, widthMm: 1700, heightMm: 1800 } })
    const b = verankerteBetroffen(kuerzer, verankerteAusPlan(p))
    expect(b).toHaveLength(1)
    expect(b[0]!.grund).toBe('raus')
    expect(betroffenText(b[0]!)).toContain('Amp-Rack')
  })

  it('meldet ein verankertes Stueck im neuen Einbau', () => {
    const p = plan([platz({ position: { x: 0, y: 0, z: 1000 } })])
    const mitKasten = fahrzeug({ obstructions: [einbau()] })
    const b = verankerteBetroffen(mitKasten, verankerteAusPlan(p))
    expect(b[0]!.grund).toBe('im-einbau')
    expect(b[0]!.mit).toBe('Radkasten links')
    expect(betroffenText(b[0]!)).toContain('Radkasten links')
  })

  it('laesst NICHT verankerte Stuecke aussen vor', () => {
    // Der Packer setzt sie beim naechsten Lauf ohnehin neu. Dass sie sich
    // aendern, ist keine Nachricht.
    const p = plan([platz({ verankert: false, position: { x: 0, y: 0, z: 1000 } })])
    expect(verankerteBetroffen(fahrzeug({ obstructions: [einbau()] }), verankerteAusPlan(p))).toEqual([])
  })

  it('sagt nichts, wenn alles weiter passt', () => {
    expect(verankerteBetroffen(fahrzeug(), verankerteAusPlan(plan([platz()])))).toEqual([])
  })

  it('kommt ohne Plan zurecht', () => {
    expect(verankerteBetroffen(fahrzeug(), verankerteAusPlan(null))).toEqual([])
  })

  it('liest die Verankerten aus den Ladungen, ohne den Packer zu rufen', () => {
    // Ein verankertes Stueck traegt seine Lage selbst — es braucht keine
    // Rechnung, um zu wissen, wo es steht.
    const ladungen = [
      {
        id: 'l1',
        name: 'Show',
        vehicleId: 'v1',
        stuecke: [
          {
            id: 's1',
            label: 'Amp-Rack',
            herkunft: 'csv' as const,
            quantity: 1,
            dimensions: { widthMm: 600, heightMm: 600, depthMm: 600 },
            fixiert: { position: { x: 0, y: 0, z: 2800 }, lage: 'aufrecht' as const },
          },
          // Ohne `fixiert`: der Packer setzt es neu, es zaehlt nicht.
          { id: 's2', label: 'Kiste', herkunft: 'csv' as const, quantity: 1,
            dimensions: { widthMm: 400, heightMm: 400, depthMm: 400 } },
        ],
        createdAt: now,
        updatedAt: now,
      },
      // Eine Ladung in einem ANDEREN Fahrzeug geht uns nichts an.
      { id: 'l2', name: 'Andere', vehicleId: 'v2', stuecke: [], createdAt: now, updatedAt: now },
    ] as unknown as Parameters<typeof verankerteAusLadungen>[0]

    const verankerte = verankerteAusLadungen(ladungen, 'v1')
    expect(verankerte).toHaveLength(1)
    expect(verankerte[0]!.label).toBe('Amp-Rack')

    const kuerzer = fahrzeug({ cargoMm: { lengthMm: 2000, widthMm: 1700, heightMm: 1800 } })
    expect(verankerteBetroffen(kuerzer, verankerte)[0]!.grund).toBe('raus')
  })
})

describe('radkastenPaar', () => {
  const masse = { breiteMm: 295, laengeMm: 772, hoeheMm: 350 }

  it('setzt links an die Wand und rechts an die andere', () => {
    const [links, rechts] = radkastenPaar(fahrzeug(), masse, 1000, 'Radkasten')
    expect(links!.originMm).toEqual({ x: 0, y: 0, z: 1000 })
    expect(rechts!.originMm.x).toBe(1700 - 295)
    expect(rechts!.originMm.z).toBe(1000)
  })

  it('setzt beide auf den Boden', () => {
    // Ein Radkasten, der in der Luft haengt, ist keiner.
    for (const h of radkastenPaar(fahrzeug(), masse, 1000, 'Radkasten')) {
      expect(h.originMm.y).toBe(0)
    }
  })

  it('benennt die Seiten', () => {
    const [links, rechts] = radkastenPaar(fahrzeug(), masse, 1000, 'Radkasten')
    expect(links!.name).toBe('Radkasten left')
    expect(rechts!.name).toBe('Radkasten right')
  })

  it('kommt ohne Namen aus, ohne einen zu erfinden', () => {
    const [links] = radkastenPaar(fahrzeug(), masse, 1000, '  ')
    expect(links!.name).toBe('left')
  })

  it('traegt die Art, damit die Ansicht ihn als Radkasten zeichnet', () => {
    expect(radkastenPaar(fahrzeug(), masse, 1000, 'X').every((h) => h.kind === 'radkasten')).toBe(true)
  })

  it('kippt bei einem schmalen Raum nicht ins Negative', () => {
    const schmal = fahrzeug({ cargoMm: { lengthMm: 3000, widthMm: 200, heightMm: 1800 } })
    expect(radkastenPaar(schmal, masse, 1000, 'X')[1]!.originMm.x).toBe(0)
  })
})
