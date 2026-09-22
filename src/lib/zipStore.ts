// ───────────────────────────────────────────────────────────────────────────
// EIN ZIP-ARCHIV, OHNE ABHÄNGIGKEIT.
//
// ─── WOFÜR ─────────────────────────────────────────────────────────────────
//
// 3MF ist ein OPC-Paket, und OPC ist ein ZIP mit XML darin. Ohne ZIP-
// Schreiber gäbe es also kein 3MF — und ohne 3MF nur STL, das keine Einheit
// kennt (siehe `inlay3mf.ts`).
//
// ─── WARUM OHNE PACKUNG („STORED") ─────────────────────────────────────────
//
// Weil Deflate eine Abhängigkeit wäre und der Gewinn hier klein ist: ein
// Inlay-Netz sind ein paar hundert Kilobyte XML. `stored` ist eine reguläre
// Speichermethode des Formats (0), kein Behelf — jeder Leser kann sie.
//
// ─── WAS LEICHT SCHIEFGEHT ─────────────────────────────────────────────────
//
// Ein ZIP ist eine Kette von OFFSETS. Wer einen davon um ein Byte verfehlt,
// bekommt eine Datei, die nicht halb funktioniert, sondern gar nicht aufgeht
// — und man sieht es ihr nicht an. Deshalb liest `zipStoreTest` das Archiv
// mit `unzip` wieder auf und vergleicht den Inhalt, statt nur zu prüfen,
// dass Bytes herauskommen.
//
// REIN: keine Uhr. Das Datum kommt von aussen, sonst wäre dieselbe Eingabe
// nicht dieselbe Ausgabe.
// ───────────────────────────────────────────────────────────────────────────

/** Die CRC-32-Tabelle nach IEEE 802.3 — einmal gebaut, dann nachgeschlagen. */
const TABELLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

/**
 * CRC-32 über ein Byte-Feld.
 *
 * Eigene Fassung und nicht `node:zlib`: dieser Code läuft im BROWSER, und
 * dort gibt es `zlib` nicht. Ein Import, der nur im Test funktioniert, wäre
 * eine Zusicherung über Code, den niemand ausliefert.
 */
export function crc32(daten: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < daten.length; i += 1) c = TABELLE[(c ^ daten[i]!) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export interface ZipEintrag {
  /** Pfad im Archiv, mit Schrägstrichen und ohne führenden. */
  pfad: string
  daten: Uint8Array
}

const enc = new TextEncoder()

/** MS-DOS-Zeit und -Datum aus einem Zeitpunkt. */
function dosZeit(d: Date): { zeit: number; datum: number } {
  return {
    zeit: (d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2) & 0x1f),
    datum: (((d.getFullYear() - 1980) & 0x7f) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  }
}

class Puffer {
  private teile: Uint8Array[] = []
  laenge = 0
  schreibe(a: Uint8Array) {
    this.teile.push(a)
    this.laenge += a.length
  }
  u16(n: number) {
    this.schreibe(new Uint8Array([n & 0xff, (n >>> 8) & 0xff]))
  }
  u32(n: number) {
    this.schreibe(new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]))
  }
  fertig(): Uint8Array<ArrayBuffer> {
    const raus = new Uint8Array(this.laenge)
    let i = 0
    for (const t of this.teile) {
      raus.set(t, i)
      i += t.length
    }
    return raus
  }
}

/**
 * Ein ZIP-Archiv bauen.
 *
 * `zeit` kommt von aussen — mit einer Uhr hier wäre dieselbe Eingabe nicht
 * dieselbe Ausgabe, und ein Test könnte nichts festhalten.
 */
export function zipStore(eintraege: readonly ZipEintrag[], zeit = new Date(2020, 0, 1)): Uint8Array<ArrayBuffer> {
  const { zeit: dz, datum: dd } = dosZeit(zeit)
  const aus = new Puffer()
  const verzeichnis: { pfad: Uint8Array; crc: number; groesse: number; offset: number }[] = []

  for (const e of eintraege) {
    const pfad = enc.encode(e.pfad)
    const crc = crc32(e.daten)
    const offset = aus.laenge

    aus.u32(0x04034b50) // Lokaler Kopf
    aus.u16(20) // Fassung, die zum Entpacken reicht
    aus.u16(0) // Keine Merker
    aus.u16(0) // Methode 0 = stored
    aus.u16(dz)
    aus.u16(dd)
    aus.u32(crc)
    aus.u32(e.daten.length) // gepackt
    aus.u32(e.daten.length) // ungepackt — bei `stored` dasselbe
    aus.u16(pfad.length)
    aus.u16(0) // Kein Zusatzfeld
    aus.schreibe(pfad)
    aus.schreibe(e.daten)

    verzeichnis.push({ pfad, crc, groesse: e.daten.length, offset })
  }

  const verzeichnisAb = aus.laenge
  for (const v of verzeichnis) {
    aus.u32(0x02014b50) // Zentraler Kopf
    aus.u16(20) // erzeugt von
    aus.u16(20) // nötig zum Entpacken
    aus.u16(0)
    aus.u16(0)
    aus.u16(dz)
    aus.u16(dd)
    aus.u32(v.crc)
    aus.u32(v.groesse)
    aus.u32(v.groesse)
    aus.u16(v.pfad.length)
    aus.u16(0) // Zusatzfeld
    aus.u16(0) // Kommentar
    aus.u16(0) // Datenträger
    aus.u16(0) // interne Merkmale
    aus.u32(0) // externe Merkmale
    aus.u32(v.offset)
    aus.schreibe(v.pfad)
  }
  const verzeichnisLaenge = aus.laenge - verzeichnisAb

  aus.u32(0x06054b50) // Ende des zentralen Verzeichnisses
  aus.u16(0)
  aus.u16(0)
  aus.u16(verzeichnis.length)
  aus.u16(verzeichnis.length)
  aus.u32(verzeichnisLaenge)
  aus.u32(verzeichnisAb)
  aus.u16(0) // Kein Archiv-Kommentar

  return aus.fertig()
}
