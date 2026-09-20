// ───────────────────────────────────────────────────────────────────────────
// Keine Komponente in einer Komponente.
//
// ─── DER BEFUND, GEMESSEN 2026-09-18 ───────────────────────────────────────
//
// Der Lagerbaum liess sich ziehen, zeigte die Absage korrekt an — und der
// Umzug kam nie an. Der Grund war nicht die Zeiger-Logik, sondern die Form:
// `Knoten` stand als Funktion INNERHALB von `Lagerbaum`.
//
// Eine Funktion, die im Rendern deklariert wird, ist bei jedem Durchlauf ein
// NEUER Komponenten-Typ. React kann einen solchen Teilbaum nicht
// aktualisieren; es haengt ihn ab und neu an. Damit verschwindet das
// Element, das `setPointerCapture` haelt — der Zug reisst mitten in der
// Bewegung ab, und weil das erste `pointermove` noch ankommt, sieht alles
// bis zum Loslassen richtig aus. Gemessen: `xlrOrt` blieb leer, `umzuege`
// blieb 0.
//
// Dieselbe Form kostet ausserdem jeden lokalen Zustand des Teilbaums (ein
// aufgeklappter Ast, ein Eingabefeld mitten im Tippen) und rendert die
// ganze Liste neu, statt die eine geaenderte Zeile.
//
// ─── WAS DIESER LAUF MISST ─────────────────────────────────────────────────
//
// Den Quelltext unter `src/ui/`: eine eingerueckte Deklaration, deren Name
// gross beginnt. Das ist die Form, die `eslint-plugin-react` als
// `no-unstable-nested-components` kennt — der Plugin ist hier nicht
// installiert, und eine Abhaengigkeit fuer eine Regel waere teurer als
// zwoelf Zeilen.
//
// ─── WAS ER NICHT SIEHT ────────────────────────────────────────────────────
//
// Eine verschachtelte Komponente mit kleinem Anfangsbuchstaben (die waere
// auch fuer JSX keine Komponente), eine, die ueber eine Variable zugewiesen
// wird, und jede zur Laufzeit gebaute. Was er zusagt, ist die haeufige Form —
// und die ist die, in die man laeuft.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const UI = resolve(__dirname, '..', '..', 'ui')

const dateien = (dir: string, out: string[] = []): string[] => {
  for (const eintrag of readdirSync(dir, { withFileTypes: true })) {
    const pfad = join(dir, eintrag.name)
    if (eintrag.isDirectory()) dateien(pfad, out)
    else if (eintrag.name.endsWith('.tsx')) out.push(pfad)
  }
  return out
}

/** Eingerueckt deklariert und gross geschrieben — also in etwas anderem drin. */
const VERSCHACHTELT = /^[ \t]+(?:const|function)\s+([A-Z]\w*)\s*[=(:]/gm

describe('Keine Komponente in einer Komponente', () => {
  it('unter src/ui steht keine', () => {
    const treffer: string[] = []
    for (const pfad of dateien(UI)) {
      const quelle = readFileSync(pfad, 'utf8')
      for (const m of quelle.matchAll(VERSCHACHTELT)) {
        // Ein `const Foo: Typ = …` ohne JSX ist keine Komponente. Gesucht
        // wird die Form, die eine ist: eine Funktion, die JSX liefert.
        const rest = quelle.slice(m.index)
        const koerper = rest.slice(0, rest.indexOf('\n\n') + 1 || 600)
        if (!/=>\s*\(|return\s*\(|<[A-Za-z]/.test(koerper)) continue
        treffer.push(`${pfad.slice(UI.length + 1)}: ${m[1]}`)
      }
    }
    expect(treffer, `verschachtelte Komponenten:\n  ${treffer.join('\n  ')}`).toEqual([])
  })
})
