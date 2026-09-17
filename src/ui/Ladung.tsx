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
import { useLoadStore } from '../domain/store/loadStore'
import { CONTAINER_KINDS } from '../domain/types/inventory'
import { gesamtGewicht, gruppen, stueckeAusContainern, unplanbar } from '../domain/lib/ladung'
import { nutzlastFrei } from '../domain/lib/laderaum'

export function Ladung() {
  const { t, format } = useT()
  const nodes = useInventoryStore((s) => s.nodes)
  const vehicles = useVehicleStore((s) => s.vehicles)
  const { loads, addLadung, addStuecke, setVehicle, removeLadung } = useLoadStore()

  const container = useMemo(() => nodes.filter((n) => CONTAINER_KINDS.includes(n.kind)), [nodes])

  const [name, setName] = useState('')
  const [offen, setOffen] = useState<string>('')
  const [wahl, setWahl] = useState<string[]>([])

  const aktuell = loads.find((l) => l.id === offen)

  const umschalten = (id: string) =>
    setWahl((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]))

  const uebernehmen = () => {
    if (!aktuell) return
    addStuecke(aktuell.id, stueckeAusContainern(nodes, wahl))
    setWahl([])
  }

  return (
    <section>
      <h2>{t('load.head', 'Loads')}</h2>
      <p className="hinweis">
        {t(
          'load.intro',
          'Pick the containers that travel. A nested case is counted once, with its transport case — not twice.',
        )}
      </p>

      <form
        className="block"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          setOffen(addLadung(name))
          setName('')
        }}
      >
        <label>
          {t('load.name', 'Load name')}
          <input value={name} onChange={(e) => setName(e.target.value)} />
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

            <label>
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

            <p>
              {format(t('load.pieces', '{n} pieces · {kg} kg known'), {
                n: l.stuecke.length,
                kg: Math.round(gewicht.bekanntKg),
              })}
              {gewicht.ohneGewicht > 0 && (
                <> · {format(t('load.noWeight', '{n} without a weight'), { n: gewicht.ohneGewicht })}</>
              )}
            </p>

            {rest && (
              <p className={rest.bekannt && rest.wert < 0 ? 'befund nein' : undefined}>
                {t('load.payloadLeft', 'Payload left:')}{' '}
                {rest.bekannt
                  ? format(t('load.payloadKg', '{kg} kg'), { kg: Math.round(rest.wert) })
                  : rest.grund}
              </p>
            )}

            {offeneMasse.length > 0 && (
              <p className="befund offen">
                {format(t('load.unplannable', '{n} pieces cannot be laid out — they still travel'), {
                  n: offeneMasse.length,
                })}
                : {offeneMasse.map((u) => u.label).join(', ')}
              </p>
            )}

            {gruppen(l).length > 0 && (
              <p>
                {t('load.groups', 'Unload groups:')} {gruppen(l).join(' · ')}
              </p>
            )}

            <button type="button" onClick={() => setOffen(l.id === offen ? '' : l.id)}>
              {l.id === offen ? t('load.closePick', 'Close picker') : t('load.openPick', 'Add containers')}
            </button>
            <button type="button" onClick={() => removeLadung(l.id)}>
              {t('load.remove', 'Remove load')}
            </button>
          </div>
        )
      })}

      {aktuell && (
        <div className="block">
          <h3>{format(t('load.pickFor', 'Containers for {name}'), { name: aktuell.name })}</h3>
          {container.length === 0 && <p>{t('load.noContainers', 'No cases or transport cases in stock yet.')}</p>}
          {container.map((c) => (
            <label key={c.id}>
              <input type="checkbox" checked={wahl.includes(c.id)} onChange={() => umschalten(c.id)} />
              {c.name}
            </label>
          ))}
          <button type="button" onClick={uebernehmen} disabled={wahl.length === 0}>
            {t('load.take', 'Add to load')}
          </button>
        </div>
      )}
    </section>
  )
}
