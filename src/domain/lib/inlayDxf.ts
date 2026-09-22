// ───────────────────────────────────────────────────────────────────────────
// DAS INLAY ALS DXF — die Datei, die zum Schaumzuschnitt geht.
//
// ─── WARUM R12 UND NICHT ETWAS NEUERES ─────────────────────────────────────
//
// Recherchiert am 2026-09-20: R12 (`AC1009`) ist das, was JEDE CAM-Software
// liest, auch die zwanzig Jahre alte Steuerung an einer Fräse im Hinterhof.
// Neuere Fassungen bringen nichts, was ein Zuschnitt braucht.
//
// UND DESHALB KEINE `LWPOLYLINE`. Die ist erst ab R14 dabei — in einer
// R12-Datei ist sie ein Fremdkörper, den mancher Leser still überspringt.
// Ein übersprungener Umriss ist eine Tasche, die nicht geschnitten wird, und
// man sieht es der Datei nicht an. Deshalb die alte Form:
// `POLYLINE` + `VERTEX` + `SEQEND`.
//
// ─── GESCHLOSSENE KONTUREN, SONST NICHTS ───────────────────────────────────
//
// Jeder Umriss ist eine GESCHLOSSENE Polylinie (Gruppe 70, Bit 1). Offene
// Konturen kann eine CAM-Software nicht als Schnittkontur nehmen — sie weiss
// nicht, was innen ist. Keine Splines, keine Ellipsen: beides ist in R12
// entweder nicht da oder wird unterschiedlich ausgelegt.
//
// ─── DIE EINHEIT STEHT IN DER DATEI ────────────────────────────────────────
//
// `$INSUNITS = 4` (Millimeter) und `$MEASUREMENT = 1` (metrisch). Ohne sie
// rät der Leser, und der klassische Fehler ist der Faktor 25,4: ein Inlay,
// das als Zoll gelesen wird, kommt zweieinhalbmal zu gross aus der Fräse.
// Die Datei ist dann nicht kaputt — sie ist falsch, und das merkt man am
// Schaum.
//
// ─── EBENEN TRENNEN, WAS VERSCHIEDENES IST ─────────────────────────────────
//
//   SCHNITT       die Umrisse. Nur das wird geschnitten.
//   RAND          der Rohling. Er sagt dem Zuschnitt, wie gross die Platte
//                 ist — geschnitten wird er meist nicht.
//   BESCHRIFTUNG  welches Fach welches ist. Gehört NICHT in den Schnitt,
//                 und deshalb steht es auf einer eigenen Ebene, die man
//                 abschalten kann.
//
// REIN: keine Uhr, kein Store, kein IO.
// ───────────────────────────────────────────────────────────────────────────
import type { InlayModell } from './inlay'
import { taschenUmriss } from './inlay'

/** Eine Gruppe: Code und Wert, jede auf eigener Zeile. */
const g = (code: number, wert: string | number): string => `${code}\n${wert}\n`

export const DXF_EBENE_SCHNITT = 'SCHNITT'
export const DXF_EBENE_RAND = 'RAND'
export const DXF_EBENE_TEXT = 'BESCHRIFTUNG'

/**
 * Eine geschlossene Polylinie in R12-Form.
 *
 * `66 = 1` heisst „es folgen Vertices" und gehört in R12 dazu; ohne sie
 * hören manche Leser hinter der POLYLINE-Zeile auf. `70 = 1` schliesst sie.
 */
function polylinie(punkte: readonly { x: number; z: number }[], ebene: string): string {
  let s = g(0, 'POLYLINE') + g(8, ebene) + g(66, 1) + g(70, 1)
  for (const p of punkte) {
    // Y IST DIE TIEFE. Ein Zuschnitt sieht von oben auf die Platte; die
    // z-Achse des Innenraums ist dort die y-Achse der Zeichnung.
    s += g(0, 'VERTEX') + g(8, ebene) + g(10, p.x) + g(20, p.z) + g(30, 0)
  }
  return s + g(0, 'SEQEND') + g(8, ebene)
}

function text(inhalt: string, x: number, z: number, hoehe: number, drehung = 0): string {
  return (
    g(0, 'TEXT') +
    g(8, DXF_EBENE_TEXT) +
    g(10, x) +
    g(20, z) +
    g(30, 0) +
    g(40, hoehe) +
    // Gruppe 50: Drehung in Grad. Nur gesetzt, wenn gedreht wird — manche
    // alte Leser stolpern über Gruppen, die sie nicht erwarten.
    (drehung ? g(50, drehung) : '') +
    // Mittig gesetzt, waagrecht (72 = 1) und senkrecht (73 = 2): die
    // Beschriftung sitzt in der Tasche und nicht an ihrer Ecke.
    g(72, 1) +
    g(11, x) +
    g(21, z) +
    g(31, 0) +
    g(73, 2) +
    g(1, inhalt)
  )
}

/**
 * Wie eine Beschriftung in eine Tasche passt.
 *
 * GEMESSEN AM 2026-09-22 an einer Vorschau aus der Datei selbst: „Shure SM58
 * (1/4)" stand in 13 mm Höhe in einer 52 mm breiten Tasche — rund 125 mm
 * Text, und die Namen der Nachbartaschen liefen ineinander. Die Schrift
 * richtete sich nach der Tasche, aber nicht nach der Länge des Namens.
 *
 * Jetzt: entlang der LANGEN Seite, und so gross, dass der Name dort Platz
 * hat. Die Breite wird geschätzt: 0,9 × Höhe je Zeichen. Nicht das Mittel
 * einer Serifenlosen (0,6) — damit lief „Sennheiser EW500 G4 1" im
 * gerenderten DXF über den Taschenrand (gemessen 0,75), und die Schrift, mit
 * der die Schneide-Software rendert, kennen wir nicht; TXT.shx ist breiter.
 *
 * Nicht kleiner als 3 mm: darunter liest es am Schaumblock niemand, und
 * dann ist ein überstehender Name die bessere Auskunft als ein unlesbarer.
 */
export function beschriftung(
  inhalt: string,
  breiteMm: number,
  tiefeMm: number,
): { hoehe: number; drehung: number } {
  const lang = Math.max(breiteMm, tiefeMm)
  const kurz = Math.min(breiteMm, tiefeMm)
  const zeichen = Math.max(1, inhalt.length)
  const passtInLaenge = (lang * 0.85) / (zeichen * 0.9)
  const passtInBreite = kurz * 0.6
  const hoehe = Math.max(3, Math.min(14, passtInLaenge, passtInBreite))
  // Senkrecht nur, wenn die Tasche tiefer als breit ist — sonst liest man
  // den Namen quer, obwohl er waagrecht Platz hätte.
  return { hoehe: Math.round(hoehe * 10) / 10, drehung: tiefeMm > breiteMm ? 90 : 0 }
}

/**
 * Das Inlay als DXF-Text.
 *
 * Die Zeichnung steht auf dem Ursprung, x nach rechts, y in die Tiefe —
 * dieselbe Ecke und dieselben Achsen wie im Innenraum, damit niemand zwei
 * Systeme im Kopf halten muss.
 */
export function buildInlayDxf(modell: InlayModell, titel = ''): string {
  let s = ''

  // ── HEADER: die Einheit, und sonst nichts Überflüssiges ──
  s += g(0, 'SECTION') + g(2, 'HEADER')
  // 4 = Millimeter.
  s += g(9, '$INSUNITS') + g(70, 4)
  // 1 = metrisch. Manche Leser sehen nur diese Variable.
  s += g(9, '$MEASUREMENT') + g(70, 1)
  s += g(9, '$EXTMIN') + g(10, 0) + g(20, 0) + g(30, 0)
  s += g(9, '$EXTMAX') + g(10, modell.aussenMm.widthMm) + g(20, modell.aussenMm.depthMm) + g(30, 0)
  s += g(0, 'ENDSEC')

  // ── TABLES: die Ebenen. Ohne sie legt mancher Leser sie selbst an, und
  //    dann heissen sie anders als hier vereinbart. ──
  s += g(0, 'SECTION') + g(2, 'TABLES')
  s += g(0, 'TABLE') + g(2, 'LAYER') + g(70, 3)
  for (const [name, farbe] of [
    [DXF_EBENE_SCHNITT, 1],
    [DXF_EBENE_RAND, 5],
    [DXF_EBENE_TEXT, 3],
  ] as const) {
    s += g(0, 'LAYER') + g(2, name) + g(70, 0) + g(62, farbe) + g(6, 'CONTINUOUS')
  }
  s += g(0, 'ENDTAB') + g(0, 'ENDSEC')

  // ── ENTITIES ──
  s += g(0, 'SECTION') + g(2, 'ENTITIES')

  // Der Rohling.
  s += polylinie(
    [
      { x: 0, z: 0 },
      { x: modell.aussenMm.widthMm, z: 0 },
      { x: modell.aussenMm.widthMm, z: modell.aussenMm.depthMm },
      { x: 0, z: modell.aussenMm.depthMm },
    ],
    DXF_EBENE_RAND,
  )

  for (const tasche of modell.taschen) {
    s += polylinie(taschenUmriss(tasche), DXF_EBENE_SCHNITT)
    const { hoehe, drehung } = beschriftung(tasche.label, tasche.breiteMm, tasche.tiefeMm)
    s += text(
      tasche.label,
      tasche.xMm + tasche.breiteMm / 2,
      tasche.zMm + tasche.tiefeMm / 2,
      hoehe,
      drehung,
    )
  }

  if (titel) {
    // Der Titel steht AUSSERHALB des Rohlings, damit er keine Tasche
    // überdeckt — und auf der Text-Ebene, die man abschalten kann.
    s += text(titel, modell.aussenMm.widthMm / 2, -12, 10)
  }

  s += g(0, 'ENDSEC')
  s += g(0, 'EOF')
  return s
}
