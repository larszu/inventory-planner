// ───────────────────────────────────────────────────────────────────────────
// Einbauten des Laderaums — Radkasten, Sitzbank, Ersatzrad
//
// NUTZER-FRAGE: „Ich muss ja alle Daten bearbeiten können. Auch 3d Laderaum
// anpassen." Sie liessen sich bisher NICHT eintragen: das Anlege-Formular
// setzte `obstructions: []`, die Draufsicht und die 3D-Ansicht zeichneten
// sie, der Packer rechnete mit ihnen — hinein kamen sie nur über den Import.
//
// ─── DER RADKASTEN AUS DER REIFENGRÖSSE ───────────────────────────────────
//
// Zwei seiner drei Masse stehen in der Reifenbezeichnung: `235/65 R16` sagt
// Breite und Aussendurchmesser exakt (siehe `lib/reifen.ts`). Das dritte,
// die HÖHE über dem Ladeboden, steht dort nicht — sie hängt am Aufbau. Sie
// wird deshalb gefragt, und das Feld sagt auch, warum.
//
// Der Vorschlag füllt die Felder und schreibt NICHT in den Store. Wer misst,
// korrigiert danach; wer nicht misst, sieht wenigstens, woher die Zahl kommt.
// ───────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import { useT } from '../i18n'
import { hindernisBefunde, radkastenPaar } from '../domain/lib/hindernisse'
import { RADKASTEN_ZUSCHLAG_MM, liesReifen, radkastenAusReifen, reifenText } from '../domain/lib/reifen'
import type { CargoObstruction, Vehicle } from '../domain/types/vehicle'

const ARTEN: CargoObstruction['kind'][] = ['radkasten', 'sitzbank', 'ersatzrad', 'aufbau', 'sonstiges']

/** Beschriftungen als Funktion, nie als Modul-Konstante. */
const artLabels = (
  t: (k: string, en: string) => string,
): Record<CargoObstruction['kind'], string> => ({
  radkasten: t('obstacle.kind.arch', 'Wheel arch'),
  sitzbank: t('obstacle.kind.bench', 'Seat bench'),
  ersatzrad: t('obstacle.kind.spare', 'Spare wheel'),
  aufbau: t('obstacle.kind.fitment', 'Fitment'),
  sonstiges: t('obstacle.kind.other', 'Other'),
})

interface Props {
  vehicle: Vehicle
  onAendern: (obstructions: CargoObstruction[]) => void
}

export function Einbauten({ vehicle, onAendern }: Props) {
  const { t, format } = useT()
  const arten = artLabels(t)
  const einbauten = vehicle.obstructions

  const setzen = (i: number, patch: Partial<CargoObstruction>) =>
    onAendern(einbauten.map((h, j) => (j === i ? { ...h, ...patch } : h)))

  const loeschen = (i: number) => onAendern(einbauten.filter((_, j) => j !== i))

  return (
    <details className="einbauten">
      <summary>
        {einbauten.length === 0
          ? t('obstacle.none', 'Built-ins — none recorded')
          : format(t('obstacle.count', 'Built-ins — {n} recorded'), { n: einbauten.length })}
      </summary>

      <p className="hinweis">
        {t(
          'obstacle.intro',
          'Wheel arches, a seat bench, the spare wheel: the packer treats them as occupied space, and the top view and the 3D view draw them. The origin is the rear-left-bottom corner of the cargo space; x runs across, y upwards, z towards the front.',
        )}
      </p>

      <RadkastenAusReifen vehicle={vehicle} onAnlegen={(paar) => onAendern([...einbauten, ...paar])} />

      {einbauten.map((h, i) => {
        const befunde = hindernisBefunde(
          vehicle,
          h,
          einbauten.filter((_, j) => j !== i),
          t,
        )
        return (
          <div className="einbau" key={i}>
            <div className="zeile">
              <label className="wachsend">
                {t('obstacle.name', 'Name')}
                <input value={h.name} onChange={(e) => setzen(i, { name: e.target.value })} />
              </label>
              <label>
                {t('obstacle.kind', 'Kind')}
                <select
                  value={h.kind}
                  onChange={(e) => setzen(i, { kind: e.target.value as CargoObstruction['kind'] })}
                >
                  {ARTEN.map((a) => (
                    <option key={a} value={a}>
                      {arten[a]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="zeile">
              <Mass
                beschriftung={t('obstacle.fromLeft', 'From the left (mm)')}
                wert={h.originMm.x}
                onFertig={(n) => setzen(i, { originMm: { ...h.originMm, x: n } })}
              />
              <Mass
                beschriftung={t('obstacle.fromFloor', 'Above the floor (mm)')}
                wert={h.originMm.y}
                onFertig={(n) => setzen(i, { originMm: { ...h.originMm, y: n } })}
              />
              <Mass
                beschriftung={t('obstacle.fromRear', 'From the rear (mm)')}
                wert={h.originMm.z}
                onFertig={(n) => setzen(i, { originMm: { ...h.originMm, z: n } })}
              />
            </div>

            <div className="zeile">
              <Mass
                beschriftung={t('obstacle.width', 'Width (mm)')}
                wert={h.sizeMm.x}
                onFertig={(n) => setzen(i, { sizeMm: { ...h.sizeMm, x: n } })}
              />
              <Mass
                beschriftung={t('obstacle.height', 'Height (mm)')}
                wert={h.sizeMm.y}
                onFertig={(n) => setzen(i, { sizeMm: { ...h.sizeMm, y: n } })}
              />
              <Mass
                beschriftung={t('obstacle.depth', 'Depth (mm)')}
                wert={h.sizeMm.z}
                onFertig={(n) => setzen(i, { sizeMm: { ...h.sizeMm, z: n } })}
              />
            </div>

            {/* Gemeldet, nicht verboten: ein Aufbau darf an der Öffnung
                überstehen, und wer gerade misst, hat Zwischenstände. */}
            {befunde.map((b) => (
              <p className="befund offen" key={b.art}>
                {b.text}
              </p>
            ))}

            <button type="button" className="still" onClick={() => loeschen(i)}>
              {t('obstacle.remove', 'Remove built-in')}
            </button>
          </div>
        )
      })}

      <button
        type="button"
        onClick={() =>
          onAendern([
            ...einbauten,
            {
              name: '',
              kind: 'sonstiges',
              originMm: { x: 0, y: 0, z: 0 },
              sizeMm: { x: 0, y: 0, z: 0 },
            },
          ])
        }
      >
        {t('obstacle.add', 'Add built-in')}
      </button>
    </details>
  )
}

/** Ein Mass in Millimetern. Null ist erlaubt — es heisst „an der Wand". */
function Mass({
  beschriftung,
  wert,
  onFertig,
}: {
  beschriftung: string
  wert: number
  onFertig: (n: number) => void
}) {
  const [text, setText] = useState(String(wert))
  return (
    <label>
      {beschriftung}
      <input
        type="number"
        min={0}
        value={text}
        onChange={(e) => setText(e.target.value)}
        // Auf `blur`: wer „1200" tippt, schriebe sonst zwischendurch 1, 12
        // und 120 in den Store — und die Prüfung meldete jedes Mal.
        onBlur={() => {
          const n = Number(text)
          onFertig(Number.isFinite(n) && n >= 0 ? Math.round(n) : 0)
        }}
      />
    </label>
  )
}

/**
 * Radkasten-Paar aus der Reifengrösse vorschlagen.
 *
 * Es SCHREIBT erst auf Knopfdruck. Was die Reifengrösse hergibt, steht
 * vorher im Klartext da — wer sie tippt, soll sehen, welche Zahlen gleich im
 * Laderaum stehen, und nicht hinterher suchen, woher sie kamen.
 */
function RadkastenAusReifen({
  vehicle,
  onAnlegen,
}: {
  vehicle: Vehicle
  onAnlegen: (paar: CargoObstruction[]) => void
}) {
  const { t, format } = useT()
  const [groesse, setGroesse] = useState('')
  const [zuschlag, setZuschlag] = useState(String(RADKASTEN_ZUSCHLAG_MM))
  const [hoehe, setHoehe] = useState('')
  const [abstand, setAbstand] = useState('')

  const reifen = useMemo(() => liesReifen(groesse), [groesse])
  const masse = useMemo(
    () => (reifen ? radkastenAusReifen(reifen, Number(zuschlag) || 0) : null),
    [reifen, zuschlag],
  )
  const hoeheMm = Number(hoehe)
  const bereit = masse !== null && Number.isFinite(hoeheMm) && hoeheMm > 0

  return (
    <div className="block reifen">
      <h4>{t('tyre.head', 'Wheel arch from the tyre size')}</h4>
      <p className="hinweis">
        {t(
          'tyre.intro',
          'A tyre size is a standardised figure, not an estimate: 235/65 R16 gives width and outer diameter exactly. The height above the cargo floor does not follow from it — it depends on the body, so it is asked for.',
        )}
      </p>

      <div className="zeile">
        <label className="wachsend">
          {t('tyre.size', 'Tyre size')}
          <input
            value={groesse}
            placeholder="235/65 R16C"
            onChange={(e) => setGroesse(e.target.value)}
          />
        </label>
        <label>
          {t('tyre.clearance', 'Clearance per side (mm)')}
          <input type="number" min={0} value={zuschlag} onChange={(e) => setZuschlag(e.target.value)} />
        </label>
      </div>

      {groesse.trim() !== '' && !reifen && (
        <p className="befund offen">
          {t(
            'tyre.unreadable',
            'Not a metric tyre size with an aspect ratio. Sizes like 7.50 R16 do not carry the sidewall height — enter the measurements by hand below.',
          )}
        </p>
      )}

      {reifen && masse && (
        <>
          <p className="leise">{reifenText(reifen, t)}</p>
          <p>
            {format(t('tyre.derived', 'Wheel arch would be {b} mm wide and {l} mm long.'), {
              b: masse.breiteMm,
              l: masse.laengeMm,
            })}
          </p>
          <div className="zeile">
            <label>
              {t('tyre.archHeight', 'Height above the floor (mm) — measured')}
              <input type="number" min={0} value={hoehe} onChange={(e) => setHoehe(e.target.value)} />
            </label>
            <label>
              {t('tyre.fromRear', 'From the rear (mm)')}
              <input type="number" min={0} value={abstand} onChange={(e) => setAbstand(e.target.value)} />
            </label>
          </div>
          <button
            type="button"
            disabled={!bereit}
            onClick={() => {
              if (!masse || !bereit) return
              onAnlegen(
                radkastenPaar(
                  vehicle,
                  { ...masse, hoeheMm: Math.round(hoeheMm) },
                  Math.round(Number(abstand) || 0),
                  t('obstacle.kind.arch', 'Wheel arch'),
                  t,
                ),
              )
              setGroesse('')
              setHoehe('')
              setAbstand('')
            }}
          >
            {t('tyre.create', 'Create both wheel arches')}
          </button>
          {!bereit && (
            <p className="leise">
              {t('tyre.needHeight', 'The height is missing. A derived height would look like a measured one on the load plan — and the packer stacks on top of it.')}
            </p>
          )}
        </>
      )}
    </div>
  )
}
