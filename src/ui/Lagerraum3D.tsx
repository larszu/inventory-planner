// ───────────────────────────────────────────────────────────────────────────
// Das Lager im Raum — dieselben Regale, von der Seite.
//
// ─── WAS DER GRUNDRISS NICHT BEANTWORTET ───────────────────────────────────
//
// Wie hoch es wird. Ein Regal mit vier Ebenen ist im Grundriss dasselbe
// Rechteck wie eines mit einer; erst im Raum sieht man, dass die oberste
// Ebene über Kopf liegt und dass zwischen Regal und Decke nichts mehr passt.
// Das ist die Frage, für die es diese Ansicht gibt — und sie ist die einzige
// zusätzliche Aussage, die sie macht.
//
// ─── SIE LIEST DIESELBEN KNOTEN UND SCHREIBT NICHTS ────────────────────────
//
// Der Grundriss schreibt `stellplatz`, diese Ansicht liest ihn. Ein zweiter
// Schreibweg wäre eine zweite Stelle, an der eine Lage entsteht — und dann
// stünde dasselbe Regal in zwei Ansichten verschieden.
//
// ─── DIE EBENEN SIND LINIEN UND KEINE KÖRPER ───────────────────────────────
//
// Ein Fachboden ist ein Brett, kein Klotz. Als Fläche gezeichnet nähme er
// die Sicht auf das, was darin steht, und genau das ist der Sinn der
// Ansicht. Struktur entsteht durch die Linie — dieselbe Regel, nach der der
// Laderaum ein Drahtmodell ist.
// ───────────────────────────────────────────────────────────────────────────
import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Edges, OrbitControls } from '@react-three/drei'
import { useT } from '../i18n'
import { useInventoryStore } from '../domain/store/inventoryStore'
import { itemsInNode } from '../domain/lib/storageTree'
import { hallenUmriss } from '../domain/lib/hallenumriss'
import type { StorageNode } from '../domain/types/inventory'

/** Millimeter zu Metern — dieselbe Umrechnung wie in der Ladeansicht. */
const mm = (n: number): number => n / 1000

/** Ohne Höhenangabe wird nichts aufgebaut: geraten wird hier nicht. */
const REGAL_FARBE = '#E1ECEF'

interface Props {
  beschriftung: (n: StorageNode) => string
}

export default function Lagerraum3D({ beschriftung }: Props) {
  const { t, format } = useT()
  const nodes = useInventoryStore((s) => s.nodes)
  const items = useInventoryStore((s) => s.items)

  const gestellt = useMemo(() => nodes.filter((n) => n.stellplatz), [nodes])
  const ohneHoehe = gestellt.filter((n) => !n.stellplatz!.hoeheMm)

  /**
   * Die Halle — dieselbe Rechnung, die auch der Grundriss zeichnet.
   *
   * Sie stand hier zuerst als eigene Hüllen-Rechnung mit zwei Metern Luft.
   * Im Bild war der Boden dadurch grösser als der Umriss im Grundriss, und
   * beide behaupteten, dieselbe Halle zu meinen.
   */
  const halle = useMemo(() => hallenUmriss(nodes), [nodes])
  const mitte = useMemo(() => {
    if (!halle) return null
    return {
      x: halle.xMm + halle.breiteMm / 2,
      z: halle.zMm + halle.tiefeMm / 2,
      breite: halle.breiteMm,
      tiefe: halle.tiefeMm,
    }
  }, [halle])

  if (!mitte) {
    return (
      <p className="hinweis">
        {t('room.empty', 'Nothing is on the plan yet — there is nothing to stand up in 3D.')}
      </p>
    )
  }

  const weite = mm(Math.max(mitte.breite, mitte.tiefe, 4000))

  return (
    <>
      {ohneHoehe.length > 0 && (
        <p className="leise">
          {format(
            t(
              'room.noHeight',
              'Without a recorded height: {n}. Those are drawn flat — nothing is guessed here.',
            ),
            { n: ohneHoehe.length },
          )}
        </p>
      )}
      <div className="ladeansicht-3d">
        <Canvas camera={{ position: [weite * 0.9, weite * 0.7, weite * 0.9], fov: 45 }}>
          <ambientLight intensity={0.85} />
          <directionalLight position={[3, 6, 4]} intensity={1.1} />

          {/* Der Hallenboden. Er ist so gross wie das, was darauf steht — eine
              Vorgabe-Halle waere eine Angabe ueber ein Gebaeude, das niemand
              vermessen hat. */}
          <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[mm(mitte.breite), mm(mitte.tiefe)]} />
            <meshStandardMaterial color="#24405F" />
          </mesh>

          {gestellt.map((n) => {
            const s = n.stellplatz!
            const hoehe = s.hoeheMm ?? 0
            const x = mm(s.xMm + s.breiteMm / 2 - mitte.x)
            const z = mm(s.zMm + s.tiefeMm / 2 - mitte.z)
            const voll = itemsInNode(items, nodes, n.id, { recursive: true }).length > 0
            const ebenen = s.ebenen ?? 0
            // Welche Ebene trägt etwas? Die Ebenen sind Kinder des Regals,
            // nach ihrer Kennung sortiert — dieselbe Reihenfolge, in der sie
            // angelegt wurden, also von unten nach oben.
            const ebenenKnoten = nodes
              .filter((k) => k.parentId === n.id)
              .sort((a, b) => (a.code ?? a.name).localeCompare(b.code ?? b.name))
            const belegt = new Set(
              ebenenKnoten
                .map((k, i) => (itemsInNode(items, nodes, k.id, { recursive: true }).length > 0 ? i : -1))
                .filter((i) => i >= 0),
            )

            if (hoehe <= 0) {
              // Ohne Hoehe bleibt die Grundflaeche als Umriss stehen. Sie
              // verschwinden zu lassen waere schlimmer: dann fehlte das
              // Regal im Bild, ohne dass jemand merkt, warum.
              return (
                <mesh key={n.id} position={[x, 0.002, z]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[mm(s.breiteMm), mm(s.tiefeMm)]} />
                  <meshBasicMaterial visible={false} />
                  <Edges threshold={15} color="#8C9CB3" />
                </mesh>
              )
            }

            return (
              <group key={n.id} position={[x, 0, z]} rotation={[0, ((s.drehung ?? 0) * Math.PI) / -180, 0]}>
                <mesh position={[0, mm(hoehe) / 2, 0]}>
                  <boxGeometry args={[mm(s.breiteMm), mm(hoehe), mm(s.tiefeMm)]} />
                  <meshStandardMaterial
                    color={REGAL_FARBE}
                    transparent
                    opacity={voll ? 0.42 : 0.16}
                    roughness={0.8}
                  />
                  <Edges threshold={15} color="#8C9CB3" />
                </mesh>

                {/* Die Fachböden als Linien. Sie sind Bretter und keine
                    Klötze; als Flächen naehmen sie die Sicht auf den Inhalt. */}
                {Array.from({ length: Math.max(0, ebenen - 1) }, (_, i) => {
                  const y = mm((hoehe / ebenen) * (i + 1))
                  return (
                    <mesh key={i} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                      <planeGeometry args={[mm(s.breiteMm), mm(s.tiefeMm)]} />
                      <meshBasicMaterial visible={false} />
                      <Edges threshold={15} color="#8C9CB3" />
                    </mesh>
                  )
                })}

                {/* Eine belegte Ebene bekommt eine FLÄCHE — das ist die eine
                    Aussage, die der Grundriss nicht machen kann: „in Regal A
                    liegt etwas, und zwar auf Ebene 2". Ohne Ebenen-Knoten
                    gibt es sie nicht, und dann steht hier auch nichts. */}
                {[...belegt].map((i) => (
                  <mesh
                    key={`voll-${i}`}
                    position={[0, mm((hoehe / ebenen) * (i + 0.5)), 0]}
                  >
                    <boxGeometry args={[mm(s.breiteMm) * 0.94, mm(hoehe / ebenen) * 0.8, mm(s.tiefeMm) * 0.9]} />
                    <meshStandardMaterial color="#8C9CB3" opacity={0.75} transparent roughness={0.8} />
                  </mesh>
                ))}
              </group>
            )
          })}

          <OrbitControls makeDefault enablePan enableRotate />
        </Canvas>
      </div>

      {/* Die Kennungen stehen als LISTE daneben und nicht als Schrift im
          Bild: eine Beschriftung, die sich mit der Kamera dreht, ist aus der
          halben Umdrehung spiegelverkehrt. */}
      <ul className="raum-legende">
        {gestellt.map((n) => (
          <li key={n.id}>
            <strong>{beschriftung(n)}</strong>
            <span className="leise">
              {n.stellplatz!.hoeheMm
                ? format(t('room.tall', '{h} mm high, {e} levels'), {
                    h: n.stellplatz!.hoeheMm!,
                    e: n.stellplatz!.ebenen ?? 1,
                  })
                : t('room.flat', 'no height recorded')}
              {' · '}
              {format(t('room.holds', 'articles inside: {n}'), {
                n: itemsInNode(items, nodes, n.id, { recursive: true }).length,
              })}
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}
