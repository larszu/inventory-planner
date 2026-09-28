// ───────────────────────────────────────────────────────────────────────────
// Bestand — was ist da, wieviel, und wo liegt es?
//
// Die erste der drei Fragen aus dem Lager-Vertrag (ADR-006). Sie ist auch die
// einzige, in der hier GESCHRIEBEN wird: anlegen, Menge ändern, umlagern,
// löschen. Alles andere in dieser App liest.
//
// ZWEI DINGE, DIE DIESE ANSICHT NICHT TUT, und beide mit Grund:
//
//   Sie RECHNET KEINE DECKUNG. „Reicht der Bestand für den Plan?" ist eine
//   Frage des Plans an das Lager; die Antwort entsteht dort, wo der Bedarf
//   herkommt. Sie hier zu rechnen hiesse, den Plan nachzubauen, um ihn
//   beantworten zu können — genau die zweite Ableitung, gegen die ADR-006
//   Punkt 4 geschrieben ist.
//
//   Sie ERFINDET KEINE MENGE. Ein Artikel ohne Angabe hat keine Menge, und die
//   Tabelle schreibt dann nichts statt einer Null. Eine Null ist die Aussage
//   „nichts da"; das ist etwas anderes als „nicht gezählt".
//
// DIE SPALTE „ZIEL" IST KEIN RÜCKFALL IN DIE ERSTE DIESER ZWEI REGELN (B-65).
//
// Sie sieht aus wie Bedarf und ist keiner. Der Bedarf eines PLANS ist eine
// Frage des Plans — was diese Show braucht, weiss nur sie, und deshalb reicht
// der Planer `BedarfsZeile[]` herüber, statt dass das Lager rechnet (ADR-006).
// Die Mindestmenge ist die andere Sorte Zahl: eine Entscheidung des HAUSES
// über sein eigenes Regal, unabhängig von jeder Show. „Von den kurzen XLR
// wollen wir immer zwanzig dahaben" ist kein Plan, sondern eine Hauspolitik.
//
// Sie steht deshalb HIER — dort, wo geschrieben wird und wo ohnehin schon die
// Menge daneben liegt — und wird ANDERSWO gelesen: die Deckung rechnet
// `domain/lib/mindestmenge.ts`, gezeigt wird sie im Bericht. Diese Ansicht
// vergleicht nichts; sie nimmt die Zahl entgegen.
// ───────────────────────────────────────────────────────────────────────────
import { useMemo, useRef, useState } from 'react'
import { useT } from '../i18n'
import { useAnlegenOffen } from './useAnlegenOffen'
import { TabelleRahmen } from './TabelleRahmen'
import { useInventoryStore } from '../domain/store/inventoryStore'
import { nodePathLabel } from '../domain/lib/storageTree'
import { platzAbsageText, platzAufloesen } from '../domain/lib/platzAufloesen'
import { liesSchema } from '../lib/kennungsablage'
import { moveRefusalLabel } from '../domain/types/storageMove'
import type { MoveRefusal } from '../domain/types/storageMove'
import { ownershipLabel } from '../domain/lib/ownership'
import type { InventoryItem, InventoryOwnership, StorageNode } from '../domain/types/inventory'

const EIGENTUM: InventoryOwnership[] = ['owned', 'rented', 'subhire']

export function Bestand() {
  const { t, format } = useT()
  const items = useInventoryStore((s) => s.items)
  const nodes = useInventoryStore((s) => s.nodes)
  const anlegenBlock = useAnlegenOffen(items.length === 0)
  const addItem = useInventoryStore((s) => s.addItem)
  const updateItem = useInventoryStore((s) => s.updateItem)
  const removeItem = useInventoryStore((s) => s.removeItem)
  // Einraeumen geht durch `moveItem` und nicht durch `updateItem`: der Typ
  // schliesst `locationId` dort aus, weil ein Umzug geprueft und ins Journal
  // geschrieben werden muss. Der Waechter steht an der richtigen Stelle.
  const moveItem = useInventoryStore((s) => s.moveItem)

  const [suche, setSuche] = useState('')
  const [modell, setModell] = useState('')
  const [menge, setMenge] = useState('1')
  const [meldung, setMeldung] = useState<string | null>(null)
  const modellFeld = useRef<HTMLInputElement>(null)

  // Kategorie und Lieferant kommen nur aus Importen. Leere Spalten sind
  // beim ersten Benutzen nur Rauschen — sie erscheinen, sobald eine Zeile
  // etwas darin hat.
  const mitKategorie = items.some((i) => i.category)
  const mitLieferant = items.some((i) => i.supplier)

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase()
    if (!q) return items
    return items.filter((i) =>
      [i.model, i.manufacturer, i.category, i.supplier, i.stockLocation]
        .filter((x): x is string => typeof x === 'string')
        .some((x) => x.toLowerCase().includes(q)),
    )
  }, [items, suche])

  const anlegen = () => {
    const name = modell.trim()
    if (!name) return
    const zahl = Number(menge)
    const stueck = Number.isFinite(zahl) && zahl > 0 ? zahl : 1
    // Derselbe Name ein zweites Mal war vorher still eine zweite Zeile. Liegt
    // genau ein Eintrag dieses Namens noch nirgends, ist es dieselbe Ware: die
    // Menge kommt dazu. Liegt er schon irgendwo, waere Zusammenlegen ein Umzug
    // der neuen Stuecke dorthin — dann eine eigene Zeile, aber mit Hinweis.
    const gleich = items.filter((i) => i.model.trim().toLowerCase() === name.toLowerCase())
    const frei = gleich.filter((i) => !i.locationId && i.quantity !== undefined)
    const ziel = frei.length === 1 ? frei[0]! : null
    if (ziel) {
      const neu = (ziel.quantity ?? 0) + stueck
      updateItem(ziel.id, { quantity: neu })
      setMeldung(
        format(t('stock.merged', 'Added {n} to {model} — now {total}.'), {
          n: stueck,
          model: ziel.model,
          total: neu,
        }),
      )
    } else {
      addItem({ model: name, quantity: stueck })
      setMeldung(
        gleich.length > 0
          ? format(t('stock.duplicate', '{model} was already in stock elsewhere — created as a separate entry.'), {
              model: name,
            })
          : null,
      )
    }
    setModell('')
    setMenge('1')
    modellFeld.current?.focus()
  }

  return (
    <section className="bestand">
      {/*
        ANLEGEN IST EIN FORMULAR UND KEINE ZEILE MIT DREI KAESTEN (suite#231).

        Hier standen zwei `.leiste`-Zeilen hintereinander: Suchfeld und
        Zaehler in der einen, Modellname, Menge und „Create" in der anderen.
        Beide sahen gleich aus, und die zweite war die einzige Stelle der
        ganzen Ansicht, an der etwas ENTSTEHT. Wer das Lager zum ersten Mal
        oeffnete, sah vier Kaesten ohne Beschriftung und musste raten, welche
        zusammengehoeren.

        Jetzt ist das Anlegen ein `<details>`-Block mit Kopflinie: er ist
        offen, solange nichts im Bestand ist (dann ist es das Einzige, was zu
        tun ist), und zugeklappt, wenn die Ansicht mit Bestand oeffnet — dann
        will man meist nachsehen und nicht anlegen. Nach dem ersten Eintrag
        bleibt er offen (`useAnlegenOffen`).

        Und es ist ein `<form>`: die Eingabetaste legt an. Vorher musste man
        zur Maus greifen, um ein Wort einzutragen.
      */}
      <details className="block" {...anlegenBlock}>
        <summary>{t('stock.create.head', 'Add equipment')}</summary>
        <form
          className="zeile"
          onSubmit={(e) => {
            e.preventDefault()
            anlegen()
          }}
        >
          <label className="feld">
            {t('stock.newModel.aria', 'Name')}
            <input
              ref={modellFeld}
              value={modell}
              onChange={(e) => setModell(e.target.value)}
              placeholder={t('stock.newModel', 'e.g. Sony FX6')}
            />
          </label>
          <label className="feld schmal">
            {t('stock.col.qty', 'Qty')}
            <input value={menge} onChange={(e) => setMenge(e.target.value)} type="number" min="1" />
          </label>
          <button type="submit" className="knopf-primaer" disabled={!modell.trim()}>
            {t('stock.create', 'Create')}
          </button>
        </form>
        {meldung && (
          <p className="hinweis" role="status">
            {meldung}
          </p>
        )}
      </details>

      {items.length > 0 && (
        <div className="leiste">
          <input
            type="search"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            placeholder={t('stock.search', 'Search — model, manufacturer, supplier, location')}
            aria-label={t('stock.search.aria', 'Search the stock')}
          />
          <span className="zaehler">
            {format(t('stock.countOf', '{shown} of {all}'), {
              shown: gefiltert.length,
              all: items.length,
            })}
          </span>
        </div>
      )}

      {items.length === 0 ? (
        <div className="leer-flaeche">
          <p className="leer">
            {t(
              'stock.empty',
              'Nothing here yet. Type a name above and press Create. Already have a list? File → Open.',
            )}
          </p>
        </div>
      ) : gefiltert.length === 0 ? (
        <div className="leer-flaeche">
          {/* Ein Suchbegriff ohne Treffer ist etwas anderes als ein leeres
              Lager, und vorher sagte die Ansicht dazu gar nichts: die Tabelle
              stand einfach ohne Zeilen da.

              Als JSX-Kommentar INNERHALB des Elements und nicht als `//`
              davor: `lang:check` liest den Text zwischen einem
              schliessenden und dem naechsten oeffnenden Zeichen als
              Oberflaeche, und ein deutscher Kommentar an dieser Stelle
              faellt dort als Fallback in der falschen Sprache auf. */}
          <p className="leer">
            {format(t('stock.noHit', 'Nothing matches "{q}". {all} models are in stock.'), {
              q: suche.trim(),
              all: items.length,
            })}
          </p>
          <button type="button" onClick={() => setSuche('')}>
            {t('stock.clearSearch', 'Clear the search')}
          </button>
        </div>
      ) : (
        <TabelleRahmen>
          <table>
            <thead>
              <tr>
                <th>{t('stock.col.model', 'Name')}</th>
                {mitKategorie && <th>{t('stock.col.category', 'Category')}</th>}
                <th className="rechts">{t('stock.col.qty', 'Qty')}</th>
                {/*
                  „Ziel" und nicht „Mindestmenge": die Spalte ist schmal, und
                  der Kopf muss neben der Zahl lesbar bleiben. Was gemeint
                  ist, sagt das `title` der Zelle und der Satz unter der
                  Tabelle — eine abgeschnittene Ueberschrift sagt gar nichts.
                */}
                <th
                  className="rechts"
                  title={t('stock.target.title', 'When to reorder or sub-hire. Empty means: not decided.')}
                >
                  {t('stock.col.target', 'Target')}
                </th>
                <th>{t('stock.col.ownership', 'Ownership')}</th>
                <th>{t('stock.col.location', 'Location')}</th>
                {mitLieferant && <th>{t('stock.col.supplier', 'Supplier')}</th>}
                <th />
              </tr>
            </thead>
            <tbody>
              {gefiltert.map((i) => (
                <tr key={i.id}>
                  <td data-spalte={t('stock.col.model', 'Name')}>
                    {i.model}
                    {i.manufacturer ? <span className="leise"> · {i.manufacturer}</span> : null}
                  </td>
                  {mitKategorie && <td data-spalte={t('stock.col.category', 'Category')}>{i.category ?? ''}</td>}
                  <td className="rechts" data-spalte={t('stock.col.qty', 'Qty')}>
                    <input
                      type="number"
                      min="0"
                      value={i.quantity}
                      onChange={(e) => {
                        const n = Number(e.target.value)
                        if (Number.isFinite(n) && n >= 0) updateItem(i.id, { quantity: n })
                      }}
                      aria-label={format(t('stock.aria.qty', 'Quantity of {model}'), { model: i.model })}
                      className="schmal"
                    />
                  </td>
                  <td className="rechts" data-spalte={t('stock.col.target', 'Target')}>
                    {/*
                      LEER IST EIN WERT, und zwar ein anderer als 0. Leer
                      heisst „niemand hat fuer diesen Artikel entschieden,
                      wieviel dasein muss" — er zaehlt dann in keine der drei
                      Lagen des Berichts, sondern unter „unbewertet". Eine 0
                      waere die Aussage „darf leer sein", und die trifft
                      jemand ausdruecklich.

                      Deshalb schreibt das Feld bei leerer Eingabe
                      `undefined` zurueck und nicht 0. `updateItem` setzt
                      seinen Patch per Spread — `undefined` loescht dort
                      wirklich, anders als bei `mergeDefined`.
                    */}
                    <input
                      type="number"
                      min="0"
                      value={i.mindestmenge ?? ''}
                      placeholder="—"
                      onChange={(e) => {
                        const roh = e.target.value.trim()
                        if (roh === '') {
                          updateItem(i.id, { mindestmenge: undefined })
                          return
                        }
                        const n = Number(roh)
                        if (Number.isFinite(n) && n >= 0) {
                          updateItem(i.id, { mindestmenge: Math.round(n) })
                        }
                      }}
                      aria-label={format(t('stock.aria.target', 'Minimum quantity of {model}'), { model: i.model })}
                      title={t('stock.target.title', 'When to reorder or sub-hire. Empty means: not decided.')}
                      className="schmal"
                    />
                  </td>
                  <td data-spalte={t('stock.col.ownership', 'Ownership')}>
                    <select
                      value={i.ownership ?? ''}
                      onChange={(e) =>
                        updateItem(i.id, {
                          ownership: (e.target.value || undefined) as InventoryOwnership | undefined,
                        })
                      }
                      aria-label={format(t('stock.aria.ownership', 'Ownership of {model}'), { model: i.model })}
                    >
                      {/* Leer heisst „nicht angegeben" und nicht „uns gehörend".
                          Der Unterschied entscheidet, ob das Stück im Sub-Hire
                          auftaucht. */}
                      <option value="">{t('stock.ownership.unset', 'not stated')}</option>
                      {EIGENTUM.map((o) => (
                        <option key={o} value={o}>
                          {ownershipLabel(o, t)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td data-spalte={t('stock.col.location', 'Location')}>
                    {/* Die KENNUNG zuerst und der Pfad daneben: „A1" ist das,
                        was am Regal steht und was jemand im Gang sucht;
                        „Halle 1 › Regal A › Ebene 1" sagt, wo das ist. */}
                    <LagerortZelle item={i} nodes={nodes} onSetze={(locationId) => moveItem(i.id, locationId)} />
                  </td>
                  {mitLieferant && <td data-spalte={t('stock.col.supplier', 'Supplier')}>{i.supplier ?? ''}</td>}
                  <td>
                    <button type="button" onClick={() => removeItem(i.id)} className="still">
                      {t('stock.remove', 'Remove')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabelleRahmen>
      )}
    </section>
  )
}

/**
 * Der Lagerort eines Artikels — lesbar UND eintippbar.
 *
 * ─── WARUM MAN IHN HIER TIPPEN KANN ────────────────────────────────────────
 *
 * Weil er von aussen kommt. Er steht auf einem Aufkleber, in einer CSV, im
 * Kabelplan als Freitext — und überall als TEXT. Wer „Regal A Ebene 1"
 * abliest, soll ihn eintragen können, ohne den Baum aufzuklappen.
 *
 * Aufgelöst wird er von `platzAufloesen`, derselben Stelle, die auch jeder
 * andere Weg benutzt. Zwei Auflösungen wären zwei Bedeutungen desselben
 * Textes.
 *
 * ─── UND WARUM EINE ABSAGE STEHENBLEIBT ────────────────────────────────────
 *
 * „Passt auf 2 Lagerorte: Halle 1 › Regal A · Halle 2 › Regal A. Welcher?"
 * ist eine Auskunft. Das Feld still zu leeren wäre die Behauptung, der
 * Artikel liege nirgends.
 */
function LagerortZelle({
  item,
  nodes,
  onSetze,
}: {
  item: InventoryItem
  nodes: StorageNode[]
  onSetze: (locationId: string | undefined) => MoveRefusal | undefined
}) {
  const { t } = useT()
  const [text, setText] = useState('')
  const [absage, setAbsage] = useState<string | null>(null)

  const pfad = nodePathLabel(nodes, item.locationId)
  const knoten = nodes.find((n) => n.id === item.locationId)

  const uebernehmen = () => {
    if (text.trim() === '') {
      setAbsage(null)
      return
    }
    const treffer = platzAufloesen(text, nodes, liesSchema())
    if (treffer.art === 'absage') {
      setAbsage(platzAbsageText(treffer, nodes, t))
      return
    }
    // Auch der Umzug selbst kann absagen — „liegt schon dort", „Ziel gibt
    // es nicht". Sie hier zu verschlucken hiesse, ein Feld zu leeren und
    // nichts zu sagen.
    const nein = onSetze(treffer.node.id)
    if (nein) {
      setAbsage(moveRefusalLabel(nein, t))
      return
    }
    setText('')
    setAbsage(null)
  }

  return (
    <div className="lagerort-zelle">
      {knoten ? (
        <span>
          {knoten.code && <strong className="lagerort-kennung">{knoten.code}</strong>}
          <span className="leise">{pfad}</span>
        </span>
      ) : (
        <span className="leise">{item.stockLocation ?? t('stock.nowhere', 'not put away')}</span>
      )}
      <input
        value={text}
        placeholder={t('stock.setPlace', 'Type a shelf or case…')}
        aria-label={t('stock.setPlaceFor', 'Set the location')}
        onChange={(e) => setText(e.target.value)}
        onBlur={uebernehmen}
        onKeyDown={(e) => {
          if (e.key === 'Enter') uebernehmen()
        }}
      />
      {absage && <span className="befund nein">{absage}</span>}
    </div>
  )
}
