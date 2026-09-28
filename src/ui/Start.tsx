// ───────────────────────────────────────────────────────────────────────────
// Start — keine Auswahl, sondern der eine nächste Schritt.
//
// Eine Liste mit fünf Schritten und vier Bereichen war schon wieder eine
// Wahl, und wer die App zum ersten Mal öffnet, liest dann, statt anzufangen.
// Deshalb steht hier genau EIN Schritt mit EINEM Knopf. Erst wenn alle fünf
// erledigt sind, wird Start zum Überblick: Zahlen, jede führt dorthin, wo sie
// herkommt. Der Stand kommt aus den Stores — „erledigt" heisst, es gibt davon
// mindestens eins.
// ───────────────────────────────────────────────────────────────────────────
import { useT } from '../i18n'
import { useInventoryStore } from '../domain/store/inventoryStore'
import { useVehicleStore } from '../domain/store/vehicleStore'
import { useLoadStore } from '../domain/store/loadStore'
import { useCheckoutStore } from '../domain/store/checkoutStore'
import { CONTAINER_KINDS } from '../domain/types/inventory'
import type { Ansicht } from './navigation'

export function Start({ onGehe }: { onGehe: (a: Ansicht) => void }) {
  const { t, format } = useT()
  const items = useInventoryStore((s) => s.items)
  const nodes = useInventoryStore((s) => s.nodes)
  const vehicles = useVehicleStore((s) => s.vehicles)
  const loads = useLoadStore((s) => s.loads)
  const records = useCheckoutStore((s) => s.records)

  const cases = nodes.filter((n) => CONTAINER_KINDS.includes(n.kind))
  const vermessen = cases.filter((c) => c.dimensions?.widthMm && c.dimensions?.heightMm && c.dimensions?.depthMm).length

  const schritte: { ziel: Ansicht; titel: string; satz: string; knopf: string; erledigt: boolean }[] = [
    {
      ziel: 'bestand',
      titel: t('start.step.items', 'Add your equipment'),
      satz: t('start.step.items.why', 'Name and quantity are enough to start.'),
      knopf: t('start.step.items.go', 'Add equipment'),
      erledigt: items.length > 0,
    },
    {
      ziel: 'lager',
      titel: t('start.step.places', 'Create shelves and cases'),
      satz: t('start.step.places.why', 'Then drag the equipment to where it sits.'),
      knopf: t('start.step.places.go', 'Create shelves and cases'),
      erledigt: cases.length > 0,
    },
    {
      ziel: 'cases',
      titel: t('start.step.measure', 'Measure your cases'),
      satz: t('start.step.measure.why', 'Pick a template or enter the outside size — needed to pack a vehicle.'),
      knopf: t('start.step.measure.go', 'Measure cases'),
      erledigt: cases.length > 0 && vermessen === cases.length,
    },
    {
      ziel: 'fahrzeuge',
      titel: t('start.step.vehicle', 'Add a vehicle'),
      satz: t('start.step.vehicle.why', 'Length, width and height of the cargo space.'),
      knopf: t('start.step.vehicle.go', 'Add a vehicle'),
      erledigt: vehicles.length > 0,
    },
    {
      ziel: 'ladung',
      titel: t('start.step.load', 'Plan a load'),
      satz: t('start.step.load.why', 'Choose the cases for a job — the app lays them out in the vehicle.'),
      knopf: t('start.step.load.go', 'Plan a load'),
      erledigt: loads.length > 0,
    },
  ]
  const nr = schritte.findIndex((s) => !s.erledigt)

  if (nr >= 0) {
    const s = schritte[nr]!
    return (
      <section className="start">
        {nr === 0 && (
          <p className="start-zweck">
            {t('start.purpose', 'Keep track of your equipment and plan how it gets packed into cases and vehicles.')}
          </p>
        )}
        <div className="naechster-schritt">
          <p className="kicker">{format(t('start.stepOf', 'Step {n} of {all}'), { n: nr + 1, all: schritte.length })}</p>
          <div className="fortschritt" aria-hidden>
            {schritte.map((x, i) => (
              <span key={x.ziel} className={i < nr ? 'fertig' : i === nr ? 'jetzt' : ''} />
            ))}
          </div>
          <h2>{s.titel}</h2>
          <p>{s.satz}</p>
          <button type="button" className="knopf-primaer gross" onClick={() => onGehe(s.ziel)}>
            {s.knopf}
          </button>
        </div>
      </section>
    )
  }

  const kacheln: { ziel: Ansicht; zahl: number; titel: string }[] = [
    { ziel: 'bestand', zahl: items.length, titel: t('start.tile.items', 'Equipment') },
    { ziel: 'lager', zahl: cases.length, titel: t('start.tile.cases', 'Cases') },
    { ziel: 'fahrzeuge', zahl: vehicles.length, titel: t('start.tile.vehicles', 'Vehicles') },
    { ziel: 'ladung', zahl: loads.length, titel: t('start.tile.loads', 'Loads') },
    { ziel: 'ausgabe', zahl: records.filter((r) => !r.in).length, titel: t('start.tile.out', 'Out right now') },
  ]
  return (
    <section className="start">
      <ul className="kacheln">
        {kacheln.map((k) => (
          <li key={k.ziel}>
            <button type="button" className="kachel-knopf" onClick={() => onGehe(k.ziel)}>
              <strong>{k.zahl}</strong>
              <span>{k.titel}</span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="knopf-primaer gross" onClick={() => onGehe('ladung')}>
        {t('start.newLoad', 'Plan a load')}
      </button>
    </section>
  )
}
