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
// Ziehen ist `platzUrteil` aus `domain/lib/platzGueltig` — dieselbe Funktion,
// die auch die 3D-Ansicht am Griff fragt. Sie stand zuerst HIER, als lokales
// `gueltig()`: die 3D-Ansicht liess deshalb jede Lage zu und sagte dazu
// nichts. Eine eigene Kollisionsrechnung in einer Ansicht wäre die zweite
// Wahrheit darüber, ob etwas passt — und sie würde irgendwann anders
// antworten als der Plan, den sie zeichnet.
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
import { useT } from '../../i18n'
import type { LoadPlan, Vec3 } from '../../domain/lib/loadPacker'
import { platzUrteil, platzUrteilText } from '../../domain/lib/platzGueltig'
import {
  konturBeiHoehe,
  konturFlaeche,
  konturHoehen,
  type Punkt2D,
} from '../../domain/lib/kontur'
import type { Vehicle } from '../../domain/types/vehicle'
import { gruppenFarbe } from '../../domain/lib/gruppenFarben'

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
  /**
   * Das Packmass-Raster des Fahrzeugs in mm (#21). 0 = keines.
   *
   * Es wird als feine Längslinie je Rasterbreite gezeichnet — das Raster
   * teilt QUER —, und das ist die Antwort auf „welches Stück sitzt im
   * Raster": man sieht es, statt es zu lesen. Es ist NICHT dasselbe wie
   * `rasterMm`, das den Finger beim Ziehen einrastet.
   */
  gitterMm?: number
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
  gitterMm = 0,
}: Props) {
  const { t } = useT()
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

  const gezogen = zug ? plan.placements.find((p) => p.stueckId === zug.id) : undefined
  const urteil =
    zug && gezogen
      ? platzUrteil(vehicle, plan, zug.id, { x: zug.x, y: gezogen.position.y, z: zug.z })
      : null
  const zugGueltig = urteil ? urteil.gueltig : true

  return (
    <figure className="draufsicht-rahmen">
      {engste && engsteText && <p className="draufsicht-legende">{engsteText}</p>}
      {/* Der Grund, SOLANGE gezogen wird — nicht erst beim Nachrechnen (#23).
          Ein roter Rahmen allein sagt „geht nicht" und lässt den Menschen
          raten, ob es die Wand, die Rundung oder die Nachbarkiste ist.
          Die Zeile trägt auch die gültige Auskunft „X rückt zur Seite"; rot
          wird sie nur, wenn die Lage wirklich nicht geht. */}
      <p className={urteil && !urteil.gueltig ? 'draufsicht-urteil ungueltig' : 'draufsicht-urteil'} role="status">
        {urteil ? platzUrteilText(urteil, t) : ''}
      </p>
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

      {/* Das Packmass-Raster, fein und leise: es ist ein Hintergrund und
          keine Aussage. Wer eine Kiste darauf stehen sieht, hat die Antwort
          auf „sitzt sie in der Reihe" ohne ein Wort.

          NUR LÄNGSLINIEN, weil das Raster quer teilt: die Reihe läuft quer
          durchs Fahrzeug, in der Länge läuft sie durch. Ein Netz zeichnete
          eine Teilung, nach der der Packer gar nicht setzt. */}
      {gitterMm > 0 && (
        <g stroke="#8C9CB3" strokeWidth={3} opacity={0.5}>
          {/* Eine Linie WENIGER als Teilungen: die letzte läge auf der Wand,
              und eine Linie auf der Wand teilt nichts. */}
          {Array.from({ length: Math.ceil(raum.x / gitterMm) - 1 }, (_, i) => (
            <line
              key={`gx${i}`}
              x1={RAND + (i + 1) * gitterMm}
              y1={RAND}
              x2={RAND + (i + 1) * gitterMm}
              y2={RAND + raum.z}
            />
          ))}
        </g>
      )}

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
                // Gefahr-Ton und NICHT Tally-Rot: das Rot dieser Zeichnung gehört
                // der Öffnungskante, und zwei rote Dinge im selben Bild nehmen
                // beiden den Rang (Handbuch, ADR-007).
                stroke={aktiv && !zugGueltig ? '#B04A3F' : p.stueckId === auswahl ? '#E1ECEF' : '#132040'}
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
      {/* ── DIE ÖFFNUNGSKANTE TRÄGT DAS SIGNAL ────────────────────────────
          Tally-Rot, und zwar als LINIE: das Handbuch erlaubt die rote
          Akzentlinie und verbietet die rote Fläche. Hier stand `--warn`, und
          das war falsch — die Meldefarben gehören Formularmeldungen, nicht
          der wichtigsten Orientierungsmarke des Bildes.

          Es ist das einzige Rot dieser Zeichnung. Die 3D-Ansicht markiert
          dieselbe Kante mit einer hellen Linie statt mit einem zweiten
          Punkt: sie ist die zugeschaltete, zweite Abbildung, und zwei
          Signale für dieselbe Aussage nehmen beiden den Rang. */}
      <line
        x1={RAND + kanteVon}
        y1={RAND + raum.z}
        x2={RAND + kanteBis}
        y2={RAND + raum.z}
        stroke="#D6402E"
        strokeWidth={16}
      />
    </svg>
      <p className="draufsicht-oeffnung">{oeffnungText}</p>
    </figure>
  )
}
