// ───────────────────────────────────────────────────────────────────────────
// Darf dieses Stück HIER stehen? Eine Antwort für alle Ansichten.
//
// ─── WARUM DAS NICHT IN DER ANSICHT STEHT ──────────────────────────────────
//
// Weil zwei Ansichten dieselbe Frage stellen: die Draufsicht beim Ziehen mit
// dem Finger, die 3D-Ansicht beim Ziehen am Griff. Sie stand zuerst nur in
// der Draufsicht — die 3D-Ansicht liess deshalb alles zu und meldete erst
// beim Loslassen gar nichts. Wer dort zog, sah keinen Unterschied zwischen
// einer Stelle, an der das Case steht, und einer, an der es schwebt.
//
// ─── WAS SIE PRÜFT, UND IN WELCHER REIHENFOLGE ─────────────────────────────
//
//   1. im Hüllquader           `liegtInnerhalb`
//   2. in der FORM des Raums   `quaderFrei` — Fasen und Rundungen
//   3. frei von anderen        `ueberlappt`, gegen Stücke UND Hindernisse
//
// Die Reihenfolge ist die der Aussagekraft: „ragt aus dem Fahrzeug" ist eine
// andere Auskunft als „steht in der Rundung" und als „steht in einer anderen
// Kiste". Wer nur „geht nicht" sagt, lässt den Menschen raten.
//
// ─── WAS IM WEG STEHT, UND WAS NUR DORT STEHT ──────────────────────────────
//
// Nicht jede Überschneidung ist ein Fehler. Ein Stück, das der PACKER gesetzt
// hat, rückt beim nächsten Durchlauf zur Seite — es ist ein Vorschlag und
// keine Entscheidung. Verankerte Stücke und die Einbauten des Fahrzeugs
// rücken nicht.
//
// Das stand zuerst nicht drin, und die Draufsicht meldete deshalb rot, wo
// gleich darauf alles passte: gemessen am 2026-09-18 — eine Kiste auf den
// Platz des Amp-Racks gezogen, Warnung „steht schon dort", nach dem
// Loslassen stand beides ordentlich nebeneinander. Eine Warnung, die sich
// selbst widerlegt, bringt die nächste in Verruf.
//
// Deshalb zwei Ausgänge: `belegt` ist ungültig, `weicht` ist gültig und
// trotzdem eine Auskunft — „das da rückt zur Seite" ist genau das, was
// jemand wissen will, bevor er loslässt.
//
// REIN: keine Uhr, kein Store, kein IO.
// ───────────────────────────────────────────────────────────────────────────

import { format, quelle, type Uebersetzen } from '../../i18n/quelle'
import type { LoadPlan, Vec3 } from './loadPacker'
import { liegtInnerhalb, quader, ueberlappt } from './loadPacker'
import { quaderFrei } from './kontur'
import type { Vehicle } from '../types/vehicle'

export type PlatzGrund = 'raus' | 'raumform' | 'belegt' | 'weicht'

export interface PlatzUrteil {
  gueltig: boolean
  grund?: PlatzGrund
  /** Womit es sich überschneidet — bei `belegt` und bei `weicht`. */
  mit?: string
}

export function platzUrteil(
  vehicle: Vehicle,
  plan: LoadPlan,
  stueckId: string,
  position: Vec3,
): PlatzUrteil {
  const p = plan.placements.find((x) => x.stueckId === stueckId)
  if (!p) return { gueltig: false, grund: 'raus' }

  const raum: Vec3 = {
    x: vehicle.cargoMm.widthMm,
    y: vehicle.cargoMm.heightMm,
    z: vehicle.cargoMm.lengthMm,
  }
  const q = quader(position, p.sizeMm)

  if (!liegtInnerhalb(q, raum)) return { gueltig: false, grund: 'raus' }
  if (!quaderFrei(vehicle.kanten, raum, position, p.sizeMm)) {
    return { gueltig: false, grund: 'raumform' }
  }

  for (const h of vehicle.obstructions) {
    if (ueberlappt(q, quader(h.originMm, h.sizeMm))) {
      return { gueltig: false, grund: 'belegt', mit: h.name }
    }
  }
  // Verankertes zuerst: es ist die Entscheidung eines Menschen und wiegt
  // schwerer als ein Vorschlag des Packers, der daneben liegt.
  let weicht: string | undefined
  for (const anderes of plan.placements) {
    if (anderes.stueckId === stueckId) continue
    if (!ueberlappt(q, quader(anderes.position, anderes.sizeMm))) continue
    if (anderes.verankert) return { gueltig: false, grund: 'belegt', mit: anderes.label }
    weicht ??= anderes.label
  }
  if (weicht) return { gueltig: true, grund: 'weicht', mit: weicht }
  return { gueltig: true }
}

/** Der Satz zum Urteil. Leer, wenn es nichts zu sagen gibt. */
export function platzUrteilText(urteil: PlatzUrteil, t: Uebersetzen = quelle): string {
  if (urteil.grund === 'weicht') {
    return format(t('place.gives', '{what} will move aside for it.'), { what: urteil.mit ?? '' })
  }
  if (urteil.gueltig) return ''
  if (urteil.grund === 'raus') return t('place.outside', 'It would stick out of the cargo space.')
  if (urteil.grund === 'raumform') {
    return t('place.shape', 'The cargo space is chamfered or rounded there.')
  }
  return format(t('place.taken', '{what} is already standing there.'), { what: urteil.mit ?? '' })
}
