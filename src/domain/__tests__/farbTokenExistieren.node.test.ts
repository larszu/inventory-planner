import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// ───────────────────────────────────────────────────────────────────────────
// JEDES `var(--…)` IM QUELLTEXT MUSS ES AUCH GEBEN.
//
// ─── WIE DIESER WÄCHTER ENTSTANDEN IST ─────────────────────────────────────
//
// Am 2026-09-20 an einem Bildschirmfoto der Case-Ansicht: das Rack stand als
// Reihe blosser Zahlen da, ohne Rahmen und ohne Höheneinheiten. Der Grund war
// `stroke="var(--linie)"` — einen Token dieses Namens gibt es nicht, er heisst
// `--rand`. Ein unbekannter Token macht die Eigenschaft ungültig, und eine
// ungültige `stroke` zeichnet NICHTS.
//
// ─── UND WARUM ER NÖTIG IST ────────────────────────────────────────────────
//
// Der Fehler ist STILL in jeder Richtung: kein Typfehler, keine Warnung im
// Browser, kein roter Test. Er fällt nur auf, wenn jemand hinsieht — und bei
// einer Füllfarbe mit sichtbarem `fill` daneben fällt er gar nicht auf, weil
// man das Kästchen ja sieht. Genau so überlebten hier sieben Striche.
//
// Gemessen wird der QUELLTEXT und nicht das gerenderte Bild: welcher Ton am
// Ende wo landet, sieht dieser Lauf nicht. Er sieht, dass jeder benutzte Name
// irgendwo definiert ist.
// ───────────────────────────────────────────────────────────────────────────
const wurzel = resolve(__dirname, '..', '..')
const css = readFileSync(resolve(wurzel, 'index.css'), 'utf8')

/** Alle definierten Token — `--name:` irgendwo im Stilblatt. */
const definiert = new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]!))

/**
 * Was gemessen wird: alles, was im Betrieb gerendert wird.
 *
 * NICHT die Tests selbst. Dieser Waechter nennt in seinem eigenen
 * Kommentar den Token, der den Anlass gab — und wuerde sonst an sich
 * selbst rot. Ein Waechter, der an seiner eigenen Begruendung scheitert,
 * zwingt dazu, die Begruendung zu loeschen; dieselbe Falle, die
 * `markenPalette` in seinem Kommentar beschreibt.
 */
const dateien: string[] = []
const sammle = (dir: string) => {
  for (const e of readdirSync(dir)) {
    if (e === '__tests__') continue
    const p = resolve(dir, e)
    if (statSync(p).isDirectory()) sammle(p)
    else if (/\.(tsx?|css)$/.test(e) && !/\.test\.tsx?$/.test(e)) dateien.push(p)
  }
}
sammle(wurzel)

describe('Farb-Token', () => {
  it('findet überhaupt Token — sonst prüft der Rest nichts', () => {
    expect(definiert.size).toBeGreaterThan(10)
    expect(dateien.length).toBeGreaterThan(20)
  })

  it('kennt jeden Token, der irgendwo benutzt wird', () => {
    const unbekannt: string[] = []
    for (const datei of dateien) {
      const inhalt = readFileSync(datei, 'utf8')
      for (const m of inhalt.matchAll(/var\((--[a-z0-9-]+)/g)) {
        const name = m[1]!
        if (!definiert.has(name)) unbekannt.push(`${name} in ${datei.slice(wurzel.length + 1)}`)
      }
    }
    expect(
      [...new Set(unbekannt)],
      'unbekannte Token — ein `var(--x)` ohne Definition macht die Eigenschaft ' +
        'ungueltig, und eine ungueltige `stroke` zeichnet gar nichts',
    ).toEqual([])
  })
})
