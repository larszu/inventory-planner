// ───────────────────────────────────────────────────────────────────────────
// Beschriftung im 3D-Bild — ohne Schrift aus dem Netz.
//
// ─── WARUM NICHT `<Text>` AUS `@react-three/drei` ──────────────────────────
//
// Weil es eine Schrift LÄDT. `troika-three-text` holt ohne `font`-Angabe eine
// Datei über das Netz; gemessen am 2026-09-18 im ersten Anlauf dieser Ansicht
// als „Failed to fetch" in der Konsole — und die Kisten blieben unbeschriftet.
//
// Dieses Repo ist offline-first. Das ist keine Vorliebe: das Lager steht im
// Keller und der LKW am Dock, und die Frage „welche Kiste ist das" darf nicht
// am WLAN hängen. Eine Beschriftung, die im Büro da ist und in der Halle
// fehlt, ist schlimmer als keine — sie fällt erst auf, wenn niemand mehr
// nachsehen kann.
//
// ─── WIE ES STATTDESSEN GEHT ───────────────────────────────────────────────
//
// Der Text wird in ein `<canvas>` gezeichnet und als Textur auf eine Fläche
// gelegt. Die Schrift kommt damit vom Betriebssystem, so wie im Rest der
// Oberfläche auch, und es wird nichts geladen.
//
// Der Preis ist Schärfe: eine Textur hat feste Pixel und wird beim Heranzoomen
// weich. Deshalb wird sie mit dem dreifachen der gebrauchten Auflösung
// gezeichnet — genug für den Blick auf einen Laderaum, und immer noch ein
// Bruchteil dessen, was eine Schriftdatei kostet.
// ───────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

/** Wieviele Pixel je Meter die Textur bekommt. */
const PIXEL_JE_METER = 320

interface Props {
  text: string
  /** Breite der Fläche in Metern. */
  breiteM: number
  /** Höhe der Fläche in Metern. */
  hoeheM: number
  position: [number, number, number]
  rotation?: [number, number, number]
  farbe?: string
}

export function Beschriftung({ text, breiteM, hoeheM, position, rotation, farbe = '#132040' }: Props) {
  const textur = useMemo(() => {
    const b = Math.max(32, Math.round(breiteM * PIXEL_JE_METER))
    const h = Math.max(16, Math.round(hoeheM * PIXEL_JE_METER))
    const c = document.createElement('canvas')
    c.width = b
    c.height = h
    const g = c.getContext('2d')
    if (g) {
      g.clearRect(0, 0, b, h)
      // Die Schriftgrösse folgt der kürzeren Kante, damit ein schmales Case
      // nicht mit einer Schrift beschriftet wird, die quer hinausragt.
      const groesse = Math.min(h * 0.62, (b / Math.max(1, text.length)) * 1.7)
      g.font = `600 ${groesse}px system-ui, sans-serif`
      g.fillStyle = farbe
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(text, b / 2, h / 2, b * 0.92)
    }
    const t = new THREE.CanvasTexture(c)
    t.anisotropy = 4
    return t
  }, [text, breiteM, hoeheM, farbe])

  // Eine Textur hält GPU-Speicher. Ohne das Aufräumen sammelt jede Änderung
  // eine weitere an — bei einem Plan, der sich bei jedem Zug neu rechnet, ist
  // das nach ein paar Minuten spürbar.
  useEffect(() => () => textur.dispose(), [textur])

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[breiteM, hoeheM]} />
      <meshBasicMaterial map={textur} transparent depthWrite={false} />
    </mesh>
  )
}
