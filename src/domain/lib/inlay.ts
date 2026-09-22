// ───────────────────────────────────────────────────────────────────────────
// DAS INLAY — aus dem Layout wird etwas, das man schneiden oder drucken kann.
//
// ─── DER UNTERSCHIED ZWISCHEN LAYOUT UND INLAY ─────────────────────────────
//
// `caseLayout.ts` beantwortet „passt es hinein" und legt die Stücke auf ihre
// WAHREN Masse. Das Inlay beantwortet „wie schneide ich das", und dafür sind
// die wahren Masse falsch: ein Fach, das exakt so gross ist wie das Gerät,
// nimmt es nicht auf. Es braucht SPIEL.
//
// Deshalb zwei Module und nicht eines. Das Layout darf nicht wissen, ob am
// Ende Schaum gefräst oder ein Einsatz gedruckt wird — und der Zuschnitt
// darf die Frage „passt es" nicht anders beantworten als die Ansicht.
//
// ─── DIE ZAHLEN, UND WOHER SIE KOMMEN ──────────────────────────────────────
//
// Recherchiert am 2026-09-20 (Quellen im PR):
//
//   SPIEL        0,5–1 mm je Seite für einen haltenden Sitz; 0,3 mm und
//                enger nur dort, wo nichts klappern darf. Vorgabe hier:
//                1 mm, weil ein Case über die Autobahn fährt und ein zu
//                enges Fach beim Einräumen im Dunkeln nicht getroffen wird.
//   GRIFFMULDE   Ohne sie hebeln Leute die Geräte heraus und reissen die
//                Fachkanten ein. Sie ist deshalb VORGEGEBEN an und nicht
//                eine Zierde, die man dazuschaltet.
//   STEG         bleibt der des Layouts. Das Spiel frisst ihn von beiden
//                Seiten an — deshalb wird er hier nachgerechnet und, wenn
//                er zu dünn wird, GEMELDET statt stillschweigend verkleinert.
//
// Alle drei sind WERKSTATTZAHLEN und keine Physik — dieselbe Ehrlichkeit wie
// bei `VORGABE_STUETZUNG` im Ladepacker. Wer es besser weiss, stellt es ein.
//
// ─── WAS ES NICHT TUT ──────────────────────────────────────────────────────
//
// Es rechnet ohne Innenmass GAR NICHTS. Dieselbe Regel wie im Layout, und
// hier wiegt sie schwerer: nach einem Layout räumt jemand um, nach einem
// Inlay schneidet jemand einen Schaumblock, den es danach nicht mehr gibt.
//
// REIN: keine Uhr, kein Store, kein IO.
// ───────────────────────────────────────────────────────────────────────────
import { format, quelle, type Uebersetzen } from '../../i18n/quelle'
import type { CaseInnenmass } from '../types/caseAusbau'
import type { CaseLage } from './caseLayout'

/**
 * Spiel je Seite in mm.
 *
 * 1 mm: recherchierte Spanne ist 0,5–1 mm für einen haltenden Sitz. Das
 * obere Ende, weil ein Case transportiert und im Halbdunkel eingeräumt wird
 * — ein Fach, das man treffen muss, ist keins.
 */
export const VORGABE_SPIEL_MM = 1

/**
 * Breite und Tiefe der Griffmulde in mm.
 *
 * Ohne Mulde hebelt man die Geräte an der Fachkante heraus, und die Kante
 * reisst ein. 40 mm ist die Breite von zwei Fingern, 25 mm reichen, um
 * darunter zu greifen.
 */
export const VORGABE_GRIFF_BREITE_MM = 40
export const VORGABE_GRIFF_TIEFE_MM = 25

/**
 * Ab wann ein Steg zu dünn ist, in mm.
 *
 * Unter 8 mm bricht eine Schaumwand beim Herausnehmen aus. Sie steht dann
 * immer noch in der Datei — gemeldet wird sie trotzdem, damit niemand sie
 * erst am Schaumblock bemerkt.
 */
export const MINDEST_STEG_MM = 8

/** Eine Tasche des Inlays — das, was WIRKLICH geschnitten wird. */
export interface InlayTasche {
  id: string
  label: string
  /** Ecke hinten-links, im Innenraum. Enthält das Spiel bereits. */
  xMm: number
  zMm: number
  breiteMm: number
  tiefeMm: number
  /** Wie tief ausgefräst wird, vom Inlay-Rücken aus. */
  frästiefeMm: number
  /** Die Griffmulde an der Vorderkante, wenn eine passt. */
  griff?: { xMm: number; breiteMm: number; tiefeMm: number }
}

export type InlayBefundArt =
  | 'kein-innenmass'
  | 'steg-zu-duenn'
  | 'ueber-rand'
  | 'keine-griffmulde'
  | 'hoehe-knapp'

export interface InlayBefund {
  art: InlayBefundArt
  text: string
}

export interface InlayModell {
  /** Der Rohling: so gross ist die Platte, aus der geschnitten wird. */
  aussenMm: Required<CaseInnenmass>
  /** Boden unter den Taschen — was stehen bleibt, damit nichts durchfällt. */
  bodenMm: number
  taschen: InlayTasche[]
  befunde: InlayBefund[]
  /** Das Spiel, mit dem gerechnet wurde. */
  spielMm: number
}

export interface InlayOptionen {
  spielMm?: number
  /** Boden unter den Taschen. 0 heisst durchgehende Ausschnitte. */
  bodenMm?: number
  griffBreiteMm?: number
  griffTiefeMm?: number
  /** Keine Griffmulden. Für Inlays, aus denen nichts herausgenommen wird. */
  ohneGriff?: boolean
}

/**
 * Aus EINER Lage ein Inlay machen.
 *
 * JE LAGE EIN INLAY, und das ist keine Vereinfachung, sondern die Bauweise:
 * ein Schaumausbau in zwei Lagen sind zwei Platten übereinander, und jede
 * wird einzeln geschnitten. Ein Inlay über beide Lagen gäbe es nur als
 * Block mit Taschen verschiedener Tiefe — den kann eine Fräse schneiden,
 * ein Schaumzuschnitt aber nicht.
 *
 * Die TASCHENTIEFE folgt dem Stück und nicht der Lage: ein flaches Gerät
 * neben einem hohen bekommt eine flache Tasche, und dann liegt es nicht
 * versenkt, wo niemand es greift.
 */
export function erzeugeInlay(
  lage: CaseLage,
  innen: Required<CaseInnenmass> | null,
  optionen: InlayOptionen = {},
  t: Uebersetzen = quelle,
): InlayModell | null {
  if (!innen) return null
  const spielMm = optionen.spielMm ?? VORGABE_SPIEL_MM
  const bodenMm = optionen.bodenMm ?? 0
  const griffBreite = optionen.griffBreiteMm ?? VORGABE_GRIFF_BREITE_MM
  const griffTiefe = optionen.griffTiefeMm ?? VORGABE_GRIFF_TIEFE_MM
  const befunde: InlayBefund[] = []

  const plattenHoehe = lage.hoeheMm + bodenMm

  const taschen: InlayTasche[] = lage.faecher.map((f) => {
    // Das Spiel wächst NACH AUSSEN, je Seite. Die Tasche beginnt also
    // früher und ist zweimal Spiel breiter.
    const x = f.xMm - spielMm
    const z = f.zMm - spielMm
    const breite = f.breiteMm + 2 * spielMm
    const tiefe = f.tiefeMm + 2 * spielMm
    return {
      id: f.stueckId,
      label: f.label,
      xMm: x,
      zMm: z,
      breiteMm: breite,
      tiefeMm: tiefe,
      // Bis auf den Boden, aber nie tiefer als die Platte.
      frästiefeMm: Math.min(f.hoeheMm, plattenHoehe),
    }
  })

  // ── Was über den Rohling hinausragt ──
  //
  // Das Spiel kann eine Tasche über die Kante schieben. Sie wird NICHT
  // zurückgeschoben: dann läge sie woanders als im Layout, und das Bild auf
  // dem Bildschirm stimmte nicht mehr mit der Datei überein.
  for (const tasche of taschen) {
    if (
      tasche.xMm < 0 ||
      tasche.zMm < 0 ||
      tasche.xMm + tasche.breiteMm > innen.widthMm ||
      tasche.zMm + tasche.tiefeMm > innen.depthMm
    ) {
      befunde.push({
        art: 'ueber-rand',
        text: format(
          t(
            'inlay.overEdge',
            'With {spiel} mm of clearance the pocket for {label} reaches past the edge of the blank. Reduce the clearance, or the piece does not belong in this layer.',
          ),
          { spiel: spielMm, label: tasche.label },
        ),
      })
    }
  }

  // ── Griffmulden ──
  if (!optionen.ohneGriff) {
    for (const tasche of taschen) {
      const mulde = griffMulde(tasche, taschen, innen, griffBreite, griffTiefe)
      if (mulde) tasche.griff = mulde
      else
        befunde.push({
          art: 'keine-griffmulde',
          text: format(
            t(
              'inlay.noGrip',
              'No room for a finger notch at {label}. Without one the pocket edge gets torn when the piece is pried out.',
            ),
            { label: tasche.label },
          ),
        })
    }
  }

  // ── Stege ──
  //
  // GEMESSEN und nicht aus dem Layout übernommen: dort stand der Steg VOR
  // dem Spiel, und das Spiel frisst ihn von beiden Seiten an.
  const duenn = duenneStege(taschen)
  if (duenn.length > 0) {
    befunde.push({
      art: 'steg-zu-duenn',
      text: format(
        t(
          'inlay.thinWeb',
          'Between {paar} only {mm} mm of material are left. Under {min} mm a foam web breaks out when a piece is lifted.',
        ),
        { paar: duenn[0]!.paar, mm: Math.round(duenn[0]!.mm), min: MINDEST_STEG_MM },
      ),
    })
  }

  if (bodenMm > 0 && bodenMm < 5) {
    befunde.push({
      art: 'hoehe-knapp',
      text: format(
        t('inlay.thinFloor', 'A floor of {mm} mm carries little. Under a heavy piece it gives way.'),
        { mm: bodenMm },
      ),
    })
  }

  return {
    aussenMm: { widthMm: innen.widthMm, depthMm: innen.depthMm, heightMm: plattenHoehe },
    bodenMm,
    taschen,
    befunde,
    spielMm,
  }
}

/**
 * Die Griffmulde an der VORDERKANTE der Tasche.
 *
 * Vorne, weil dort jemand steht. Sie ragt nach vorn aus der Tasche heraus
 * und muss dort Platz haben: weder über den Rohling hinaus noch in die
 * nächste Tasche hinein. Findet sie keinen, gibt es sie nicht — eine
 * Mulde, die in die Nachbartasche schneidet, verbindet zwei Fächer.
 */
function griffMulde(
  tasche: InlayTasche,
  alle: readonly InlayTasche[],
  innen: Required<CaseInnenmass>,
  breite: number,
  tiefe: number,
): InlayTasche['griff'] {
  // Mittig an der Vorderkante (grösseres z).
  const b = Math.min(breite, tasche.breiteMm)
  const x = tasche.xMm + (tasche.breiteMm - b) / 2
  const z0 = tasche.zMm + tasche.tiefeMm
  const z1 = z0 + tiefe
  if (z1 > innen.depthMm) return undefined

  for (const andere of alle) {
    if (andere.id === tasche.id) continue
    const ueberlappt =
      x < andere.xMm + andere.breiteMm &&
      x + b > andere.xMm &&
      z0 < andere.zMm + andere.tiefeMm &&
      z1 > andere.zMm
    if (ueberlappt) return undefined
  }
  return { xMm: x, breiteMm: b, tiefeMm: tiefe }
}

/** Taschenpaare, zwischen denen zu wenig Material steht. */
function duenneStege(taschen: readonly InlayTasche[]): { paar: string; mm: number }[] {
  const raus: { paar: string; mm: number }[] = []
  for (let i = 0; i < taschen.length; i += 1) {
    for (let j = i + 1; j < taschen.length; j += 1) {
      const a = taschen[i]!
      const b = taschen[j]!
      // Nur benachbarte Paare zählen: zwei Taschen, die sich in einer Achse
      // gar nicht überlappen, haben keinen gemeinsamen Steg.
      const xLuecke = Math.max(a.xMm - (b.xMm + b.breiteMm), b.xMm - (a.xMm + a.breiteMm))
      const zLuecke = Math.max(a.zMm - (b.zMm + b.tiefeMm), b.zMm - (a.zMm + a.tiefeMm))
      const ueberlapptX = xLuecke < 0
      const ueberlapptZ = zLuecke < 0
      if (ueberlapptX && zLuecke >= 0 && zLuecke < MINDEST_STEG_MM) {
        raus.push({ paar: `${a.label} / ${b.label}`, mm: zLuecke })
      } else if (ueberlapptZ && xLuecke >= 0 && xLuecke < MINDEST_STEG_MM) {
        raus.push({ paar: `${a.label} / ${b.label}`, mm: xLuecke })
      }
    }
  }
  return raus.sort((x, y) => x.mm - y.mm)
}

/**
 * Der Umriss einer Tasche samt Griffmulde, als geschlossener Polygonzug.
 *
 * EIN Umriss und nicht zwei Rechtecke: der Zuschnitt verlangt geschlossene
 * Konturen, und zwei sich überlappende Konturen sind für eine CAM-Software
 * ein Widerspruch — sie weiss dann nicht, was innen ist.
 *
 * Gegen den Uhrzeigersinn, beginnend hinten-links.
 */
export function taschenUmriss(tasche: InlayTasche): { x: number; z: number }[] {
  const { xMm: x, zMm: z, breiteMm: b, tiefeMm: tf, griff } = tasche
  if (!griff) {
    return [
      { x, z },
      { x: x + b, z },
      { x: x + b, z: z + tf },
      { x, z: z + tf },
    ]
  }
  const g0 = griff.xMm
  const g1 = griff.xMm + griff.breiteMm
  const zv = z + tf
  const zg = zv + griff.tiefeMm
  // Deckt die Mulde die ganze Vorderkante, entsteht ein einfaches Rechteck
  // statt eines Umrisses mit zwei Punkten auf einer Geraden.
  if (g0 <= x && g1 >= x + b) {
    return [
      { x, z },
      { x: x + b, z },
      { x: x + b, z: zg },
      { x, z: zg },
    ]
  }
  return [
    { x, z },
    { x: x + b, z },
    { x: x + b, z: zv },
    { x: g1, z: zv },
    { x: g1, z: zg },
    { x: g0, z: zg },
    { x: g0, z: zv },
    { x, z: zv },
  ]
}
