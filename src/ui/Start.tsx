// ───────────────────────────────────────────────────────────────────────────
// Start — wofür das Werkzeug da ist, und was als Nächstes zu tun ist.
//
// Die Schritte lesen den Stand aus den Stores und behaupten nichts: „erledigt"
// heisst, es gibt davon mindestens eins. Nur der NÄCHSTE offene Schritt trägt
// den Primärknopf — ein roter Punkt pro Sichtfeld (ADR-007).
// ───────────────────────────────────────────────────────────────────────────
import { useT } from '../i18n'
import { useInventoryStore } from '../domain/store/inventoryStore'
import { useVehicleStore } from '../domain/store/vehicleStore'
import { useLoadStore } from '../domain/store/loadStore'
import { CONTAINER_KINDS } from '../domain/types/inventory'
import type { Ansicht, BereichDef } from './navigation'

interface Props {
  bereiche: BereichDef[]
  onGehe: (a: Ansicht) => void
}

export function Start({ bereiche, onGehe }: Props) {
  const { t, format } = useT()
  const items = useInventoryStore((s) => s.items)
  const nodes = useInventoryStore((s) => s.nodes)
  const vehicles = useVehicleStore((s) => s.vehicles)
  const loads = useLoadStore((s) => s.loads)

  const cases = nodes.filter((n) => CONTAINER_KINDS.includes(n.kind))
  const vermessen = cases.filter(
    (c) => c.dimensions?.widthMm && c.dimensions?.heightMm && c.dimensions?.depthMm,
  ).length

  const schritte: { ziel: Ansicht; titel: string; wozu: string; erledigt: boolean; stand: string }[] = [
    {
      ziel: 'bestand',
      titel: t('start.step.items', 'Add your equipment'),
      wozu: t('start.step.items.why', 'Name and quantity are enough to start.'),
      erledigt: items.length > 0,
      stand: format(t('start.step.items.count', '{n} models'), { n: items.length }),
    },
    {
      ziel: 'lager',
      titel: t('start.step.places', 'Create shelves and cases'),
      wozu: t('start.step.places.why', 'Then drag the equipment to where it sits.'),
      erledigt: cases.length > 0,
      stand: format(t('start.step.places.count', '{n} places · {c} cases'), { n: nodes.length, c: cases.length }),
    },
    {
      ziel: 'cases',
      titel: t('start.step.measure', 'Measure your cases'),
      wozu: t('start.step.measure.why', 'Pick a template or enter the outside size — needed to pack a vehicle.'),
      erledigt: cases.length > 0 && vermessen === cases.length,
      stand: format(t('start.step.measure.count', '{m} of {c} measured'), { m: vermessen, c: cases.length }),
    },
    {
      ziel: 'fahrzeuge',
      titel: t('start.step.vehicle', 'Add a vehicle'),
      wozu: t('start.step.vehicle.why', 'Length, width and height of the cargo space.'),
      erledigt: vehicles.length > 0,
      stand: format(t('start.step.vehicle.count', '{n} vehicles'), { n: vehicles.length }),
    },
    {
      ziel: 'ladung',
      titel: t('start.step.load', 'Plan a load'),
      wozu: t('start.step.load.why', 'Choose the cases for a job — the app lays them out in the vehicle.'),
      erledigt: loads.length > 0,
      stand: format(t('start.step.load.count', '{n} loads'), { n: loads.length }),
    },
  ]
  const naechster = schritte.findIndex((s) => !s.erledigt)
  const alleErledigt = naechster === -1

  return (
    <section className="start">
      <p className="start-zweck">
        {t(
          'start.purpose',
          'Keep track of your equipment — what you have and where it is — and plan how it gets packed into cases and vehicles for a job.',
        )}
      </p>

      <details className="block" open={!alleErledigt}>
        <summary>
          {alleErledigt
            ? t('start.steps.done', 'First steps — all done')
            : format(t('start.steps.head', 'First steps — {n} of 5 done'), { n: schritte.filter((s) => s.erledigt).length })}
        </summary>
        <ol className="schritte">
          {schritte.map((s, i) => (
            <li key={s.ziel} className={s.erledigt ? 'schritt erledigt' : 'schritt'}>
              <span className="schritt-nr">{i + 1}</span>
              <span className="schritt-text">
                <strong>{s.titel}</strong>
                <span className="leise">{s.erledigt ? s.stand : s.wozu}</span>
              </span>
              <button
                type="button"
                className={i === naechster ? 'knopf-primaer' : undefined}
                onClick={() => onGehe(s.ziel)}
              >
                {s.erledigt ? t('start.open', 'Open') : t('start.go', 'Start')}
              </button>
            </li>
          ))}
        </ol>
      </details>

      <div className="block">
        <h3>{t('start.areas', 'What do you want to do?')}</h3>
        <ul className="bereich-liste">
          {bereiche
            .filter((b) => b.id !== 'start')
            .map((b) => (
              <li key={b.id}>
                <button type="button" className="bereich-titel" onClick={() => onGehe(b.ansichten[0]!.id)}>
                  {b.titel}
                </button>
                <span className="leise">{b.wozu}</span>
              </li>
            ))}
        </ul>
      </div>
    </section>
  )
}
