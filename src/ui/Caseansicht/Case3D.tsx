// ───────────────────────────────────────────────────────────────────────────
// DAS CASE IN 3D.
//
// ─── WOFÜR, WENN ES DIE DRAUFSICHT GIBT ────────────────────────────────────
//
// Die Draufsicht beantwortet „wo liegt was" je Lage. Sie kann nicht
// beantworten, wie die Lagen ÜBEREINANDER stehen — und das ist genau die
// Frage beim Schaumausbau: passt der Deckel noch zu, wenn die obere Lage
// steht? Drei Lagen im Schnitt zeigt kein Grundriss.
//
// ─── WAS HIER NICHT RECHNET ────────────────────────────────────────────────
//
// Nichts. Der Vorschlag kommt fertig aus `domain/lib/caseLayout` — diese
// Datei zeichnet ihn. Wer hier eine Passt-Regel ergänzt, hat die zweite
// Wahrheit darüber, ob etwas hineingeht.
//
// ─── WARUM `lazy` VON AUSSEN ───────────────────────────────────────────────
//
// Three ist gross. Genau wie `Ladeansicht3D` wird diese Datei von aussen
// `lazy` + `Suspense` eingehängt. Wer sie irgendwo statisch importiert, zieht
// Three in den Start des Lagers.
//
// ─── BEDIENUNG OHNE MITTLERE MAUSTASTE ─────────────────────────────────────
//
// Dieselbe Belegung wie in der Ladeansicht: Drehen links, Schieben rechts,
// Zoom auf dem Rad. Zwei Ansichten desselben Hauses, die sich verschieden
// bedienen lassen, sind eine zu viel.
// ───────────────────────────────────────────────────────────────────────────
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Edges, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useT } from '../../i18n'
import type { CaseInnenmass } from '../../domain/types/caseAusbau'
import type { CaseLage } from '../../domain/lib/caseLayout'
import { GRUPPEN_TOENE } from '../../domain/lib/gruppenFarben'

interface Props {
  innen: Required<CaseInnenmass>
  lagen: readonly CaseLage[]
  /** Welche Lagen sichtbar sind — Index in `lagen`. */
  sichtbar: ReadonlySet<number>
  /** Das hervorgehobene Fach, wenn eines gewählt ist. */
  auswahl?: string
}

/**
 * Millimeter in Szenen-Einheiten. Gerechnet wird in Metern, damit die Kamera
 * mit vernünftigen Abständen arbeitet — ein Case in Millimetern stünde bei
 * Zoomstufen, an denen Three sichtbar rundet.
 */
const M = 0.001

export default function Case3D({ innen, lagen, sichtbar, auswahl }: Props) {
  const { t } = useT()
  const b = innen.widthMm * M
  const h = innen.heightMm * M
  const tf = innen.depthMm * M
  const weite = Math.max(b, h, tf)

  return (
    <div className="case3d-rahmen">
      <Suspense fallback={<p className="hinweis">{t('case3d.loading', 'Loading the 3D view…')}</p>}>
        <Canvas
          className="case3d"
          camera={{ position: [weite * 1.1, weite * 1.0, weite * 1.3], fov: 45 }}
        >
          <ambientLight intensity={0.75} />
          <directionalLight position={[weite, weite * 2, weite]} intensity={1.1} />

          {/* Der Innenraum als Drahtkasten. Er steht auf dem Ursprung, damit
              die Koordinaten dieselben sind wie in der Draufsicht. */}
          <mesh position={[b / 2, h / 2, tf / 2]}>
            <boxGeometry args={[b, h, tf]} />
            <meshBasicMaterial transparent opacity={0} />
            <Edges color="#8C9CB3" />
          </mesh>

          {lagen.map((lage, li) =>
            sichtbar.has(li)
              ? lage.faecher.map((f, fi) => {
                  const fb = f.breiteMm * M
                  const fh = f.hoeheMm * M
                  const ft = f.tiefeMm * M
                  const gewaehlt = auswahl === f.stueckId
                  return (
                    <mesh
                      key={f.stueckId}
                      position={[
                        f.xMm * M + fb / 2,
                        lage.yMm * M + fh / 2,
                        f.zMm * M + ft / 2,
                      ]}
                    >
                      <boxGeometry args={[fb, fh, ft]} />
                      <meshStandardMaterial
                        color={GRUPPEN_TOENE[fi % GRUPPEN_TOENE.length]}
                        transparent
                        opacity={gewaehlt ? 0.95 : 0.7}
                      />
                      <Edges color={gewaehlt ? '#1D324F' : '#5C6B85'} />
                    </mesh>
                  )
                })
              : null,
          )}

          {/* Drehen links, Schieben rechts, Zoom auf dem Rad — dieselbe
              Belegung wie in der Ladeansicht. */}
          <OrbitControls
            makeDefault
            target={[b / 2, h / 2, tf / 2]}
            mouseButtons={{
              LEFT: THREE.MOUSE.ROTATE,
              MIDDLE: THREE.MOUSE.DOLLY,
              RIGHT: THREE.MOUSE.PAN,
            }}
          />
        </Canvas>
      </Suspense>
    </div>
  )
}
