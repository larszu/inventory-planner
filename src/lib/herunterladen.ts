// ───────────────────────────────────────────────────────────────────────────
// EINE DATEI HERAUSGEBEN — an einer Stelle.
//
// ─── ZWEI FEHLER, DIE AN ACHT STELLEN GLEICH STANDEN ───────────────────────
//
// Beide am 2026-09-20 in der Suite gemessen und dort behoben; hier standen
// sie noch:
//
//   1. DER ANKER MUSS IM DOKUMENT STEHEN. Ein `document.createElement('a')`,
//      der nie eingehängt wird, führt den Klick aus — aber sein
//      `download`-Attribut wird nicht in jedem Fall beachtet. Heraus kommt
//      der Vorgabename des Browsers, und der Empfänger bekommt eine Datei
//      ohne Namen und ohne Endung.
//   2. `revokeObjectURL` DARF NICHT IM SELBEN SCHRITT FOLGEN. Der Klick
//      STARTET die Übertragung, er beendet sie nicht. Bei einer kleinen CSV
//      fällt das nie auf — bei einem STL mit Zehntausenden Dreiecken schon.
//
// Der zweite Punkt ist der Grund, warum diese Datei JETZT entsteht: die
// Inlay-Ausgabe ist die erste hier, die gross genug ist, dass es zuschlägt.
// ───────────────────────────────────────────────────────────────────────────

/** Wie lange die Objekt-Adresse gültig bleibt, nachdem der Klick sie startete. */
const FREIGABE_MS = 60_000

/**
 * Eine Datei zum Herunterladen anbieten.
 *
 * `name` wird übernommen wie er kommt — die ENDUNG gehört zum Namen und
 * sagt, was wirklich in der Datei liegt.
 */
export function herunterladen(inhalt: Blob, name: string): void {
  if (typeof document === 'undefined') return
  const url = URL.createObjectURL(inhalt)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Nicht sofort: der Klick startet die Übertragung, er beendet sie nicht.
  setTimeout(() => URL.revokeObjectURL(url), FREIGABE_MS)
}

/**
 * Einen Dateinamen aus einem Titel bauen — ohne Endung, die hängt der
 * Aufrufer an.
 *
 * AUF ASCII GEBRACHT: ein Gedankenstrich im Titel liess Chromium den Namen
 * ganz fallen (gemessen in der Suite, 2026-09-20). Umlaute werden
 * umgeschrieben und nicht gestrichen — `grne-halle` fände niemand wieder.
 */
const UMSCHRIFT: Record<string, string> = {
  ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss', å: 'aa', æ: 'ae', ø: 'oe',
  á: 'a', à: 'a', â: 'a', ã: 'a', é: 'e', è: 'e', ê: 'e', ë: 'e',
  í: 'i', ì: 'i', î: 'i', ï: 'i', ó: 'o', ò: 'o', ô: 'o', õ: 'o',
  ú: 'u', ù: 'u', û: 'u', ñ: 'n', ç: 'c',
}

export function dateiName(titel: string): string {
  const sauber = titel
    .toLowerCase()
    .replace(/[äöüßåæøáàâãéèêëíìîïóòôõúùûñç]/g, (z) => UMSCHRIFT[z] ?? z)
    .replace(/[^a-z0-9._-]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    // Ein führender Punkt machte die Datei auf Unix unsichtbar.
    .replace(/^[.-]+/, '')
  return sauber || 'export'
}
