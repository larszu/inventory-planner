// ───────────────────────────────────────────────────────────────────────────
// Die eigenen Case-Vorlagen des Hauses.
//
// Eigener Speicher und eigener Schlüssel wie bei Fahrzeugen und Hallen-
// flächen: Stammdaten, kein Bestand. Wer alle Artikel löscht, hat immer noch
// dieselben ausgemessenen Case-Modelle.
//
// UND SIE SIND HIER DER EIGENTLICHE WERT. Die mitgelieferten Vorlagen tragen
// bewusst keine Masse (siehe `lib/caseKatalog.ts`); erst wenn jemand ein
// Case ausmisst und daraus eine Vorlage macht, steht das Modell mit echten
// Zahlen bereit — und dann für jedes weitere Stück desselben Typs.
// ───────────────────────────────────────────────────────────────────────────
import { create } from 'zustand'
import { STORAGE_KEYS } from '../../lib/storageKeys'
import type { KatalogCase, MassHerkunft } from '../lib/caseKatalog'
import { AUSBAU_ARTEN, type AusbauArt } from '../types/caseAusbau'

const ARTEN = new Set<AusbauArt>(AUSBAU_ARTEN)
const HERKUNFT = new Set<MassHerkunft>(['gemessen', 'hersteller', 'unbekannt'])

const zahl = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined

const masse = (raw: unknown): Record<string, number | undefined> | undefined => {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const m = {
    widthMm: zahl(r.widthMm),
    heightMm: zahl(r.heightMm),
    depthMm: zahl(r.depthMm),
    weightKg: zahl(r.weightKg),
  }
  return m.widthMm || m.heightMm || m.depthMm || m.weightKg ? m : undefined
}

/**
 * Eine Vorlage lesen.
 *
 * OHNE MODELL GIBT ES SIE NICHT. Ein Hersteller allein ist keine Vorlage —
 * „Peli" beschreibt kein Case, und eine Liste voller „Peli" wäre unbenutzbar.
 */
export const healVorlage = (raw: unknown): KatalogCase | null => {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<KatalogCase>
  const modell = typeof r.modell === 'string' ? r.modell.trim() : ''
  if (!modell) return null
  return {
    id: typeof r.id === 'string' && r.id ? r.id : `eigen-${modell.toLowerCase().replace(/\s+/g, '-')}`,
    hersteller: typeof r.hersteller === 'string' ? r.hersteller.trim() : '',
    modell,
    aussenMm: masse(r.aussenMm),
    innenMm: masse(r.innenMm),
    art: ARTEN.has(r.art as AusbauArt) ? (r.art as AusbauArt) : undefined,
    hoeheHE: typeof r.hoeheHE === 'number' && r.hoeheHE > 0 ? Math.round(r.hoeheHE) : undefined,
    einbautiefeMm: zahl(r.einbautiefeMm),
    deckelMm: zahl(r.deckelMm),
    unterteilMm: zahl(r.unterteilMm),
    // Eine unbekannte Herkunft wird `unbekannt` und nicht stillschweigend
    // `gemessen`: der Unterschied ist der Grund, aus dem es das Feld gibt.
    herkunft: HERKUNFT.has(r.herkunft as MassHerkunft) ? (r.herkunft as MassHerkunft) : 'unbekannt',
    quelle: typeof r.quelle === 'string' && r.quelle.trim() ? r.quelle.trim() : undefined,
    eigen: true,
    notes: typeof r.notes === 'string' ? r.notes : undefined,
  }
}

const laden = (): KatalogCase[] => {
  try {
    const roh = localStorage.getItem(STORAGE_KEYS.caseVorlagen)
    if (!roh) return []
    const parsed: unknown = JSON.parse(roh)
    return Array.isArray(parsed)
      ? parsed.map(healVorlage).filter((v): v is KatalogCase => v !== null)
      : []
  } catch {
    return []
  }
}

const sichern = (vorlagen: KatalogCase[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.caseVorlagen, JSON.stringify(vorlagen))
  } catch {
    // Wie in den anderen Speichern: die Sitzung läuft weiter, der Stand ist
    // nur nicht dauerhaft.
  }
}

interface VorlagenState {
  vorlagen: KatalogCase[]
  setzeVorlage: (v: KatalogCase) => void
  entferneVorlage: (id: string) => void
}

export const useCaseVorlagenStore = create<VorlagenState>((set, get) => ({
  vorlagen: laden(),

  setzeVorlage: (v) => {
    const geheilt = healVorlage(v)
    if (!geheilt) return
    // Dieselbe Kennung ersetzt — eine Vorlage je Modell, sonst stünden zwei
    // „Peli 1510" mit verschiedenen Massen nebeneinander.
    const next = [...get().vorlagen.filter((x) => x.id !== geheilt.id), geheilt]
    set({ vorlagen: next })
    sichern(next)
  },

  entferneVorlage: (id) => {
    const next = get().vorlagen.filter((v) => v.id !== id)
    set({ vorlagen: next })
    sichern(next)
  },
}))
