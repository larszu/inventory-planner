// ───────────────────────────────────────────────────────────────────────────
// Farbe je Abladegruppe (#23).
//
// WARUM NICHT AUS DEN MARKEN-TOKEN. Die Token in `index.css` sind FLÄCHEN und
// SCHRIFT — Navy auf Navy. Zwei Cases nebeneinander in zwei Navy-Tönen sind
// im 3D-Bild nicht zu unterscheiden, und darum geht es hier: die Gruppe ist
// die eine Information, die man von weitem lesen können muss.
//
// Das ist derselbe Fall wie beim Rack im Cable-Planer: Farbe im Bild ist
// INHALT und keine Fläche. Der Wächter `markenPalette` misst deshalb auch nur
// die Token-Schicht der CSS und nicht diese Datei.
//
// SIE LAG BIS 2026-09-18 UNTER `ui/Ladeansicht/`, und das ging so lange gut,
// wie nur Ansichten sie brauchten. Der Ladeplan-Druckbogen (#25) braucht
// dieselben Töne für seine Legende — ein Modul unter `domain/lib/`, das aus
// `ui/` importiert, hätte die Richtung umgedreht, in der dieses Repo gebaut
// ist. Sie ist eine reine Funktion und gehört deshalb hierher.
//
// AUF PAPIER GILT DER GRUND NICHT MEHR. Die Töne sind gegen Deep Navy
// gewählt; „Nebel" ist auf Off-White fast weiss. Wer sie auf ein Blatt
// setzt, umrandet die Fläche — der Druckbogen tut das.
//
// Die Töne sind gegen den Navy-Grund gewählt und liegen weit genug
// auseinander, dass sie auch bei Rot-Grün-Schwäche unterscheidbar bleiben —
// sie unterscheiden sich in Helligkeit UND Farbton, nicht nur im Farbton.
// ───────────────────────────────────────────────────────────────────────────

/** Sieben Töne, danach wiederholen sie sich. Mehr Gruppen liest niemand. */
const TOENE = [
  '#E8B04B', // Sand
  '#5FB3D9', // Eis
  '#7FC29B', // Salbei
  '#D98A6A', // Terrakotta
  '#B39DDB', // Flieder
  '#E2E8F0', // Nebel
  '#8FA1B8', // Stahl
]

/** Für Stücke ohne Gruppe — bewusst der leiseste Ton. */
const OHNE_GRUPPE = '#6E7F96'

/**
 * Die Farbe einer Gruppe.
 *
 * Sie hängt am PLATZ in der Reihenfolge und nicht am Namen: wer eine Gruppe
 * umbenennt, behält ihre Farbe, und wer sie verschiebt, sieht die Änderung.
 * Eine Farbe aus dem Namen zu hashen wäre stabiler gegen Umsortieren und
 * dafür beliebig — „Ton" wäre mal grün, mal lila, je nach Schreibweise.
 */
export function gruppenFarbe(gruppe: string | undefined, reihenfolge: readonly string[]): string {
  if (gruppe === undefined) return OHNE_GRUPPE
  const i = reihenfolge.indexOf(gruppe)
  if (i < 0) return OHNE_GRUPPE
  return TOENE[i % TOENE.length]!
}

export { TOENE as GRUPPEN_TOENE }
