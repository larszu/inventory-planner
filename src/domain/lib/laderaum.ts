// ───────────────────────────────────────────────────────────────────────────
// Laderaum — was wirklich frei ist, was durch die Öffnung passt, was noch wiegt
//
// Drei Auskünfte, und alle drei können „weiss ich nicht" sagen. Das ist kein
// Mangel der Rechnung, sondern ihr Zweck: ein Fahrzeug ohne eingetragene
// Öffnung hat keine unendlich grosse Öffnung, und eines ohne Nutzlast hat
// keine unbegrenzte. Wer das als „passt" ausgibt, produziert die eine Art
// Fehler, die am Ladedock niemand mehr korrigieren kann.
//
// Siehe `types/vehicle.ts` für die Begründung der Felder.
// ───────────────────────────────────────────────────────────────────────────

import type { CargoObstruction, Vehicle } from '../types/vehicle'
import { kantenVerlustLiter } from './kontur'
import type { CaseOrientation } from '../types/transport'
import type { PhysicalDimensions } from '../types/inventory'
import { quelle, type Uebersetzen } from '../../i18n/quelle'

/** Eine Auskunft, die auch „nicht angegeben" sein darf. */
export type Auskunft<T> = { bekannt: true; wert: T } | { bekannt: false; grund: string }

const bekannt = <T>(wert: T): Auskunft<T> => ({ bekannt: true, wert })
const unbekannt = <T>(grund: string): Auskunft<T> => ({ bekannt: false, grund })

/** Rauminhalt eines Quaders in Litern, aus mm gerechnet. */
const literAusMm = (x: number, y: number, z: number): number => (x * y * z) / 1_000_000

/** Volumen eines Hindernisses in Litern. */
export const hindernisLiter = (h: CargoObstruction): number =>
  literAusMm(h.sizeMm.x, h.sizeMm.y, h.sizeMm.z)

export interface FreierRaum {
  /** Der Quader, bevor etwas abgezogen wird. */
  bruttoLiter: number
  /** Was Radkästen, Sitzbank und Aufbau wegnehmen. */
  hindernisLiter: number
  /** Was die gebrochenen und gerundeten Kanten wegnehmen. */
  kantenLiter: number
  /** Brutto minus Hindernisse. */
  nettoLiter: number
  /**
   * Die Breite, die AM BODEN wirklich frei ist.
   *
   * Radkästen stehen unten; die Breite darüber ist eine andere Zahl. Wer nur
   * die Innenbreite kennt, plant die untere Lage zu breit.
   */
  bodenBreiteMm: number
}

/**
 * Was vom Laderaum übrig bleibt.
 *
 * Das Netto-Volumen ist eine OBERE Schranke, keine Packvorhersage: zwischen
 * den Kisten bleibt Luft, die hier nicht abgezogen ist. Es beantwortet
 * „passt das grundsätzlich nicht", nicht „passt das".
 */
export function freierRaum(v: Vehicle): FreierRaum {
  const { lengthMm, widthMm, heightMm } = v.cargoMm
  const brutto = literAusMm(lengthMm, widthMm, heightMm)
  const hindernis = v.obstructions.reduce((s, h) => s + hindernisLiter(h), 0)
  // Der Laderaum ist selten eine Schachtel. Was die Kanten wegnehmen, ist
  // kein Hindernis IM Raum, sondern Raum, den es nie gab — und es gehört
  // deshalb in eine eigene Zeile und nicht in die der Radkästen.
  const kanten = kantenVerlustLiter(v)

  // Radkästen kommen paarweise von beiden Seiten; die freie Bodenbreite ist
  // die Innenbreite minus dem, was von links und rechts hineinragt.
  const radkaesten = v.obstructions.filter((h) => h.kind === 'radkasten')
  const engste = radkaesten.reduce((min, h) => Math.min(min, h.sizeMm.x), Infinity)
  const bodenBreite = radkaesten.length === 0 ? widthMm : Math.max(0, widthMm - 2 * (engste === Infinity ? 0 : engste))

  return {
    bruttoLiter: brutto,
    hindernisLiter: hindernis,
    kantenLiter: kanten,
    nettoLiter: Math.max(0, brutto - hindernis - kanten),
    bodenBreiteMm: bodenBreite,
  }
}

/** Die drei Kantenlängen eines Stücks in einer Lage — als Breite/Höhe der Silhouette. */
const silhouette = (d: PhysicalDimensions, lage: CaseOrientation): { b: number; h: number } | null => {
  const { widthMm: w, heightMm: hh, depthMm: t } = d
  if (w === undefined || hh === undefined || t === undefined) return null
  if (lage === 'onSide') return { b: hh, h: w }
  if (lage === 'onEnd') return { b: w, h: t }
  return { b: w, h: hh }
}

export interface OeffnungsBefund {
  passt: boolean
  /** In welcher Lage es durchgeht. */
  lage?: CaseOrientation
}

/**
 * Passt das Stück durch die Ladeöffnung?
 *
 * Geprüft wird jede erlaubte Lage. OHNE eingetragene Öffnung lautet die
 * Antwort ausdrücklich „nicht angegeben" — nicht „passt". Ein Transporter,
 * dessen Heckklappe niemand vermessen hat, ist kein Transporter mit
 * unbegrenzter Öffnung.
 */
export function passtDurchOeffnung(
  stueck: PhysicalDimensions,
  v: Vehicle,
  lagen: readonly CaseOrientation[] = ['upright', 'onSide', 'onEnd'],
  t: Uebersetzen = quelle,
): Auskunft<OeffnungsBefund> {
  if (!v.aperture) {
    return unbekannt(t('vehicle.noAperture', 'No loading aperture recorded for this vehicle.'))
  }
  if (stueck.widthMm === undefined || stueck.heightMm === undefined || stueck.depthMm === undefined) {
    return unbekannt(t('vehicle.itemNoDims', 'The item has no complete outer dimensions.'))
  }

  const { widthMm: ow, heightMm: oh } = v.aperture
  for (const lage of lagen) {
    const s = silhouette(stueck, lage)
    if (s && s.b <= ow && s.h <= oh) return bekannt({ passt: true, lage })
  }
  return bekannt({ passt: false })
}

/**
 * Wieviel Zuladung bleibt?
 *
 * Beim Transporter ist Gewicht das HÄRTERE Limit als Volumen: ein 3,5-Tonner
 * ist oft bei unter 1.200 kg am Ende. Wer nach Volumen packt, ist überladen,
 * bevor der Laderaum voll ist.
 *
 * Fehlt `nutzlastKg`, kommt keine Zahl zurück. Eine gerechnete Restlast aus
 * geschätzten Fahrzeugdaten sähe auf dem Ladeplan aus wie eine Messung.
 */
export function nutzlastFrei(v: Vehicle, ladungKg: number, t: Uebersetzen = quelle): Auskunft<number> {
  if (v.nutzlastKg === undefined) {
    return unbekannt(t('vehicle.noPayload', 'No payload rating recorded for this vehicle.'))
  }
  return bekannt(v.nutzlastKg - ladungKg)
}
