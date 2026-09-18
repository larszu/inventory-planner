// ───────────────────────────────────────────────────────────────────────────
// Gewichte, Achsen und die Lage der Ladefläche eintragen (#24, #19).
//
// ─── WARUM DIESE MASKE AUSSIEHT WIE DIE PAPIERE ────────────────────────────
//
// Wer hier steht, hat die Zulassungsbescheinigung Teil I in der Hand oder
// einen Wiegeschein von der Brückenwaage. Die Maske folgt deshalb den
// Papieren und nicht dem Modell: zulässige Gesamtmasse, Leermasse, Nutzlast,
// dann je Achse die zulässige Achslast (Feld 8 der Papiere) und daneben die
// GEWOGENE Leerlast, die in keinem Papier steht und nur von der Waage kommt.
//
// ─── UND WARUM NICHTS DAVON GERECHNET WIRD ─────────────────────────────────
//
// Nutzlast = zGG − Leermasse wäre eine hübsche Vorbelegung und wäre falsch,
// sobald ein Aufbau, eine Hebebühne oder eine volle Tankfüllung dazwischen
// liegt. Was nicht eingetragen ist, bleibt leer: eine gerechnete Zahl in
// einem Eingabefeld ist nicht mehr von einer gemessenen zu unterscheiden,
// sobald jemand einmal gespeichert hat. (Hausregel, `CLAUDE.md`.)
//
// ─── DIE EINE ZAHL, DIE NIEMAND ERWARTET ───────────────────────────────────
//
// „Ladefläche hinter der Vorderachse". Ohne sie steht der Laderaum nirgends
// am Fahrzeug, und ohne das gibt es keinen Hebelarm und keine Achslast.
// Sie steht deshalb MIT ihrer Begründung da und nicht als nacktes Feld —
// sonst bleibt sie leer, und der Lastverteilungsplan sagt ewig „nicht
// angegeben", ohne dass jemand weiss, warum.
// ───────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useT } from '../i18n'
import type { Axle, Vehicle } from '../domain/types/vehicle'

interface Props {
  vehicle: Vehicle
  onAendern: (patch: Partial<Vehicle>) => void
}

/** Ein Zahlenfeld, das leer bleiben darf — leer heisst „nicht angegeben". */
function Zahl({
  wert,
  onFertig,
  beschriftung,
}: {
  wert: number | undefined
  onFertig: (n: number | undefined) => void
  beschriftung: string
}) {
  const [text, setText] = useState(wert === undefined ? '' : String(wert))
  return (
    <label>
      {beschriftung}
      <input
        type="number"
        value={text}
        onChange={(e) => setText(e.target.value)}
        // Auf `blur` und nicht bei jedem Tastendruck: wer „1200" tippt,
        // schriebe sonst zwischendurch 1, 12 und 120 in den Store.
        onBlur={() => {
          const n = Number(text)
          onFertig(text.trim() === '' || !Number.isFinite(n) || n <= 0 ? undefined : n)
        }}
      />
    </label>
  )
}

export function Wiegedaten({ vehicle, onAendern }: Props) {
  const { t, format } = useT()
  const achsen = vehicle.axles ?? []

  const setzeAchse = (i: number, patch: Partial<Axle>) => {
    const next = achsen.map((a, j) => (j === i ? { ...a, ...patch } : a))
    onAendern({ axles: next })
  }

  // Die erste Achse ist die Vorderachse und liegt damit bei 0 — das ist die
  // DEFINITION von `positionMm` und keine vorbelegte Messung. Jede weitere
  // beginnt ebenfalls bei 0 und wartet auf den Radstand; 0 heisst hier „noch
  // nicht gemessen" und wird von `achslasten` als solches abgelehnt.
  const achseAnlegen = () => onAendern({ axles: [...achsen, { positionMm: 0, maxLastKg: 0 }] })

  const gewogen = achsen.filter((a) => a.leergewichtKg !== undefined).length

  return (
    <details className="wiegedaten">
      <summary>
        {achsen.length === 0
          ? t('weigh.none', 'Weights and axles — nothing recorded')
          : format(t('weigh.count', 'Weights and axles — {n} axles, {m} of them weighed empty'), {
              n: achsen.length,
              m: gewogen,
            })}
      </summary>

      <p className="hinweis">
        {t(
          'weigh.intro',
          'Weight is the harder limit: a 3.5-tonner is often done under 1,200 kg of payload. Nothing here is derived from anything else — payload is not gross minus kerb weight once a body, a tail lift or a full tank sits in between.',
        )}
      </p>

      <div className="zeile">
        <Zahl
          beschriftung={t('weigh.gross', 'Permitted gross mass (kg)')}
          wert={vehicle.zulGesamtgewichtKg}
          onFertig={(n) => onAendern({ zulGesamtgewichtKg: n })}
        />
        <Zahl
          beschriftung={t('weigh.kerb', 'Kerb weight (kg)')}
          wert={vehicle.leergewichtKg}
          onFertig={(n) => onAendern({ leergewichtKg: n })}
        />
        <Zahl
          beschriftung={t('weigh.payload', 'Payload (kg)')}
          wert={vehicle.nutzlastKg}
          onFertig={(n) => onAendern({ nutzlastKg: n })}
        />
      </div>

      <Zahl
        beschriftung={t('weigh.floorOffset', 'Cargo floor behind the front axle (mm)')}
        wert={vehicle.ladeflaecheAbVorderachseMm}
        onFertig={(n) => onAendern({ ladeflaecheAbVorderachseMm: n })}
      />
      <p className="leise">
        {t(
          'weigh.floorOffsetWhy',
          'Measured from the centre of the front axle to the front edge of the cargo floor. Without it the cargo space sits nowhere on the vehicle, and there is no lever arm to compute an axle load from.',
        )}
      </p>

      {achsen.length > 0 && (
        <ul className="achsen-liste">
          {achsen.map((a, i) => (
            <li key={i}>
              <strong>
                {i === 0 ? t('weigh.front', 'Front axle') : t('weigh.rear', 'Rear axle')}
              </strong>
              <div className="zeile">
                <Zahl
                  beschriftung={t('weigh.axlePos', 'Distance from the front axle (mm)')}
                  wert={a.positionMm || undefined}
                  onFertig={(n) => setzeAchse(i, { positionMm: n ?? 0 })}
                />
                <Zahl
                  beschriftung={t('weigh.axleMax', 'Permitted axle load (kg)')}
                  wert={a.maxLastKg || undefined}
                  onFertig={(n) => setzeAchse(i, { maxLastKg: n ?? 0 })}
                />
                <Zahl
                  beschriftung={t('weigh.axleEmpty', 'Weighed empty (kg)')}
                  wert={a.leergewichtKg}
                  onFertig={(n) => setzeAchse(i, { leergewichtKg: n })}
                />
              </div>
              <button
                type="button"
                className="still"
                onClick={() => onAendern({ axles: achsen.filter((_, j) => j !== i) })}
              >
                {t('weigh.removeAxle', 'Remove axle')}
              </button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" onClick={achseAnlegen}>
        {t('weigh.addAxle', 'Add an axle')}
      </button>
      <p className="leise">
        {t(
          'weigh.axleWhy',
          'The empty axle load comes off a weighbridge, not out of the papers: the papers give what an axle may carry, not what it carries empty. Without it the sheet states what the load puts on the axle and stays silent about whether the axle is overloaded.',
        )}
      </p>
    </details>
  )
}
