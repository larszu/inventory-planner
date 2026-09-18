// ───────────────────────────────────────────────────────────────────────────
// Gewicht, Schwerpunkt, Achslast — am Bildschirm (#24).
//
// ─── WAS HIER NICHT RECHNET ────────────────────────────────────────────────
//
// Nichts. Alle Zahlen kommen aus `domain/lib/lastverteilung`, alle Sätze
// ebenfalls — auch die, die sagen, dass eine Zahl fehlt. Diese Ansicht
// entscheidet nur, was NEBENEINANDER steht.
//
// ─── WARUM DIE FEHLENDE ANGABE GENAUSO GROSS DASTEHT ───────────────────────
//
// Ein Lastverteilungsplan mit einer Lücke sieht aus wie ein Plan, dem nur
// eine Kleinigkeit fehlt. Er ist aber keiner: ohne gewogene Leerlast weiss
// niemand, ob die Achse trägt. Der Satz steht deshalb an der Stelle der
// Zahl, in derselben Zeile, und nicht als Fussnote.
//
// ─── UND WARUM ES KEINE AMPEL GIBT ─────────────────────────────────────────
//
// Eine Überschreitung steht als ZAHL da — „um 100 kg" —, fett und in der
// Meldefarbe, nie als Fläche und nie als Punkt. Tally-Rot ist in diesem Haus
// das Aufnahmelicht; eine Ampel neben einer Kiste nähme ihm den Rang, und
// eine Zahl sagt ohnehin mehr: „rot" lässt offen, ob es um 5 kg geht oder um
// 500.
// ───────────────────────────────────────────────────────────────────────────
import { useT } from '../i18n'
import { achslasten, haftungshinweis, schwerpunkt, sicherungsmittel, ueberladung } from '../domain/lib/lastverteilung'
import { buildLastverteilungHtml } from '../domain/lib/lastverteilungPrint'
import type { LoadPlan } from '../domain/lib/loadPacker'
import type { Vehicle } from '../domain/types/vehicle'

interface Props {
  ladungName: string
  vehicle: Vehicle
  plan: LoadPlan
  /** Datum fürs Blatt — die Ansicht liest keine Uhr, der Aufrufer schon. */
  datum: string
  onFehler: (text: string) => void
}

export function Lastverteilung({ ladungName, vehicle, plan, datum, onFehler }: Props) {
  const { t, format } = useT()

  const sp = schwerpunkt(plan, t)
  const achsen = achslasten(plan, vehicle, t)
  const ueber = ueberladung(plan, vehicle, t)

  const blattOeffnen = () => {
    const html = buildLastverteilungHtml(ladungName, vehicle, plan, datum, t)
    const w = window.open('', '_blank')
    if (!w) {
      onFehler(t('weight.printBlocked', 'The sheet could not be opened — the browser blocked the window.'))
      return
    }
    w.document.write(html)
    w.document.close()
  }

  return (
    <section className="block lastverteilung">
      <h3 className="kicker">{t('weight.head', 'Weight and axle loads')}</h3>

      <p>
        {format(t('weight.placed', 'Placed: {kg} kg'), { kg: Math.round(plan.gesetztKg) })}
        {plan.ohneGewicht > 0 && (
          <>
            {' · '}
            <strong>
              {format(t('weight.unweighed', 'without a recorded weight: {n}'), { n: plan.ohneGewicht })}
            </strong>
          </>
        )}
      </p>

      {ueber.bekannt && ueber.wert && (
        <p className="ueberladen">
          {format(t('weight.over', 'Over the payload by {n} kg — reached with {label}, in loading order.'), {
            n: ueber.wert.ueberKg,
            label: ueber.wert.label,
          })}
        </p>
      )}
      {!ueber.bekannt && <p className="leise">{ueber.grund}</p>}

      <p>
        {t('weight.cog', 'Centre of gravity:')}{' '}
        {sp.bekannt
          ? format(
              t('weight.cogValue', '{z} mm from the front edge, {x} mm from the left wall, {y} mm up'),
              { z: sp.wert.zMm, x: sp.wert.xMm, y: sp.wert.yMm },
            )
          : sp.grund}
      </p>

      {achsen.bekannt ? (
        <ul className="achslasten">
          {achsen.wert.map((a, i) => (
            <li key={a.positionMm}>
              <span className="achse-name">
                {i === 0 ? t('weight.front', 'Front axle') : t('weight.rear', 'Rear axle')}
              </span>{' '}
              {format(t('weight.fromLoad', 'from the load {n} kg'), { n: a.ausLadungKg })}
              {' · '}
              {a.gesamtKg === undefined
                ? t('weight.noEmptyAxle', 'empty axle load not weighed — no total')
                : format(t('weight.total', 'total {n} kg of {max} permitted'), {
                    n: a.gesamtKg,
                    max: a.maxLastKg,
                  })}
              {a.ueberKg !== undefined && (
                <>
                  {' '}
                  <strong className="ueberladen">
                    {format(t('weight.axleOver', 'over by {n} kg'), { n: a.ueberKg })}
                  </strong>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="leise">{achsen.grund}</p>
      )}

      <details>
        <summary>{t('weight.securing', 'Securing kit — checklist')}</summary>
        <ul>
          {sicherungsmittel(t).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </details>

      <button type="button" className="still" onClick={blattOeffnen}>
        {t('weight.sheet', 'Load distribution plan')}
      </button>
      <p className="leise">{haftungshinweis(t)}</p>
    </section>
  )
}
