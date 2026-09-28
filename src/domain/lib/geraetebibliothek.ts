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
// Hochladen (`facetAusArtikel`) und Einlesen (`facetPruefen`) nutzen
// dasselbe Format. Unbekannte Schluessel werden beim Einlesen ignoriert —
// ein neueres Facet soll ein aelteres Lager nicht leer laufen lassen —, ein
// bekannter Schluessel mit falschem Typ macht das Geraet UNGUELTIG: es
// erscheint nicht in der Liste, sondern in der Zahl der ungueltigen.
// ───────────────────────────────────────────────────────────────────────────
import type {
  LibraryErrorCode,
  LibraryPlanner,
  ProposalCore,
  SyncDevice,
  SyncResponse,
  UploadState,
} from '../../lib/deviceLibraryClient'
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
  /** Der Server, zu dem dieser Stand gehoert. Jeder Server hat seinen eigenen
   *  Stand; ein Wechsel loescht den des anderen nicht (siehe `ServerStand`). */
  server: string
  latestSeq: number
  eintraege: Record<string, BibliotheksEintrag>
  /** Slugs, deren Facet die Pruefung nicht bestanden hat. */
  ungueltig: string[]
}

export const leererCache = (server: string): BibliotheksCache => ({ server, latestSeq: 0, eintraege: {}, ungueltig: [] })

/**
 * Was je Server-Adresse liegen bleibt: der Cache, wann er zuletzt abgeglichen
 * wurde, und die Hochlade-Staende (die gehoeren zum Server wie der Cache).
 *
 * Frueher gab es genau einen Stand, und eine andere Adresse hiess: leeren.
 * Wer auf einen Ersatzserver umstellte, weil devices.zumpelars.de gerade
 * nicht lief, und zurueckwechselte, hatte danach eine leere Bibliothek.
 * Jetzt hat jeder Server seinen Platz (Vertrag Punkt 2 in `syncFrom`,
 * `deviceLibraryClient.ts`).
 */
export interface ServerStand {
  cache: BibliotheksCache
  zuletzt?: string
  uploads?: Record<string, HochladeStand>
}

const istCache = (v: unknown, server: string): v is BibliotheksCache => {
  const c = v as Partial<BibliotheksCache> | null
  return (
    !!c &&
    typeof c === 'object' &&
    c.server === server &&
    typeof c.latestSeq === 'number' &&
    !!c.eintraege &&
    typeof c.eintraege === 'object' &&
    Array.isArray(c.ungueltig)
  )
}

/**
 * Die Staende aller Server aus dem Abgelegten lesen. Das Altformat — ein
 * einzelner `cache` mit `zuletzt` und `uploads` daneben — gilt als Platz
 * SEINES Servers (`cache.server`), nicht des gerade eingestellten: so geht
 * beim ersten Start nach dem Umbau nichts verloren. Kaputte Plaetze fallen
 * weg, als gaebe es sie nicht.
 */
export function serverStaendeLesen(ab: {
  jeServer?: unknown
  cache?: unknown
  zuletzt?: string
  uploads?: Record<string, HochladeStand>
}): Record<string, ServerStand> {
  const aus: Record<string, ServerStand> = {}
  const alt = ab.cache as Partial<BibliotheksCache> | undefined
  if (alt && typeof alt.server === 'string' && istCache(alt, alt.server)) {
    aus[alt.server] = { cache: alt, zuletzt: ab.zuletzt, uploads: ab.uploads ?? {} }
  }
  if (ab.jeServer && typeof ab.jeServer === 'object') {
    for (const [server, st] of Object.entries(ab.jeServer as Record<string, Partial<ServerStand>>)) {
      if (st && istCache(st.cache, server)) aus[server] = { cache: st.cache, zuletzt: st.zuletzt, uploads: st.uploads ?? {} }
    }
  }
  return aus
}

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

export const istDatenblattLink = (url: string): boolean => {
  try {
    const u = new URL(url.trim())
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

/** Kern und Facet eines Artikels. Hersteller, Kategorie und Link prueft `hochladeKandidaten`. */
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

/**
 * Ein Fehler der Bibliothek, wie das Lager ihn meldet: die Codes des Clients
 * plus `server-empty` — der Server wurde neu aufgesetzt und hat nichts, der
 * lokale Stand bleibt (`syncFrom` wirft dafuer `LibraryError('server', 200,
 * 'server-empty')`, eigener Text, weil „Fehler, spaeter erneut" hier falsch
 * waere: spaeter ist der Server genauso leer).
 */
export type BibliothekFehlerCode = LibraryErrorCode | 'server-empty'

/** Was eine Fehlermeldung der Bibliothek fuer den Nutzer heisst. */
export function bibliothekFehlerText(code: BibliothekFehlerCode, t: Uebersetzen = quelle): string {
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
      return t('library.error.offline', 'The library server cannot be reached. The devices from the last sync stay available; check the connection and the server address.')
    case 'server-empty':
      return t('library.error.serverEmpty', 'The library server was set up anew and has no devices yet. The local devices from the last sync were kept.')
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

// ─── Hochladen eigener Artikeltypen ────────────────────────────────────────
//
// Jeder Lagerartikel mit Hersteller und Modell geht als Typ in die
// Bibliothek — im selben Facet-Format wie oben, dazu ein Kern mit
// Datenblattlink, Rackhoehe und Leistung. Diese drei stehen NICHT am
// `InventoryItem`: ein Feld dort waere ein Versionssprung des portablen
// Formats `avplan-inventory` in allen Planern. Sie liegen deshalb als
// `TypAngaben` je Artikel-Id im Bibliotheks-Speicher.

export interface TypAngaben {
  sourceUrl?: string
  rackUnits?: number
  powerWatts?: number
}

export type HochladeSperre = 'sourceUrl' | 'category'

export interface HochladeKandidat {
  itemId: string
  item: { localId: string; core: ProposalCore; facet: Record<string, unknown> }
  hash: string
}

/** Wer hochgeht, wer gesperrt ist — Artikel ohne Hersteller zaehlen nicht mit. */
export function hochladeKandidaten(
  items: readonly InventoryItem[],
  angaben: Readonly<Record<string, TypAngaben>>,
): { bereit: HochladeKandidat[]; gesperrt: { itemId: string; grund: HochladeSperre }[] } {
  const bereit: HochladeKandidat[] = []
  const gesperrt: { itemId: string; grund: HochladeSperre }[] = []
  for (const i of items) {
    if (!text(i.manufacturer) || !text(i.model)) continue
    const a = angaben[i.id] ?? {}
    if (!text(i.category)) {
      gesperrt.push({ itemId: i.id, grund: 'category' })
      continue
    }
    if (!istDatenblattLink(a.sourceUrl ?? '')) {
      gesperrt.push({ itemId: i.id, grund: 'sourceUrl' })
      continue
    }
    const { core, facet } = vorschlagAusArtikel(i, a.sourceUrl!)
    if (typeof a.rackUnits === 'number' && Number.isInteger(a.rackUnits) && a.rackUnits >= 0 && a.rackUnits <= 60) {
      core.rackUnits = a.rackUnits
    }
    if (typeof a.powerWatts === 'number' && Number.isFinite(a.powerWatts) && a.powerWatts >= 0) core.powerWatts = a.powerWatts
    const item = { localId: i.id, core, facet: { ...facet } }
    bereit.push({ itemId: i.id, item, hash: inhaltsHash({ core, facet }) })
  }
  return { bereit, gesperrt }
}

/** Stabiler Hash (FNV-1a, Schluessel sortiert) — merkt, ob sich ein Typ seit dem letzten Hochladen geaendert hat. */
export function inhaltsHash(wert: unknown): string {
  const stabil = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(stabil)
      : v && typeof v === 'object'
        ? Object.fromEntries(
            Object.keys(v as object)
              .sort()
              .map((k) => [k, stabil((v as Record<string, unknown>)[k])]),
          )
        : v
  const s = JSON.stringify(stabil(wert))
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

/** Befunde der Bibliothek (Pruefbefunde oder Schema-Fehler) als eine Zeile. */
export function befundeText(befunde: unknown): string {
  if (!Array.isArray(befunde)) return ''
  return befunde
    .map((b) => {
      const o = (b ?? {}) as Record<string, unknown>
      if (o.blocking === false) return ''
      return String(o.detail ?? o.message ?? o.kind ?? '')
    })
    .filter(Boolean)
    .join('; ')
}

/** Was beim letzten Hochladen eines Artikels herauskam. */
export interface HochladeStand {
  hash: string
  state: UploadState
  slug?: string
  detail?: string
  /** Stand in der Moderation laut Server; fehlt bei aelteren Staenden. */
  moderation?: 'pending' | 'approved'
  at: string
}

const WARTENDE: readonly UploadState[] = ['created', 'edit-proposed', 'pending-updated']

/**
 * Wartet dieser Stand noch auf die Moderation? Dann schickt ihn der naechste
 * Lauf erneut — unveraendert, nur um den Stand dort abzufragen.
 */
export const wartetAufModeration = (st: HochladeStand | undefined): boolean =>
  !!st && (st.moderation === 'pending' || (st.moderation === undefined && WARTENDE.includes(st.state)))

/** Die Statuszeile eines eigenen Artikels in der Bibliothek. */
export function hochladeStatusText(
  sperre: HochladeSperre | undefined,
  stand: HochladeStand | undefined,
  aktuellerHash: string | undefined,
  t: Uebersetzen = quelle,
): string {
  if (sperre === 'sourceUrl') return t('library.up.blockedLink', 'Blocked: datasheet link missing')
  if (sperre === 'category') return t('library.up.blockedCategory', 'Blocked: category missing')
  if (!stand) return t('library.up.never', 'Not uploaded yet')
  if (aktuellerHash && stand.hash !== aktuellerHash) return t('library.up.changed', 'Changed — waiting for upload')
  if (stand.state !== 'blocked' && stand.state !== 'error') {
    if (stand.moderation === 'approved') return t('library.up.approved', 'Live in the library')
    if (stand.moderation === 'pending' && stand.state === 'in-sync') {
      return t('library.up.inSyncPending', 'Uploaded, waiting for moderation')
    }
  }
  switch (stand.state) {
    case 'created':
      return t('library.up.created', 'Submitted, waiting for moderation')
    case 'edit-proposed':
      return t('library.up.editProposed', 'Proposed as the next version of an existing device')
    case 'pending-updated':
      return t('library.up.pendingUpdated', 'Open proposal updated, waiting for moderation')
    case 'approved':
      return t('library.up.approved', 'Live in the library')
    case 'in-sync':
      return t('library.up.inSync', 'In sync with the library')
    case 'blocked':
      return t('library.up.blocked', 'Blocked by the library checks')
    default:
      return t('library.up.error', 'Upload failed')
  }
}
