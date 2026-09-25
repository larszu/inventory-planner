// ───────────────────────────────────────────────────────────────────────────
// Fahrzeuge — die Laderäume des Hauses
//
// Zeigt zu jedem Fahrzeug, was `domain/lib/laderaum.ts` darüber sagt: Brutto-
// und Netto-Rauminhalt, die freie Breite AM BODEN (zwischen den Radkästen —
// dort steht die erste Lage, und sie ist schmaler als die Innenbreite), die
// Nutzlast und die Führerscheinklasse.
//
// Was hier bewusst NICHT als Zahl erscheint: eine Ladeöffnung, die niemand
// vermessen hat. Sie steht als „nicht angegeben" da und nicht als grosszügige
// Vorgabe — ein Transporter mit unvermessener Heckklappe ist keiner mit
// unbegrenzter Öffnung.
// ───────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { herunterladen } from '../lib/herunterladen'
import { useT } from '../i18n'
import { useVehicleStore } from '../domain/store/vehicleStore'
import { freierRaum, nutzlastFrei } from '../domain/lib/laderaum'
import { rasterVon, vorgabeRasterMm, type VehicleKind } from '../domain/types/vehicle'
import { FAHRZEUG_KATALOG } from '../domain/data/fahrzeugKatalog'
import {
  ausKatalog,
  buildFahrzeugDatei,
  parseFahrzeugDatei,
  vermessen,
} from '../domain/lib/fahrzeugStammdaten'
import { Kantenformen } from './Kantenform'
import { Wiegedaten } from './Wiegedaten'
import { Laderaumdaten } from './Laderaumdaten'
import { Einbauten } from './Einbauten'

const KINDS: VehicleKind[] = [
  'kofferraum',
  'kombi',
  'transporter',
  'koffer35',
  'lkw75',
  'lkw12',
  'sattelzug',
  'anhaenger',
]

/** Beschriftungen als FUNKTION, nie als Modul-Konstante — sonst bliebe sie in
 *  der Sprache stehen, die beim Laden galt. */
const kindLabels = (t: (k: string, en: string) => string): Record<VehicleKind, string> => ({
  kofferraum: t('vehicle.kind.boot', 'Car boot'),
  kombi: t('vehicle.kind.estate', 'Estate car'),
  transporter: t('vehicle.kind.van', 'Van'),
  koffer35: t('vehicle.kind.box35', '3.5 t box truck'),
  lkw75: t('vehicle.kind.lkw75', '7.5 t truck'),
  lkw12: t('vehicle.kind.lkw12', '12 t truck'),
  sattelzug: t('vehicle.kind.semi', 'Semi-trailer'),
  anhaenger: t('vehicle.kind.trailer', 'Trailer'),
})

const liter = (n: number): string => Math.round(n).toLocaleString('en-GB')

export function Fahrzeuge() {
  const { t, format } = useT()
  const vehicles = useVehicleStore((s) => s.vehicles)
  const addVehicle = useVehicleStore((s) => s.addVehicle)
  const updateVehicle = useVehicleStore((s) => s.updateVehicle)
  const removeVehicle = useVehicleStore((s) => s.removeVehicle)

  const labels = kindLabels(t)

  const [name, setName] = useState('')
  const [kind, setKind] = useState<VehicleKind>('transporter')
  const [laenge, setLaenge] = useState('')
  const [breite, setBreite] = useState('')
  const [hoehe, setHoehe] = useState('')

  /** Was der letzte Im-/Export gesagt hat. Leer heisst: nichts passiert. */
  const [meldung, setMeldung] = useState('')

  const exportieren = () => {
        herunterladen(new Blob([buildFahrzeugDatei(vehicles)], { type: 'application/json' }), 'fahrzeuge.json')
  }

  const importieren = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const datei = e.target.files?.[0]
    // Das Feld wird zurückgesetzt, damit dieselbe Datei ein zweites Mal
    // gewählt werden kann — ohne das passiert beim zweiten Versuch nichts,
    // und der Benutzer hält es für einen Fehlschlag.
    e.target.value = ''
    if (!datei) return
    const gelesen = parseFahrzeugDatei(await datei.text())
    if (!gelesen) {
      setMeldung(t('fleet.importBad', 'That is not a vehicle file from this tool.'))
      return
    }
    // Der Store heilt jeden Datensatz beim Anlegen — dieselbe Strenge wie
    // beim Laden aus dem Speicher. Was durchfällt, fällt hier durch.
    let uebernommen = 0
    for (const v of gelesen) {
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = v
      if (!rest.name || !(rest.cargoMm?.lengthMm > 0)) continue
      addVehicle(rest)
      uebernommen += 1
    }
    setMeldung(format(t('fleet.imported', 'Taken over: {n}'), { n: uebernommen }))
  }

  const anlegen = (e: React.FormEvent) => {
    e.preventDefault()
    const l = Number(laenge)
    const b = Number(breite)
    const h = Number(hoehe)
    if (!name.trim() || !(l > 0) || !(b > 0) || !(h > 0)) return

    addVehicle({ name: name.trim(), kind, cargoMm: { lengthMm: l, widthMm: b, heightMm: h }, obstructions: [] })
    setName('')
    setLaenge('')
    setBreite('')
    setHoehe('')
  }

  return (
    <section>
      <h2>{t('vehicle.head', 'Vehicles')}</h2>
      <p className="hinweis">
        {t(
          'vehicle.intro',
          'A loading space is not a box: wheel arches narrow the floor, and the rear opening is smaller than the interior. What has not been measured is shown as not measured.',
        )}
      </p>

      {/* Dieselbe Bauart wie „Add to stock" im Bestand: der Block ist die
          Klappe. Offen, solange es kein Fahrzeug gibt. */}
      <details className="block" open={vehicles.length === 0} key={vehicles.length === 0 ? 'leer' : 'voll'}>
        <summary>{t('vehicle.create.head', 'Add a vehicle')}</summary>
        <form onSubmit={anlegen}>
          <label>
            {t('vehicle.name', 'Name')}
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            {t('vehicle.kind', 'Class')}
            <select value={kind} onChange={(e) => setKind(e.target.value as VehicleKind)}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {labels[k]}
                </option>
              ))}
            </select>
          </label>
          <div className="zeile">
            <label>
              {t('vehicle.length', 'Cargo length (mm)')}
              <input type="number" value={laenge} onChange={(e) => setLaenge(e.target.value)} />
            </label>
            <label>
              {t('vehicle.width', 'Cargo width (mm)')}
              <input type="number" value={breite} onChange={(e) => setBreite(e.target.value)} />
            </label>
            <label>
              {t('vehicle.height', 'Cargo height (mm)')}
              <input type="number" value={hoehe} onChange={(e) => setHoehe(e.target.value)} />
            </label>
          </div>
          <button type="submit">{t('vehicle.add', 'Add vehicle')}</button>
        </form>

        {/* Der Startsatz. Er ist heute leer, und das steht da — ein Menü mit
            null Einträgen liesse den Benutzer suchen, wo nichts ist. */}
        {FAHRZEUG_KATALOG.length > 0 ? (
          <div className="zeile">
            <label>
              {t('fleet.fromCatalogue', 'Start from a master record')}
              <select
                value=""
                onChange={(e) => {
                  const eintrag = FAHRZEUG_KATALOG.find((k) => k.name === e.target.value)
                  if (eintrag) addVehicle(ausKatalog(eintrag, name, t))
                }}
              >
                <option value="">{t('fleet.pick', 'pick one')}</option>
                {FAHRZEUG_KATALOG.map((k) => (
                  <option key={k.name} value={k.name}>
                    {k.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <p className="leise">
            {t(
              'fleet.catalogueEmpty',
              'There is no master-data set yet. It would have to carry a source per vehicle — a datasheet link or the registration document — and guessed interior dimensions read like measurements on a load plan.',
            )}
          </p>
        )}
      </details>

      {/* Die Ausmessen-Hilfe steht NEBEN dem Formular und nicht darin: wer
          misst, hat das Fahrzeug offen und das Telefon in der Hand, und eine
          Liste im Formular wäre beim Eintragen im Weg. */}
      <details className="block vermessen">
        <summary>{t('measure.head', 'How to measure a vehicle')}</summary>
        <p className="hinweis">
          {t(
            'measure.intro',
            'Six measurements, in the order in which you walk around the vehicle once. The floor width between the wheel arches is a different figure from the width above them — and it is the one a Euro pallet fails on.',
          )}
        </p>
        <ol className="messliste">
          {vermessen(t).map((m) => (
            <li key={m.was}>
              <strong>{m.was}</strong>
              <span className="leise"> {m.wo}</span>
            </li>
          ))}
        </ol>
      </details>

      <div className="zeile">
        <button type="button" className="still" onClick={exportieren} disabled={vehicles.length === 0}>
          {t('fleet.export', 'Export vehicles')}
        </button>
        <label className="still dateiwahl">
          {t('fleet.import', 'Import vehicles')}
          <input type="file" accept="application/json,.json" onChange={importieren} />
        </label>
      </div>
      {meldung && <p className="leise">{meldung}</p>}

      {vehicles.length === 0 && <p>{t('vehicle.none', 'No vehicles recorded yet.')}</p>}

      {vehicles.map((v) => {
        const raum = freierRaum(v)
        const last = nutzlastFrei(v, 0, t)

        return (
          <div className="block" key={v.id}>
            <h3>
              {v.name} — {labels[v.kind]}
            </h3>
            <p>
              {format(t('vehicle.space', 'Gross {brutto} l · net {netto} l · floor width {boden} mm'), {
                brutto: liter(raum.bruttoLiter),
                netto: liter(raum.nettoLiter),
                boden: raum.bodenBreiteMm,
              })}
              {raum.kantenLiter > 0 && (
                <>
                  {' · '}
                  {format(t('vehicle.edgeLoss', '{l} l taken by chamfers and roundings'), {
                    l: liter(raum.kantenLiter),
                  })}
                </>
              )}
            </p>
            <p>
              {t('vehicle.payload', 'Payload:')}{' '}
              {last.bekannt
                ? format(t('vehicle.payloadKg', '{kg} kg'), { kg: last.wert })
                : t('vehicle.notGiven', 'not given')}
            </p>
            <p>
              {t('vehicle.aperture', 'Loading aperture:')}{' '}
              {v.aperture
                ? format(t('vehicle.apertureSize', '{w} x {h} mm'), {
                    w: v.aperture.widthMm,
                    h: v.aperture.heightMm,
                  })
                : t('vehicle.notMeasured', 'not measured — nothing can be checked against it')}
            </p>
            {/* Das Packmass-Raster (#21). Es steht NEBEN der Ladebreite und
                nicht in den Wiegedaten: es ist eine Eigenschaft des Aufbaus,
                und wer es ändert, ändert die Reihen und nicht das Gewicht. */}
            <label className="raster-wahl">
              {t('vehicle.grid', 'Packing grid (mm)')}
              <select
                value={String(rasterVon(v))}
                onChange={(e) => updateVehicle(v.id, { rasterMm: Number(e.target.value) })}
              >
                <option value="0">{t('vehicle.gridNone', 'no grid')}</option>
                {[400, 600, 800].map((r) => (
                  <option key={r} value={r}>
                    {format(t('vehicle.gridMm', '{n} mm'), { n: r })}
                  </option>
                ))}
              </select>
            </label>
            <p className="leise">
              {vorgabeRasterMm(v.kind) > 0
                ? format(
                    t('vehicle.gridDefault', 'Usual for this class: {n} mm — 1200 x 600 cases stand in rows on it.'),
                    { n: vorgabeRasterMm(v.kind) },
                  )
                : t(
                    'vehicle.gridNoDefault',
                    'No grid is usual for this class: the cargo is not 2.40 m wide, so the row does not come out even.',
                  )}
            </p>
            <p>
              {t('vehicle.licence', 'Licence class:')}{' '}
              {v.fuehrerscheinKlasse ?? t('vehicle.notGiven', 'not given')}
            </p>
            {/* Alle Angaben änderbar (Nutzer-Frage 2026-09-19): Name,
                Klasse, Laderaum-Masse, Ladeöffnung, Ausstattung, Quelle. */}
            <Laderaumdaten
              vehicle={v}
              kinds={KINDS}
              kindLabel={(k) => labels[k]}
              onAendern={(patch) => updateVehicle(v.id, patch)}
            />
            {/* Die Einbauten liessen sich bisher gar nicht eintragen — das
                Formular legte `obstructions: []` an, und hinein kamen sie nur
                über den Import. Für einen ausgebauten Bus ist der Radkasten
                die wichtigste Angabe überhaupt. */}
            <Einbauten
              vehicle={v}
              onAendern={(obstructions) => updateVehicle(v.id, { obstructions })}
            />
            <Kantenformen vehicle={v} onAendern={(kanten) => updateVehicle(v.id, { kanten })} />
            <Wiegedaten vehicle={v} onAendern={(patch) => updateVehicle(v.id, patch)} />

            <button type="button" onClick={() => removeVehicle(v.id)}>
              {t('vehicle.remove', 'Remove')}
            </button>
          </div>
        )
      })}
    </section>
  )
}
