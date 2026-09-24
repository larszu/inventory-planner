// ───────────────────────────────────────────────────────────────────────────
// Was der Signal-Plan in seine Racks gebaut hat — hier nur GELESEN.
//
// Das Lager besitzt das leere Rack (`RackAusbau`: HE, Einbautiefe), der Plan
// die Bestückung. Dieser Speicher hält die letzte Datei, die der Plan
// herübergereicht hat (`cable-planner`, Bibliothek → Racks → „Fürs Lager"),
// und nichts sonst. Kein Plan-Modell: nur Höhe, Tiefe, und je Gerät Lage,
// Höhe und Name (ADR-006, `grenze:check`).
//
// EINE NEUE DATEI ERSETZT DEN STAND GANZ. Ein Rack, das der Plan nicht mehr
// schickt, ist dort gelöscht oder umbenannt worden; es hier weiterzuführen
// hiesse, eine Bestückung zu zeigen, die es nicht mehr gibt.
// ───────────────────────────────────────────────────────────────────────────
import { create } from 'zustand'
import { STORAGE_KEYS } from '../../lib/storageKeys'
import { parseRackBelegung, serializeRackBelegung, type PlanRack } from '../../lib/rackBelegungFormat'

interface Gespeichert {
  racks: PlanRack[]
  /** Wann die Datei eingelesen wurde — nicht, wann der Plan sie schrieb. */
  eingelesen?: string
}

const laden = (): Gespeichert => {
  try {
    const roh = localStorage.getItem(STORAGE_KEYS.planRacks)
    if (!roh) return { racks: [] }
    const p = JSON.parse(roh) as { datei?: unknown; eingelesen?: unknown }
    // Gespeichert wird im Austauschformat selbst: dieselbe Heilung wie beim
    // Einlesen, keine zweite.
    const racks = typeof p.datei === 'string' ? parseRackBelegung(p.datei) : null
    return {
      racks: racks ?? [],
      eingelesen: typeof p.eingelesen === 'string' ? p.eingelesen : undefined,
    }
  } catch {
    return { racks: [] }
  }
}

const sichern = (g: Gespeichert) => {
  try {
    localStorage.setItem(
      STORAGE_KEYS.planRacks,
      JSON.stringify({ datei: serializeRackBelegung(g.racks), eingelesen: g.eingelesen }),
    )
  } catch {
    // Die Sitzung läuft weiter, der Stand ist nur nicht dauerhaft.
  }
}

interface PlanRackState extends Gespeichert {
  /** `false`, wenn die Datei keine Rack-Belegung ist. */
  einlesen: (json: string, jetzt?: string) => boolean
  vergessen: () => void
}

export const usePlanRackStore = create<PlanRackState>((set) => ({
  ...laden(),

  einlesen: (json, jetzt = new Date().toISOString()) => {
    const racks = parseRackBelegung(json)
    if (!racks) return false
    const g = { racks, eingelesen: jetzt }
    set(g)
    sichern(g)
    return true
  },

  vergessen: () => {
    set({ racks: [], eingelesen: undefined })
    try {
      localStorage.removeItem(STORAGE_KEYS.planRacks)
    } catch {
      // wie oben
    }
  },
}))
