// ───────────────────────────────────────────────────────────────────────────
// Der Laderaum selbst — Name, Klasse, Masse, Ladeöffnung, Ausstattung
//
// NUTZER-FRAGE: „Ich muss ja alle Daten bearbeiten können. Auch 3d Laderaum
// anpassen." Änderbar waren bisher das Raster, die Kantenformen und die
// Wiegedaten. Die Masse des Laderaums, die Ladeöffnung, der Name und die
// Klasse standen nach dem Anlegen fest — wer sich vermessen hatte, musste
// das Fahrzeug löschen und neu anlegen, und verlor dabei alles daran.
//
// ─── WAS EINE ÄNDERUNG EINER GEPLANTEN LADUNG KOSTET ──────────────────────
//
// Der Packer rechnet danach neu, und das kostet nichts: seine Platzierungen
// sind Vorschläge. VERANKERTE Stücke sind es nicht — sie stehen dort, weil
// ein Mensch sie hingestellt hat. Ein kürzerer Laderaum kann sie ungültig
// machen; sie dann still zu verschieben hiesse, diese Entscheidung
// wegzuräumen.
//
// Deshalb steht die Warnung VOR dem Speichern und nennt sie beim Namen. Wer
// trotzdem ändert, weiss dann, was er gleich von Hand richtet — und das ist
// die Entscheidung, die ihm gehört.
// ───────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import { useT } from '../i18n'
import { useLoadStore } from '../domain/store/loadStore'
import {
  betroffenText,
  verankerteAusLadungen,
  verankerteBetroffen,
} from '../domain/lib/hindernisse'
import type { Vehicle, VehicleKind } from '../domain/types/vehicle'

const KLASSEN: NonNullable<Vehicle['fuehrerscheinKlasse']>[] = ['B', 'BE', 'C1', 'C1E', 'C', 'CE']

interface Props {
  vehicle: Vehicle
  kinds: readonly VehicleKind[]
  kindLabel: (k: VehicleKind) => string
  onAendern: (patch: Partial<Vehicle>) => void
}

export function Laderaumdaten({ vehicle, kinds, kindLabel, onAendern }: Props) {
  const { t, format } = useT()
  const loads = useLoadStore((s) => s.loads)

  /** Was gerade im Formular steht — noch nicht im Store. */
  const [entwurf, setEntwurf] = useState<Vehicle['cargoMm']>(vehicle.cargoMm)

  const verankerte = useMemo(
    () => verankerteAusLadungen(loads, vehicle.id),
    [loads, vehicle.id],
  )
  // Gefragt wird gegen den ENTWURF, nicht gegen den gespeicherten Stand: die
  // Warnung soll erscheinen, bevor jemand übernimmt.
  const betroffen = useMemo(
    () => verankerteBetroffen({ ...vehicle, cargoMm: entwurf }, verankerte),
    [vehicle, entwurf, verankerte],
  )
  const geaendert =
    entwurf.lengthMm !== vehicle.cargoMm.lengthMm ||
    entwurf.widthMm !== vehicle.cargoMm.widthMm ||
    entwurf.heightMm !== vehicle.cargoMm.heightMm

  const oeffnung = vehicle.aperture

  return (
    <details className="stammdaten">
      <summary>{t('vehicle.edit', 'Master data and cargo space')}</summary>

      <div className="zeile">
        <label className="wachsend">
          {t('vehicle.name', 'Name')}
          <input value={vehicle.name} onChange={(e) => onAendern({ name: e.target.value })} />
        </label>
        <label>
          {t('vehicle.kind', 'Class')}
          <select
            value={vehicle.kind}
            onChange={(e) => onAendern({ kind: e.target.value as VehicleKind })}
          >
            {kinds.map((k) => (
              <option key={k} value={k}>
                {kindLabel(k)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ─── DIE MASSE DES LADERAUMS ──────────────────────────────────────
          Sie übernehmen erst auf Knopfdruck. Bei jedem Tastendruck zu
          speichern hiesse, den Plan während des Tippens dreimal neu zu
          rechnen — und die Warnung unten dreimal anders zu zeigen. */}
      <div className="zeile">
        <label>
          {t('vehicle.length', 'Length (mm)')}
          <input
            type="number"
            min={1}
            value={entwurf.lengthMm}
            onChange={(e) => setEntwurf({ ...entwurf, lengthMm: Number(e.target.value) })}
          />
        </label>
        <label>
          {t('vehicle.width', 'Width (mm)')}
          <input
            type="number"
            min={1}
            value={entwurf.widthMm}
            onChange={(e) => setEntwurf({ ...entwurf, widthMm: Number(e.target.value) })}
          />
        </label>
        <label>
          {t('vehicle.height', 'Height (mm)')}
          <input
            type="number"
            min={1}
            value={entwurf.heightMm}
            onChange={(e) => setEntwurf({ ...entwurf, heightMm: Number(e.target.value) })}
          />
        </label>
      </div>

      {betroffen.length > 0 && (
        <div className="befund offen">
          <p>
            {format(
              t(
                'vehicle.affected',
                'These {n} pieces were placed by hand and would no longer fit. They stay where they are — nothing is moved for you:',
              ),
              { n: betroffen.length },
            )}
          </p>
          <ul>
            {betroffen.map((b) => (
              <li key={b.stueckId}>{betroffenText(b, t)}</li>
            ))}
          </ul>
        </div>
      )}

      {geaendert && (
        <div className="zeile">
          <button
            type="button"
            disabled={entwurf.lengthMm <= 0 || entwurf.widthMm <= 0 || entwurf.heightMm <= 0}
            onClick={() => onAendern({ cargoMm: entwurf })}
          >
            {t('vehicle.applySize', 'Apply cargo space')}
          </button>
          <button type="button" className="still" onClick={() => setEntwurf(vehicle.cargoMm)}>
            {t('common.discard', 'Discard')}
          </button>
        </div>
      )}

      {/* ─── DIE LADEÖFFNUNG ──────────────────────────────────────────────
          Sie darf FEHLEN, und dann steht das da. Ein Transporter mit
          unvermessener Heckklappe ist keiner mit unbegrenzter Öffnung —
          der Packer prüft dann nichts dagegen, statt etwas anzunehmen. */}
      <h4>{t('vehicle.apertureHead', 'Loading aperture')}</h4>
      {oeffnung ? (
        <>
          <div className="zeile">
            <label>
              {t('vehicle.apertureWidth', 'Width (mm)')}
              <input
                type="number"
                min={1}
                value={oeffnung.widthMm}
                onChange={(e) =>
                  onAendern({ aperture: { ...oeffnung, widthMm: Number(e.target.value) } })
                }
              />
            </label>
            <label>
              {t('vehicle.apertureHeight', 'Height (mm)')}
              <input
                type="number"
                min={1}
                value={oeffnung.heightMm}
                onChange={(e) =>
                  onAendern({ aperture: { ...oeffnung, heightMm: Number(e.target.value) } })
                }
              />
            </label>
            <label>
              {t('vehicle.sill', 'Sill height above ground (mm)')}
              <input
                type="number"
                min={0}
                value={oeffnung.sillHeightMm ?? ''}
                onChange={(e) =>
                  onAendern({
                    aperture: {
                      ...oeffnung,
                      sillHeightMm: e.target.value === '' ? undefined : Number(e.target.value),
                    },
                  })
                }
              />
            </label>
          </div>
          <button type="button" className="still" onClick={() => onAendern({ aperture: undefined })}>
            {t('vehicle.apertureClear', 'Not measured after all')}
          </button>
        </>
      ) : (
        <>
          <p className="leise">
            {t(
              'vehicle.apertureMissing',
              'Not measured. Nothing is checked against it — that is better than assuming an aperture nobody has seen.',
            )}
          </p>
          <button
            type="button"
            onClick={() => onAendern({ aperture: { widthMm: 0, heightMm: 0 } })}
          >
            {t('vehicle.apertureAdd', 'Enter aperture')}
          </button>
        </>
      )}

      <h4>{t('vehicle.equipment', 'Equipment and papers')}</h4>
      <label className="haken">
        <input
          type="checkbox"
          checked={vehicle.flatFloor ?? false}
          onChange={(e) => onAendern({ flatFloor: e.target.checked })}
        />
        <span>{t('vehicle.flatFloor', 'Flat floor — otherwise castors are useless')}</span>
      </label>

      <div className="zeile">
        <label>
          {t('vehicle.tailLift', 'Tail lift (kg)')}
          <input
            type="number"
            min={0}
            value={vehicle.hebebuehneKg ?? ''}
            onChange={(e) =>
              onAendern({
                hebebuehneKg: e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
          />
        </label>
        <label>
          {t('vehicle.licenceClass', 'Licence class')}
          <select
            value={vehicle.fuehrerscheinKlasse ?? ''}
            onChange={(e) =>
              onAendern({
                fuehrerscheinKlasse: e.target.value === ''
                  ? undefined
                  : (e.target.value as NonNullable<Vehicle['fuehrerscheinKlasse']>),
              })
            }
          >
            <option value="">{t('vehicle.notGiven', 'not given')}</option>
            {KLASSEN.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="wachsend">
        {t('vehicle.source', 'Source of the figures')}
        <input
          value={vehicle.quelle ?? ''}
          placeholder={t('vehicle.sourcePlaceholder', 'Datasheet link or registration document')}
          onChange={(e) => onAendern({ quelle: e.target.value || undefined })}
        />
      </label>

      <label className="wachsend">
        {t('vehicle.notes', 'Notes')}
        <textarea
          value={vehicle.notes ?? ''}
          rows={2}
          onChange={(e) => onAendern({ notes: e.target.value || undefined })}
        />
      </label>
    </details>
  )
}
