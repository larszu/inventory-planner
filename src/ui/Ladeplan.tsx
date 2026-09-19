// ───────────────────────────────────────────────────────────────────────────
// Der Ladeplan einer Ladung (#20, #22, #23).
//
// DIE ARBEITSTEILUNG, DIE DIESE DATEI TRÄGT:
//
//   rechnen    `domain/lib/loadPacker` — rein, geprüft, ohne Three
//   zeigen     `Draufsicht` (sofort, mit dem Finger) und `Ladeansicht3D`
//              (nachgeladen, mit der Maus)
//   entscheiden  der Mensch. Der Packer schlägt vor; was von Hand abgesetzt
//              wird, ist verankert und bleibt stehen.
//
// WARUM DER PACKER SYNCHRON LÄUFT UND NICHT IM WEB WORKER. Issue #20 verlangt
// einen Worker, „sonst friert die Oberfläche ein". GEMESSEN (2026-09-18,
// `loadPackerTempo.node.test.ts`): 200 Stücke in einen 7,5-Tonner — **90 ms**.
// Das liegt unter der Schwelle, ab der ein Mensch eine Verzögerung bemerkt,
// und ein Worker kostet ein Nachrichten-Protokoll, einen zweiten Lebenszyklus
// und eine zweite Stelle, an der der Plan veralten kann. Er kommt, wenn die
// Messung ihn verlangt — die Zahl steht im Test und wird rot, wenn der Packer
// quadratisch wird.
// ───────────────────────────────────────────────────────────────────────────
import { lazy, Suspense, useMemo, useState } from 'react'
import { locale, useT } from '../i18n'
import { useLoadStore } from '../domain/store/loadStore'
import { useVehicleStore } from '../domain/store/vehicleStore'
import { packe } from '../domain/lib/loadPacker'
import type { PackStueck, RasterModus, Vec3 } from '../domain/lib/loadPacker'
import { rasterVon } from '../domain/types/vehicle'
import type { Ladung } from '../domain/types/load'
import { gruppen as gruppenDerLadung } from '../domain/lib/ladung'
import { Draufsicht } from './Ladeansicht/Draufsicht'
import { gruppenFarbe } from '../domain/lib/gruppenFarben'
import { Beladen } from './Beladen'
import { Lastverteilung } from './Lastverteilung'
import { Ladeausgabe } from './Ladeausgabe'

// Three liegt hinter dieser Grenze und nur hinter ihr. Wer `Ladeansicht3D`
// irgendwo statisch importiert, zieht es in den Start des Lagers — in
// `cable-planner` waren das gemessen 1,25 MB.
const Ladeansicht3D = lazy(() => import('./Ladeansicht/Ladeansicht3D'))

/** Die Raster, die zur Wahl stehen. 0 heisst frei. */
const RASTER = [0, 50, 100]

export function Ladeplan({ ladung }: { ladung: Ladung }) {
  const { t, format, sprache } = useT()
  const vehicles = useVehicleStore((s) => s.vehicles)
  const updateVehicle = useVehicleStore((s) => s.updateVehicle)
  const { setFixierung, setGruppenReihenfolge, setRasterModus } = useLoadStore()

  const [auswahl, setAuswahl] = useState<string | undefined>()
  const [raster, setRaster] = useState(100)
  const [zeige3d, setZeige3d] = useState(false)
  /**
   * PLANEN oder BELADEN.
   *
   * Zwei Modi und nicht zwei Reiter: es ist derselbe Plan, nur einmal vom
   * Schreibtisch aus und einmal vom Heck. Ein eigener Reiter machte daraus
   * zwei Werkzeuge, zwischen denen jemand den Stand von Hand übertragen
   * müsste.
   */
  const [modus, setModus] = useState<'planen' | 'beladen'>('planen')
  /** Was schiefging, wenn es nicht am Plan liegt — heute nur der Druckbogen. */
  const [fehler, setFehler] = useState('')

  const fahrzeug = vehicles.find((v) => v.id === ladung.vehicleId)
  const gruppen = ladung.gruppenReihenfolge ?? gruppenDerLadung(ladung)

  const stuecke: PackStueck[] = useMemo(
    () =>
      ladung.stuecke.map((s) => ({
        id: s.id,
        label: s.label,
        sizeMm: {
          x: s.dimensions?.widthMm ?? 0,
          y: s.dimensions?.heightMm ?? 0,
          z: s.dimensions?.depthMm ?? 0,
        },
        weightKg: s.dimensions?.weightKg,
        transport: s.transport,
        gruppe: s.gruppe,
        fixiert: s.fixiert,
      })),
    [ladung.stuecke],
  )

  // Das Raster kommt vom FAHRZEUG und der Modus von der LADUNG (#21) — der
  // „Snap" der Leiste ist etwas anderes: er rastet den FINGER beim Ziehen
  // ein und hat mit dem Packmass nichts zu tun. Beides in einem Regler wäre
  // bequem und falsch: wer 50 mm zum Ziehen wählt, wollte nicht die Reihen
  // umbauen.
  const fahrzeugRaster = fahrzeug ? rasterVon(fahrzeug) : 0
  const rasterModus: RasterModus = ladung.rasterModus ?? (fahrzeugRaster > 0 ? 'gemischt' : 'frei')

  const plan = useMemo(
    () =>
      fahrzeug
        ? packe(
            fahrzeug,
            stuecke,
            { gruppenReihenfolge: gruppen, rasterMm: fahrzeugRaster, rasterModus },
            t,
          )
        : null,
    [fahrzeug, stuecke, gruppen, fahrzeugRaster, rasterModus, t],
  )

  if (!fahrzeug) {
    return (
      <p className="hinweis">
        {t('plan.noVehicle', 'Pick a vehicle for this load — without a cargo space there is nothing to lay out.')}
      </p>
    )
  }
  if (!plan) return null

  const absetzen = (stueckId: string, position: Vec3) => {
    const p = plan.placements.find((x) => x.stueckId === stueckId)
    if (!p) return
    setFixierung(ladung.id, stueckId, { position, lage: p.lage })
  }

  const verschieben = (gruppe: string, richtung: -1 | 1) => {
    const i = gruppen.indexOf(gruppe)
    const j = i + richtung
    if (i < 0 || j < 0 || j >= gruppen.length) return
    const next = [...gruppen]
    next[i] = next[j]!
    next[j] = gruppe
    setGruppenReihenfolge(ladung.id, next)
  }

  const verankert = plan.placements.filter((p) => p.verankert)

  return (
    <div className="ladeplan">
      {fehler && <p className="ueberladen">{fehler}</p>}
      <div className="ladeplan-leiste">
        <div className="modus-schalter" role="group" aria-label={t('plan.mode', 'Mode')}>
          <button
            type="button"
            aria-pressed={modus === 'planen'}
            className={modus === 'planen' ? 'reiter aktiv' : 'reiter'}
            onClick={() => setModus('planen')}
          >
            {t('plan.modePlan', 'Plan')}
          </button>
          <button
            type="button"
            aria-pressed={modus === 'beladen'}
            className={modus === 'beladen' ? 'reiter aktiv' : 'reiter'}
            onClick={() => setModus('beladen')}
          >
            {t('plan.modeLoad', 'Load it')}
          </button>
        </div>
      </div>

      {modus === 'beladen' ? (
        <Beladen ladung={ladung} vehicle={fahrzeug} plan={plan} gruppen={gruppen} />
      ) : (
      <>
      <div className="ladeplan-leiste">
        <label>
          {t('plan.grid', 'Snap')}
          <select value={raster} onChange={(e) => setRaster(Number(e.target.value))}>
            {RASTER.map((r) => (
              <option key={r} value={r}>
                {r === 0 ? t('plan.grid.free', 'free') : format(t('plan.grid.mm', '{n} mm'), { n: r })}
              </option>
            ))}
          </select>
        </label>
        {fahrzeugRaster > 0 && (
          <label>
            {format(t('plan.rasterMode', 'Grid ({n} mm)'), { n: fahrzeugRaster })}
            <select
              value={rasterModus}
              onChange={(e) => setRasterModus(ladung.id, e.target.value as RasterModus)}
            >
              <option value="gemischt">{t('plan.rasterMixed', 'Mixed')}</option>
              <option value="raster">{t('plan.rasterStrict', 'Grid only')}</option>
              <option value="frei">{t('plan.rasterFree', 'Free')}</option>
            </select>
          </label>
        )}
        <button type="button" className="still" onClick={() => setZeige3d((z) => !z)}>
          {zeige3d ? t('plan.hide3d', 'Hide 3D') : t('plan.show3d', 'Show in 3D')}
        </button>
        {verankert.length > 0 && (
          <button
            type="button"
            className="still"
            onClick={() => verankert.forEach((p) => setFixierung(ladung.id, p.stueckId, undefined))}
          >
            {format(t('plan.releaseAll', 'Release {n} placed by hand'), { n: verankert.length })}
          </button>
        )}
      </div>

      <p className="hinweis">
        {t(
          'plan.dragHint',
          'Drag a case to place it by hand. A case you placed stays where you put it — the packer will not move it again.',
        )}
      </p>

      <Draufsicht
        vehicle={fahrzeug}
        plan={plan}
        gruppen={gruppen}
        auswahl={auswahl}
        onWaehle={setAuswahl}
        onVerschiebe={absetzen}
        rasterMm={raster}
        gitterMm={rasterModus === 'frei' ? 0 : fahrzeugRaster}
        oeffnungText={t('plan.aperture', 'Loading aperture — what comes out first stands here')}
        engsteText={t('plan.narrowest', 'Dashed: the narrowest cross-section further up')}
      />

      {zeige3d && (
        <Suspense fallback={<p className="hinweis">{t('plan.loading3d', 'Loading the 3D view…')}</p>}>
          <Ladeansicht3D
            vehicle={fahrzeug}
            plan={plan}
            gruppen={gruppen}
            auswahl={auswahl}
            onWaehle={setAuswahl}
            onVerschiebe={absetzen}
            // Einbauten lassen sich hier VERSCHIEBEN, nicht anlegen: wer im
            // Ladeplan steht, hat das Fahrzeug vor sich und sieht, dass der
            // Radkasten zu weit vorn sitzt. Die Masse selbst gehören in die
            // Fahrzeug-Ansicht, wo der Zollstock danebenliegt.
            onEinbauVerschiebe={(i, originMm) =>
              updateVehicle(fahrzeug.id, {
                obstructions: fahrzeug.obstructions.map((h, j) =>
                  j === i ? { ...h, originMm } : h,
                ),
              })
            }
            rasterMm={raster}
            modus="planen"
          />
        </Suspense>
      )}

      <Ladeausgabe
        ladungName={ladung.name}
        vehicle={fahrzeug}
        plan={plan}
        gruppen={gruppen}
        datum={new Date().toLocaleDateString(locale(sprache))}
        onFehler={setFehler}
      />

      <Lastverteilung
        ladungName={ladung.name}
        vehicle={fahrzeug}
        plan={plan}
        datum={new Date().toLocaleDateString(locale(sprache))}
        onFehler={setFehler}
      />

      {auswahl && (
        <p className="leise">
          {(() => {
            const p = plan.placements.find((x) => x.stueckId === auswahl)
            if (!p) return null
            return format(
              t('plan.selected', '{label} — step {step}, {x}/{z} mm, {state}'),
              {
                label: p.label,
                step: p.ladeSchritt,
                x: p.position.x,
                z: p.position.z,
                state: p.verankert
                  ? t('plan.anchored', 'placed by hand')
                  : p.imRaster
                    ? t('plan.onGrid', 'placed by the packer, on the grid')
                    : t('plan.byPacker', 'placed by the packer'),
              },
            )
          })()}
        </p>
      )}

      {gruppen.length > 1 && (
        <div className="block">
          <h3>{t('plan.groups', 'Unload order')}</h3>
          <p className="hinweis">
            {t('plan.groupsHint', 'The first group stands at the aperture and comes out first.')}
          </p>
          <ol className="gruppen-liste">
            {gruppen.map((g, i) => (
              <li key={g}>
                <span className="gruppen-punkt" style={{ background: gruppenFarbe(g, gruppen) }} aria-hidden />
                {g}
                <button type="button" className="still" disabled={i === 0} onClick={() => verschieben(g, -1)}>
                  {t('plan.groupUp', 'Earlier')}
                </button>
                <button
                  type="button"
                  className="still"
                  disabled={i === gruppen.length - 1}
                  onClick={() => verschieben(g, 1)}
                >
                  {t('plan.groupDown', 'Later')}
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      {plan.befunde.length > 0 && (
        <div className="block">
          <h3>{t('plan.findings', 'What it cost')}</h3>
          {plan.befunde.map((b, i) => (
            <p key={i} className="warnung">
              {b.text}
            </p>
          ))}
        </div>
      )}

      {plan.unplaced.length > 0 && (
        <div className="block">
          <h3>{format(t('plan.unplaced', 'Not laid out ({n})'), { n: plan.unplaced.length })}</h3>
          <ul>
            {plan.unplaced.map((u) => (
              <li key={u.stueckId}>
                <strong>{u.label}</strong> — {u.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="block">
        <h3>{t('plan.order', 'Loading order')}</h3>
        <p className="hinweis">
          {t('plan.orderHint', 'Load in this order. Unloading runs backwards.')}
        </p>
        <ol className="lade-liste">
          {[...plan.placements]
            .sort((a, b) => a.ladeSchritt - b.ladeSchritt)
            .map((p) => (
              <li key={p.stueckId}>
                <span className="gruppen-punkt" style={{ background: gruppenFarbe(p.gruppe, gruppen) }} aria-hidden />
                {p.label}
                {p.verankert && <span className="leise"> {t('plan.anchoredShort', '(by hand)')}</span>}
              </li>
            ))}
        </ol>
      </div>
      </>
      )}
    </div>
  )
}
