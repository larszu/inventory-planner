// ───────────────────────────────────────────────────────────────────────────
// „Regal A Ebene 1" ist eine Adresse. Hier wird sie zu einem Lagerplatz.
//
// ─── WOFÜR ─────────────────────────────────────────────────────────────────
//
// Der Lagerort steht nicht nur in diesem Werkzeug. Er steht auf einem
// Aufkleber am Regal, in einer Spalte einer CSV, im Kabelplan als Freitext —
// und überall als TEXT. Damit derselbe Text überall denselben Platz meint,
// gibt es genau eine Stelle, die ihn auflöst, und das ist diese.
//
// Ohne sie hiesse „Regal A Ebene 1" im Plan etwas anderes als im Lager: dort
// eine Zeichenkette, hier ein Knoten — und niemand merkte, dass sie
// auseinanderlaufen, bis jemand im falschen Gang steht.
//
// ─── VIER WEGE, IN DIESER REIHENFOLGE ──────────────────────────────────────
//
//   1. die Kennung am Knoten (`code`) — das, was auf dem Aufkleber steht
//   2. die Kennung nach dem Hausschema, zurückgelesen und wieder gebaut
//   3. der Pfad („Halle 1 › Regal A › Ebene 1", auch mit / oder >)
//   4. der Name, wenn er EINDEUTIG ist
//
// Die Reihenfolge ist Absicht: der Aufkleber schlägt den Namen. Wer ein Regal
// umbenennt, ändert nicht das Etikett, das daran klebt.
//
// ─── UND DER NAME HÄNGT AN DER SPRACHE VON DAMALS ──────────────────────────
//
// Gemessen am 2026-09-18 im Browser: eine Ebene, die bei englischer
// Oberfläche angelegt wurde, heisst „Level 2" — auch für jemanden, der
// später auf Deutsch umschaltet und „Ebene 2" tippt. Der Name entsteht
// EINMAL, beim Anlegen, aus der Sprache, die dann gilt; er ist eine
// Beschriftung und keine Adresse.
//
// Das ist kein Fehler dieser Datei, sondern der Grund für ihre Reihenfolge:
// die Kennung („A1-2") ist dieselbe in jeder Sprache, und deshalb steht sie
// vorn. Wer über Werkzeuggrenzen hinweg auf einen Platz zeigen will, zeigt
// auf die Kennung.
//
// ─── MEHRDEUTIG IST EIN ERGEBNIS UND KEIN FEHLER ───────────────────────────
//
// Zwei Regale heissen „Regal A"? Dann gibt es keine Antwort, und das steht
// auch da. Sich für eines zu entscheiden wäre geraten — und geraten sieht
// genauso aus wie gewusst. Dieselbe Haltung wie bei `leseKennung`, die sich
// bei „1102" nicht zwischen 1|102 und 11|02 entscheidet.
//
// REIN: keine Uhr, kein Store, kein IO.
// ───────────────────────────────────────────────────────────────────────────

import { format, quelle, type Uebersetzen } from '../../i18n/quelle'
import type { StorageNode } from '../types/inventory'
import { kennung, leseKennung, type Kennungsschema } from './platzkennung'
import { nodePathLabel } from './storageTree'

export type PlatzAbsage = 'leer' | 'unbekannt' | 'mehrdeutig'

export type PlatzTreffer =
  | { art: 'treffer'; node: StorageNode; weg: 'code' | 'schema' | 'pfad' | 'name' }
  | { art: 'absage'; grund: PlatzAbsage; kandidaten: StorageNode[] }

/** Trennzeichen, die ein Mensch für einen Pfad benutzt. */
const PFAD_TRENNER = /[›>/|]|\s+-\s+/

const norm = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ')

export function platzAufloesen(
  text: string,
  nodes: readonly StorageNode[],
  schema?: Kennungsschema,
): PlatzTreffer {
  const roh = text.trim()
  if (roh === '') return { art: 'absage', grund: 'leer', kandidaten: [] }

  // 1 · Die Kennung am Knoten.
  const perCode = nodes.filter((n) => n.code && norm(n.code) === norm(roh))
  if (perCode.length === 1) return { art: 'treffer', node: perCode[0]!, weg: 'code' }
  if (perCode.length > 1) return { art: 'absage', grund: 'mehrdeutig', kandidaten: perCode }

  // 2 · Nach dem Hausschema gelesen und wieder gebaut — damit „a1", „A 1"
  //     und „A1" denselben Platz treffen.
  if (schema) {
    const werte = leseKennung(schema, roh.replace(/\s+/g, ''))
    const gebaut = werte ? kennung(schema, werte) : null
    if (gebaut) {
      const perSchema = nodes.filter((n) => n.code && norm(n.code) === norm(gebaut))
      if (perSchema.length === 1) return { art: 'treffer', node: perSchema[0]!, weg: 'schema' }
      if (perSchema.length > 1) return { art: 'absage', grund: 'mehrdeutig', kandidaten: perSchema }
    }
  }

  // 3 · Der Pfad. Er darf ABKÜRZEN: „Regal A / Ebene 1" trifft auch dann,
  //     wenn darüber noch „Halle 1" steht — niemand tippt die volle Kette.
  const teile = roh.split(PFAD_TRENNER).map(norm).filter((t) => t !== '')
  if (teile.length > 1) {
    const perPfad = nodes.filter((n) => passtAufPfad(n, teile, nodes))
    if (perPfad.length === 1) return { art: 'treffer', node: perPfad[0]!, weg: 'pfad' }
    if (perPfad.length > 1) return { art: 'absage', grund: 'mehrdeutig', kandidaten: perPfad }
  }

  // 4 · Der Name — zuletzt, weil er sich ändert und das Etikett nicht.
  const perName = nodes.filter((n) => norm(n.name) === norm(roh))
  if (perName.length === 1) return { art: 'treffer', node: perName[0]!, weg: 'name' }
  if (perName.length > 1) return { art: 'absage', grund: 'mehrdeutig', kandidaten: perName }

  return { art: 'absage', grund: 'unbekannt', kandidaten: [] }
}

/**
 * Passt dieser Knoten auf die Kette? Das letzte Glied ist er selbst, die
 * übrigen müssen in dieser Reihenfolge über ihm liegen — Lücken erlaubt.
 */
function passtAufPfad(node: StorageNode, teile: string[], nodes: readonly StorageNode[]): boolean {
  const letztes = teile[teile.length - 1]!
  if (norm(node.name) !== letztes && norm(node.code ?? '') !== letztes) return false

  let offen = teile.slice(0, -1)
  let lauf = node.parentId ? nodes.find((n) => n.id === node.parentId) : undefined
  const gesehen = new Set<string>()
  while (lauf && offen.length > 0 && !gesehen.has(lauf.id)) {
    gesehen.add(lauf.id)
    const letzterOffener = offen[offen.length - 1]!
    if (norm(lauf.name) === letzterOffener || norm(lauf.code ?? '') === letzterOffener) {
      offen = offen.slice(0, -1)
    }
    lauf = lauf.parentId ? nodes.find((n) => n.id === lauf!.parentId) : undefined
  }
  return offen.length === 0
}

/** Der Satz zu einer Absage. */
export function platzAbsageText(
  treffer: Extract<PlatzTreffer, { art: 'absage' }>,
  nodes: readonly StorageNode[],
  t: Uebersetzen = quelle,
): string {
  if (treffer.grund === 'leer') return t('place.empty', 'No location given.')
  if (treffer.grund === 'mehrdeutig') {
    return format(t('place.ambiguous', 'That fits {n} locations: {list}. Which one?'), {
      n: treffer.kandidaten.length,
      list: treffer.kandidaten.map((n) => nodePathLabel([...nodes], n.id)).join(' · '),
    })
  }
  return t('place.unknown', 'No location of that name or code.')
}
