// ───────────────────────────────────────────────────────────────────────────
// Überleben die Kanten des Laderaums das Speichern und Laden?
//
// Der fünfte Fall derselben Test-Familie — `fristen…`, `schaden…`,
// `mindestmenge…`, `ladeplan…`. `healVehicle` baut jedes Fahrzeug Feld für
// Feld neu auf, mit Absicht: so kommt nichts Unbekanntes aus einer fremden
// Datei herein. Der Preis ist, dass ein NEUES Feld dort eingetragen werden
// muss, und wer das vergisst, merkt es erst, wenn ein Laderaum nach dem
// Neustart wieder eine Schachtel ist — also dann, wenn der Plan schon
// gedruckt ist.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { healKante, healVehicle } from '../store/vehicleStore'

const roh = {
  id: 'v1',
  name: 'Sprinter',
  kind: 'transporter',
  cargoMm: { lengthMm: 4300, widthMm: 1780, heightMm: 1940 },
  kanten: [
    { achse: 'z', seiten: ['max', 'max'], art: 'rundung', aMm: 220, bMm: 260, name: 'Dachkante rechts' },
    { achse: 'y', seiten: ['min', 'max'], art: 'fase', aMm: 150, bMm: 400 },
  ],
  obstructions: [],
  createdAt: '2026-09-18T00:00:00.000Z',
  updatedAt: '2026-09-18T00:00:00.000Z',
}

describe('Die Form des Laderaums überlebt das Laden', () => {
  it('behält beide Kanten mit ihren Massen', () => {
    const v = healVehicle(roh)!
    expect(v.kanten).toHaveLength(2)
    expect(v.kanten![0]).toEqual({
      achse: 'z',
      seiten: ['max', 'max'],
      art: 'rundung',
      aMm: 220,
      bMm: 260,
      name: 'Dachkante rechts',
    })
  })

  it('lässt eine fehlende Liste fehlen, statt eine zu erfinden', () => {
    expect(healVehicle({ ...roh, kanten: undefined })!.kanten).toBeUndefined()
  })
})

describe('Was NICHT als Kante durchgeht', () => {
  // Im Zweifel bleibt die Kante scharf. Das ist die konservative Richtung:
  // eine scharfe Kante lässt höchstens Platz ungenutzt, eine halb gelesene
  // Rundung gäbe Platz frei, den es vielleicht nicht gibt.
  const k = { achse: 'z', seiten: ['max', 'max'], art: 'rundung', aMm: 200, bMm: 200 }

  it('verwirft eine unbekannte Achse oder Art', () => {
    expect(healKante({ ...k, achse: 'w' })).toBeNull()
    expect(healKante({ ...k, art: 'geschwungen' })).toBeNull()
  })

  it('verwirft eine halbe oder unsinnige Seitenangabe', () => {
    expect(healKante({ ...k, seiten: ['max'] })).toBeNull()
    expect(healKante({ ...k, seiten: ['max', 'oben'] })).toBeNull()
    expect(healKante({ ...k, seiten: 'max' })).toBeNull()
  })

  it('verwirft eine Tiefe von null oder weniger', () => {
    expect(healKante({ ...k, aMm: 0 })).toBeNull()
    expect(healKante({ ...k, bMm: -50 })).toBeNull()
    expect(healKante({ ...k, aMm: 'viel' })).toBeNull()
  })

  it('wirft die kaputte Kante aus der Liste, nicht das Fahrzeug', () => {
    const v = healVehicle({ ...roh, kanten: [...roh.kanten, { achse: 'q' }] })!
    expect(v.kanten).toHaveLength(2)
  })
})
