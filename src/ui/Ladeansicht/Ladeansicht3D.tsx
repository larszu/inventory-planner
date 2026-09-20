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
import { useT } from '../../i18n'
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
import { konturBeiHoehe, konturHoehen, punktFrei, raumMasse, type Punkt2D } from '../../domain/lib/kontur'
// Ob ein Stück HIER stehen darf, beantwortet `platzUrteil` — dieselbe
// Funktion, die auch die Draufsicht beim Ziehen mit dem Finger fragt. Sie
// stand einmal nur dort, und deshalb liess diese Ansicht jede Lage zu.
import { platzUrteil, platzUrteilText, type PlatzUrteil } from '../../domain/lib/platzGueltig'
import { schwerpunkt } from '../../domain/lib/lastverteilung'
import { blickAuf, blickAusOeffnung, FOV_GRAD, mm } from './kamera'
import { gruppenFarbe } from '../../domain/lib/gruppenFarben'
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
  /**
   * Ein EINBAU wurde verschoben (Nutzer-Wunsch 2026-09-19: „3d Laderaum
   * anpassen"). Fehlt der Rückweg, bleiben die Einbauten unbeweglich —
   * die Ansicht wird dann nicht heimlich zur Bearbeitung.
   *
   * Nur x und z: die HÖHE eines Einbaus wird gemessen und nicht geschoben.
   * Ein Radkasten, den jemand in der 3D-Ansicht auf 40 cm zieht, trüge
   * danach eine Zahl, die wie ein Messwert aussieht.
   */
  onEinbauVerschiebe?: (index: number, originMm: Vec3) => void
  /** Raster in Millimetern, auf das der Griff einrastet. 0 = frei. */
  rasterMm: number
  /**
   * Gesperrte Achsen (#23). `true` heisst: diese Richtung ist am Griff frei.
   *
   * Y fehlt mit Absicht und ist keine dritte Sperre: die Höhe eines Stücks
   * ist gestapelt und nicht gezogen — sie kommt aus dem Packer. Ein Griff,
   * der ein Case in die Luft hebt, stellte eine Lage her, die am Dock
   * niemand nachbauen kann.
   */
  freiX?: boolean
  freiZ?: boolean
  /** Meldet die Lage des Griffs, solange gezogen wird. */
  onUrteil?: (urteil: PlatzUrteil | null) => void
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

/**
 * Die Farbe des Stücks, das ALS NÄCHSTES an seinen Platz kommt.
 *
 * Off-White und nicht der Bernstein, der hier stand: `#E8B04B` ist der erste
 * Ton der Gruppen-Palette („Sand"). Gehört das nächste Stück zur ersten
 * Gruppe, war der Geist damit exakt so eingefärbt wie die Kisten, von denen
 * er sich abheben soll — gesehen hätte man das erst am Dock.
 *
 * Off-White ist ausserdem die richtige Antwort nach dem Handbuch: Struktur
 * entsteht durch die Linie, Bedeutung durch den Punkt. Der Punkt steht auf
 * der Karte darüber; hier trägt die helle Kante.
 */
const ZIEL_FARBE = '#F6F5F0'

function Stueck({
  p,
  raum,
  gruppen,
  gewaehlt,
  onWaehle,
  rolle,
  ungueltig,
}: {
  p: Placement
  raum: Vec3
  gruppen: readonly string[]
  gewaehlt: boolean
  onWaehle: (id: string | undefined) => void
  /** `undefined` heisst Planen — dort gibt es keine Rollen. */
  rolle?: LadeRolle
  /** Hängt gerade am Griff und stünde so nicht (#23). */
  ungueltig?: boolean
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
          color={istZiel ? ZIEL_FARBE : farbe}
          opacity={deckkraft}
          transparent={deckkraft < 1}
          roughness={0.7}
        />
        {/* Gefahr-Ton und nicht Tally-Rot: das Rot der Ladeansicht gehört der
            Öffnung, und ein zweites Rot im selben Bild nähme beiden den Rang
            (ADR-007). Die Kante trägt es, nicht die Fläche. */}
        <Edges
          threshold={15}
          color={ungueltig ? '#B04A3F' : istZiel ? ZIEL_FARBE : gewaehlt ? '#E1ECEF' : '#132040'}
        />
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

/**
 * Der Laderaum als Drahtmodell — mit seinen echten Kanten.
 *
 * ─── WARUM HÖHENRINGE UND KEIN QUADER ──────────────────────────────────────
 *
 * Ein Laderaum ist selten eine Schachtel: die Dachkante ist gerundet, die
 * Wände laufen zusammen, der Kofferraum verjüngt sich zum Heck. Gezeichnet
 * wird deshalb, was `konturBeiHoehe` auf mehreren Höhen ausrechnet — dieselbe
 * Rechnung, die auch die Draufsicht zeigt und nach der der Packer packt.
 *
 * Ohne eingetragene Kanten gibt `konturHoehen` genau zwei Höhen zurück,
 * Boden und Decke, und vier senkrechte Linien verbinden sie: dann steht hier
 * exakt der Drahtkasten, der vorher hier stand. Der allgemeine Fall fällt auf
 * den einfachen zurück, statt ihn zu ersetzen.
 *
 * ─── WARUM DRAHT UND KEINE WÄNDE ───────────────────────────────────────────
 *
 * Eine geschlossene Fläche nähme die Sicht in die Kiste, um die es geht. Das
 * galt schon für den Quader und gilt für die Rundung erst recht.
 */
function Laderaum({ vehicle }: { vehicle: Vehicle }) {
  const { ringe, senkrechte, boden, raum } = useMemo(() => {
    const raum = raumMasse(vehicle)
    const hoehen = konturHoehen(vehicle)
    const konturen = hoehen.map((y) => ({ y, punkte: konturBeiHoehe(vehicle, y) }))
    const alsWelt = (p: Punkt2D, y: number): [number, number, number] => [
      mm(p.x) - mm(raum.x) / 2,
      mm(y) - mm(raum.y) / 2,
      mm(p.z) - mm(raum.z) / 2,
    ]

    const linien: number[] = []
    for (const { y, punkte } of konturen) {
      for (let i = 0; i < punkte.length; i += 1) {
        linien.push(...alsWelt(punkte[i]!, y), ...alsWelt(punkte[(i + 1) % punkte.length]!, y))
      }
    }

    // Senkrechte an den Ecken des Bodens — aber nur so weit hinauf, wie diese
    // Stelle frei bleibt. Eine Linie, die durch die gerundete Dachkante nach
    // draussen läuft, zeichnete einen Raum, den es nicht gibt.
    const senkrecht: number[] = []
    for (const p of konturen[0]?.punkte ?? []) {
      let oben = 0
      for (const y of hoehen) {
        if (!punktFrei(vehicle.kanten, raum, { x: p.x, y, z: p.z })) break
        oben = y
      }
      if (oben > 0) senkrecht.push(...alsWelt(p, 0), ...alsWelt(p, oben))
    }

    const form = new THREE.Shape(
      (konturen[0]?.punkte ?? []).map(
        (p) => new THREE.Vector2(mm(p.x) - mm(raum.x) / 2, mm(raum.z) / 2 - mm(p.z)),
      ),
    )
    return { ringe: new Float32Array(linien), senkrechte: new Float32Array(senkrecht), boden: form, raum }
  }, [vehicle])

  return (
    <>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[ringe, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#8C9CB3" />
      </lineSegments>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[senkrechte, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#8C9CB3" />
      </lineSegments>

      {/* Ladefläche — in der Form des Bodens und nicht als Rechteck. */}
      <mesh position={[0, -mm(raum.y) / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <shapeGeometry args={[boden]} />
        <meshStandardMaterial color="#24405F" side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}

/**
 * Der Schwerpunkt der Ladung als Marke (#24).
 *
 * ─── EIN LOT UND KEINE KUGEL ───────────────────────────────────────────────
 *
 * Gezeichnet wird ein senkrechtes Lot vom Schwerpunkt auf die Ladefläche plus
 * ein Kreuz dort, wo es auftrifft. Eine Kugel mitten im Raum sagt nichts über
 * die Frage, die jemand hat — die lautet „liegt er zwischen den Achsen und in
 * der Mitte", und das ist eine Frage an den BODEN. Die Höhe steht daneben im
 * Text; sie entscheidet über Kippen, nicht über Achslast.
 *
 * ─── UND ER STEHT NICHT DA, WENN ER NICHT BEKANNT IST ──────────────────────
 *
 * Kein Stück gewogen, keine Marke. Eine Marke aus den halben Gewichten stünde
 * an einer Stelle, an der der Schwerpunkt nicht liegt — und sie sähe genauso
 * aus wie eine, die stimmt.
 */
function Schwerpunktmarke({ plan, raum }: { plan: LoadPlan; raum: Vec3 }) {
  const sp = useMemo(() => schwerpunkt(plan), [plan])
  if (!sp.bekannt) return null

  const x = mm(sp.wert.xMm) - mm(raum.x) / 2
  const z = mm(sp.wert.zMm) - mm(raum.z) / 2
  const boden = -mm(raum.y) / 2
  const oben = boden + mm(sp.wert.yMm)
  const arm = 0.12

  const linien = new Float32Array([
    x, boden, z, x, oben, z,
    x - arm, boden, z, x + arm, boden, z,
    x, boden, z - arm, x, boden, z + arm,
  ])

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[linien, 3]} />
      </bufferGeometry>
      {/* Off-White wie die Zielmarke: die Linie trägt, nicht die Farbe. Rot
          gehört der Öffnung, und ein zweiter Punkt nähme beiden den Rang. */}
      <lineBasicMaterial color="#F6F5F0" />
    </lineSegments>
  )
}

function Szene({
  vehicle,
  plan,
  gruppen,
  auswahl,
  onWaehle,
  onVerschiebe,
  onEinbauVerschiebe,
  rasterMm,
  modus,
  geladen,
  naechstesId,
  freiX = true,
  freiZ = true,
  onUrteil,
}: Props) {
  const raum: Vec3 = {
    x: vehicle.cargoMm.widthMm,
    y: vehicle.cargoMm.heightMm,
    z: vehicle.cargoMm.lengthMm,
  }
  // Der Griff als ZUSTAND und nicht als Ref: `TransformControls` braucht das
  // Objekt beim Rendern, und eine Ref ist beim ersten Durchlauf noch leer.
  const [griff, setGriff] = useState<THREE.Group | null>(null)
  // Der Griff des EINBAUS ist ein eigener: zwei Griffe an einem Objekt
  // hingen übereinander, und ein gemeinsamer Zustand liesse die Auswahl
  // zwischen Kiste und Radkasten hin- und herspringen.
  const [einbauGriff, setEinbauGriff] = useState<THREE.Group | null>(null)
  const [einbauAuswahl, setEinbauAuswahl] = useState<number | null>(null)
  const [zieht, setZieht] = useState(false)
  const [urteil, setUrteil] = useState<PlatzUrteil | null>(null)
  const gewaehlt = plan.placements.find((p) => p.stueckId === auswahl)

  /** Wo das Stück am Griff gerade stünde — in Laderaum-Millimetern. */
  const amGriff = (g: THREE.Group, p: Placement): Vec3 => ({
    x: Math.round((g.position.x + mm(raum.x) / 2) * 1000 - p.sizeMm.x / 2),
    y: p.position.y,
    z: Math.round((g.position.z + mm(raum.z) / 2) * 1000 - p.sizeMm.z / 2),
  })

  const einbau =
    einbauAuswahl === null ? undefined : vehicle.obstructions[einbauAuswahl]

  /** Wo der Einbau am Griff gerade stünde — in Laderaum-Millimetern. */
  const amEinbauGriff = (g: THREE.Group, h: { originMm: Vec3; sizeMm: Vec3 }): Vec3 => ({
    x: Math.round((g.position.x + mm(raum.x) / 2) * 1000 - h.sizeMm.x / 2),
    y: h.originMm.y,
    z: Math.round((g.position.z + mm(raum.z) / 2) * 1000 - h.sizeMm.z / 2),
  })

  const melde = (u: PlatzUrteil | null) => {
    setUrteil(u)
    onUrteil?.(u)
  }

  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[3, 6, 4]} intensity={1.1} />

      <Laderaum vehicle={vehicle} />

      <Schwerpunktmarke plan={plan} raum={raum} />

      {/* Die Öffnung liegt bei z = lengthMm (siehe `loadPacker/typen.ts`) und
          wird markiert: ohne sie sieht niemand, wo vorn ist.

          BEIM BELADEN NICHT: dort steht die Kamera davor, und die Fläche läge
          zwischen Auge und Ladung — sie hat im ersten Anlauf den ganzen
          Innenraum abgedunkelt. Wer am Heck steht, braucht die Markierung
          ohnehin nicht; er steht darin. */}
      {modus === 'planen' && vehicle.aperture && (
        <mesh position={[0, mm(vehicle.aperture.heightMm / 2) - mm(raum.y) / 2, mm(raum.z) / 2 + 0.002]}>
          <planeGeometry args={[mm(vehicle.aperture.widthMm), mm(vehicle.aperture.heightMm)]} />
          {/* Eine LINIE und keine getönte Scheibe. Die Scheibe war doppelt
              falsch: sie lag in `--warn`, einer Meldefarbe, und sie war eine
              FLÄCHE vor der Ladung — im ersten Anlauf hat sie den ganzen
              Innenraum abgedunkelt. Der Rahmen sagt dasselbe und nimmt
              nichts weg. Das Signal für die Öffnung trägt die Draufsicht. */}
          <meshBasicMaterial visible={false} />
          <Edges threshold={15} color="#F6F5F0" />
        </mesh>
      )}

      {vehicle.obstructions.map((h, i) => {
        const [x, y, z] = mitte(h.originMm, h.sizeMm, raum)
        const waehlbar = modus === 'planen' && !!onEinbauVerschiebe
        return (
          <mesh
            key={`${h.name}-${i}`}
            position={[x, y, z]}
            onClick={
              waehlbar
                ? (e) => {
                    e.stopPropagation()
                    setEinbauAuswahl(einbauAuswahl === i ? null : i)
                  }
                : undefined
            }
          >
            <boxGeometry args={[mm(h.sizeMm.x), mm(h.sizeMm.y), mm(h.sizeMm.z)]} />
            <meshStandardMaterial
              color="#8C9CB3"
              opacity={einbauAuswahl === i ? 0.8 : 0.55}
              transparent
            />
            {einbauAuswahl === i && <Edges threshold={15} color="#F6F5F0" />}
          </mesh>
        )
      })}

      {/* Der Griff am Einbau — dieselbe Mechanik wie am Stück: eine eigene,
          unsichtbare Gruppe, und die Wahrheit wandert erst beim Loslassen in
          das Fahrzeug zurück. */}
      {modus === 'planen' && onEinbauVerschiebe && einbauAuswahl !== null && einbau && (
        <>
          <group
            key={`einbau-${einbauAuswahl}`}
            ref={setEinbauGriff}
            position={mitte(einbau.originMm, einbau.sizeMm, raum)}
          />
          {einbauGriff && (
            <TransformControls
              object={einbauGriff}
              mode="translate"
              // Wie am Stück: X und Z. Die Höhe wird gemessen und nicht
              // geschoben — sie hängt am Aufbau, nicht am Augenmass.
              showX={freiX}
              showZ={freiZ}
              showY={false}
              translationSnap={rasterMm > 0 ? mm(rasterMm) : null}
              onMouseDown={() => setZieht(true)}
              onMouseUp={() => {
                setZieht(false)
                onEinbauVerschiebe(einbauAuswahl, amEinbauGriff(einbauGriff, einbau))
              }}
            />
          )}
        </>
      )}

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
            ungueltig={p.stueckId === auswahl && urteil !== null && !urteil.gueltig}
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
            // Y ist keine Sperre, sondern gibt es nicht: die Höhe stapelt der
            // Packer. X und Z sperrt der Mensch (#23) — wer eine Kiste nur
            // nach hinten schieben will, stösst sie sonst nebenbei zur Seite.
            showX={freiX}
            showZ={freiZ}
            showY={false}
            translationSnap={rasterMm > 0 ? mm(rasterMm) : null}
            onMouseDown={() => setZieht(true)}
            // SOFORT und nicht erst beim Loslassen (#23): sonst sieht man am
            // Griff keinen Unterschied zwischen einer Stelle, an der das Case
            // steht, und einer, an der es in der Nachbarkiste steckt.
            onObjectChange={() =>
              melde(platzUrteil(vehicle, plan, gewaehlt.stueckId, amGriff(griff, gewaehlt)))
            }
            onMouseUp={() => {
              setZieht(false)
              melde(null)
              onVerschiebe(gewaehlt.stueckId, amGriff(griff, gewaehlt))
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
  const { t } = useT()
  /**
   * Die Achsensperren liegen HIER und nicht in der Szene: die Schalter stehen
   * als HTML über dem Bild, und ein Zustand in der Szene wäre für sie nicht
   * erreichbar. Ausserdem überlebt er so das Neuaufbauen der Kamera beim
   * Moduswechsel — wer quer gesperrt hat, hat es danach immer noch.
   */
  const [freiX, setFreiX] = useState(true)
  const [freiZ, setFreiZ] = useState(true)
  const [urteil, setUrteil] = useState<PlatzUrteil | null>(null)
  const blick = useMemo(() => {
    const l = mm(vehicle.cargoMm.lengthMm)
    const b = mm(vehicle.cargoMm.widthMm)
    const h = mm(vehicle.cargoMm.heightMm)
    return modus === 'beladen' ? blickAusOeffnung(l, b, h) : blickAuf(l, b, h)
  }, [modus, vehicle.cargoMm.lengthMm, vehicle.cargoMm.widthMm, vehicle.cargoMm.heightMm])

  return (
    <div className="ladeansicht-3d">
      {modus === 'planen' && (
        <div className="ladeansicht-achsen" role="group" aria-label={t('plan.axes', 'Drag axes')}>
          <button
            type="button"
            className={freiX ? 'reiter aktiv' : 'reiter'}
            aria-pressed={freiX}
            onClick={() => setFreiX((f) => !f)}
          >
            {t('plan.axisX', 'Across')}
          </button>
          <button
            type="button"
            className={freiZ ? 'reiter aktiv' : 'reiter'}
            aria-pressed={freiZ}
            onClick={() => setFreiZ((f) => !f)}
          >
            {t('plan.axisZ', 'Lengthwise')}
          </button>
        </div>
      )}
      {/* Der Grund, solange gezogen wird. Er steht als HTML NEBEN dem Bild und
          nicht darin: ein Satz in der Szene skalierte mit der Kamera und wäre
          auf dem Telefon abgeschnitten. */}
      <p
        className={urteil && !urteil.gueltig ? 'ladeansicht-urteil ungueltig' : 'ladeansicht-urteil'}
        role="status"
      >
        {urteil ? platzUrteilText(urteil, t) : ''}
      </p>
      <Canvas
        className="ladeansicht-leinwand"
        // `key` auf den Modus: ein Wechsel baut die Kamera neu auf, statt die
        // Stellung der vorigen Ansicht zu behalten. Ohne das steht man beim
        // Umschalten auf „Beladen" weiter schräg über der Kiste.
        key={modus}
        camera={{ position: blick.position, fov: FOV_GRAD, near: 0.05, far: 200 }}
        onPointerMissed={() => props.onWaehle(undefined)}
      >
        <color attach="background" args={['#132040']} />
        <Suspense fallback={null}>
          <Szene {...props} freiX={freiX} freiZ={freiZ} onUrteil={setUrteil} />
        </Suspense>
      </Canvas>
    </div>
  )
}
