// ───────────────────────────────────────────────────────────────────────────
// Gewicht, Schwerpunkt, Achslast (#24).
//
// ─── WARUM DAS DIE HÄRTERE GRENZE IST ──────────────────────────────────────
//
// Volumen ist das eine, Gewicht das andere. Ein 3,5-Tonner ist oft bei unter
// 1.200 kg Zuladung am Ende — und das ist die Klasse, in der die Branche
// fährt. Wer nach Volumen packt, ist überladen, bevor der Laderaum voll ist.
//
// Gerechnet wird nichts Neues: die Positionen stehen nach dem Packen fest,
// Schwerpunkt und Achslast fallen als Hebelrechnung daraus heraus.
//
// ─── DIE REGEL DES HAUSES GILT HIER DOPPELT ────────────────────────────────
//
// Fehlt eine Angabe, kommt `{ bekannt: false, grund }` und keine Zahl. Eine
// Achslast aus geschätzten Fahrzeugdaten sieht auf dem Ausdruck aus wie eine
// Messung, und bei der Kontrolle wiegt die Waage. Drei Stellen, an denen
// dieses Werkzeug deshalb schweigt, obwohl es rechnen könnte:
//
//   1. Ein gesetztes Stück ohne Gewicht. Der Schwerpunkt der ÜBRIGEN wäre
//      eine Zahl, die nach dem ganzen Fahrzeug aussieht. Sie kommt als
//      eigene Auskunft (`schwerpunkt`) samt Zählung der ungewogenen Stücke —
//      die ACHSLAST verweigert sie.
//   2. Mehr als zwei Achsen. Ein Dreiachser ist statisch überbestimmt: die
//      Verteilung hängt an der Federung und nicht an der Statik. Hier zu
//      rechnen hiesse, ein Modell zu erfinden, das das Fahrzeug nicht hat.
//   3. Keine gewogene Leerlast je Achse. Dann steht da, was die LADUNG auf
//      die Achse bringt — und ausdrücklich nicht, ob die Achse überladen
//      ist. Das Leergewicht verteilt sich nach der Bauart.
//
// ─── UND ES ERTEILT KEINE FREIGABE ─────────────────────────────────────────
//
// Es rechnet und zeigt. Die Verantwortung für die Ladungssicherung bleibt bei
// Fahrer und Verlader; das steht sichtbar auf dem Blatt und nicht im
// Kleingedruckten. Eine Software, die „in Ordnung" sagt, ohne die reale Kiste
// gesehen zu haben, wäre schlimmer als keine.
//
// REIN: keine Uhr, kein Store, kein IO. Das Datum kommt von aussen.
// ───────────────────────────────────────────────────────────────────────────

import { format, quelle, type Uebersetzen } from '../../i18n/quelle'
import type { LoadPlan } from './loadPacker'
import type { Auskunft } from './laderaum'
import type { Vehicle } from '../types/vehicle'

const bekannt = <T>(wert: T): Auskunft<T> => ({ bekannt: true, wert })
const unbekannt = <T>(grund: string): Auskunft<T> => ({ bekannt: false, grund })

/** Der Schwerpunkt der Ladung, im Koordinatensystem des Laderaums. */
export interface Schwerpunkt {
  /** Quer, in mm ab der linken Wand. */
  xMm: number
  /** Hoch, in mm über der Ladefläche. */
  yMm: number
  /** Längs, in mm ab der vorderen Kante der Ladefläche (z = 0). */
  zMm: number
  /** Das Gewicht, aus dem er gerechnet ist. */
  kg: number
  /** Wieviele gesetzte Stücke KEIN Gewicht tragen — sie fehlen darin. */
  ohneGewicht: number
}

/**
 * Der Schwerpunkt der gesetzten Stücke.
 *
 * Er rechnet mit den Gewichten, die da sind, und sagt dazu, wieviele fehlen.
 * Das ist keine halbe Messung, solange die Zahl daneben steht — und es ist
 * die Auskunft, die am Bildschirm trägt: die Marke im Bild zeigt, wohin die
 * bekannte Masse fällt. Fürs Papier reicht sie nicht; dort fragt
 * `achslasten`, und das verweigert bei fehlenden Gewichten.
 */
export function schwerpunkt(plan: LoadPlan, t: Uebersetzen = quelle): Auskunft<Schwerpunkt> {
  let kg = 0
  let mx = 0
  let my = 0
  let mz = 0
  let ohneGewicht = 0

  for (const p of plan.placements) {
    if (p.weightKg === undefined) {
      ohneGewicht += 1
      continue
    }
    kg += p.weightKg
    mx += p.weightKg * (p.position.x + p.sizeMm.x / 2)
    my += p.weightKg * (p.position.y + p.sizeMm.y / 2)
    mz += p.weightKg * (p.position.z + p.sizeMm.z / 2)
  }

  if (kg <= 0) {
    return unbekannt(
      t('load.noWeights', 'Not one placed piece carries a weight — there is no centre of gravity to compute.'),
    )
  }
  return bekannt({
    xMm: Math.round(mx / kg),
    yMm: Math.round(my / kg),
    zMm: Math.round(mz / kg),
    kg,
    ohneGewicht,
  })
}

/** Was auf einer Achse steht. */
export interface Achslast {
  /** Abstand von der Vorderachse in mm — die Kennung der Achse. */
  positionMm: number
  /** Was die LADUNG auf diese Achse bringt. */
  ausLadungKg: number
  /** Ladung plus gewogener Leerlast — nur wenn die eingetragen ist. */
  gesamtKg?: number
  /** Die zulässige Achslast aus den Papieren. */
  maxLastKg: number
  /**
   * Um wieviel kg die zulässige Achslast überschritten ist.
   *
   * Nur gesetzt, wenn `gesamtKg` bekannt ist: die Ladung allein gegen die
   * zulässige Achslast zu halten, hiesse das Fahrzeug selbst zu vergessen —
   * und fiele immer zu günstig aus.
   */
  ueberKg?: number
}

/**
 * Die Achslasten aus dem Plan.
 *
 * Statik zweier Achsen, mehr nicht: die Last am Hebelarm `a` hinter der
 * Vorderachse teilt sich im Verhältnis `a / radstand` auf die Hinterachse
 * und den Rest auf die Vorderachse. Genau deshalb kann sie bei drei Achsen
 * nichts sagen — dort hängt die Verteilung an der Federung.
 */
export function achslasten(
  plan: LoadPlan,
  v: Vehicle,
  t: Uebersetzen = quelle,
): Auskunft<Achslast[]> {
  const achsen = v.axles ?? []
  if (achsen.length === 0) {
    return unbekannt(t('load.noAxles', 'No axles recorded for this vehicle — nothing to distribute onto.'))
  }
  if (achsen.length !== 2) {
    return unbekannt(
      t(
        'load.threeAxles',
        'More than two axles: how the load spreads depends on the suspension, not on statics alone. Weigh it.',
      ),
    )
  }
  if (v.ladeflaecheAbVorderachseMm === undefined) {
    return unbekannt(
      t(
        'load.noFloorOffset',
        'It is not recorded how far the cargo floor sits behind the front axle — without it there is no lever arm.',
      ),
    )
  }

  const sp = schwerpunkt(plan, t)
  if (!sp.bekannt) return unbekannt(sp.grund)
  if (sp.wert.ohneGewicht > 0) {
    return unbekannt(
      format(
        t(
          'load.someUnweighed',
          'Pieces without a recorded weight are on board: {n}. An axle load computed around them would read like a measurement.',
        ),
        { n: sp.wert.ohneGewicht },
      ),
    )
  }

  const sortiert = [...achsen].sort((a, b) => a.positionMm - b.positionMm)
  const vorn = sortiert[0]!
  const hinten = sortiert[1]!
  const radstand = hinten.positionMm - vorn.positionMm
  if (radstand <= 0) {
    return unbekannt(
      t('load.axlesSamePlace', 'Both axles are recorded at the same distance — one of the two figures is wrong.'),
    )
  }

  // Der Hebelarm zählt ab der VORDERACHSE, nicht ab der Ladekante.
  const arm = v.ladeflaecheAbVorderachseMm + sp.wert.zMm - vorn.positionMm
  const aufHinten = (sp.wert.kg * arm) / radstand
  const aufVorn = sp.wert.kg - aufHinten

  const bauen = (a: typeof vorn, ausLadungKg: number): Achslast => {
    const gesamtKg = a.leergewichtKg === undefined ? undefined : a.leergewichtKg + ausLadungKg
    const ueber = gesamtKg === undefined ? undefined : gesamtKg - a.maxLastKg
    return {
      positionMm: a.positionMm,
      ausLadungKg: Math.round(ausLadungKg),
      gesamtKg: gesamtKg === undefined ? undefined : Math.round(gesamtKg),
      maxLastKg: a.maxLastKg,
      ueberKg: ueber !== undefined && ueber > 0 ? Math.round(ueber) : undefined,
    }
  }

  return bekannt([bauen(vorn, aufVorn), bauen(hinten, aufHinten)])
}

/** Eine Überschreitung der Zuladung — mit dem Stück, das sie auslöst. */
export interface Ueberladung {
  /** Um wieviel kg die Zuladung überschritten ist. */
  ueberKg: number
  /** Das Stück, mit dem die Grenze gerissen wurde, in Ladereihenfolge. */
  label: string
  /** Wieviele Stücke ohne Gewicht mitfahren — sie zählen nirgends mit. */
  ohneGewicht: number
}

/**
 * Reisst die Ladung die Zuladung — und mit welchem Stück?
 *
 * „Mit welchem" ist eine Frage der REIHENFOLGE und nicht der Schwere: gefragt
 * ist, ab wann der Wagen voll war, nicht welche Kiste die schwerste ist. Wer
 * am Dock steht, lädt in dieser Reihenfolge; alles ab dieser Kiste bleibt
 * stehen oder fährt im zweiten Wagen.
 */
export function ueberladung(
  plan: LoadPlan,
  v: Vehicle,
  t: Uebersetzen = quelle,
): Auskunft<Ueberladung | null> {
  if (v.nutzlastKg === undefined) {
    return unbekannt(t('vehicle.noPayload', 'No payload rating recorded for this vehicle.'))
  }
  const reihe = [...plan.placements].sort((a, b) => a.ladeSchritt - b.ladeSchritt)
  let summe = 0
  let ohneGewicht = 0
  let reisser: string | undefined
  for (const p of reihe) {
    if (p.weightKg === undefined) {
      ohneGewicht += 1
      continue
    }
    summe += p.weightKg
    if (reisser === undefined && summe > v.nutzlastKg) reisser = p.label
  }
  if (reisser === undefined) return bekannt(null)
  return bekannt({ ueberKg: Math.round(summe - v.nutzlastKg), label: reisser, ohneGewicht })
}

/**
 * Die Merkliste der Sicherungsmittel.
 *
 * Eine LISTE und keine Rechnung: welches Mittel ein Stück braucht, hängt an
 * Reibwert, Schwerpunkt und Aufbau, und keines davon steht in diesem
 * Werkzeug. Sie erinnert daran, was mitgehört — sie prüft nicht, ob es
 * gereicht hat.
 */
export function sicherungsmittel(t: Uebersetzen = quelle): string[] {
  return [
    t('load.antiSlip', 'Anti-slip mats under every case that is not wedged'),
    t('load.straps', 'Lashing straps, one pair per row, with the labelled lashing capacity'),
    t('load.bars', 'Blocking bars or a load-securing net towards the door'),
    t('load.edges', 'Edge protectors wherever a strap runs over a corner'),
  ]
}

/** Der Satz, der auf jedem Blatt steht. */
export function haftungshinweis(t: Uebersetzen = quelle): string {
  return t(
    'load.disclaimer',
    'This sheet computes and shows. It grants no clearance: responsibility for load securing stays with the driver and the loader.',
  )
}
