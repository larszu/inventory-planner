// ───────────────────────────────────────────────────────────────────────────
// Die Kamera so setzen, dass der Laderaum das Bild füllt (#23) — rein
// rechnend, ohne Three.
//
// WARUM NICHT `view3d.ts` AUS DEM MULTICAM-PLANNER PORTIERT. Das Issue nennt
// es als Vorlage („Halle → Laderaum umbenennen, sonst unverändert"), und beim
// Nachlesen hält das nicht: jene 209 Zeilen rechnen einen HORIZONT
// (`HORIZON_TOP_FRACTION`, `groundPitchRad`, `camHeightFor`) für den Blick von
// der Tribüne auf eine Bühne. Ein Laderaum hat keinen Horizont; man sieht von
// schräg oben in eine Kiste hinein und dreht um sie herum.
//
// Übernommen ist deshalb die FORM und nicht der Inhalt: eine reine Funktion
// mit eigenem Test, damit die Bildeinstellung nicht in einer Komponente
// steckt, wo sie niemand prüfen kann.
// ───────────────────────────────────────────────────────────────────────────

/** Sichtfeld der Kamera in Grad — senkrecht, wie Three es erwartet. */
export const FOV_GRAD = 45

/** Damit der Raum nicht bis an den Rand stösst. */
export const RAND_FAKTOR = 1.06

export interface Blick {
  /** Kameraposition in Metern, Ursprung in der Mitte des Laderaums. */
  position: [number, number, number]
  /** Worauf sie schaut — die Mitte des Laderaums. */
  ziel: [number, number, number]
}

/**
 * Wie weit muss die Kamera weg, damit eine Kante der Länge `mass` ins Bild
 * passt?
 *
 * Die halbe Kante über den Tangens des halben Sichtfelds. Für die Breite
 * kommt das Seitenverhältnis dazu — ein breites Fenster sieht mehr Breite,
 * ein schmales nicht.
 */
export function abstandFuer(mass: number, fovGrad = FOV_GRAD): number {
  const halb = (fovGrad * Math.PI) / 180 / 2
  return mass / 2 / Math.tan(halb)
}

/**
 * Der Blick auf einen Laderaum, gegeben seine Kantenlängen in METERN.
 *
 * Von schräg hinten-oben über die linke Schulter, damit man die Öffnung
 * (grosses z) und den Boden zugleich sieht. Das ist dieselbe Wahl, die jedes
 * Ladeplanungs-Werkzeug trifft — ein frontaler Blick in die Öffnung zeigt nur
 * die vorderste Reihe.
 */
export function blickAuf(laengeM: number, breiteM: number, hoeheM: number, seitenverhaeltnis = 16 / 9): Blick {
  // ÜBER DIE UMKUGEL UND NICHT ÜBER DIE LÄNGSTE KANTE. Der erste Anlauf nahm
  // `max(länge, breite, höhe)` — und stellte den Laderaum damit zu weit weg:
  // von schräg oben ist die sichtbare Ausdehnung die Diagonale, aber die
  // Kante wird perspektivisch VERKÜRZT. Gemessen am gerenderten Bild füllte
  // die Kiste rund 60 % der Höhe, der Rest war leerer Grund.
  //
  // Die Umkugel ist die Ausdehnung, die aus JEDER Richtung stimmt — sie
  // dreht sich mit, die Kante nicht.
  const radius = Math.hypot(laengeM, breiteM, hoeheM) / 2
  const halbesFov = (FOV_GRAD * Math.PI) / 180 / 2
  // Ein schmales Fenster sieht weniger Breite als Höhe; dann entscheidet sie.
  const fuerBreite = seitenverhaeltnis < 1 ? radius / Math.sin(halbesFov) / seitenverhaeltnis : 0
  const abstand = Math.max(radius / Math.sin(halbesFov), fuerBreite) * RAND_FAKTOR

  // Richtung: von vorn-rechts-oben. Normiert, damit der Abstand stimmt.
  const richtung = [0.75, 0.55, 0.9]
  const laenge = Math.hypot(...richtung)
  return {
    position: [
      (richtung[0]! / laenge) * abstand,
      (richtung[1]! / laenge) * abstand,
      (richtung[2]! / laenge) * abstand,
    ],
    ziel: [0, 0, 0],
  }
}

/** Millimeter in Meter — Three rechnet in Metern, das Lager in Millimetern. */
export const mm = (n: number): number => n / 1000
