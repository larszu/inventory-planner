// ───────────────────────────────────────────────────────────────────────────
// AUS DER REIFENGRÖSSE DEN RADKASTEN — was sich RECHNEN lässt und was nicht
//
// NUTZER-WUNSCH: „anhand von eintragbarer Reifengröße Radkastengröße
// herleiten und dann anpassen".
//
// ─── WARUM DAS KEIN VERSTOSS GEGEN „NICHTS ERFINDEN" IST ──────────────────
//
// Eine Reifengrösse ist keine Schätzung, sondern eine NORMIERTE ANGABE. In
// „235/65 R16C" steht alles drin, was der Reifen misst:
//
//   235   Nennbreite in Millimetern
//   65    Höhen-Breiten-Verhältnis in Prozent — die Flanke ist 65 % von 235
//   R     Radialbauart (für die Masse ohne Belang, aber Teil der Angabe)
//   16    Felgendurchmesser in ZOLL
//   C     Commercial — Transporterreifen, für die Masse ohne Belang
//
// Daraus folgt der Aussendurchmesser exakt:
//
//   Flanke      = Nennbreite × Verhältnis / 100
//   Durchmesser = Felge × 25,4 + 2 × Flanke
//
// Das ist eine Umrechnung und keine Annahme. Sie steht in der Bauform der
// Bezeichnung selbst (ISO 4000-1 / ETRTO), und jeder Reifenrechner rechnet
// sie genauso.
//
// ─── UND WO DIE RECHNUNG AUFHÖRT ──────────────────────────────────────────
//
// Der RADKASTEN ist nicht der Reifen. Er ist das Gehäuse darum, mit Spiel für
// Federweg und Schneeketten, und dieses Spiel steht in keiner Reifengrösse.
// Zwei der drei Masse folgen trotzdem aus ihr:
//
//   BREITE (quer zum Fahrzeug)  Reifenbreite + Zuschlag
//   LÄNGE  (in Fahrtrichtung)   Aussendurchmesser + Zuschlag
//   HÖHE   (über dem Ladeboden) FOLGT NICHT. Sie hängt davon ab, wie hoch
//                               der Boden über der Achse liegt — eine
//                               Eigenschaft des Aufbaus, nicht des Reifens.
//
// Die Höhe wird deshalb GEFRAGT und nicht gerechnet. Eine hergeleitete Höhe
// sähe im Ladeplan aus wie eine gemessene, und der Packer setzt Kisten
// darauf: wer 200 mm rechnet, wo 320 mm stehen, plant eine Kiste in den
// Radkasten hinein und merkt es am Dock.
//
// Der Zuschlag ist aus demselben Grund ein FELD mit Vorgabe und keine
// Konstante im Code: 30 mm ist üblich, gemessen ist es nicht.
// ───────────────────────────────────────────────────────────────────────────

import { quelle, type Uebersetzen } from '../../i18n/quelle'

/** Ein Zoll in Millimetern. Definiert, nicht gemessen. */
export const ZOLL_MM = 25.4

/** Üblicher Zuschlag je Seite fürs Gehäuse. Vorgabe, kein Messwert. */
export const RADKASTEN_ZUSCHLAG_MM = 30

export interface Reifen {
  /** Nennbreite in mm. */
  breiteMm: number
  /** Höhen-Breiten-Verhältnis in Prozent. */
  verhaeltnis: number
  /** Felgendurchmesser in Zoll. */
  felgeZoll: number
  /** Flankenhöhe in mm — gerechnet. */
  flankeMm: number
  /** Aussendurchmesser in mm — gerechnet. */
  durchmesserMm: number
}

/**
 * Eine Reifenbezeichnung lesen.
 *
 * Angenommen wird die metrische Form mit Verhältnis: `235/65 R16`,
 * `235/65R16C`, `LT235/85 R16`. Die Schreibweisen unterscheiden sich in
 * Leerzeichen und Zusätzen, nicht in den Zahlen.
 *
 * NICHT angenommen wird die Form OHNE Verhältnis (`7.50 R16`, Zollgrössen wie
 * `31x10.50 R15`). Dort steht die Flanke nicht in der Bezeichnung; sie ohne
 * sie zu rechnen hiesse, sie zu raten. `null` ist hier die ehrliche Antwort —
 * die Masse lassen sich dann von Hand eintragen.
 */
export function liesReifen(text: string): Reifen | null {
  const m = /(\d{3})\s*\/\s*(\d{2})\s*[RrDdBb]?\s*(\d{2}(?:\.\d)?)/.exec(text.trim())
  if (!m) return null
  const breiteMm = Number(m[1])
  const verhaeltnis = Number(m[2])
  const felgeZoll = Number(m[3])
  // Grenzen der Bauform: schmaler als 105 mm und breiter als 405 mm gibt es
  // in dieser Schreibweise nicht, und eine Felge unter 10 oder über 24 Zoll
  // faehrt an keinem Transporter. Was ausserhalb liegt, ist ein Tippfehler
  // und keine Reifengroesse — und ein Tippfehler, der durchginge, stuende
  // gleich als Radkasten im Laderaum.
  if (breiteMm < 105 || breiteMm > 405) return null
  if (verhaeltnis < 25 || verhaeltnis > 95) return null
  if (felgeZoll < 10 || felgeZoll > 24) return null

  const flankeMm = (breiteMm * verhaeltnis) / 100
  return {
    breiteMm,
    verhaeltnis,
    felgeZoll,
    flankeMm,
    durchmesserMm: felgeZoll * ZOLL_MM + 2 * flankeMm,
  }
}

/** Die gelesene Grösse als Satz — damit sichtbar ist, was verstanden wurde. */
export function reifenText(r: Reifen, t: Uebersetzen = quelle): string {
  return `${r.breiteMm}/${r.verhaeltnis} R${r.felgeZoll} — ${t('tyre.outer', 'outer diameter')} ${Math.round(r.durchmesserMm)} mm`
}

export interface RadkastenMasse {
  /** Quer zum Fahrzeug, in mm — gerechnet. */
  breiteMm: number
  /** In Fahrtrichtung, in mm — gerechnet. */
  laengeMm: number
}

/**
 * Die zwei Masse, die sich rechnen lassen.
 *
 * Die HÖHE fehlt hier mit Absicht: sie hängt am Abstand zwischen Ladeboden
 * und Achse und steht in keiner Reifengrösse. Wer sie hier zurückgäbe,
 * lieferte eine Zahl, die im Ladeplan wie eine Messung aussieht — und der
 * Packer stapelt darauf.
 */
export function radkastenAusReifen(
  r: Reifen,
  zuschlagMm: number = RADKASTEN_ZUSCHLAG_MM,
): RadkastenMasse {
  const zuschlag = Math.max(0, zuschlagMm)
  return {
    breiteMm: Math.round(r.breiteMm + 2 * zuschlag),
    laengeMm: Math.round(r.durchmesserMm + 2 * zuschlag),
  }
}
