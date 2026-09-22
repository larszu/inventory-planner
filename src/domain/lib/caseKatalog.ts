// ───────────────────────────────────────────────────────────────────────────
// DER CASE-KATALOG — Vorlagen für Schalen.
//
// NUTZER, 2026-09-20: „Es muss auch zum Beispiel peli cases und nanuk cases
// geben und man muss selbst welche anlegen können."
//
// ─── WARUM HIER KEINE HERSTELLER-MASSE STEHEN ──────────────────────────────
//
// Weil sie nicht nachgeprüft werden konnten. Diese Arbeitsumgebung erreicht
// weder `peli.com` noch `nanukcases.com` (gemessen: beide Verbindungen
// laufen ins Leere). Masse aus dem Gedächtnis einzutragen hiesse, Zahlen
// hinzuschreiben, die auf dem Bildschirm neben „Peli 1510" stehen und damit
// wie eine Herstellerangabe aussehen — und jemand schneidet danach Schaum.
//
// Das ist GENAU die Regel, gegen die dieses ganze Werkzeug gebaut ist:
// „Nichts erfinden. Fehlt eine Angabe, fehlt sie — keine Vorgabe, die wie
// eine Messung aussieht." Sie hier zu brechen, um eine Liste voller
// aussehen zu lassen, wäre der teuerste Fehler im Repo.
//
// Was stattdessen hier steht, sind die MODELLNAMEN als Vorlagen ohne Masse.
// Sie sparen das Tippen und die Schreibweise; die Zahlen trägt ein, wer
// nachgemessen oder das Datenblatt vor sich hat — einmal, und dann steht die
// Vorlage für alle weiteren Cases desselben Modells.
//
// ─── DIE HERKUNFT STEHT AN JEDER ZAHL ──────────────────────────────────────
//
// `herkunft` ist kein Beiwerk, sondern der Grund, aus dem dieser Katalog
// überhaupt vertretbar ist. Eine gemessene Zahl, eine Datenblatt-Zahl und
// eine unbekannte sehen sonst gleich aus — und beim Zuschnitt zählt der
// Unterschied.
//
// REIN: keine Uhr, kein Store, kein IO.
// ───────────────────────────────────────────────────────────────────────────
import { format, quelle, type Uebersetzen } from '../../i18n/quelle'
import type { AusbauArt, CaseInnenmass } from '../types/caseAusbau'
import type { PhysicalDimensions } from '../types/inventory'

/** Woher die Masse einer Vorlage stammen. */
export type MassHerkunft =
  /** Jemand in diesem Haus hat nachgemessen. */
  | 'gemessen'
  /** Aus einem Datenblatt übernommen; `quelle` sagt, aus welchem. */
  | 'hersteller'
  /** Der Name steht, die Masse nicht. Kein Defekt — eine offene Frage. */
  | 'unbekannt'

export interface KatalogCase {
  id: string
  /** „Peli", „Nanuk", „Thon", „Eigenbau". */
  hersteller: string
  /** „1510", „935", „Rack 12 HE". */
  modell: string
  /** Aussenmasse und Leergewicht. */
  aussenMm?: PhysicalDimensions
  /** Gemessene Innenmasse, wenn bekannt. */
  innenMm?: CaseInnenmass
  /** Welcher Innenausbau zu dieser Schale gehört, soweit typisch. */
  art?: AusbauArt
  /** Höheneinheiten, wenn es eine Rack-Schale ist. */
  hoeheHE?: number
  herkunft: MassHerkunft
  /** Wo die Zahlen herkommen — Datenblatt, Messprotokoll, Name des Messenden. */
  quelle?: string
  /** Vom Haus angelegt (und damit änderbar) statt mitgeliefert. */
  eigen?: boolean
  notes?: string
}

/**
 * Die mitgelieferten Vorlagen — NAMEN, KEINE MASSE.
 *
 * Bewusst ohne `aussenMm`/`innenMm` und mit `herkunft: 'unbekannt'`. Sie
 * sind eine Auswahlliste und keine Datenbank. Wer das erste Case eines
 * Modells ausmisst, macht daraus mit `vorlageAusCase` eine Vorlage mit
 * `herkunft: 'gemessen'` — ab dann trägt sie echte Zahlen.
 *
 * Die Liste ist kurz und enthält nur, was in dieser Branche tatsächlich
 * herumsteht. Eine vollständige Hersteller-Liste wäre eine Abschrift, die
 * beim nächsten Modelljahr falsch ist.
 */
export const MITGELIEFERTE_VORLAGEN: readonly KatalogCase[] = [
  { id: 'peli-1450', hersteller: 'Peli', modell: '1450', art: 'schaum', herkunft: 'unbekannt' },
  { id: 'peli-1510', hersteller: 'Peli', modell: '1510', art: 'schaum', herkunft: 'unbekannt' },
  { id: 'peli-1535', hersteller: 'Peli', modell: '1535 Air', art: 'schaum', herkunft: 'unbekannt' },
  { id: 'peli-1610', hersteller: 'Peli', modell: '1610', art: 'schaum', herkunft: 'unbekannt' },
  { id: 'peli-1620', hersteller: 'Peli', modell: '1620', art: 'schaum', herkunft: 'unbekannt' },
  { id: 'peli-1637', hersteller: 'Peli', modell: '1637 Air', art: 'schaum', herkunft: 'unbekannt' },
  { id: 'nanuk-915', hersteller: 'Nanuk', modell: '915', art: 'schaum', herkunft: 'unbekannt' },
  { id: 'nanuk-925', hersteller: 'Nanuk', modell: '925', art: 'schaum', herkunft: 'unbekannt' },
  { id: 'nanuk-935', hersteller: 'Nanuk', modell: '935', art: 'schaum', herkunft: 'unbekannt' },
  { id: 'nanuk-945', hersteller: 'Nanuk', modell: '945', art: 'schaum', herkunft: 'unbekannt' },
  { id: 'nanuk-960', hersteller: 'Nanuk', modell: '960', art: 'schaum', herkunft: 'unbekannt' },
]

/** Der Anzeigename einer Vorlage. */
export const vorlageName = (v: KatalogCase): string => `${v.hersteller} ${v.modell}`.trim()

/**
 * Trägt die Vorlage Masse, mit denen sich rechnen lässt?
 *
 * Gefragt wird nach VOLLSTÄNDIGEN Massen und nicht danach, ob irgendein Feld
 * gesetzt ist: eine Vorlage mit Breite, aber ohne Tiefe, ergibt kein Layout,
 * und ein Knopf, der sie anbietet, führt ins Leere.
 */
export const hatMasse = (v: KatalogCase): boolean =>
  !!(v.aussenMm?.widthMm && v.aussenMm.heightMm && v.aussenMm.depthMm) ||
  !!(v.innenMm?.widthMm && v.innenMm.heightMm && v.innenMm.depthMm)

/**
 * Was die Vorlage über ihre Masse sagt — im Klartext, für die Liste.
 *
 * „Nicht hinterlegt" steht DA und wird nicht weggelassen: eine Vorlage ohne
 * Zusatz sähe aus wie eine mit Massen, und der Unterschied ist der ganze
 * Punkt dieses Katalogs.
 */
export function massAuskunft(v: KatalogCase, t: Uebersetzen = quelle): string {
  if (!hatMasse(v)) {
    return t('katalog.noSize', 'no dimensions recorded — measure once, then this template carries them')
  }
  if (v.herkunft === 'gemessen') {
    return v.quelle
      ? format(t('katalog.measuredBy', 'measured · {quelle}'), { quelle: v.quelle })
      : t('katalog.measured', 'measured in this house')
  }
  if (v.herkunft === 'hersteller') {
    return v.quelle
      ? format(t('katalog.fromSheet', 'from the data sheet · {quelle}'), { quelle: v.quelle })
      : t('katalog.fromSheetPlain', 'from the data sheet')
  }
  return t('katalog.unknownSource', 'dimensions recorded, source not stated')
}

/**
 * Aus einem ausgemessenen Case eine Vorlage machen.
 *
 * DAS IST DER WEG, auf dem dieser Katalog wertvoll wird: einmal messen, dann
 * steht das Modell für jedes weitere Stück bereit. Die Herkunft ist deshalb
 * fest `gemessen` — sie kommt aus dem Bestand dieses Hauses und nicht aus
 * einem Datenblatt.
 *
 * Gibt `null` zurück, wenn nichts zu übernehmen ist: eine Vorlage ohne Masse
 * aus einem Case ohne Masse wäre ein Eintrag, der nichts hinzufügt.
 */
export function vorlageAusCase(
  id: string,
  hersteller: string,
  modell: string,
  aussenMm: PhysicalDimensions | undefined,
  innenMm: CaseInnenmass | undefined,
  art: AusbauArt,
  quelleText?: string,
  hoeheHE?: number,
): KatalogCase | null {
  const kandidat: KatalogCase = {
    id,
    hersteller: hersteller.trim(),
    modell: modell.trim(),
    aussenMm,
    innenMm,
    art,
    hoeheHE,
    herkunft: 'gemessen',
    quelle: quelleText?.trim() || undefined,
    eigen: true,
  }
  if (!kandidat.modell && !kandidat.hersteller) return null
  if (!hatMasse(kandidat)) return null
  return kandidat
}

/**
 * Vorlagen zusammenführen: mitgeliefert plus eigene.
 *
 * EINE EIGENE MIT DERSELBEN KENNUNG GEWINNT. Wer „Peli 1510" ausgemessen
 * hat, soll nicht daneben die masslose Fassung sehen — und die eigene Zahl
 * schlägt jede mitgelieferte, weil sie aus diesem Haus kommt.
 */
export function alleVorlagen(eigene: readonly KatalogCase[]): KatalogCase[] {
  const nachId = new Map<string, KatalogCase>()
  for (const v of MITGELIEFERTE_VORLAGEN) nachId.set(v.id, v)
  for (const v of eigene) nachId.set(v.id, { ...v, eigen: true })
  return [...nachId.values()].sort(
    (a, b) => a.hersteller.localeCompare(b.hersteller) || a.modell.localeCompare(b.modell),
  )
}
