// ───────────────────────────────────────────────────────────────────────────
// Die Ladung — was mitfährt
//
// ─── DREI WEGE HINEIN, UND EINER IST DER VORSPRUNG ─────────────────────────
//
// 1. AUS DEM BESTAND. Container aus dem LPN-Baum auswählen. Ein verschachtelter
//    Container zählt als EIN Stück — wer das Transport-Case lädt, lädt die
//    Cases darin nicht einzeln.
// 2. AUS DEM BEDARF DES PLANS. `BedarfsZeile[]` über `seedAusBedarf` ist der
//    einzige Schreibweg vom Plan hierher (ADR-006).
// 3. AUS CSV. Fremde Manifeste, Sub-Hire, die Liste vom Kunden.
//
// Weg 1 ist der, den ein Tabellen-Import nie hat: der Container weiß, was in
// ihm liegt. Daraus fällt etwas heraus, das kein Ladeplaner kann, der bei
// einer Tabelle anfängt — „Case 7 fehlt" heißt hier automatisch „die
// Ersatz-Funkstrecke fehlt auch".
//
// ─── UND DIE HAUSREGEL ─────────────────────────────────────────────────────
//
// Ein Stück ohne Maße ist keine Standardkiste. Es kommt in die Ladung, aber
// es kommt mit dem Vermerk, dass es nicht gerechnet werden kann — sonst
// entstünde aus einer unvollständigen Liste eine Ladeplanung, die vollständig
// aussieht.
// ───────────────────────────────────────────────────────────────────────────

import type { PhysicalDimensions } from './inventory'
import type { TransportSpec } from './transport'

/** Woher ein Stück in die Ladung kam. */
export type LadungsHerkunft = 'container' | 'artikel' | 'bedarf' | 'csv'

/**
 * Ein Stück auf der Ladung.
 *
 * `nodeId` und `itemId` zeigen zurück in den Bestand, wo es einen gibt.
 * Ein CSV-Stück hat keinen, und das ist in Ordnung — es ist dann eine
 * Position ohne Bestandsbezug und weiß das auch.
 */
export interface LadungsStueck {
  id: string
  label: string
  herkunft: LadungsHerkunft
  /** Container im Lagerbaum, aus dem dieses Stück stammt. */
  nodeId?: string
  /** Bestandsartikel, aus dem dieses Stück stammt. */
  itemId?: string
  quantity: number
  dimensions?: PhysicalDimensions
  transport?: TransportSpec
  /** Freie Abladegruppe (Bühne, Licht, Ton …). Ordnet die Ladereihenfolge. */
  gruppe?: string
  notes?: string
}

export interface Ladung {
  id: string
  name: string
  /** Fahrzeug, für das geplant wird. Leer heißt: noch nicht entschieden. */
  vehicleId?: string
  stuecke: LadungsStueck[]
  createdAt: string
  updatedAt: string
}

/** Warum ein Stück nicht in die Planung eingeht. */
export type UnplanbarGrund = 'keine-masse' | 'kein-gewicht'

/** Ein Stück, das mitfährt, aber nicht gerechnet werden kann. */
export interface Unplanbar {
  stueckId: string
  label: string
  grund: UnplanbarGrund
}
