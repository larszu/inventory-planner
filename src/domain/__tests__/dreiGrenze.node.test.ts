// ───────────────────────────────────────────────────────────────────────────
// Die Lazy-Grenze um Three (#23).
//
// ─── WARUM ES DAS GIBT ─────────────────────────────────────────────────────
//
// Three ist gross. Gemessen am 2026-09-18, gleich nach dem Bau der
// 3D-Ladeansicht:
//
//   dist/assets/index-….js            356 kB  (gzip 110 kB)   Start des Lagers
//   dist/assets/Ladeansicht3D-….js  1.064 kB  (gzip 293 kB)   erst auf Klick
//
// Die zweite Zahl ist DREIMAL die erste. Sie liegt nur deshalb nicht im
// Startpaket, weil `Ladeplan.tsx` die Ansicht über `lazy()` holt — und das
// hält genau so lange, bis irgendein Modul sie (oder `three` selbst)
// statisch importiert. Dann ist der ganze Gewinn weg, und zwar unbemerkt:
// die App funktioniert weiter, sie lädt nur bei jedem Start ein Megabyte mehr
// über das Hallen-WLAN.
//
// Dieselbe Falle hat `cable-planner` schon einmal erwischt (`LibraryPanel`
// importierte `RackBuilderDialog` statisch, gemessen 4.193 → 2.938 kB) — dort
// steht seither `threeBundleGrenze.test.ts`. Das hier ist sein Gegenstück.
//
// ─── WAS ER MISST ──────────────────────────────────────────────────────────
//
// Den Quelltext, nicht das Bündel: welche Datei nennt `three`,
// `@react-three/*` oder `Ladeansicht3D` in einem statischen `import`. Ein
// Bündel-Test bräuchte einen Build und liefe deshalb nicht bei jedem `npm
// test`.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const SRC = resolve(__dirname, '..', '..')

/** Der einzige Ordner, der Three sehen darf. */
const ERLAUBT = join(SRC, 'ui', 'Ladeansicht')

const alleDateien = (ordner: string, raus: string[] = []): string[] => {
  for (const eintrag of readdirSync(ordner)) {
    const pfad = join(ordner, eintrag)
    if (statSync(pfad).isDirectory()) alleDateien(pfad, raus)
    else if (/\.tsx?$/.test(eintrag)) raus.push(pfad)
  }
  return raus
}

/** Statische Importe einer Datei. `import()` als Ausdruck zählt NICHT. */
const statischeImporte = (code: string): string[] =>
  [...code.matchAll(/^\s*import\s[^\n]*?from\s+'([^']+)'/gm)].map((m) => m[1]!)

const istThree = (pfad: string): boolean =>
  pfad === 'three' || pfad.startsWith('three/') || pfad.startsWith('@react-three/')

describe('Three bleibt hinter der Lazy-Grenze', () => {
  const dateien = alleDateien(SRC)

  it('nur `ui/Ladeansicht/` importiert three statisch', () => {
    const verstoesse = dateien
      .filter((d) => !d.startsWith(ERLAUBT))
      .filter((d) => statischeImporte(readFileSync(d, 'utf8')).some(istThree))
      .map((d) => relative(SRC, d))

    expect(verstoesse, `zieht Three in den Start: ${verstoesse.join(', ')}`).toEqual([])
  })

  it('niemand importiert die 3D-Ansicht statisch', () => {
    const verstoesse = dateien
      .filter((d) => !d.startsWith(ERLAUBT))
      .filter((d) => statischeImporte(readFileSync(d, 'utf8')).some((p) => p.includes('Ladeansicht3D')))
      .map((d) => relative(SRC, d))

    expect(verstoesse, `hebt die Lazy-Grenze auf: ${verstoesse.join(', ')}`).toEqual([])
  })

  it('die 3D-Ansicht holt keine Schrift aus dem Netz', () => {
    // `<Text>` aus drei laedt ueber `troika-three-text` eine Schriftdatei,
    // wenn keine angegeben ist. Gemessen am 2026-09-18: „Failed to fetch",
    // und die Kisten blieben unbeschriftet. Das Lager steht im Keller und der
    // LKW am Dock — eine Beschriftung, die am WLAN haengt, ist schlimmer als
    // keine, weil sie erst dort fehlt, wo niemand mehr nachsehen kann.
    const verstoesse = alleDateien(ERLAUBT)
      .filter((d) => /from '@react-three\/drei'/.test(readFileSync(d, 'utf8')))
      .filter((d) => /import\s*\{[^}]*\bText\b[^}]*\}\s*from '@react-three\/drei'/.test(readFileSync(d, 'utf8')))
      .map((d) => relative(SRC, d))

    expect(verstoesse, `laedt eine Schrift aus dem Netz: ${verstoesse.join(', ')}`).toEqual([])
  })

  it('die Ansicht wird wirklich über `lazy()` geholt', () => {
    // Die Gegenprobe zu den beiden Verboten oben: sie wären auch erfüllt,
    // wenn die 3D-Ansicht gar nicht mehr eingehängt wäre.
    const plan = readFileSync(join(SRC, 'ui', 'Ladeplan.tsx'), 'utf8')
    expect(plan).toMatch(/lazy\(\(\)\s*=>\s*import\('\.\/Ladeansicht\/Ladeansicht3D'\)\)/)
  })
})
