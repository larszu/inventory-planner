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

function text(inhalt: string, x: number, z: number, hoehe: number): string {
  return (
    g(0, 'TEXT') +
    g(8, DXF_EBENE_TEXT) +
    g(10, x) +
    g(20, z) +
    g(30, 0) +
    g(40, hoehe) +
    // Mittig gesetzt: die Beschriftung sitzt in der Tasche und nicht an
    // ihrer Ecke.
    g(72, 1) +
    g(11, x) +
    g(21, z) +
    g(31, 0) +
    g(1, inhalt)
  )
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
    // Die Schrifthöhe folgt der Tasche, bleibt aber lesbar: eine 3-mm-Schrift
    // in einem 40-mm-Fach liest am Schaumblock niemand.
    const hoehe = Math.max(6, Math.min(14, Math.min(tasche.breiteMm, tasche.tiefeMm) / 4))
    s += text(tasche.label, tasche.xMm + tasche.breiteMm / 2, tasche.zMm + tasche.tiefeMm / 2, hoehe)
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
