// ───────────────────────────────────────────────────────────────────────────
// Was am Dock an der Bordwand hängt (#25).
//
// GEPRÜFT WIRD DER INHALT, NICHT DAS AUSSEHEN. Ob ein Blatt schön ist, sagt
// kein Test; ob ein Stück darauf FEHLT, sagt er sehr wohl — und das ist der
// Fehler, der am Dock zählt. Drei Zusicherungen tragen diese Datei:
//
//   1. Jedes gesetzte Stück steht auf jedem Blatt, das es führen soll.
//   2. Was nicht eingeplant wurde, steht MIT GRUND drauf — nicht nur im
//      Werkzeug. Wer am Dock ein Case vermisst, soll auf dem Papier lesen,
//      warum, statt es im Lager zu suchen.
//   3. Die Rückladeliste ist dieselbe Liste rückwärts und keine zweite.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import {
  buildCaseEtikettenHtml,
  buildDockListeHtml,
  buildLadeplanHtml,
  inLadereihenfolge,
  lagen,
  ladungTabelle,
} from '../lib/ladeplanBlatt'
import { packe } from '../lib/loadPacker'
import type { PackStueck } from '../lib/loadPacker'
import type { Vehicle } from '../types/vehicle'

const now = '2026-09-18T00:00:00.000Z'

const auto = (): Vehicle => ({
  id: 'v1',
  name: 'Sprinter L2',
  kind: 'transporter',
  cargoMm: { lengthMm: 3200, widthMm: 1700, heightMm: 1900 },
  obstructions: [],
  nutzlastKg: 1200,
  createdAt: now,
  updatedAt: now,
})

const stueck = (id: string, gruppe?: string, kg?: number): PackStueck => ({
  id,
  label: id,
  sizeMm: { x: 600, y: 600, z: 600 },
  gruppe,
  weightKg: kg,
})

const plan = () =>
  packe(auto(), [
    stueck('FOH-Case', 'Ton', 110),
    stueck('Dimmer', 'Licht', 80),
    stueck('Podest', 'Bühne', 60),
    // Passt in kein Fahrzeug dieser Grösse — es MUSS als „nicht eingeplant"
    // auf jedem Blatt auftauchen.
    { id: 'Truss', label: 'Truss 6 m', sizeMm: { x: 300, y: 300, z: 6000 } },
  ])

describe('das Bild', () => {
  it('führt jedes gesetzte Stück mit seiner Nummer', () => {
    const p = plan()
    const html = buildLadeplanHtml('Sommershow', auto(), p, ['Ton', 'Licht', 'Bühne'])
    for (const stelle of p.placements) {
      expect(html).toContain(`>${stelle.ladeSchritt}</text>`)
    }
  })

  it('nennt das nicht eingeplante Stück MIT Grund', () => {
    const p = plan()
    const html = buildLadeplanHtml('Sommershow', auto(), p, [])
    expect(html).toContain('Truss 6 m')
    expect(html).toContain(p.unplaced[0]!.text)
  })

  it('zeichnet den Umriss und nicht das Rechteck', () => {
    // Ein gefaster Laderaum hat mehr als vier Ecken. Ein `<rect>` als Raum
    // zeigte Platz, den es dort nicht gibt.
    const gefast: Vehicle = {
      ...auto(),
      kanten: [{ achse: 'y', seiten: ['min', 'max'], art: 'fase', aMm: 400, bMm: 500 }],
    }
    const html = buildLadeplanHtml('Sommershow', gefast, packe(gefast, [stueck('a')]), [])
    const punkte = html.match(/<polygon points="([^"]+)"/)?.[1] ?? ''
    expect(punkte.split(' ').length).toBeGreaterThan(4)
  })

  it('trägt Fahrzeug, Gewicht und den Haftungshinweis', () => {
    const html = buildLadeplanHtml('Sommershow', auto(), plan(), [], '18.09.2026')
    expect(html).toContain('Sprinter L2')
    expect(html).toContain('250 kg')
    expect(html).toContain('18.09.2026')
    expect(html).toContain('no clearance')
  })
})

describe('die Dock-Liste', () => {
  it('führt die Stücke in Ladereihenfolge', () => {
    const p = plan()
    const html = buildDockListeHtml('Sommershow', auto(), p)
    const reihe = inLadereihenfolge(p).map((x) => html.indexOf(`>${x.label}</td>`))
    expect(reihe).toEqual([...reihe].sort((a, b) => a - b))
    expect(reihe.every((i) => i >= 0)).toBe(true)
  })

  it('ist dieselbe Liste noch einmal rückwärts', () => {
    const p = plan()
    const html = buildDockListeHtml('Sommershow', auto(), p)
    // Jedes Stück steht zweimal: einmal vorwärts, einmal rückwärts.
    for (const stelle of p.placements) {
      const treffer = html.split(`>${stelle.label}</td>`).length - 1
      expect(treffer).toBe(2)
    }
  })

  it('gibt jedem Stück ein Kästchen zum Abhaken', () => {
    const p = plan()
    const html = buildDockListeHtml('Sommershow', auto(), p)
    expect(html.split('class="kasten"').length - 1).toBe(p.placements.length * 2)
  })

  it('nennt auch hier, was nicht eingeplant wurde', () => {
    const html = buildDockListeHtml('Sommershow', auto(), plan())
    expect(html).toContain('Truss 6 m')
  })
})

describe('die Case-Etiketten', () => {
  it('geben jedem gesetzten Stück ein Etikett', () => {
    const p = plan()
    const html = buildCaseEtikettenHtml('Sommershow', p)
    expect(html.split('class="etikett"').length - 1).toBe(p.placements.length)
  })

  it('sagen es, statt einen leeren Bogen zu drucken', () => {
    const leer = packe(auto(), [])
    expect(buildCaseEtikettenHtml('Sommershow', leer)).toContain('nothing to label')
  })
})

describe('die Tabelle', () => {
  it('führt die nicht eingeplanten Stücke MIT', () => {
    const p = plan()
    const { rows } = ladungTabelle(p)
    expect(rows).toHaveLength(p.placements.length + p.unplaced.length)
    expect(rows.some((r) => r[1] === 'Truss 6 m')).toBe(true)
  })

  it('lässt das Gewicht leer, statt eine Null zu erfinden', () => {
    const { headers, rows } = ladungTabelle(packe(auto(), [stueck('ohne')]))
    expect(headers).toHaveLength(rows[0]!.length)
    expect(rows[0]![3]).toBe('')
  })
})

describe('lagen', () => {
  it('sortiert von unten nach oben', () => {
    const viele = Array.from({ length: 12 }, (_, i) => stueck(`s${i}`, 'Ton', 10))
    const hoehen = lagen(packe(auto(), viele)).map((l) => l.yMm)
    expect(hoehen).toEqual([...hoehen].sort((a, b) => a - b))
    expect(hoehen[0]).toBe(0)
  })
})
