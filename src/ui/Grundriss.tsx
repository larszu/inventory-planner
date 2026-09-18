// ───────────────────────────────────────────────────────────────────────────
// Der Grundriss — wo die Regale WIRKLICH stehen.
//
// ─── WARUM EIN BAUM NICHT REICHT ───────────────────────────────────────────
//
// „Halle 1 › Regal A › Fach A1" sagt, wo etwas HINGEHÖRT. Es sagt nicht, wo
// man hinlaufen muss. Wer neu ist, sucht Regal A, und der Baum hilft ihm
// dabei kein Stück: er kennt keine Reihenfolge im Raum, keine Gasse und
// keine Seite. Genau deshalb hängt in jedem Lager ein Plan an der Wand.
//
// Der Grundriss ist deshalb keine zweite Wahrheit neben dem Baum, sondern
// eine zweite FRAGE an dieselben Knoten: der Baum sagt „worin", der Plan
// sagt „wo". Beide lesen `StorageNode`, und der Plan schreibt genau ein
// Feld — `stellplatz`.
//
// ─── DIE HALLE WIRD NICHT ERFUNDEN ─────────────────────────────────────────
//
// Es gibt keine Vorgabe-Halle von zehn mal zehn Metern. Die Zeichenfläche
// ist entweder der `stellplatz` des Wurzel-Knotens (wer seine Halle
// ausgemessen hat, sieht sie) oder die Hülle dessen, was schon steht, plus
// einen Rand. Eine erfundene Hallengrösse sähe im Plan aus wie eine Angabe
// über das Gebäude — dieselbe Regel, an der `belastbarkeit()` im
// Facility-Planner `watt: null` zurückgibt statt `absicherungA × 230`.
//
// ─── ÜBERLAPP WIRD GEMELDET, NICHT VERBOTEN ────────────────────────────────
//
// Zwei Regale, die sich im Plan überschneiden, sind fast immer ein Fehler —
// aber nicht immer: beim Umbau steht das neue schon da, während das alte
// noch nicht weg ist. Gerechnet wird mit `ueberlappt` AUS DEM PACKER, damit
// es im Haus eine einzige Antwort auf „überschneidet sich das" gibt.
// ───────────────────────────────────────────────────────────────────────────
import { useMemo, useRef, useState } from 'react'
import { useT } from '../i18n'
import { useInventoryStore } from '../domain/store/inventoryStore'
import { quader, ueberlappt } from '../domain/lib/loadPacker'
import { nodePathLabel } from '../domain/lib/storageTree'
import { hallenUmriss } from '../domain/lib/hallenumriss'
import { flaechenName, liesSchema } from '../lib/kennungsablage'
import { ebenenKennungen } from '../domain/lib/platzkennung'
import { engstesTor, verstellt, verstelltText } from '../domain/lib/hallenflaechen'
import { useHallenStore } from '../domain/store/hallenStore'
import { FLAECHEN_ARTEN, type FlaechenArt } from '../domain/types/halle'
import type { StorageNode, Stellplatz } from '../domain/types/inventory'

/** Rand um die Halle, in Millimetern. */
const RAND = 500
/** Vorgabe-Raster. 100 mm — dieselbe Stufe wie in der Ladeplanung. */
const RASTER = [0, 100, 500, 1000]

/** Was ein Stellplatz mindestens misst, wenn jemand ihn zum ersten Mal setzt. */
const ERST_BREITE = 2000
const ERST_TIEFE = 1000

interface Zug {
  /** Ein Lagerort oder eine Fläche — beide liegen im selben Plan. */
  art: 'node' | 'flaeche'
  id: string
  /** Griff-Versatz in Hallen-Millimetern. */
  dx: number
  dz: number
  xMm: number
  zMm: number
}

export interface GrundrissProps {
  /** Beschriftung, die im Rechteck steht: Kennung, sonst Name. */
  beschriftung: (n: StorageNode) => string
}

export function Grundriss({ beschriftung }: GrundrissProps) {
  const { t, format } = useT()
  const nodes = useInventoryStore((s) => s.nodes)
  const updateNode = useInventoryStore((s) => s.updateNode)
  const flaechen = useHallenStore((s) => s.flaechen)
  const addNode = useInventoryStore((s) => s.addNode)
  const addFlaeche = useHallenStore((s) => s.addFlaeche)
  const updateFlaeche = useHallenStore((s) => s.updateFlaeche)
  const removeFlaeche = useHallenStore((s) => s.removeFlaeche)
  const [neueArt, setNeueArt] = useState<FlaechenArt>('stellflaeche')

  const svg = useRef<SVGSVGElement>(null)
  const zugRef = useRef<Zug | null>(null)
  const [zug, setZug] = useState<Zug | null>(null)
  const [raster, setRaster] = useState(100)
  const [auswahl, setAuswahl] = useState<string | undefined>()

  const gestellt = useMemo(() => nodes.filter((n) => n.stellplatz), [nodes])
  const offen = useMemo(
    () => nodes.filter((n) => !n.stellplatz && n.kind !== 'case' && n.kind !== 'transportCase'),
    [nodes],
  )

  /**
   * Die Zeichenfläche — gerechnet in `domain/lib/hallenumriss.ts`.
   *
   * Nicht hier: der 3D-Raum braucht dieselbe Antwort, und zwei Rechnungen
   * über dieselbe Halle sind im Bild auseinandergelaufen (der Boden war zwei
   * Meter grösser als der Umriss).
   */
  const halle = useMemo(() => hallenUmriss(nodes, RAND), [nodes])
  const imWeg = useMemo(() => verstellt(nodes, flaechen), [nodes, flaechen])
  const tor = useMemo(() => engstesTor(flaechen), [flaechen])

  /** Überschneidungen — gemeldet, nicht verboten. */
  const ueberschneidungen = useMemo(() => {
    const out: [StorageNode, StorageNode][] = []
    for (let i = 0; i < gestellt.length; i += 1) {
      for (let j = i + 1; j < gestellt.length; j += 1) {
        const a = gestellt[i]!
        const b = gestellt[j]!
        // Ein Regal IN einem Raum ist kein Überlapp, sondern die Absicht.
        if (a.parentId === b.id || b.parentId === a.id) continue
        if (ueberlappt(alsQuader(a.stellplatz!), alsQuader(b.stellplatz!))) out.push([a, b])
      }
    }
    return out
  }, [gestellt])

  const raste = (n: number) => (raster > 0 ? Math.round(n / raster) * raster : Math.round(n))

  const ausZeiger = (e: React.PointerEvent): { xMm: number; zMm: number } | null => {
    const el = svg.current
    if (!el) return null
    const p = el.createSVGPoint()
    p.x = e.clientX
    p.y = e.clientY
    const m = el.getScreenCTM()
    if (!m) return null
    const im = p.matrixTransform(m.inverse())
    return { xMm: im.x, zMm: im.y }
  }

  const bewegt = (e: React.PointerEvent) => {
    const z = zugRef.current
    if (!z) return
    const p = ausZeiger(e)
    if (!p) return
    const next = { ...z, xMm: raste(p.xMm - z.dx), zMm: raste(p.zMm - z.dz) }
    zugRef.current = next
    setZug(next)
  }

  const los = () => {
    const z = zugRef.current
    zugRef.current = null
    setZug(null)
    if (!z) return
    if (z.art === 'flaeche') {
      const f = flaechen.find((x) => x.id === z.id)
      if (f) updateFlaeche(f.id, { stellplatz: { ...f.stellplatz, xMm: z.xMm, zMm: z.zMm } })
      return
    }
    const n = nodes.find((x) => x.id === z.id)
    if (!n?.stellplatz) return
    updateNode(n.id, { stellplatz: { ...n.stellplatz, xMm: z.xMm, zMm: z.zMm } })
  }

  /** Eine neue Fläche in die Halle legen. */
  const flaecheAnlegen = () => {
    const basis = halle ?? { xMm: 0, zMm: 0 }
    addFlaeche({
      name: flaechenName(neueArt, t),
      art: neueArt,
      stellplatz: {
        xMm: raste(basis.xMm + RAND),
        zMm: raste(basis.zMm + RAND),
        breiteMm: neueArt === 'tor' ? 3000 : 4000,
        tiefeMm: neueArt === 'tor' ? 400 : 2500,
      },
    })
  }

  /** Einen bisher ungestellten Lagerplatz zum ersten Mal in die Halle setzen. */
  const stellen = (n: StorageNode) => {
    const basis = halle ?? { xMm: 0, zMm: 0 }
    updateNode(n.id, {
      stellplatz: {
        xMm: raste(basis.xMm + RAND),
        zMm: raste(basis.zMm + RAND),
        breiteMm: ERST_BREITE,
        tiefeMm: ERST_TIEFE,
      },
    })
  }

  const masse = (id: string, feld: keyof Stellplatz, wert: number) => {
    const n = nodes.find((x) => x.id === id)
    if (!n?.stellplatz || !(wert > 0)) return
    updateNode(id, { stellplatz: { ...n.stellplatz, [feld]: wert } })
  }

  const gewaehlt = auswahl ? nodes.find((n) => n.id === auswahl) : undefined

  /**
   * Die Ebenen eines Regals als echte Lagerplätze anlegen.
   *
   * WARUM SIE KNOTEN SEIN MÜSSEN und nicht eine Zahl am Regal bleiben: „Regal
   * A Ebene 1" muss auf ETWAS zeigen können. Solange die Ebene nur eine Zahl
   * ist, gibt es dort keinen Platz, in den ein Artikel gelegt werden kann —
   * weder von Hand, noch aus einem anderen Werkzeug, noch durch einen Scan.
   *
   * Angelegt wird nur, was fehlt: wer zweimal drückt, bekommt keine zweite
   * Garnitur.
   */
  const ebenenAnlegen = (regal: StorageNode) => {
    const anzahl = regal.stellplatz?.ebenen ?? 0
    const { kennungen } = ebenenKennungen(regal.code, anzahl, liesSchema())
    if (kennungen.length === 0) return
    const schon = new Set(
      nodes.filter((n) => n.parentId === regal.id).map((n) => n.code?.trim().toUpperCase()),
    )
    kennungen.forEach((code, i) => {
      if (schon.has(code.toUpperCase())) return
      addNode({
        name: format(t('floor.levelName', 'Level {n}'), { n: i + 1 }),
        kind: 'bin',
        parentId: regal.id,
        code,
      })
    })
  }
  const gewaehlteFlaeche = auswahl ? flaechen.find((f) => f.id === auswahl) : undefined

  const flaecheMass = (id: string, feld: keyof Stellplatz, wert: number) => {
    const f = flaechen.find((x) => x.id === id)
    if (!f || !(wert > 0)) return
    updateFlaeche(id, { stellplatz: { ...f.stellplatz, [feld]: wert } })
  }

  return (
    <div className="grundriss-rahmen">
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
        <label>
          {t('area.new', 'Add area')}
          <select value={neueArt} onChange={(e) => setNeueArt(e.target.value as FlaechenArt)}>
            {FLAECHEN_ARTEN.map((a) => (
              <option key={a} value={a}>
                {flaechenName(a, t)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="knopf-primaer" onClick={flaecheAnlegen}>
          {t('area.add', 'Put it on the plan')}
        </button>
      </div>

      {offen.length > 0 && (
        <div className="block">
          <h3>{format(t('floor.unplaced', 'Not on the plan ({n})'), { n: offen.length })}</h3>
          <p className="hinweis">
            {t('floor.unplacedHint', 'A location that is not on the plan is not wrong — nobody has measured where it stands.')}
          </p>
          <ul className="grundriss-offen">
            {offen.map((n) => (
              <li key={n.id}>
                {n.name}
                <button type="button" className="still" onClick={() => stellen(n)}>
                  {t('floor.place', 'Put on the plan')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {halle === null ? (
        <p className="hinweis">
          {t(
            'floor.empty',
            'Nothing is on the plan yet, and the hall has not been measured — so there is no drawing to show. Put a location on the plan, or give the top-level node its own footprint.',
          )}
        </p>
      ) : (
        <>
          {!halle.vermessen && (
            <p className="leise">
              {t(
                'floor.derived',
                'The outline follows what is on the plan, not a measured hall. Give the top-level location a footprint to draw the real one.',
              )}
            </p>
          )}
          <svg
            ref={svg}
            className="grundriss"
            viewBox={`${halle.xMm} ${halle.zMm} ${halle.breiteMm} ${halle.tiefeMm}`}
            role="img"
            aria-label={t('floor.label', 'Floor plan of the warehouse')}
            onPointerMove={bewegt}
            onPointerUp={los}
            onPointerLeave={los}
          >
            <rect
              x={halle.xMm}
              y={halle.zMm}
              width={halle.breiteMm}
              height={halle.tiefeMm}
              fill="#24405F"
              stroke="#8C9CB3"
              strokeWidth={Math.max(20, halle.breiteMm / 400)}
              strokeDasharray={halle.vermessen ? undefined : '200 160'}
            />

            {/* Die Flächen liegen UNTER den Lagerorten: sie sind der Boden,
                auf dem die Regale stehen — und ein Tor, das ein Regal
                verdeckt, verschweigt genau den Befund, um den es geht. */}
            {flaechen.map((f) => {
              const aktiv = zug?.art === 'flaeche' && zug.id === f.id
              const x = aktiv ? zug.xMm : f.stellplatz.xMm
              const z = aktiv ? zug.zMm : f.stellplatz.zMm
              const strich = Math.max(14, halle.breiteMm / 600)
              const farbe = flaechenFarbe(f.art)
              return (
                <g
                  key={f.id}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId)
                    const p = ausZeiger(e)
                    if (!p) return
                    setAuswahl(f.id)
                    const next: Zug = {
                      art: 'flaeche',
                      id: f.id,
                      dx: p.xMm - f.stellplatz.xMm,
                      dz: p.zMm - f.stellplatz.zMm,
                      xMm: f.stellplatz.xMm,
                      zMm: f.stellplatz.zMm,
                    }
                    zugRef.current = next
                    setZug(next)
                  }}
                  style={{ cursor: 'grab' }}
                >
                  <rect
                    x={x}
                    y={z}
                    width={f.stellplatz.breiteMm}
                    height={f.stellplatz.tiefeMm}
                    fill={farbe}
                    fillOpacity={f.art === 'tor' ? 0.9 : 0.16}
                    stroke={farbe}
                    strokeWidth={f.id === auswahl ? strich * 2 : strich}
                    strokeDasharray={f.art === 'verkehrsweg' ? `${strich * 8} ${strich * 6}` : undefined}
                  />
                  <text
                    x={x + f.stellplatz.breiteMm / 2}
                    y={z + f.stellplatz.tiefeMm / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={beschriftungsGroesse(halle) * 0.8}
                    fill={f.art === 'tor' ? '#132040' : farbe}
                  >
                    {f.name}
                  </text>
                </g>
              )
            })}

            {gestellt.map((n) => {
              const s = n.stellplatz!
              const aktiv = zug?.id === n.id
              const x = aktiv ? zug.xMm : s.xMm
              const z = aktiv ? zug.zMm : s.zMm
              const kaputt =
                ueberschneidungen.some(([a, b]) => a.id === n.id || b.id === n.id) ||
                imWeg.some((v) => v.node.id === n.id)
              // Räume und Depots sind Umrisse, keine Flächen: sie umschliessen
              // die Regale, statt sie zu verdecken.
              const umriss = n.kind === 'room' || n.kind === 'depot'
              const strich = Math.max(14, halle.breiteMm / 600)
              return (
                <g
                  key={n.id}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId)
                    const p = ausZeiger(e)
                    if (!p) return
                    setAuswahl(n.id)
                    const next: Zug = {
                      art: 'node',
                      id: n.id,
                      dx: p.xMm - s.xMm,
                      dz: p.zMm - s.zMm,
                      xMm: s.xMm,
                      zMm: s.zMm,
                    }
                    zugRef.current = next
                    setZug(next)
                  }}
                  style={{ cursor: 'grab' }}
                >
                  <rect
                    x={x}
                    y={z}
                    width={s.breiteMm}
                    height={s.tiefeMm}
                    transform={s.drehung ? `rotate(${s.drehung} ${x + s.breiteMm / 2} ${z + s.tiefeMm / 2})` : undefined}
                    fill={umriss ? 'none' : '#E1ECEF'}
                    fillOpacity={umriss ? 0 : 0.9}
                    stroke={kaputt ? '#B04A3F' : n.id === auswahl ? '#F6F5F0' : '#8C9CB3'}
                    strokeWidth={n.id === auswahl || kaputt ? strich * 2 : strich}
                  />
                  {/* Ein RAUM wird beschriftet wie ein Raum: klein, in der
                      Ecke. Zentriert und mitskaliert stand „Halle 1" im
                      ersten Anlauf 2,4 m hoch quer über dem ganzen Plan und
                      lag über den Regalen, um die es geht. Ein Regal dagegen
                      trägt seine Kennung mittig — sie ist das, was man im
                      Gang sucht. */}
                  {umriss ? (
                    <text
                      x={x + beschriftungsGroesse(halle) * 0.4}
                      y={z + beschriftungsGroesse(halle) * 1.1}
                      fontSize={beschriftungsGroesse(halle)}
                      fill="#8C9CB3"
                    >
                      {beschriftung(n)}
                    </text>
                  ) : (
                    <text
                      x={x + s.breiteMm / 2}
                      y={z + s.tiefeMm / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={Math.min(
                        beschriftungsGroesse(halle) * 1.4,
                        Math.max(120, Math.min(s.breiteMm, s.tiefeMm) * 0.5),
                      )}
                      fill="#132040"
                    >
                      {beschriftung(n)}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </>
      )}

      {imWeg.length > 0 && (
        <div className="block">
          <h3>{t('area.blockedHead', 'Standing where it has to stay clear')}</h3>
          <p className="hinweis">
            {t(
              'area.blockedHint',
              'Reported, not forbidden — during a rebuild a rack stands in the aisle because it cannot go anywhere else yet. But it does not stand there silently.',
            )}
          </p>
          {imWeg.map((v) => (
            <p key={`${v.node.id}-${v.flaeche.id}`} className="warnung">
              {verstelltText(v, t)}
            </p>
          ))}
        </div>
      )}

      {tor && (
        <p className="leise">
          {format(
            t('area.narrowest', 'Everything has to fit through {name}: {w} x {h} mm clear.'),
            { name: tor.name, w: tor.breiteMm, h: tor.hoeheMm },
          )}
        </p>
      )}

      {ueberschneidungen.length > 0 && (
        <div className="block">
          <h3>{t('floor.clashes', 'Overlapping on the plan')}</h3>
          <p className="hinweis">
            {t(
              'floor.clashHint',
              'Reported, not forbidden — during a rebuild the new rack stands there while the old one is not gone yet.',
            )}
          </p>
          {ueberschneidungen.map(([a, b]) => (
            <p key={`${a.id}-${b.id}`} className="warnung">
              {format(t('floor.clash', '{a} and {b} overlap.'), { a: a.name, b: b.name })}
            </p>
          ))}
        </div>
      )}

      {gewaehlteFlaeche && (
        <div className="block">
          <h3>{gewaehlteFlaeche.name}</h3>
          <div className="zeile">
            <label>
              {t('area.name', 'Name')}
              <input
                value={gewaehlteFlaeche.name}
                onChange={(e) => updateFlaeche(gewaehlteFlaeche.id, { name: e.target.value })}
              />
            </label>
            <label>
              {t('floor.width', 'Width (mm)')}
              <input
                type="number"
                value={gewaehlteFlaeche.stellplatz.breiteMm}
                onChange={(e) => flaecheMass(gewaehlteFlaeche.id, 'breiteMm', Number(e.target.value))}
              />
            </label>
            <label>
              {t('floor.depth', 'Depth (mm)')}
              <input
                type="number"
                value={gewaehlteFlaeche.stellplatz.tiefeMm}
                onChange={(e) => flaecheMass(gewaehlteFlaeche.id, 'tiefeMm', Number(e.target.value))}
              />
            </label>
          </div>

          {/* Das LICHTE Mass steht nur am Tor — und nur dort ist es eine
              Auskunft. Es ist NICHT die Höhe des Bauteils: bei einem
              Sektionaltor sind das zwei Zahlen, und die falsche kostet ein
              Case. */}
          {gewaehlteFlaeche.art === 'tor' && (
            <div className="zeile">
              <label>
                {t('area.clearWidth', 'Clear width (mm)')}
                <input
                  type="number"
                  value={gewaehlteFlaeche.lichtBreiteMm ?? ''}
                  onChange={(e) =>
                    updateFlaeche(gewaehlteFlaeche.id, {
                      lichtBreiteMm: Number(e.target.value) > 0 ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </label>
              <label>
                {t('area.clearHeight', 'Clear height (mm)')}
                <input
                  type="number"
                  value={gewaehlteFlaeche.lichtHoeheMm ?? ''}
                  onChange={(e) =>
                    updateFlaeche(gewaehlteFlaeche.id, {
                      lichtHoeheMm: Number(e.target.value) > 0 ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </label>
            </div>
          )}

          <button type="button" className="still" onClick={() => removeFlaeche(gewaehlteFlaeche.id)}>
            {t('area.remove', 'Remove the area')}
          </button>
        </div>
      )}

      {gewaehlt?.stellplatz && (
        <div className="block">
          <h3>{nodePathLabel(nodes, gewaehlt.id)}</h3>
          <div className="zeile">
            {(['breiteMm', 'tiefeMm', 'hoeheMm', 'ebenen', 'drehung'] as const).map((feld) => (
              <label key={feld}>
                {feldName(feld, t)}
                <input
                  type="number"
                  value={gewaehlt.stellplatz![feld] ?? ''}
                  onChange={(e) => masse(gewaehlt.id, feld, Number(e.target.value))}
                />
              </label>
            ))}
          </div>
          {/* Die Ebenen als Lagerplätze — der Knopf steht hier, weil hier
              die Zahl eingestellt wird, aus der sie entstehen. */}
          {(gewaehlt.stellplatz.ebenen ?? 0) > 0 && (
            <>
              <button type="button" className="knopf-primaer" onClick={() => ebenenAnlegen(gewaehlt)}>
                {format(t('floor.makeLevels', 'Create the {n} levels as locations'), {
                  n: gewaehlt.stellplatz.ebenen!,
                })}
              </button>
              {!gewaehlt.code && (
                <p className="leise">
                  {t(
                    'floor.needsCode',
                    'The shelf has no code yet — the levels continue it, so they cannot be named without it.',
                  )}
                </p>
              )}
            </>
          )}

          <button
            type="button"
            className="still"
            onClick={() => updateNode(gewaehlt.id, { stellplatz: undefined })}
          >
            {t('floor.unplace', 'Take off the plan')}
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Wie gross Schrift im Plan sein darf.
 *
 * An der HALLE gemessen und nicht am beschrifteten Rechteck: sonst wächst
 * die Schrift mit dem Objekt, und der grösste Kasten — der Raum — bekommt
 * die grösste Schrift. Genau andersherum ist es richtig.
 */
const beschriftungsGroesse = (halle: { breiteMm: number; tiefeMm: number }): number =>
  Math.max(120, Math.min(halle.breiteMm, halle.tiefeMm) / 22)

/**
 * Die Farbe einer Fläche.
 *
 * Aus der Marken-Palette und nicht frei gewählt: Stahlblau für alles, was
 * Struktur ist, die Meldefarben nur dort, wo eine Fläche eine AUSSAGE über
 * Zulässigkeit macht — ein Verkehrsweg und eine Sperrfläche sagen „hier
 * nicht". Tally-Rot kommt nicht vor; das Signal dieser Ansicht ist der Punkt
 * im Primärknopf.
 */
function flaechenFarbe(art: FlaechenArt): string {
  switch (art) {
    case 'tor':
      // Das Tor ist die Öffnung — hell, wie die Ladeöffnung im Laderaum.
      return '#F6F5F0'
    case 'verkehrsweg':
      return '#C8892B'
    case 'sperrflaeche':
      return '#B04A3F'
    case 'pickzone':
      return '#2F7D5C'
    default:
      return '#8C9CB3'
  }
}

const alsQuader = (s: Stellplatz) =>
  quader({ x: s.xMm, y: 0, z: s.zMm }, { x: s.breiteMm, y: 1, z: s.tiefeMm })

function feldName(feld: string, t: (k: string, en: string) => string): string {
  switch (feld) {
    case 'breiteMm':
      return t('floor.width', 'Width (mm)')
    case 'tiefeMm':
      return t('floor.depth', 'Depth (mm)')
    case 'hoeheMm':
      return t('floor.height', 'Height (mm)')
    case 'ebenen':
      return t('floor.levels', 'Levels')
    default:
      return t('floor.rotation', 'Rotation (°)')
  }
}
