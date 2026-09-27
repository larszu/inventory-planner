// ───────────────────────────────────────────────────────────────────────────
// Device library — die Geraetebibliothek als schreibgeschuetzte Quelle fuer
// Artikeltypen.
//
// Was hier steht, gehoert dem Server; ein Lagerartikel entsteht erst ueber
// „Add to stock". Umgekehrt geht jeder eigene Artikeltyp mit Hersteller und
// Modell hinauf (`upload`), von Hand oder automatisch; der Stand je Artikel
// steht im Block „Our devices in the library". Das Format beider Richtungen
// steht in `domain/lib/geraetebibliothek.ts`.
// ───────────────────────────────────────────────────────────────────────────
import { useMemo, useState } from 'react'
import { useT } from '../i18n'
import { useBibliothekStore } from '../domain/store/bibliothekStore'
import { useInventoryStore } from '../domain/store/inventoryStore'
import {
  artikelAusEintrag,
  bibliothekStatusText,
  hochladeKandidaten,
  hochladeStatusText,
  imBestand,
  type TypAngaben,
} from '../domain/lib/geraetebibliothek'
import { deviceUrl } from '../lib/deviceLibraryClient'
import { TabelleRahmen } from './TabelleRahmen'
import { BibliothekFehler } from './BibliothekKonto'

export function Bibliothek() {
  const { t, format } = useT()
  const s = useBibliothekStore()
  const items = useInventoryStore((x) => x.items)
  const addItem = useInventoryStore((x) => x.addItem)
  const [suche, setSuche] = useState('')
  const [menge, setMenge] = useState('1')
  const [angelegt, setAngelegt] = useState<string | null>(null)

  const eintraege = useMemo(() => {
    const q = suche.trim().toLowerCase()
    return Object.values(s.cache.eintraege)
      .filter(
        (e) =>
          !q ||
          [e.artikel.model, e.artikel.manufacturer, e.artikel.category]
            .filter((x): x is string => !!x)
            .some((x) => x.toLowerCase().includes(q)),
      )
      .sort((a, b) =>
        `${a.artikel.manufacturer ?? ''} ${a.artikel.model}`.localeCompare(`${b.artikel.manufacturer ?? ''} ${b.artikel.model}`),
      )
  }, [s.cache.eintraege, suche])

  const gesamt = Object.keys(s.cache.eintraege).length
  const zahl = Number(menge)
  const mengeOk = Number.isFinite(zahl) && zahl > 0

  return (
    <section className="bibliothek">
      <div className="leiste">
        <button type="button" className="knopf-primaer" onClick={() => void s.synchronisieren()} disabled={!s.token || s.laeuft}>
          {t('library.syncNow', 'Sync now')}
        </button>
        <input
          type="search"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          placeholder={t('library.search', 'Search — model, manufacturer, category')}
          aria-label={t('library.search.aria', 'Search the device library')}
        />
        <label className="feld schmal">
          {t('library.qty', 'Qty to add')}
          <input value={menge} onChange={(e) => setMenge(e.target.value)} type="number" min="1" />
        </label>
        <span className="zaehler">
          {format(t('library.count', '{shown} of {all} · {invalid} invalid'), {
            shown: eintraege.length,
            all: gesamt,
            invalid: s.cache.ungueltig.length,
          })}
        </span>
      </div>
      <p className="leise">
        {s.zuletzt
          ? format(t('library.lastSync', 'Server {server} · last synced {when}'), {
              server: s.server,
              when: new Date(s.zuletzt).toLocaleString(),
            })
          : format(t('library.neverSynced', 'Server {server} · not synced yet'), { server: s.server })}
      </p>
      {!s.token && (
        <p className="hinweis">
          {t('library.signInFirst', 'Sign in under Settings → Device library to sync and to submit devices.')}
        </p>
      )}
      <BibliothekFehler fehler={s.fehler} server={s.server} />
      {angelegt && <p className="hinweis">{angelegt}</p>}

      {gesamt === 0 ? (
        <div className="leer-flaeche">
          <p className="leer">
            {t('library.empty', 'No devices from the library yet. Sync to fetch the devices that have an inventory view.')}
          </p>
        </div>
      ) : (
        <TabelleRahmen>
          <table>
            <thead>
              <tr>
                <th>{t('stock.col.model', 'Model')}</th>
                <th>{t('stock.col.category', 'Category')}</th>
                <th className="rechts">{t('library.col.weight', 'Weight kg')}</th>
                <th>{t('library.col.status', 'Status')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {eintraege.map((e) => {
                const drin = imBestand(e, items)
                return (
                  <tr key={e.slug}>
                    <td data-spalte={t('stock.col.model', 'Model')}>
                      <a href={deviceUrl(s.server, e.slug)} target="_blank" rel="noreferrer">
                        {e.artikel.model}
                      </a>
                      {e.artikel.manufacturer ? <span className="leise"> · {e.artikel.manufacturer}</span> : null}
                    </td>
                    <td data-spalte={t('stock.col.category', 'Category')}>{e.artikel.category ?? ''}</td>
                    <td className="rechts" data-spalte={t('library.col.weight', 'Weight kg')}>
                      {e.artikel.dimensions?.weightKg ?? ''}
                    </td>
                    <td data-spalte={t('library.col.status', 'Status')}>
                      {format(t('library.statusLine', '{status} · {n} confirmations'), {
                        status: bibliothekStatusText(e.status, t),
                        n: e.confirmations,
                      })}
                    </td>
                    <td>
                      <button
                        type="button"
                        disabled={drin || !mengeOk}
                        title={drin ? t('library.inStock', 'Already in stock (same manufacturer and model).') : undefined}
                        onClick={() => {
                          const id = addItem(artikelAusEintrag(e, zahl))
                          s.setzeTypAngaben(id, { sourceUrl: e.sourceUrl, rackUnits: e.rackUnits, powerWatts: e.powerWatts })
                          setAngelegt(format(t('library.added', 'Added {model} to the stock.'), { model: e.artikel.model }))
                        }}
                      >
                        {drin ? t('library.inStockShort', 'In stock') : t('library.add', 'Add to stock')}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </TabelleRahmen>
      )}

      <EigeneGeraete />
    </section>
  )
}

/** Zahl aus einem Eingabefeld; leer = keine Angabe. */
const zahlOderLeer = (roh: string): number | undefined => {
  const n = Number(roh.trim().replace(',', '.'))
  return roh.trim() === '' || !Number.isFinite(n) || n < 0 ? undefined : n
}

/** Die eigenen Artikeltypen und ihr Stand in der Bibliothek. */
function EigeneGeraete() {
  const { t, format } = useT()
  const items = useInventoryStore((x) => x.items)
  const b = useBibliothekStore()
  const { bereit, gesperrt } = useMemo(() => hochladeKandidaten(items, b.typAngaben), [items, b.typAngaben])
  const eigene = items.filter((i) => i.manufacturer?.trim() && i.model.trim())
  const hash = new Map(bereit.map((k) => [k.itemId, k.hash]))
  const sperre = new Map(gesperrt.map((g) => [g.itemId, g.grund]))
  const hoch = bereit.filter((k) => b.uploads[k.itemId]?.hash === k.hash && b.uploads[k.itemId]?.state !== 'error').length

  const setze = (id: string, teil: TypAngaben) => b.setzeTypAngaben(id, teil)

  return (
    <details className="block" open>
      <summary>{t('library.own.head', 'Our devices in the library')}</summary>
      <p className="leise">
        {t(
          'library.own.hint',
          'Every stock item with manufacturer and model goes up as a device type: model, manufacturer, category, dimensions, weight, material kind, country of origin, plus datasheet link, rack units and power from this table. Quantities, locations, prices and serial numbers stay here.',
        )}
      </p>
      <div className="leiste">
        <button type="button" onClick={() => void b.hochladen(true)} disabled={!b.token || b.laeuft || bereit.length === 0}>
          {t('library.own.uploadAll', 'Upload all again')}
        </button>
        <span className="zaehler">
          {format(t('library.own.count', '{up} of {all} up to date · {blocked} blocked'), {
            up: hoch,
            all: eigene.length,
            blocked: gesperrt.length,
          })}
        </span>
      </div>
      {eigene.length === 0 ? (
        <p className="leer">{t('library.own.empty', 'No stock item has both a manufacturer and a model yet.')}</p>
      ) : (
        <TabelleRahmen>
          <table>
            <thead>
              <tr>
                <th>{t('stock.col.model', 'Model')}</th>
                <th>{t('library.submit.link', 'Datasheet link')}</th>
                <th className="rechts">{t('library.col.ru', 'RU')}</th>
                <th className="rechts">{t('library.col.watts', 'Watts')}</th>
                <th>{t('library.col.status', 'Status')}</th>
              </tr>
            </thead>
            <tbody>
              {eigene.map((i) => {
                const a = b.typAngaben[i.id] ?? {}
                const st = b.uploads[i.id]
                return (
                  <tr key={i.id}>
                    <td data-spalte={t('stock.col.model', 'Model')}>
                      {i.model}
                      <span className="leise"> · {i.manufacturer}</span>
                    </td>
                    <td data-spalte={t('library.submit.link', 'Datasheet link')}>
                      <input
                        key={`${i.id}:${a.sourceUrl ?? ''}`}
                        defaultValue={a.sourceUrl ?? ''}
                        placeholder="https://"
                        spellCheck={false}
                        aria-label={format(t('library.own.linkFor', 'Datasheet link for {model}'), { model: i.model })}
                        onBlur={(e) => setze(i.id, { sourceUrl: e.target.value.trim() || undefined })}
                      />
                    </td>
                    <td className="rechts" data-spalte={t('library.col.ru', 'RU')}>
                      <input
                        key={`${i.id}:ru:${a.rackUnits ?? ''}`}
                        className="schmal"
                        type="number"
                        min="0"
                        max="60"
                        step="1"
                        defaultValue={a.rackUnits ?? ''}
                        aria-label={format(t('library.own.ruFor', 'Rack units of {model}'), { model: i.model })}
                        onBlur={(e) => {
                          const n = zahlOderLeer(e.target.value)
                          setze(i.id, { rackUnits: n === undefined ? undefined : Math.min(60, Math.round(n)) })
                        }}
                      />
                    </td>
                    <td className="rechts" data-spalte={t('library.col.watts', 'Watts')}>
                      <input
                        key={`${i.id}:w:${a.powerWatts ?? ''}`}
                        className="schmal"
                        type="number"
                        min="0"
                        defaultValue={a.powerWatts ?? ''}
                        aria-label={format(t('library.own.wattsFor', 'Power of {model} in watts'), { model: i.model })}
                        onBlur={(e) => setze(i.id, { powerWatts: zahlOderLeer(e.target.value) })}
                      />
                    </td>
                    <td data-spalte={t('library.col.status', 'Status')}>
                      {st?.slug ? (
                        <a href={deviceUrl(b.server, st.slug)} target="_blank" rel="noreferrer">
                          {hochladeStatusText(sperre.get(i.id), st, hash.get(i.id), t)}
                        </a>
                      ) : (
                        hochladeStatusText(sperre.get(i.id), st, hash.get(i.id), t)
                      )}
                      {st?.detail && !sperre.has(i.id) ? <span className="leise"> · {st.detail}</span> : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </TabelleRahmen>
      )}
    </details>
  )
}
