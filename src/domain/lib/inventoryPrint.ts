// ───────────────────────────────────────────────────────────────────────────
// Druck-HTML für Packlisten (pro Case/Lagerort).
//
// Rein: baut aus der abgeleiteten Packliste (`packList.ts`) ein A4-Dokument mit
// eingerückter Baumstruktur. Kein Raten — es wird nur gedruckt, was im Baum
// steht. Gesamtstückzahl aus `packListTotalCount`.
//
// ─── DAS BLATT IST DIE HELLE ANWENDUNG DER MARKE ───────────────────────────
//
// Der Brand Guide dreht zwischen Print und Web nur die GEWICHTUNG, nicht die
// Palette: Print ist hell (60 % Off-White), das Web bleibt dunkel (70 % Deep
// Navy). Dieses Blatt trug bis 2026-09-18 weder das eine noch das andere —
// `#111`, `#555`, `#333`, `#444` und ein Tailwind-Bernstein `#b45309`, also
// genau die Grautreppe, die die Marke NICHT hat. Gesehen hat es niemand,
// weil `markenPalette` nur `index.css` liest und ein Druckbogen in einer
// TS-Datei steht.
//
// Es ist ausserdem die einzige Fläche, die der Kunde ANFASST. Ein Bildschirm
// ist vergessen, wenn er aus ist; ein Blatt liegt auf dem Case, bis die
// Fahrt zurück ist.
//
// ─── DIE KOPFLINIE IST DAS GESTALTUNGSSYSTEM, KEIN SCHMUCK ─────────────────
//
// Kicker in Versalien, darunter eine durchgehende Linie in Stahlblau, bis zur
// rechten Satzkante — EINE pro Fläche. Das ist der Baustein, an dem man ein
// Blatt dieses Hauses erkennt; er ersetzt Rahmen, Ecken und Schatten, die es
// hier ausdrücklich nicht gibt.
//
// Tally-Rot kommt NICHT vor. Der Punkt ist das Aufnahmelicht, und eine
// Packliste nimmt nichts auf. Ein beschädigtes Stück wird deshalb fett und
// in Klammern gesetzt, nicht eingefärbt — Farbe hätte hier den Rang eines
// Signals, den sie nicht verdient.
//
// ─── UND ES SPRICHT DIE SPRACHE DES BENUTZERS ──────────────────────────────
//
// Es tat es nicht: „Packliste" und „Positionen" standen fest verdrahtet auf
// Deutsch, in einem Repo mit Quellsprache `en` (E-28). Auch das sah kein
// Wächter — `lang:check` liest JSX-Text, und dies ist eine Zeichenkette in
// einem Rechenmodul. Der Übersetzer kommt jetzt als LETZTER Parameter mit
// englischer Vorgabe, wie in jedem anderen Modul unter `domain/lib/`.
// ───────────────────────────────────────────────────────────────────────────
import { format, quelle, type Uebersetzen } from '../../i18n/quelle'
import type { PackListNode } from './packList'
import { packListTotalCount } from './packList'
import { isContainerKind } from './storageTree'

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Baut ein druckfertiges A4-HTML der Packliste eines Wurzel-Knotens. `code`
 * (optional) erscheint im Kopf. Datum wird vom Aufrufer übergeben (Scripts
 * dürfen keine Uhr lesen — hier egal, aber konsistent + testbar).
 */
export const buildPackListHtml = (
  rootName: string,
  rootCode: string | undefined,
  list: PackListNode[],
  dateLabel = '',
  t: Uebersetzen = quelle,
): string => {
  const total = packListTotalCount(list)
  const rows = list
    .map((n) => {
      const indent = n.depth * 6
      const marker = isContainerKind(n.node.kind) ? '&#9633;' : '&#8226;'
      const head = `<div class="node" style="margin-left:${indent}mm">${marker} <b>${esc(n.node.name)}</b>${
        n.node.code ? ` <span class="code">${esc(n.node.code)}</span>` : ''
      }</div>`
      const items = n.items
        .map((it) => `<div class="line" style="margin-left:${indent + 6}mm"><span class="qty">${it.qty}×</span> ${esc(it.model)}</div>`)
        .join('')
      const unitsHtml = n.units
        .map(
          (u) =>
            `<div class="line unit" style="margin-left:${indent + 6}mm">– ${esc(u.label)}${
              u.condition !== 'ok' ? ` <span class="cond">[${esc(u.condition)}]</span>` : ''
            }</div>`,
        )
        .join('')
      return head + items + unitsHtml
    })
    .join('\n')

  const titel = format(t('print.packList', 'Packing list — {name}'), { name: rootName })

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(titel)}</title>
<style>
  /* Marken-Palette, helle Anwendung (Brand Guide 2.0):
     Off-White #F6F5F0 Grund · Zumpe Navy #1D324F Schrift · Schiefer #5C6B85
     Sekundärtext (5,4:1 auf Weiss) · Stahlblau #8C9CB3 Linie.
     Keine Rundungen, keine Schatten, keine Verläufe — und kein Tally-Rot. */
  @page { size: A4; margin: 18mm 20mm 25mm; }
  body {
    font-family: 'Public Sans', system-ui, 'Segoe UI', Roboto, Arial, sans-serif;
    background: #F6F5F0;
    color: #1D324F;
    font-size: 10pt;
    line-height: 1.45;
  }
  /* Die Kopflinie: Kicker, darunter die durchgehende Linie. Eine pro Blatt. */
  .kicker {
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .18em;
    color: #5C6B85;
    margin: 0 0 1.5mm;
  }
  .kopflinie { border: 0; border-top: 1px solid #8C9CB3; margin: 0 0 4mm; }
  h1 { font-size: 15pt; font-weight: 800; margin: 0 0 1mm; }
  .meta { color: #5C6B85; font-size: 9pt; margin-bottom: 6mm; }
  .node { margin-top: 2.5mm; font-size: 10.5pt; }
  .code {
    font-family: 'Courier New', monospace;
    font-size: 8.5pt;
    color: #5C6B85;
  }
  .line { font-size: 9.5pt; }
  .qty { font-variant-numeric: tabular-nums; color: #5C6B85; }
  .unit { color: #5C6B85; }
  /* Fett und in Klammern statt farbig: eine Einfärbung hätte hier den Rang
     eines Signals, und das Signal dieses Hauses ist der Tally-Punkt. */
  .cond { font-weight: 700; color: #1D324F; }
</style></head><body>
  <p class="kicker">${esc(t('print.kicker', 'Packing list'))}</p>
  <hr class="kopflinie">
  <h1>${esc(rootName)}${rootCode ? ` <span class="code">${esc(rootCode)}</span>` : ''}</h1>
  <div class="meta">${esc(
    format(t('print.positions', '{n} positions'), { n: total }),
  )}${dateLabel ? ` · ${esc(dateLabel)}` : ''}</div>
  ${rows}
</body></html>`
}
