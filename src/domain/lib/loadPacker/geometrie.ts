// ───────────────────────────────────────────────────────────────────────────
// Geometrie des Packers: Quader, Überlapp, Auflage, Absetzpunkte (#20).
//
// ACHSPARALLELE HÜLLQUADER, KEINE NETZ-KOLLISION. Ein Peli-Case ist innerhalb
// seiner Hülle ohnehin ein Quader, und kein kommerzielles Werkzeug rechnet
// hier mit Netzen. Ein Stativ oder ein Traversenstück wird über die ERLAUBTEN
// LAGEN gelöst und nicht über Geometrie — das ist der Unterschied zwischen
// „passt schräg irgendwie" und einer Aussage, der eine Crew folgen kann.
//
// REIN: keine Uhr, kein Store, kein Zufall ohne Seed.
// ───────────────────────────────────────────────────────────────────────────

import type { CaseOrientation, TransportSpec } from '../../types/transport'
import type { Quader, Vec3 } from './typen'

/** Millimeter-genau und ohne Fliesskomma-Rest. */
export const rundeMm = (n: number): number => Math.round(n)

export const quader = (origin: Vec3, size: Vec3): Quader => ({ origin, size })

const maxOf = (q: Quader): Vec3 => ({
  x: q.origin.x + q.size.x,
  y: q.origin.y + q.size.y,
  z: q.origin.z + q.size.z,
})

/**
 * Überlappen sich zwei Quader ECHT?
 *
 * Berührung zählt NICHT als Überlapp — zwei Kisten, die aneinanderstehen,
 * teilen sich eine Fläche und kein Volumen. Ohne diese Unterscheidung könnte
 * der Packer nichts nebeneinanderstellen.
 */
export function ueberlappt(a: Quader, b: Quader): boolean {
  const am = maxOf(a)
  const bm = maxOf(b)
  return a.origin.x < bm.x && b.origin.x < am.x &&
    a.origin.y < bm.y && b.origin.y < am.y &&
    a.origin.z < bm.z && b.origin.z < am.z
}

/** Liegt `a` vollständig in `raum`? */
export function liegtInnerhalb(a: Quader, raum: Vec3): boolean {
  const am = maxOf(a)
  return a.origin.x >= 0 && a.origin.y >= 0 && a.origin.z >= 0 &&
    am.x <= raum.x && am.y <= raum.y && am.z <= raum.z
}

/** Die überdeckte Fläche zweier Grundrisse in der x/z-Ebene, in mm². */
function grundflaechenSchnitt(a: Quader, b: Quader): number {
  const am = maxOf(a)
  const bm = maxOf(b)
  const dx = Math.min(am.x, bm.x) - Math.max(a.origin.x, b.origin.x)
  const dz = Math.min(am.z, bm.z) - Math.max(a.origin.z, b.origin.z)
  return dx > 0 && dz > 0 ? dx * dz : 0
}

/**
 * Welcher Anteil der Grundfläche von `kandidat` ist unterstützt?
 *
 * Unterstützt heisst: darunter liegt der Boden (y = 0) oder die Oberkante
 * eines anderen Quaders auf GENAU dieser Höhe. „Ungefähr auf dieser Höhe"
 * gibt es nicht — eine Kiste, die 3 mm über der anderen schwebt, schwebt.
 *
 * Der Rückgabewert ist ein Anteil von 0 bis 1 und keine Ja/Nein-Antwort: die
 * Schwelle ist eine Einstellung (`mindestStuetzung`) und gehört nicht hierher.
 */
export function stuetzAnteil(kandidat: Quader, belegt: readonly Quader[]): number {
  const flaeche = kandidat.size.x * kandidat.size.z
  if (flaeche <= 0) return 0
  if (kandidat.origin.y === 0) return 1

  let getragen = 0
  for (const b of belegt) {
    if (b.origin.y + b.size.y !== kandidat.origin.y) continue
    getragen += grundflaechenSchnitt(kandidat, b)
  }
  // Mehr als die eigene Fläche kann nicht getragen werden; überlappende
  // Träger würden sonst über 1 summieren.
  return Math.min(1, getragen / flaeche)
}

/**
 * Die Kantenlängen eines Stücks in einer Lage.
 *
 * `upright`  wie gemessen.
 * `onSide`   auf die Seite gelegt — Breite und Höhe tauschen.
 * `onEnd`    auf das Ende gestellt — Höhe und Tiefe tauschen.
 *
 * Die Namen und ihre Bedeutung kommen aus `silhouette()` in `laderaum.ts`;
 * sie stehen hier ein zweites Mal, weil dort nur die Silhouette für die
 * Öffnung gebraucht wird und hier der ganze Quader.
 */
export function masseInLage(size: Vec3, lage: CaseOrientation): Vec3 {
  if (lage === 'onSide') return { x: size.y, y: size.x, z: size.z }
  if (lage === 'onEnd') return { x: size.x, y: size.z, z: size.y }
  return { ...size }
}

/**
 * Die Höhe, die eine Kiste in dieser Lage WIRKLICH aufbaut.
 *
 * Gekippt stehen die Rollen nicht mehr unten — dieselbe Regel, die
 * `stapeln.ts` in `hoeheInLage()` führt, und aus demselben Grund: wer die
 * Rollenhöhe mitrechnet, obwohl das Case auf der Seite liegt, plant den
 * Stapel zu hoch und bekommt ihn nicht mehr unter die Decke.
 */
export function bauhoehe(size: Vec3, lage: CaseOrientation, transport?: TransportSpec): number {
  const masse = masseInLage(size, lage)
  const rollen = transport?.castors
  if (lage === 'upright' && rollen && !rollen.includedInHeightMm) return masse.y + rollen.heightMm
  return masse.y
}

/** Die erlaubten Lagen eines Stücks. Fehlt die Angabe, gilt nur aufrecht. */
export function erlaubteLagen(transport?: TransportSpec): CaseOrientation[] {
  const lagen = transport?.orientations
  if (!lagen || lagen.length === 0) return ['upright']
  return [...lagen]
}

/**
 * Absetzpunkte nach der Extreme-Point-Heuristik.
 *
 * Jedes gesetzte Stück erzeugt drei neue Kandidaten: rechts daneben, darauf,
 * und dahinter. Der Packer probiert NUR diese Punkte statt eines Gitters über
 * den ganzen Raum — das ist der Stand der Technik für Container Loading mit
 * Randbedingungen (Crainic/Perboli/Tadei) und kommt ohne feine
 * Diskretisierung aus, die bei einem 13-m-Auflieger in Millimetern sonst
 * Milliarden Punkte wären.
 *
 * Die Punkte sind SORTIERT und die Sortierung ist Teil der Zusage: derselbe
 * Bestand muss denselben Plan ergeben (#20, „deterministisch"). Eine Crew
 * vertraut keinem Plan, der sich bei jedem Klick anders anordnet.
 */
export function absetzPunkte(
  belegt: readonly Quader[],
  raum: Vec3,
  einzuege: { x: readonly number[]; z: readonly number[] } = { x: [], z: [] },
): Vec3[] {
  const punkte: Vec3[] = [{ x: 0, y: 0, z: 0 }]
  for (const q of belegt) {
    const m = maxOf(q)
    punkte.push({ x: m.x, y: q.origin.y, z: q.origin.z })
    punkte.push({ x: q.origin.x, y: m.y, z: q.origin.z })
    punkte.push({ x: q.origin.x, y: q.origin.y, z: m.z })
  }

  // EINGERÜCKTE STARTPUNKTE, wenn der Raum an der Wand gebrochen oder
  // gerundet ist. An einer runden unteren Kante ist der Ursprung kein Platz
  // mehr, und ein Stück, das 60 mm weiter innen bequem stünde, fiele durch:
  // die Heuristik kennt den Punkt nicht, an dem die Wand wieder senkrecht
  // wird. Er wird ihr gegeben — geprüft wird er ohnehin wie jeder andere.
  if (einzuege.x.length > 0 || einzuege.z.length > 0) {
    for (const p of [...punkte]) {
      for (const dx of [0, ...einzuege.x]) {
        for (const dz of [0, ...einzuege.z]) {
          if (dx === 0 && dz === 0) continue
          if (p.x === 0 || p.z === 0) {
            punkte.push({ x: p.x === 0 ? dx : p.x, y: p.y, z: p.z === 0 ? dz : p.z })
          }
        }
      }
    }
  }
  const gesehen = new Set<string>()
  return punkte
    .filter((p) => p.x >= 0 && p.y >= 0 && p.z >= 0 && p.x < raum.x && p.y < raum.y && p.z < raum.z)
    .filter((p) => {
      const key = `${p.x}|${p.y}|${p.z}`
      if (gesehen.has(key)) return false
      gesehen.add(key)
      return true
    })
    .sort((a, b) => a.y - b.y || a.z - b.z || a.x - b.x)
}
