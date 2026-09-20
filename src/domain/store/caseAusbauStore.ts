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
import type { CaseAusbau, CaseInnenmass } from '../types/caseAusbau'

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

export const healAusbau = (raw: unknown): CaseAusbau | null => {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<CaseAusbau>
  if (typeof r.nodeId !== 'string' || !r.nodeId) return null
  const a: CaseAusbau = {
    nodeId: r.nodeId,
    innenMm: healInnen(r.innenMm),
    wandstaerkeMm: zahl(r.wandstaerkeMm),
    stegMm: typeof r.stegMm === 'number' && Number.isFinite(r.stegMm) && r.stegMm >= 0 ? r.stegMm : undefined,
    notes: typeof r.notes === 'string' ? r.notes : undefined,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : new Date().toISOString(),
  }
  // Ein Eintrag, der NICHTS sagt, ist keiner. Er stünde sonst in der Liste
  // und sähe aus wie eine Angabe.
  if (!a.innenMm && a.wandstaerkeMm === undefined && a.stegMm === undefined && !a.notes) return null
  return a
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
