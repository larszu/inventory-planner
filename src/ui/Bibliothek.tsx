// ───────────────────────────────────────────────────────────────────────────
// Device library — die Geraetebibliothek als schreibgeschuetzte Quelle fuer
// Artikeltypen.
//
// Was hier steht, gehoert dem Server; ein Lagerartikel entsteht erst ueber
// „Add to stock". Umgekehrt kann ein eigener Artikeltyp vorgeschlagen werden
// — er geht dort in die Moderation. Das Format beider Richtungen steht in
// `domain/lib/geraetebibliothek.ts`.
// ───────────────────────────────────────────────────────────────────────────
import { useMemo, useState } from 'react'
import { useT } from '../i18n'
import { useBibliothekStore } from '../domain/store/bibliothekStore'
import { useInventoryStore } from '../domain/store/inventoryStore'
import {
  artikelAusEintrag,
  bibliothekStatusText,
  einreichenMaengel,
  imBestand,
} from '../domain/lib/geraetebibliothek'
import { deviceUrl } from '../lib/deviceLibraryClient'
import { TabelleRahmen } from './TabelleRahmen'
import { Feld } from './Formular'
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
        <button type="button" className="knopf-primaer" onClick={() => void s.abgleichen()} disabled={!s.token || s.laeuft}>
          {t('library.sync', 'Sync')}
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
                          addItem(artikelAusEintrag(e, zahl))
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

      <Einreichen />
    </section>
  )
}

/** Einen eigenen Artikeltyp vorschlagen — mit Pflicht-Datenblattlink. */
function Einreichen() {
  const { t, format } = useT()
  const items = useInventoryStore((x) => x.items)
  const token = useBibliothekStore((x) => x.token)
  const laeuft = useBibliothekStore((x) => x.laeuft)
  const einreichen = useBibliothekStore((x) => x.einreichen)
  const [itemId, setItemId] = useState('')
  const [link, setLink] = useState('')
  const [ergebnis, setErgebnis] = useState<string | null>(null)

  const item = items.find((i) => i.id === itemId)
  const maengel = item ? einreichenMaengel(item, link) : []
  const mangelText = (m: string) =>
    m === 'manufacturer'
      ? t('library.submit.needManufacturer', 'The item needs a manufacturer.')
      : m === 'category'
        ? t('library.submit.needCategory', 'The item needs a category.')
        : t('library.submit.needLink', 'A link to the manufacturer datasheet (https://…) is required.')

  return (
    <details className="block">
      <summary>{t('library.submit.head', 'Submit a stock item to the library')}</summary>
      <p className="leise">
        {t(
          'library.submit.hint',
          'Only the type data is sent: model, manufacturer, category, dimensions, weight, material kind, country of origin. Quantities, locations, prices and serial numbers stay here. The device goes to moderation first.',
        )}
      </p>
      <form
        className="zeile"
        onSubmit={(e) => {
          e.preventDefault()
          if (!item || maengel.length) return
          void einreichen(item, link).then((r) => {
            if (!r) return
            setErgebnis(format(t('library.submit.done', 'Submitted as {slug} ({state}).'), { slug: r.slug, state: r.state }))
            setLink('')
          })
        }}
      >
        <Feld name={t('library.submit.item', 'Stock item')}>
          <select value={itemId} onChange={(e) => setItemId(e.target.value)}>
            <option value="">{t('library.submit.choose', 'choose…')}</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.manufacturer ? `${i.manufacturer} ${i.model}` : i.model}
              </option>
            ))}
          </select>
        </Feld>
        <Feld name={t('library.submit.link', 'Datasheet link')}>
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" spellCheck={false} />
        </Feld>
        <button type="submit" className="knopf-primaer" disabled={!token || !item || maengel.length > 0 || laeuft}>
          {t('library.submit', 'Submit')}
        </button>
      </form>
      {item && maengel.length > 0 && (
        <ul className="leise">
          {maengel.map((m) => (
            <li key={m}>{mangelText(m)}</li>
          ))}
        </ul>
      )}
      {ergebnis && <p className="hinweis">{ergebnis}</p>}
    </details>
  )
}
