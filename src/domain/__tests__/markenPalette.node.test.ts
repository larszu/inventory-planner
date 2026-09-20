import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ───────────────────────────────────────────────────────────────────────────
// ADR-007 der av-planner-suite — die Marken-Palette, Stufe 6.
//
// WARUM DIE WERTE HIER EIN ZWEITES MAL STEHEN. Maschinenlesbar stehen sie in
// `@avplan/ui` (`src/brand.ts`), aber dieses Repo haengt an keinem Paket der
// Suite: es laeuft eigenstaendig und wird vendoriert. Ohne diesen Lauf waere
// der Rueckweg in die rohe slate-Palette eine Zeile, die niemandem auffaellt —
// und genau so hat dieses Repo am 2026-09-09 angefangen.
//
// WAS ER MISST: die Token-Schicht in `src/index.css`, also die Werte, aus
// denen jede Regel darunter ihre Farbe zieht. Er misst NICHT das gerenderte
// Fenster; was Kontrast, Ueberlagerung und ein umgebendes `filter` daraus
// machen, sieht er nicht.
//
// ─── UND SEIT 2026-09-18 AUCH DEN DRUCKBOGEN ──────────────────────────────
//
// Er las bis dahin NUR `index.css`. Ein Stilblatt in einer TS-Datei sah er
// nicht — und genau dort lag der Bogen, den der Kunde als einziges in die
// Hand bekommt: `domain/lib/inventoryPrint.ts` fuhr `#111`, `#555`, `#333`,
// `#444` und einen Tailwind-Bernstein `#b45309`. Eine Grautreppe, die die
// Marke nicht hat, in der einen Anwendung, die man anfassen kann.
//
// Der Bogen ist die HELLE Anwendung derselben Palette (Guide: Print 60 %
// Off-White, Web 70 % Deep Navy — dieselben Farben, gedrehte Gewichtung).
// Deshalb misst dieser Lauf ihn gegen dieselbe Liste und nicht gegen eine
// zweite.
// ───────────────────────────────────────────────────────────────────────────

const css = readFileSync(resolve(__dirname, '..', '..', 'index.css'), 'utf8')

/** Der Wert eines Tokens aus dem `:root`-Block — Kommentare abgeschnitten. */
const OHNE_KOMMENTAR = new RegExp('/\\*[\\s\\S]*?\\*/', 'g')

const token = (name: string): string => {
  const m = new RegExp(name + ':\\s*([^;]+);').exec(css)
  return m ? m[1].replace(OHNE_KOMMENTAR, '').trim() : ''
}

describe('ADR-007: die Flaechen und die Schrift', () => {
  it('der Grund ist Deep Navy, die Flaeche Zumpe Navy', () => {
    expect(token('--bg')).toBe('#132040')
    expect(token('--flaeche')).toBe('#1D324F')
    expect(token('--erhoben')).toBe('#24405F')
  })

  it('Fliesstext ist Eisblau, Gedaempftes Stahlblau', () => {
    // Schiefer waere auf Navy unlesbar — er kommt nur im hellen Theme vor.
    expect(token('--text')).toBe('#E1ECEF')
    expect(token('--leise')).toBe('#8C9CB3')
  })

  it('die Linie ist die Deckung aus dem Handbuch, keine Vollfarbe', () => {
    // Guide S. 17: Struktur entsteht durch Linie und Weissraum, und die Linie
    // liegt ueber dem Grund statt neben ihm.
    expect(token('--rand')).toBe('rgba(246, 245, 240, 0.14)')
  })
})

describe('ADR-007: das Signal ist nicht der Status', () => {
  it('Tally-Rot steht allein', () => {
    expect(token('--signal')).toBe('#D6402E')
  })

  it('die Meldefarben sind die des Handbuchs und NICHT Tally-Rot', () => {
    // Der Punkt dieses Laufs: wer eine Warnung in Tally-Rot setzt, nimmt dem
    // Aufnahmelicht seine Bedeutung. Deshalb wird hier auf Ungleichheit
    // geprueft und nicht nur auf den Wert.
    expect(token('--warn')).toBe('#C8892B')
    expect(token('--gefahr')).toBe('#B04A3F')
    expect(token('--ok')).toBe('#2F7D5C')
    for (const t of ['--warn', '--gefahr', '--ok']) {
      expect(token(t), `${t} darf nicht Tally-Rot sein`).not.toBe('#D6402E')
    }
  })
})

describe('ADR-007: was es nicht gibt', () => {
  it('keine Rundungen, keine Schatten, keine Verlaeufe', () => {
    // Guide S. 10. Gemessen am Stilblatt ohne seine Kommentare — sonst
    // besaenftigt die Begruendung den Waechter, der sie pruefen soll.
    const ohneKommentare = css.replace(OHNE_KOMMENTAR, '')
    expect(/border-radius:\s*(?!0)/.test(ohneKommentare), 'border-radius').toBe(false)
    expect(/box-shadow:\s*(?!none)/.test(ohneKommentare), 'box-shadow').toBe(false)
    expect(/linear-gradient|radial-gradient/.test(ohneKommentare), 'Verlauf').toBe(false)
  })

  it('keine rohen slate-Farben mehr', () => {
    // Die sechs, mit denen dieses Repo angefangen hat. Sie stehen hier als
    // Liste und nicht als Muster: ein Muster wuerde auch die Marken-Werte
    // treffen, und dann waere der Lauf immer rot oder immer gruen.
    for (const alt of ['#0f172a', '#1e293b', '#334155', '#e2e8f0', '#94a3b8', '#f59e0b']) {
      expect(css.toLowerCase().includes(alt), `${alt} steht noch im Stilblatt`).toBe(false)
    }
  })

  it('das eine Schwarz ist die Kamera-Flaeche und kein Geschmack', () => {
    // `.sucher` ist das Videobild des Scanners. Schwarz ist dort die
    // richtige Umgebung fuer ein Kamerabild, so wie in `pi-media-station` die
    // Wiedergabe-Flaeche: jeder andere Grund faerbt das Bild. Eine
    // Marken-Regel fuer Bedienoberflaechen endet am Bild — und dieser Lauf
    // haelt fest, dass es bei DIESEM einen Schwarz bleibt.
    const schwarz = css.match(/#000\b/g) ?? []
    expect(schwarz.length, 'genau ein Schwarz, und zwar das der Kamera').toBe(1)
    // Die Regel stand bis 2026-09-18 unter `.inventur .sucher` — und griff
    // deshalb im Beladen nicht, wo mit derselben Maschinerie gescannt wird.
    // Der Wachposten folgt der Korrektur: geprueft wird die Regel, nicht die
    // Ansicht, in der sie damals zuerst gebraucht wurde.
    expect(css).toMatch(/\n\.sucher \{[^}]*background: #000;/)
  })
})

describe('Gegenprobe zum Lauf selbst', () => {
  it('`token` liest wirklich aus dem Stilblatt', () => {
    // Ein Leser, der fuer jeden Namen '' liefert, machte jede Zusicherung
    // oben zu einem Vergleich zweier leerer Zeichenketten — gruen, und ohne
    // Aussage. Deshalb einmal ein Name, den es sicher NICHT gibt, und einer,
    // den es sicher gibt.
    expect(token('--gibt-es-nicht')).toBe('')
    expect(token('--bg')).not.toBe('')
  })
})

// ───────────────────────────────────────────────────────────────────────────
// Der Druckbogen (`inventoryPrint.ts`) — dieselbe Palette, helle Gewichtung.
// ───────────────────────────────────────────────────────────────────────────
const druck = readFileSync(resolve(__dirname, '..', 'lib', 'inventoryPrint.ts'), 'utf8')

/**
 * Die `<style>`-Bloecke der Datei — JEDER, nicht der erste.
 *
 * Bis 2026-09-20 las diese Stelle mit `.exec` genau einen Block, weil es
 * genau ein Blatt gab. Mit dem Deckelblatt der Case-Inhaltsliste kam ein
 * zweites dazu, und es waere an der Farbpruefung vollstaendig vorbeigelaufen:
 * ein Waechter, der das erste Blatt misst, sagt ueber das zweite nichts und
 * sieht dabei gruen aus. Das ist die schlimmere Sorte Luecke — sie meldet
 * sich nicht.
 */
const druckStile = (): string[] =>
  [...druck.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) =>
    (m[1] ?? '').replace(OHNE_KOMMENTAR, ''),
  )

/** Alle Stilbloecke zusammen — fuer Pruefungen, die nur „kommt vor" fragen. */
const druckStil = (): string => druckStile().join('\n')

/** Die Marken-Werte, die auf hellem Grund vorkommen duerfen. */
const HELLE_PALETTE = new Set(['#F6F5F0', '#E1ECEF', '#1D324F', '#5C6B85', '#8C9CB3', '#132040'])

describe('Der Druckbogen traegt die Marke', () => {
  it('findet ueberhaupt Blaetter — sonst prueft der Rest nichts', () => {
    // Ohne diese Zeile waere eine umbenannte Datei oder ein zu Vorlagen
    // umgebauter Bogen still gruen: null Bloecke halten jede Regel ein.
    expect(druckStile().length).toBeGreaterThanOrEqual(2)
  })

  it('benutzt in JEDEM Blatt nur Farben aus der Palette', () => {
    for (const stil of druckStile()) {
      const fremd = [...stil.matchAll(/#[0-9A-Fa-f]{3,8}\b/g)]
        .map((m) => m[0])
        .filter((h) => !HELLE_PALETTE.has(h.toUpperCase()))
      expect(fremd, `fremde Farben im Druckbogen: ${fremd.join(', ')}`).toEqual([])
    }
  })

  it('steht in jedem Blatt auf Off-White und schreibt in Navy', () => {
    for (const stil of druckStile()) {
      expect(stil).toMatch(/background:\s*#F6F5F0/)
      expect(stil).toMatch(/color:\s*#1D324F/)
    }
  })

  it('traegt genau EINE Kopflinie JE BLATT', () => {
    // Guide, Gestaltungssystem 1: Kicker, darunter die durchgehende Linie,
    // eine pro Flaeche. Sie ist der Baustein, an dem ein Blatt dieses
    // Hauses erkennbar ist — und der Ersatz fuer Rahmen und Ecken.
    //
    // Gezaehlt wird je Blatt und nicht je Datei: die Regel ist „eine pro
    // FLAECHE", und ein zweites Blatt in derselben Datei ist eine zweite
    // Flaeche. Ein Zaehler auf die Datei zwaenge dazu, das zweite Blatt
    // ohne Kopflinie zu bauen, um den Waechter gruen zu halten — also
    // genau die Regel zu brechen, die er schuetzen soll.
    const blaetter = druck.split('<!doctype html>').slice(1)
    expect(blaetter.length).toBe(druckStile().length)
    for (const blatt of blaetter) {
      expect((blatt.match(/class="kopflinie"/g) ?? []).length).toBe(1)
      expect((blatt.match(/class="kicker"/g) ?? []).length).toBe(1)
    }
    for (const stil of druckStile()) {
      expect(stil).toMatch(/\.kopflinie[^}]*border-top:\s*1px solid #8C9CB3/)
    }
  })

  it('traegt KEIN Tally-Rot', () => {
    // Der Punkt ist das Aufnahmelicht. Eine Packliste nimmt nichts auf.
    expect(druck.toUpperCase()).not.toContain('#D6402E')
  })

  it('setzt die Hausschrift und keine Grautreppe', () => {
    expect(druckStil()).toMatch(/'Public Sans'/)
    // Gemessen am Stilblatt und NICHT an der Datei: der Kopf dieser Datei
    // nennt die alten Werte, um zu erklaeren, was sie abloest. Ein Waechter,
    // der an der Begruendung rot wird, zwingt dazu, die Begruendung zu
    // loeschen — dieselbe Falle wie bei den Kommentaren in `index.css`.
    for (const grau of ['#111', '#555', '#333', '#444', '#b45309']) {
      expect(druckStil().toLowerCase().includes(grau), `${grau} steht noch im Druckbogen`).toBe(false)
    }
  })

  it('hat keine Rundungen, Schatten oder Verlaeufe', () => {
    expect(/border-radius:\s*(?!0)/.test(druckStil()), 'border-radius').toBe(false)
    expect(/box-shadow:\s*(?!none)/.test(druckStil()), 'box-shadow').toBe(false)
    expect(/linear-gradient|radial-gradient/.test(druckStil()), 'Verlauf').toBe(false)
  })
})

describe('Die Hausschrift steht an einer Stelle', () => {
  it('nennt Public Sans zuerst und faellt auf die Kette des Handbuchs zurueck', () => {
    // Nicht aus dem Netz geladen — dieses Repo ist offline-first. Genannt
    // wird sie trotzdem: wer sie installiert hat, bekommt sie.
    expect(token('--font')).toBe("'Public Sans', system-ui, 'Segoe UI', Roboto, Arial, sans-serif")
  })

  it('zieht die Schrift aus dem Token und tippt sie nicht zweimal', () => {
    const familien = css.replace(OHNE_KOMMENTAR, '').match(/font-family:\s*([^;]+);/g) ?? []
    const eigene = familien.filter((f) => !f.includes('var(--font)') && !f.includes('monospace'))
    expect(eigene, `font-family neben dem Token: ${eigene.join(' | ')}`).toEqual([])
  })
})

describe('Das Signal bleibt Signal', () => {
  it('Tally-Rot ist nie eine Flaeche', () => {
    // „Nie Flaeche, nie Text, nie Rahmen" (Guide S. 9). Erlaubt sind der
    // Punkt, der Fokusring und die Akzentlinie — alles drei sind keine
    // `background`-Regeln ausser dem Punkt selbst, der genau so heisst.
    const ohne = css.replace(OHNE_KOMMENTAR, '')
    const flaechen = [...ohne.matchAll(/([.#][\w-]+(?:::?[\w-]+)?)\s*\{[^}]*background:\s*var\(--signal\)/g)].map(
      (m) => m[1],
    )
    // Die eine erlaubte Stelle ist der Punkt IM Primaerknopf. Er ist kein
    // Rahmen und keine Flaeche im Sinn des Handbuchs, sondern genau der
    // Punkt, den es dort vorschreibt — deshalb steht er namentlich da und
    // nicht als Ausnahme „irgendein `::before`".
    expect(flaechen, `Flaeche in Tally-Rot: ${flaechen.join(', ')}`).toEqual(['.knopf-primaer::before'])
  })

  it('der Punkt ist geneigt und nicht rund', () => {
    // Guide, Gestaltungssystem 2: eckig, geneigt wie das Monogramm. Ein
    // runder Punkt waere ein Aufzaehlungszeichen und kein Tally-Licht.
    expect(css).toMatch(/\.knopf-primaer::before \{[^}]*transform:\s*skewX\(-11deg\)/)
  })

  it('die Belade-Ansicht hat EINEN Primaerknopf, nicht einen je Kachel', () => {
    // „Einer pro Abschnitt." Der Streifen zeigt dieselbe Handlung am selben
    // Stueck wie die Karte darueber; ein zweiter roter Punkt daneben nimmt
    // beiden den Rang.
    const streifen = readFileSync(resolve(__dirname, '..', '..', 'ui', 'Ladeansicht', 'Ladestreifen.tsx'), 'utf8')
    expect(streifen.includes('knopf-primaer'), 'Primaerknopf im Streifen').toBe(false)

    const beladen = readFileSync(resolve(__dirname, '..', '..', 'ui', 'Beladen.tsx'), 'utf8')
    expect((beladen.match(/knopf-primaer/g) ?? []).length).toBe(1)
  })
})
