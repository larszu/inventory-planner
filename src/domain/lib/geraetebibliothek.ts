// ───────────────────────────────────────────────────────────────────────────
// Geraetebibliothek (devices.zumpelars.de) — was das Lager von dort nimmt und
// was es dorthin gibt.
//
// ─── DAS FACET-FORMAT `planners.inventory` ────────────────────────────────
//
// Das Facet ist der ARTIKELTYP dieses Lagers, in dessen eigenen Feldnamen —
// genau die Felder von `InventoryItem`, die das Modell beschreiben und nicht
// das Regal:
//
//   model          string, Pflicht (faellt sonst auf `core.model` zurueck)
//   manufacturer   string
//   category       string
//   dimensions     { widthMm, heightMm, depthMm, weightKg } — Zahlen > 0
//   materialKinds  ('rental' | 'consumable')[]
//   ursprungsland  ISO 3166-1 alpha-2, gross ("DE", "JP")
//
// NICHT darin, weil es am Exemplar oder am Haus haengt: Menge, Mindestmenge,
// Mietpreis, Lieferant, Eigentum, Rueckgabedatum, Code, Lagerort, Notizen,
// Seriennummern, Anschaffung, Versicherungswert, Fristen. `deviceTypeId`
// fehlt auch: die Identitaet in der Bibliothek ist der `slug`.
//
// Einreichen (`facetAusArtikel`) und Einlesen (`facetPruefen`) nutzen
// dasselbe Format. Unbekannte Schluessel werden beim Einlesen ignoriert —
// ein neueres Facet soll ein aelteres Lager nicht leer laufen lassen —, ein
// bekannter Schluessel mit falschem Typ macht das Geraet UNGUELTIG: es
// erscheint nicht in der Liste, sondern in der Zahl der ungueltigen.
// ───────────────────────────────────────────────────────────────────────────
import type { LibraryErrorCode, LibraryPlanner, ProposalCore, SyncDevice, SyncResponse } from '../../lib/deviceLibraryClient'
import { quelle, type Uebersetzen } from '../../i18n/quelle'
import type { InventoryItem, InventoryMaterialKind, PhysicalDimensions } from '../types/inventory'

export const PLANNER: LibraryPlanner = 'inventory'

export type InventoryLibraryFacet = Pick<
  InventoryItem,
  'model' | 'manufacturer' | 'category' | 'dimensions' | 'materialKinds' | 'ursprungsland'
>

/** Ein gueltiges Geraet aus der Bibliothek, so wie es im Cache liegt. */
export interface BibliotheksEintrag {
  slug: string
  version: number
  seq: number
  status: SyncDevice['status']
  confirmations: number
  artikel: InventoryLibraryFacet
  sourceUrl?: string
  rackUnits?: number
  powerWatts?: number
  description?: string
}

export interface BibliotheksCache {
  /** Der Server, zu dem dieser Stand gehoert. Ein anderer Server = leerer Cache. */
  server: string
  latestSeq: number
  eintraege: Record<string, BibliotheksEintrag>
  /** Slugs, deren Facet die Pruefung nicht bestanden hat. */
  ungueltig: string[]
}

export const leererCache = (server: string): BibliotheksCache => ({ server, latestSeq: 0, eintraege: {}, ungueltig: [] })

const MATERIAL: readonly InventoryMaterialKind[] = ['rental', 'consumable']
const MASSE = ['widthMm', 'heightMm', 'depthMm', 'weightKg'] as const

const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
const positiv = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0

/**
 * Prueft ein Facet und fuellt Modell, Hersteller, Kategorie und Gewicht aus
 * dem Kern auf, wo das Facet schweigt. `null` = ungueltig.
 */
export function facetPruefen(facet: unknown, core?: Partial<SyncDevice['core']>): InventoryLibraryFacet | null {
  if (facet === null || typeof facet !== 'object' || Array.isArray(facet)) return null
  const f = facet as Record<string, unknown>

  for (const k of ['model', 'manufacturer', 'category', 'ursprungsland'] as const) {
    if (f[k] !== undefined && typeof f[k] !== 'string') return null
  }
  const model = text(f.model) ?? text(core?.model)
  if (!model) return null

  const aus: InventoryLibraryFacet = { model }
  const manufacturer = text(f.manufacturer) ?? text(core?.manufacturer)
  if (manufacturer) aus.manufacturer = manufacturer
  const category = text(f.category) ?? text(core?.category)
  if (category) aus.category = category

  if (f.dimensions !== undefined) {
    if (f.dimensions === null || typeof f.dimensions !== 'object' || Array.isArray(f.dimensions)) return null
    const d = f.dimensions as Record<string, unknown>
    const masse: PhysicalDimensions = {}
    for (const k of MASSE) {
      if (d[k] === undefined) continue
      if (!positiv(d[k])) return null
      masse[k] = d[k]
    }
    if (Object.keys(masse).length) aus.dimensions = masse
  }
  const kernGewicht = core?.weightKg
  if (aus.dimensions?.weightKg === undefined && positiv(kernGewicht)) {
    aus.dimensions = { ...aus.dimensions, weightKg: kernGewicht }
  }

  if (f.materialKinds !== undefined) {
    if (!Array.isArray(f.materialKinds)) return null
    if (!f.materialKinds.every((m) => MATERIAL.includes(m as InventoryMaterialKind))) return null
    if (f.materialKinds.length) aus.materialKinds = [...new Set(f.materialKinds as InventoryMaterialKind[])]
  }

  if (f.ursprungsland !== undefined) {
    const land = String(f.ursprungsland).trim()
    if (land && !/^[A-Z]{2}$/.test(land)) return null
    if (land) aus.ursprungsland = land
  }
  return aus
}

/** Ein Abgleich-Ergebnis auf den Cache legen — rein, liefert einen neuen Cache. */
export function abgleichAnwenden(cache: BibliotheksCache, antwort: SyncResponse): BibliotheksCache {
  const eintraege = { ...cache.eintraege }
  const ungueltig = new Set(cache.ungueltig)
  for (const g of [...antwort.devices].sort((a, b) => a.seq - b.seq)) {
    delete eintraege[g.slug]
    ungueltig.delete(g.slug)
    if (g.removed) continue
    const artikel = facetPruefen(g.facet, g.core)
    if (!artikel) {
      ungueltig.add(g.slug)
      continue
    }
    const e: BibliotheksEintrag = {
      slug: g.slug,
      version: g.version,
      seq: g.seq,
      status: g.status,
      confirmations: g.confirmations,
      artikel,
    }
    if (text(g.core.sourceUrl)) e.sourceUrl = g.core.sourceUrl
    if (positiv(g.core.rackUnits)) e.rackUnits = g.core.rackUnits
    if (positiv(g.core.powerWatts)) e.powerWatts = g.core.powerWatts
    if (text(g.core.description)) e.description = g.core.description
    eintraege[g.slug] = e
  }
  return {
    server: cache.server,
    latestSeq: Math.max(cache.latestSeq, antwort.latestSeq),
    eintraege,
    ungueltig: [...ungueltig].sort(),
  }
}

/** Der Artikeltyp eines eigenen Artikels, im Facet-Format — nichts vom Exemplar. */
export function facetAusArtikel(item: InventoryItem): InventoryLibraryFacet {
  const f: InventoryLibraryFacet = { model: item.model.trim() }
  if (text(item.manufacturer)) f.manufacturer = item.manufacturer!.trim()
  if (text(item.category)) f.category = item.category!.trim()
  if (item.dimensions) {
    const d: PhysicalDimensions = {}
    for (const k of MASSE) if (positiv(item.dimensions[k])) d[k] = item.dimensions[k]
    if (Object.keys(d).length) f.dimensions = d
  }
  if (item.materialKinds?.length) f.materialKinds = [...item.materialKinds]
  if (text(item.ursprungsland)) f.ursprungsland = item.ursprungsland!.trim().toUpperCase()
  return f
}

export type EinreichenMangel = 'manufacturer' | 'category' | 'sourceUrl'

/** Was fuer einen Vorschlag fehlt. Leer = einreichbar. */
export function einreichenMaengel(item: InventoryItem, sourceUrl: string): EinreichenMangel[] {
  const m: EinreichenMangel[] = []
  if (!text(item.manufacturer)) m.push('manufacturer')
  if (!text(item.category)) m.push('category')
  if (!istDatenblattLink(sourceUrl)) m.push('sourceUrl')
  return m
}

export const istDatenblattLink = (url: string): boolean => {
  try {
    const u = new URL(url.trim())
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

/** Kern und Facet fuer `propose()`. Setzt voraus, dass `einreichenMaengel` leer ist. */
export function vorschlagAusArtikel(
  item: InventoryItem,
  sourceUrl: string,
): { core: ProposalCore; facet: InventoryLibraryFacet } {
  const facet = facetAusArtikel(item)
  const core: ProposalCore = {
    manufacturer: facet.manufacturer ?? '',
    model: facet.model,
    category: facet.category ?? '',
    sourceUrl: sourceUrl.trim(),
  }
  if (facet.dimensions?.weightKg !== undefined) core.weightKg = facet.dimensions.weightKg
  return { core, facet }
}

/**
 * Ein Lagerartikel aus einem Bibliotheksgeraet. Die Menge kommt vom Nutzer:
 * die Bibliothek weiss nicht, wieviel im Regal steht.
 */
export function artikelAusEintrag(e: BibliotheksEintrag, quantity: number): Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'> {
  const a = e.artikel
  return {
    model: a.model,
    quantity,
    ...(a.manufacturer ? { manufacturer: a.manufacturer } : {}),
    ...(a.category ? { category: a.category } : {}),
    ...(a.dimensions ? { dimensions: { ...a.dimensions } } : {}),
    ...(a.materialKinds ? { materialKinds: [...a.materialKinds] } : {}),
    ...(a.ursprungsland ? { ursprungsland: a.ursprungsland } : {}),
  }
}

const schluessel = (hersteller: string | undefined, modell: string) =>
  `${(hersteller ?? '').trim().toLowerCase()}|${modell.trim().toLowerCase()}`

/** Steht dieser Typ schon im Bestand? Verglichen ueber Hersteller + Modell. */
export const imBestand = (e: BibliotheksEintrag, items: readonly InventoryItem[]): boolean => {
  const k = schluessel(e.artikel.manufacturer, e.artikel.model)
  return items.some((i) => schluessel(i.manufacturer, i.model) === k)
}

/**
 * Eine Server-Adresse pruefen und vereinheitlichen. `null` = unbrauchbar.
 * Klartext-HTTP nur fuer den eigenen Rechner: sonst ginge das Passwort offen
 * ueber die Leitung.
 */
export function serverAdresse(roh: string): string | null {
  let u: URL
  try {
    u = new URL(roh.trim())
  } catch {
    return null
  }
  const lokal = u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '[::1]'
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && lokal)) return null
  if (u.search || u.hash || u.username || u.password) return null
  return `${u.origin}${u.pathname.replace(/\/+$/, '')}`
}

/** Was eine Fehlermeldung der Bibliothek fuer den Nutzer heisst. */
export function bibliothekFehlerText(code: LibraryErrorCode, t: Uebersetzen = quelle): string {
  switch (code) {
    case 'wrong-credentials':
      return t('library.error.credentials', 'Sign-in failed: the e-mail, user name or password is not correct.')
    case 'email-not-verified':
      return t('library.error.unverified', 'Confirm your e-mail address first — the link is in the message from the library.')
    case 'guidelines-outdated':
      return t('library.error.guidelines', 'The library guidelines have changed. Accept the new version on the website, then try again.')
    case 'exists':
      return t('library.error.exists', 'This manufacturer and model are already in the library. Confirm the existing entry there instead.')
    case 'wrong-code':
      return t('library.error.code', 'The code is wrong or has expired. Enter the current code from your authenticator app.')
    case 'rate-limited':
      return t('library.error.rate', 'Too many attempts. Wait a minute and try again.')
    case 'not-signed-in':
      return t('library.error.session', 'You are not signed in, or the session has ended. Please sign in again.')
    case 'offline':
      return t('library.error.offline', 'The library server cannot be reached. Check the connection and the server address.')
    default:
      return t('library.error.server', 'The library server answered with an error. Try again later.')
  }
}

/** Die Bestaetigungsstufe eines Geraets, lesbar. */
export function bibliothekStatusText(status: SyncDevice['status'], t: Uebersetzen = quelle): string {
  switch (status) {
    case 'verified':
      return t('library.status.verified', 'verified')
    case 'confirmed':
      return t('library.status.confirmed', 'confirmed')
    case 'disputed':
      return t('library.status.disputed', 'disputed')
    default:
      return t('library.status.unconfirmed', 'unconfirmed')
  }
}

/** Wo man geaenderte Richtlinien neu annimmt. */
export const richtlinienUrl = (server: string) => `${server.replace(/\/+$/, '')}/guidelines`
