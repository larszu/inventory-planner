// ───────────────────────────────────────────────────────────────────────────
// Fahrzeuge — eigener Store, eigener Schlüssel
//
// WARUM NICHT IM BESTAND. Ein Fahrzeug ist kein Lagerartikel. Es überdauert
// jeden Bestand, es gehört der Disposition, und wer alle Artikel löscht, hat
// immer noch dieselben Fahrzeuge. Im Bestands-Blob hätte ausserdem jedes
// Schreiben am Bestand die Fahrzeuge mit angefasst — für Daten, die damit
// nichts zu tun haben. Dieselbe Begründung wie bei den Fristarten.
//
// WAS DIESER STORE NICHT TUT. Er disponiert nicht. Kein Kalender, keine
// Fahrerzuordnung, keine Buchung — das Fahrzeug ist hier ein Laderaum mit
// Achsen, kein Betriebsmittel mit Terminen. Wenn Disposition kommt, wird sie
// ein eigenes Werkzeug und liest diese Stammdaten.
// ───────────────────────────────────────────────────────────────────────────

import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { STORAGE_KEYS } from '../../lib/storageKeys'
import type {
  Achse,
  Axle,
  CargoAperture,
  CargoObstruction,
  Kantenform,
  Seite,
  Vehicle,
  VehicleKind,
} from '../types/vehicle'

export type VehicleInput = Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>

const KINDS = new Set<VehicleKind>([
  'kofferraum',
  'kombi',
  'transporter',
  'koffer35',
  'lkw75',
  'lkw12',
  'sattelzug',
  'anhaenger',
])

const OBSTRUCTION_KINDS = new Set<CargoObstruction['kind']>([
  'radkasten',
  'sitzbank',
  'ersatzrad',
  'aufbau',
  'sonstiges',
])

const KLASSEN = new Set<NonNullable<Vehicle['fuehrerscheinKlasse']>>(['B', 'BE', 'C1', 'C1E', 'C', 'CE'])

/** Positive Zahl oder nichts — nichts erfinden. */
const num = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined

const xyz = (v: unknown): { x: number; y: number; z: number } | undefined => {
  if (!v || typeof v !== 'object') return undefined
  const q = v as Record<string, unknown>
  const g = (k: string): number | undefined =>
    typeof q[k] === 'number' && Number.isFinite(q[k]) ? (q[k] as number) : undefined
  const x = g('x')
  const y = g('y')
  const z = g('z')
  return x !== undefined && y !== undefined && z !== undefined ? { x, y, z } : undefined
}

const healObstruction = (raw: unknown): CargoObstruction | null => {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<CargoObstruction>
  const origin = xyz(r.originMm)
  const size = xyz(r.sizeMm)
  if (typeof r.name !== 'string' || !r.name.trim() || !origin || !size) return null
  return {
    name: r.name.trim(),
    kind: OBSTRUCTION_KINDS.has(r.kind as CargoObstruction['kind'])
      ? (r.kind as CargoObstruction['kind'])
      : 'sonstiges',
    originMm: origin,
    sizeMm: size,
  }
}

const healAperture = (raw: unknown): CargoAperture | undefined => {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Partial<CargoAperture>
  const w = num(r.widthMm)
  const h = num(r.heightMm)
  // Halb vermessen ist nicht vermessen: eine Öffnung mit nur einer Kante
  // liesse `passtDurchOeffnung` gegen eine erfundene zweite prüfen.
  if (w === undefined || h === undefined) return undefined
  return { widthMm: w, heightMm: h, sillHeightMm: num(r.sillHeightMm) }
}

const healAxle = (raw: unknown): Axle | null => {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<Axle>
  const pos = typeof r.positionMm === 'number' && Number.isFinite(r.positionMm) ? r.positionMm : undefined
  const max = num(r.maxLastKg)
  if (pos === undefined || max === undefined) return null
  // `leergewichtKg` ist einzeln optional: eine Achse mit zulässiger Last und
  // ohne gewogene Leerlast ist ein gültiger Stammdatensatz — sie sagt dann
  // eben nur, was die Ladung beiträgt.
  return { positionMm: pos, maxLastKg: max, leergewichtKg: num(r.leergewichtKg) }
}

/** Heilt ein geladenes Fahrzeug. Ohne Laderaum-Masse kein Fahrzeug. */
const ACHSEN = new Set<Achse>(['x', 'y', 'z'])
const SEITEN = new Set<Seite>(['min', 'max'])

/**
 * Eine gebrochene oder gerundete Kante lesen.
 *
 * HALB ANGEGEBEN HEISST GAR NICHT — dieselbe Regel wie bei der halb
 * vermessenen Ladeöffnung und der halb gesetzten Lage eines Stücks. Eine
 * Kante ohne Seite oder ohne Tiefe wäre eine Rundung an einer Stelle, die
 * niemand benennen kann; im Zweifel bleibt die Kante scharf, und das ist die
 * konservative Richtung: sie lässt höchstens Platz ungenutzt.
 */
export const healKante = (raw: unknown): Kantenform | null => {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<Kantenform>
  if (!ACHSEN.has(r.achse as Achse)) return null
  if (r.art !== 'fase' && r.art !== 'rundung') return null
  if (!Array.isArray(r.seiten) || r.seiten.length !== 2) return null
  if (!r.seiten.every((x) => SEITEN.has(x as Seite))) return null
  const a = num(r.aMm)
  const b = num(r.bMm)
  if (a === undefined || b === undefined || a <= 0 || b <= 0) return null
  return {
    achse: r.achse as Achse,
    seiten: [r.seiten[0] as Seite, r.seiten[1] as Seite],
    art: r.art,
    aMm: a,
    bMm: b,
    name: typeof r.name === 'string' && r.name.trim() ? r.name.trim() : undefined,
  }
}

export const healVehicle = (raw: unknown): Vehicle | null => {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<Vehicle>
  if (typeof r.name !== 'string' || r.name.trim() === '') return null
  if (!KINDS.has(r.kind as VehicleKind)) return null

  const c = r.cargoMm as Partial<Vehicle['cargoMm']> | undefined
  const l = num(c?.lengthMm)
  const w = num(c?.widthMm)
  const h = num(c?.heightMm)
  if (l === undefined || w === undefined || h === undefined) return null

  const now = new Date().toISOString()
  return {
    id: typeof r.id === 'string' && r.id ? r.id : uuidv4(),
    name: r.name.trim(),
    kind: r.kind as VehicleKind,
    cargoMm: { lengthMm: l, widthMm: w, heightMm: h },
    kanten: Array.isArray(r.kanten)
      ? r.kanten.map(healKante).filter((k): k is Kantenform => k !== null)
      : undefined,
    obstructions: Array.isArray(r.obstructions)
      ? r.obstructions.map(healObstruction).filter((o): o is CargoObstruction => o !== null)
      : [],
    aperture: healAperture(r.aperture),
    nutzlastKg: num(r.nutzlastKg),
    leergewichtKg: num(r.leergewichtKg),
    zulGesamtgewichtKg: num(r.zulGesamtgewichtKg),
    axles: Array.isArray(r.axles) ? r.axles.map(healAxle).filter((a): a is Axle => a !== null) : undefined,
    ladeflaecheAbVorderachseMm: num(r.ladeflaecheAbVorderachseMm),
    // 0 überlebt hier ABSICHTLICH als 0 und nicht als `undefined`: „ohne
    // Raster" ist eine Entscheidung und muss die Vorgabe der Klasse
    // überschreiben können.
    rasterMm:
      typeof r.rasterMm === 'number' && Number.isFinite(r.rasterMm) && r.rasterMm >= 0
        ? r.rasterMm
        : undefined,
    flatFloor: typeof r.flatFloor === 'boolean' ? r.flatFloor : undefined,
    hebebuehneKg: num(r.hebebuehneKg),
    fuehrerscheinKlasse: KLASSEN.has(r.fuehrerscheinKlasse as NonNullable<Vehicle['fuehrerscheinKlasse']>)
      ? r.fuehrerscheinKlasse
      : undefined,
    quelle: typeof r.quelle === 'string' && r.quelle.trim() ? r.quelle.trim() : undefined,
    notes: typeof r.notes === 'string' ? r.notes : undefined,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : now,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : now,
  }
}

const laden = (): Vehicle[] => {
  try {
    const roh = localStorage.getItem(STORAGE_KEYS.vehicles)
    if (!roh) return []
    const parsed: unknown = JSON.parse(roh)
    return Array.isArray(parsed) ? parsed.map(healVehicle).filter((v): v is Vehicle => v !== null) : []
  } catch {
    return []
  }
}

const sichern = (vehicles: Vehicle[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.vehicles, JSON.stringify(vehicles))
  } catch {
    // Kein Speicherplatz oder kein localStorage: die Sitzung läuft weiter,
    // der Stand ist nur nicht dauerhaft. Lauter zu scheitern hiesse, dem
    // Lageristen mitten im Beladen die Ansicht wegzunehmen.
  }
}

interface VehicleState {
  vehicles: Vehicle[]
  addVehicle: (input: VehicleInput) => string
  updateVehicle: (id: string, patch: Partial<VehicleInput>) => void
  removeVehicle: (id: string) => void
}

export const useVehicleStore = create<VehicleState>((set, get) => ({
  vehicles: laden(),

  addVehicle: (input) => {
    const now = new Date().toISOString()
    const v: Vehicle = { ...input, id: uuidv4(), createdAt: now, updatedAt: now }
    const next = [...get().vehicles, v]
    set({ vehicles: next })
    sichern(next)
    return v.id
  },

  updateVehicle: (id, patch) => {
    const next = get().vehicles.map((v) =>
      v.id === id ? { ...v, ...patch, updatedAt: new Date().toISOString() } : v,
    )
    set({ vehicles: next })
    sichern(next)
  },

  removeVehicle: (id) => {
    const next = get().vehicles.filter((v) => v.id !== id)
    set({ vehicles: next })
    sichern(next)
  },
}))
