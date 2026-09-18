// ───────────────────────────────────────────────────────────────────────────
// Die Kennung eines Lagerplatzes — A1, A-01-02, R3/E2/P07.
//
// ─── ES GIBT KEINE NORM, UND DAS IST DER GRUND FÜR DIESE DATEI ─────────────
//
// In der Lagertechnik ist die Adressierung über Gasse, Feld, Ebene und Platz
// verbreitet — aber sie ist eine GEWOHNHEIT und keine Norm. Jedes Haus
// schneidet sie anders: „A1" im kleinen Lager, „A-01-02" mit führenden
// Nullen im grossen, „R3/E2/P07" dort, wo die Regalreihe nicht die Gasse
// ist. Ein fest verdrahtetes Schema wäre deshalb genau das, was die
// Hausregel verbietet: eine Vorgabe, die aussieht wie eine Messung.
//
// Dieselbe Entscheidung steht schon einmal im Repo, an der Inventur: „Der
// Prefix ist eine Hausregel, keine Norm — er ist deshalb einstellbar und
// darf leer sein." Diese Datei führt das fort.
//
// ─── DIE KENNUNG IST KEINE EINBAHNSTRASSE ──────────────────────────────────
//
// `kennung` baut sie, `leseKennung` liest sie zurück. Der Rückweg ist kein
// Beiwerk: ohne ihn wäre ein gescanntes „A-01-02" eine Zeichenkette, die
// zufällig so aussieht wie eine Adresse, und niemand könnte sagen, welche
// Ebene gemeint ist. Mit ihm ist das Etikett am Regal dieselbe Auskunft wie
// der Baum.
//
// ─── UND NICHTS WIRD ERFUNDEN ──────────────────────────────────────────────
//
// Ein Schema ohne Stufen liefert `null` und keinen leeren Text: „keine
// Kennung" ist etwas anderes als „die Kennung ist leer". Eine Stufe, für die
// kein Wert vorliegt, bricht die Kennung ab, statt eine Null einzusetzen —
// „A-01-00" wäre ein Platz, den es gibt, und das ist die teure Richtung.
//
// REIN: keine Uhr, kein Store, kein IO.
// ───────────────────────────────────────────────────────────────────────────

import { format, quelle, type Uebersetzen } from '../../i18n/quelle'

/** Wofür eine Stufe der Kennung steht. */
export type StufenArt = 'gasse' | 'reihe' | 'feld' | 'ebene' | 'platz'

export const STUFEN_ARTEN: readonly StufenArt[] = ['gasse', 'reihe', 'feld', 'ebene', 'platz']

export interface Stufe {
  art: StufenArt
  /**
   * Buchstaben (A, B, … Z, AA) oder Ziffern (1, 2, 3).
   *
   * Buchstaben laufen wie Tabellenspalten weiter: nach Z kommt AA. Bei 27
   * Gassen mit „A1" abzubrechen wäre eine Grenze, die niemand erwartet.
   */
  zeichen: 'buchstaben' | 'ziffern'
  /** Auf wieviele Stellen mit Nullen aufgefüllt wird. 0 = gar nicht. */
  stellen: number
}

export interface Kennungsschema {
  stufen: Stufe[]
  /** Was zwischen zwei Stufen steht. Leer heisst: nichts — „A1". */
  trenner: string
}

/** Ein Haus ohne eigenes Schema hat keines. Nicht „A1" als Vorgabe. */
export const OHNE_SCHEMA: Kennungsschema = { stufen: [], trenner: '' }

/** Das Schema, das die meisten kleinen Lager fahren: Reihe + Feld, „A1". */
export const SCHEMA_A1: Kennungsschema = {
  stufen: [
    { art: 'reihe', zeichen: 'buchstaben', stellen: 0 },
    { art: 'feld', zeichen: 'ziffern', stellen: 0 },
  ],
  trenner: '',
}

/** Buchstaben wie Tabellenspalten: 1→A, 26→Z, 27→AA. */
export function buchstabe(n: number): string {
  if (!Number.isInteger(n) || n < 1) return ''
  let rest = n
  let out = ''
  while (rest > 0) {
    const ziffer = (rest - 1) % 26
    out = String.fromCharCode(65 + ziffer) + out
    rest = Math.floor((rest - 1) / 26)
  }
  return out
}

/** Der Rückweg: A→1, Z→26, AA→27. Ungültiges wird zu `null`. */
export function ausBuchstabe(s: string): number | null {
  if (!/^[A-Z]+$/.test(s)) return null
  let n = 0
  for (const z of s) n = n * 26 + (z.charCodeAt(0) - 64)
  return n
}

const stufenText = (stufe: Stufe, wert: number): string => {
  const roh = stufe.zeichen === 'buchstaben' ? buchstabe(wert) : String(wert)
  return stufe.stellen > 0 ? roh.padStart(stufe.stellen, '0') : roh
}

/**
 * Die Kennung aus den Werten je Stufe.
 *
 * `null`, wenn das Schema keine Stufen hat oder eine Stufe ohne Wert
 * dasteht — siehe Kopf: eine abgebrochene Adresse ist keine.
 */
export function kennung(schema: Kennungsschema, werte: Partial<Record<StufenArt, number>>): string | null {
  if (schema.stufen.length === 0) return null
  const teile: string[] = []
  for (const stufe of schema.stufen) {
    const wert = werte[stufe.art]
    if (wert === undefined || !Number.isInteger(wert) || wert < 1) return null
    teile.push(stufenText(stufe, wert))
  }
  return teile.join(schema.trenner)
}

/**
 * Eine Kennung zurücklesen.
 *
 * `null`, wenn sie nicht zum Schema passt. Das ist ausdrücklich ein Ergebnis
 * und kein Fehler: wer das Etikett am Case scannt statt das am Regal, soll
 * es gesagt bekommen — dieselbe Absicht wie der erwartete Prefix in der
 * Inventur.
 */
export function leseKennung(
  schema: Kennungsschema,
  text: string,
): Partial<Record<StufenArt, number>> | null {
  if (schema.stufen.length === 0) return null
  const roh = text.trim().toUpperCase()
  if (roh === '') return null

  const teile = schema.trenner === '' ? teileOhneTrenner(schema, roh) : roh.split(schema.trenner)
  if (teile === null || teile.length !== schema.stufen.length) return null

  const out: Partial<Record<StufenArt, number>> = {}
  for (let i = 0; i < schema.stufen.length; i += 1) {
    const stufe = schema.stufen[i]!
    const teil = teile[i]!
    const wert = stufe.zeichen === 'buchstaben' ? ausBuchstabe(teil) : zahl(teil)
    if (wert === null || wert < 1) return null
    out[stufe.art] = wert
  }
  return out
}

const zahl = (s: string): number | null => (/^\d+$/.test(s) ? Number(s) : null)

/**
 * Ohne Trenner zerlegen — dort, wo „A1" steht.
 *
 * Es geht nur, solange sich Buchstaben- und Ziffern-Stufen abwechseln; zwei
 * Ziffern-Stufen hintereinander ohne Trenner sind nicht auflösbar („1102"
 * ist 1|102 und 11|02 zugleich). Dann liefert die Funktion `null`, statt
 * sich für eine Lesart zu entscheiden.
 */
function teileOhneTrenner(schema: Kennungsschema, roh: string): string[] | null {
  const teile: string[] = []
  let rest = roh
  for (let i = 0; i < schema.stufen.length; i += 1) {
    const stufe = schema.stufen[i]!
    const naechste = schema.stufen[i + 1]
    if (naechste && naechste.zeichen === stufe.zeichen) return null
    const muster = stufe.zeichen === 'buchstaben' ? /^[A-Z]+/ : /^\d+/
    const treffer = muster.exec(rest)
    if (!treffer) return null
    teile.push(treffer[0])
    rest = rest.slice(treffer[0].length)
  }
  return rest === '' ? teile : null
}

/**
 * Eine ganze Reihe auf einmal beschriften.
 *
 * Der Fall, für den das gebraucht wird: ein Regal hat acht Felder und vier
 * Ebenen, und niemand tippt zweiunddreissig Kennungen ab. Die Reihenfolge
 * ist die des Ablaufens — die feinste Stufe zuerst, damit A1-1, A1-2, A1-3
 * nebeneinanderliegen und nicht A1-1, A2-1, A3-1.
 */
export function reihe(
  schema: Kennungsschema,
  grenzen: Partial<Record<StufenArt, number>>,
  fest: Partial<Record<StufenArt, number>> = {},
): string[] {
  if (schema.stufen.length === 0) return []
  const zaehlend = schema.stufen.filter((s) => fest[s.art] === undefined)
  if (zaehlend.some((s) => !grenzen[s.art] || grenzen[s.art]! < 1)) return []

  const out: string[] = []
  const werte: Partial<Record<StufenArt, number>> = { ...fest }
  const lauf = (i: number) => {
    if (i >= zaehlend.length) {
      const k = kennung(schema, werte)
      if (k) out.push(k)
      return
    }
    const stufe = zaehlend[i]!
    for (let n = 1; n <= grenzen[stufe.art]!; n += 1) {
      werte[stufe.art] = n
      lauf(i + 1)
    }
    delete werte[stufe.art]
  }
  // Die GROBSTE Stufe steht aussen, damit die feinste am schnellsten laeuft:
  // A1, A2, A3, B1 — man geht ein Regal entlang und nicht quer durch die
  // Halle. Der erste Anlauf lief von hinten und lieferte A1, B1, A2.
  lauf(0)
  return out
}

/** Eine Kennung, die zweimal vergeben ist. */
export interface Kollision {
  kennung: string
  ids: string[]
}

/**
 * Doppelt vergebene Kennungen.
 *
 * Sie werden GEMELDET und nicht verhindert: beim Umbau eines Lagers gibt es
 * den Moment, in dem zwei Regale dieselbe Nummer tragen, und ein Werkzeug,
 * das den Zwischenstand verbietet, wird umgangen. Dieselbe Haltung wie beim
 * Laden aus der Reihe.
 */
export function kollisionen(
  knoten: readonly { id: string; code?: string }[],
): Kollision[] {
  const nach = new Map<string, string[]>()
  for (const k of knoten) {
    const c = k.code?.trim().toUpperCase()
    if (!c) continue
    const liste = nach.get(c)
    if (liste) liste.push(k.id)
    else nach.set(c, [k.id])
  }
  return [...nach.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([kennung, ids]) => ({ kennung, ids }))
    .sort((a, b) => a.kennung.localeCompare(b.kennung))
}

/** Das Schema als Beispiel — damit man sieht, was man einstellt. */
export function schemaBeispiel(schema: Kennungsschema): string | null {
  // Jede Stufe auf 1: das Beispiel ist die ERSTE Adresse des Hauses und
  // nicht eine beliebige. „A1" ist das, wonach jemand sucht, wenn er wissen
  // will, wie sein Schema aussieht.
  const werte: Partial<Record<StufenArt, number>> = {}
  for (const s of schema.stufen) werte[s.art] = 1
  return kennung(schema, werte)
}

/** Wie eine Stufe heisst. Als Funktion, nicht als Tabelle (CLAUDE.md). */
export function stufenName(art: StufenArt, t: Uebersetzen = quelle): string {
  switch (art) {
    case 'gasse':
      return t('code.stage.aisle', 'Aisle')
    case 'reihe':
      return t('code.stage.row', 'Row')
    case 'feld':
      return t('code.stage.bay', 'Bay')
    case 'ebene':
      return t('code.stage.level', 'Level')
    default:
      return t('code.stage.slot', 'Slot')
  }
}

/** Der Satz zu einer Kollision. */
export function kollisionText(k: Kollision, t: Uebersetzen = quelle): string {
  return format(t('code.clash', 'Code {code} is used {n} times.'), { code: k.kennung, n: k.ids.length })
}

/**
 * Die Kennungen der Ebenen EINES Regals.
 *
 * ─── WARUM DAS NICHT `reihe()` IST ─────────────────────────────────────────
 *
 * `reihe()` baut Kennungen aus dem Nichts, für ein noch unbeschriftetes
 * Lager. Hier steht schon etwas: das Regal trägt „A1", und seine Ebenen
 * heissen „A1-1", „A1-2". Die Kennung des Kindes SETZT die des Elters fort,
 * statt neben ihr zu stehen — wer am Regal steht, liest oben A1 und am Fach
 * A1-2, und die beiden gehören sichtbar zusammen.
 *
 * ─── DER TRENNER IST NICHT VERHANDELBAR ────────────────────────────────────
 *
 * Ohne ihn wäre „A1" + Ebene 2 gleich „A12" — und das ist unter einem
 * Schema mit Reihe und Feld die Kennung von Regal A, Feld 12. Zwei
 * verschiedene Plätze mit derselben Adresse sind schlimmer als eine
 * hässliche Adresse. Hat das Hausschema keinen Trenner, nimmt diese Funktion
 * den Bindestrich und sagt es über `mitBindestrich`.
 */
export interface EbenenKennungen {
  kennungen: string[]
  /** `true`, wenn der Trenner ergänzt wurde, weil das Schema keinen hat. */
  mitBindestrich: boolean
}

export function ebenenKennungen(
  regalCode: string | undefined,
  anzahl: number,
  schema: Kennungsschema,
): EbenenKennungen {
  const basis = regalCode?.trim()
  if (!basis || !Number.isInteger(anzahl) || anzahl < 1) {
    return { kennungen: [], mitBindestrich: false }
  }

  const ebenenStufe = schema.stufen.find((s) => s.art === 'ebene')
  const trenner = schema.trenner === '' ? '-' : schema.trenner
  const kennungen: string[] = []
  for (let n = 1; n <= anzahl; n += 1) {
    const teil = ebenenStufe
      ? stufenText(ebenenStufe, n)
      : String(n)
    kennungen.push(`${basis}${trenner}${teil}`)
  }
  return { kennungen, mitBindestrich: schema.trenner === '' }
}
