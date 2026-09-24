// ───────────────────────────────────────────────────────────────────────────
// DER CASE-KATALOG — Vorlagen für Schalen.
//
// NUTZER, 2026-09-20: „Es muss auch zum Beispiel peli cases und nanuk cases
// geben und man muss selbst welche anlegen können."
//
// ─── WOHER DIE HERSTELLER-MASSE STAMMEN ────────────────────────────────────
//
// Bis 2026-09-24 standen hier NUR Modellnamen: diese Arbeitsumgebung erreicht
// weder `peli.com` noch `nanuk.com`, `casetec.de`, `amptown-cases.de` oder
// `gaeng-case.de` direkt, und Masse aus dem Gedächtnis hätten auf dem
// Bildschirm wie eine Herstellerangabe ausgesehen.
//
// NUTZER, 2026-09-24: „suche peli und nanuk Datenblätter und suche auch
// Daten von Casetec cases und Amptown cases und gäng cases".
//
// Erreichbar war die Websuche. Jede Zahl unten kommt aus einem Suchtreffer,
// dessen Adresse in `quelle` steht — Hersteller-Shop oder Händler, der das
// Datenblatt wiedergibt. Nachgeprüft wurde, was sich prüfen lässt: bei allen
// Peli- und Nanuk-Einträgen ergibt Deckel- plus Unterteiltiefe die
// Innenhöhe (±2 mm Rundung der Zoll-Angaben). Das ist kein Beweis, aber ein
// Tippfehler in einer der drei Zahlen fiele dabei auf.
//
// WAS FEHLT, FEHLT. Amptown und Gäng bauen ihre Racks weitgehend nach Mass;
// veröffentlicht sind Höheneinheiten und Einbautiefe, nicht die Aussenmasse.
// Diese Vorlagen tragen deshalb genau das und keinen Millimeter mehr — eine
// Rack-Vorlage mit HE und Einbautiefe ist trotzdem brauchbar, denn genau das
// fragt der Abgleich mit dem Signal-Plan.
//
// ─── ACHSEN ────────────────────────────────────────────────────────────────
//
// Datenblätter schreiben L × B × T (Länge, Breite, Tiefe). Hier:
//   widthMm  = Länge (die lange Seite, links–rechts vor dem offenen Case)
//   depthMm  = Breite (vorn–hinten)
//   heightMm = Tiefe (senkrecht, Deckel + Unterteil)
// Bei 19-Zoll-Racks ist es umgekehrt, weil die Front das Mass setzt:
//   widthMm  = Breite (19 Zoll plus Wände), depthMm = Länge (Einbautiefe
//   plus Deckel), heightMm = Höhe.
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
  /** Nutzbare Einbautiefe hinter der Schiene in mm, wenn es ein Rack ist. */
  einbautiefeMm?: number
  /** Innentiefe des Deckels in mm (Hartschale). */
  deckelMm?: number
  /** Innentiefe des Unterteils in mm (Hartschale) — die Höhe, in der das
   *  Inlay im Unterteil liegt. */
  unterteilMm?: number
  herkunft: MassHerkunft
  /** Wo die Zahlen herkommen — Datenblatt, Messprotokoll, Name des Messenden. */
  quelle?: string
  /** Vom Haus angelegt (und damit änderbar) statt mitgeliefert. */
  eigen?: boolean
  notes?: string
}

/** Abrufdatum aller Hersteller-Angaben unten. */
const ABGERUFEN = '2026-09-24'
const q = (url: string) => `${url} (abgerufen ${ABGERUFEN})`

/** Eine Hartschalen-Vorlage aus dem Datenblatt: L × B × T aussen und innen. */
function schale(
  id: string,
  hersteller: string,
  modell: string,
  aussen: [number, number, number],
  innen: [number, number, number],
  deckelMm: number | undefined,
  unterteilMm: number | undefined,
  leerKg: number | undefined,
  url: string,
): KatalogCase {
  return {
    id,
    hersteller,
    modell,
    aussenMm: { widthMm: aussen[0], depthMm: aussen[1], heightMm: aussen[2], weightKg: leerKg },
    innenMm: { widthMm: innen[0], depthMm: innen[1], heightMm: innen[2] },
    deckelMm,
    unterteilMm,
    art: 'schaum',
    herkunft: 'hersteller',
    quelle: q(url),
  }
}

/** Eine Rack-Vorlage. Aussenmasse nur, wo sie veröffentlicht sind. */
function rack(
  id: string,
  hersteller: string,
  modell: string,
  hoeheHE: number,
  einbautiefeMm: number | undefined,
  url: string,
  aussen?: { widthMm: number; depthMm: number; heightMm: number; weightKg?: number },
): KatalogCase {
  return {
    id,
    hersteller,
    modell,
    aussenMm: aussen,
    hoeheHE,
    einbautiefeMm,
    art: 'rack',
    herkunft: 'hersteller',
    quelle: q(url),
  }
}

/**
 * Die mitgelieferten Vorlagen.
 *
 * Hersteller-Angaben mit Quelle (siehe Kopf). Wer ein Modell nachmisst und
 * mit `vorlageAusCase` zurückspeichert, überschreibt die Vorlage mit
 * `herkunft: 'gemessen'` — die eigene Zahl gewinnt (`alleVorlagen`).
 *
 * Die Liste enthält, was in dieser Branche tatsächlich herumsteht, und keine
 * vollständige Hersteller-Liste: die wäre eine Abschrift, die beim nächsten
 * Modelljahr falsch ist.
 */
export const MITGELIEFERTE_VORLAGEN: readonly KatalogCase[] = [
  // ─── Peli ───
  schale('peli-1450', 'Peli', '1450', [409, 331, 175], [374, 260, 154], 44, 111, 2.5,
    'https://casesuperstore.co.uk/product/peli-1450-case/'),
  schale('peli-1510', 'Peli', '1510', [559, 351, 229], [502, 279, 193], 45, 147, 5.44,
    'https://www.thomannmusic.com/peli_1510000110.htm'),
  schale('peli-1535', 'Peli', '1535 Air', [558, 355, 228], [518, 284, 183], 51, 131, 3.94,
    'https://peliproducts.co.uk/products/1535-air-case'),
  schale('peli-1610', 'Peli', '1610', [628, 497, 303], [551, 422, 268], 52, 216, 9.1,
    'https://peliproducts.co.uk/products/1610-protector-case'),
  // Leergewicht nicht gefunden — nur „mit Schaum 11,8 kg". Das ist nicht
  // dasselbe, und eine Schale ohne Schaum ist genau der Fall, für den man
  // hier ein Inlay plant.
  schale('peli-1620', 'Peli', '1620', [630, 492, 352], [543, 414, 319], 51, 268, undefined,
    'https://www.canford.co.uk/Products/16-549_PELI-1620-PROTECTOR-CASE-Internal-dimensions-543x414x319mm-with-padded-dividers-wheeled-black'),
  schale('peli-1637', 'Peli', '1637 Air', [676, 525, 378], [595, 445, 337], 52, 285, 8.32,
    'https://peliproducts.co.uk/products/1637-air-case'),

  // ─── Nanuk ───
  schale('nanuk-915', 'Nanuk', '915', [391, 307, 173], [351, 236, 157], 53, 104, 2.0,
    'https://nanuk.com/products/nanuk-915'),
  schale('nanuk-925', 'Nanuk', '925', [475, 376, 178], [432, 300, 163], 53, 108, 2.8,
    'https://nanuk.com/products/nanuk-925'),
  schale('nanuk-935', 'Nanuk', '935', [559, 356, 229], [521, 287, 191], 53, 137, 5.2,
    'https://nanuk.com/products/nanuk-935'),
  schale('nanuk-945', 'Nanuk', '945', [638, 505, 224], [559, 432, 208], 53, 155, 4.8,
    'https://nanuk.com/products/nanuk-945'),
  schale('nanuk-960', 'Nanuk', '960', [645, 508, 368], [559, 432, 328], 53, 274, 8.7,
    'https://nanuk.com/products/nanuk-960'),

  // ─── Casetec — 19"-Rack Typ A, Double Door, 400 mm Einbautiefe ───
  // Aussenmasse als „ca." angegeben. Die Länge springt von 560 (2/4 HE) auf
  // 516 mm (6/8 HE) — so steht es im Shop, übernommen wie gefunden.
  rack('casetec-typ-a-2he', 'Casetec', '19" Rack Typ A 2 HE / 400', 2, 400,
    'https://shop.casetec.de/19-Rack-2-HE-400mm-Einbautiefe-Typ-A/RA0235DD.2',
    { widthMm: 526, depthMm: 560, heightMm: 135 }),
  rack('casetec-typ-a-4he', 'Casetec', '19" Rack Typ A 4 HE / 400', 4, 400,
    'https://shop.casetec.de/19-Rack-4-HE-400mm-Einbautiefe-Typ-A/RA0435DD.3',
    { widthMm: 526, depthMm: 560, heightMm: 220 }),
  rack('casetec-typ-a-6he', 'Casetec', '19" Rack Typ A 6 HE / 400', 6, 400,
    'https://shop.casetec.de/19-Rack-6-HE-400mm-Einbautiefe-Typ-A/RA0635DD.2',
    { widthMm: 526, depthMm: 516, heightMm: 310 }),
  rack('casetec-typ-a-8he', 'Casetec', '19" Rack Typ A 8 HE / 400', 8, 400,
    'https://shop.casetec.de/19-Rack-8HE-400mm-Einbautiefe-Typ-A/RA0835DD.2',
    { widthMm: 526, depthMm: 516, heightMm: 400 }),

  // ─── Amptown — Aussenmasse nicht veröffentlicht ───
  rack('amptown-dd-mc-2he-m', 'Amptown', 'Double Door Rack 2 HE Minicatch EBT M', 2, 485,
    'https://www.amptown-cases.de/product/double-door-rack-2he-minicatch-ebt-m/'),
  rack('amptown-dda-12he-567', 'Amptown', 'DDA 12 HE EBT 567', 12, 567,
    'https://www.amptown-cases.de/product/dda-12he-ebt-567mm/'),
  ...[2, 3, 4, 5].map((he) =>
    rack(`amptown-krs-${he}he`, 'Amptown', `KR-Rack KRS ${he} HE`, he, 360,
      'https://www.amptown-cases.de/en/product/double-door-rack-light/')),
  ...[2, 3, 4, 5].map((he) =>
    rack(`amptown-krl-${he}he`, 'Amptown', `KR-Rack KRL ${he} HE`, he, 450,
      'https://www.amptown-cases.de/en/product/double-door-rack-light/')),

  // ─── Gäng-Case — Tour Rack L (PerforLine) ───
  ...[4, 6, 12].map((he) =>
    rack(`gaeng-tour-l-${he}u-dd48`, 'Gäng-Case', `Tour Rack L ${he}U DD 48`, he, 480,
      'https://www.musicstore.com/en_US/USD/brands/gaeng-case')),
  ...[4, 6, 8, 10, 12].map((he) =>
    rack(`gaeng-tour-l-${he}u-dd58`, 'Gäng-Case', `Tour Rack L ${he}U DD 58`, he, 580,
      'https://www.musicstore.com/en_US/USD/brands/gaeng-case')),
  // Nur für 8U ist ein Aussenmass samt Gewicht zu finden gewesen (mit Rollen).
  rack('gaeng-tour-l-8u-dd48w', 'Gäng-Case', 'Tour Rack L 8U DD 48 W', 8, 480,
    'https://www.musicstore.de/en_DE/EUR/Gaeng-Case-Tour-Rack-L-8U-DD-48-W-PerforLine/art-PAH0018839-000',
    { widthMm: 590, depthMm: 542, heightMm: 592, weightKg: 18.6 }),
  ...[10, 12, 16, 18].map((he) =>
    rack(`gaeng-tour-l-${he}u-dd48w`, 'Gäng-Case', `Tour Rack L ${he}U DD 48 W`, he, 480,
      'https://www.musicstore.com/en_US/USD/brands/gaeng-case')),
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
 * Gibt es etwas zu übernehmen?
 *
 * Eine Rack-Vorlage mit Höheneinheiten, aber ohne Aussenmass (Amptown,
 * Gäng) setzt HE und Einbautiefe — das ist, was der Abgleich mit dem
 * Signal-Plan fragt. `hatMasse` allein hätte sie abgelehnt.
 */
export const hatUebernehmbares = (v: KatalogCase): boolean =>
  hatMasse(v) || !!v.hoeheHE || !!v.einbautiefeMm

/**
 * Was die Vorlage über ihre Masse sagt — im Klartext, für die Liste.
 *
 * „Nicht hinterlegt" steht DA und wird nicht weggelassen: eine Vorlage ohne
 * Zusatz sähe aus wie eine mit Massen, und der Unterschied ist der ganze
 * Punkt dieses Katalogs.
 */
export function massAuskunft(v: KatalogCase, t: Uebersetzen = quelle): string {
  if (!hatMasse(v) && v.hoeheHE && v.herkunft === 'hersteller') {
    return format(
      t('katalog.rackOnlySheet', 'outer dimensions not published — rack units and mounting depth only · {quelle}'),
      { quelle: v.quelle ?? '' },
    )
  }
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

const mass = (d: { widthMm?: number; depthMm?: number; heightMm?: number } | undefined): string | null =>
  d?.widthMm && d.depthMm && d.heightMm ? `${d.widthMm} × ${d.depthMm} × ${d.heightMm} mm` : null

/**
 * Die Zahlen einer Vorlage in einer Zeile — was die Übernahme setzt.
 *
 * Nur, was dasteht. Ein fehlendes Leergewicht erscheint nicht als „0 kg",
 * sondern gar nicht.
 */
export function massZeile(v: KatalogCase, t: Uebersetzen = quelle): string[] {
  const teile: string[] = []
  if (v.hoeheHE) teile.push(format(t('katalog.units', '{he} U'), { he: String(v.hoeheHE) }))
  if (v.einbautiefeMm) {
    teile.push(format(t('katalog.mountDepth', '{mm} mm mounting depth'), { mm: String(v.einbautiefeMm) }))
  }
  const aussen = mass(v.aussenMm)
  if (aussen) teile.push(format(t('katalog.outside', 'outside {mass}'), { mass: aussen }))
  const innen = mass(v.innenMm)
  if (innen) teile.push(format(t('katalog.inside', 'inside {mass}'), { mass: innen }))
  if (v.deckelMm && v.unterteilMm) {
    teile.push(
      format(t('katalog.lidBase', 'lid {deckel} mm + base {unterteil} mm'), {
        deckel: String(v.deckelMm),
        unterteil: String(v.unterteilMm),
      }),
    )
  }
  if (v.aussenMm?.weightKg) {
    teile.push(format(t('katalog.empty', '{kg} kg empty'), { kg: String(v.aussenMm.weightKg) }))
  }
  return teile
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
  einbautiefeMm?: number,
): KatalogCase | null {
  const kandidat: KatalogCase = {
    id,
    hersteller: hersteller.trim(),
    modell: modell.trim(),
    aussenMm,
    innenMm,
    art,
    hoeheHE,
    einbautiefeMm,
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
