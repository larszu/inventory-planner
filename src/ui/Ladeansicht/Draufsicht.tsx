// ───────────────────────────────────────────────────────────────────────────
// Die Draufsicht auf die Ladefläche (#23) — und der Weg, auf dem man Kisten
// mit dem Finger schiebt.
//
// WARUM SVG UND NICHT DIE 3D-ANSICHT. Drei Gründe, und alle drei sind
// Bedienung und nicht Geschmack:
//
//   1. Sie lädt sofort. Three ist ein eigener Chunk hinter `lazy`; die
//      Draufsicht steht da, während er noch kommt.
//   2. Sie funktioniert mit dem FINGER. Am Dock steht ein Telefon oder ein
//      Tablet, und `TransformControls` in 3D ist dort kaum zu treffen.
//   3. Beim Laden schaut man von oben. Die Frage „was steht wo auf der
//      Fläche" ist eine Grundriss-Frage.
//
// DIESELBEN REGELN WIE DER PACKER, NICHT EIGENE. Die Gültigkeitsprüfung beim
// Ziehen benutzt `ueberlappt` und `liegtInnerhalb` aus dem Packer und
// `quaderFrei` aus `domain/lib/kontur`. Eine eigene Kollisionsrechnung hier
// wäre die zweite Wahrheit darüber, ob etwas passt — und sie würde irgendwann
// anders antworten als der Plan, den sie zeichnet.
//
// DER UMRISS IST NICHT DAS RECHTECK DES HÜLLQUADERS. Er kommt aus
// `konturBeiHoehe` und zeigt, was auf BODENHÖHE frei ist: eine gerundete
// untere Kante, eine gebrochene Ecke am Heck, ein verjüngter Kofferraum. Ein
// Rechteck zu zeichnen, wo eine Rundung ist, wäre eine Einladung, eine Kiste
// dorthin zu schieben, wo sie nicht steht.
//
// Weil der Grundriss WEITER OBEN anders aussehen kann — zusammenlaufende
// Wände, eine gerundete Dachkante —, steht der engste Schnitt als
// gestrichelte Linie daneben. Ohne ihn hiesse „passt in der Draufsicht"
// stillschweigend „passt nur bis Kniehöhe".
//
// WAS SIE NICHT ZEIGT: die Höhe. Zwei Kisten übereinander liegen in der
// Draufsicht aufeinander; die obere wird dünner gezeichnet, aber die Frage
// „passt das unter die Decke" beantwortet die 3D-Ansicht.
// ───────────────────────────────────────────────────────────────────────────
import { useMemo, useRef, useState } from 'react'
import { liegtInnerhalb, quader, ueberlappt } from '../../domain/lib/loadPacker'
import type { LoadPlan, Vec3 } from '../../domain/lib/loadPacker'
import {
  konturBeiHoehe,
  konturFlaeche,
  konturHoehen,
  quaderFrei,
  type Punkt2D,
} from '../../domain/lib/kontur'
import type { Vehicle } from '../../domain/types/vehicle'
import { gruppenFarbe } from './farben'

interface Props {
  vehicle: Vehicle
  plan: LoadPlan
  gruppen: readonly string[]
  auswahl?: string
  onWaehle: (stueckId: string | undefined) => void
  onVerschiebe: (stueckId: string, position: Vec3) => void
  rasterMm: number
  /** Beschriftung der Öffnungskante. */
  oeffnungText: string
  /** Beschriftung des engsten Schnitts weiter oben. Fehlt er, wird er nicht
   *  gezeichnet — eine Linie ohne Erklärung ist ein Rätsel. */
  engsteText?: string
}

/** Rand um die Ladefläche, in Laderaum-Millimetern. */
const RAND = 40
/**
 * Unten Platz für die Öffnungskante — sie liegt auf dem Rand des Raums und
 * bräuchte sonst keinen.
 *
 * DIE BESCHRIFTUNGEN STEHEN NICHT MEHR IM BILD. Sie standen es im ersten
 * Anlauf, als `<text>` in Laderaum-Millimetern: auf dem Telefon lief der Satz
 * dann aus dem `viewBox` heraus und war rechts abgeschnitten („…stands her").
 * Ein SVG skaliert seinen Text mit, aber es bricht ihn nicht um. Als HTML
 * daneben bricht er um, folgt der Schriftgrösse des Geräts und lässt sich
 * vorlesen.
 */
/** Unten mehr Platz: dort steht die Beschriftung der Öffnungskante. */
const RAND_UNTEN = 60
/**
 * Um soviel wird eine obere Lage eingerückt gezeichnet.
 *
 * Die Draufsicht kennt keine Höhe; zwei Kisten übereinander lägen sonst
 * deckungsgleich, und die untere wäre weg. Die Einrückung ist eine
 * ZEICHENREGEL und keine Position — die echten Koordinaten stehen im Plan.
 */
const LAGEN_VERSATZ = 45

export function Draufsicht({
  vehicle,
  plan,
  gruppen,
  auswahl,
  onWaehle,
  onVerschiebe,
  rasterMm,
  oeffnungText,
  engsteText,
}: Props) {
  const svg = useRef<SVGSVGElement>(null)
  const [zug, setZug] = useState<{ id: string; dx: number; dz: number; x: number; z: number } | null>(null)

  const raum: Vec3 = {
    x: vehicle.cargoMm.widthMm,
    y: vehicle.cargoMm.heightMm,
    z: vehicle.cargoMm.lengthMm,
  }

  // Die Öffnung liegt bei z = lengthMm und gehört nach UNTEN ins Bild: man
  // steht selbst am Heck und schaut hinein, das Fahrzeugende liegt oben.
  // Also wächst y MIT z — und nicht dagegen.
  const bildBreite = raum.x + 2 * RAND
  const bildHoehe = raum.z + RAND + RAND_UNTEN
  const zuBild = (p: { x: number; z: number }) => ({ x: RAND + p.x, y: RAND + p.z })

  /** Bildkoordinaten eines Zeigers in Laderaum-Millimetern. */
  const ausZeiger = (e: React.PointerEvent): { x: number; z: number } | null => {
    const el = svg.current
    if (!el) return null
    const punkt = el.createSVGPoint()
    punkt.x = e.clientX
    punkt.y = e.clientY
    const m = el.getScreenCTM()
    if (!m) return null
    const p = punkt.matrixTransform(m.inverse())
    // Dieselbe Richtung wie `zuBild`: y waechst MIT z.
    return { x: p.x - RAND, z: p.y - RAND }
  }

  /**
   * Der Umriss am Boden und der engste Schnitt darüber.
   *
   * Der engste wird gesucht statt gesetzt: welche Höhe die schmalste ist,
   * hängt von den Kanten ab — beim Transporter die Decke, beim Kofferraum
   * mit Radlauf eine Höhe mittendrin. Eine feste Höhe zu nehmen hiesse zu
   * raten, welche Bauform jemand fährt.
   */
  const { boden, engste } = useMemo(() => {
    const amBoden = konturBeiHoehe(vehicle, 0)
    let schmalste: Punkt2D[] | null = null
    let kleinste = konturFlaeche(amBoden)
    for (const y of konturHoehen(vehicle)) {
      const k = konturBeiHoehe(vehicle, y)
      const f = konturFlaeche(k)
      if (f < kleinste - 1) {
        kleinste = f
        schmalste = k
      }
    }
    return { boden: amBoden, engste: schmalste }
  }, [vehicle])

  const alsPfad = (punkte: readonly Punkt2D[]) =>
    punkte.map((p) => `${RAND + p.x},${RAND + p.z}`).join(' ')

  // Die Öffnungskante ist so breit wie der Boden DORT — bei einem zum Heck
  // verjüngten Raum ist das weniger als die Innenbreite. Eine Linie über die
  // volle Breite zeichnete eine Öffnung, die es nicht gibt.
  const hinten = boden.filter((p) => p.z > raum.z - 1)
  const kanteVon = hinten.length > 0 ? Math.min(...hinten.map((p) => p.x)) : 0
  const kanteBis = hinten.length > 0 ? Math.max(...hinten.map((p) => p.x)) : raum.x

  const raste = (n: number) => (rasterMm > 0 ? Math.round(n / rasterMm) * rasterMm : Math.round(n))

  /** Liegt das gezogene Stück gerade gültig? Dieselben Regeln wie der Packer. */
  const gueltig = (id: string, pos: Vec3): boolean => {
    const p = plan.placements.find((x) => x.stueckId === id)
    if (!p) return false
    const q = quader(pos, p.sizeMm)
    if (!liegtInnerhalb(q, raum)) return false
    if (!quaderFrei(vehicle.kanten, raum, pos, p.sizeMm)) return false
    const andere = [
      ...plan.placements.filter((x) => x.stueckId !== id).map((x) => quader(x.position, x.sizeMm)),
      ...vehicle.obstructions.map((h) => quader(h.originMm, h.sizeMm)),
    ]
    return !andere.some((o) => ueberlappt(q, o))
  }

  const gezogen = zug ? plan.placements.find((p) => p.stueckId === zug.id) : undefined
  const zugGueltig = zug && gezogen ? gueltig(zug.id, { x: zug.x, y: gezogen.position.y, z: zug.z }) : true

  return (
    <figure className="draufsicht-rahmen">
      {engste && engsteText && <p className="draufsicht-legende">{engsteText}</p>}
    <svg
      ref={svg}
      className="draufsicht"
      viewBox={`0 0 ${bildBreite} ${bildHoehe}`}
      role="img"
      onPointerMove={(e) => {
        if (!zug) return
        const p = ausZeiger(e)
        if (!p) return
        setZug({ ...zug, x: raste(p.x - zug.dx), z: raste(p.z - zug.dz) })
      }}
      onPointerUp={() => {
        if (zug && gezogen) {
          onVerschiebe(zug.id, { x: zug.x, y: gezogen.position.y, z: zug.z })
        }
        setZug(null)
      }}
      onPointerLeave={() => setZug(null)}
    >
      {/* Der Laderaum am BODEN — der Umriss und nicht das Rechteck. */}
      <polygon points={alsPfad(boden)} fill="#24405F" stroke="#8C9CB3" strokeWidth={6} />

      {/* Der engste Schnitt weiter oben. Gestrichelt, weil er nichts ist,
          worauf man etwas stellt — er sagt, wie weit es nach oben eng wird. */}
      {engste && engsteText && (
        <>
          <polygon
            points={alsPfad(engste)}
            fill="none"
            stroke="#8C9CB3"
            strokeWidth={5}
            strokeDasharray="60 40"
            opacity={0.8}
          />
        </>
      )}

      {/* Hindernisse */}
      {vehicle.obstructions.map((h, i) => {
        const o = zuBild(h.originMm)
        return (
          <rect
            key={`${h.name}-${i}`}
            x={o.x}
            y={o.y}
            width={h.sizeMm.x}
            height={h.sizeMm.z}
            fill="#8C9CB3"
            fillOpacity={0.5}
          />
        )
      })}

      {/* Gesetzte Stücke. Sortiert nach Höhe, damit obere Lagen oben liegen. */}
      {[...plan.placements]
        .sort((a, b) => a.position.y - b.position.y)
        .map((p) => {
          const aktiv = zug?.id === p.stueckId
          const pos = aktiv && gezogen ? { x: zug.x, y: p.position.y, z: zug.z } : p.position
          const o = zuBild(pos)
          // Obere Lagen eingerückt: sonst deckt die obere die untere zu.
          const ein = p.position.y > 0 ? LAGEN_VERSATZ : 0
          const farbe = gruppenFarbe(p.gruppe, gruppen)
          return (
            <g
              key={p.stueckId}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                const z = ausZeiger(e)
                if (!z) return
                onWaehle(p.stueckId)
                setZug({
                  id: p.stueckId,
                  dx: z.x - p.position.x,
                  dz: z.z - p.position.z,
                  x: p.position.x,
                  z: p.position.z,
                })
              }}
              style={{ cursor: 'grab' }}
            >
              <rect
                x={o.x + ein}
                y={o.y + ein}
                width={Math.max(0, p.sizeMm.x - 2 * ein)}
                height={Math.max(0, p.sizeMm.z - 2 * ein)}
                fill={farbe}
                fillOpacity={p.position.y > 0 ? 0.75 : 0.95}
                stroke={aktiv && !zugGueltig ? '#B2413A' : p.stueckId === auswahl ? '#E1ECEF' : '#132040'}
                strokeWidth={aktiv || p.stueckId === auswahl ? 10 : 4}
              />
              <text
                x={o.x + p.sizeMm.x / 2}
                y={o.y + p.sizeMm.z / 2 + ein}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={Math.max(48, Math.min(p.sizeMm.x, p.sizeMm.z) * 0.22)}
                fill="#132040"
              >
                {p.ladeSchritt}
              </text>
            </g>
          )
        })}

      {/* Die Öffnungskante, beschriftet — sonst weiss niemand, wo vorn ist. */}
      <line
        x1={RAND + kanteVon}
        y1={RAND + raum.z}
        x2={RAND + kanteBis}
        y2={RAND + raum.z}
        stroke="#C8892B"
        strokeWidth={16}
      />
    </svg>
      <p className="draufsicht-oeffnung">{oeffnungText}</p>
    </figure>
  )
}
