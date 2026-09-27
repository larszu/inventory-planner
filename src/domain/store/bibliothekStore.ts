// ───────────────────────────────────────────────────────────────────────────
// Geraetebibliothek — Konto, Abgleich und Cache.
//
// Die Bibliothek ist eine eigene, schreibgeschuetzte Quelle: was von dort
// kommt, liegt im Cache und NICHT im Bestand. In den Bestand kommt ein
// Artikel erst, wenn jemand ihn aus der Liste anlegt.
//
// DIE SERVER-ADRESSE GEHOERT ZUM TOKEN UND ZUM CACHE. Wird sie geaendert,
// verfallen beide: ein Token gilt nur bei dem Server, der es ausgegeben hat,
// und ein `latestSeq` des einen Servers ist bei einem anderen eine
// beliebige Zahl — der inkrementelle Abgleich liesse dann Geraete aus.
// ───────────────────────────────────────────────────────────────────────────
import { create } from 'zustand'
import {
  DEFAULT_DEVICE_LIBRARY_URL,
  LibraryError,
  currentUser,
  signIn,
  signOut,
  sync,
  upload,
  verifySecondFactor,
  type LibraryErrorCode,
  type LibraryUser,
  type SignInResult,
} from '../../lib/deviceLibraryClient'
import { STORAGE_KEYS } from '../../lib/storageKeys'
import {
  PLANNER,
  abgleichAnwenden,
  befundeText,
  hochladeKandidaten,
  leererCache,
  serverAdresse,
  type BibliotheksCache,
  type HochladeStand,
  type TypAngaben,
  wartetAufModeration,
} from '../lib/geraetebibliothek'
import { useInventoryStore } from './inventoryStore'

interface Abgelegt {
  /** Nur gesetzt, wenn vom Werk abweichend — ein Release-Wechsel des Werks greift sonst nicht. */
  server?: string
  nutzer?: LibraryUser | null
  cache?: BibliotheksCache
  zuletzt?: string
  autoUpload?: boolean
  typAngaben?: Record<string, TypAngaben>
  uploads?: Record<string, HochladeStand>
}

const lies = (): Abgelegt => {
  try {
    const roh = localStorage.getItem(STORAGE_KEYS.deviceLibrary)
    return roh ? (JSON.parse(roh) as Abgelegt) : {}
  } catch {
    return {}
  }
}

const liesToken = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.deviceLibraryToken)
  } catch {
    return null
  }
}

const schreibeToken = (token: string | null) => {
  try {
    if (token) localStorage.setItem(STORAGE_KEYS.deviceLibraryToken, token)
    else localStorage.removeItem(STORAGE_KEYS.deviceLibraryToken)
  } catch {
    /* gesperrter Speicher: die Anmeldung haelt bis zum Neuladen */
  }
}

export type AnmeldeSchritt = { art: 'aus' } | { art: 'code'; challenge: string }

export interface BibliothekStand {
  server: string
  token: string | null
  nutzer: LibraryUser | null
  cache: BibliotheksCache
  zuletzt?: string
  schritt: AnmeldeSchritt
  laeuft: boolean
  fehler: LibraryErrorCode | null
  /** Eigene Artikeltypen automatisch hochladen (Vorgabe an; wirkt nur angemeldet). */
  autoUpload: boolean
  /** Datenblattlink, Rackhoehe, Leistung je Artikel-Id — Typdaten ausserhalb von `InventoryItem`. */
  typAngaben: Record<string, TypAngaben>
  /** Ergebnis des letzten Hochladens je Artikel-Id. */
  uploads: Record<string, HochladeStand>

  /** `false` = Adresse unbrauchbar, nichts geaendert. */
  setzeServer: (roh: string) => boolean
  serverZuruecksetzen: () => void
  anmelden: (kennung: string, passwort: string) => Promise<void>
  zweiterFaktor: (code: string) => Promise<void>
  anmeldungAbbrechen: () => void
  abmelden: () => Promise<void>
  /** Ist das gespeicherte Token noch gueltig? Ohne Netz bleibt es stehen. */
  pruefeSitzung: () => Promise<void>
  abgleichen: () => Promise<void>
  setzeAutoUpload: (an: boolean) => void
  setzeTypAngaben: (itemId: string, teil: TypAngaben) => void
  /** Geaenderte und neue eigene Artikeltypen hochladen. `alle` = auch unveraenderte. */
  hochladen: (alle?: boolean) => Promise<void>
  /** Erst hoch, dann runter. */
  synchronisieren: () => Promise<void>
}

const persistieren = (
  s: Pick<BibliothekStand, 'server' | 'nutzer' | 'cache' | 'zuletzt' | 'autoUpload' | 'typAngaben' | 'uploads'>,
) => {
  const ab: Abgelegt = {
    nutzer: s.nutzer,
    cache: s.cache,
    zuletzt: s.zuletzt,
    autoUpload: s.autoUpload,
    typAngaben: s.typAngaben,
    uploads: s.uploads,
  }
  if (s.server !== DEFAULT_DEVICE_LIBRARY_URL) ab.server = s.server
  try {
    localStorage.setItem(STORAGE_KEYS.deviceLibrary, JSON.stringify(ab))
  } catch {
    /* siehe schreibeToken */
  }
}

const anfangsStand = () => {
  const ab = lies()
  const server = (ab.server && serverAdresse(ab.server)) || DEFAULT_DEVICE_LIBRARY_URL
  const cache = ab.cache && ab.cache.server === server ? ab.cache : leererCache(server)
  const token = liesToken()
  // Hochlade-Staende gehoeren zum Server wie der Cache.
  const uploads = ab.cache && ab.cache.server === server ? (ab.uploads ?? {}) : {}
  return {
    server,
    token,
    nutzer: token ? (ab.nutzer ?? null) : null,
    cache,
    zuletzt: ab.zuletzt,
    autoUpload: ab.autoUpload ?? true,
    typAngaben: ab.typAngaben ?? {},
    uploads,
  }
}

const sitzungVorbei = (code: LibraryErrorCode) => code === 'not-signed-in' || code === 'wrong-credentials'

export const useBibliothekStore = create<BibliothekStand>((set, get) => {
  const angemeldet = (r: SignInResult) => {
    if (r.kind === 'ok') {
      schreibeToken(r.token)
      set({ token: r.token, nutzer: r.user, schritt: { art: 'aus' }, fehler: null })
      persistieren(get())
    } else if (r.kind === 'second-factor') {
      set({ schritt: { art: 'code', challenge: r.challenge }, fehler: null })
    } else {
      set({ fehler: r.code })
    }
  }

  const abgemeldet = (fehler: LibraryErrorCode | null) => {
    schreibeToken(null)
    set({ token: null, nutzer: null, schritt: { art: 'aus' }, fehler })
    persistieren(get())
  }

  return {
    ...anfangsStand(),
    schritt: { art: 'aus' },
    laeuft: false,
    fehler: null,

    setzeServer: (roh) => {
      const server = serverAdresse(roh)
      if (!server) return false
      const alt = get()
      if (server === alt.server) return true
      if (alt.token) void signOut(alt.server, alt.token)
      schreibeToken(null)
      set({
        server,
        token: null,
        nutzer: null,
        cache: leererCache(server),
        zuletzt: undefined,
        uploads: {},
        schritt: { art: 'aus' },
        fehler: null,
      })
      persistieren(get())
      return true
    },

    serverZuruecksetzen: () => {
      get().setzeServer(DEFAULT_DEVICE_LIBRARY_URL)
    },

    anmelden: async (kennung, passwort) => {
      set({ laeuft: true, fehler: null })
      try {
        angemeldet(await signIn(get().server, kennung, passwort))
      } finally {
        set({ laeuft: false })
      }
    },

    zweiterFaktor: async (code) => {
      const s = get().schritt
      if (s.art !== 'code') return
      set({ laeuft: true, fehler: null })
      try {
        angemeldet(await verifySecondFactor(get().server, s.challenge, code))
      } finally {
        set({ laeuft: false })
      }
    },

    anmeldungAbbrechen: () => set({ schritt: { art: 'aus' }, fehler: null }),

    abmelden: async () => {
      const { server, token } = get()
      if (token) await signOut(server, token)
      abgemeldet(null)
    },

    pruefeSitzung: async () => {
      const { server, token } = get()
      if (!token) return
      try {
        const nutzer = await currentUser(server, token)
        if (get().token !== token) return
        if (nutzer) {
          set({ nutzer })
          persistieren(get())
        } else abgemeldet('not-signed-in')
      } catch {
        /* offline: das Token bleibt, der naechste Abgleich fragt wieder */
      }
    },

    abgleichen: async () => {
      const { server, token, cache } = get()
      if (!token) {
        set({ fehler: 'not-signed-in' })
        return
      }
      set({ laeuft: true, fehler: null })
      try {
        const antwort = await sync(server, token, PLANNER, cache.latestSeq)
        // Waehrend der Anfrage kann die Adresse gewechselt haben.
        if (get().server !== server) return
        set({ cache: abgleichAnwenden(get().cache, antwort), zuletzt: new Date().toISOString() })
        persistieren(get())
      } catch (e) {
        const code = e instanceof LibraryError ? e.code : 'server'
        if (sitzungVorbei(code)) abgemeldet('not-signed-in')
        else set({ fehler: code })
      } finally {
        set({ laeuft: false })
      }
    },


    setzeAutoUpload: (an) => {
      set({ autoUpload: an })
      persistieren(get())
    },

    setzeTypAngaben: (itemId, teil) => {
      const alt = get().typAngaben[itemId] ?? {}
      const neu: TypAngaben = { ...alt, ...teil }
      for (const k of Object.keys(neu) as (keyof TypAngaben)[]) if (neu[k] === undefined || neu[k] === '') delete neu[k]
      const typAngaben = { ...get().typAngaben }
      if (Object.keys(neu).length) typAngaben[itemId] = neu
      else delete typAngaben[itemId]
      set({ typAngaben })
      persistieren(get())
    },

    hochladen: async (alle = false) => {
      const { server, token } = get()
      if (!token) {
        set({ fehler: 'not-signed-in' })
        return
      }
      const items = useInventoryStore.getState().items
      const { bereit } = hochladeKandidaten(items, get().typAngaben)
      const faellig = bereit.filter((k) => {
        const st = get().uploads[k.itemId]
        return alle || !st || st.hash !== k.hash || st.state === 'error' || wartetAufModeration(st)
      })
      // Staende geloeschter Artikel fallen weg.
      const lebend = new Set(items.map((i) => i.id))
      const uploads = Object.fromEntries(Object.entries(get().uploads).filter(([id]) => lebend.has(id)))
      if (!faellig.length) {
        set({ uploads })
        persistieren(get())
        return
      }
      set({ laeuft: true, fehler: null })
      try {
        const ergebnis = await upload(server, token, PLANNER, faellig.map((k) => k.item))
        if (get().server !== server) return
        const at = new Date().toISOString()
        for (const r of ergebnis) {
          const k = faellig.find((x) => x.itemId === r.localId)
          if (!k) continue
          const stand: HochladeStand = { hash: k.hash, state: r.state, at }
          if (r.slug) stand.slug = r.slug
          if (r.moderation) stand.moderation = r.moderation
          const detail = r.state === 'blocked' ? befundeText(r.findings) : r.error
          if (detail) stand.detail = detail
          uploads[r.localId] = stand
        }
        set({ uploads })
        persistieren(get())
      } catch (e) {
        const code = e instanceof LibraryError ? e.code : 'server'
        if (sitzungVorbei(code)) abgemeldet('not-signed-in')
        else set({ fehler: code })
      } finally {
        set({ laeuft: false })
      }
    },

    synchronisieren: async () => {
      await get().hochladen()
      if (get().fehler || !get().token) return
      await get().abgleichen()
    },
  }
})

/** Wie lange nach der letzten Aenderung gewartet wird, bevor hochgeladen wird. */
export const AUTO_PAUSE_MS = 4000

/**
 * Automatik: beim Start einmal synchronisieren, danach nach jeder Aenderung
 * am Bestand oder an den Typangaben (entprellt) hoch- und runterladen.
 * Wirkt nur angemeldet und mit eingeschalteter Einstellung. Liefert die
 * Abmeldung der Beobachter.
 */
export function autoAbgleichStarten(pause = AUTO_PAUSE_MS): () => void {
  let uhr: ReturnType<typeof setTimeout> | undefined
  const darf = () => {
    const s = useBibliothekStore.getState()
    return !!s.token && s.autoUpload
  }
  const lauf = () => {
    uhr = undefined
    if (!darf()) return
    if (useBibliothekStore.getState().laeuft) {
      planen()
      return
    }
    void useBibliothekStore.getState().synchronisieren()
  }
  const planen = () => {
    if (uhr) clearTimeout(uhr)
    uhr = setTimeout(lauf, pause)
  }
  if (darf()) void useBibliothekStore.getState().synchronisieren()
  const ab1 = useInventoryStore.subscribe((s, vor) => {
    if (s.items !== vor.items && darf()) planen()
  })
  const ab2 = useBibliothekStore.subscribe((s, vor) => {
    if (s.typAngaben !== vor.typAngaben && darf()) planen()
    // Frisch angemeldet oder Automatik eingeschaltet: sofort nachholen.
    if ((s.token && !vor.token) || (s.autoUpload && !vor.autoUpload)) planen()
  })
  return () => {
    if (uhr) clearTimeout(uhr)
    ab1()
    ab2()
  }
}
