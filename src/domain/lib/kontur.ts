// ───────────────────────────────────────────────────────────────────────────
// Die Form des Laderaums — Ecken, Kanten, Rundungen.
//
// ─── WAS HIER GERECHNET WIRD ───────────────────────────────────────────────
//
// Ein Laderaum ist ein Quader, von dem an den Kanten etwas fehlt: die
// Dachkante ist gerundet, die Wand läuft nach oben zusammen, der Kofferraum
// verjüngt sich zum Heck. Dieses Modul beantwortet zwei Fragen darüber, und
// zwar EINMAL für alle, die sie stellen:
//
//   `quaderFrei`     passt dieser Kasten in den Raum?  → der Packer
//   `konturBeiHoehe` wie sieht der Raum auf Höhe y aus? → Draufsicht und 3D
//
// Zwei Antworten auf dieselbe Frage wären zwei Formen desselben Fahrzeugs:
// eine, nach der gepackt wird, und eine, die man sieht. Genau daran erkennt
// eine Crew ein Werkzeug, dem sie nicht trauen kann.
//
// ─── DIE EINE IST EXAKT, DIE ANDERE AUFGELÖST ──────────────────────────────
//
// `quaderFrei` rechnet ANALYTISCH: eine Ungleichung je Kante, kein Raster,
// kein Abtasten. Eine Kiste passt oder nicht, und die Antwort hängt nicht
// davon ab, wie fein jemand etwas zerlegt hat.
//
// `konturBeiHoehe` zerlegt die Rundungen in Sehnen, weil ein Bild aus
// Strecken besteht. Die Auflösung ist ein Zeichen-Parameter und KEINE
// Rechengenauigkeit — deshalb sitzt sie hier und nicht in zwei Ansichten
// getrennt, und deshalb wird die Sehne nach INNEN gelegt: das gezeichnete
// Polygon ist dann nie grösser als der Raum, den der Packer zulässt. Ein
// Bild, das mehr Platz zeigt, als es gibt, ist die teurere Richtung.
//
// ─── WAS EINE KANTE BEDEUTET ───────────────────────────────────────────────
//
// Eine `Kantenform` liegt an einer der zwölf Kanten. Sie misst zwei
// Abstände: `da` von der einen Wand, `db` von der anderen. Entfernt ist,
// was NAH AN BEIDEN Wänden liegt — gerade begrenzt (`fase`) oder auf einer
// Ellipse (`rundung`).
//
// Daraus folgt die Eigenschaft, die `quaderFrei` exakt macht: die entfernte
// Menge ist MONOTON. Wer weiter von einer der beiden Wände weg ist, ist
// nicht stärker entfernt. Von einem Kasten muss deshalb nur die EINE Ecke
// geprüft werden, die beiden Wänden am nächsten liegt — alle anderen Punkte
// sind dann erst recht frei.
//
// REIN: keine Uhr, kein Store, kein IO.
// ───────────────────────────────────────────────────────────────────────────

import { andereAchsen, type Achse, type Kantenform, type Seite, type Vehicle } from '../types/vehicle'

export interface Punkt2D {
  x: number
  z: number
}

/** Die Kantenlängen des Hüllquaders in Packer-Achsen. */
export function raumMasse(v: Vehicle): { x: number; y: number; z: number } {
  return { x: v.cargoMm.widthMm, y: v.cargoMm.heightMm, z: v.cargoMm.lengthMm }
}

/** Abstand von der Wand, an der diese Kante liegt. */
const wandAbstand = (wert: number, laenge: number, seite: Seite): number =>
  seite === 'min' ? wert : laenge - wert

/**
 * Fehlt an dieser Kante das Material bei den Abständen (`da`, `db`)?
 *
 * Ausserhalb der Reichweite (`da >= aMm` ODER `db >= bMm`) fehlt nie etwas —
 * eine Kantenbrechung greift nur in ihrer eigenen Ecke.
 */
export function fehltAnKante(k: Kantenform, da: number, db: number): boolean {
  if (k.aMm <= 0 || k.bMm <= 0) return false
  if (da >= k.aMm || db >= k.bMm) return false
  if (k.art === 'fase') return da / k.aMm + db / k.bMm < 1
  // Rundung: entfernt ist alles AUSSERHALB der Ellipse um den inneren
  // Mittelpunkt (aMm, bMm) — das ist die Ecke, nicht die Mulde.
  const u = (k.aMm - da) / k.aMm
  const w = (k.bMm - db) / k.bMm
  return u * u + w * w > 1
}

/**
 * Liegt ein achsparalleler Kasten vollständig im freien Raum?
 *
 * `origin` ist die Ecke bei den kleinsten Koordinaten, `size` sind die
 * Kantenlängen — dieselbe Form wie `Quader` im Packer. Der Typ steht hier
 * bewusst als Strukturliteral und nicht als Import aus `loadPacker`: dieses
 * Modul beschreibt das Fahrzeug und darf nicht am Packer hängen.
 */
export function quaderFrei(
  kanten: readonly Kantenform[] | undefined,
  raum: { x: number; y: number; z: number },
  origin: { x: number; y: number; z: number },
  size: { x: number; y: number; z: number },
): boolean {
  if (!kanten || kanten.length === 0) return true
  for (const k of kanten) {
    const [achseA, achseB] = andereAchsen(k.achse)
    // Die Ecke des Kastens, die BEIDEN Wänden am nächsten liegt. Wegen der
    // Monotonie genügt sie; siehe Kopf dieser Datei.
    const da = naechsterAbstand(origin, size, raum, achseA, k.seiten[0])
    const db = naechsterAbstand(origin, size, raum, achseB, k.seiten[1])
    if (fehltAnKante(k, da, db)) return false
  }
  return true
}

function naechsterAbstand(
  origin: { x: number; y: number; z: number },
  size: { x: number; y: number; z: number },
  raum: { x: number; y: number; z: number },
  achse: Achse,
  seite: Seite,
): number {
  return seite === 'min' ? origin[achse] : raum[achse] - (origin[achse] + size[achse])
}

/** Liegt ein einzelner Punkt im freien Raum? Für Tests und die Anzeige. */
export function punktFrei(
  kanten: readonly Kantenform[] | undefined,
  raum: { x: number; y: number; z: number },
  p: { x: number; y: number; z: number },
): boolean {
  return quaderFrei(kanten, raum, p, { x: 0, y: 0, z: 0 })
}

/**
 * Wie weit eine Kante auf Höhe `y` in die Grundfläche hineinragt.
 *
 * Nur Kanten, die ENTLANG x oder z laufen, hängen von der Höhe ab; eine
 * Kante entlang y schneidet in jeder Höhe dieselbe Ecke aus dem Grundriss.
 * Rückgabe ist der Einzug in mm, 0 wenn diese Kante hier nichts wegnimmt.
 */
function einzugBeiHoehe(k: Kantenform, raum: { x: number; y: number; z: number }, y: number): number {
  // Die Höhe ist bei einer Kante entlang x die ERSTE der beiden anderen
  // Achsen (y, z), bei einer entlang z die ZWEITE (x, y).
  const hoehenErst = andereAchsen(k.achse)[0] === 'y'
  const hoehenAchse: Seite = hoehenErst ? k.seiten[0] : k.seiten[1]
  const hoehenMass = hoehenErst ? k.aMm : k.bMm
  const tiefenMass = hoehenErst ? k.bMm : k.aMm

  const da = wandAbstand(y, raum.y, hoehenAchse)
  if (da >= hoehenMass || hoehenMass <= 0 || tiefenMass <= 0) return 0
  if (da < 0) return tiefenMass
  if (k.art === 'fase') return tiefenMass * (1 - da / hoehenMass)
  const u = (hoehenMass - da) / hoehenMass
  return tiefenMass * (1 - Math.sqrt(Math.max(0, 1 - u * u)))
}

/**
 * Der Grundriss des freien Raums auf Höhe `y`, gegen den Uhrzeigersinn.
 *
 * Er entsteht durch Beschneiden: das Rechteck des Hüllquaders wird für jede
 * Kante mit der Fläche geschnitten, die diese Kante übriglässt. Bei einer
 * `fase` ist das eine Halbebene, bei einer `rundung` ein Vieleck aus
 * `segmente` Sehnen.
 *
 * WARUM BESCHNEIDEN UND NICHT JEDE ECKE EINZELN ZEICHNEN. Zwei Kanten
 * können sich dieselbe Ecke teilen — eine gerundete Dachkante und ein zum
 * Heck verjüngter Kofferraum treffen sich oben hinten. Wer jede Kante für
 * sich zeichnet, malt dort zwei Linien übereinander und zeigt mehr Fläche,
 * als beide zusammen übriglassen. Der Schnitt kommt von selbst richtig
 * heraus, weil er genau das tut, was `quaderFrei` prüft: ALLE Kanten müssen
 * zustimmen.
 */
export function konturBeiHoehe(v: Vehicle, y: number, segmente = 12): Punkt2D[] {
  const raum = raumMasse(v)
  let flaeche: Punkt2D[] = [
    { x: 0, z: 0 },
    { x: raum.x, z: 0 },
    { x: raum.x, z: raum.z },
    { x: 0, z: raum.z },
  ]

  for (const k of v.kanten ?? []) {
    if (k.aMm <= 0 || k.bMm <= 0) continue

    if (k.achse === 'y') {
      // Eine Ecke des Grundrisses, in jeder Höhe dieselbe.
      flaeche = schneideEcke(flaeche, raum, k, segmente)
      continue
    }

    const einzug = einzugBeiHoehe(k, raum, y)
    if (einzug <= 0) continue
    // Welche Wand rückt ein: die des Nicht-Höhen-Achsenpaars.
    const [achseA] = andereAchsen(k.achse)
    const tiefenAchse: 'x' | 'z' = k.achse === 'x' ? 'z' : 'x'
    const tiefenSeite: Seite = achseA === 'y' ? k.seiten[1] : k.seiten[0]
    flaeche = schneideHalbebene(flaeche, tiefenAchse, tiefenSeite, einzug, raum)
  }

  return flaeche
}

/** Halbebene: alles, was mindestens `einzug` von dieser Wand entfernt ist. */
function schneideHalbebene(
  flaeche: readonly Punkt2D[],
  achse: 'x' | 'z',
  seite: Seite,
  einzug: number,
  raum: { x: number; z: number },
): Punkt2D[] {
  const grenze = seite === 'min' ? einzug : raum[achse] - einzug
  const drin = (p: Punkt2D) => (seite === 'min' ? p[achse] >= grenze : p[achse] <= grenze)
  return sutherlandHodgman(flaeche, drin, (a, b) => {
    const t = (grenze - a[achse]) / (b[achse] - a[achse])
    return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }
  })
}

/** Eine Ecke des Grundrisses brechen oder runden (Kante entlang y). */
function schneideEcke(
  flaeche: readonly Punkt2D[],
  raum: { x: number; z: number },
  k: Kantenform,
  segmente: number,
): Punkt2D[] {
  // Kante entlang y spannt (x, z) auf — `seiten` steht in dieser Reihenfolge.
  const [seiteX, seiteZ] = k.seiten
  const abstand = (p: Punkt2D) => ({
    da: seiteX === 'min' ? p.x : raum.x - p.x,
    db: seiteZ === 'min' ? p.z : raum.z - p.z,
  })

  if (k.art === 'fase') {
    const drin = (p: Punkt2D) => {
      const { da, db } = abstand(p)
      return da / k.aMm + db / k.bMm >= 1
    }
    const wert = (p: Punkt2D) => {
      const { da, db } = abstand(p)
      return da / k.aMm + db / k.bMm - 1
    }
    return sutherlandHodgman(flaeche, drin, (a, b) => mische(a, b, wert(a) / (wert(a) - wert(b))))
  }

  // Rundung: nacheinander an `segmente` Sehnen der Ellipse beschneiden. Die
  // Sehne liegt INNEN, das Bild zeigt also nie mehr Platz als vorhanden.
  let out = [...flaeche]
  for (let i = 0; i < segmente; i += 1) {
    const w1 = (Math.PI / 2) * (i / segmente)
    const w2 = (Math.PI / 2) * ((i + 1) / segmente)
    const p1 = eckPunkt(raum, k, seiteX, seiteZ, Math.cos(w1), Math.sin(w1))
    const p2 = eckPunkt(raum, k, seiteX, seiteZ, Math.cos(w2), Math.sin(w2))
    out = schneideGerade(out, p1, p2, raum, seiteX, seiteZ)
  }
  return out
}

/** Ein Punkt auf der Viertelellipse in Raum-Koordinaten. */
function eckPunkt(
  raum: { x: number; z: number },
  k: Kantenform,
  seiteX: Seite,
  seiteZ: Seite,
  cos: number,
  sin: number,
): Punkt2D {
  const da = k.aMm * (1 - cos)
  const db = k.bMm * (1 - sin)
  return {
    x: seiteX === 'min' ? da : raum.x - da,
    z: seiteZ === 'min' ? db : raum.z - db,
  }
}

/** An der Geraden durch p1/p2 beschneiden; behalten wird die Seite, auf der
 *  die gegenüberliegende Ecke des Raums liegt. */
function schneideGerade(
  flaeche: readonly Punkt2D[],
  p1: Punkt2D,
  p2: Punkt2D,
  raum: { x: number; z: number },
  seiteX: Seite,
  seiteZ: Seite,
): Punkt2D[] {
  const gegen: Punkt2D = { x: seiteX === 'min' ? raum.x : 0, z: seiteZ === 'min' ? raum.z : 0 }
  const seiteVon = (p: Punkt2D) => (p2.x - p1.x) * (p.z - p1.z) - (p2.z - p1.z) * (p.x - p1.x)
  const vorzeichen = Math.sign(seiteVon(gegen)) || 1
  const wert = (p: Punkt2D) => seiteVon(p) * vorzeichen
  return sutherlandHodgman(flaeche, (p) => wert(p) >= 0, (a, b) => mische(a, b, wert(a) / (wert(a) - wert(b))))
}

const mische = (a: Punkt2D, b: Punkt2D, t: number): Punkt2D => ({
  x: a.x + (b.x - a.x) * t,
  z: a.z + (b.z - a.z) * t,
})

/**
 * Sutherland-Hodgman: ein konvexes Polygon an einer Halbebene beschneiden.
 *
 * Es steht hier ausgeschrieben und kommt nicht aus einer Bibliothek: es sind
 * zwölf Zeilen, und eine Abhängigkeit für zwölf Zeilen ist eine, die man
 * beim nächsten Umbau nachziehen muss.
 */
function sutherlandHodgman(
  flaeche: readonly Punkt2D[],
  drin: (p: Punkt2D) => boolean,
  schnitt: (a: Punkt2D, b: Punkt2D) => Punkt2D,
): Punkt2D[] {
  const out: Punkt2D[] = []
  for (let i = 0; i < flaeche.length; i += 1) {
    const a = flaeche[i]!
    const b = flaeche[(i + 1) % flaeche.length]!
    const aDrin = drin(a)
    const bDrin = drin(b)
    if (aDrin) out.push(a)
    if (aDrin !== bDrin) out.push(schnitt(a, b))
  }
  return out
}

/** Die Fläche eines Grundrisses in mm² (Gausssche Trapezformel). */
export function konturFlaeche(punkte: readonly Punkt2D[]): number {
  let zweifach = 0
  for (let i = 0; i < punkte.length; i += 1) {
    const a = punkte[i]!
    const b = punkte[(i + 1) % punkte.length]!
    zweifach += a.x * b.z - b.x * a.z
  }
  return Math.abs(zweifach) / 2
}

/**
 * Das Volumen, das die Kanten wegnehmen, in Litern.
 *
 * Gerechnet wird über die Grundrisse: die Fläche auf `stufen` Höhen, nach
 * der Sehnenregel aufsummiert. Analytisch je Kante wäre kürzer (ein Keil ist
 * `a*b/2 * Länge`), zählte aber an einer geteilten Ecke doppelt — und ein
 * Restvolumen, das kleiner ist als der Raum, ist keine Auskunft, sondern
 * ein Fehler mit freundlichem Vorzeichen.
 */
export function kantenVerlustLiter(v: Vehicle, stufen = 64): number {
  const raum = raumMasse(v)
  if (!v.kanten || v.kanten.length === 0) return 0
  const voll = raum.x * raum.z
  let summe = 0
  for (let i = 0; i <= stufen; i += 1) {
    const y = (raum.y * i) / stufen
    const anteil = i === 0 || i === stufen ? 0.5 : 1
    summe += anteil * (voll - konturFlaeche(konturBeiHoehe(v, y)))
  }
  return (summe * (raum.y / stufen)) / 1_000_000
}

/** Die Höhen, auf denen sich der Grundriss ändert — Stützstellen fürs Bild. */
export function konturHoehen(v: Vehicle, proKante = 8): number[] {
  const raum = raumMasse(v)
  const hoehen = new Set([0, raum.y])
  for (const k of v.kanten ?? []) {
    if (k.achse === 'y') continue
    const [achseA] = andereAchsen(k.achse)
    const [hoehenSeite, hoehenMass]: [Seite, number] =
      achseA === 'y' ? [k.seiten[0], k.aMm] : [k.seiten[1], k.bMm]
    for (let i = 0; i <= proKante; i += 1) {
      const d = (hoehenMass * i) / proKante
      hoehen.add(hoehenSeite === 'min' ? d : raum.y - d)
    }
  }
  return [...hoehen].filter((y) => y >= 0 && y <= raum.y).sort((a, b) => a - b)
}

/**
 * Einzüge an den Wänden bei x = 0 und z = 0, in mm.
 *
 * WOFÜR. Die Extreme-Point-Heuristik setzt Kisten an die Ecken schon
 * gesetzter Stücke und an den Ursprung. In einem scharfkantigen Quader ist
 * das vollständig; steht an der unteren Kante eine Rundung, ist der
 * Ursprung selbst aber gar kein Platz mehr — und die Kiste, die 60 mm weiter
 * innen bequem stünde, fiele durch. Diese Werte kommen als zusätzliche
 * Startpunkte dazu.
 *
 * Grosszügig statt genau: die Einzüge gelten in voller Tiefe nur ganz unten
 * bzw. ganz aussen, weiter oben ist die Rundung schwächer. Ein Kandidat zu
 * viel kostet einen Durchlauf durch `quaderFrei`, ein Kandidat zu wenig
 * kostet einen Platz, den es gibt.
 */
export function wandEinzuege(v: Vehicle): { x: number[]; z: number[] } {
  const x = new Set<number>()
  const z = new Set<number>()
  for (const k of v.kanten ?? []) {
    if (k.aMm <= 0 || k.bMm <= 0) continue
    if (k.achse === 'x') {
      if (k.seiten[1] === 'min') z.add(Math.round(k.bMm))
    } else if (k.achse === 'y') {
      if (k.seiten[0] === 'min') x.add(Math.round(k.aMm))
      if (k.seiten[1] === 'min') z.add(Math.round(k.bMm))
    } else {
      if (k.seiten[0] === 'min') x.add(Math.round(k.aMm))
    }
  }
  return { x: [...x].sort((a, b) => a - b), z: [...z].sort((a, b) => a - b) }
}
