// ───────────────────────────────────────────────────────────────────────────
// CASES — was hineingeht, wie es darin liegt, und was in den Deckel kommt.
//
// ─── ZWEI GENERATOREN, EINE ANSICHT ────────────────────────────────────────
//
// Sie stehen zusammen, weil sie dieselbe Auswahl teilen: man hat EIN Case vor
// sich. Getrennt müsste man es zweimal heraussuchen, und die beiden Blätter,
// die am Ende an derselben Kiste hängen, entstünden an zwei Stellen.
//
//   Layout       wie das Innere geteilt ist (`lib/caseLayout.ts` für Schaum,
//                `lib/caseAusbauLayout.ts` für Divider, Schubladen, Rack)
//   Inhaltsliste was drin sein muss, zum Abhaken (`lib/caseInhaltsliste.ts`)
//
// ─── DAS INNENMASS IST EINE EINGABE UND KEINE RECHNUNG ─────────────────────
//
// Diese Ansicht fragt danach, statt es aus dem Aussenmass zu schätzen — und
// wenn niemand geantwortet hat, zeigt sie kein Layout, sondern den Grund.
// Ein Bild auf geratenem Innenmass sähe genauso aus wie eins auf gemessenem,
// und nach dem einen schneidet jemand Schaum.
//
// ─── 2D STEHT SOFORT DA, 3D BEANTWORTET DIE ANDERE FRAGE ───────────────────
//
// Die Draufsicht sagt „wo liegt was" je Lage und druckt in der Auflösung des
// Druckers. Sie kann nicht sagen, wie die Lagen ÜBEREINANDER stehen — und
// das ist beim Schaum die Frage, an der der Deckel hängt. Deshalb beides,
// und 3D hinter `lazy`: Three ist gross und gehört nicht in den Start des
// Lagers.
//
// ─── EBENEN LASSEN SICH AUSBLENDEN ─────────────────────────────────────────
//
// Weil die untere Lage sonst nie zu sehen ist. Das ist keine Spielerei: wer
// Schaum für Lage 2 schneidet, will Lage 1 nicht im Bild haben.
// ───────────────────────────────────────────────────────────────────────────
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useT } from '../i18n'
import { useInventoryStore } from '../domain/store/inventoryStore'
import { useCaseAusbauStore } from '../domain/store/caseAusbauStore'
import { useCaseVorlagenStore } from '../domain/store/caseVorlagenStore'
import { erzeugeCaseLayout, innenmass, type CaseStueck } from '../domain/lib/caseLayout'
import { dividerPlan, rackGegenPlan, schubladenPlan } from '../domain/lib/caseAusbauLayout'
import { caseInhalt, caseInhaltAlsText } from '../domain/lib/caseInhaltsliste'
import { buildCaseInhaltslisteHtml } from '../domain/lib/inventoryPrint'
import { isContainerKind, nodePathLabel } from '../domain/lib/storageTree'
import { ausbauArt, type CaseAusbau } from '../domain/types/caseAusbau'
import { AusbauFelder } from './Caseansicht/AusbauFelder'
import { usePlanRackStore } from '../domain/store/planRackStore'
import { DividerAnsicht, RackAnsicht, SchaumLage, SchubladenAnsicht } from './Caseansicht/Plaene'
import { VorlagenWahl } from './Caseansicht/VorlagenWahl'
import { InlayAusgabe } from './Caseansicht/InlayAusgabe'

// Three ist gross und gehört nicht in den Start des Lagers — dieselbe
// Grenze wie bei `Ladeansicht3D`.
const Case3D = lazy(() => import('./Caseansicht/Case3D'))

const heuteIso = () => new Date().toISOString().slice(0, 10)

export function Caseausbau() {
  const { t, format } = useT()
  const items = useInventoryStore((s) => s.items)
  const nodes = useInventoryStore((s) => s.nodes)
  const units = useInventoryStore((s) => s.units)
  const ausbauAlle = useCaseAusbauStore((s) => s.ausbau)
  const setzeAusbau = useCaseAusbauStore((s) => s.setzeAusbau)
  const eigeneVorlagen = useCaseVorlagenStore((s) => s.vorlagen)
  const setzeVorlage = useCaseVorlagenStore((s) => s.setzeVorlage)

  const [gewaehlt, setGewaehlt] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)
  const [kopiert, setKopiert] = useState(false)
  const [raum, setRaum] = useState<'2d' | '3d'>('2d')
  const [auswahl, setAuswahl] = useState<string | undefined>()
  /** Welche Lagen sichtbar sind. Leer heisst ALLE — eine leere Menge als
   *  „nichts zeigen" zu lesen liesse die Ansicht beim ersten Öffnen leer. */
  const [versteckt, setVersteckt] = useState<ReadonlySet<number>>(new Set())

  const cases = useMemo(
    () => nodes.filter((n) => isContainerKind(n.kind)).sort((a, b) => a.name.localeCompare(b.name)),
    [nodes],
  )
  const node = cases.find((n) => n.id === gewaehlt)
  const ausbau = gewaehlt ? ausbauAlle[gewaehlt] : undefined
  const art = ausbauArt(ausbau)

  // Beim Wechsel des Cases nichts aus dem vorigen stehen lassen.
  useEffect(() => {
    setVersteckt(new Set())
    setAuswahl(undefined)
    setKopiert(false)
  }, [gewaehlt])

  const inhalt = useMemo(
    () => (gewaehlt ? caseInhalt(gewaehlt, { items, nodes, units }, heuteIso()) : null),
    [gewaehlt, items, nodes, units],
  )

  /**
   * Die Stücke für das Layout.
   *
   * NUR, WAS DIREKT DARIN LIEGT — dieselbe Grenze wie bei der Inhaltsliste:
   * ein Unter-Case bekommt sein eigenes Layout, und seine Innereien im Schaum
   * des Elternteils zu zeichnen wäre ein Bild, das es nicht gibt.
   */
  const stuecke: CaseStueck[] = useMemo(() => {
    if (!gewaehlt) return []
    const raus: CaseStueck[] = []
    for (const k of nodes.filter((n) => n.parentId === gewaehlt)) {
      const d = k.dimensions
      raus.push({
        id: k.id,
        label: k.name,
        sizeMm: { x: d?.widthMm ?? 0, y: d?.heightMm ?? 0, z: d?.depthMm ?? 0 },
        weightKg: d?.weightKg,
        transport: k.transport,
      })
    }
    for (const it of items.filter((i) => i.locationId === gewaehlt)) {
      const d = it.dimensions
      raus.push({
        id: it.id,
        label: it.model,
        sizeMm: { x: d?.widthMm ?? 0, y: d?.heightMm ?? 0, z: d?.depthMm ?? 0 },
        weightKg: d?.weightKg,
        anzahl: it.quantity,
      })
    }
    return raus
  }, [gewaehlt, items, nodes])

  const innen = useMemo(
    () => (node ? innenmass(node, ausbau, t) : null),
    [node, ausbau, t],
  )
  const schaum = useMemo(
    () => (node && art === 'schaum' ? erzeugeCaseLayout(node, ausbau, stuecke, {}, t) : null),
    [node, ausbau, stuecke, art, t],
  )
  const divider = useMemo(
    () =>
      innen?.bekannt && art === 'divider' && ausbau?.raster
        ? dividerPlan(innen.mm, ausbau.raster, stuecke, ausbau.stegMm ?? 10, t)
        : null,
    [innen, art, ausbau, stuecke, t],
  )
  const schubladen = useMemo(
    () => (innen?.bekannt && art === 'schubladen' ? schubladenPlan(innen.mm, ausbau?.schubladen ?? []) : null),
    [innen, art, ausbau],
  )
  const planRacks = usePlanRackStore((s) => s.racks)
  const planEingelesen = usePlanRackStore((s) => !!s.eingelesen)
  const rack = useMemo(() => {
    // Die Bestückung kommt NICHT von hier: das Lager darf kein Plan-Modell
    // kennen (ADR-006). Sie kommt aus der Datei, die der Plan herüberreicht
    // (`avplan-rack-belegung`), und wird über `planRef` gefunden. Ohne sie
    // zeigt `rackGegenPlan` das leere Rack und sagt, dass es keine Aussage
    // über den Inhalt ist.
    if (art !== 'rack') return null
    const ref = ausbau?.rack?.planRef
    const plan = ref ? planRacks.find((r) => r.planRef === ref) : undefined
    return rackGegenPlan(ausbau?.rack, plan, planEingelesen, t)
  }, [art, ausbau, planRacks, planEingelesen, t])

  const patch = (p: Partial<Omit<CaseAusbau, 'nodeId' | 'updatedAt'>>) => {
    if (node) setzeAusbau(node.id, { ...ausbau, ...p })
  }

  const blattOeffnen = () => {
    if (!inhalt) return
    const w = window.open('', '_blank')
    if (!w) {
      setFehler(t('case.printBlocked', 'The sheet could not be opened — the browser blocked the window.'))
      return
    }
    setFehler(null)
    w.document.write(buildCaseInhaltslisteHtml(inhalt, new Date().toLocaleDateString(), t))
    w.document.close()
  }

  const lagen = useMemo(() => schaum?.lagen ?? [], [schaum])
  const sichtbareLagen = useMemo(
    () => new Set(lagen.map((_, i) => i).filter((i) => !versteckt.has(i))),
    [lagen, versteckt],
  )

  /**
   * Die Lagen in ANZEIGE-Reihenfolge: oberste zuerst.
   *
   * `erzeugeCaseLayout` baut sie von UNTEN auf — `lagen[0]` liegt am Boden.
   * Wer den Deckel aufmacht, sieht aber die oberste. Gemessen am 2026-09-20
   * an einem Bildschirmfoto: die Fläche zeigte die unterste zuerst UND
   * beschriftete sie mit „das sieht man, wenn der Deckel aufgeht" — beides
   * verkehrt herum, und zusammen ergab es eine Anleitung zum falschen
   * Einräumen.
   *
   * `nr` zählt weiter von unten (Lage 1 liegt am Boden), weil man beim
   * Packen von unten arbeitet. Beides zusammen ist die Reihenfolge beim
   * Ein- und Auspacken.
   */
  const anzeigeLagen = useMemo(
    () =>
      lagen
        .map((lage, index) => ({ lage, index, nr: index + 1 }))
        .reverse(),
    [lagen],
  )

  return (
    <section className="bericht">
      {/* ── Welches Case ─────────────────────────────────────────────── */}
      <div className="block">
        <h3>{t('case.pick', 'Case')}</h3>
        {cases.length === 0 ? (
          <p className="hinweis">
            {t(
              'case.none',
              'No case in the storage tree yet. A case is a container node — without one there is nothing to lay out.',
            )}
          </p>
        ) : (
          <div className="zeile">
            <label>
              {t('case.pick', 'Case')}
              <select
                value={gewaehlt}
                onChange={(e) => setGewaehlt(e.target.value)}
                aria-label={t('case.pick.aria', 'Which case')}
              >
                <option value="">—</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {nodePathLabel(nodes, c.id)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      {node && (
        <>
          {/* ── Vorlage ────────────────────────────────────────────────── */}
          <div className="block">
            <h3>{t('case.template', 'Template')}</h3>
            <VorlagenWahl
              eigene={eigeneVorlagen}
              node={node}
              ausbau={ausbau}
              onUebernehmen={patch}
              onVorlageSpeichern={setzeVorlage}
            />
          </div>

          {/* ── Der Ausbau ─────────────────────────────────────────────── */}
          <div className="block">
            <h3>{t('case.buildout', 'Inside')}</h3>
            {innen && <AusbauFelder ausbau={ausbau} innen={innen} onSetze={patch} />}
          </div>

          {/* ── Das Layout ─────────────────────────────────────────────── */}
          <div className="block">
            <h3>{t('case.layout', 'Layout')}</h3>

            {!innen?.bekannt && art !== 'rack' ? (
              <p className="hinweis">{innen?.text}</p>
            ) : (
              <>
                {/* Schaum: 2D je Lage, 3D über alle, Ebenen schaltbar. */}
                {art === 'schaum' && schaum && innen?.bekannt && (
                  <>
                    {lagen.length === 0 ? (
                      <p className="hinweis">
                        {t('case.layout.empty', 'Nothing with dimensions lies directly in this case.')}
                      </p>
                    ) : (
                      <>
                        <div className="zeile">
                          <div className="modus-schalter">
                            <button
                              type="button"
                              className={raum === '2d' ? 'aktiv' : undefined}
                              onClick={() => setRaum('2d')}
                            >
                              {t('case.view2d', 'Top view')}
                            </button>
                            <button
                              type="button"
                              className={raum === '3d' ? 'aktiv' : undefined}
                              onClick={() => setRaum('3d')}
                            >
                              {t('case.view3d', '3D')}
                            </button>
                          </div>
                        </div>
                        {/* Ebenen ein- und ausblenden. Ohne das ist die
                            untere Lage nie zu sehen.

                            EIGENE ZEILE, und das aus zwei Gründen, beide im
                            Bildschirmfoto vom 2026-09-20 zu sehen: in einer
                            `.zeile` setzt `.zeile label` die Felder auf
                            `column` und riss Kästchen und Beschriftung
                            auseinander — und neben dem Ansichts-Schalter
                            umbrachen die Schalter mitten in der Reihe. */}
                        <div className="ebenen-schalter">
                            {anzeigeLagen.map(({ lage, index, nr }) => (
                              <label key={lage.yMm} className="wahl">
                                <input
                                  type="checkbox"
                                  checked={!versteckt.has(index)}
                                  onChange={() =>
                                    setVersteckt((v) => {
                                      const n = new Set(v)
                                      if (n.has(index)) n.delete(index)
                                      else n.add(index)
                                      return n
                                    })
                                  }
                                />
                                {format(t('case.layerToggle', 'Layer {nr}'), { nr })}
                              </label>
                          ))}
                        </div>

                        {raum === '3d' ? (
                          <Suspense fallback={<p className="hinweis">{t('case3d.loading', 'Loading the 3D view…')}</p>}>
                            <Case3D
                              innen={innen.mm}
                              lagen={lagen}
                              sichtbar={sichtbareLagen}
                              auswahl={auswahl}
                            />
                          </Suspense>
                        ) : (
                          anzeigeLagen.map(({ lage, index, nr }, j) =>
                            versteckt.has(index) ? null : (
                              <SchaumLage
                                key={lage.yMm}
                                lage={lage}
                                innen={innen.mm}
                                nr={nr}
                                vonOben={j === 0}
                                auswahl={auswahl}
                                onWaehle={setAuswahl}
                              />
                            ),
                          )
                        )}
                        <p className="hinweis">
                          {format(
                            t('case.layout.summary', '{lagen} layers · {faecher} compartments · {kg} kg placed'),
                            {
                              lagen: lagen.length,
                              faecher: lagen.reduce((n, l) => n + l.faecher.length, 0),
                              kg: schaum.gesetztKg.toFixed(1),
                            },
                          )}
                        </p>
                      </>
                    )}
                  </>
                )}

                {art === 'divider' &&
                  innen?.bekannt &&
                  (divider ? (
                    <DividerAnsicht plan={divider} innen={innen.mm} />
                  ) : (
                    <p className="hinweis">
                      {t('divider.noRaster', 'No division entered yet — give the column widths and row depths above.')}
                    </p>
                  ))}

                {art === 'schubladen' &&
                  innen?.bekannt &&
                  (schubladen && schubladen.lagen.length > 0 ? (
                    <SchubladenAnsicht plan={schubladen} innen={innen.mm} />
                  ) : (
                    <p className="hinweis">{t('drawers.none', 'No drawers with a clear height yet.')}</p>
                  ))}

                {art === 'rack' && rack && <RackAnsicht plan={rack} />}
              </>
            )}

            {/* Befunde und was kein Fach bekam — MIT Grund. */}
            {schaum && schaum.befunde.length > 0 && (
              <ul className="messliste">
                {schaum.befunde.map((b) => (
                  <li key={b.art}>{b.text}</li>
                ))}
              </ul>
            )}
            {(schaum?.ohnePlatz.length || divider?.ohnePlatz.length) ? (
              <>
                <h4>{t('case.noRoom', 'Without a compartment')}</h4>
                <ul className="messliste">
                  {[...(schaum?.ohnePlatz ?? []), ...(divider?.ohnePlatz ?? [])].map((o) => (
                    <li key={o.stueckId}>{o.text}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>

          {/* ── Das Inlay als Datei ────────────────────────────────────── */}
          {art === 'schaum' && (
            <div className="block">
              <h3>{t('case.inlay', 'Inlay as a file')}</h3>
              <InlayAusgabe
                lagen={lagen}
                innen={innen?.bekannt ? innen.mm : null}
                titel={node.name}
              />
            </div>
          )}

          {/* ── Die Inhaltsliste ───────────────────────────────────────── */}
          <div className="block">
            <h3>{t('case.contents', 'Contents list')}</h3>
            {!inhalt || inhalt.zeilen.length === 0 ? (
              <p className="hinweis">{t('case.contents.empty', 'Nothing lies directly in this case.')}</p>
            ) : (
              <>
                <table className="tabelle-rahmen">
                  <thead>
                    <tr>
                      <th>{t('case.col.what', 'What')}</th>
                      <th className="rechts">{t('case.col.qty', 'Qty')}</th>
                      <th className="rechts">{t('case.col.kg', 'kg')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inhalt.zeilen.map((z, i) => (
                      <tr key={`${z.text}-${i}`}>
                        <td>
                          {z.text}
                          {z.unterCase && <span className="leise"> · {t('case.subcase', 'own sheet')}</span>}
                          {z.ownership && <span className="warnung"> · {z.ownership}</span>}
                          {z.condition && <span className="warnung"> · {z.condition}</span>}
                        </td>
                        <td className="rechts">{z.qty}</td>
                        <td className="rechts">
                          {z.weightKg === undefined ? (
                            <span className="leise">{t('case.notWeighed', 'not weighed')}</span>
                          ) : (
                            z.weightKg.toFixed(1)
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="hinweis">
                  {inhalt.gesamtKg !== undefined
                    ? format(t('case.totalKg', 'Total {kg} kg, case empty {leer} kg.'), {
                        kg: inhalt.gesamtKg.toFixed(1),
                        leer: (inhalt.leerKg ?? 0).toFixed(1),
                      })
                    : format(
                        t(
                          'case.noTotal',
                          'Contents {kg} kg — no total: {n} positions are not weighed or the empty weight of the case is missing.',
                        ),
                        { kg: inhalt.inhaltKg.toFixed(1), n: inhalt.ohneGewicht },
                      )}
                </p>
                <div className="zeile">
                  <button type="button" onClick={blattOeffnen}>
                    {t('case.openSheet', 'Open sheet for the lid (A4)')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard
                        ?.writeText(caseInhaltAlsText(inhalt, t))
                        .then(() => setKopiert(true))
                        .catch(() => setKopiert(false))
                    }}
                  >
                    {kopiert ? t('case.copied', 'Copied') : t('case.copy', 'Copy as text')}
                  </button>
                </div>
                {fehler && <p className="warnung">{fehler}</p>}
              </>
            )}
          </div>
        </>
      )}
    </section>
  )
}
