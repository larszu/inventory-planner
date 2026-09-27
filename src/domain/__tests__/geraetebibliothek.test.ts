import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  abgleichAnwenden,
  bibliothekFehlerText,
  richtlinienUrl,
  artikelAusEintrag,
  hochladeKandidaten,
  hochladeStatusText,
  inhaltsHash,
  wartetAufModeration,
  befundeText,
  facetAusArtikel,
  facetPruefen,
  leererCache,
  serverAdresse,
  vorschlagAusArtikel,
} from '../lib/geraetebibliothek'
import { DEFAULT_DEVICE_LIBRARY_URL, type SyncDevice, type SyncResponse } from '../../lib/deviceLibraryClient'
import { STORAGE_KEYS } from '../../lib/storageKeys'
import type { InventoryItem } from '../types/inventory'

const geraet = (slug: string, seq: number, facet: unknown, teil: Partial<SyncDevice> = {}): SyncDevice => ({
  slug,
  version: 1,
  seq,
  removed: false,
  status: 'confirmed',
  confirmations: 2,
  core: { manufacturer: 'Kern', model: `Kern ${slug}`, category: 'Video', sourceUrl: 'https://example.com/ds.pdf', weightKg: 3 },
  facet: facet as Record<string, unknown> | null,
  ...teil,
})

const antwort = (latestSeq: number, devices: SyncDevice[]): SyncResponse => ({
  format: 'avplan-device-sync',
  version: 1,
  planner: 'inventory',
  latestSeq,
  devices,
})

const artikel: InventoryItem = {
  id: 'i1',
  model: 'ATEM Mini Pro',
  manufacturer: 'Blackmagic Design',
  category: 'Video mixer',
  quantity: 4,
  mindestmenge: 2,
  rentPricePerDay: 3500,
  stockLocation: 'Regal A',
  supplier: 'Händler',
  ownership: 'owned',
  code: 'LAGER-1',
  codeType: 'qr',
  locationId: 'n1',
  dimensions: { widthMm: 240, heightMm: 38, depthMm: 95, weightKg: 0.95 },
  materialKinds: ['rental'],
  ursprungsland: 'sg',
  notes: 'intern',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
}

describe('Facet-Format inventory', () => {
  it('nimmt nur die Typdaten, nichts vom Exemplar', () => {
    const f = facetAusArtikel(artikel)
    expect(f).toEqual({
      model: 'ATEM Mini Pro',
      manufacturer: 'Blackmagic Design',
      category: 'Video mixer',
      dimensions: { widthMm: 240, heightMm: 38, depthMm: 95, weightKg: 0.95 },
      materialKinds: ['rental'],
      ursprungsland: 'SG',
    })
  })

  it('Einreichen und Import sprechen dasselbe Format', () => {
    const f = facetAusArtikel(artikel)
    expect(facetPruefen(f)).toEqual(f)
  })

  it('Vorschlag: Kern aus dem Artikel, Gewicht hochgezogen', () => {
    const { core, facet } = vorschlagAusArtikel(artikel, ' https://x.de/a.pdf ')
    expect(core).toEqual({
      manufacturer: 'Blackmagic Design',
      model: 'ATEM Mini Pro',
      category: 'Video mixer',
      sourceUrl: 'https://x.de/a.pdf',
      weightKg: 0.95,
    })
    expect(facet.model).toBe('ATEM Mini Pro')
  })

  it('ein Lagerartikel aus der Bibliothek traegt die Menge des Nutzers und sonst nur Typdaten', () => {
    const cache = abgleichAnwenden(leererCache('s'), antwort(1, [geraet('a', 1, facetAusArtikel(artikel))]))
    const neu = artikelAusEintrag(cache.eintraege.a!, 3)
    expect(neu).toEqual({ ...facetAusArtikel(artikel), quantity: 3 })
    expect(neu).not.toHaveProperty('locationId')
  })

  it('faellt fuer Modell, Hersteller, Kategorie und Gewicht auf den Kern zurueck', () => {
    expect(facetPruefen({}, { manufacturer: 'M', model: 'X', category: 'C', weightKg: 2 })).toEqual({
      model: 'X',
      manufacturer: 'M',
      category: 'C',
      dimensions: { weightKg: 2 },
    })
  })

  it.each([
    ['kein Objekt', 'x'],
    ['Liste', []],
    ['null', null],
    ['Modell kein Text', { model: 5 }],
    ['negative Masse', { dimensions: { widthMm: -1 } }],
    ['Masse als Text', { dimensions: { weightKg: '3' } }],
    ['unbekannte Materialart', { materialKinds: ['sold'] }],
    ['Land nicht ISO', { ursprungsland: 'Germany' }],
  ])('ungueltig: %s', (_, facet) => {
    expect(facetPruefen(facet, { model: 'X', manufacturer: 'M', category: 'C' })).toBeNull()
  })

  it('ohne Modell weder im Facet noch im Kern ungueltig', () => {
    expect(facetPruefen({}, {})).toBeNull()
  })
})

describe('Abgleich', () => {
  it('inkrementell: neue und geaenderte Geraete landen, latestSeq waechst', () => {
    let c = abgleichAnwenden(leererCache('s'), antwort(2, [geraet('a', 1, { model: 'A' }), geraet('b', 2, { model: 'B' })]))
    expect(c.latestSeq).toBe(2)
    expect(Object.keys(c.eintraege).sort()).toEqual(['a', 'b'])
    c = abgleichAnwenden(c, antwort(3, [geraet('a', 3, { model: 'A2' }, { version: 2, status: 'verified' })]))
    expect(c.latestSeq).toBe(3)
    expect(c.eintraege.a).toMatchObject({ version: 2, status: 'verified', artikel: { model: 'A2' } })
    expect(c.eintraege.b!.artikel.model).toBe('B')
  })

  it('removed entfernt das Geraet', () => {
    let c = abgleichAnwenden(leererCache('s'), antwort(1, [geraet('a', 1, { model: 'A' })]))
    c = abgleichAnwenden(c, antwort(2, [geraet('a', 2, null, { removed: true })]))
    expect(c.eintraege).toEqual({})
    expect(c.ungueltig).toEqual([])
  })

  it('ungueltige Facets werden gezaehlt, nicht gelistet — und heilen mit der naechsten Version', () => {
    let c = abgleichAnwenden(
      leererCache('s'),
      antwort(2, [geraet('a', 1, { model: 'A' }), geraet('b', 2, { dimensions: { weightKg: 'schwer' } })]),
    )
    expect(Object.keys(c.eintraege)).toEqual(['a'])
    expect(c.ungueltig).toEqual(['b'])
    c = abgleichAnwenden(c, antwort(3, [geraet('b', 3, { model: 'B' })]))
    expect(c.ungueltig).toEqual([])
    expect(c.eintraege.b!.artikel.model).toBe('B')
    c = abgleichAnwenden(c, antwort(4, [geraet('a', 4, 'kaputt')]))
    expect(c.eintraege.a).toBeUndefined()
    expect(c.ungueltig).toEqual(['a'])
  })
})

describe('Fehlertexte', () => {
  it('jeder Code hat einen eigenen Text; Richtlinien-Link zeigt auf /guidelines', () => {
    const codes = ['wrong-credentials', 'email-not-verified', 'guidelines-outdated', 'exists', 'wrong-code', 'rate-limited', 'not-signed-in', 'offline', 'server'] as const
    expect(new Set(codes.map((c) => bibliothekFehlerText(c))).size).toBe(codes.length)
    expect(richtlinienUrl('https://devices.zumpelars.de/')).toBe('https://devices.zumpelars.de/guidelines')
  })
})

describe('Server-Adresse', () => {
  it('https ja, http nur lokal, Schraegstrich am Ende weg', () => {
    expect(serverAdresse('https://devices.zumpelars.de/')).toBe('https://devices.zumpelars.de')
    expect(serverAdresse('http://localhost:8787')).toBe('http://localhost:8787')
    expect(serverAdresse('http://devices.zumpelars.de')).toBeNull()
    expect(serverAdresse('kein server')).toBeNull()
    expect(serverAdresse('https://x.de/?a=1')).toBeNull()
  })
})

describe('Store gegen den Server (fetch gemockt)', () => {
  const json = (body: unknown, headers: Record<string, string> = {}, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })

  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })
  afterEach(() => vi.unstubAllGlobals())

  const laden = async () => (await import('../store/bibliothekStore')).useBibliothekStore

  it('ohne Einstellung spricht er https://devices.zumpelars.de an', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.includes('/api/auth/sign-in')
        ? json({ user: { id: '1', email: 'a@b.de', username: 'lars', emailVerified: true } }, { 'set-auth-token': 'tok' })
        : json(antwort(1, [geraet('a', 1, { model: 'A' })])),
    )
    vi.stubGlobal('fetch', fetchMock)
    const store = await laden()
    expect(store.getState().server).toBe(DEFAULT_DEVICE_LIBRARY_URL)
    expect(DEFAULT_DEVICE_LIBRARY_URL).toBe('https://devices.zumpelars.de')

    await store.getState().anmelden('a@b.de', 'geheim')
    expect(store.getState().token).toBe('tok')
    await store.getState().abgleichen()
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      'https://devices.zumpelars.de/api/auth/sign-in/email',
      'https://devices.zumpelars.de/api/sync?planner=inventory&after=0',
    ])
    expect(store.getState().cache.latestSeq).toBe(1)
    // Das Token liegt getrennt, der Cache ohne Token, die Werks-Adresse wird nicht gespeichert.
    expect(localStorage.getItem(STORAGE_KEYS.deviceLibraryToken)).toBe('tok')
    const abgelegt = localStorage.getItem(STORAGE_KEYS.deviceLibrary)!
    expect(abgelegt).not.toContain('tok')
    expect(JSON.parse(abgelegt).server).toBeUndefined()
  })

  it('fragt beim zweiten Abgleich nur nach dem, was nach latestSeq kam', async () => {
    const fetchMock = vi.fn(async (_url: string) => json(antwort(7, [])))
    vi.stubGlobal('fetch', fetchMock)
    localStorage.setItem(STORAGE_KEYS.deviceLibraryToken, 'tok')
    localStorage.setItem(
      STORAGE_KEYS.deviceLibrary,
      JSON.stringify({ cache: { ...leererCache(DEFAULT_DEVICE_LIBRARY_URL), latestSeq: 5 } }),
    )
    const store = await laden()
    await store.getState().abgleichen()
    expect(fetchMock.mock.calls[0]![0]).toBe('https://devices.zumpelars.de/api/sync?planner=inventory&after=5')
    expect(store.getState().cache.latestSeq).toBe(7)
  })

  it('Zwei-Faktor: der Code geht mit der Challenge zurueck', async () => {
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) =>
      url.endsWith('/sign-in/username')
        ? json({ twoFactorRedirect: true }, { 'x-auth-challenge': 'ch1' })
        : json({ user: { id: '1', email: 'a@b.de', username: 'lars' } }, { 'set-auth-token': 'tok2' }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const store = await laden()
    await store.getState().anmelden('lars', 'geheim')
    expect(store.getState().schritt).toEqual({ art: 'code', challenge: 'ch1' })
    await store.getState().zweiterFaktor('123 456')
    const init = fetchMock.mock.calls[1]![1]!
    expect((init.headers as Record<string, string>)['x-auth-challenge']).toBe('ch1')
    expect(store.getState().token).toBe('tok2')
  })

  it('abgelaufene Sitzung beim Abgleich meldet ab', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ code: 'not-signed-in' }, {}, 401)))
    localStorage.setItem(STORAGE_KEYS.deviceLibraryToken, 'alt')
    const store = await laden()
    await store.getState().abgleichen()
    expect(store.getState().token).toBeNull()
    expect(store.getState().fehler).toBe('not-signed-in')
    expect(localStorage.getItem(STORAGE_KEYS.deviceLibraryToken)).toBeNull()
  })

  it('anderer Server: Token und Cache verfallen; Zuruecksetzen fuehrt zum Werk', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({})))
    localStorage.setItem(STORAGE_KEYS.deviceLibraryToken, 'tok')
    localStorage.setItem(
      STORAGE_KEYS.deviceLibrary,
      JSON.stringify({ cache: { ...leererCache(DEFAULT_DEVICE_LIBRARY_URL), latestSeq: 9 } }),
    )
    const store = await laden()
    expect(store.getState().setzeServer('ftp://x')).toBe(false)
    expect(store.getState().token).toBe('tok')
    expect(store.getState().setzeServer('https://test.example/')).toBe(true)
    expect(store.getState()).toMatchObject({ server: 'https://test.example', token: null })
    expect(store.getState().cache.latestSeq).toBe(0)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.deviceLibrary)!).server).toBe('https://test.example')
    store.getState().serverZuruecksetzen()
    expect(store.getState().server).toBe(DEFAULT_DEVICE_LIBRARY_URL)
  })

  const mitBestand = async (items: InventoryItem[]) => {
    const inv = (await import('../store/inventoryStore')).useInventoryStore
    inv.setState({ items })
    return inv
  }

  it('Hochladen: nur geaenderte, Stand je Artikel bleibt; 409/Richtlinien melden, Sitzung bleibt', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init!.body))
      return json({ planner: 'inventory', results: body.items.map((i: { localId: string }) => ({ localId: i.localId, state: 'created', slug: 'bmd-atem', moderation: 'approved' })) })
    })
    vi.stubGlobal('fetch', fetchMock)
    localStorage.setItem(STORAGE_KEYS.deviceLibraryToken, 'tok')
    const inv = await mitBestand([artikel, { ...artikel, id: 'i2', model: 'Ohne Link' }, { ...artikel, id: 'i3', manufacturer: undefined }])
    const store = await laden()
    store.getState().setzeTypAngaben('i1', { sourceUrl: 'https://x.de/a.pdf', rackUnits: 1, powerWatts: 20 })
    await store.getState().hochladen()

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://devices.zumpelars.de/api/upload')
    const body = JSON.parse(String(init!.body))
    expect(body.planner).toBe('inventory')
    expect(body.items).toHaveLength(1)
    expect(body.items[0].localId).toBe('i1')
    expect(body.items[0].facet).toEqual(facetAusArtikel(artikel))
    expect(body.items[0].core).toMatchObject({ rackUnits: 1, powerWatts: 20, sourceUrl: 'https://x.de/a.pdf' })
    expect(JSON.stringify(body)).not.toContain('LAGER-1')
    expect(store.getState().uploads.i1).toMatchObject({ state: 'created', slug: 'bmd-atem' })
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.deviceLibrary)!).uploads.i1.state).toBe('created')

    // Unveraendert: keine Anfrage. Geaendert: genau dieser eine.
    await store.getState().hochladen()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    inv.setState({ items: [{ ...artikel, category: 'Switcher' }] })
    await store.getState().hochladen()
    expect(fetchMock).toHaveBeenCalledTimes(2)

    vi.stubGlobal('fetch', vi.fn(async () => json({ error: 'exists' }, {}, 409)))
    await store.getState().hochladen(true)
    expect(store.getState()).toMatchObject({ fehler: 'exists', token: 'tok' })
    vi.stubGlobal('fetch', vi.fn(async () => json({ code: 'guidelines-outdated' }, {}, 403)))
    await store.getState().hochladen(true)
    expect(store.getState()).toMatchObject({ fehler: 'guidelines-outdated', token: 'tok' })
  })

  it('Moderation: wartende Eintraege gehen unveraendert erneut mit, bis sie live sind', async () => {
    let moderation: 'pending' | 'approved' = 'pending'
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      json({ results: [{ localId: 'i1', state: 'in-sync', slug: 'bmd-atem', moderation }] }),
    )
    vi.stubGlobal('fetch', fetchMock)
    localStorage.setItem(STORAGE_KEYS.deviceLibraryToken, 'tok')
    await mitBestand([artikel])
    const store = await laden()
    store.getState().setzeTypAngaben('i1', { sourceUrl: 'https://x.de/a.pdf' })
    await store.getState().hochladen()
    expect(store.getState().uploads.i1!.moderation).toBe('pending')
    await store.getState().hochladen()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    moderation = 'approved'
    await store.getState().hochladen()
    expect(store.getState().uploads.i1!.moderation).toBe('approved')
    await store.getState().hochladen()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('Jetzt synchronisieren: erst hoch, dann runter', async () => {
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) =>
      url.endsWith('/api/upload') ? json({ results: [{ localId: 'i1', state: 'in-sync' }] }) : json(antwort(3, [])),
    )
    vi.stubGlobal('fetch', fetchMock)
    localStorage.setItem(STORAGE_KEYS.deviceLibraryToken, 'tok')
    await mitBestand([artikel])
    const store = await laden()
    store.getState().setzeTypAngaben('i1', { sourceUrl: 'https://x.de/a.pdf' })
    await store.getState().synchronisieren()
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      'https://devices.zumpelars.de/api/upload',
      'https://devices.zumpelars.de/api/sync?planner=inventory&after=0',
    ])
    expect(store.getState().cache.latestSeq).toBe(3)
  })

  it('Automatik: Aenderung am Bestand laedt entprellt hoch; aus = nichts', async () => {
    vi.useFakeTimers()
    try {
      const fetchMock = vi.fn(async (url: string, _init?: RequestInit) =>
        url.endsWith('/api/upload') ? json({ results: [] }) : json(antwort(0, [])),
      )
      vi.stubGlobal('fetch', fetchMock)
      localStorage.setItem(STORAGE_KEYS.deviceLibraryToken, 'tok')
      const inv = await mitBestand([])
      const mod = await import('../store/bibliothekStore')
      expect(mod.useBibliothekStore.getState().autoUpload).toBe(true)
      mod.useBibliothekStore.getState().setzeTypAngaben('i1', { sourceUrl: 'https://x.de/a.pdf' })
      const stopp = mod.autoAbgleichStarten(1000)
      await vi.advanceTimersByTimeAsync(10)
      const start = fetchMock.mock.calls.length
      expect(start).toBeGreaterThan(0)
      inv.setState({ items: [artikel] })
      inv.setState({ items: [{ ...artikel, notes: 'x' }] })
      await vi.advanceTimersByTimeAsync(500)
      expect(fetchMock.mock.calls.length).toBe(start)
      await vi.advanceTimersByTimeAsync(1000)
      expect(fetchMock.mock.calls.slice(start).map((c) => c[0])[0]).toBe('https://devices.zumpelars.de/api/upload')
      const nachher = fetchMock.mock.calls.length
      mod.useBibliothekStore.getState().setzeAutoUpload(false)
      inv.setState({ items: [{ ...artikel, model: 'Neu' }] })
      await vi.advanceTimersByTimeAsync(3000)
      expect(fetchMock.mock.calls.length).toBe(nachher)
      stopp()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('Hochlade-Kandidaten', () => {
  it('ohne Hersteller nicht dabei, ohne Kategorie oder Link blockiert, Rackhoehe geprueft', () => {
    const { bereit, gesperrt } = hochladeKandidaten(
      [artikel, { ...artikel, id: 'k', category: undefined }, { ...artikel, id: 'l' }, { ...artikel, id: 'm', manufacturer: '' }],
      { i1: { sourceUrl: 'https://x.de/a.pdf', rackUnits: 99, powerWatts: 5 }, k: { sourceUrl: 'https://x.de/b.pdf' } },
    )
    expect(bereit.map((b) => b.itemId)).toEqual(['i1'])
    expect(bereit[0]!.item.core.rackUnits).toBeUndefined()
    expect(bereit[0]!.item.core.powerWatts).toBe(5)
    expect(gesperrt).toEqual([
      { itemId: 'k', grund: 'category' },
      { itemId: 'l', grund: 'sourceUrl' },
    ])
    expect(hochladeStatusText('sourceUrl', undefined, undefined)).toBe('Blocked: datasheet link missing')
  })

  it('Hash ist stabil gegen Schluesselreihenfolge und aendert sich mit dem Inhalt', () => {
    expect(inhaltsHash({ a: 1, b: [1, { c: 2, d: 3 }] })).toBe(inhaltsHash({ b: [1, { d: 3, c: 2 }], a: 1 }))
    expect(inhaltsHash({ a: 1 })).not.toBe(inhaltsHash({ a: 2 }))
  })

  it('Status aus der Moderation: wartet → live; alte Staende ohne Angabe gelten nach Zustand', () => {
    const h = 'aaaa'
    expect(hochladeStatusText(undefined, { hash: h, state: 'in-sync', moderation: 'pending', at: '' }, h)).toBe(
      'Uploaded, waiting for moderation',
    )
    expect(hochladeStatusText(undefined, { hash: h, state: 'created', moderation: 'pending', at: '' }, h)).toBe(
      'Submitted, waiting for moderation',
    )
    expect(hochladeStatusText(undefined, { hash: h, state: 'in-sync', moderation: 'approved', at: '' }, h)).toBe(
      'Live in the library',
    )
    expect(hochladeStatusText(undefined, { hash: h, state: 'blocked', moderation: 'approved', at: '' }, h)).toBe(
      'Blocked by the library checks',
    )
    expect(wartetAufModeration({ hash: h, state: 'created', at: '' })).toBe(true)
    expect(wartetAufModeration({ hash: h, state: 'in-sync', at: '' })).toBe(false)
    expect(wartetAufModeration({ hash: h, state: 'edit-proposed', moderation: 'approved', at: '' })).toBe(false)
  })

  it('Status: geaendert seit dem letzten Hochladen', () => {
    const st = { hash: 'aaaa', state: 'in-sync' as const, at: '' }
    expect(hochladeStatusText(undefined, st, 'aaaa')).toBe('In sync with the library')
    expect(hochladeStatusText(undefined, st, 'bbbb')).toBe('Changed — waiting for upload')
  })

  it('Befunde: nur blockierende, Text aus detail oder message', () => {
    expect(befundeText([{ kind: 'x', blocking: true, detail: 'kein Datenblatt' }, { kind: 'y', blocking: false }, { message: 'Required' }])).toBe(
      'kein Datenblatt; Required',
    )
  })
})
