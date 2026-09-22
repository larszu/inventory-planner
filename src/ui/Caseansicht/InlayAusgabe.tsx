// ───────────────────────────────────────────────────────────────────────────
// DIE INLAY-AUSGABE — aus dem Layout werden Dateien.
//
// ─── DREI WEGE, WEIL ES DREI MASCHINEN SIND ────────────────────────────────
//
//   DXF    zum Schaumzuschnitt. Geschlossene Konturen, Millimeter in der
//          Datei, Ebenen getrennt (`inlayDxf.ts`).
//   3MF    zum Drucken. Es NENNT die Einheit — das ist der Grund, es zuerst
//          anzubieten (`inlayDruck.ts`).
//   STL    zum Drucken, wenn die Maschine kein 3MF kann. Ohne Einheit in
//          der Datei; das steht dabei, statt es zu verschweigen.
//
// ─── JE LAGE EINE DATEI ────────────────────────────────────────────────────
//
// Ein Schaumausbau in zwei Lagen sind zwei Platten übereinander, und jede
// wird einzeln geschnitten. Deshalb wird die Lage gewählt und nicht „das
// Case" exportiert.
//
// ─── DIE BEFUNDE STEHEN VOR DEM KNOPF UND NICHT DAHINTER ───────────────────
//
// Ein zu dünner Steg, eine Tasche über dem Rand: das gehört gelesen, BEVOR
// jemand einen Schaumblock einspannt. Nach dem Schnitt ist es eine Auskunft
// über etwas, das nicht mehr zu ändern ist.
// ───────────────────────────────────────────────────────────────────────────
import { useMemo, useState } from 'react'
import { useT } from '../../i18n'
import type { CaseInnenmass } from '../../domain/types/caseAusbau'
import type { CaseLage } from '../../domain/lib/caseLayout'
import {
  MINDEST_STEG_MM,
  VORGABE_SPIEL_MM,
  erzeugeInlay,
  type InlayOptionen,
} from '../../domain/lib/inlay'
import { inlayNetz, offeneKanten, volumen } from '../../domain/lib/inlayMesh'
import { buildInlayDxf } from '../../domain/lib/inlayDxf'
import { build3mf, buildStl } from '../../domain/lib/inlayDruck'
import { dateiName, herunterladen } from '../../lib/herunterladen'

interface Props {
  /** Die Lagen des Schaum-Layouts, von unten nach oben. */
  lagen: readonly CaseLage[]
  innen: Required<CaseInnenmass> | null
  /** Name des Cases, für den Dateinamen und die Beschriftung. */
  titel: string
}

export function InlayAusgabe({ lagen, innen, titel }: Props) {
  const { t, format } = useT()
  const [lageNr, setLageNr] = useState(0)
  const [spielMm, setSpielMm] = useState(VORGABE_SPIEL_MM)
  const [bodenMm, setBodenMm] = useState(10)
  const [ohneGriff, setOhneGriff] = useState(false)

  const optionen: InlayOptionen = { spielMm, bodenMm, ohneGriff }
  const lage = lagen[lageNr]
  const modell = useMemo(
    () => (lage ? erzeugeInlay(lage, innen, optionen, t) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lage, innen, spielMm, bodenMm, ohneGriff, t],
  )
  const netz = useMemo(() => (modell ? inlayNetz(modell) : null), [modell])

  if (lagen.length === 0 || !innen) {
    return (
      <p className="hinweis">
        {t(
          'inlay.nothing',
          'No layer to cut yet. An inlay needs inside dimensions and at least one piece with dimensions.',
        )}
      </p>
    )
  }

  const basis = `${dateiName(titel)}-lage-${lageNr + 1}`

  return (
    <>
      <p className="hinweis">
        {t(
          'inlay.hint',
          'The layout places the pieces at their true size; the inlay adds clearance, because a pocket the size of the device does not take it. One file per layer — layers are separate sheets.',
        )}
      </p>

      <div className="zeile">
        <label>
          {t('inlay.layer', 'Layer')}
          <select
            value={lageNr}
            onChange={(e) => setLageNr(Number(e.target.value))}
            aria-label={t('inlay.layer', 'Layer')}
          >
            {lagen.map((l, i) => (
              <option key={l.yMm} value={i}>
                {format(t('inlay.layerOption', 'Layer {nr} · {mm} mm'), { nr: i + 1, mm: l.hoeheMm })}
              </option>
            ))}
          </select>
        </label>
        <label>
          {format(t('inlay.clearance', 'Clearance per side (mm, default {mm})'), { mm: VORGABE_SPIEL_MM })}
          <input
            type="number"
            min={0}
            step={0.5}
            value={spielMm}
            onChange={(e) => setSpielMm(Number(e.target.value))}
            aria-label={t('inlay.clearanceAria', 'Clearance per side')}
          />
        </label>
        <label>
          {t('inlay.floor', 'Floor under the pockets (mm)')}
          <input
            type="number"
            min={0}
            value={bodenMm}
            onChange={(e) => setBodenMm(Number(e.target.value))}
            aria-label={t('inlay.floor', 'Floor under the pockets (mm)')}
          />
        </label>
      </div>

      <div className="ebenen-schalter">
        <label className="wahl">
          <input type="checkbox" checked={!ohneGriff} onChange={() => setOhneGriff((v) => !v)} />
          {t('inlay.grip', 'Finger notches')}
        </label>
      </div>

      {/* WAS NICHT STIMMT, STEHT VOR DEM KNOPF. Nach dem Schnitt ist es eine
          Auskunft über etwas, das nicht mehr zu ändern ist. */}
      {modell && modell.befunde.length > 0 && (
        <ul className="messliste">
          {modell.befunde.map((b, i) => (
            <li key={`${b.art}-${i}`} className="warnung">
              {b.text}
            </li>
          ))}
        </ul>
      )}

      {modell && netz && (
        <>
          <p className="hinweis">
            {format(
              t(
                'inlay.summary',
                'Blank {b} × {t} × {h} mm · {n} pockets · {tri} triangles · {open} open edges · {vol} cm³',
              ),
              {
                b: modell.aussenMm.widthMm,
                t: modell.aussenMm.depthMm,
                h: modell.aussenMm.heightMm,
                n: modell.taschen.length,
                tri: netz.dreiecke.length,
                open: offeneKanten(netz),
                vol: Math.round(volumen(netz) / 1000),
              },
            )}
          </p>

          <div className="zeile">
            <button
              type="button"
              onClick={() =>
                herunterladen(
                  new Blob([buildInlayDxf(modell, titel)], { type: 'image/vnd.dxf' }),
                  `${basis}.dxf`,
                )
              }
            >
              {t('inlay.dxf', 'DXF for foam cutting')}
            </button>
            <button
              type="button"
              onClick={() =>
                herunterladen(
                  new Blob([build3mf(netz, `${titel} — ${lageNr + 1}`)], {
                    type: 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml',
                  }),
                  `${basis}.3mf`,
                )
              }
            >
              {t('inlay.3mf', '3MF for 3D printing')}
            </button>
            <button
              type="button"
              onClick={() =>
                herunterladen(new Blob([buildStl(netz, basis)], { type: 'model/stl' }), `${basis}.stl`)
              }
            >
              {t('inlay.stl', 'STL (no unit in the file)')}
            </button>
          </div>

          <p className="hinweis">
            {format(
              t(
                'inlay.formats',
                '3MF states the unit (millimetre) in the file and requires a watertight mesh — prefer it. STL states no unit at all; a reader has to guess, and the classic error is a factor of 25.4. Webs thinner than {min} mm are reported above.',
              ),
              { min: MINDEST_STEG_MM },
            )}
          </p>
        </>
      )}
    </>
  )
}
