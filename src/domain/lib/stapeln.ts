// ───────────────────────────────────────────────────────────────────────────
// Stapeln — passt Case B auf Case A, und wie hoch wird der Turm?
//
// ─── DIE EINE GLEICHUNG ────────────────────────────────────────────────────
//
//   stapelHoehe = h_unten + h_oben − min(tellerTiefe, rollenHoehe_oben)
//
// Der Rollenteller SCHLUCKT einen Teil der Rollenhöhe. Stumpfes Addieren ist
// der häufigste Fehler in dieser Domäne, und er fällt erst am Dock auf: pro
// Lage 20 bis 40 mm zu hoch, bei vier Lagen eine ganze Lage, und das Rolltor
// geht nicht zu.
//
// ─── WARUM DREI ANTWORTEN UND NICHT ZWEI ───────────────────────────────────
//
// „Passt das aufeinander?" hat hier nicht ja/nein, sondern ja / nein /
// unbekannt. Eine freie Lenkrolle ohne gemessenen Rollenabstand ist kein
// „nein" — sie ist eine offene Frage, und wer sie als „geht schon" behandelt,
// stapelt auf einer Vermutung. Das ist dieselbe Regel wie bei den Fristen:
// eine Einheit ohne eingetragene Frist ist nicht „ok".
//
// Deshalb gibt `passtAufeinander` `{ geht: false, grund }` zurück, und der
// Grund unterscheidet ausdrücklich zwischen „widerspricht einer Regel" und
// „ist nicht angegeben". Der Aufrufer darf das verschieden darstellen; was er
// nicht darf, ist beides als dasselbe zu zählen.
//
// ─── DER TELLERABGLEICH ────────────────────────────────────────────────────
//
// Stapeln geht, wenn das Tellerraster oben zum Rollenraster unten passt. Bei
// gleichem Casetyp ist das trivial erfüllt — deshalb wirkt es wie eine
// Typ-Eigenschaft. Als Flag modelliert verlöre man „Case A trägt Case B", und
// genau das kommt in der Praxis dauernd vor.
// ───────────────────────────────────────────────────────────────────────────

import type { CaseOrientation, TransportSpec } from '../types/transport'
import type { PhysicalDimensions } from '../types/inventory'
import { quelle, type Uebersetzen } from '../../i18n/quelle'

/** Wie weit Teller- und Rollenmitte auseinanderliegen dürfen, in mm. */
export const TELLER_TOLERANZ_MM = 8

/** Ein Stück, wie diese Rechnung es sieht. */
export interface StapelStueck {
  dimensions?: PhysicalDimensions
  transport?: TransportSpec
  /** Gesamtgewicht inkl. Inhalt, falls bekannt. Sonst `dimensions.weightKg`. */
  gesamtKg?: number
}

/** Warum es nicht geht — und ob das eine Regel ist oder eine Lücke. */
export type StapelBefundArt = 'regel' | 'nicht-angegeben'

export interface StapelBefund {
  geht: boolean
  art?: StapelBefundArt
  grund?: string
}

const ja: StapelBefund = { geht: true }

const nein = (art: StapelBefundArt, grund: string): StapelBefund => ({ geht: false, art, grund })

/**
 * Trägt eine Lage die Rollen nach unten?
 *
 * Gekippt liegt eine rollenlose Fläche unten. Die Aufbauhöhe entfällt damit,
 * und das Stück ist nicht mehr rollbar.
 */
export function stehtAufRollen(lage: CaseOrientation): boolean {
  return lage === 'upright'
}

/**
 * Ist das Stück in dieser Lage rollbar?
 *
 * Ohne Rollenangabe lautet die Antwort `undefined` — nicht `false`. Ein Case,
 * an dem niemand die Rollen gepflegt hat, ist nicht nachweislich rollenlos.
 */
export function istRollbar(stueck: StapelStueck, lage: CaseOrientation = 'upright'): boolean | undefined {
  if (!stueck.transport?.castors) return undefined
  return stehtAufRollen(lage)
}

/**
 * Höhe eines Stücks in einer Lage, in mm.
 *
 * In `upright` kommt die Rollenhöhe dazu, falls sie nicht schon in der
 * Case-Höhe steckt. Gekippt entfällt sie, und Breite bzw. Tiefe wird zur Höhe.
 * Fehlt ein gebrauchtes Mass, ist die Antwort `null` — keine geschätzte Zahl.
 */
export function hoeheInLage(stueck: StapelStueck, lage: CaseOrientation = 'upright'): number | null {
  const d = stueck.dimensions
  if (!d) return null

  if (lage === 'onSide') return d.widthMm ?? null
  if (lage === 'onEnd') return d.depthMm ?? null

  const basis = d.heightMm
  if (basis === undefined) return null

  const c = stueck.transport?.castors
  if (!c) return basis
  return c.includedInHeightMm ? basis : basis + c.heightMm
}

/**
 * Höhe des Turms aus zwei Stücken, in mm.
 *
 * Hier steckt die Gleichung aus dem Kopf dieser Datei. Der Teller des unteren
 * Stücks nimmt die Rolle des oberen auf und schluckt dabei `recessDepthMm`,
 * höchstens aber die Rollenhöhe — tiefer als die Rolle lang ist, kann sie
 * nicht versinken.
 *
 * `null`, sobald ein gebrauchtes Mass fehlt.
 */
export function stapelHoehe(
  unten: StapelStueck,
  oben: StapelStueck,
  lageUnten: CaseOrientation = 'upright',
  lageOben: CaseOrientation = 'upright',
): number | null {
  const hu = hoeheInLage(unten, lageUnten)
  const ho = hoeheInLage(oben, lageOben)
  if (hu === null || ho === null) return null

  const teller = unten.transport?.stackTop
  const rollen = oben.transport?.castors

  // Versenkt wird nur, wenn oben wirklich Rollen unten liegen und unten ein
  // Teller ist. Gekippt liegt keine Rolle im Teller.
  if (!teller || !rollen || !stehtAufRollen(lageOben)) return hu + ho

  return hu + ho - Math.min(teller.recessDepthMm, rollen.heightMm)
}

/**
 * Passt `oben` auf `unten`?
 *
 * Reihenfolge der Prüfungen ist Absicht: erst die harten Verbote, dann die
 * Geometrie, dann das Gewicht. Wer `noLoadOnTop` gesetzt hat, soll nicht
 * zuerst erfahren, dass ausserdem der Rollenabstand fehlt.
 *
 * Der Übersetzer steht als LETZTER Parameter mit Vorgabe — `quelle` liefert
 * die englische Quelle, damit ein Test ohne Wörterbuch genau die
 * Rückfallebene misst, die im Betrieb erscheint.
 */
export function passtAufeinander(
  unten: StapelStueck,
  oben: StapelStueck,
  lageOben: CaseOrientation = 'upright',
  t: Uebersetzen = quelle,
): StapelBefund {
  const u = unten.transport
  const o = oben.transport

  if (u?.noLoadOnTop) {
    return nein('regel', t('stack.noLoadOnTopMsg', 'The lower case is marked as carrying no load on top.'))
  }

  if (u?.deformable && u.deformable.maxLoadOnTopKg === undefined) {
    return nein(
      'nicht-angegeben',
      t(
        'stack.softNoRating',
        'The lower item is deformable and carries no rated top load, so it carries nothing.',
      ),
    )
  }

  if (!stehtAufRollen(lageOben)) {
    // Gekippt liegt keine Rolle im Teller. Das ist kein Fehler — es heisst nur,
    // dass die Verriegelung fehlt, die den Turm sonst gegen Wandern sichert.
    return nein(
      'regel',
      t('stack.tiltedNoDish', 'A tilted case has no castors underneath, so the dishes cannot hold it.'),
    )
  }

  const rollen = o?.castors
  const teller = u?.stackTop

  if (!rollen) {
    return nein('nicht-angegeben', t('stack.castorsUnknown', 'The upper case has no castor data.'))
  }
  if (!teller) {
    return nein('nicht-angegeben', t('stack.dishesUnknown', 'The lower case has no dish data.'))
  }

  if (rollen.kind === 'swivel') {
    // Eine freie Lenkrolle schwenkt: ihr Aufstandspunkt wandert auf einem
    // Kreis. Sie trifft den Teller nur, wenn jemand sie von Hand ausrichtet.
    return nein(
      'regel',
      t(
        'stack.swivelNotAligned',
        'Free swivel castors do not return to a defined position; fixed or auto-aligning castors are needed.',
      ),
    )
  }

  if (!rollen.insetMm) {
    return nein('nicht-angegeben', t('stack.insetUnknown', 'The upper case has no measured castor inset.'))
  }

  if (rollen.heightMm > teller.fitsCastorMm) {
    return nein(
      'regel',
      t('stack.castorTooLarge', 'The castor is larger than the dish accepts.'),
    )
  }

  const dx = Math.abs(rollen.insetMm.x - teller.dishInsetMm.x)
  const dy = Math.abs(rollen.insetMm.y - teller.dishInsetMm.y)
  if (dx > TELLER_TOLERANZ_MM || dy > TELLER_TOLERANZ_MM) {
    return nein('regel', t('stack.patternMismatch', 'Castor spacing and dish spacing do not line up.'))
  }

  const last = oben.gesamtKg ?? oben.dimensions?.weightKg
  if (u?.maxStackKg !== undefined) {
    if (last === undefined) {
      return nein('nicht-angegeben', t('stack.weightUnknown', 'The upper case has no known weight.'))
    }
    if (last > u.maxStackKg) {
      return nein('regel', t('stack.tooHeavy', 'The upper case exceeds the rated top load.'))
    }
  }

  return ja
}
