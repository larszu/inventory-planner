// ───────────────────────────────────────────────────────────────────────────
// Etiketten für die Regale — ein A4-Bogen zum Ausdrucken und Ankleben.
//
// ─── WARUM DIESER BOGEN SO AUSSIEHT ────────────────────────────────────────
//
// Nicht nach Geschmack, sondern nach einem gemessenen Bedarf. Die Recherche
// der Suite führt ihn als Nr. 70 („Labels that survive the warehouse",
// `docs/research/synthesis/USER-NEED-DATABASE.md`), belegt an offenen
// Snipe-IT-Issues:
//
//   · #19541 — eine Vorlage für alle Grössen, also werden Etiketten mit der
//     Schere beschnitten, „sometimes trimming very close to the QR code"
//   · #18280 — der Code fehlt als TEXT, also gibt es keine Rückfallebene,
//     wenn er zerkratzt ist, ausser dem Gerät selbst
//
// Daraus folgen die drei Regeln dieses Bogens:
//
//   1. DER CODE STEHT ALS TEXT DA, gross und lesbar. Er ist die Hauptsache
//      und nicht die Beschriftung unter einem Bild: ein Regal-Etikett wird
//      aus fünf Metern gelesen, nicht gescannt.
//   2. DER PFAD STEHT DANEBEN. „A1" allein sagt nicht, in welcher Halle.
//   3. DREI GRÖSSEN, nicht eine. Ein Regalschild ist kein Fachschild.
//
// ─── KEIN BARCODE IN DIESEM BOGEN, UND DAS IST EINE ENTSCHEIDUNG ───────────
//
// Ein Strichcode müsste hier erzeugt werden — mit einer Bibliothek, die
// dieses Repo nicht hat, oder als Bild aus dem Netz, was offline-first
// verbietet. Ein falsch gerasterter Code, der beim Scannen versagt, ist
// schlimmer als keiner: er sieht aus, als müsste er gehen. Der Bogen druckt
// deshalb heute die menschenlesbare Fassung, und die ist nach dem Befund
// oben ohnehin die, die fehlte.
//
// REIN: keine Uhr, kein Store, kein IO. Das Datum kommt von aussen.
// ───────────────────────────────────────────────────────────────────────────

import { format, quelle, type Uebersetzen } from '../../i18n/quelle'
import type { StorageNode } from '../types/inventory'
import { nodePathLabel } from './storageTree'

/** Wie gross ein Etikett wird. Drei Grössen, kein Regler. */
export type EtikettGroesse = 'regal' | 'fach' | 'klein'

export interface EtikettMass {
  breiteMm: number
  hoeheMm: number
  /** Schriftgrad der Kennung in Punkt. */
  codePt: number
  /** Wieviele nebeneinander auf den Bogen passen. */
  proReihe: number
}

/** Rand des Bogens in mm. Bei 8 mm bleiben 194 mm nutzbare Breite. */
export const BOGEN_RAND_MM = 8
const NUTZBAR_MM = 210 - 2 * BOGEN_RAND_MM

/**
 * Die Masse je Grösse.
 *
 * SIE KACHELN A4, und das ist der Unterschied zwischen einem Bogen und einem
 * Stapel. Der erste Anlauf hatte 105 mm Breite — bei 194 mm nutzbarer Breite
 * passt davon genau EINES nebeneinander, und der halbe Bogen blieb leer.
 * Gemessen am gerenderten Blatt, nicht im Kopf gerechnet.
 *
 * Als Funktion und nicht als Tabelle: dieselbe Hausregel wie bei den
 * Beschriftungen.
 */
export function etikettMass(groesse: EtikettGroesse): EtikettMass {
  if (groesse === 'regal') return { breiteMm: 95, hoeheMm: 62, codePt: 44, proReihe: 2 }
  if (groesse === 'fach') return { breiteMm: 62, hoeheMm: 33, codePt: 24, proReihe: 3 }
  return { breiteMm: 46, hoeheMm: 20, codePt: 14, proReihe: 4 }
}

/** Wieviele auf ein Blatt gehen — die Zahl, die jemand vorher wissen will. */
export function proBogen(groesse: EtikettGroesse): number {
  const m = etikettMass(groesse)
  const reihen = Math.floor((297 - 2 * BOGEN_RAND_MM - 16) / (m.hoeheMm + 2))
  return m.proReihe * Math.max(1, reihen)
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Der Bogen.
 *
 * Es werden nur Knoten MIT Kennung gedruckt: ein Etikett ohne Code wäre ein
 * leerer Aufkleber, und wer ihn anklebt, hat danach ein Regal, das beschriftet
 * aussieht und keines ist.
 */
export function buildRegalEtikettenHtml(
  nodes: readonly StorageNode[],
  auswahl: readonly string[],
  groesse: EtikettGroesse,
  dateLabel = '',
  t: Uebersetzen = quelle,
): string {
  const mass = etikettMass(groesse)
  const gewaehlt = nodes.filter((n) => auswahl.includes(n.id) && n.code?.trim())

  const etiketten = gewaehlt
    .map((n) => {
      const pfad = nodePathLabel([...nodes], n.id)
      return `<div class="etikett">
      <div class="code">${esc(n.code!.trim())}</div>
      <div class="pfad">${esc(pfad)}</div>
    </div>`
    })
    .join('\n')

  const titel = t('label.sheet', 'Location labels')

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(titel)}</title>
<style>
  /* Marken-Palette, helle Anwendung — wie die Packliste. Kein Tally-Rot:
     ein Regalschild nimmt nichts auf. */
  @page { size: A4; margin: ${BOGEN_RAND_MM}mm; }
  body {
    font-family: 'Public Sans', system-ui, 'Segoe UI', Roboto, Arial, sans-serif;
    background: #F6F5F0;
    color: #1D324F;
    margin: 0;
  }
  .kicker {
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .18em;
    color: #5C6B85;
    margin: 0 0 1.5mm;
  }
  .kopflinie { border: 0; border-top: 1px solid #8C9CB3; margin: 0 0 4mm; }
  /* Feste Spaltenbreite statt umbrechendem Flex: der Bogen soll in jedem Browser
     dieselbe Kachelung haben, damit die Schnittkanten untereinander liegen.
     Nutzbar sind ${NUTZBAR_MM} mm. */
  .bogen {
    display: grid;
    grid-template-columns: repeat(${mass.proReihe}, ${mass.breiteMm}mm);
    gap: 2mm;
  }
  /* Die Schnittkante ist eine LINIE und kein Rahmen: sie sagt, wo die Schere
     ansetzt, und beansprucht keine Flaeche. */
  .etikett {
    height: ${mass.hoeheMm}mm;
    border: 1px solid #8C9CB3;
    box-sizing: border-box;
    padding: 3mm;
    display: flex;
    flex-direction: column;
    justify-content: center;
    page-break-inside: avoid;
  }
  /* Die Kennung ist die Hauptsache: ein Regal-Etikett wird aus fuenf Metern
     gelesen. Ziffern gleich breit, damit A1 und A11 untereinander stehen. */
  .code {
    font-size: ${mass.codePt}pt;
    font-weight: 800;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    letter-spacing: .02em;
  }
  .pfad {
    margin-top: 1.5mm;
    font-size: ${Math.max(7, Math.round(mass.codePt / 5))}pt;
    color: #5C6B85;
    overflow-wrap: anywhere;
  }
</style></head><body>
  <p class="kicker">${esc(titel)}</p>
  <hr class="kopflinie">
  ${
    gewaehlt.length === 0
      ? `<p>${esc(t('label.none', 'Nothing selected that carries a code — a label without a code is an empty sticker.'))}</p>`
      : `<div class="bogen">${etiketten}</div>`
  }
  <p class="kicker" style="margin-top:6mm">${esc(
    format(t('label.count', '{n} labels'), { n: gewaehlt.length }),
  )}${dateLabel ? ` · ${esc(dateLabel)}` : ''}</p>
</body></html>`
}
