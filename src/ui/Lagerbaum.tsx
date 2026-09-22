// ───────────────────────────────────────────────────────────────────────────
// Der Lagerbaum — wo liegt was, und was steckt worin?
//
// ─── DER BEFUND, GEMESSEN 2026-09-18 ───────────────────────────────────────
//
// Von sieben schreibenden Verben des Bestands-Stores erreichte die Oberfläche
// genau eines. `addNode`, `moveNode`, `moveItem`, `removeNode`, `addSet` und
// `addUnit` hatten keinen Knopf — obwohl `wouldCreateCycle` und `moveRefusal`
// fertig dalagen, mit Tests. Man konnte in diesem Lager nichts in ein Case
// legen. `movesCsv` hatte ebenfalls keinen Aufrufer: das Journal wurde
// geschrieben und nie ausgegeben.
//
// Das ist dieselbe Defektform, die `oberflaecheErreichbar.node.test.ts` für
// die Rechenmodule misst — nur eine Schicht tiefer. Für den Lageristen ist
// ein Vorgang, den kein Weg erreicht, kein Vorgang.
//
// ─── WARUM MIT DEM FINGER UND NICHT MIT HTML5-DRAG ─────────────────────────
//
// HTML5 `draggable` gibt es auf einem Touch-Gerät nicht. Am Dock und im
// Regalgang steht ein Telefon oder ein Tablet — dieselbe Begründung, aus der
// die Draufsicht der Ladeplanung schon auf Zeiger-Ereignisse setzt. Gezogen
// wird deshalb mit `setPointerCapture` und `elementFromPoint`, und dasselbe
// Ziehen funktioniert mit der Maus.
//
// ─── DIE ABSAGE HAT EINEN NAMEN, UND ZWAR SCHON BEIM ZIEHEN ────────────────
//
// `moveRefusal` beantwortet WARUM ein Umzug nicht geht. Der Lagerbaum fragt
// sie nicht erst beim Loslassen, sondern während der Finger über dem Ziel
// steht: „Ein Container kann nicht in sich selbst" gehört gelesen, BEVOR
// jemand loslässt und nichts passiert. Ein Vorgang, der ohne Grund nichts
// tut, ist von einem kaputten Programm nicht zu unterscheiden.
//
// ─── WAS DIESE ANSICHT NICHT TUT ───────────────────────────────────────────
//
// Sie legt keine Sets und keine serialisierten Einheiten an. `addSet` und
// `addUnit` bleiben ohne Bedienung — das sind zwei andere Fragen (ein Kit ist
// keine Lagerstelle, eine Einheit ist ein Stück mit Seriennummer), und sie in
// denselben Baum zu hängen hiesse, drei Dinge zu vermischen, weil sie im
// selben Store liegen.
// ───────────────────────────────────────────────────────────────────────────
import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import { herunterladen } from '../lib/herunterladen'
import { useT } from '../i18n'
import { useInventoryStore } from '../domain/store/inventoryStore'
import { useStorageMoveStore } from '../domain/store/storageMoveStore'
import { isContainerKind, itemsInNode, nodePathLabel } from '../domain/lib/storageTree'
import { moveRefusal, moveTable } from '../domain/lib/storageMoves'
import { moveRefusalLabel, moveSubjectLabel } from '../domain/types/storageMove'
import { toCsv } from '../lib/csv'
import type { InventoryItem, StorageNode, StorageNodeKind } from '../domain/types/inventory'
import type { MoveRefusal, MoveSubjectKind } from '../domain/types/storageMove'
import { Grundriss } from './Grundriss'
import { Kennungsschemata } from './Kennungsschema'
import { planBeschriftung } from '../lib/kennungsablage'

/**
 * Der Raum in 3D liegt hinter der Lazy-Grenze — genau wie die Ladeansicht.
 * Three wiegt gemessen 950 kB; wer nur etwas in ein Case legen will, soll
 * sie nicht laden.
 */
const Lagerraum3D = lazy(() => import('./Lagerraum3D'))

const KINDS: StorageNodeKind[] = ['depot', 'room', 'shelf', 'bin', 'case', 'transportCase']

/** Beschriftung je Art — als FUNKTION, siehe `moveSubjectLabel`. */
function kindLabel(kind: StorageNodeKind, t: (k: string, en: string) => string): string {
  switch (kind) {
    case 'depot':
      return t('tree.kind.depot', 'Depot')
    case 'room':
      return t('tree.kind.room', 'Room')
    case 'shelf':
      return t('tree.kind.shelf', 'Shelf')
    case 'bin':
      return t('tree.kind.bin', 'Bin')
    case 'case':
      return t('tree.kind.case', 'Case')
    default:
      return t('tree.kind.transportCase', 'Transport case')
  }
}

/** Was gerade am Finger hängt. */
interface Zug {
  art: MoveSubjectKind
  id: string
  label: string
  /** Wo es herkommt — für `moveRefusal`. */
  von: string | undefined
  x: number
  y: number
  /** Der Knoten unter dem Finger, oder `''` für die Wurzel-Ablage. */
  ziel: string | null
}

/**
 * Was die Baum-Zeilen von der Ansicht brauchen.
 *
 * Als EIN Bündel und nicht als fünfzehn Props: der Baum reicht es unverändert
 * durch jede Ebene weiter, und eine Liste, die bei jeder Änderung an drei
 * Stellen nachgezogen werden muss, ist die Stelle, an der etwas vergessen
 * wird.
 */
interface BaumKontext {
  t: (key: string, en: string) => string
  format: (text: string, werte: Record<string, string | number>) => string
  items: InventoryItem[]
  nodes: StorageNode[]
  kinder: Map<string, StorageNode[]>
  zu: ReadonlySet<string>
  setZu: React.Dispatch<React.SetStateAction<ReadonlySet<string>>>
  zug: Zug | null
  greife: (e: React.PointerEvent, z: Omit<Zug, 'x' | 'y' | 'ziel'>) => void
  zeigerBewegt: (e: React.PointerEvent) => void
  zeigerLos: () => void
  absage: (z: Zug, zielId: string | undefined) => MoveRefusal | null
  removeNode: (id: string) => void
}

/**
 * Ein Knoten mit allem, was darin liegt.
 *
 * AUSSERHALB VON `Lagerbaum` UND NICHT DARIN. Er stand zuerst als lokale
 * Funktion in der Komponente — und war damit bei JEDEM Rendern ein neuer
 * Komponenten-Typ. React haengt einen solchen Teilbaum ab und neu an, statt
 * ihn zu aktualisieren: mit ihm verschwindet das Element, das
 * `setPointerCapture` haelt, und der Zug reisst mitten in der Bewegung ab.
 * Gemessen am 2026-09-18: die Absage erschien noch, der Umzug kam nie an.
 */
function Knoten({
  n,
  tiefe,
  ctx,
}: {
  n: StorageNode
  tiefe: number
  ctx: BaumKontext
}) {
  const { t, format, items, nodes, kinder, zu, setZu, zug, greife, zeigerBewegt, zeigerLos, absage, removeNode } = ctx
  const drin = itemsInNode(items, nodes, n.id)
  const unterKnoten = kinder.get(n.id) ?? []
  const offen = !zu.has(n.id)
  const container = isContainerKind(n.kind)
  const nein = zug && zug.ziel === n.id ? absage(zug, n.id) : null
  const angepeilt = zug?.ziel === n.id

  return (
    <li>
      <div
        data-ablage={n.id}
        className={`baum-zeile${angepeilt ? (nein ? ' nein' : ' ziel') : ''}`}
        style={{ paddingLeft: `calc(${tiefe} * var(--steg-4))` }}
      >
        <button
          type="button"
          className="baum-falten"
          aria-expanded={offen}
          onClick={() =>
            setZu((s) => {
              const next = new Set(s)
              if (next.has(n.id)) next.delete(n.id)
              else next.add(n.id)
              return next
            })
          }
        >
          {unterKnoten.length + drin.length === 0 ? '·' : offen ? '−' : '+'}
        </button>

        {/* Der Griff. Er ist ein eigenes Element und nicht die ganze Zeile:
            sonst könnte man den Baum nicht mehr scrollen, ohne etwas zu
            verschieben — am Telefon der erste Griff, den jemand tut. */}
        <span
          className="baum-griff"
          role="button"
          tabIndex={0}
          aria-label={format(t('tree.grab', 'Move {name}'), { name: n.name })}
          onPointerDown={(e) => greife(e, { art: 'node', id: n.id, label: n.name, von: n.parentId })}
          onPointerMove={zeigerBewegt}
          onPointerUp={zeigerLos}
          onPointerCancel={zeigerLos}
        >
          ⠿
        </span>

        <strong>{n.name}</strong>
        <span className="leise">
          {kindLabel(n.kind, t)}
          {n.code ? ` · ${n.code}` : ''}
          {container ? ` · ${t('tree.container', 'container')}` : ''}
        </span>

        <button type="button" className="still" onClick={() => removeNode(n.id)}>
          {t('tree.remove', 'Remove')}
        </button>
      </div>

      {angepeilt && nein && <p className="befund nein baum-absage">{moveRefusalLabel(nein, t)}</p>}

      {offen && (
        <ul className="baum-liste">
          {unterKnoten.map((k) => (
            <Knoten key={k.id} n={k} tiefe={tiefe + 1} ctx={ctx} />
          ))}
          {drin.map((it) => (
            <li key={it.id}>
              <Artikel it={it} tiefe={tiefe + 1} ctx={ctx} />
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

/** Eine Artikel-Zeile — im Baum und in „nicht eingeräumt" dieselbe. */
function Artikel({
  it,
  tiefe,
  ctx,
}: {
  it: InventoryItem
  tiefe: number
  ctx: BaumKontext
}) {
  const { t, format, greife, zeigerBewegt, zeigerLos } = ctx
  return (
    <div className="baum-zeile artikel" style={{ paddingLeft: `calc(${tiefe} * var(--steg-4))` }}>
      <span className="baum-falten" aria-hidden>
        ·
      </span>
      <span
        className="baum-griff"
        role="button"
        tabIndex={0}
        aria-label={format(t('tree.grab', 'Move {name}'), { name: it.model })}
        onPointerDown={(e) =>
          greife(e, { art: 'item', id: it.id, label: it.model, von: it.locationId })
        }
        onPointerMove={zeigerBewegt}
        onPointerUp={zeigerLos}
        onPointerCancel={zeigerLos}
      >
        ⠿
      </span>
      {it.model}
      <span className="leise">{format(t('tree.qty', '{n} pcs'), { n: it.quantity })}</span>
    </div>
  )
}

export function Lagerbaum() {
  const { t, format } = useT()
  const items = useInventoryStore((s) => s.items)
  const nodes = useInventoryStore((s) => s.nodes)
  const addNode = useInventoryStore((s) => s.addNode)
  const moveNode = useInventoryStore((s) => s.moveNode)
  const moveItem = useInventoryStore((s) => s.moveItem)
  const removeNode = useInventoryStore((s) => s.removeNode)
  const moves = useStorageMoveStore((s) => s.moves)

  const [zug, setZug] = useState<Zug | null>(null)
  const [meldung, setMeldung] = useState<{ art: 'ok' | 'nein'; text: string } | null>(null)
  const [zu, setZu] = useState<ReadonlySet<string>>(new Set())
  /**
   * BAUM, GRUNDRISS oder RAUM — drei Fragen an dieselben Knoten.
   *
   * Der Baum sagt „worin", der Grundriss „wo", der Raum „wie hoch". Drei
   * Reiter daraus zu machen hiesse, dreimal dieselbe Auswahl zu treffen und
   * den Stand von Hand zu übertragen; dieselbe Entscheidung wie beim
   * Modus-Schalter der Ladeplanung.
   */
  const [modus, setModus] = useState<'baum' | 'grundriss' | 'raum'>('baum')
  const [name, setName] = useState('')
  const [kind, setKind] = useState<StorageNodeKind>('shelf')
  const [unter, setUnter] = useState('')
  const zugRef = useRef<Zug | null>(null)

  const kinder = useMemo(() => {
    const m = new Map<string, StorageNode[]>()
    for (const n of nodes) {
      const key = n.parentId ?? ''
      const liste = m.get(key)
      if (liste) liste.push(n)
      else m.set(key, [n])
    }
    for (const liste of m.values()) liste.sort((a, b) => a.name.localeCompare(b.name))
    return m
  }, [nodes])

  /**
   * Die Absage für den gerade angepeilten Zug — oder `null`, wenn er geht.
   *
   * Sie wird beim ZIEHEN gerechnet und nicht erst beim Loslassen: siehe Kopf.
   */
  const absage = (z: Zug, zielId: string | undefined) => {
    const subject = z.art === 'node' ? { id: z.id, currentPlaceId: z.von } : { id: z.id, currentPlaceId: z.von }
    return moveRefusal(nodes, z.art, subject, zielId)
  }

  const zeigerBewegt = (e: React.PointerEvent) => {
    const z = zugRef.current
    if (!z) return
    // Was liegt unter dem Finger? Der Geist selbst traegt `pointer-events:
    // none`, sonst fände `elementFromPoint` immer nur ihn.
    const unterFinger = document.elementFromPoint(e.clientX, e.clientY)
    const zeile = unterFinger?.closest<HTMLElement>('[data-ablage]')
    const ziel = zeile ? (zeile.dataset.ablage ?? null) : null
    const next = { ...z, x: e.clientX, y: e.clientY, ziel }
    zugRef.current = next
    setZug(next)
  }

  const zeigerLos = () => {
    const z = zugRef.current
    zugRef.current = null
    setZug(null)
    if (!z || z.ziel === null) return

    const zielId = z.ziel === '' ? undefined : z.ziel
    const nein = z.art === 'node' ? moveNode(z.id, zielId) : moveItem(z.id, zielId)
    if (nein) {
      setMeldung({ art: 'nein', text: moveRefusalLabel(nein, t) })
      return
    }
    setMeldung({
      art: 'ok',
      text: format(t('tree.moved', '{what} is now in {where}.'), {
        what: z.label,
        where: zielId ? nodePathLabel(nodes, zielId) : t('tree.root', 'the warehouse itself'),
      }),
    })
  }

  const greife = (e: React.PointerEvent, z: Omit<Zug, 'x' | 'y' | 'ziel'>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const next: Zug = { ...z, x: e.clientX, y: e.clientY, ziel: null }
    zugRef.current = next
    setZug(next)
    setMeldung(null)
  }

  const anlegen = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    addNode({ name: name.trim(), kind, parentId: unter || undefined })
    setName('')
  }

  const auswerfen = () => {
    const tabelle = moveTable(
      moves,
      nodes,
      (art: MoveSubjectKind, id: string) =>
        art === 'node'
          ? (nodes.find((n) => n.id === id)?.name ?? id)
          : (items.find((i) => i.id === id)?.model ?? id),
      t,
    )
    const blob = new Blob([toCsv(tabelle.headers, tabelle.rows)], {
      type: 'text/csv;charset=utf-8',
    })
        herunterladen(blob, 'umlagerungen.csv')
  }

  const ctx: BaumKontext = {
    t,
    format,
    items,
    nodes,
    kinder,
    zu,
    setZu,
    zug,
    greife,
    zeigerBewegt,
    zeigerLos,
    absage,
    removeNode,
  }

  const wurzeln = kinder.get('') ?? []
  const ohneOrt = items.filter((i) => !i.locationId)

  return (
    <section className="lagerbaum">
      <div className="ladeplan-leiste">
        <div className="modus-schalter" role="group" aria-label={t('tree.mode', 'View')}>
          {([
            ['baum', t('tree.modeTree', 'Tree')],
            ['grundriss', t('tree.modePlan', 'Floor plan')],
            ['raum', t('tree.modeRoom', 'In 3D')],
          ] as const).map(([id, titel]) => (
            <button
              key={id}
              type="button"
              aria-pressed={modus === id}
              className={modus === id ? 'reiter aktiv' : 'reiter'}
              onClick={() => setModus(id)}
            >
              {titel}
            </button>
          ))}
        </div>
      </div>

      {modus === 'grundriss' && (
        <>
          <Grundriss beschriftung={planBeschriftung} />
          <Kennungsschemata />
        </>
      )}

      {modus === 'raum' && (
        <Suspense fallback={<p className="hinweis">{t('plan.loading3d', 'Loading the 3D view…')}</p>}>
          <Lagerraum3D beschriftung={planBeschriftung} />
        </Suspense>
      )}

      {modus === 'baum' && (
      <>
      <p className="hinweis">
        {t(
          'tree.intro',
          'Drag a location, a case or an article onto the place it belongs — with the mouse or with your finger. Every move is written to the journal, and a move that cannot happen says why before you let go.',
        )}
      </p>

      <details>
        <summary>{t('tree.create.head', 'Add a location or case')}</summary>
        <form className="block" onSubmit={anlegen}>
          <div className="zeile">
            <label>
              {t('tree.name', 'Name')}
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              {t('tree.kind', 'Kind')}
              <select value={kind} onChange={(e) => setKind(e.target.value as StorageNodeKind)}>
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {kindLabel(k, t)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('tree.under', 'Inside')}
              <select value={unter} onChange={(e) => setUnter(e.target.value)}>
                <option value="">{t('tree.root', 'the warehouse itself')}</option>
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {nodePathLabel(nodes, n.id)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" className="knopf-primaer">
            {t('tree.add', 'Add')}
          </button>
        </form>
      </details>

      {meldung && (
        <p className={meldung.art === 'nein' ? 'befund nein' : 'befund ja'}>{meldung.text}</p>
      )}

      {nodes.length === 0 ? (
        <p>{t('tree.none', 'No locations yet. A case needs a place before anything can go into it.')}</p>
      ) : (
        <ul className="baum-liste wurzel">
          {wurzeln.map((n) => (
            <Knoten key={n.id} n={n} tiefe={0} ctx={ctx} />
          ))}
        </ul>
      )}

      {/* Die Ablage „aus allem heraus". Ohne sie gäbe es keinen Weg zurück:
          was einmal in einem Case liegt, käme nie wieder auf die Fläche. */}
      <div
        data-ablage=""
        className={`baum-wurzelablage${zug?.ziel === '' ? ' ziel' : ''}`}
      >
        {t('tree.dropRoot', 'Drop here to take it out of everything')}
      </div>

      {ohneOrt.length > 0 && (
        <div className="block">
          <h3>{format(t('tree.unplaced', 'Not put away ({n})'), { n: ohneOrt.length })}</h3>
          <ul className="baum-liste">
            {ohneOrt.map((it) => (
              <li key={it.id}>
                <Artikel it={it} tiefe={0} ctx={ctx} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="block">
        <h3>{t('tree.journal', 'Moves')}</h3>
        <p className="hinweis">
          {t(
            'tree.journalHint',
            'Every move is recorded. This is the record that answers "where was it last", when the recorded location and reality have drifted apart.',
          )}
        </p>
        {moves.length === 0 ? (
          <p className="leise">{t('tree.journalEmpty', 'Nothing moved yet.')}</p>
        ) : (
          <>
            <ol className="umzug-liste">
              {moves
                .slice()
                .sort((a, b) => b.at.localeCompare(a.at))
                .slice(0, 20)
                .map((m, i) => (
                  <li key={`${m.at}-${i}`}>
                    <span className="leise">{moveSubjectLabel(m.kind, t)}</span>{' '}
                    {m.kind === 'node'
                      ? (nodes.find((n) => n.id === m.subjectId)?.name ?? m.subjectId)
                      : (items.find((x) => x.id === m.subjectId)?.model ?? m.subjectId)}
                    {' → '}
                    {m.toLabel || t('tree.root', 'the warehouse itself')}
                  </li>
                ))}
            </ol>
            <button type="button" className="still" onClick={auswerfen}>
              {t('tree.csv', 'Moves as CSV')}
            </button>
          </>
        )}
      </div>

      </>
      )}

      {/* Der Geist am Finger. `pointer-events: none` ist Pflicht, sonst
          findet `elementFromPoint` immer nur ihn selbst. */}
      {zug && (
        <div className="baum-geist" style={{ left: zug.x, top: zug.y }} aria-hidden>
          {zug.label}
        </div>
      )}
    </section>
  )
}
