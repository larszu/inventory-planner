// ───────────────────────────────────────────────────────────────────────────
// Stapeln — „passt das aufeinander, und wie hoch wird der Turm?"
//
// ─── WARUM DIESE ANSICHT ÜBERHAUPT EXISTIERT ───────────────────────────────
//
// Weil `domain/lib/stapeln.ts` sonst ein Rechenwerk wäre, das kein Knopf
// erreicht — und `oberflaecheErreichbar.node.test.ts` sagt zu Recht, dass das
// für den Lageristen kein Rechenwerk ist. Die Regel hat die Ansicht erzwungen,
// nicht ein Wunsch nach einer weiteren Ansicht.
//
// ─── WAS SIE ZEIGT UND WAS NICHT ───────────────────────────────────────────
//
// Zwei Container wählen, und die Antwort steht da: ja, nein, oder — und das
// ist der Punkt — „nicht angegeben". Die dritte Antwort wird ausdrücklich
// ANDERS dargestellt als die zweite. Ein Case, dessen Rollenabstand niemand
// gemessen hat, ist nicht „passt nicht"; es ist eine offene Frage, und wer sie
// wie ein Nein behandelt, sortiert brauchbare Cases aus.
//
// Die Eingabefelder daneben sind der Grund, warum die Antwort überhaupt eine
// werden kann: ohne Rollenhöhe, Tellertiefe und die beiden Raster rechnet hier
// niemand etwas. `includedInHeightMm` ist bewusst eine Auswahl ohne Vorgabe —
// „nicht gesetzt" ist eine eigene Lage, und ein geratenes Nein wäre pro Lage
// ein Fehler von einer ganzen Rollenhöhe.
// ───────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import { useT } from '../i18n'
import { useInventoryStore } from '../domain/store/inventoryStore'
import { CONTAINER_KINDS, type StorageNode } from '../domain/types/inventory'
import type { CastorKind, TransportSpec } from '../domain/types/transport'
import { hoeheInLage, passtAufeinander, stapelHoehe } from '../domain/lib/stapeln'

/** Eine Zahl aus einem Feld — leer heisst „nicht angegeben", nicht null. */
const zahl = (v: string): number | undefined => {
  const n = Number(v)
  return v.trim() !== '' && Number.isFinite(n) && n > 0 ? n : undefined
}

export function Stapeln() {
  const { t, format } = useT()
  const nodes = useInventoryStore((s) => s.nodes)
  const updateNode = useInventoryStore((s) => s.updateNode)

  const container = useMemo(
    () => nodes.filter((n) => CONTAINER_KINDS.includes(n.kind)),
    [nodes],
  )

  const [untenId, setUntenId] = useState('')
  const [obenId, setObenId] = useState('')

  const unten = container.find((c) => c.id === untenId)
  const oben = container.find((c) => c.id === obenId)

  const befund = unten && oben ? passtAufeinander(unten, oben, 'upright', t) : null
  const turm = unten && oben ? stapelHoehe(unten, oben) : null

  const setzeTransport = (node: StorageNode, teil: Partial<TransportSpec>) => {
    updateNode(node.id, { transport: { ...node.transport, ...teil } })
  }

  return (
    <section>
      <h2>{t('stack.head', 'Stacking check')}</h2>
      <p className="hinweis">
        {t(
          'stack.intro',
          'Pick the lower and the upper container. The answer distinguishes "does not fit" from "not measured" — those are different problems.',
        )}
      </p>

      {container.length === 0 && <p>{t('stack.noContainers', 'No cases or transport cases in stock yet.')}</p>}

      <div className="zeile">
        <label>
          {t('stack.lower', 'Lower container')}
          <select value={untenId} onChange={(e) => setUntenId(e.target.value)}>
            <option value="">{t('stack.choose', 'Choose…')}</option>
            {container.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t('stack.upper', 'Upper container')}
          <select value={obenId} onChange={(e) => setObenId(e.target.value)}>
            <option value="">{t('stack.choose', 'Choose…')}</option>
            {container.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {befund && (
        <p className={befund.geht ? 'befund ja' : befund.art === 'regel' ? 'befund nein' : 'befund offen'}>
          {befund.geht
            ? t('stack.fits', 'Fits.')
            : befund.art === 'nicht-angegeben'
              ? `${t('stack.unknown', 'Not measured:')} ${befund.grund}`
              : `${t('stack.doesNotFit', 'Does not fit:')} ${befund.grund}`}
        </p>
      )}

      {turm !== null && (
        <p>{format(t('stack.height', 'Stack height {mm} mm'), { mm: turm })}</p>
      )}
      {befund && turm === null && (
        <p>{t('stack.heightUnknown', 'Stack height cannot be computed — a measurement is missing.')}</p>
      )}

      {unten && <TransportFelder node={unten} rolle={t('stack.lower', 'Lower container')} onChange={setzeTransport} />}
      {oben && oben.id !== unten?.id && (
        <TransportFelder node={oben} rolle={t('stack.upper', 'Upper container')} onChange={setzeTransport} />
      )}
    </section>
  )
}

function TransportFelder({
  node,
  rolle,
  onChange,
}: {
  node: StorageNode
  rolle: string
  onChange: (node: StorageNode, teil: Partial<TransportSpec>) => void
}) {
  const { t, format } = useT()
  const c = node.transport?.castors
  const s = node.transport?.stackTop

  return (
    <details>
      <summary>{format(t('stack.fields', 'Transport data — {name} ({role})'), { name: node.name, role: rolle })}</summary>

      <p className="hinweis">
        {format(t('stack.heightNow', 'Height in place: {mm}'), {
          mm: hoeheInLage(node) ?? t('stack.notGiven', 'not given'),
        })}
      </p>

      <label>
        {t('stack.castorHeight', 'Castor height (mm)')}
        <input
          type="number"
          value={c?.heightMm ?? ''}
          onChange={(e) =>
            onChange(node, {
              castors: {
                heightMm: zahl(e.target.value) ?? 0,
                includedInHeightMm: c?.includedInHeightMm ?? false,
                kind: c?.kind ?? 'swivel',
                insetMm: c?.insetMm,
                braked: c?.braked,
              },
            })
          }
        />
      </label>

      <label>
        {t('stack.castorIncluded', 'Castor height already included in the case height?')}
        <select
          value={c?.includedInHeightMm === undefined ? '' : c.includedInHeightMm ? 'ja' : 'nein'}
          onChange={(e) =>
            c &&
            onChange(node, { castors: { ...c, includedInHeightMm: e.target.value === 'ja' } })
          }
        >
          <option value="">{t('stack.notMeasured', 'not measured')}</option>
          <option value="ja">{t('stack.yes', 'yes')}</option>
          <option value="nein">{t('stack.no', 'no')}</option>
        </select>
      </label>

      <label>
        {t('stack.castorKind', 'Castor type')}
        <select
          value={c?.kind ?? 'swivel'}
          onChange={(e) => c && onChange(node, { castors: { ...c, kind: e.target.value as CastorKind } })}
        >
          <option value="swivel">{t('stack.kind.swivel', 'free swivel')}</option>
          <option value="swivelAuto">{t('stack.kind.auto', 'auto-aligning')}</option>
          <option value="fixed">{t('stack.kind.fixed', 'fixed')}</option>
        </select>
      </label>

      <label>
        {t('stack.dishDepth', 'Dish recess depth (mm)')}
        <input
          type="number"
          value={s?.recessDepthMm ?? ''}
          onChange={(e) =>
            onChange(node, {
              stackTop: {
                recessDepthMm: zahl(e.target.value) ?? 0,
                fitsCastorMm: s?.fitsCastorMm ?? 100,
                dishInsetMm: s?.dishInsetMm ?? { x: 0, y: 0 },
                innerProtrusionMm: s?.innerProtrusionMm,
              },
            })
          }
        />
      </label>

      <label>
        {t('stack.noLoadOnTop', 'Nothing may be stacked on this case')}
        <input
          type="checkbox"
          checked={node.transport?.noLoadOnTop ?? false}
          onChange={(e) => onChange(node, { noLoadOnTop: e.target.checked || undefined })}
        />
      </label>
    </details>
  )
}
