// ───────────────────────────────────────────────────────────────────────────
// Was die Flächen der Halle über den Bestand sagen.
//
// REIN: keine Uhr, kein Store, kein IO.
// ───────────────────────────────────────────────────────────────────────────

import { format, quelle, type Uebersetzen } from '../../i18n/quelle'
import { FREI_ZU_HALTEN, type Hallenflaeche } from '../types/halle'
import type { StorageNode, StorageNodeKind, Stellplatz } from '../types/inventory'

/**
 * Arten, die eine Fläche UMSCHLIESSEN statt auf ihr zu stehen.
 *
 * Eine Halle enthält ihre Tore; ein Raum enthält seinen Verkehrsweg. Sie
 * überlappen deshalb mit allem darin — und im ersten Anlauf meldete der Plan
 * dreimal „Halle 1 steht auf Tor Nord". Eine Meldung, die immer kommt, liest
 * nach dem zweiten Mal niemand mehr; damit wäre auch die eine wertlos, die
 * stimmt.
 */
const UMSCHLIESSEND: readonly StorageNodeKind[] = ['depot', 'room']

/** Überlappen sich zwei Grundflächen? Berührung zählt nicht. */
export function flaechenUeberlapp(a: Stellplatz, b: Stellplatz): boolean {
  return (
    a.xMm < b.xMm + b.breiteMm &&
    b.xMm < a.xMm + a.breiteMm &&
    a.zMm < b.zMm + b.tiefeMm &&
    b.zMm < a.zMm + a.tiefeMm
  )
}

export interface Verstellt {
  node: StorageNode
  flaeche: Hallenflaeche
}

/**
 * Lagerorte, die auf einer Fläche stehen, die frei bleiben muss.
 *
 * GEMELDET, NICHT VERBOTEN. Beim Umbau steht das Regal im Gang, weil es
 * gerade nirgendwo anders hin kann — ein Werkzeug, das den Zwischenstand
 * verbietet, wird umgangen und weiss danach gar nichts mehr. Dieselbe
 * Haltung wie beim Laden aus der Reihe und beim doppelt vergebenen Code.
 */
export function verstellt(
  nodes: readonly StorageNode[],
  flaechen: readonly Hallenflaeche[],
): Verstellt[] {
  const heikel = flaechen.filter((f) => FREI_ZU_HALTEN.includes(f.art))
  const out: Verstellt[] = []
  for (const n of nodes) {
    if (!n.stellplatz) continue
    if (UMSCHLIESSEND.includes(n.kind)) continue
    for (const f of heikel) {
      if (flaechenUeberlapp(n.stellplatz, f.stellplatz)) out.push({ node: n, flaeche: f })
    }
  }
  return out
}

export function verstelltText(v: Verstellt, t: Uebersetzen = quelle): string {
  return format(t('area.blocked', '{node} stands on {area} — that has to stay clear.'), {
    node: v.node.name,
    area: v.flaeche.name,
  })
}

/** Das engste Tor der Halle — die Öffnung, durch die alles muss. */
export interface TorMass {
  breiteMm: number
  hoeheMm: number
  name: string
}

/**
 * Das schmalste und das niedrigste Tor, zusammengenommen.
 *
 * ZUSAMMENGENOMMEN und nicht „das engste Tor": das schmalste und das
 * niedrigste können zwei verschiedene sein, und was durch beide muss, muss
 * durch beide Masse. Das engste EINE Tor zu nennen wäre eine Auskunft über
 * ein Tor, das es so nicht gibt.
 *
 * `null`, wenn kein Tor ein lichtes Mass trägt — dann wird nicht geprüft,
 * statt eine Zahl zu erfinden.
 */
export function engstesTor(flaechen: readonly Hallenflaeche[]): TorMass | null {
  // Grösser als null und nicht bloss „gesetzt": ein lichtes Mass von 0 ist
  // kein Torblatt, sondern eine halb ausgefüllte Maske. Der Speicher wirft
  // so etwas schon beim Lesen weg — diese Funktion ist rein und traut ihrer
  // Eingabe trotzdem nicht.
  const tore = flaechen.filter(
    (f) => f.art === 'tor' && (f.lichtBreiteMm ?? 0) > 0 && (f.lichtHoeheMm ?? 0) > 0,
  )
  if (tore.length === 0) return null

  const schmal = tore.reduce((a, b) => (a.lichtBreiteMm! <= b.lichtBreiteMm! ? a : b))
  const niedrig = tore.reduce((a, b) => (a.lichtHoeheMm! <= b.lichtHoeheMm! ? a : b))
  return {
    breiteMm: schmal.lichtBreiteMm!,
    hoeheMm: niedrig.lichtHoeheMm!,
    name: schmal.id === niedrig.id ? schmal.name : `${schmal.name} / ${niedrig.name}`,
  }
}

/**
 * Passt ein Mass durch das engste Tor?
 *
 * Geprüft wird die SILHOUETTE in beiden aufrechten Lagen — hochkant und
 * quer. Ein Case wird am Tor gedreht, aber nicht gekippt: gekippt stehen
 * die Rollen nicht mehr unten, und was auf der Seite liegt, liegt beim
 * nächsten Griff auch drinnen auf der Seite.
 */
export function passtDurchTor(
  tor: TorMass,
  masse: { breiteMm: number; hoeheMm: number; tiefeMm: number },
): boolean {
  const hoch = masse.hoeheMm <= tor.hoeheMm
  if (!hoch) return false
  return masse.breiteMm <= tor.breiteMm || masse.tiefeMm <= tor.breiteMm
}
