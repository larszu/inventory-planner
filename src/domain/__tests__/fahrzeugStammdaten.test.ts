// ───────────────────────────────────────────────────────────────────────────
// Fahrzeug-Stammdaten: nichts ohne Quelle, nichts geraten (#19).
//
// DER WICHTIGSTE TEST DIESER DATEI PRÜFT EINEN LEEREN KATALOG — und das ist
// kein Leerlauf: er ist die Ratsche. Der erste Eintrag, den jemand einträgt,
// muss die Prüfung bestehen, sonst wird diese Datei rot. Ohne sie wäre der
// erste Stammdatensatz ohne Quelle einer, den niemand bemerkt.
//
// Eine geratene Nutzlast sieht im Ladeplan aus wie eine Messung — und seit
// #24 steht sie auf einem Lastverteilungsplan.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import {
  FAHRZEUG_KATALOG,
  FEHLENDE_KLASSEN,
  katalogMaengel,
  type KatalogFahrzeug,
} from '../data/fahrzeugKatalog'
import {
  ausKatalog,
  buildFahrzeugDatei,
  parseFahrzeugDatei,
  vermessen,
} from '../lib/fahrzeugStammdaten'
import type { Vehicle } from '../types/vehicle'

const eintrag = (patch: Partial<KatalogFahrzeug> = {}): KatalogFahrzeug => ({
  name: 'Sprinter L2H2',
  kind: 'transporter',
  cargoMm: { lengthMm: 3265, widthMm: 1787, heightMm: 1940 },
  obstructions: [],
  quelle: 'https://example.invalid/datenblatt.pdf',
  ...patch,
})

describe('der Katalog', () => {
  it('hat keinen Eintrag ohne Quelle', () => {
    for (const e of FAHRZEUG_KATALOG) {
      expect(katalogMaengel(e), `${e.name}: ${katalogMaengel(e).join(', ')}`).toEqual([])
    }
  })

  it('weist einen Eintrag ohne Quelle ab', () => {
    expect(katalogMaengel(eintrag({ quelle: '  ' }))).toContain('quelle')
  })

  it('weist ein Pflichtmass auf 0 ab', () => {
    const m = katalogMaengel(eintrag({ cargoMm: { lengthMm: 0, widthMm: 1787, heightMm: 1940 } }))
    expect(m).toContain('cargoMm.lengthMm')
  })

  it('weist eine Nutzlast von 0 ab — das ist keine Angabe, sondern eine fehlende', () => {
    expect(katalogMaengel(eintrag({ nutzlastKg: 0 }))).toContain('nutzlastKg')
  })

  it('lässt eine fehlende Nutzlast durch — sie fehlt eben', () => {
    expect(katalogMaengel(eintrag({ nutzlastKg: undefined }))).toEqual([])
  })

  it('weist eine Achse ohne zulässige Last ab', () => {
    const m = katalogMaengel(eintrag({ axles: [{ positionMm: 0, maxLastKg: 0 }] }))
    expect(m).toContain('axles.maxLastKg')
  })

  // ── Der Startsatz selbst (#19) ────────────────────────────────────────
  //
  // Der Katalog war bis 2026-09-22 leer, und das war eine Aussage: lieber
  // keine Zahlen als geratene. Jetzt steht etwas drin, und diese Tests
  // halten fest, WORAN man einen belegten Eintrag erkennt — nicht, dass
  // die Zahlen stimmen (das kann keine Software sagen, dafür steht die
  // Quelle da), sondern dass keiner sich als belegt ausgibt, ohne es zu
  // sein.

  it('nennt zu jedem Eintrag eine Quelle mit Fundstelle, nicht nur einen Namen', () => {
    for (const e of FAHRZEUG_KATALOG) {
      expect(e.quelle, `${e.name}`).toMatch(/https?:\/\//)
    }
  })

  it('gibt keine Nutzlast an, die im Datenblatt nicht steht', () => {
    // Die Ducato-Zeilen stammen vom Blatt „ABMESSUNGEN KASTENWAGEN"; eine
    // Nutzlast nennt es nicht. Eine aus dem zulässigen Gesamtgewicht
    // gerechnete sähe im Ladeplan aus wie eine Messung.
    for (const e of FAHRZEUG_KATALOG.filter((x) => x.name.startsWith('Fiat Ducato'))) {
      expect(e.nutzlastKg, `${e.name}`).toBeUndefined()
    }
  })

  it('führt keine Klasse als fehlend, für die es einen Eintrag gibt', () => {
    // Sonst sagt die Oberfläche „hier fehlt noch alles", während darunter
    // sechs Einträge stehen — und wer das einmal liest, sucht nicht weiter.
    for (const klasse of FEHLENDE_KLASSEN) {
      expect(
        FAHRZEUG_KATALOG.some((e) => e.kind === klasse),
        `${klasse} gilt als fehlend, hat aber Einträge`,
      ).toBe(false)
    }
  })
})

describe('ableiten', () => {
  it('übernimmt die Masse und schreibt die Herkunft um', () => {
    const v = ausKatalog(eintrag(), 'B-XY 123')
    expect(v.name).toBe('B-XY 123')
    expect(v.cargoMm).toEqual({ lengthMm: 3265, widthMm: 1787, heightMm: 1940 })
    expect(v.quelle).toContain('derived from')
    expect(v.quelle).toContain('example.invalid')
  })

  it('nimmt den Typnamen, wenn keiner gegeben ist', () => {
    expect(ausKatalog(eintrag()).name).toBe('Sprinter L2H2')
  })

  it('hängt NICHT am Katalog — das Fahrzeug bekommt eigene Objekte', () => {
    const e = eintrag({ obstructions: [{ name: 'Radkasten', kind: 'radkasten', originMm: { x: 0, y: 0, z: 0 }, sizeMm: { x: 1, y: 1, z: 1 } }] })
    const v = ausKatalog(e)
    v.cargoMm.lengthMm = 1
    v.obstructions[0]!.name = 'anders'
    expect(e.cargoMm.lengthMm).toBe(3265)
    expect(e.obstructions[0]!.name).toBe('Radkasten')
  })
})

describe('die Ausmessen-Hilfe', () => {
  it('nennt sechs Masse, jedes mit der Stelle, an der gemessen wird', () => {
    const schritte = vermessen()
    expect(schritte).toHaveLength(6)
    expect(schritte.every((s) => s.was.length > 0 && s.wo.length > 0)).toBe(true)
  })

  it('unterscheidet die beiden Breiten — daran scheitert die Palette', () => {
    const texte = vermessen().map((s) => s.was)
    expect(texte.filter((s) => s.toLowerCase().includes('width'))).toHaveLength(3)
  })
})

describe('eigene Fahrzeuge aus- und einlesen', () => {
  const fahrzeug: Vehicle = {
    id: 'v1',
    name: 'Der weisse',
    kind: 'transporter',
    cargoMm: { lengthMm: 3265, widthMm: 1787, heightMm: 1940 },
    obstructions: [],
    nutzlastKg: 1100,
    createdAt: '2026-09-18T00:00:00.000Z',
    updatedAt: '2026-09-18T00:00:00.000Z',
  }

  it('kommt unverändert zurück', () => {
    const zurueck = parseFahrzeugDatei(buildFahrzeugDatei([fahrzeug]))
    expect(zurueck).toHaveLength(1)
    expect(zurueck![0]!.name).toBe('Der weisse')
    expect(zurueck![0]!.nutzlastKg).toBe(1100)
  })

  it('weist eine fremde Datei ab, statt sie halb zu lesen', () => {
    expect(parseFahrzeugDatei('{"format":"etwas-anderes","version":1,"vehicles":[]}')).toBeNull()
    expect(parseFahrzeugDatei('kein json')).toBeNull()
  })

  it('weist eine ZU NEUE Datei ab — sie könnte Felder tragen, die hier verlorengingen', () => {
    expect(parseFahrzeugDatei('{"format":"avplan-vehicles","version":99,"vehicles":[]}')).toBeNull()
  })

  it('trägt NICHT das portable Lager-Format', () => {
    // Ein Fahrzeug ist kein Lagerbestand. `avplan-inventory` liegt byte-gleich
    // in allen Planern; es um ein Feld zu erweitern wäre ein Versionssprung
    // in allen Repos.
    expect(buildFahrzeugDatei([])).not.toContain('avplan-inventory')
  })
})
