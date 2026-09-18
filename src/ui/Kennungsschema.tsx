// ───────────────────────────────────────────────────────────────────────────
// Das Kennungs-Schema des Hauses einstellen — und eine Reihe auf einmal
// beschriften.
//
// ─── WARUM EINSTELLBAR UND NICHT FEST ──────────────────────────────────────
//
// Weil es keine Norm gibt. Gassen, Felder und Ebenen sind die verbreitete
// Adressierung, aber jedes Haus schneidet sie anders: „A1" im kleinen Lager,
// „A-01-02" mit führenden Nullen im grossen. Ein fest verdrahtetes Schema
// wäre eine Vorgabe, die aussieht wie eine Messung — und die Begründung
// steht schon einmal im Repo, an der Inventur: „Der Prefix ist eine
// Hausregel, keine Norm."
//
// ─── WARUM DAS SCHEMA NEBEN DEM BESTAND LIEGT ──────────────────────────────
//
// Es ist eine Eigenschaft des HAUSES und nicht des Bestands: wer alle
// Artikel löscht, hat immer noch dieselben Regale und dieselbe Adressierung.
// Es liegt deshalb unter einem eigenen Schlüssel, wie der Scan-Prefix der
// Inventur und die Fristarten.
//
// ─── UND WAS ES NICHT TUT ──────────────────────────────────────────────────
//
// Es benennt nicht um, was schon eine Kennung trägt. „Alle Regale neu
// durchnummerieren" ist ein Umbau des Lagers und keine Einstellung; wer ihn
// will, macht ihn sichtbar Platz für Platz. Ein Knopf, der still hundert
// Etiketten ungültig macht, ist genau der, nach dem niemand gefragt hat.
// ───────────────────────────────────────────────────────────────────────────
import { useMemo, useState } from 'react'
import { useT } from '../i18n'
import { useInventoryStore } from '../domain/store/inventoryStore'
import { liesSchema, schemaSchluessel } from '../lib/kennungsablage'
import { buildRegalEtikettenHtml, type EtikettGroesse } from '../domain/lib/regalEtiketten'
import { locale } from '../i18n'
import {
  kollisionen,
  kollisionText,
  reihe,
  schemaBeispiel,
  STUFEN_ARTEN,
  stufenName,
  type Kennungsschema,
  type Stufe,
  type StufenArt,
} from '../domain/lib/platzkennung'


export function Kennungsschemata() {
  const { t, format, sprache } = useT()
  const nodes = useInventoryStore((s) => s.nodes)
  const updateNode = useInventoryStore((s) => s.updateNode)

  const [schema, setSchema] = useState<Kennungsschema>(liesSchema)
  const [ziel, setZiel] = useState('')
  const [grenzen, setGrenzen] = useState<Partial<Record<StufenArt, number>>>({})
  const [meldung, setMeldung] = useState<string | null>(null)
  const [groesse, setGroesse] = useState<EtikettGroesse>('regal')
  const [drucken, setDrucken] = useState<ReadonlySet<string>>(new Set())

  const sichern = (next: Kennungsschema) => {
    setSchema(next)
    try {
      localStorage.setItem(schemaSchluessel, JSON.stringify(next))
    } catch {
      /* privater Modus — das Schema gilt dann für diese Sitzung */
    }
  }

  const stufeAendern = (i: number, patch: Partial<Stufe>) => {
    const stufen = schema.stufen.map((s, j) => (i === j ? { ...s, ...patch } : s))
    sichern({ ...schema, stufen })
  }

  const doppelt = kollisionen(nodes)
  const mitKennung = useMemo(() => nodes.filter((n) => n.code?.trim()), [nodes])

  /**
   * Der Etiketten-Bogen.
   *
   * Er wird in einem Fenster geöffnet und vom Browser gedruckt — wie die
   * Packliste. Ein eigener Druckpfad wäre ein zweiter Ort für dieselbe
   * Ausgabe.
   */
  const bogenOeffnen = () => {
    const html = buildRegalEtikettenHtml(
      nodes,
      [...drucken],
      groesse,
      new Date().toLocaleDateString(locale(sprache)),
      t,
    )
    const w = window.open('', '_blank')
    if (!w) {
      setMeldung(t('label.blocked', 'The sheet could not be opened — the browser blocked the window.'))
      return
    }
    w.document.write(html)
    w.document.close()
  }
  const beispiel = schemaBeispiel(schema)

  /**
   * Die Kinder eines Knotens durchnummerieren.
   *
   * Nur die OHNE Kennung: wer schon eine trägt, hat ein Etikett am Regal —
   * und das still zu ändern hiesse, hundert Aufkleber ungültig zu machen.
   */
  const beschriften = () => {
    const eltern = nodes.find((n) => n.id === ziel)
    if (!eltern) return
    const kinder = nodes.filter((n) => n.parentId === eltern.id).sort((a, b) => a.name.localeCompare(b.name))
    const ohne = kinder.filter((n) => !n.code)
    if (ohne.length === 0) {
      setMeldung(t('code.allLabelled', 'Every location under this one already carries a code.'))
      return
    }
    const namen = reihe(schema, grenzen)
    if (namen.length === 0) {
      setMeldung(t('code.noRange', 'Give a count for every stage of the scheme first.'))
      return
    }
    const wieviele = Math.min(namen.length, ohne.length)
    for (let i = 0; i < wieviele; i += 1) updateNode(ohne[i]!.id, { code: namen[i]! })
    setMeldung(
      format(t('code.labelled', 'Labelled {n} of {m} locations without a code.'), {
        n: wieviele,
        m: ohne.length,
      }),
    )
  }

  return (
    <div className="block">
      <h3>{t('code.head', 'House scheme for location codes')}</h3>
      <p className="hinweis">
        {t(
          'code.intro',
          'There is no standard for this. Aisle, bay and level is the common addressing, but every warehouse cuts it differently — so the scheme is set here rather than assumed.',
        )}
      </p>

      <ul className="stufen-liste">
        {schema.stufen.map((s, i) => (
          <li key={`${s.art}-${i}`}>
            <select
              value={s.art}
              aria-label={t('code.stage', 'Stage')}
              onChange={(e) => stufeAendern(i, { art: e.target.value as StufenArt })}
            >
              {STUFEN_ARTEN.map((a) => (
                <option key={a} value={a}>
                  {stufenName(a, t)}
                </option>
              ))}
            </select>
            <select
              value={s.zeichen}
              aria-label={t('code.chars', 'Characters')}
              onChange={(e) => stufeAendern(i, { zeichen: e.target.value as Stufe['zeichen'] })}
            >
              <option value="buchstaben">{t('code.letters', 'Letters (A, B, … AA)')}</option>
              <option value="ziffern">{t('code.digits', 'Digits (1, 2, 3)')}</option>
            </select>
            <label>
              {t('code.pad', 'Pad to')}
              <input
                type="number"
                min={0}
                value={s.stellen}
                onChange={(e) => stufeAendern(i, { stellen: Math.max(0, Number(e.target.value)) })}
              />
            </label>
            <button
              type="button"
              className="still"
              onClick={() => sichern({ ...schema, stufen: schema.stufen.filter((_, j) => j !== i) })}
            >
              {t('code.dropStage', 'Remove')}
            </button>
          </li>
        ))}
      </ul>

      <div className="ladeplan-leiste">
        <button
          type="button"
          className="still"
          onClick={() =>
            sichern({ ...schema, stufen: [...schema.stufen, { art: 'ebene', zeichen: 'ziffern', stellen: 0 }] })
          }
        >
          {t('code.addStage', 'Add a stage')}
        </button>
        <label>
          {t('code.separator', 'Separator')}
          <input
            value={schema.trenner}
            maxLength={3}
            onChange={(e) => sichern({ ...schema, trenner: e.target.value.toUpperCase() })}
          />
        </label>
      </div>

      <p className="leise">
        {beispiel
          ? format(t('code.example', 'Looks like: {code}'), { code: beispiel })
          : t('code.none', 'No stages — locations then carry no code from this scheme.')}
      </p>

      <h4>{t('code.batch', 'Label a row at once')}</h4>
      <p className="hinweis">
        {t(
          'code.batchHint',
          'Eight bays and four levels are thirty-two codes, and nobody types those. Only locations without a code are touched — a code already on a sticker is not changed silently.',
        )}
      </p>
      <div className="zeile">
        <label>
          {t('code.under', 'Below')}
          <select value={ziel} onChange={(e) => setZiel(e.target.value)}>
            <option value="">{t('code.pick', '— pick a location —')}</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
        </label>
        {schema.stufen.map((s, i) => (
          <label key={`${s.art}-count-${i}`}>
            {format(t('code.howMany', '{stage} — how many?'), { stage: stufenName(s.art, t) })}
            <input
              type="number"
              min={1}
              value={grenzen[s.art] ?? ''}
              onChange={(e) => setGrenzen({ ...grenzen, [s.art]: Math.max(1, Number(e.target.value)) })}
            />
          </label>
        ))}
      </div>
      <button type="button" className="knopf-primaer" onClick={beschriften} disabled={!ziel}>
        {t('code.label', 'Label them')}
      </button>

      {meldung && <p className="befund ja">{meldung}</p>}

      <h4>{t('label.head', 'Print the labels')}</h4>
      <p className="hinweis">
        {t(
          'label.hint',
          'The code is printed as text, large, with its path beside it — a shelf label is read from five metres, not scanned. Only locations that carry a code are printed: a label without one is an empty sticker.',
        )}
      </p>
      {mitKennung.length === 0 ? (
        <p className="leise">{t('label.nothing', 'No location carries a code yet.')}</p>
      ) : (
        <>
          <div className="ladeplan-leiste">
            <label>
              {t('label.size', 'Size')}
              <select value={groesse} onChange={(e) => setGroesse(e.target.value as EtikettGroesse)}>
                <option value="regal">{t('label.size.shelf', 'Shelf sign (95 x 62 mm, 2 per row)')}</option>
                <option value="fach">{t('label.size.bay', 'Bay label (62 x 33 mm, 3 per row)')}</option>
                <option value="klein">{t('label.size.small', 'Small (46 x 20 mm, 4 per row)')}</option>
              </select>
            </label>
            <button
              type="button"
              className="still"
              onClick={() => setDrucken(new Set(mitKennung.map((n) => n.id)))}
            >
              {t('label.all', 'Select all')}
            </button>
            <button type="button" className="still" onClick={() => setDrucken(new Set())}>
              {t('label.none.select', 'Select none')}
            </button>
            <button type="button" className="knopf-primaer" onClick={bogenOeffnen} disabled={drucken.size === 0}>
              {format(t('label.open', 'Open sheet ({n})'), { n: drucken.size })}
            </button>
          </div>
          <ul className="etiketten-wahl">
            {mitKennung.map((n) => (
              <li key={n.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={drucken.has(n.id)}
                    onChange={() =>
                      setDrucken((s) => {
                        const next = new Set(s)
                        if (next.has(n.id)) next.delete(n.id)
                        else next.add(n.id)
                        return next
                      })
                    }
                  />
                  <strong>{n.code}</strong>
                  <span className="leise">{n.name}</span>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}

      {doppelt.length > 0 && (
        <>
          <h4>{t('code.clashes', 'Codes given twice')}</h4>
          {doppelt.map((k) => (
            <p key={k.kennung} className="warnung">
              {kollisionText(k, t)}
            </p>
          ))}
        </>
      )}
    </div>
  )
}

