// ───────────────────────────────────────────────────────────────────────────
// DER AUSBAU-EDITOR — die Schale und was innen ist.
//
// ─── ERST DIE ART, DANN DIE FELDER DAZU ────────────────────────────────────
//
// Die Ausbau-Art entscheidet, welche Angaben überhaupt Sinn haben: ein
// Rack-Case hat Höheneinheiten und keinen Steg, ein Schaum-Case umgekehrt.
// Alle Felder gleichzeitig zu zeigen hiesse, nach Zahlen zu fragen, die
// nirgends hingehen — und ausgefüllte Felder ohne Wirkung sind schlimmer als
// fehlende: jemand glaubt, er hätte etwas eingetragen.
//
// ─── DAS INNENMASS WIRD GEFRAGT, NICHT GERECHNET ───────────────────────────
//
// Zwei Wege: nachmessen oder die Wandstärke angeben. Kein dritter, und vor
// allem keine Vorgabe — siehe `lib/caseLayout.ts`.
// ───────────────────────────────────────────────────────────────────────────
import { useT } from '../../i18n'
import { PlanRackWahl } from './PlanRackWahl'
import {
  AUSBAU_ARTEN,
  ausbauArt,
  type AusbauArt,
  type CaseAusbau,
  type Schublade,
} from '../../domain/types/caseAusbau'
import { VORGABE_STEG_MM, type Innenmass } from '../../domain/lib/caseLayout'
import { gleichmaessigeTeilung } from '../../domain/lib/caseAusbauLayout'

interface Props {
  ausbau: CaseAusbau | undefined
  innen: Innenmass
  onSetze: (patch: Partial<Omit<CaseAusbau, 'nodeId' | 'updatedAt'>>) => void
}

const artName = (a: AusbauArt, t: (k: string, en: string) => string): string =>
  a === 'schaum'
    ? t('ausbau.art.foam', 'Foam cut-outs')
    : a === 'divider'
      ? t('ausbau.art.divider', 'Adjustable dividers')
      : a === 'schubladen'
        ? t('ausbau.art.drawers', 'Drawers')
        : t('ausbau.art.rack', '19" rack rails')

export function AusbauFelder({ ausbau, innen, onSetze }: Props) {
  const { t, format } = useT()
  const art = ausbauArt(ausbau)

  const zahlFeld = (
    wert: number | undefined,
    setze: (v: number | undefined) => void,
    label: string,
  ) => (
    <label>
      {label}
      <input
        type="number"
        min={0}
        value={wert ?? ''}
        onChange={(e) => setze(e.target.value === '' ? undefined : Number(e.target.value))}
        aria-label={label}
      />
    </label>
  )

  return (
    <>
      <div className="zeile">
        <label>
          {t('ausbau.art', 'Inside')}
          <select
            value={art}
            onChange={(e) => onSetze({ art: e.target.value as AusbauArt })}
            aria-label={t('ausbau.art', 'Inside')}
          >
            {AUSBAU_ARTEN.map((a) => (
              <option key={a} value={a}>
                {artName(a, t)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ── Innenmass: gilt für jede Art ────────────────────────────────── */}
      <p className="hinweis">
        {t(
          'ausbau.innerHint',
          'The inside does not follow from the outside — shell, foam and lid all take their share. Measure it, or give the wall thickness so it can be subtracted. Nothing is guessed here.',
        )}
      </p>
      <div className="zeile">
        {zahlFeld(
          ausbau?.innenMm?.widthMm,
          (v) => onSetze({ innenMm: { ...ausbau?.innenMm, widthMm: v } }),
          t('case.inner.width', 'Inside width (mm)'),
        )}
        {zahlFeld(
          ausbau?.innenMm?.heightMm,
          (v) => onSetze({ innenMm: { ...ausbau?.innenMm, heightMm: v } }),
          t('case.inner.height', 'Inside height (mm)'),
        )}
        {zahlFeld(
          ausbau?.innenMm?.depthMm,
          (v) => onSetze({ innenMm: { ...ausbau?.innenMm, depthMm: v } }),
          t('case.inner.depth', 'Inside depth (mm)'),
        )}
        {zahlFeld(
          ausbau?.wandstaerkeMm,
          (v) => onSetze({ wandstaerkeMm: v }),
          t('case.wall', 'Wall thickness (mm)'),
        )}
      </div>
      <p className="hinweis">
        {innen.bekannt
          ? innen.quelle === 'gemessen'
            ? t('case.inner.measured', 'Measured inside dimensions — they beat any subtraction.')
            : t('case.inner.derived', 'Computed from the outside dimensions and the wall thickness.')
          : innen.text}
      </p>

      {/* ── Schaum ─────────────────────────────────────────────────────── */}
      {art === 'schaum' && (
        <div className="zeile">
          {zahlFeld(
            ausbau?.stegMm,
            (v) => onSetze({ stegMm: v }),
            format(t('case.web', 'Web between compartments (mm, default {mm})'), { mm: VORGABE_STEG_MM }),
          )}
        </div>
      )}

      {/* ── Divider ────────────────────────────────────────────────────── */}
      {art === 'divider' && (
        <>
          <p className="hinweis">
            {t(
              'ausbau.dividerHint',
              'The division is your decision, not a result: the walls stay where you put them, and the question is what fits into them. Widths in mm, separated by commas.',
            )}
          </p>
          <div className="zeile">
            <label>
              {t('ausbau.columns', 'Column widths (mm)')}
              <input
                value={(ausbau?.raster?.spaltenMm ?? []).join(', ')}
                onChange={(e) =>
                  onSetze({
                    raster: {
                      spaltenMm: leseMasse(e.target.value),
                      reihenMm: ausbau?.raster?.reihenMm ?? [],
                    },
                  })
                }
                placeholder="200, 200, 150"
                aria-label={t('ausbau.columns', 'Column widths (mm)')}
              />
            </label>
            <label>
              {t('ausbau.rows', 'Row depths (mm)')}
              <input
                value={(ausbau?.raster?.reihenMm ?? []).join(', ')}
                onChange={(e) =>
                  onSetze({
                    raster: {
                      spaltenMm: ausbau?.raster?.spaltenMm ?? [],
                      reihenMm: leseMasse(e.target.value),
                    },
                  })
                }
                placeholder="180, 180"
                aria-label={t('ausbau.rows', 'Row depths (mm)')}
              />
            </label>
            {zahlFeld(
              ausbau?.stegMm,
              (v) => onSetze({ stegMm: v }),
              t('ausbau.wallThickness', 'Divider thickness (mm)'),
            )}
          </div>
          {innen.bekannt && (
            <div className="zeile">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() =>
                    onSetze({
                      raster: gleichmaessigeTeilung(innen.mm, n, 1, ausbau?.stegMm ?? VORGABE_STEG_MM),
                    })
                  }
                >
                  {format(t('ausbau.evenSplit', '{n} columns, even'), { n })}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Schubladen ─────────────────────────────────────────────────── */}
      {art === 'schubladen' && (
        <>
          <p className="hinweis">
            {t(
              'ausbau.drawersHint',
              'Bottom first — which drawer sits low is a decision (the heavy one down), not a computed result. A drawer without a height is listed but not stacked; an assumed height would shift every drawer above it.',
            )}
          </p>
          <ul className="messliste">
            {(ausbau?.schubladen ?? []).map((s, i) => (
              <li key={s.id}>
                <div className="zeile">
                  <label>
                    {t('ausbau.drawerName', 'Drawer')}
                    <input
                      value={s.name}
                      onChange={(e) =>
                        onSetze({ schubladen: ersetze(ausbau?.schubladen, i, { ...s, name: e.target.value }) })
                      }
                      aria-label={t('ausbau.drawerName', 'Drawer')}
                    />
                  </label>
                  {zahlFeld(
                    s.hoeheMm,
                    (v) => onSetze({ schubladen: ersetze(ausbau?.schubladen, i, { ...s, hoeheMm: v }) }),
                    t('ausbau.drawerHeight', 'Clear height (mm)'),
                  )}
                  <button
                    type="button"
                    className="still"
                    onClick={() =>
                      onSetze({ schubladen: (ausbau?.schubladen ?? []).filter((x) => x.id !== s.id) })
                    }
                  >
                    {t('ausbau.drawerRemove', 'Remove')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="zeile">
            <button
              type="button"
              onClick={() =>
                onSetze({
                  schubladen: [
                    ...(ausbau?.schubladen ?? []),
                    {
                      id: `sch-${Date.now().toString(36)}`,
                      name: format(t('ausbau.drawerDefault', 'Drawer {n}'), {
                        n: (ausbau?.schubladen?.length ?? 0) + 1,
                      }),
                    } satisfies Schublade,
                  ],
                })
              }
            >
              {t('ausbau.drawerAdd', 'Add drawer')}
            </button>
          </div>
        </>
      )}

      {/* ── Rack ───────────────────────────────────────────────────────── */}
      {art === 'rack' && (
        <>
          <p className="hinweis">
            {t(
              'ausbau.rackHint',
              'The empty rack belongs to the warehouse: how many units this case has is a property of the case. What sits in them belongs to the signal plan — load the rack file from the Cable Planner and pick the rack below.',
            )}
          </p>
          <div className="zeile">
            {zahlFeld(
              ausbau?.rack?.hoeheHE,
              (v) => onSetze({ rack: { ...ausbau?.rack, hoeheHE: v } }),
              t('ausbau.rackUnits', 'Height (U)'),
            )}
            {zahlFeld(
              ausbau?.rack?.nutzbareTiefeMm,
              (v) => onSetze({ rack: { ...ausbau?.rack, nutzbareTiefeMm: v } }),
              t('ausbau.rackDepth', 'Usable depth behind the rail (mm)'),
            )}
          </div>
          <div className="zeile">
            <PlanRackWahl
              planRef={ausbau?.rack?.planRef}
              onSetze={(planRef) => onSetze({ rack: { ...ausbau?.rack, planRef } })}
            />
          </div>
        </>
      )}
    </>
  )
}

/**
 * „200, 200, 150" lesen.
 *
 * Was keine positive Zahl ist, fällt weg und wird nicht zu null: ein Fach
 * von 0 mm ist kein Fach, und eine stehengelassene Null verschöbe jedes
 * folgende.
 */
function leseMasse(text: string): number[] {
  return text
    .split(/[,;\s]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
}

function ersetze<T>(liste: readonly T[] | undefined, i: number, wert: T): T[] {
  const raus = [...(liste ?? [])]
  raus[i] = wert
  return raus
}
