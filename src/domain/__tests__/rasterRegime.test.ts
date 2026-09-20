// ───────────────────────────────────────────────────────────────────────────
// Das Raster ist ein FILTER und kein zweiter Solver (#21).
//
// ─── DIE AUSSAGE, DIE DIESE DATEI TRÄGT ────────────────────────────────────
//
// Derselbe Kern beantwortet beide Läufe. Kollision, Stützfläche,
// Stapelregeln und Öffnung gelten im Raster genau wie frei; das Raster nimmt
// nur Kandidatenpositionen weg. Gäbe es zwei Antworten auf die Frage, ob
// etwas passt, hätte dieses Werkzeug zwei Wahrheiten über denselben
// Laderaum.
//
// ─── UND WAS DER VERGLEICH WIRKLICH ZEIGT ──────────────────────────────────
//
// Beide Läufe liefern GÜLTIGE Pläne — das ist die Zusicherung. Der freie
// Lauf packt dabei mindestens so dicht wie der Raster-Lauf: ein Filter kann
// keine Plätze hinzufügen. Wer trotzdem das Raster fährt, kauft die Dichte
// gegen die Reihe ein, und das ist der Handel, um den es in #21 geht — die
// Crew lädt Reihen ab, keine optimal verkeilte Wand.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { packe } from '../lib/loadPacker'
import type { LoadPlan, PackStueck } from '../lib/loadPacker'
import { rasterVon, vorgabeRasterMm, type Vehicle } from '../types/vehicle'

const now = '2026-09-18T00:00:00.000Z'

/** Ein LKW mit 2,40 m Ladebreite — die Breite, auf die das Packmass zählt. */
const lkw = (patch: Partial<Vehicle> = {}): Vehicle => ({
  id: 'v1',
  name: '7,5-Tonner',
  kind: 'lkw75',
  cargoMm: { lengthMm: 6000, widthMm: 2400, heightMm: 2300 },
  obstructions: [],
  createdAt: now,
  updatedAt: now,
  ...patch,
})

/** Packmass-Cases: 1200 × 600 und 1200 × 800, plus krumme Stücke. */
const packmass = (id: string, x: number, z: number, y = 600): PackStueck => ({
  id,
  label: id,
  sizeMm: { x, y, z },
  weightKg: 40,
})

const ladung: PackStueck[] = [
  ...Array.from({ length: 6 }, (_, i) => packmass(`p${i}`, 600, 1200)),
  ...Array.from({ length: 3 }, (_, i) => packmass(`q${i}`, 800, 1200)),
  // Krumm: 430 × 970 ist kein Vielfaches von 600 und gehört in die Reste.
  ...Array.from({ length: 4 }, (_, i) => packmass(`k${i}`, 430, 970)),
]

/** Steht jedes Stück im Raum und keines im anderen? */
const gueltig = (plan: LoadPlan, v: Vehicle): boolean => {
  const raum = { x: v.cargoMm.widthMm, y: v.cargoMm.heightMm, z: v.cargoMm.lengthMm }
  for (const p of plan.placements) {
    if (p.position.x < 0 || p.position.z < 0 || p.position.y < 0) return false
    if (p.position.x + p.sizeMm.x > raum.x) return false
    if (p.position.y + p.sizeMm.y > raum.y) return false
    if (p.position.z + p.sizeMm.z > raum.z) return false
  }
  for (const a of plan.placements) {
    for (const b of plan.placements) {
      if (a.stueckId >= b.stueckId) continue
      const ueber =
        a.position.x < b.position.x + b.sizeMm.x &&
        b.position.x < a.position.x + a.sizeMm.x &&
        a.position.y < b.position.y + b.sizeMm.y &&
        b.position.y < a.position.y + a.sizeMm.y &&
        a.position.z < b.position.z + b.sizeMm.z &&
        b.position.z < a.position.z + a.sizeMm.z
      if (ueber) return false
    }
  }
  return true
}

const volumen = (plan: LoadPlan): number =>
  plan.placements.reduce((s, p) => s + p.sizeMm.x * p.sizeMm.y * p.sizeMm.z, 0)

describe('die Vorgabe je Fahrzeugklasse', () => {
  it('gibt dem LKW 600 mm und dem Transporter keines', () => {
    expect(vorgabeRasterMm('lkw75')).toBe(600)
    expect(vorgabeRasterMm('lkw12')).toBe(600)
    expect(vorgabeRasterMm('sattelzug')).toBe(600)
    expect(vorgabeRasterMm('transporter')).toBe(0)
    expect(vorgabeRasterMm('kofferraum')).toBe(0)
  })

  it('lässt sich je Fahrzeug überschreiben — auch auf „keines"', () => {
    expect(rasterVon(lkw())).toBe(600)
    expect(rasterVon(lkw({ rasterMm: 800 }))).toBe(800)
    // 0 ist eine Entscheidung und nicht „nichts eingetragen".
    expect(rasterVon(lkw({ rasterMm: 0 }))).toBe(0)
  })
})

describe('Raster und frei auf demselben Bestand', () => {
  const frei = packe(lkw(), ladung, { rasterMm: 600, rasterModus: 'frei' })
  const streng = packe(lkw(), ladung, { rasterMm: 600, rasterModus: 'raster' })
  const gemischt = packe(lkw(), ladung, { rasterMm: 600, rasterModus: 'gemischt' })

  it('liefert in allen drei Läufen einen gültigen Plan', () => {
    expect(gueltig(frei, lkw())).toBe(true)
    expect(gueltig(streng, lkw())).toBe(true)
    expect(gueltig(gemischt, lkw())).toBe(true)
  })

  it('setzt im strengen Lauf jedes Stück auf eine Rasterlinie', () => {
    expect(streng.placements.length).toBeGreaterThan(0)
    // Quer, nicht längs: die Reihe läuft durchs Fahrzeug, in der Länge
    // läuft sie durch (siehe `aufsRaster`).
    for (const p of streng.placements) {
      expect(p.position.x % 600).toBe(0)
      expect(p.imRaster).toBe(true)
    }
  })

  it('packt frei mindestens so dicht wie im Raster — ein Filter fügt nichts hinzu', () => {
    expect(volumen(frei)).toBeGreaterThanOrEqual(volumen(streng))
  })

  it('stellt im gemischten Lauf die Packmass-Cases in die Reihe und den Rest frei', () => {
    // Bei 600er Raster sind die 600 mm BREITEN die Rasterstücke. Die 800 mm
    // breiten sind es nicht: 800 liegt nicht auf einem 600er Netz, und beide
    // zusammen teilen nur 200 — ein Haus fährt das eine oder das andere
    // (siehe `vorgabeRasterMm`). Sie gehen deshalb hier in die Reste, und
    // das ist die richtige Antwort und kein Mangel des Filters.
    const packmassStuecke = gemischt.placements.filter((p) => p.stueckId.startsWith('p'))
    const krumme = gemischt.placements.filter(
      (p) => p.stueckId.startsWith('k') || p.stueckId.startsWith('q'),
    )
    expect(packmassStuecke.length).toBeGreaterThan(0)
    for (const p of packmassStuecke) {
      expect(p.imRaster).toBe(true)
      expect(p.position.x % 600).toBe(0)
    }
    // Die krummen dürfen überall stehen — und sie sagen von sich nicht, sie
    // stünden in der Reihe.
    for (const p of krumme) expect(p.imRaster).toBe(false)
  })

  it('bringt gemischt mehr unter als streng — dafür gibt es den Modus', () => {
    expect(volumen(gemischt)).toBeGreaterThanOrEqual(volumen(streng))
  })

  it('nimmt im 800er-Haus die 1200 × 800er in die Reihe', () => {
    const haus800 = packe(lkw({ rasterMm: 800 }), ladung, { rasterMm: 800, rasterModus: 'gemischt' })
    const achthunderter = haus800.placements.filter((p) => p.stueckId.startsWith('q'))
    expect(achthunderter.length).toBeGreaterThan(0)
    for (const p of achthunderter) {
      expect(p.imRaster).toBe(true)
      expect(p.position.x % 800).toBe(0)
    }
    // Und die 600er sind dort die freien — dasselbe Bild spiegelverkehrt.
    for (const p of haus800.placements.filter((x) => x.stueckId.startsWith('p'))) {
      expect(p.imRaster).toBe(false)
    }
  })

  it('behandelt „frei" wie ohne Raster, auch wenn eines eingetragen ist', () => {
    const ohne = packe(lkw(), ladung, { rasterMm: 0 })
    expect(volumen(frei)).toBe(volumen(ohne))
    expect(frei.placements.every((p) => !p.imRaster)).toBe(true)
  })
})

describe('die Regeln des Kerns gelten im Raster unverändert', () => {
  it('lässt nichts durch die zu kleine Öffnung, auch nicht auf einer Rasterlinie', () => {
    const eng = lkw({ aperture: { widthMm: 500, heightMm: 2000 } })
    const plan = packe(eng, [packmass('breit', 1200, 600)], { rasterMm: 600, rasterModus: 'raster' })
    expect(plan.placements).toHaveLength(0)
    expect(plan.unplaced[0]!.grund).toBe('passt-nicht-durch-oeffnung')
  })

  it('setzt nichts in eine gerundete Ecke, auch nicht auf einer Rasterlinie', () => {
    const rund = lkw({
      kanten: [{ achse: 'y', seiten: ['min', 'max'], art: 'fase', aMm: 700, bMm: 900 }],
    })
    const plan = packe(rund, [packmass('a', 600, 600)], { rasterMm: 600, rasterModus: 'raster' })
    for (const p of plan.placements) {
      const da = p.position.x
      const db = rund.cargoMm.lengthMm - (p.position.z + p.sizeMm.z)
      expect(da / 700 + db / 900).toBeGreaterThanOrEqual(1)
    }
  })
})
