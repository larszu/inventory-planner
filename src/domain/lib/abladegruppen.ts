// ───────────────────────────────────────────────────────────────────────────
// ABLADEGRUPPEN — die Vorgabe aus der Kategorie (#22)
//
// NUTZER-AUFTRAG (#22): „Gruppe am Stück setzbar, Vorgabe aus der
// Artikel-Kategorie ableitbar."
//
// Die Gruppe selbst gab es schon: `LadungsStueck.gruppe`, der Packer schichtet
// danach von der Öffnung nach hinten, und `reihenfolgeBefunde` sagt, was eine
// verletzte Reihenfolge kostet. Was fehlte, war der Weg dorthin — es gab keine
// Stelle, an der ein Mensch einem Stück seine Gruppe gibt, und schon gar
// keinen Vorschlag.
//
// ─── WARUM EIN VORSCHLAG UND KEINE AUTOMATIK ──────────────────────────────
//
// Die Abladereihenfolge ist eine Aussage über den AUFBAU, nicht über den
// Artikel. Dasselbe Funkmikrofon fährt an einem Tag mit dem Ton und am
// nächsten mit dem Notfallkoffer nach vorn. Eine Zuordnung, die sich aus der
// Kategorie ERGIBT, wäre also eine Behauptung über die Produktion, die dieses
// Werkzeug nicht kennt.
//
// Deshalb: die Kategorie liefert einen Vorschlag, gesetzt wird er auf Knopf-
// druck, und er fasst nur Stücke an, die noch KEINE Gruppe haben. Ein Lauf,
// der eine von Hand gesetzte Gruppe überschriebe, wäre genau der Gegner, den
// die Verankerung im Packer schon einmal verhindert hat.
//
// ─── UND WARUM KEINE „SONSTIGES"-GRUPPE ───────────────────────────────────
//
// Ein Artikel ohne Kategorie, oder mit einer, die hier nicht steht, bekommt
// KEINE Gruppe — nicht „Sonstiges". Die Hausregel dieses Repos ist „nichts
// erfinden", und eine erfundene Gruppe wäre besonders teuer: der Packer
// schichtet danach, ein Stück in einer erfundenen Gruppe läge also an einer
// erfundenen Stelle im Laderaum. Ohne Gruppe zählt es zur letzten Schicht,
// und das ist die ehrliche Vorgabe: was niemand eingeordnet hat, kommt
// zuletzt heraus.
// ───────────────────────────────────────────────────────────────────────────

import type { InventoryItem } from '../types/inventory'
import type { Ladung, LadungsStueck } from '../types/load'
import { quelle, type Uebersetzen } from '../../i18n/quelle'

/**
 * Kategorie → vorgeschlagene Abladegruppe.
 *
 * Die Kategorien sind die der Suite (`DEFAULT_CATEGORIES` im cable-planner,
 * dieselbe Taxonomie, die `InventoryItem.category` trägt). Die Gruppen sind
 * die Gewerke, in denen auf einer Produktion abgeladen wird — nicht die
 * Kategorien selbst: „Cameras", „Lenses" und „Tripods" fahren im selben Wagen
 * und werden zusammen ausgeladen, und ein Ladeplan mit drei Ein-Stück-
 * Schichten wäre eine Schichtung ohne Nutzen.
 *
 * Die Schlüssel stehen englisch, weil die Kategorie englisch im Datensatz
 * steht. Übersetzt wird der Gruppenname bei der Anzeige.
 */
const AUS_KATEGORIE: Record<string, string> = {
  Cameras: 'gruppe.video',
  Lenses: 'gruppe.video',
  Tripods: 'gruppe.video',
  Video: 'gruppe.video',
  Monitors: 'gruppe.video',
  Lighting: 'gruppe.licht',
  Audio: 'gruppe.ton',
  Microphones: 'gruppe.ton',
  'Mixing console': 'gruppe.ton',
  PC: 'gruppe.regie',
  Networking: 'gruppe.regie',
  'Patch panels': 'gruppe.regie',
  Cables: 'gruppe.kabel',
  Power: 'gruppe.strom',
  Rigging: 'gruppe.rigging',
}

/** Die Gruppennamen in der Reihenfolge, in der auf einer Produktion gebaut wird. */
export const GRUPPEN_VORSCHLAG_REIHENFOLGE = [
  'gruppe.rigging',
  'gruppe.licht',
  'gruppe.strom',
  'gruppe.ton',
  'gruppe.video',
  'gruppe.regie',
  'gruppe.kabel',
] as const

/**
 * Der angezeigte Name einer vorgeschlagenen Gruppe.
 *
 * Er wird EINMAL beim Setzen aufgelöst und dann als Text gespeichert: die
 * Gruppe ist danach ein freier Name, den der Nutzer umbenennen darf, und
 * keine Kennung, die beim nächsten Sprachwechsel etwas anderes bedeutet.
 */
export function gruppenName(schluessel: string, t: Uebersetzen = quelle): string {
  const namen: Record<string, string> = {
    'gruppe.rigging': t('group.rigging', 'Rigging'),
    'gruppe.licht': t('group.light', 'Light'),
    'gruppe.strom': t('group.power', 'Power'),
    'gruppe.ton': t('group.sound', 'Sound'),
    'gruppe.video': t('group.video', 'Video'),
    'gruppe.regie': t('group.control', 'Control room'),
    'gruppe.kabel': t('group.cable', 'Cable'),
  }
  return namen[schluessel] ?? schluessel
}

/** Vorgeschlagene Gruppe für eine Kategorie — oder `undefined`, wenn keine passt. */
export function gruppeAusKategorie(category: string | undefined, t: Uebersetzen = quelle): string | undefined {
  const schluessel = category ? AUS_KATEGORIE[category.trim()] : undefined
  return schluessel ? gruppenName(schluessel, t) : undefined
}

export interface GruppenVorschlag {
  stueckId: string
  gruppe: string
}

export interface GruppenVorschlaege {
  /** Was gesetzt würde. Nur Stücke ohne eigene Gruppe. */
  setzen: GruppenVorschlag[]
  /** Stücke ohne Gruppe, für die die Kategorie keine hergibt. */
  offen: number
  /** Stücke, die schon eine Gruppe tragen und deshalb unangetastet bleiben. */
  behalten: number
  /**
   * Die vorgeschlagenen Gruppen in Bau-Reihenfolge, für
   * `Ladung.gruppenReihenfolge`. Nur die, die auch vorkommen.
   */
  reihenfolge: string[]
}

/**
 * Was ein Lauf „Gruppen aus der Kategorie" täte — gerechnet, nicht getan.
 *
 * Die Trennung ist Absicht: die Oberfläche kann damit sagen, was passieren
 * WIRD („7 von 12 bekommen eine Gruppe, 3 bleiben offen"), bevor jemand
 * drückt. Ein Knopf, dessen Wirkung man erst am Ergebnis sieht, ist bei einer
 * Ladung mit sechzig Stücken keine Bedienung, sondern ein Versuch.
 */
export function gruppenVorschlaege(
  ladung: Ladung,
  items: readonly InventoryItem[],
  t: Uebersetzen = quelle,
): GruppenVorschlaege {
  const nachId = new Map(items.map((i) => [i.id, i]))
  const setzen: GruppenVorschlag[] = []
  let offen = 0
  let behalten = 0

  for (const s of ladung.stuecke) {
    if (s.gruppe && s.gruppe.trim()) {
      behalten += 1
      continue
    }
    const gruppe = gruppeAusKategorie(kategorieVon(s, nachId), t)
    if (gruppe) setzen.push({ stueckId: s.id, gruppe })
    else offen += 1
  }

  const vorhanden = new Set([
    ...ladung.stuecke.map((s) => s.gruppe).filter((g): g is string => !!g && !!g.trim()),
    ...setzen.map((v) => v.gruppe),
  ])
  const reihenfolge = [
    ...GRUPPEN_VORSCHLAG_REIHENFOLGE.map((k) => gruppenName(k, t)).filter((n) => vorhanden.has(n)),
    // Gruppen, die der Nutzer selbst angelegt hat, hängen hinten an — ihre
    // Stelle kennt nur er, und geraten wäre schlimmer als angehängt.
    ...[...vorhanden].filter((n) => !GRUPPEN_VORSCHLAG_REIHENFOLGE.some((k) => gruppenName(k, t) === n)),
  ]

  return { setzen, offen, behalten, reihenfolge }
}

/**
 * Die Kategorie eines Ladungsstücks.
 *
 * Ein Stück aus dem Bestand kennt seinen Artikel; ein CSV-Stück nicht. Für
 * das zweite gibt es hier nichts zu holen, und das ist kein Mangel: eine
 * fremde Manifest-Zeile trägt die Taxonomie dieses Hauses nicht.
 */
function kategorieVon(s: LadungsStueck, nachId: Map<string, InventoryItem>): string | undefined {
  return s.itemId ? nachId.get(s.itemId)?.category : undefined
}
