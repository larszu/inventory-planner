// ───────────────────────────────────────────────────────────────────────────
// Wo das Kennungs-Schema des Hauses liegt — und wie ein Platz im Plan heisst.
//
// EIGENE DATEI, WEIL ES KEINE KOMPONENTE IST. Eine Konstante oder ein
// Helfer neben einer React-Komponente nimmt dem Hot-Reload die Grundlage
// (`react-refresh/only-export-components`) — und beides wird ausserhalb der
// Einstell-Maske gebraucht: der Grundriss beschriftet damit, der Raum auch.
//
// Das Schema ist eine Eigenschaft des HAUSES und nicht des Bestands: wer
// alle Artikel löscht, hat immer noch dieselben Regale und dieselbe
// Adressierung. Es liegt deshalb unter einem eigenen Schlüssel — wie der
// Scan-Prefix der Inventur und die Fristarten.
// ───────────────────────────────────────────────────────────────────────────
import type { FlaechenArt } from '../domain/types/halle'
import {
  SCHEMA_A1,
  STUFEN_ARTEN,
  type Kennungsschema,
  type Stufe,
} from '../domain/lib/platzkennung'

export const schemaSchluessel = 'avplan.lager.kennungsschema'

/** Das gespeicherte Schema. Kaputtes wird verworfen, nicht geflickt. */
export function liesSchema(): Kennungsschema {
  try {
    const roh = localStorage.getItem(schemaSchluessel)
    if (!roh) return SCHEMA_A1
    const p = JSON.parse(roh) as Partial<Kennungsschema>
    if (!Array.isArray(p.stufen)) return SCHEMA_A1
    const stufen = p.stufen.filter(
      (s): s is Stufe =>
        !!s &&
        STUFEN_ARTEN.includes(s.art) &&
        (s.zeichen === 'buchstaben' || s.zeichen === 'ziffern') &&
        typeof s.stellen === 'number' &&
        s.stellen >= 0,
    )
    return { stufen, trenner: typeof p.trenner === 'string' ? p.trenner : '' }
  } catch {
    return SCHEMA_A1
  }
}

/**
 * Wie ein Lagerplatz im Plan heisst: die Kennung, sonst der Name.
 *
 * Nicht beides: ein Rechteck von zwei Metern trägt eine Zeile, und „A1"
 * findet man im Regalgang, „Regal A hinten links" nicht.
 */
export function planBeschriftung(n: { code?: string; name: string }): string {
  return n.code?.trim() || n.name
}

/**
 * Wie eine Hallenfläche heisst.
 *
 * Als FUNKTION und nicht als Tabelle: eine Beschriftungs-Tabelle auf
 * Modulebene wird beim Laden einmal gebaut und bliebe in der Sprache stehen,
 * die damals galt (CLAUDE.md). Sie steht hier und nicht in der Ansicht, weil
 * der Grundriss sie zum Zeichnen braucht und die Anlege-Leiste zum Benennen.
 */
export function flaechenName(art: FlaechenArt, t: (k: string, en: string) => string): string {
  switch (art) {
    case 'tor':
      return t('area.gate', 'Gate')
    case 'verkehrsweg':
      return t('area.aisle', 'Traffic route')
    case 'sperrflaeche':
      return t('area.blockedArea', 'No-go area')
    case 'pickzone':
      return t('area.pick', 'Picking zone')
    default:
      return t('area.staging', 'Staging area')
  }
}
