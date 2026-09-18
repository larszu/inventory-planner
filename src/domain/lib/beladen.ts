// ───────────────────────────────────────────────────────────────────────────
// Beladen — der Stand WÄHREND des Ladens, Stück für Stück.
//
// ─── WOFÜR ─────────────────────────────────────────────────────────────────
//
// Ein Ladeplan, den man vorher ansieht und dann ausdruckt, ist ein Bild.
// Beim Laden steht die Crew am Heck, hat die Hände voll und will EINE Antwort:
// wo kommt DAS hier hin. Diese Datei rechnet den Stand, der diese Antwort
// trägt — was schon drin ist, was als Nächstes kommt, und was passiert, wenn
// jemand aus der Reihe lädt.
//
// ─── ZWEI REGELN, DIE HIER HÄNGEN ──────────────────────────────────────────
//
// 1. DER PLAN WIRD NICHT NEU GERECHNET, WENN JEMAND LÄDT. Der Ladeschritt
//    kommt aus dem Packer und bleibt; hier wird nur nachgehalten, was davon
//    schon steht. Ein Plan, der sich beim Laden umsortiert, ist der
//    schnellste Weg, eine Crew zu verlieren.
//
// 2. AUS DER REIHE LADEN WIRD GEMELDET, NICHT VERBOTEN. Wer ein Case
//    einlädt, hat es in der Hand — vielleicht stand der Hänger im Weg,
//    vielleicht ist die Reihenfolge am Dock heute anders. Das Werkzeug sagt,
//    was dadurch schwerer wird („zwei Stücke, die davor stehen sollten,
//    fehlen noch"), und lässt den Menschen entscheiden. Dieselbe Haltung wie
//    beim Reihenfolge-Konflikt im Packer.
//
// REIN: keine Uhr, kein Store, kein IO. Der Zeitstempel kommt von aussen —
// dieselbe Regel wie in `storageMoves.ts` und `faultHistory.ts`.
// ───────────────────────────────────────────────────────────────────────────

import { format, quelle, type Uebersetzen } from '../../i18n/quelle'
import type { LoadPlan, Placement } from './loadPacker'
import type { Ladung, LadungsStueck } from '../types/load'
import type { InventoryItem, InventoryUnit, StorageNode } from '../types/inventory'
import { resolveInventoryCode } from './inventoryScan'

/** Welche Stücke schon im Fahrzeug stehen — Id auf Zeitpunkt. */
export type Geladen = ReadonlyMap<string, string>

/** Den Lade-Stand aus der Ladung lesen. */
export function geladenAus(ladung: Ladung): Map<string, string> {
  const out = new Map<string, string>()
  for (const s of ladung.stuecke) if (s.geladenAm) out.set(s.id, s.geladenAm)
  return out
}

/**
 * Eine Schicht des Ladeplans: alle Stücke, die auf derselben Höhe stehen.
 *
 * WARUM SCHICHTEN UND NICHT NUR EINE LISTE. Beim Laden arbeitet man eine Lage
 * ab und stellt dann die nächste darauf. Wer die Stücke nur als Reihe sieht,
 * merkt nicht, dass er gerade die untere Lage verlässt — und stellt das
 * schwere Case auf eine Lücke.
 *
 * Die Höhe ist der Schlüssel und nicht eine gezählte Ebene: zwei Cases
 * unterschiedlicher Höhe nebeneinander tragen die nächste Lage auf zwei
 * verschiedenen Niveaus, und das ist eine Tatsache der Ladung und kein
 * Sonderfall.
 */
export interface Schicht {
  /** Höhe der Unterkante in Millimetern. */
  yMm: number
  placements: Placement[]
}

/** Die Schichten eines Plans, von unten nach oben. */
export function schichten(plan: LoadPlan): Schicht[] {
  const nachY = new Map<number, Placement[]>()
  for (const p of plan.placements) {
    const liste = nachY.get(p.position.y)
    if (liste) liste.push(p)
    else nachY.set(p.position.y, [p])
  }
  return [...nachY.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([yMm, placements]) => ({
      yMm,
      placements: [...placements].sort((a, b) => a.ladeSchritt - b.ladeSchritt),
    }))
}

/**
 * Das nächste Stück nach Plan — oder `undefined`, wenn alles steht.
 *
 * „Nach Plan" heisst: der kleinste Ladeschritt, der noch nicht geladen ist.
 * Nicht etwa der nächste nach dem zuletzt geladenen — wer eines übersprungen
 * hat, soll es wiedersehen und nicht verlieren.
 */
export function naechstes(plan: LoadPlan, geladen: Geladen): Placement | undefined {
  return [...plan.placements]
    .filter((p) => !geladen.has(p.stueckId))
    .sort((a, b) => a.ladeSchritt - b.ladeSchritt)[0]
}

export interface Fortschritt {
  gesamt: number
  geladen: number
  /** Gewicht der geladenen Stücke, soweit angegeben. */
  geladenKg: number
  /** Wieviele geladene Stücke kein Gewicht tragen. */
  ohneGewicht: number
}

export function fortschritt(plan: LoadPlan, geladen: Geladen, stuecke: readonly LadungsStueck[]): Fortschritt {
  const kg = new Map(stuecke.map((s) => [s.id, s.dimensions?.weightKg]))
  let geladenKg = 0
  let ohneGewicht = 0
  for (const p of plan.placements) {
    if (!geladen.has(p.stueckId)) continue
    const g = kg.get(p.stueckId)
    if (g === undefined) ohneGewicht += 1
    else geladenKg += g
  }
  return { gesamt: plan.placements.length, geladen: geladen.size, geladenKg, ohneGewicht }
}

/**
 * Was dagegen spricht, dieses Stück JETZT zu laden.
 *
 * Kein Verbot, ein Befund. Zwei Dinge werden geprüft, und beide sind
 * körperlich und nicht formal:
 *
 *   davor    Stücke mit kleinerem Ladeschritt, die noch fehlen. Sie stehen
 *            weiter hinten im Laderaum; wer sie überspringt, muss später an
 *            diesem Case vorbei.
 *   darunter Stücke, auf denen dieses steht. Sie fehlen nicht nur — ohne sie
 *            steht dieses hier in der Luft.
 *
 * Die zweite ist die härtere: „davor" kostet Zeit, „darunter" geht gar nicht.
 */
export interface LadeBefund {
  /** Stücke mit kleinerem Ladeschritt, die noch fehlen. */
  davor: Placement[]
  /** Stücke, die dieses tragen und noch fehlen. */
  darunter: Placement[]
}

export function befundFuer(plan: LoadPlan, geladen: Geladen, stueckId: string): LadeBefund {
  const p = plan.placements.find((x) => x.stueckId === stueckId)
  if (!p) return { davor: [], darunter: [] }

  const davor = plan.placements.filter(
    (o) => o.ladeSchritt < p.ladeSchritt && !geladen.has(o.stueckId),
  )

  // Träger: Oberkante liegt genau auf der Unterkante dieses Stücks, und die
  // Grundrisse überlappen. Dieselbe Bedingung wie `stuetzAnteil` im Packer,
  // nur als Ja/Nein — die Prozente hat der Packer schon geprüft.
  const darunter =
    p.position.y === 0
      ? []
      : plan.placements.filter(
          (o) =>
            o.position.y + o.sizeMm.y === p.position.y &&
            o.position.x < p.position.x + p.sizeMm.x &&
            p.position.x < o.position.x + o.sizeMm.x &&
            o.position.z < p.position.z + p.sizeMm.z &&
            p.position.z < o.position.z + o.sizeMm.z &&
            !geladen.has(o.stueckId),
        )

  return { davor, darunter }
}

/** Den Befund als Satz. Leer, wenn nichts dagegen spricht. */
export function befundText(b: LadeBefund, t: Uebersetzen = quelle): string {
  if (b.darunter.length > 0) {
    return format(
      t('loading.missingBelow', 'It stands on {n} pieces that are not loaded yet: {labels}'),
      { n: b.darunter.length, labels: b.darunter.map((p) => p.label).join(', ') },
    )
  }
  if (b.davor.length > 0) {
    return format(
      t('loading.outOfOrder', '{n} pieces should go in before this one — you will have to reach past it later.'),
      { n: b.davor.length },
    )
  }
  return ''
}

/** Was ein gescannter Code in DIESER Ladung bedeutet. */
export type ScanErgebnis =
  | { art: 'stueck'; stueck: LadungsStueck }
  | { art: 'nicht-in-ladung'; was: string }
  | { art: 'unbekannt' }

/**
 * Einen gescannten Code auf ein Stück DIESER Ladung auflösen.
 *
 * Drei Ausgänge und nicht zwei. „Kenne ich nicht" und „kenne ich, gehört aber
 * nicht zu dieser Fahrt" sind für den Ladenden zwei verschiedene Lagen: das
 * eine ist ein kaputter Aufkleber, das andere ein Case, das jemand
 * versehentlich zum falschen LKW getragen hat. Beides als „unbekannt" zu
 * melden verschweigt den zweiten Fall — und der ist der teurere.
 */
export function scanInLadung(
  code: string,
  ladung: Ladung,
  quellen: { items: InventoryItem[]; nodes: StorageNode[]; units: InventoryUnit[] },
): ScanErgebnis {
  const treffer = resolveInventoryCode(code, quellen)
  if (!treffer) return { art: 'unbekannt' }

  // Eine Einheit gehört zu ihrem Artikel; gefahren wird der Artikel.
  const nodeId = treffer.kind === 'node' ? treffer.node.id : undefined
  const itemId =
    treffer.kind === 'item' ? treffer.item.id : treffer.kind === 'unit' ? treffer.unit.itemId : undefined

  const stueck = ladung.stuecke.find(
    (s) => (nodeId !== undefined && s.nodeId === nodeId) || (itemId !== undefined && s.itemId === itemId),
  )
  if (stueck) return { art: 'stueck', stueck }

  const was =
    treffer.kind === 'node'
      ? treffer.node.name
      : treffer.kind === 'item'
        ? treffer.item.model
        : (treffer.unit.houseRef ?? treffer.unit.serial ?? treffer.unit.code ?? '')
  return { art: 'nicht-in-ladung', was }
}

/**
 * Welche Rolle ein Stück beim Laden gerade spielt.
 *
 * EIN WORTSCHATZ FÜR ALLE ANSICHTEN. Die 3D-Ansicht, der Streifen und die
 * Lagen-Liste sagen dasselbe; hätte jede ihre eigenen Namen, wäre die erste
 * Frage bei jeder Änderung, welche davon gemeint ist.
 */
export type LadeRolle = 'geladen' | 'aktuell' | 'offen'

export interface KarussellEintrag {
  placement: Placement
  rolle: LadeRolle
}

/**
 * Der Lade-Streifen: alles in Plan-Reihenfolge, mit Rolle.
 *
 * ─── WARUM ALLES UND KEIN FENSTER ──────────────────────────────────────────
 *
 * Es wäre naheliegend, nur „zwei davor, drei danach" zu liefern. Das wäre
 * aber genau die Entscheidung, die der Streifen dem Menschen abnimmt: wer
 * eine Kiste sucht, die er vor zehn Minuten eingeladen hat, findet sie dann
 * nicht mehr. Die Liste ist vollständig und rollt; welcher Ausschnitt im
 * Bild steht, entscheidet die Oberfläche und nicht diese Rechnung.
 *
 * ─── „AKTUELL" IST KEIN GESPEICHERTER ZUSTAND ──────────────────────────────
 *
 * Es ist schlicht das nächste Stück nach Plan — das, was das Werkzeug
 * gerade verlangt. Ein eigener Zustand „wird gerade geladen" müsste
 * gespeichert und wieder aufgeräumt werden, und ein Stück, das darin
 * hängenbleibt (jemand legt es wieder hin, das Telefon geht aus), wäre
 * danach weder drin noch draussen. Solange es keinen zweiten Scan beim
 * AUFNEHMEN gibt, ist „aktuell" eine Ableitung — und eine Ableitung kann
 * nicht hängenbleiben.
 *
 * ─── EIN ÜBERSPRUNGENES STÜCK BLEIBT AN SEINEM PLATZ ───────────────────────
 *
 * Wer aus der Reihe lädt, sieht das geladene Stück weiter dort, wo der Plan
 * es vorsah — als erledigt. Es nach vorn zu sortieren würde die Plan-
 * Reihenfolge verfälschen, und die ist das Einzige, woran sich beim Abladen
 * jemand orientieren kann.
 */
export function karussell(plan: LoadPlan, geladen: Geladen): KarussellEintrag[] {
  const aktuell = naechstes(plan, geladen)
  return [...plan.placements]
    .sort((a, b) => a.ladeSchritt - b.ladeSchritt)
    .map((placement) => ({
      placement,
      rolle: geladen.has(placement.stueckId)
        ? ('geladen' as const)
        : placement.stueckId === aktuell?.stueckId
          ? ('aktuell' as const)
          : ('offen' as const),
    }))
}
