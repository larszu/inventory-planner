// ───────────────────────────────────────────────────────────────────────────
// DIE ANDEREN DREI AUSBAU-ARTEN — Divider, Schubladen, Rack.
//
// `caseLayout.ts` rechnet den SCHAUM: je Stück ein geschnittenes Fach. Diese
// Datei rechnet die drei anderen, und sie stehen hier zusammen, weil sie
// dieselbe Frage anders beantworten: wie ist das Innere geteilt?
//
// ─── WARUM NICHT ALLES DERSELBE RECHNER ────────────────────────────────────
//
// Weil die Fächer aus etwas anderem entstehen:
//
//   Schaum      aus den STÜCKEN. Jedes bekommt seinen Ausschnitt; die
//               Aufteilung folgt dem, was hineinsoll.
//   Divider     aus der TEILUNG. Die Fächer stehen fest, bevor etwas darin
//               liegt — wer umräumt, steckt die Wand um. Die Frage lautet
//               deshalb umgekehrt: was passt in welches Fach?
//   Schubladen  aus den AUSZÜGEN. Jeder ist ein eigener kleiner Innenraum.
//   Rack        aus HÖHENEINHEITEN. Millimeter spielen quer keine Rolle;
//               ein 19-Zoll-Gerät ist 19 Zoll breit, das ist der Sinn.
//
// Ein Rechner, der alle vier könnte, hätte vier Zweige und eine Signatur,
// die für jeden Fall das Falsche verlangt.
//
// ─── UND WAS ALLE VIER TEILEN ──────────────────────────────────────────────
//
// `innenmass()` aus `caseLayout.ts`. Es gibt genau eine Antwort auf „was hat
// innen Platz", und sie wird nicht viermal gegeben.
//
// REIN: keine Uhr, kein Store, kein IO.
// ───────────────────────────────────────────────────────────────────────────
import { format, quelle, type Uebersetzen } from '../../i18n/quelle'
import type { CaseInnenmass, DividerRaster, RackAusbau, Schublade } from '../types/caseAusbau'
import type { CaseStueck, OhnePlatz } from './caseLayout'

// ── DIVIDER ────────────────────────────────────────────────────────────────

/** Ein Fach einer Divider-Teilung. */
export interface DividerFach {
  /** Spalte und Reihe, 0-basiert — die Adresse im Raster. */
  spalte: number
  reihe: number
  /** Laufende Nummer, 1-basiert, zeilenweise. Das steht im Bild. */
  nr: number
  xMm: number
  zMm: number
  breiteMm: number
  tiefeMm: number
  /** Was in diesem Fach liegt, soweit zugeordnet. */
  stuecke: { id: string; label: string }[]
}

export interface DividerPlan {
  faecher: DividerFach[]
  ohnePlatz: OhnePlatz[]
  /** Summe der Fachflächen gegen die Innenfläche, 0..1. */
  ausnutzung: number
  /** Wieviel die Trennwände selbst wegnehmen, in mm² — das fehlt dem Inhalt. */
  stegFlaecheMm2: number
}

/**
 * Die Fächer einer Teilung ausrechnen und die Stücke einsortieren.
 *
 * ─── DIE TEILUNG IST DIE VORGABE, NICHT DAS ERGEBNIS ───────────────────────
 *
 * Anders als beim Schaum wird hier NICHTS an die Stücke angepasst. Die Wände
 * stehen, wo der Nutzer sie hingesteckt hat; gefragt wird, was hineinpasst.
 * Ein Rechner, der die Teilung „optimiert", nähme dem Nutzer die
 * Entscheidung ab, die er mit dem Einstecken gerade getroffen hat.
 *
 * Einsortiert wird GRÖSSTES ZUERST in das kleinste passende Fach. Das ist
 * die Regel, nach der auch ein Mensch einräumt — und sie ist deterministisch,
 * was hier zählt: dasselbe Case muss beim zweiten Öffnen gleich aussehen.
 */
export function dividerPlan(
  innen: Required<CaseInnenmass>,
  raster: DividerRaster,
  stuecke: readonly CaseStueck[],
  stegMm: number,
  t: Uebersetzen = quelle,
): DividerPlan {
  const faecher: DividerFach[] = []
  let nr = 0
  let z = 0
  for (let reihe = 0; reihe < raster.reihenMm.length; reihe += 1) {
    const tiefe = raster.reihenMm[reihe]!
    let x = 0
    for (let spalte = 0; spalte < raster.spaltenMm.length; spalte += 1) {
      const breite = raster.spaltenMm[spalte]!
      nr += 1
      faecher.push({ spalte, reihe, nr, xMm: x, zMm: z, breiteMm: breite, tiefeMm: tiefe, stuecke: [] })
      x += breite + stegMm
    }
    z += tiefe + stegMm
  }

  const ohnePlatz: OhnePlatz[] = []
  // Belegte Grundfläche je Fach — ein Fach nimmt mehrere Stücke auf, solange
  // die Fläche reicht. Das ist eine Näherung und sie steht als solche da:
  // zwei Dinge nebeneinander in einem Fach sind kein gerechnetes Packen.
  const belegt = new Map<number, number>()

  const kandidaten = [...stuecke]
    .filter((s) => {
      const ok = s.sizeMm.x > 0 && s.sizeMm.y > 0 && s.sizeMm.z > 0
      if (!ok) {
        ohnePlatz.push({
          stueckId: s.id,
          label: s.label,
          grund: 'keine-masse',
          text: t('caseLayout.noSize', 'No dimensions recorded for this item — it cannot be given a compartment.'),
        })
      }
      return ok
    })
    .sort(
      (a, b) =>
        b.sizeMm.x * b.sizeMm.z - a.sizeMm.x * a.sizeMm.z || a.id.localeCompare(b.id),
    )

  for (const s of kandidaten) {
    // Das KLEINSTE passende Fach, damit ein grosses nicht von einem kleinen
    // Stück blockiert wird.
    const passend = faecher
      .filter((f) => {
        const passtGerade = s.sizeMm.x <= f.breiteMm && s.sizeMm.z <= f.tiefeMm
        const passtQuer = s.sizeMm.z <= f.breiteMm && s.sizeMm.x <= f.tiefeMm
        if (!passtGerade && !passtQuer) return false
        if (s.sizeMm.y > innen.heightMm) return false
        const frei = f.breiteMm * f.tiefeMm - (belegt.get(f.nr) ?? 0)
        return frei >= s.sizeMm.x * s.sizeMm.z
      })
      .sort((a, b) => a.breiteMm * a.tiefeMm - b.breiteMm * b.tiefeMm || a.nr - b.nr)[0]

    if (!passend) {
      const zuGross =
        s.sizeMm.y > innen.heightMm ||
        !faecher.some(
          (f) =>
            (s.sizeMm.x <= f.breiteMm && s.sizeMm.z <= f.tiefeMm) ||
            (s.sizeMm.z <= f.breiteMm && s.sizeMm.x <= f.tiefeMm),
        )
      ohnePlatz.push({
        stueckId: s.id,
        label: s.label,
        grund: zuGross ? 'zu-gross' : 'kein-platz',
        text: zuGross
          ? format(
              t('divider.tooBig', '{label} does not fit into any compartment of this division.'),
              { label: s.label },
            )
          : format(t('divider.full', 'Every compartment that fits {label} is full.'), { label: s.label }),
      })
      continue
    }
    passend.stuecke.push({ id: s.id, label: s.label })
    belegt.set(passend.nr, (belegt.get(passend.nr) ?? 0) + s.sizeMm.x * s.sizeMm.z)
  }

  const innenFlaeche = innen.widthMm * innen.depthMm
  const fachFlaeche = faecher.reduce((n, f) => n + f.breiteMm * f.tiefeMm, 0)
  return {
    faecher,
    ohnePlatz,
    ausnutzung: innenFlaeche > 0 ? Math.min(1, fachFlaeche / innenFlaeche) : 0,
    stegFlaecheMm2: Math.max(0, innenFlaeche - fachFlaeche),
  }
}

/**
 * Eine gleichmässige Teilung vorschlagen.
 *
 * Ein Startpunkt und keine Empfehlung: der Nutzer steckt die Wände danach
 * dorthin, wo er sie braucht. Die Restmillimeter landen in der LETZTEN
 * Spalte und werden nicht verteilt — verteilte Reste ergäben krumme Masse,
 * nach denen niemand eine Wand absägt.
 */
export function gleichmaessigeTeilung(
  innen: Required<CaseInnenmass>,
  spalten: number,
  reihen: number,
  stegMm: number,
): DividerRaster {
  const teile = (gesamt: number, n: number): number[] => {
    if (n < 1) return []
    const netto = gesamt - stegMm * (n - 1)
    if (netto <= 0) return []
    const breite = Math.floor(netto / n)
    const raus = Array.from({ length: n }, () => breite)
    raus[n - 1] = netto - breite * (n - 1)
    return raus
  }
  return { spaltenMm: teile(innen.widthMm, spalten), reihenMm: teile(innen.depthMm, reihen) }
}

// ── SCHUBLADEN ─────────────────────────────────────────────────────────────

export interface SchubladenLage {
  schublade: Schublade
  /** Unterkante über dem Innenboden. */
  yMm: number
  hoeheMm: number
}

export interface SchubladenPlan {
  lagen: SchubladenLage[]
  /** Höhe, die über dem obersten Auszug frei bleibt. */
  restHoeheMm: number
  /** Auszüge ohne Höhenangabe — sie werden nicht gestapelt. */
  ohneHoehe: string[]
  /** Die Summe der Auszüge ist höher als das Case. */
  passtNicht: boolean
}

/**
 * Die Auszüge übereinander legen.
 *
 * VON UNTEN NACH OBEN in der Reihenfolge der Liste, und die ist die des
 * Nutzers: welcher Auszug unten sitzt, ist eine Entscheidung (das Schwere
 * nach unten) und kein Rechenergebnis.
 *
 * Ein Auszug ohne Höhenangabe wird NICHT geschätzt. Er steht in `ohneHoehe`,
 * und die Oberfläche sagt es — eine angenommene Höhe verschöbe jeden Auszug
 * darüber.
 */
export function schubladenPlan(
  innen: Required<CaseInnenmass>,
  schubladen: readonly Schublade[],
): SchubladenPlan {
  const lagen: SchubladenLage[] = []
  const ohneHoehe: string[] = []
  let y = 0
  for (const s of schubladen) {
    if (!s.hoeheMm || s.hoeheMm <= 0) {
      ohneHoehe.push(s.id)
      continue
    }
    lagen.push({ schublade: s, yMm: y, hoeheMm: s.hoeheMm })
    y += s.hoeheMm
  }
  return {
    lagen,
    restHoeheMm: Math.max(0, innen.heightMm - y),
    ohneHoehe,
    passtNicht: y > innen.heightMm,
  }
}

// ── RACK ───────────────────────────────────────────────────────────────────

/** Eine Höheneinheit und was darin sitzt. */
export interface RackEinheit {
  /** 1-basiert, von UNTEN gezählt — so zählt die Branche. */
  he: number
  belegtVon?: string
}

/** Was der Plan über die Bestückung sagt. Eine Zeile je Gerät. */
export interface RackBelegung {
  startHE: number
  hoeheHE: number
  label: string
  /**
   * Nur Front-, nur Rückschiene oder beide. Fehlt: beide.
   *
   * Eine Patchblende hinter einem kurzen Gerät in derselben HE ist Absicht
   * und keine Doppelbelegung — der Plan baut das so (`mountSide`).
   */
  seite?: 'front' | 'rear' | 'full'
}

export interface RackPlan {
  einheiten: RackEinheit[]
  /** Freie Höheneinheiten. */
  freiHE: number
  befunde: RackBefund[]
}

export interface RackBefund {
  art: 'keine-hoehe' | 'ueberbelegt' | 'ueberlappung' | 'kein-plan' | 'plan-hoeher' | 'plan-fehlt'
  text: string
}

/**
 * Das Rack als Höheneinheiten.
 *
 * ─── WER WAS BESITZT ───────────────────────────────────────────────────────
 *
 * Das LEERE Rack gehört dem Lager: wieviele HE das Case hat, ist eine
 * Eigenschaft des Gegenstands. Die BESTÜCKUNG gehört dem Signal-Plan — dort
 * hängen Geräte, Ports und die interne Verkabelung daran.
 *
 * Diese Funktion bekommt die Bestückung deshalb HEREINGEREICHT und holt sie
 * sich nicht: das Lager darf kein Plan-Modell kennen (ADR-006). Ohne
 * Bestückung zeigt sie das leere Rack und sagt, dass der Plan nicht
 * angeschlossen ist — statt „leer" zu behaupten.
 *
 * ─── UND DER BEFUND, DEN ES VORHER NICHT GEBEN KONNTE ──────────────────────
 *
 * Belegt der Plan HE 1–14 und hat das Case zwölf, sagt das hier jemand,
 * bevor der LKW fährt. Genau dafür ist die Trennung da: zwei Seiten, die
 * dasselbe Ding beschreiben, und eine Stelle, die den Widerspruch bemerkt.
 */
export function rackPlan(
  rack: RackAusbau | undefined,
  belegung: readonly RackBelegung[] | undefined,
  t: Uebersetzen = quelle,
): RackPlan {
  const befunde: RackBefund[] = []
  const hoehe = rack?.hoeheHE
  if (!hoehe || hoehe <= 0) {
    befunde.push({
      art: 'keine-hoehe',
      text: t(
        'rack.noHeight',
        'No rack height recorded for this case. How many units it has is a property of the case — the plan cannot answer it.',
      ),
    })
    return { einheiten: [], freiHE: 0, befunde }
  }

  const einheiten: RackEinheit[] = Array.from({ length: hoehe }, (_, i) => ({ he: i + 1 }))

  if (!belegung) {
    befunde.push({
      art: 'kein-plan',
      text: t(
        'rack.noPlan',
        'No rack layout connected from the signal plan. The case is shown empty — that is not a statement that it is empty.',
      ),
    })
    return { einheiten, freiHE: hoehe, befunde }
  }

  // Je HE: wer vorn und wer hinten sitzt. `full` belegt beide Seiten.
  const vorn = new Map<number, string>()
  const hinten = new Map<number, string>()
  for (const b of belegung) {
    const seite = b.seite ?? 'full'
    for (let i = 0; i < b.hoeheHE; i += 1) {
      const he = b.startHE + i
      const einheit = einheiten[he - 1]
      if (!einheit) continue
      const andere =
        (seite !== 'rear' ? vorn.get(he) : undefined) ?? (seite !== 'front' ? hinten.get(he) : undefined)
      if (andere && andere !== b.label) {
        befunde.push({
          art: 'ueberlappung',
          text: format(t('rack.overlap', 'Unit {he}: {a} and {b} are planned on top of each other.'), {
            he,
            a: andere,
            b: b.label,
          }),
        })
      }
      if (seite !== 'rear') vorn.set(he, b.label)
      if (seite !== 'front') hinten.set(he, b.label)
      einheit.belegtVon = einheit.belegtVon && einheit.belegtVon !== b.label ? `${einheit.belegtVon} / ${b.label}` : b.label
    }
    const oben = b.startHE + b.hoeheHE - 1
    if (oben > hoehe) {
      befunde.push({
        art: 'ueberbelegt',
        text: format(
          t('rack.tooTall', '{label} reaches to unit {oben}, but this case has {hoehe}.'),
          { label: b.label, oben, hoehe },
        ),
      })
    }
  }

  return { einheiten, freiHE: einheiten.filter((e) => !e.belegtVon).length, befunde }
}

/** Was der Plan über ein Rack herüberreicht (`avplan-rack-belegung`). */
export interface PlanBestueckung {
  /** Höheneinheiten, für die der Plan das Rack gebaut hat. */
  hoeheHE: number
  belegung: readonly RackBelegung[]
}

/**
 * Das Rack gegen die Bestückung des Plans.
 *
 * Zusätzlich zu `rackPlan` zwei Befunde, die erst mit der Datei des Plans
 * möglich sind:
 *
 *   plan-fehlt    Das Case trägt eine Kennung, die die zuletzt eingelesene
 *                 Datei nicht kennt — der Plan hat das Rack gelöscht oder
 *                 umbenannt. NICHT „leer": das wäre eine Aussage über das
 *                 Rack, die niemand gemacht hat.
 *   plan-hoeher   Der Plan baut das Rack für mehr HE, als das Case hat. Auch
 *                 wenn heute alles unten sitzt: wer im Plan oben etwas
 *                 ergänzt, bekommt kein Nein.
 */
export function rackGegenPlan(
  rack: RackAusbau | undefined,
  plan: PlanBestueckung | undefined,
  /** Liegt überhaupt eine Datei des Plans vor? Ohne sie fehlt kein Rack
   *  darin — dann ist schlicht nichts angeschlossen. */
  dateiEingelesen: boolean,
  t: Uebersetzen = quelle,
): RackPlan {
  if (rack?.planRef && !plan && dateiEingelesen) {
    const r = rackPlan(rack, undefined, t)
    return {
      ...r,
      befunde: [
        ...r.befunde.filter((b) => b.art !== 'kein-plan'),
        {
          art: 'plan-fehlt',
          text: format(
            t(
              'rack.planMissing',
              'The rack “{ref}” is not in the last file from the signal plan. It may have been renamed or deleted there — the case is shown empty, which is not a statement that it is empty.',
            ),
            { ref: rack.planRef },
          ),
        },
      ],
    }
  }
  const r = rackPlan(rack, plan?.belegung, t)
  const hoehe = rack?.hoeheHE
  if (plan && hoehe && plan.hoeheHE > hoehe) {
    r.befunde.push({
      art: 'plan-hoeher',
      text: format(
        t('rack.planTaller', 'The signal plan builds this rack with {plan} units; this case has {hoehe}.'),
        { plan: plan.hoeheHE, hoehe },
      ),
    })
  }
  return r
}
