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
  propose,
  signIn,
  signOut,
  sync,
  verifySecondFactor,
  type LibraryErrorCode,
  type LibraryUser,
  type SignInResult,
} from '../../lib/deviceLibraryClient'
import { STORAGE_KEYS } from '../../lib/storageKeys'
import {
  PLANNER,
  abgleichAnwenden,
  leererCache,
  serverAdresse,
  vorschlagAusArtikel,
  type BibliotheksCache,
} from '../lib/geraetebibliothek'
import type { InventoryItem } from '../types/inventory'

interface Abgelegt {
  /** Nur gesetzt, wenn vom Werk abweichend — ein Release-Wechsel des Werks greift sonst nicht. */
  server?: string
  nutzer?: LibraryUser | null
  cache?: BibliotheksCache
  zuletzt?: string
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
  einreichen: (item: InventoryItem, sourceUrl: string) => Promise<{ slug: string; state: string } | null>
}

const persistieren = (s: Pick<BibliothekStand, 'server' | 'nutzer' | 'cache' | 'zuletzt'>) => {
  const ab: Abgelegt = { nutzer: s.nutzer, cache: s.cache, zuletzt: s.zuletzt }
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
  return { server, token, nutzer: token ? (ab.nutzer ?? null) : null, cache, zuletzt: ab.zuletzt }
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
      set({ server, token: null, nutzer: null, cache: leererCache(server), zuletzt: undefined, schritt: { art: 'aus' }, fehler: null })
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

    einreichen: async (item, sourceUrl) => {
      const { server, token } = get()
      if (!token) {
        set({ fehler: 'not-signed-in' })
        return null
      }
      const { core, facet } = vorschlagAusArtikel(item, sourceUrl)
      set({ laeuft: true, fehler: null })
      try {
        return await propose(server, token, PLANNER, core, { ...facet })
      } catch (e) {
        const code = e instanceof LibraryError ? e.code : 'server'
        if (sitzungVorbei(code)) abgemeldet('not-signed-in')
        else set({ fehler: code })
        return null
      } finally {
        set({ laeuft: false })
      }
    },
  }
})
