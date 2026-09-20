// ───────────────────────────────────────────────────────────────────────────
// Die Flächen der Halle — Stammdaten des Hauses, kein Bestand.
//
// Eigener Speicher und eigener Schlüssel, aus demselben Grund wie bei den
// Fahrzeugen: wer alle Artikel löscht, hat immer noch dieselbe Halle mit
// denselben Toren. Im Bestands-Blob läge sie bei jedem Schreiben mit an.
// ───────────────────────────────────────────────────────────────────────────
import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { STORAGE_KEYS } from '../../lib/storageKeys'
import { FLAECHEN_ARTEN, type FlaechenArt, type Hallenflaeche } from '../types/halle'
import { healStellplatz } from './inventoryStore'

const ARTEN = new Set<FlaechenArt>(FLAECHEN_ARTEN)

const zahl = (v: unknown, minimum = 1): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v >= minimum ? v : undefined

/**
 * Eine Fläche lesen.
 *
 * OHNE GRUNDFLÄCHE GIBT ES SIE NICHT. Eine Fläche ist ihre Lage; ohne sie
 * wäre sie ein Name, der im Plan nirgends steht — und die Prüfung „steht ein
 * Regal darauf" hätte nichts zu prüfen. Dieselbe Regel wie bei der halb
 * vermessenen Ladeöffnung.
 */
export const healFlaeche = (raw: unknown): Hallenflaeche | null => {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<Hallenflaeche>
  if (typeof r.name !== 'string' || r.name.trim() === '') return null
  if (!ARTEN.has(r.art as FlaechenArt)) return null
  const platz = healStellplatz(r.stellplatz)
  if (!platz) return null

  const now = new Date().toISOString()
  return {
    id: typeof r.id === 'string' && r.id ? r.id : uuidv4(),
    name: r.name.trim(),
    art: r.art as FlaechenArt,
    stellplatz: platz,
    lichtBreiteMm: zahl(r.lichtBreiteMm),
    lichtHoeheMm: zahl(r.lichtHoeheMm),
    notes: typeof r.notes === 'string' ? r.notes : undefined,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : now,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : now,
  }
}

const laden = (): Hallenflaeche[] => {
  try {
    const roh = localStorage.getItem(STORAGE_KEYS.hallenflaechen)
    if (!roh) return []
    const parsed: unknown = JSON.parse(roh)
    return Array.isArray(parsed)
      ? parsed.map(healFlaeche).filter((f): f is Hallenflaeche => f !== null)
      : []
  } catch {
    return []
  }
}

const sichern = (flaechen: Hallenflaeche[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.hallenflaechen, JSON.stringify(flaechen))
  } catch {
    // Wie im Fahrzeug-Store: die Sitzung läuft weiter, der Stand ist nur
    // nicht dauerhaft.
  }
}

export type FlaechenInput = Omit<Hallenflaeche, 'id' | 'createdAt' | 'updatedAt'>

interface HallenState {
  flaechen: Hallenflaeche[]
  addFlaeche: (input: FlaechenInput) => string
  updateFlaeche: (id: string, patch: Partial<FlaechenInput>) => void
  removeFlaeche: (id: string) => void
}

export const useHallenStore = create<HallenState>((set, get) => ({
  flaechen: laden(),

  addFlaeche: (input) => {
    const now = new Date().toISOString()
    const f: Hallenflaeche = { ...input, id: uuidv4(), createdAt: now, updatedAt: now }
    const next = [...get().flaechen, f]
    set({ flaechen: next })
    sichern(next)
    return f.id
  },

  updateFlaeche: (id, patch) => {
    const next = get().flaechen.map((f) =>
      f.id === id ? { ...f, ...patch, updatedAt: new Date().toISOString() } : f,
    )
    set({ flaechen: next })
    sichern(next)
  },

  removeFlaeche: (id) => {
    const next = get().flaechen.filter((f) => f.id !== id)
    set({ flaechen: next })
    sichern(next)
  },
}))
