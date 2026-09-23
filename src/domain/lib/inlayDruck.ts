// ───────────────────────────────────────────────────────────────────────────
// DAS INLAY ZUM DRUCKEN — 3MF und STL.
//
// ─── BEIDE, UND WARUM IN DIESER REIHENFOLGE ────────────────────────────────
//
// Recherchiert am 2026-09-20: STL KENNT KEINE EINHEIT. In der Datei stehen
// nur Zahlen; ob sie Millimeter oder Zoll bedeuten, muss der Schneider raten.
// Der klassische Fehler ist der Faktor 25,4 — und ein Inlay, das in Zoll
// gelesen wird, ist zweieinhalbmal zu gross, bevor jemand es merkt.
//
// 3MF schreibt die Einheit hin (`unit="millimeter"`) und verlangt ausserdem
// ein manifoldes Netz mit nach aussen zeigenden Normalen. Es ist deshalb das
// erste Angebot.
//
// STL bleibt trotzdem, weil es jede Maschine frisst. Die fehlende Einheit
// steht dann im Dateinamen — das ist kein Ersatz, aber es ist das, was man
// tun kann.
//
// ─── WAS HIER NICHT RECHNET ────────────────────────────────────────────────
//
// Nichts. Das Netz kommt fertig aus `inlayMesh` und ist dort auf Dichtheit
// und Umlaufsinn geprüft. Diese Datei schreibt es nur auf.
//
// REIN: keine Uhr (der Zeitstempel des Archivs kommt von aussen), kein Store,
// kein IO.
// ───────────────────────────────────────────────────────────────────────────
import { zipStore } from '../../lib/zipStore'
import type { Netz } from './inlayMesh'

const enc = new TextEncoder()

/**
 * Binäres STL.
 *
 * Binär und nicht ASCII: dasselbe Netz ist als Text etwa fünfmal so gross,
 * und ein Inlay mit vielen Taschen kommt schnell auf Zehntausende Dreiecke.
 *
 * Der Normalenvektor wird MITGERECHNET und nicht auf null gelassen. Null ist
 * erlaubt und viele Leser rechnen ihn dann selbst aus — manche aber nicht,
 * und die zeigen das Teil dann mit schwarzen Flächen an.
 */
export function buildStl(netz: Netz, name = 'inlay'): Uint8Array<ArrayBuffer> {
  const n = netz.dreiecke.length
  const puffer = new ArrayBuffer(84 + n * 50)
  const sicht = new DataView(puffer)
  const bytes = new Uint8Array(puffer)

  // Der 80-Byte-Kopf. Er darf NICHT mit „solid" beginnen — manche Leser
  // halten die Datei sonst für ASCII-STL und lesen Kauderwelsch.
  const kopf = enc.encode(`inlay ${name} (mm)`.slice(0, 79))
  bytes.set(kopf, 0)
  sicht.setUint32(80, n, true)

  let o = 84
  for (const d of netz.dreiecke) {
    const ux = d.b[0] - d.a[0]
    const uy = d.b[1] - d.a[1]
    const uz = d.b[2] - d.a[2]
    const vx = d.c[0] - d.a[0]
    const vy = d.c[1] - d.a[1]
    const vz = d.c[2] - d.a[2]
    let nx = uy * vz - uz * vy
    let ny = uz * vx - ux * vz
    let nz = ux * vy - uy * vx
    const laenge = Math.hypot(nx, ny, nz)
    if (laenge > 0) {
      nx /= laenge
      ny /= laenge
      nz /= laenge
    }
    sicht.setFloat32(o, nx, true)
    sicht.setFloat32(o + 4, ny, true)
    sicht.setFloat32(o + 8, nz, true)
    for (const [i, p] of [d.a, d.b, d.c].entries()) {
      sicht.setFloat32(o + 12 + i * 12, p[0], true)
      sicht.setFloat32(o + 16 + i * 12, p[1], true)
      sicht.setFloat32(o + 20 + i * 12, p[2], true)
    }
    sicht.setUint16(o + 48, 0, true) // Attributbytes, unbenutzt
    o += 50
  }
  return bytes
}

/**
 * Gleiche Punkte zusammenlegen.
 *
 * 3MF verlangt, dass jede Kante genau ein Gegenstück hat — das prüft es
 * über die VERTEX-NUMMERN und nicht über die Koordinaten. Ein Netz mit drei
 * Kopien desselben Punktes ist damit formal offen, obwohl es dicht aussieht.
 *
 * Gerundet auf Mikrometer, aus demselben Grund wie im Netzbau: zwei
 * rechnerisch gleiche Punkte, die sich im letzten Bit unterscheiden, wären
 * zwei Punkte.
 */
function punkteSammeln(netz: Netz): { punkte: [number, number, number][]; indizes: number[][] } {
  const nummer = new Map<string, number>()
  const punkte: [number, number, number][] = []
  const schluessel = (p: readonly number[]) =>
    p.map((n) => Math.round(n * 1000) / 1000).join(',')
  const hole = (p: [number, number, number]): number => {
    const k = schluessel(p)
    const vorhanden = nummer.get(k)
    if (vorhanden !== undefined) return vorhanden
    const i = punkte.length
    punkte.push([
      Math.round(p[0] * 1000) / 1000,
      Math.round(p[1] * 1000) / 1000,
      Math.round(p[2] * 1000) / 1000,
    ])
    nummer.set(k, i)
    return i
  }
  const indizes = netz.dreiecke.map((d) => [hole(d.a), hole(d.b), hole(d.c)])
  return { punkte, indizes }
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="model" ContentType="application/vnd.ms-package.3dmodel+xml"/>
</Types>`

const RELS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" Target="/3D/3dmodel.model"/>
</Relationships>`

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Die Modell-Datei eines 3MF-Pakets. */
export function build3mfModel(netz: Netz, name = 'Inlay'): string {
  const { punkte, indizes } = punkteSammeln(netz)
  const v = punkte.map((p) => `<vertex x="${p[0]}" y="${p[1]}" z="${p[2]}"/>`).join('')
  const t = indizes.map((i) => `<triangle v1="${i[0]}" v2="${i[1]}" v3="${i[2]}"/>`).join('')
  return `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
<metadata name="Title">${esc(name)}</metadata>
<resources>
<object id="1" type="model" name="${esc(name)}">
<mesh><vertices>${v}</vertices><triangles>${t}</triangles></mesh>
</object>
</resources>
<build><item objectid="1"/></build>
</model>`
}

/**
 * Das ganze 3MF-Paket.
 *
 * `zeit` von aussen: mit einer Uhr hier ergäbe dieselbe Eingabe nicht
 * dieselbe Datei, und ein Test könnte nichts festhalten.
 */
export function build3mf(netz: Netz, name = 'Inlay', zeit?: Date): Uint8Array<ArrayBuffer> {
  return zipStore(
    [
      { pfad: '[Content_Types].xml', daten: enc.encode(CONTENT_TYPES) },
      { pfad: '_rels/.rels', daten: enc.encode(RELS) },
      { pfad: '3D/3dmodel.model', daten: enc.encode(build3mfModel(netz, name)) },
    ],
    zeit,
  )
}
