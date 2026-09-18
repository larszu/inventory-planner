// ───────────────────────────────────────────────────────────────────────────
// Die 3D-Ladeansicht (#23).
//
// WARUM ES SIE GIBT. Der verkaufte Wert ist SICHTBARKEIT, nicht Optimalität:
// der Laderaum in 3D, bevor der LKW am Dock steht. Eine Tabelle mit
// Koordinaten beantwortet dieselbe Frage und beantwortet sie niemandem.
//
// WAS HIER NICHT RECHNET. Nichts. Der Plan kommt fertig aus
// `domain/lib/loadPacker` — diese Datei zeichnet ihn und nimmt Griffe
// entgegen. Wer hier eine Kollisionsregel ergänzt, hat die zweite Wahrheit
// darüber, ob etwas passt; sie gehört in den Packer, wo ein Test sie sieht.
//
// WARUM `lazy` VON AUSSEN. Three ist gross. In `cable-planner` liegt es nur
// deshalb nicht im Haupt-Chunk, weil die beiden Eintritte `lazy` + `Suspense`
// sind (gemessen: 4.193 → 2.938 kB). Diese Datei wird genauso eingehängt —
// sie ist ein Modul, kein Startbildschirm. Wer sie irgendwo statisch
// importiert, zieht Three in den Start des Lagers.
//
// BEDIENUNG OHNE MITTLERE MAUSTASTE. Am Dock steht ein Laptop mit Trackpad.
// Drehen liegt deshalb auf der linken Taste, Schieben auf der rechten, Zoom
// auf dem Rad — die mittlere Taste wird nirgends gebraucht.
// ───────────────────────────────────────────────────────────────────────────
import { Suspense, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Edges, OrbitControls, TransformControls } from '@react-three/drei'
import * as THREE from 'three'
// Wie ein Stück in der Belade-Ansicht dasteht: der Wortschatz kommt aus
// `domain/lib/beladen` — dieselben drei Rollen, die auch der Lade-Streifen
// zeigt. Eine eigene Fassung hier hiesse, dass „das laufende Stück" in zwei
// Ansichten zwei verschiedene Dinge heissen kann.
import type { LadeRolle } from '../../domain/lib/beladen'
import type { LoadPlan, Placement, Vec3 } from '../../domain/lib/loadPacker'
import type { Vehicle } from '../../domain/types/vehicle'
import { blickAuf, blickAusOeffnung, FOV_GRAD, mm } from './kamera'
import { gruppenFarbe } from './farben'
import { Beschriftung } from './Beschriftung'

interface Props {
  vehicle: Vehicle
  plan: LoadPlan
  gruppen: readonly string[]
  /** Welches Stück gerade am Griff hängt. */
  auswahl?: string
  onWaehle: (stueckId: string | undefined) => void
  /** Ein Stück wurde von Hand abgesetzt — Position in Millimetern. */
  onVerschiebe: (stueckId: string, position: Vec3) => void
  /** Raster in Millimetern, auf das der Griff einrastet. 0 = frei. */
  rasterMm: number
  /**
   * PLANEN oder BELADEN — zwei Ansichten desselben Plans, und der
   * Unterschied ist nicht Kosmetik:
   *
   *   planen   Blick von schräg oben, alles sichtbar, Stücke verschiebbar.
   *            Die Frage ist „was steht wo".
   *   beladen  Blick AUS DER ÖFFNUNG, nur der erreichte Stand plus das
   *            nächste Stück, nichts verschiebbar. Die Frage ist „wo kommt
   *            DAS hier hin" — und jedes Case, das noch nicht dran ist,
   *            steht dieser Frage im Bild im Weg.
   */
  modus: 'planen' | 'beladen'
  /** Welche Stücke schon im Fahrzeug stehen (Belade-Ansicht). */
  geladen?: ReadonlySet<string>
  /** Das Stück, das als Nächstes hineingehört. */
  naechstesId?: string
}

/** Mitte eines Quaders in Metern — Three setzt Boxen über ihren Mittelpunkt. */
const mitte = (pos: Vec3, size: Vec3, raum: Vec3): [number, number, number] => [
  mm(pos.x + size.x / 2 - raum.x / 2),
  mm(pos.y + size.y / 2 - raum.y / 2),
  mm(pos.z + size.z / 2 - raum.z / 2),
]

function Stueck({
  p,
  raum,
  gruppen,
  gewaehlt,
  onWaehle,
  rolle,
}: {
  p: Placement
  raum: Vec3
  gruppen: readonly string[]
  gewaehlt: boolean
  onWaehle: (id: string | undefined) => void
  /** `undefined` heisst Planen — dort gibt es keine Rollen. */
  rolle?: LadeRolle
}) {
  const farbe = gruppenFarbe(p.gruppe, gruppen)
  const [x, y, z] = mitte(p.position, p.sizeMm, raum)

  // Das nächste Stück ist ein ZIEL und kein Bestand: es steht als heller
  // Umriss da, damit man die Lücke sieht und nicht ein Case, das schon drin
  // wäre. Der Unterschied entscheidet, ob jemand zweimal lädt.
  const istZiel = rolle === 'aktuell'
  const deckkraft = istZiel ? 0.28 : rolle === 'geladen' ? 1 : p.verankert ? 1 : 0.85

  return (
    <group position={[x, y, z]}>
      <mesh
        onClick={(e) => {
          e.stopPropagation()
          onWaehle(gewaehlt ? undefined : p.stueckId)
        }}
      >
        <boxGeometry args={[mm(p.sizeMm.x), mm(p.sizeMm.y), mm(p.sizeMm.z)]} />
        {/* Verankerte Stücke stehen voller da: sie sind eine Entscheidung
            eines Menschen und keine Rechnung. */}
        <meshStandardMaterial
          color={istZiel ? '#E8B04B' : farbe}
          opacity={deckkraft}
          transparent={deckkraft < 1}
          roughness={0.7}
        />
        <Edges threshold={15} color={istZiel ? '#E8B04B' : gewaehlt ? '#E1ECEF' : '#132040'} />
      </mesh>
      {/* Die Beschriftung liegt auf der Oberseite und nicht an der Flanke:
          von schräg oben ist das die Fläche, die man sieht. */}
      <Beschriftung
        text={`${p.ladeSchritt}  ${p.label}`}
        breiteM={mm(p.sizeMm.x) * 0.92}
        hoeheM={mm(p.sizeMm.z) * 0.92}
        position={[0, mm(p.sizeMm.y / 2) + 0.005, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
    </group>
  )
}

function Szene({
  vehicle,
  plan,
  gruppen,
  auswahl,
  onWaehle,
  onVerschiebe,
  rasterMm,
  modus,
  geladen,
  naechstesId,
}: Props) {
  const raum: Vec3 = {
    x: vehicle.cargoMm.widthMm,
    y: vehicle.cargoMm.heightMm,
    z: vehicle.cargoMm.lengthMm,
  }
  // Der Griff als ZUSTAND und nicht als Ref: `TransformControls` braucht das
  // Objekt beim Rendern, und eine Ref ist beim ersten Durchlauf noch leer.
  const [griff, setGriff] = useState<THREE.Group | null>(null)
  const [zieht, setZieht] = useState(false)
  const gewaehlt = plan.placements.find((p) => p.stueckId === auswahl)

  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[3, 6, 4]} intensity={1.1} />

      {/* Der Laderaum als Drahtkasten — eine Wand aus Flächen würde die
          Sicht in die Kiste nehmen, um die es geht. */}
      <mesh>
        <boxGeometry args={[mm(raum.x), mm(raum.y), mm(raum.z)]} />
        <meshBasicMaterial visible={false} />
        <Edges threshold={15} color="#8C9CB3" />
      </mesh>

      {/* Ladefläche */}
      <mesh position={[0, -mm(raum.y) / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[mm(raum.x), mm(raum.z)]} />
        <meshStandardMaterial color="#24405F" />
      </mesh>

      {/* Die Öffnung liegt bei z = lengthMm (siehe `loadPacker/typen.ts`) und
          wird markiert: ohne sie sieht niemand, wo vorn ist.

          BEIM BELADEN NICHT: dort steht die Kamera davor, und die Fläche läge
          zwischen Auge und Ladung — sie hat im ersten Anlauf den ganzen
          Innenraum abgedunkelt. Wer am Heck steht, braucht die Markierung
          ohnehin nicht; er steht darin. */}
      {modus === 'planen' && vehicle.aperture && (
        <mesh position={[0, mm(vehicle.aperture.heightMm / 2) - mm(raum.y) / 2, mm(raum.z) / 2 + 0.002]}>
          <planeGeometry args={[mm(vehicle.aperture.widthMm), mm(vehicle.aperture.heightMm)]} />
          <meshBasicMaterial color="#C8892B" transparent opacity={0.18} side={THREE.DoubleSide} />
        </mesh>
      )}

      {vehicle.obstructions.map((h, i) => {
        const [x, y, z] = mitte(h.originMm, h.sizeMm, raum)
        return (
          <mesh key={`${h.name}-${i}`} position={[x, y, z]}>
            <boxGeometry args={[mm(h.sizeMm.x), mm(h.sizeMm.y), mm(h.sizeMm.z)]} />
            <meshStandardMaterial color="#8C9CB3" opacity={0.55} transparent />
          </mesh>
        )
      })}

      {plan.placements
        .filter((p) => {
          if (modus === 'planen') return true
          // Beim Laden bleibt weg, was weder steht noch dran ist. Ein Bild,
          // das den ganzen Plan zeigt, beantwortet die Frage am Heck nicht —
          // es verdeckt sie.
          return geladen?.has(p.stueckId) || p.stueckId === naechstesId
        })
        .map((p) => (
          <Stueck
            key={p.stueckId}
            p={p}
            raum={raum}
            gruppen={gruppen}
            gewaehlt={p.stueckId === auswahl}
            onWaehle={onWaehle}
            rolle={
              modus === 'planen'
                ? undefined
                : geladen?.has(p.stueckId)
                  ? 'geladen'
                  : p.stueckId === naechstesId
                    ? 'aktuell'
                    : 'offen'
            }
          />
        ))}

      {/* Der Griff hängt an einer eigenen, unsichtbaren Gruppe und nicht am
          Stück selbst: `TransformControls` verschiebt das Objekt, an dem es
          hängt, sofort — die Wahrheit über die Position steht aber im Plan.
          Erst beim Loslassen wandert sie dorthin zurück. */}
      {modus === 'planen' && gewaehlt && (
        <>
          {/* `key` auf die Stück-Id: bei einem Wechsel der Auswahl wird die
              Gruppe neu gebaut und steht damit an der richtigen Stelle,
              statt die Position der vorigen zu behalten. */}
          <group
            key={gewaehlt.stueckId}
            ref={setGriff}
            position={mitte(gewaehlt.position, gewaehlt.sizeMm, raum)}
          />
          {griff && (
          <TransformControls
            object={griff}
            mode="translate"
            showY={false}
            translationSnap={rasterMm > 0 ? mm(rasterMm) : null}
            onMouseDown={() => setZieht(true)}
            onMouseUp={() => {
              setZieht(false)
              onVerschiebe(gewaehlt.stueckId, {
                x: Math.round((griff.position.x + mm(raum.x) / 2) * 1000 - gewaehlt.sizeMm.x / 2),
                y: gewaehlt.position.y,
                z: Math.round((griff.position.z + mm(raum.z) / 2) * 1000 - gewaehlt.sizeMm.z / 2),
              })
            }}
          />
          )}
        </>
      )}

      <OrbitControls
        makeDefault
        enabled={!zieht}
        target={[0, 0, 0]}
        // Ohne mittlere Taste bedienbar: drehen links, schieben rechts, Zoom
        // auf dem Rad.
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
      />
    </>
  )
}

export default function Ladeansicht3D(props: Props) {
  const { vehicle, modus } = props
  const blick = useMemo(() => {
    const l = mm(vehicle.cargoMm.lengthMm)
    const b = mm(vehicle.cargoMm.widthMm)
    const h = mm(vehicle.cargoMm.heightMm)
    return modus === 'beladen' ? blickAusOeffnung(l, b, h) : blickAuf(l, b, h)
  }, [modus, vehicle.cargoMm.lengthMm, vehicle.cargoMm.widthMm, vehicle.cargoMm.heightMm])

  return (
    <div className="ladeansicht-3d">
      <Canvas
        // `key` auf den Modus: ein Wechsel baut die Kamera neu auf, statt die
        // Stellung der vorigen Ansicht zu behalten. Ohne das steht man beim
        // Umschalten auf „Beladen" weiter schräg über der Kiste.
        key={modus}
        camera={{ position: blick.position, fov: FOV_GRAD, near: 0.05, far: 200 }}
        onPointerMissed={() => props.onWaehle(undefined)}
      >
        <color attach="background" args={['#132040']} />
        <Suspense fallback={null}>
          <Szene {...props} />
        </Suspense>
      </Canvas>
    </div>
  )
}
