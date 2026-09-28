// ───────────────────────────────────────────────────────────────────────────
// Ladung — was mitfährt, und ob das Fahrzeug es trägt
//
// Container aus dem Lagerbaum auswählen, Fahrzeug zuordnen, und dann die zwei
// Zahlen sehen, auf die es ankommt: das bekannte Gesamtgewicht gegen die
// Nutzlast — und daneben, wie viele Stücke KEIN Gewicht tragen.
//
// Die zweite Zahl ist der Grund, warum die erste nicht allein dasteht. Eine
// Summe ohne sie wäre eine Behauptung: niemand sähe, wie viel nicht darin
// steckt. Dasselbe gilt für die Stücke ohne Maße — sie fahren mit, sie fallen
// nur aus der Geometrie, und genau das muss sichtbar sein.
// ───────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import { useT } from '../i18n'
import { useInventoryStore } from '../domain/store/inventoryStore'
import { useVehicleStore } from '../domain/store/vehicleStore'
import { nodePathLabel } from '../domain/lib/storageTree'
import { useLoadStore } from '../domain/store/loadStore'
import { CONTAINER_KINDS } from '../domain/types/inventory'
import type { InventoryItem } from '../domain/types/inventory'
import type { Ladung } from '../domain/types/load'
import {
  gesamtGewicht,
  gruppen,
  loseArtikel,
  mitAktuellenMassen,
  stueckeAusArtikeln,
  stueckeAusContainern,
  unplanbar,
} from '../domain/lib/ladung'
import type { PhysicalDimensions } from '../domain/types/inventory'
import { gruppenVorschlaege } from '../domain/lib/abladegruppen'
import { gruppenFarbe } from '../domain/lib/gruppenFarben'
import { nutzlastFrei } from '../domain/lib/laderaum'
import { Ladeplan } from './Ladeplan'

export function Ladung() {
  const { t, format } = useT()
  const nodes = useInventoryStore((s) => s.nodes)
  const vehicles = useVehicleStore((s) => s.vehicles)
  const { loads: gespeichert, addLadung, addStuecke, setVehicle, removeLadung, setGruppe, setGruppenReihenfolge } =
    useLoadStore()
  const items = useInventoryStore((s) => s.items)
  const updateItem = useInventoryStore((s) => s.updateItem)
  const updateNode = useInventoryStore((s) => s.updateNode)
  const loads = useMemo(
    () => gespeichert.map((l) => mitAktuellenMassen(l, nodes, items)),
    [gespeichert, nodes, items],
  )
  const lose = useMemo(() => loseArtikel(items, nodes), [items, nodes])

  const container = useMemo(() => nodes.filter((n) => CONTAINER_KINDS.includes(n.kind)), [nodes])

  const [name, setName] = useState('')
  const [offen, setOffen] = useState<string>('')
  const [wahl, setWahl] = useState<string[]>([])
  const [wahlArtikel, setWahlArtikel] = useState<string[]>([])

  const aktuell = loads.find((l) => l.id === offen)

  const umschalten = (id: string) =>
    setWahl((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]))

  const umschaltenArtikel = (id: string) =>
    setWahlArtikel((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]))

  const uebernehmen = () => {
    if (!aktuell) return
    addStuecke(aktuell.id, [...stueckeAusContainern(nodes, wahl), ...stueckeAusArtikeln(items, wahlArtikel)])
    setWahl([])
    setWahlArtikel([])
    setOffen('')
  }

  // Was schon auf der Ladung steht, wird nicht noch einmal angeboten: ein
  // zweites Hinzufuegen luede dasselbe Stueck doppelt.
  const waehlbar = (l: { stuecke: { nodeId?: string }[] }) => {
    const drin = new Set(l.stuecke.map((s) => s.nodeId))
    return container.filter((c) => !drin.has(c.id))
  }
  const waehlbarLose = (l: { stuecke: { itemId?: string }[] }) => {
    const drin = new Set(l.stuecke.map((s) => s.itemId))
    return lose.filter((i) => !drin.has(i.id))
  }

  /** Masse nachtragen, wo sie hingehören: am Case oder am Artikel. */
  const masseSetzen = (st: { nodeId?: string; itemId?: string; dimensions?: PhysicalDimensions }, d: PhysicalDimensions) => {
    if (st.nodeId) updateNode(st.nodeId, { dimensions: d })
    else if (st.itemId) updateItem(st.itemId, { dimensions: d })
  }

  return (
    <section>
      <p className="hinweis">
        {t(
          'load.intro',
          'Create a load and pick what goes along. Sizes can be added later.',
        )}
      </p>

      <form
        className="block zeile"
        onSubmit={(e) => {
          e.preventDefault()
          // Ohne Namen heisst sie nach ihrer Nummer — ein Pflichtfeld vor dem
          // ersten Case hielt nur auf.
          // Gibt es genau ein Fahrzeug, ist es gesetzt — die Wahl hätte nur eine Antwort.
          const neu = addLadung(
            name.trim() || format(t('load.defaultName', 'Load {n}'), { n: loads.length + 1 }),
            vehicles.length === 1 ? vehicles[0]!.id : undefined,
          )
          setOffen(neu)
          setName('')
        }}
      >
        <label>
          {t('load.name', 'Load name')}
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('load.name.example', 'e.g. Festival Saturday')} />
        </label>
        <button type="submit">{t('load.add', 'Create load')}</button>
      </form>

      {loads.length === 0 && <p>{t('load.none', 'No loads yet.')}</p>}

      {loads.map((l) => {
        const gewicht = gesamtGewicht(l)
        const offeneMasse = unplanbar(l)
        const fahrzeug = vehicles.find((v) => v.id === l.vehicleId)
        const rest = fahrzeug ? nutzlastFrei(fahrzeug, gewicht.bekanntKg, t) : null

        return (
          <div className="block" key={l.id}>
            <h3>{l.name}</h3>

            <label className="feld">
              {t('load.vehicle', 'Vehicle')}
              <select value={l.vehicleId ?? ''} onChange={(e) => setVehicle(l.id, e.target.value || undefined)}>
                <option value="">{t('load.noVehicle', 'not chosen yet')}</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>

            {l.stuecke.length > 0 && (
              <p>
                {format(t('load.pieces', '{n} pieces · {kg} kg known'), {
                  n: l.stuecke.length,
                  kg: Math.round(gewicht.bekanntKg),
                })}
                {gewicht.ohneGewicht > 0 && (
                  <> · {format(t('load.noWeight', '{n} without a weight'), { n: gewicht.ohneGewicht })}</>
                )}
                {/* Die Restnutzlast nur, wenn sie eine Zahl ist: „kein Wert
                    hinterlegt" stand sonst unter jeder Ladung. */}
                {rest?.bekannt && (
                  <span className={rest.wert < 0 ? 'befund nein' : undefined}>
                    {' · '}
                    {t('load.payloadLeft', 'Payload left:')}{' '}
                    {format(t('load.payloadKg', '{kg} kg'), { kg: Math.round(rest.wert) })}
                  </span>
                )}
              </p>
            )}

            {/* Fehlende Masse sind kein Halt: das Stück fährt mit, und wer
                will, trägt sie gleich hier nach — sie landen am Case bzw.
                am Artikel und gelten dann überall. */}
            {offeneMasse.length > 0 && (
              <details className="optionen masse-liste">
                <summary>
                  {format(t('load.unplannable', 'No place in the plan yet: {n} — add sizes'), {
                    n: offeneMasse.length,
                  })}
                </summary>
                {offeneMasse.map((u) => {
                  const st = l.stuecke.find((x) => x.id === u.stueckId)
                  if (!st || (!st.nodeId && !st.itemId)) return null
                  return <MasseZeile key={u.stueckId} label={u.label} d={st.dimensions} onSetze={(d) => masseSetzen(st, d)} />
                })}
              </details>
            )}

            {gruppen(l).length > 0 && (
              <p>
                {t('load.groups', 'Unload groups:')} {gruppen(l).join(' · ')}
              </p>
            )}

            {/* ─── DIE GRUPPE AM STUECK (#22) ────────────────────────────
                Der Packer schichtet nach Abladegruppen von der Oeffnung nach
                hinten, und die Reihenfolge der Gruppen laesst sich im
                Ladeplan verschieben. Nur setzen liess sie sich nirgends — die
                Zuordnung war ein Feld ohne Weg. Hier ist der Weg. */}
            {l.stuecke.length > 0 && (
              <details className="block">
                <summary>{t('load.groupAssign', 'Unload groups per piece')}</summary>
                <Gruppenzuordnung
                  ladung={l}
                  items={items}
                  gruppen={gruppen(l)}
                  setGruppe={setGruppe}
                  setGruppenReihenfolge={setGruppenReihenfolge}
                />
              </details>
            )}

            <button
              type="button"
              className={l.id === loads.find((x) => x.stuecke.length === 0)?.id && l.id !== offen ? 'knopf-primaer' : undefined}
              onClick={() => setOffen(l.id === offen ? '' : l.id)}
            >
              {l.id === offen ? t('load.closePick', 'Close') : t('load.openPick', 'Add')}
            </button>
            <button type="button" className="still" onClick={() => removeLadung(l.id)}>
              {t('load.remove', 'Remove load')}
            </button>

            {/* Die Auswahl direkt unter ihrem Knopf: am Seitenende, unter dem
                ganzen Ladeplan, sah niemand, dass der Klick etwas getan hat. */}
            {aktuell?.id === l.id && (
              <div className="block">
                <h3>{format(t('load.pickFor', 'What goes on {name}?'), { name: aktuell.name })}</h3>
                {waehlbar(l).length === 0 && waehlbarLose(l).length === 0 && (
                  <p>{t('load.allTaken', 'Everything is already on this load.')}</p>
                )}
                {waehlbar(l).length > 0 && <p className="kicker-klein">{t('load.pick.cases', 'Cases')}</p>}
                {waehlbar(l).map((c) => (
                  <label key={c.id} className="wahl">
                    <input type="checkbox" checked={wahl.includes(c.id)} onChange={() => umschalten(c.id)} />
                    <span>
                      {c.name}
                      <em>{nodePathLabel(nodes, c.id)}</em>
                    </span>
                  </label>
                ))}
                {waehlbarLose(l).length > 0 && <p className="kicker-klein">{t('load.pick.loose', 'Loose equipment')}</p>}
                {waehlbarLose(l).map((i) => (
                  <label key={i.id} className="wahl">
                    <input type="checkbox" checked={wahlArtikel.includes(i.id)} onChange={() => umschaltenArtikel(i.id)} />
                    <span>
                      {i.model}
                      <em>{format(t('load.pick.qty', 'Qty {n}'), { n: i.quantity ?? 1 })}</em>
                    </span>
                  </label>
                ))}
                {(waehlbar(l).length > 0 || waehlbarLose(l).length > 0) && (
                  <button
                    type="button"
                    className="knopf-primaer"
                    onClick={uebernehmen}
                    disabled={wahl.length + wahlArtikel.length === 0}
                  >
                    {t('load.take', 'Add to load')}
                  </button>
                )}
              </div>
            )}

            {/* Der Ladeplan steht IN der Ladung und nicht in einem eigenen
                Reiter: er ist die Antwort auf die Frage, die diese Ansicht
                stellt, und kein zweites Werkzeug. */}
            {l.stuecke.length > 0 && <Ladeplan ladung={l} />}
          </div>
        )
      })}

    </section>
  )
}

/**
 * Die Zuordnung Stück → Abladegruppe.
 *
 * Ein Feld je Stück, mit `datalist` auf die schon vorhandenen Gruppen: Tippen
 * legt eine neue an, Auswählen nimmt eine vorhandene. Ein reines Auswahlfeld
 * ginge nicht — die Gruppen sind frei und entstehen erst bei der Arbeit.
 *
 * Der Knopf darüber sagt VORHER, was er tun wird. Bei einer Ladung mit
 * sechzig Stücken ist ein Knopf, dessen Wirkung man erst am Ergebnis sieht,
 * keine Bedienung, sondern ein Versuch.
 */
function Gruppenzuordnung({
  ladung,
  items,
  gruppen: vorhandene,
  setGruppe,
  setGruppenReihenfolge,
}: {
  ladung: Ladung
  items: readonly InventoryItem[]
  gruppen: readonly string[]
  setGruppe: (ladungId: string, stueckId: string, gruppe: string | undefined) => void
  setGruppenReihenfolge: (id: string, gruppen: string[]) => void
}) {
  const { t, format } = useT()
  const vorschlag = useMemo(() => gruppenVorschlaege(ladung, items, t), [ladung, items, t])

  const uebernehmen = () => {
    for (const v of vorschlag.setzen) setGruppe(ladung.id, v.stueckId, v.gruppe)
    setGruppenReihenfolge(ladung.id, vorschlag.reihenfolge)
  }

  return (
    <>
      <p className="hinweis">
        {format(
          t(
            'load.groupSuggest',
            '{n} of {total} pieces get a group from their category.',
          ),
          {
            n: vorschlag.setzen.length,
            total: ladung.stuecke.length,
            offen: vorschlag.offen,
            behalten: vorschlag.behalten,
          },
        )}
      </p>
      <button type="button" onClick={uebernehmen} disabled={vorschlag.setzen.length === 0}>
        {t('load.groupApply', 'Take the suggestion')}
      </button>

      <datalist id={`gruppen-${ladung.id}`}>
        {vorhandene.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>

      {ladung.stuecke.map((s) => (
        <label key={s.id}>
          <span
            className="gruppen-punkt"
            style={{ background: gruppenFarbe(s.gruppe, vorhandene) }}
            aria-hidden="true"
          />
          {s.label}
          <input
            list={`gruppen-${ladung.id}`}
            value={s.gruppe ?? ''}
            placeholder={t('load.groupNone', 'no group — unloaded last')}
            onChange={(e) => setGruppe(ladung.id, s.id, e.target.value.trim() || undefined)}
          />
        </label>
      ))}
    </>
  )
}

/** Eine Zeile: Breite, Höhe, Tiefe, Gewicht — für ein Stück ohne Masse. */
function MasseZeile({
  label,
  d,
  onSetze,
}: {
  label: string
  d: PhysicalDimensions | undefined
  onSetze: (d: PhysicalDimensions) => void
}) {
  const { t } = useT()
  const feld = (k: keyof PhysicalDimensions, titel: string) => (
    <label className="schmal">
      {titel}
      <input
        type="number"
        min={0}
        value={d?.[k] ?? ''}
        onChange={(e) => onSetze({ ...d, [k]: e.target.value === '' ? undefined : Number(e.target.value) })}
      />
    </label>
  )
  return (
    <div className="zeile masse-zeile">
      <strong>{label}</strong>
      {feld('widthMm', t('load.size.w', 'Width mm'))}
      {feld('heightMm', t('load.size.h', 'Height mm'))}
      {feld('depthMm', t('load.size.d', 'Depth mm'))}
      {feld('weightKg', t('load.size.kg', 'kg'))}
    </div>
  )
}
