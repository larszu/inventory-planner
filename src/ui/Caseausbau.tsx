// ───────────────────────────────────────────────────────────────────────────
// CASES — was hineingeht, wie es darin liegt, und was in den Deckel kommt.
//
// ─── ZWEI GENERATOREN, EINE ANSICHT ────────────────────────────────────────
//
// Sie stehen zusammen, weil sie dieselbe Auswahl teilen: man hat EIN Case vor
// sich. Getrennt müsste man es zweimal heraussuchen, und die beiden Blätter,
// die am Ende an derselben Kiste hängen, entstünden an zwei Stellen.
//
//   Layout       wo im Schaum welches Fach sitzt (`lib/caseLayout.ts`)
//   Inhaltsliste was drin sein muss, zum Abhaken (`lib/caseInhaltsliste.ts`)
//
// ─── DAS INNENMASS IST EINE EINGABE UND KEINE RECHNUNG ─────────────────────
//
// Diese Ansicht fragt danach, statt es aus dem Aussenmass zu schätzen — und
// wenn niemand geantwortet hat, zeigt sie kein Layout, sondern den Grund.
// Ein Bild auf geratenem Innenmass sähe genauso aus wie eins auf gemessenem,
// und nach dem einen schneidet jemand Schaum.
//
// ─── DIE ZEICHNUNG IST EINE DRAUFSICHT JE LAGE ─────────────────────────────
//
// Ein Case wird von OBEN aufgemacht; die Frage „wo liegt was" ist deshalb
// eine Grundriss-Frage, so wie am Dock. SVG und kein 3D, aus demselben Grund
// wie bei der Draufsicht der Ladefläche: es steht sofort da, es druckt in
// der Auflösung des Druckers, und es geht mit dem Finger.
// ───────────────────────────────────────────────────────────────────────────
import { useMemo, useState } from 'react'
import { useT } from '../i18n'
import { useInventoryStore } from '../domain/store/inventoryStore'
import { useCaseAusbauStore } from '../domain/store/caseAusbauStore'
import {
  VORGABE_STEG_MM,
  erzeugeCaseLayout,
  fuellgrad,
  type CaseLage,
  type CaseStueck,
} from '../domain/lib/caseLayout'
import { caseInhalt, caseInhaltAlsText } from '../domain/lib/caseInhaltsliste'
import { buildCaseInhaltslisteHtml } from '../domain/lib/inventoryPrint'
import { isContainerKind, nodePathLabel } from '../domain/lib/storageTree'
import { GRUPPEN_TOENE } from '../domain/lib/gruppenFarben'

const heuteIso = () => new Date().toISOString().slice(0, 10)

export function Caseausbau() {
  const { t, format } = useT()
  const items = useInventoryStore((s) => s.items)
  const nodes = useInventoryStore((s) => s.nodes)
  const units = useInventoryStore((s) => s.units)
  const ausbauAlle = useCaseAusbauStore((s) => s.ausbau)
  const setzeAusbau = useCaseAusbauStore((s) => s.setzeAusbau)
  const [gewaehlt, setGewaehlt] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)
  const [kopiert, setKopiert] = useState(false)

  const cases = useMemo(
    () => nodes.filter((n) => isContainerKind(n.kind)).sort((a, b) => a.name.localeCompare(b.name)),
    [nodes],
  )
  const node = cases.find((n) => n.id === gewaehlt)
  const ausbau = gewaehlt ? ausbauAlle[gewaehlt] : undefined

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

  const vorschlag = useMemo(
    () => (node ? erzeugeCaseLayout(node, ausbau, stuecke, {}, t) : null),
    [node, ausbau, stuecke, t],
  )

  const zahlFeld = (wert: number | undefined, setze: (v: number | undefined) => void, label: string) => (
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
                onChange={(e) => {
                  setGewaehlt(e.target.value)
                  setKopiert(false)
                }}
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
          {/* ── Der Ausbau ─────────────────────────────────────────────── */}
          <div className="block">
            <h3>{t('case.buildout', 'Inside')}</h3>
            <p className="hinweis">
              {t(
                'case.buildout.hint',
                'The inside does not follow from the outside — shell, foam and lid all take their share. Measure it, or give the wall thickness so it can be subtracted. Nothing is guessed here.',
              )}
            </p>
            <div className="zeile">
              {zahlFeld(
                ausbau?.innenMm?.widthMm,
                (v) => setzeAusbau(node.id, { ...ausbau, innenMm: { ...ausbau?.innenMm, widthMm: v } }),
                t('case.inner.width', 'Inside width (mm)'),
              )}
              {zahlFeld(
                ausbau?.innenMm?.heightMm,
                (v) => setzeAusbau(node.id, { ...ausbau, innenMm: { ...ausbau?.innenMm, heightMm: v } }),
                t('case.inner.height', 'Inside height (mm)'),
              )}
              {zahlFeld(
                ausbau?.innenMm?.depthMm,
                (v) => setzeAusbau(node.id, { ...ausbau, innenMm: { ...ausbau?.innenMm, depthMm: v } }),
                t('case.inner.depth', 'Inside depth (mm)'),
              )}
            </div>
            <div className="zeile">
              {zahlFeld(
                ausbau?.wandstaerkeMm,
                (v) => setzeAusbau(node.id, { ...ausbau, wandstaerkeMm: v }),
                t('case.wall', 'Wall thickness (mm)'),
              )}
              {zahlFeld(
                ausbau?.stegMm,
                (v) => setzeAusbau(node.id, { ...ausbau, stegMm: v }),
                format(t('case.web', 'Web between compartments (mm, default {mm})'), { mm: VORGABE_STEG_MM }),
              )}
            </div>
            {vorschlag && (
              <p className="hinweis">
                {vorschlag.innen.bekannt
                  ? vorschlag.innen.quelle === 'gemessen'
                    ? t('case.inner.measured', 'Measured inside dimensions — they beat any subtraction.')
                    : t('case.inner.derived', 'Computed from the outside dimensions and the wall thickness.')
                  : vorschlag.innen.text}
              </p>
            )}
          </div>

          {/* ── Das Layout ─────────────────────────────────────────────── */}
          <div className="block">
            <h3>{t('case.layout', 'Layout')}</h3>
            {vorschlag && vorschlag.innen.bekannt && vorschlag.lagen.length > 0 ? (
              <>
                {vorschlag.lagen.map((lage, i) => (
                  <LagenBild
                    key={lage.yMm}
                    lage={lage}
                    innen={vorschlag.innen.bekannt ? vorschlag.innen.mm : { widthMm: 0, heightMm: 0, depthMm: 0 }}
                    nr={vorschlag.lagen.length - i}
                    vonOben={i === 0}
                  />
                ))}
                <p className="hinweis">
                  {format(
                    t('case.layout.summary', '{lagen} layers · {faecher} compartments · {kg} kg placed'),
                    {
                      lagen: vorschlag.lagen.length,
                      faecher: vorschlag.lagen.reduce((n, l) => n + l.faecher.length, 0),
                      kg: vorschlag.gesetztKg.toFixed(1),
                    },
                  )}
                </p>
              </>
            ) : (
              <p className="hinweis">
                {vorschlag && !vorschlag.innen.bekannt
                  ? vorschlag.innen.text
                  : t('case.layout.empty', 'Nothing with dimensions lies directly in this case.')}
              </p>
            )}

            {vorschlag && vorschlag.befunde.length > 0 && (
              <ul className="messliste">
                {vorschlag.befunde.map((b) => (
                  <li key={b.art}>{b.text}</li>
                ))}
              </ul>
            )}
            {vorschlag && vorschlag.ohnePlatz.length > 0 && (
              <>
                <h4>{t('case.noRoom', 'Without a compartment')}</h4>
                {/* MIT GRUND und nicht nur als Zahl: wer hier nachsieht, will
                    wissen, ob er messen oder umpacken muss. */}
                <ul className="messliste">
                  {vorschlag.ohnePlatz.map((o) => (
                    <li key={o.stueckId}>{o.text}</li>
                  ))}
                </ul>
              </>
            )}
          </div>

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

/**
 * Eine Lage von oben.
 *
 * DIE OBERSTE ZUERST, weil ein Case von oben aufgemacht wird: was man sieht,
 * wenn der Deckel aufgeht, steht auch oben auf dem Blatt. Die Nummer der Lage
 * zählt deshalb von unten (Lage 1 liegt am Boden), die Reihenfolge der Bilder
 * von oben — beides zusammen ist die Reihenfolge beim Ein- und Auspacken.
 */
function LagenBild({
  lage,
  innen,
  nr,
  vonOben,
}: {
  lage: CaseLage
  innen: { widthMm: number; heightMm: number; depthMm: number }
  nr: number
  vonOben: boolean
}) {
  const { t, format } = useT()
  if (innen.widthMm <= 0 || innen.depthMm <= 0) return null
  return (
    <div className="draufsicht-rahmen">
      <p className="draufsicht-legende">
        {format(t('case.layer', 'Layer {nr} · {mm} mm high · {pct}% of the floor used'), {
          nr,
          mm: lage.hoeheMm,
          pct: Math.round(fuellgrad(lage, innen) * 100),
        })}
        {vonOben ? ` · ${t('case.layer.top', 'this is what you see when the lid opens')}` : ''}
      </p>
      <svg
        className="draufsicht"
        viewBox={`-10 -10 ${innen.widthMm + 20} ${innen.depthMm + 20}`}
        role="img"
        aria-label={format(t('case.layer.aria', 'Layer {nr} seen from above'), { nr })}
      >
        {/* Die Innenwand. Kein Rechteck um das Aussenmass — gezeichnet wird,
            was wirklich frei ist. */}
        <rect
          x={0}
          y={0}
          width={innen.widthMm}
          height={innen.depthMm}
          fill="none"
          stroke="var(--linie)"
          strokeWidth={4}
        />
        {lage.faecher.map((f, i) => (
          <g key={f.stueckId}>
            <rect
              x={f.xMm}
              y={f.zMm}
              width={f.breiteMm}
              height={f.tiefeMm}
              fill={GRUPPEN_TOENE[i % GRUPPEN_TOENE.length]}
              fillOpacity={0.35}
              stroke="var(--linie)"
              strokeWidth={3}
            />
            {/* Die Nummer steht im Fach, der Name daneben in der Liste: ein
                Modellname in einem 80-mm-Fach ist bei jedem Massstab
                unlesbar. */}
            <text
              x={f.xMm + f.breiteMm / 2}
              y={f.zMm + f.tiefeMm / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={Math.max(20, Math.min(f.breiteMm, f.tiefeMm) / 3)}
              fill="var(--text)"
            >
              {f.nr}
            </text>
          </g>
        ))}
      </svg>
      <ol className="messliste">
        {lage.faecher.map((f) => (
          <li key={f.stueckId}>
            {f.nr} · {f.label} · {f.breiteMm} × {f.tiefeMm} × {f.hoeheMm} mm
            {f.gedreht ? ` · ${t('case.turned', 'turned')}` : ''}
          </li>
        ))}
      </ol>
    </div>
  )
}
