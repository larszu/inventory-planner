// ───────────────────────────────────────────────────────────────────────────
// Der Ausbau der Cases — Innenmass, Wandstärke, Steg.
//
// Eigener Speicher und eigener Schlüssel wie bei Fahrzeugen und Hallen-
// flächen: Stammdaten des Hauses, kein Bestand. Und hier zusätzlich mit dem
// Grund, der in `types/caseAusbau.ts` ausführlich steht — der Ausbau reist
// NICHT im portablen Format mit.
//
// Abgelegt als Abbildung `nodeId -> CaseAusbau` und nicht als Liste: es gibt
// höchstens einen Ausbau je Case, und eine Liste könnte zwei enthalten.
// ───────────────────────────────────────────────────────────────────────────
import { create } from 'zustand'
import { STORAGE_KEYS } from '../../lib/storageKeys'
import {
  AUSBAU_ARTEN,
  type AusbauArt,
  type CaseAusbau,
  type CaseInnenmass,
  type DividerRaster,
  type RackAusbau,
  type Schublade,
} from '../types/caseAusbau'

const zahl = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined

/**
 * Ein Innenmass lesen.
 *
 * TEILANGABEN BLEIBEN TEILANGABEN. Wer nur die Breite gemessen hat, hat die
 * Breite gemessen — `innenmass()` sagt dann, dass das Mass nicht vollständig
 * ist, statt die fehlenden zu erfinden.
 */
const healInnen = (raw: unknown): CaseInnenmass | undefined => {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Partial<CaseInnenmass>
  const mm: CaseInnenmass = {
    widthMm: zahl(r.widthMm),
    heightMm: zahl(r.heightMm),
    depthMm: zahl(r.depthMm),
  }
  return mm.widthMm || mm.heightMm || mm.depthMm ? mm : undefined
}

const ARTEN = new Set<AusbauArt>(AUSBAU_ARTEN)

/** Eine Teilung lesen. Nur positive Masse; eine Spalte von 0 mm ist keine. */
const healRaster = (raw: unknown): DividerRaster | undefined => {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Partial<DividerRaster>
  const liste = (v: unknown): number[] =>
    Array.isArray(v) ? v.filter((n): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0) : []
  const spaltenMm = liste(r.spaltenMm)
  const reihenMm = liste(r.reihenMm)
  return spaltenMm.length || reihenMm.length ? { spaltenMm, reihenMm } : undefined
}

/**
 * Einen Auszug lesen.
 *
 * OHNE NAMEN GIBT ES IHN NICHT: eine namenlose Schublade in einer Liste von
 * Schubladen lässt sich nicht ansprechen. Die HÖHE darf dagegen fehlen —
 * `schubladenPlan` nennt den Auszug dann, statt eine zu erfinden.
 */
const healSchublade = (raw: unknown): Schublade | null => {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<Schublade>
  if (typeof r.name !== 'string' || !r.name.trim()) return null
  const innenRoh = r.innen as Partial<Schublade['innen']> | undefined
  return {
    id: typeof r.id === 'string' && r.id ? r.id : `sch-${Math.random().toString(36).slice(2, 10)}`,
    name: r.name.trim(),
    hoeheMm: zahl(r.hoeheMm),
    innen:
      innenRoh && (innenRoh.art === 'schaum' || innenRoh.art === 'divider')
        ? {
            art: innenRoh.art,
            stegMm: zahl(innenRoh.stegMm),
            raster: healRaster(innenRoh.raster),
          }
        : undefined,
  }
}

const healRack = (raw: unknown): RackAusbau | undefined => {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Partial<RackAusbau>
  const rack: RackAusbau = {
    // Ganzzahlig: eine halbe Höheneinheit gibt es nicht.
    hoeheHE: typeof r.hoeheHE === 'number' && Number.isFinite(r.hoeheHE) && r.hoeheHE > 0
      ? Math.round(r.hoeheHE)
      : undefined,
    nutzbareTiefeMm: zahl(r.nutzbareTiefeMm),
    planRef: typeof r.planRef === 'string' && r.planRef.trim() ? r.planRef.trim() : undefined,
  }
  return rack.hoeheHE || rack.nutzbareTiefeMm || rack.planRef ? rack : undefined
}

export const healAusbau = (raw: unknown): CaseAusbau | null => {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<CaseAusbau>
  if (typeof r.nodeId !== 'string' || !r.nodeId) return null
  const schubladen = Array.isArray(r.schubladen)
    ? r.schubladen.map(healSchublade).filter((s): s is Schublade => s !== null)
    : undefined
  const a: CaseAusbau = {
    nodeId: r.nodeId,
    art: ARTEN.has(r.art as AusbauArt) ? (r.art as AusbauArt) : undefined,
    innenMm: healInnen(r.innenMm),
    wandstaerkeMm: zahl(r.wandstaerkeMm),
    stegMm: typeof r.stegMm === 'number' && Number.isFinite(r.stegMm) && r.stegMm >= 0 ? r.stegMm : undefined,
    raster: healRaster(r.raster),
    schubladen: schubladen && schubladen.length ? schubladen : undefined,
    rack: healRack(r.rack),
    vorlageId: typeof r.vorlageId === 'string' && r.vorlageId ? r.vorlageId : undefined,
    notes: typeof r.notes === 'string' ? r.notes : undefined,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : new Date().toISOString(),
  }
  // Ein Eintrag, der NICHTS sagt, ist keiner. Er stünde sonst in der Liste
  // und sähe aus wie eine Angabe.
  const leer =
    !a.art &&
    !a.innenMm &&
    a.wandstaerkeMm === undefined &&
    a.stegMm === undefined &&
    !a.raster &&
    !a.schubladen &&
    !a.rack &&
    !a.vorlageId &&
    !a.notes
  return leer ? null : a
}

const laden = (): Record<string, CaseAusbau> => {
  try {
    const roh = localStorage.getItem(STORAGE_KEYS.caseAusbau)
    if (!roh) return {}
    const parsed: unknown = JSON.parse(roh)
    if (!parsed || typeof parsed !== 'object') return {}
    const out: Record<string, CaseAusbau> = {}
    for (const wert of Object.values(parsed as Record<string, unknown>)) {
      const a = healAusbau(wert)
      if (a) out[a.nodeId] = a
    }
    return out
  } catch {
    return {}
  }
}

const sichern = (ausbau: Record<string, CaseAusbau>) => {
  try {
    localStorage.setItem(STORAGE_KEYS.caseAusbau, JSON.stringify(ausbau))
  } catch {
    // Wie in den anderen Speichern: die Sitzung läuft weiter, der Stand ist
    // nur nicht dauerhaft.
  }
}

export type AusbauInput = Omit<CaseAusbau, 'nodeId' | 'updatedAt'>

interface CaseAusbauState {
  ausbau: Record<string, CaseAusbau>
  setzeAusbau: (nodeId: string, patch: AusbauInput) => void
  entferneAusbau: (nodeId: string) => void
}

export const useCaseAusbauStore = create<CaseAusbauState>((set, get) => ({
  ausbau: laden(),

  setzeAusbau: (nodeId, patch) => {
    const vorher = get().ausbau[nodeId]
    const a = healAusbau({ ...vorher, ...patch, nodeId, updatedAt: new Date().toISOString() })
    const next = { ...get().ausbau }
    // Wer alle Angaben wieder herausnimmt, hat keinen Ausbau — und dann
    // steht auch keiner da.
    if (a) next[nodeId] = a
    else delete next[nodeId]
    set({ ausbau: next })
    sichern(next)
  },

  entferneAusbau: (nodeId) => {
    const next = { ...get().ausbau }
    delete next[nodeId]
    set({ ausbau: next })
    sichern(next)
  },
}))
