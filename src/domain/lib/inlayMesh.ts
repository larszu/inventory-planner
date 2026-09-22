// ───────────────────────────────────────────────────────────────────────────
// DAS INLAY ALS DREIECKSNETZ — und warum es als HÖHENFELD gebaut wird.
//
// ─── DIE ANFORDERUNG ───────────────────────────────────────────────────────
//
// Recherchiert am 2026-09-20: ein druckbares Netz muss MANIFOLD sein. Die
// 3MF-Kernspezifikation sagt es hart: „Every triangle edge in the mesh shares
// common vertex endpoints with the edge of exactly 1 other triangle", dazu
// gleichgerichtete Nachbarn und Normalen nach aussen. Ein Netz, das das
// verletzt, wird vom Schneider geraten statt gelesen — und was er rät, sieht
// man erst am gedruckten Teil.
//
// ─── WARUM NICHT „ZWEI KÖRPER IN EINE DATEI" ───────────────────────────────
//
// Der bequeme Weg wäre: eine Bodenplatte als Quader, die Wände als weitere
// Quader, alles in dieselbe Datei. Slicer kommen damit meist zurecht (sie
// vereinigen beim Schneiden), aber „meist" ist hier zu wenig: die Datei wäre
// nach der Spezifikation ungültig, und welcher Slicer sie wie repariert,
// steht nirgends.
//
// ─── DAS VERFAHREN ─────────────────────────────────────────────────────────
//
// Ein Inlay ist ein HÖHENFELD: über jedem Punkt der Grundfläche steht genau
// eine Oberkante — die Plattenhöhe, oder der Taschenboden. Daraus baut sich
// ein manifoldes Netz von selbst:
//
//   1. GITTER. Alle x-Kanten aller Taschen plus die Ränder ergeben die
//      Spalten, alle z-Kanten die Reihen. Jede Zelle liegt damit ENTWEDER
//      ganz in einer Tasche ODER ganz daneben — nie halb.
//   2. OBERKANTE je Zelle: Plattenhöhe, oder Plattenhöhe minus Frästiefe.
//   3. Boden, Deckel und senkrechte Wände zwischen Zellen verschiedener
//      Höhe. Jede Kante trifft genau eine Gegenkante, weil beide Seiten
//      dasselbe Gitter benutzen.
//
// DAS GITTER IST DER GANZE TRICK. Ohne es entstünden T-Stösse: eine lange
// Kante läge an zwei kurzen, und die Kantenbedingung wäre verletzt, obwohl
// das Netz dicht aussieht.
//
// Und es fällt etwas ab, das der bequeme Weg nicht kann: TASCHEN
// VERSCHIEDENER TIEFE in einem Stück. Jedes Gerät bekommt seine eigene
// Frästiefe, statt alle auf die tiefste zu legen.
//
// REIN: keine Uhr, kein Store, kein IO.
// ───────────────────────────────────────────────────────────────────────────
import type { InlayModell } from './inlay'

export interface Dreieck {
  a: [number, number, number]
  b: [number, number, number]
  c: [number, number, number]
}

/**
 * Ein fertiges Netz in DRUCK-Koordinaten: x nach rechts, y in die Tiefe,
 * z NACH OBEN. So erwartet es jeder Schneider, und so steht es in STL und
 * 3MF — eine Umrechnung beim Schreiben gäbe es zweimal.
 */
export interface Netz {
  dreiecke: Dreieck[]
}

/** Alle Kanten einer Achse, einmalig und sortiert. */
function kanten(werte: readonly number[], von: number, bis: number): number[] {
  const menge = new Set<number>([von, bis])
  for (const w of werte) {
    // Nur was INNERHALB liegt: eine Taschenkante ausserhalb des Rohlings
    // würde das Gitter über den Rand hinaus aufspannen.
    if (w > von && w < bis) menge.add(runde(w))
  }
  return [...menge].sort((a, b) => a - b)
}

/**
 * Auf Mikrometer runden.
 *
 * Nicht aus Ordnungsliebe: zwei Kanten, die rechnerisch gleich sind und sich
 * im letzten Fliesskomma-Bit unterscheiden, ergeben ZWEI Gitterlinien mit
 * einer hauchdünnen Zelle dazwischen — und genau dort reisst das Netz auf.
 */
const runde = (n: number): number => Math.round(n * 1000) / 1000

/** Liegt der Zellenmittelpunkt in dieser Tasche? */
const inTasche = (
  x: number,
  z: number,
  t: InlayModell['taschen'][number],
): boolean => x > t.xMm && x < t.xMm + t.breiteMm && z > t.zMm && z < t.zMm + t.tiefeMm

/**
 * Das Netz bauen.
 *
 * Die Griffmulde ist hier ein Teil der Tasche und kein eigener Ausschnitt:
 * sie hat dieselbe Frästiefe, also dieselbe Oberkante, und das Gitter fasst
 * beide ohnehin zusammen.
 */
export function inlayNetz(modell: InlayModell): Netz {
  const { widthMm: B, depthMm: T, heightMm: H } = modell.aussenMm

  // ── 1. Das Gitter ──
  const xWerte: number[] = []
  const zWerte: number[] = []
  for (const t of modell.taschen) {
    xWerte.push(t.xMm, t.xMm + t.breiteMm)
    zWerte.push(t.zMm, t.zMm + t.tiefeMm)
    if (t.griff) {
      xWerte.push(t.griff.xMm, t.griff.xMm + t.griff.breiteMm)
      zWerte.push(t.zMm + t.tiefeMm + t.griff.tiefeMm)
    }
  }
  const xs = kanten(xWerte, 0, runde(B))
  const zs = kanten(zWerte, 0, runde(T))

  // ── 2. Die Oberkante je Zelle ──
  //
  // Die TIEFSTE Tasche gewinnt, wo sich zwei überlappen. Überlappen sollten
  // sie nicht, aber wenn doch, ist die tiefere die sichere Annahme: zu viel
  // weggefräst hält das Gerät schlechter, zu wenig lässt es gar nicht hinein.
  const oben: number[][] = []
  for (let i = 0; i < xs.length - 1; i += 1) {
    oben[i] = []
    const mx = (xs[i]! + xs[i + 1]!) / 2
    for (let j = 0; j < zs.length - 1; j += 1) {
      const mz = (zs[j]! + zs[j + 1]!) / 2
      let hoehe = H
      for (const t of modell.taschen) {
        const drin =
          inTasche(mx, mz, t) ||
          (t.griff !== undefined &&
            mx > t.griff.xMm &&
            mx < t.griff.xMm + t.griff.breiteMm &&
            mz > t.zMm + t.tiefeMm &&
            mz < t.zMm + t.tiefeMm + t.griff.tiefeMm)
        if (drin) hoehe = Math.min(hoehe, H - t.frästiefeMm)
      }
      oben[i]![j] = Math.max(0, runde(hoehe))
    }
  }

  // ── 2b. Die Höhenstufen, an denen JEDE senkrechte Wand geschnitten wird ──
  //
  // ─── DER FEHLER, GEGEN DEN DAS STEHT ─────────────────────────────────────
  //
  // Gemessen am 2026-09-22 an einer echten Lage: 24 offene Kanten, obwohl
  // die Einzeltests dicht waren. Die Ursache sitzt an den senkrechten
  // Kanten. Eine Aussenwand läuft von 0 bis zur Zellhöhe; die Nachbarwand
  // bis zu IHRER Höhe; und dazwischen steht eine Stufe, die nur den
  // Unterschied überbrückt. An der gemeinsamen senkrechten Kante treffen
  // dann drei Strecken aufeinander — 0..70, 0..26 und 26..70 — und keine
  // zwei sind gleich. Das Netz sieht dicht aus und ist es nicht.
  //
  // ─── DIE ABHILFE ─────────────────────────────────────────────────────────
  //
  // Jede senkrechte Fläche wird an DENSELBEN Höhen geschnitten, nämlich an
  // allen im Netz vorkommenden. Damit zerfällt jede senkrechte Kante überall
  // in dieselben Abschnitte, und jeder Abschnitt gehört zu genau zwei
  // Flächen.
  //
  // Es sind wenige: eine Stufe je verschiedener Frästiefe plus Boden und
  // Oberkante. Ein Inlay mit vier Tiefen ergibt fünf Stufen.
  const stufen = [
    ...new Set<number>([0, runde(H), ...oben.flatMap((spalte) => spalte)]),
  ].sort((a, b) => a - b)

  const dreiecke: Dreieck[] = []

  /**
   * Vom Innenraum in die Druck-Koordinaten.
   *
   * Der Innenraum zählt x nach rechts, y nach oben, z nach hinten — das ist
   * LINKSHÄNDIG, und in einem linkshändigen System zeigt das Kreuzprodukt
   * andersherum. Gemessen am 2026-09-20: das Netz war dicht, aber sein
   * Volumen negativ, also alle Normalen nach innen. Ein Schneider hätte die
   * Negativform gedruckt.
   *
   * Ein Drucker rechnet mit Z NACH OBEN. Die Vertauschung von Höhe und
   * Tiefe ist deshalb ohnehin nötig — und sie dreht die Händigkeit gerade
   * zurück. Eine Umkehr, die beide Fehler behebt, statt eines Vorzeichens
   * an einer Stelle, die nichts erklärt.
   */
  const druck = (p: [number, number, number]): [number, number, number] => [p[0], p[2], p[1]]

  /** Ein Viereck als zwei Dreiecke, in der angegebenen Umlaufrichtung. */
  const quad = (
    p1: [number, number, number],
    p2: [number, number, number],
    p3: [number, number, number],
    p4: [number, number, number],
  ) => {
    const [a, b, c, d] = [druck(p1), druck(p2), druck(p3), druck(p4)]
    dreiecke.push({ a, b, c }, { a, b: c, c: d })
  }

  /**
   * Eine senkrechte Wand, an den Höhenstufen zerschnitten.
   *
   * `unten`/`oben` sind die Höhen, `p` und `q` die beiden Fusspunkte in der
   * Grundfläche. Die Umlaufrichtung ergibt sich aus der Reihenfolge von `p`
   * und `q` — wer sie vertauscht, dreht die Normale.
   */
  const wand = (
    p: [number, number],
    q: [number, number],
    unten: number,
    oben_: number,
  ) => {
    if (oben_ <= unten) return
    const innen = stufen.filter((h) => h > unten && h < oben_)
    const kette = [unten, ...innen, oben_]
    for (let k = 0; k < kette.length - 1; k += 1) {
      const u = kette[k]!
      const o = kette[k + 1]!
      quad([p[0], u, p[1]], [q[0], u, q[1]], [q[0], o, q[1]], [p[0], o, p[1]])
    }
  }

  for (let i = 0; i < xs.length - 1; i += 1) {
    const x0 = xs[i]!
    const x1 = xs[i + 1]!
    for (let j = 0; j < zs.length - 1; j += 1) {
      const z0 = zs[j]!
      const z1 = zs[j + 1]!
      const h = oben[i]![j]!

      // Boden: Normale nach UNTEN, also im Uhrzeigersinn von oben gesehen.
      quad([x0, 0, z0], [x0, 0, z1], [x1, 0, z1], [x1, 0, z0])
      // Deckel: Normale nach OBEN.
      if (h > 0) quad([x0, h, z0], [x1, h, z0], [x1, h, z1], [x0, h, z1])

      // ── Senkrechte Wände ──
      //
      // Je Zellkante EINE Wand, und zwar nur dort, wo sich die Höhe ändert.
      // Zwei gleich hohe Nachbarn brauchen keine — eine Wand mitten im
      // Material wäre eine Fläche im Inneren des Körpers.
      const rechts = i + 1 < xs.length - 1 ? oben[i + 1]![j]! : 0
      const hinten = j + 1 < zs.length - 1 ? oben[i]![j + 1]! : 0

      // Aussenkanten: das Aussen ist eine gedachte Zelle der Höhe 0.
      if (i === 0) wand([x0, z1], [x0, z0], 0, h)
      if (i === xs.length - 2) wand([x1, z0], [x1, z1], 0, h)
      if (j === 0) wand([x0, z0], [x1, z0], 0, h)
      if (j === zs.length - 2) wand([x1, z1], [x0, z1], 0, h)

      // Innere Stufen. Die Normale zeigt vom HÖHEREN Nachbarn weg — sonst
      // schaute sie ins Material.
      if (i + 1 < xs.length - 1 && rechts !== h) {
        if (h > rechts) wand([x1, z0], [x1, z1], rechts, h)
        else wand([x1, z1], [x1, z0], h, rechts)
      }
      if (j + 1 < zs.length - 1 && hinten !== h) {
        if (h > hinten) wand([x1, z1], [x0, z1], hinten, h)
        else wand([x0, z1], [x1, z1], h, hinten)
      }
    }
  }

  return { dreiecke }
}

/**
 * Die Kantenprobe: trifft jede Kante genau eine Gegenkante?
 *
 * Das ist die Bedingung aus der 3MF-Spezifikation, und sie ist hier kein
 * Kommentar, sondern eine Funktion — damit ein Test sie stellen kann. Eine
 * Zusicherung, die niemand misst, ist eine Notiz.
 */
export function offeneKanten(netz: Netz): number {
  const zaehler = new Map<string, number>()
  const k = (p: [number, number, number]) => `${p[0]},${p[1]},${p[2]}`
  for (const d of netz.dreiecke) {
    for (const [p, q] of [
      [d.a, d.b],
      [d.b, d.c],
      [d.c, d.a],
    ] as const) {
      // Ungerichtet gezählt: eine Kante gehört zu zwei Dreiecken, die sie in
      // GEGENLÄUFIGER Richtung benutzen.
      const schluessel = k(p) < k(q) ? `${k(p)}|${k(q)}` : `${k(q)}|${k(p)}`
      zaehler.set(schluessel, (zaehler.get(schluessel) ?? 0) + 1)
    }
  }
  let offen = 0
  for (const n of zaehler.values()) if (n !== 2) offen += 1
  return offen
}

/**
 * Das eingeschlossene Volumen in mm³ — über das Divergenztheorem.
 *
 * Wofür: ein Netz mit nach innen gedrehten Normalen ist dicht und trotzdem
 * falsch; der Schneider druckt dann die Negativform. Ein NEGATIVES Volumen
 * verrät genau das, und kein Blick auf das Bild tut es.
 */
export function volumen(netz: Netz): number {
  let v = 0
  for (const d of netz.dreiecke) {
    const [ax, ay, az] = d.a
    const [bx, by, bz] = d.b
    const [cx, cy, cz] = d.c
    v +=
      (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6
  }
  return v
}
