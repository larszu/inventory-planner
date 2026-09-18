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
// Den Quelltext, nicht das Bündel: welche Datei nennt `three` oder
// `@react-three/*` in einem statischen `import`. Ein Bündel-Test bräuchte
// einen Build und liefe deshalb nicht bei jedem `npm test`.
//
// ─── ER MASS ZUERST DEN ORDNER, JETZT DIE GRENZE (2026-09-18) ──────────────
//
// Die erste Fassung erlaubte Three genau in `ui/Ladeansicht/`. Das war
// richtig, solange es EINE 3D-Ansicht gab — der Ordner war ein Stellvertreter
// für die Grenze. Mit der zweiten (`ui/Lagerraum3D.tsx`, das Lager im Raum)
// wurde der Stellvertreter falsch: sie liegt hinter derselben `lazy()`-Grenze
// und fiel trotzdem durch, weil sie im falschen Ordner steht.
//
// Gemessen wird deshalb jetzt die Grenze selbst, und das ist die SCHÄRFERE
// Zusage: welche Dateien Three ziehen, wird nicht mehr aufgezählt, sondern
// gefunden — und JEDE davon muss über `lazy(() => import(…))` geholt werden
// und darf von niemandem statisch importiert werden. Eine dritte 3D-Ansicht
// ist damit automatisch mitgeprüft, statt eine Liste zu brauchen, auf der
// sie fehlt.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const SRC = resolve(__dirname, '..', '..')

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
  const lies = (d: string) => readFileSync(d, 'utf8')

  /** Die Dateien, die Three ziehen — gefunden, nicht aufgezählt. */
  const dreiDateien = dateien.filter((d) => statischeImporte(lies(d)).some(istThree))

  /** Der Modulname ohne Endung, so wie ein Import ihn nennt. */
  const modulName = (d: string) => relative(SRC, d).replace(/\.tsx?$/, '').split('/').pop()!

  it('es gibt überhaupt eine 3D-Ansicht', () => {
    // Die Gegenprobe zu allem Folgenden: die Verbote unten wären auch
    // erfüllt, wenn gar kein Three mehr im Repo stünde.
    expect(dreiDateien.length).toBeGreaterThan(0)
  })

  it('niemand importiert eine 3D-Ansicht statisch', () => {
    const verstoesse: string[] = []
    for (const drei of dreiDateien) {
      const name = modulName(drei)
      for (const d of dateien) {
        if (d === drei) continue
        // Eine Datei NEBEN der 3D-Ansicht im selben Ordner darf sie sehen:
        // sie liegt ohnehin schon im nachgeladenen Paket.
        if (dreiDateien.includes(d)) continue
        if (statischeImporte(lies(d)).some((p) => p.endsWith(`/${name}`) || p === `./${name}`)) {
          verstoesse.push(`${relative(SRC, d)} → ${name}`)
        }
      }
    }
    expect(verstoesse, `hebt die Lazy-Grenze auf: ${verstoesse.join(', ')}`).toEqual([])
  })

  it('jede 3D-Ansicht wird über `lazy()` geholt', () => {
    const quelle = dateien.map(lies).join('\n')
    const ohneGrenze = dreiDateien
      .map(modulName)
      // Ein Modul, das nur von einer anderen 3D-Datei benutzt wird (die
      // Beschriftung, die Kamera), braucht keine eigene Grenze — es liegt
      // schon im nachgeladenen Paket.
      .filter((name) => !dateien.some((d) => dreiDateien.includes(d) && lies(d).includes(`/${name}'`)))
      .filter((name) => !new RegExp(`lazy\\(\\(\\)\\s*=>\\s*import\\('[^']*${name}'\\)\\)`).test(quelle))

    expect(ohneGrenze, `ohne Lazy-Grenze: ${ohneGrenze.join(', ')}`).toEqual([])
  })

  it('keine 3D-Ansicht holt eine Schrift aus dem Netz', () => {
    // `<Text>` aus drei laedt ueber `troika-three-text` eine Schriftdatei,
    // wenn keine angegeben ist. Gemessen am 2026-09-18: „Failed to fetch",
    // und die Kisten blieben unbeschriftet. Das Lager steht im Keller und der
    // LKW am Dock — eine Beschriftung, die am WLAN haengt, ist schlimmer als
    // keine, weil sie erst dort fehlt, wo niemand mehr nachsehen kann.
    const verstoesse = dreiDateien
      .filter((d) => /import\s*\{[^}]*\bText\b[^}]*\}\s*from '@react-three\/drei'/.test(lies(d)))
      .map((d) => relative(SRC, d))

    expect(verstoesse, `laedt eine Schrift aus dem Netz: ${verstoesse.join(', ')}`).toEqual([])
  })
})
