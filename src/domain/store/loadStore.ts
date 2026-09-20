// ───────────────────────────────────────────────────────────────────────────
// Ladungen — eigener Store, eigener Schlüssel
//
// Eine Ladung ist Betriebszustand, kein Katalog: sie gehört zu EINER Fahrt und
// nicht zum Bestand, der zwischen den Apps wandert. Dieselbe Begründung wie
// bei den Ausgabescheinen.
// ───────────────────────────────────────────────────────────────────────────

import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { STORAGE_KEYS } from '../../lib/storageKeys'
import type { Ladung, LadungsStueck } from '../types/load'
import type { RasterModus } from '../lib/loadPacker'

const HERKUENFTE = new Set<LadungsStueck['herkunft']>(['container', 'artikel', 'bedarf', 'csv'])

const LAGEN = new Set(['upright', 'onSide', 'onEnd'])

/**
 * Eine von Hand gesetzte Lage — oder nichts.
 *
 * HALB GÜLTIG GIBT ES NICHT. Eine Verankerung ohne vollständige Position
 * wäre eine Kiste, die irgendwo steht; der Packer würde sie dort festhalten,
 * und niemand könnte sagen, wo „dort" ist. Dieselbe Regel wie bei der halb
 * vermessenen Ladeöffnung in `healVehicle`: lieber ganz verwerfen.
 */
const healFixierung = (raw: unknown): LadungsStueck['fixiert'] => {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as { position?: { x?: unknown; y?: unknown; z?: unknown }; lage?: unknown }
  const { x, y, z } = r.position ?? {}
  const zahl = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0
  if (!zahl(x) || !zahl(y) || !zahl(z)) return undefined
  if (typeof r.lage !== 'string' || !LAGEN.has(r.lage)) return undefined
  return { position: { x, y, z }, lage: r.lage as NonNullable<LadungsStueck['fixiert']>['lage'] }
}

const healStueck = (raw: unknown): LadungsStueck | null => {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<LadungsStueck>
  if (typeof r.label !== 'string' || r.label.trim() === '') return null
  if (!HERKUENFTE.has(r.herkunft as LadungsStueck['herkunft'])) return null

  return {
    id: typeof r.id === 'string' && r.id ? r.id : uuidv4(),
    label: r.label.trim(),
    herkunft: r.herkunft as LadungsStueck['herkunft'],
    nodeId: typeof r.nodeId === 'string' && r.nodeId ? r.nodeId : undefined,
    itemId: typeof r.itemId === 'string' && r.itemId ? r.itemId : undefined,
    // Eine Menge ohne Zählung ist nicht null, sondern eins — aber eine
    // ausdrücklich gespeicherte 0 wäre ein Fehler und wird nicht übernommen.
    quantity: typeof r.quantity === 'number' && Number.isFinite(r.quantity) && r.quantity > 0 ? r.quantity : 1,
    dimensions: r.dimensions,
    transport: r.transport,
    gruppe: typeof r.gruppe === 'string' && r.gruppe.trim() ? r.gruppe.trim() : undefined,
    // ─── DIE ZWEI FELDER, DIE HIER BIS 2026-09-18 VERLORENGINGEN ─────────
    //
    // Diese Funktion baut jedes Stück FELD FÜR FELD neu auf. Das ist
    // Absicht — so kommt nichts Unbekanntes aus einer fremden Datei herein.
    // Der Preis ist, dass ein neues Feld hier eingetragen werden MUSS, sonst
    // fällt es beim Laden lautlos heraus.
    //
    // Genau das war passiert: `fixiert` (von Hand gesetzt) und `geladenAm`
    // (schon verstaut) standen im Speicher und waren nach jedem Neuladen
    // weg. Gemessen an einer Ladung mit drei verstauten Stücken: „0 von 10
    // verstaut". Für den Ladenden heisst das, dass er von vorn anfängt,
    // sobald jemand die Seite neu lädt — mitten im Beladen.
    //
    // Dieselbe Falle hat `healNode` schon einmal mit `transport` gestellt
    // (Formatversion 7 -> 8). Wer hier ein Feld ergänzt, ergänzt es AUCH
    // hier; `ladeplanUeberlebtLaden.test.ts` wird sonst rot.
    fixiert: healFixierung(r.fixiert),
    geladenAm: typeof r.geladenAm === 'string' && r.geladenAm ? r.geladenAm : undefined,
    notes: typeof r.notes === 'string' ? r.notes : undefined,
  }
}

const MODI = new Set<RasterModus>(['frei', 'raster', 'gemischt'])

export const healLadung = (raw: unknown): Ladung | null => {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<Ladung>
  if (typeof r.name !== 'string' || r.name.trim() === '') return null

  const now = new Date().toISOString()
  return {
    id: typeof r.id === 'string' && r.id ? r.id : uuidv4(),
    name: r.name.trim(),
    vehicleId: typeof r.vehicleId === 'string' && r.vehicleId ? r.vehicleId : undefined,
    stuecke: Array.isArray(r.stuecke)
      ? r.stuecke.map(healStueck).filter((s): s is LadungsStueck => s !== null)
      : [],
    // Dieselbe Falle eine Ebene höher: ohne diese Zeile stünde nach jedem
    // Neuladen wieder die alphabetische Reihenfolge der Gruppen da, und die
    // von Hand gesetzte Abladereihenfolge wäre weg.
    gruppenReihenfolge: Array.isArray(r.gruppenReihenfolge)
      ? r.gruppenReihenfolge.filter((g): g is string => typeof g === 'string' && g.trim() !== '')
      : undefined,
    rasterModus: MODI.has(r.rasterModus as RasterModus) ? r.rasterModus : undefined,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : now,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : now,
  }
}

const laden = (): Ladung[] => {
  try {
    const roh = localStorage.getItem(STORAGE_KEYS.loads)
    if (!roh) return []
    const parsed: unknown = JSON.parse(roh)
    return Array.isArray(parsed) ? parsed.map(healLadung).filter((l): l is Ladung => l !== null) : []
  } catch {
    return []
  }
}

const sichern = (loads: Ladung[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.loads, JSON.stringify(loads))
  } catch {
    // Wie im Fahrzeug-Store: die Sitzung läuft weiter, der Stand ist nur
    // nicht dauerhaft. Mitten im Beladen die Ansicht wegzunehmen wäre
    // schlimmer als ein verlorener Stand.
  }
}

interface LoadState {
  loads: Ladung[]
  addLadung: (name: string, vehicleId?: string) => string
  setStuecke: (id: string, stuecke: LadungsStueck[]) => void
  addStuecke: (id: string, stuecke: LadungsStueck[]) => void
  setVehicle: (id: string, vehicleId: string | undefined) => void
  /**
   * Ein Stück von Hand absetzen — oder die Verankerung wieder lösen.
   *
   * Eigener Vorgang und keine Nebenwirkung von `setStuecke`: dieselbe
   * Funktion, die eine Gruppe ändert, verschöbe sonst auch Kisten, und keine
   * der beiden Änderungen wäre von der anderen zu unterscheiden. Dieselbe
   * Trennung wie bei `moveItem` gegen `updateItem` im Bestand (Bedarf 106).
   */
  setFixierung: (
    ladungId: string,
    stueckId: string,
    fixiert: LadungsStueck['fixiert'],
  ) => void
  /** Die Abladegruppen in ihrer Reihenfolge setzen (#22). */
  setGruppenReihenfolge: (id: string, gruppen: string[]) => void
  /** Wie streng das Raster des Fahrzeugs für diese Ladung gilt (#21). */
  setRasterModus: (id: string, modus: RasterModus) => void
  /** Die Abladegruppe eines Stücks setzen. */
  setGruppe: (ladungId: string, stueckId: string, gruppe: string | undefined) => void
  /**
   * Ein Stück als eingeladen vermerken — oder den Vermerk zurücknehmen.
   *
   * Der Zeitpunkt kommt von AUSSEN und wird hier nicht erzeugt. Dieselbe
   * Trennung wie überall im Repo: der Store schreibt, die Uhr steht beim
   * Aufrufer, und ein Test kann beides prüfen, ohne die Zeit anzuhalten.
   */
  setGeladen: (ladungId: string, stueckId: string, geladenAm: string | undefined) => void
  removeLadung: (id: string) => void
}

export const useLoadStore = create<LoadState>((set, get) => ({
  loads: laden(),

  addLadung: (name, vehicleId) => {
    const now = new Date().toISOString()
    const l: Ladung = { id: uuidv4(), name: name.trim(), vehicleId, stuecke: [], createdAt: now, updatedAt: now }
    const next = [...get().loads, l]
    set({ loads: next })
    sichern(next)
    return l.id
  },

  setStuecke: (id, stuecke) => {
    const next = get().loads.map((l) =>
      l.id === id ? { ...l, stuecke, updatedAt: new Date().toISOString() } : l,
    )
    set({ loads: next })
    sichern(next)
  },

  addStuecke: (id, stuecke) => {
    const next = get().loads.map((l) =>
      l.id === id ? { ...l, stuecke: [...l.stuecke, ...stuecke], updatedAt: new Date().toISOString() } : l,
    )
    set({ loads: next })
    sichern(next)
  },

  setFixierung: (ladungId, stueckId, fixiert) => {
    const next = get().loads.map((l) =>
      l.id !== ladungId
        ? l
        : {
            ...l,
            stuecke: l.stuecke.map((s) => (s.id === stueckId ? { ...s, fixiert } : s)),
            updatedAt: new Date().toISOString(),
          },
    )
    set({ loads: next })
    sichern(next)
  },

  setRasterModus: (id, modus) => {
    const next = get().loads.map((l) =>
      l.id === id ? { ...l, rasterModus: modus, updatedAt: new Date().toISOString() } : l,
    )
    set({ loads: next })
    sichern(next)
  },

  setGruppenReihenfolge: (id, gruppen) => {
    const next = get().loads.map((l) =>
      l.id === id ? { ...l, gruppenReihenfolge: gruppen, updatedAt: new Date().toISOString() } : l,
    )
    set({ loads: next })
    sichern(next)
  },

  setGruppe: (ladungId, stueckId, gruppe) => {
    const next = get().loads.map((l) =>
      l.id !== ladungId
        ? l
        : {
            ...l,
            stuecke: l.stuecke.map((s) => (s.id === stueckId ? { ...s, gruppe } : s)),
            updatedAt: new Date().toISOString(),
          },
    )
    set({ loads: next })
    sichern(next)
  },

  setGeladen: (ladungId, stueckId, geladenAm) => {
    const next = get().loads.map((l) =>
      l.id !== ladungId
        ? l
        : {
            ...l,
            stuecke: l.stuecke.map((s) => (s.id === stueckId ? { ...s, geladenAm } : s)),
            updatedAt: new Date().toISOString(),
          },
    )
    set({ loads: next })
    sichern(next)
  },

  setVehicle: (id, vehicleId) => {
    const next = get().loads.map((l) =>
      l.id === id ? { ...l, vehicleId, updatedAt: new Date().toISOString() } : l,
    )
    set({ loads: next })
    sichern(next)
  },

  removeLadung: (id) => {
    const next = get().loads.filter((l) => l.id !== id)
    set({ loads: next })
    sichern(next)
  },
}))
