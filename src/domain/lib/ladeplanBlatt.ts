// ───────────────────────────────────────────────────────────────────────────
// Was am Dock an der Bordwand hängt (#25).
//
// ─── WARUM PAPIER, WO ES EINE 3D-ANSICHT GIBT ──────────────────────────────
//
// Am Dock steht niemand mit der 3D-Ansicht. Da steht jemand mit einem Case in
// der Hand, im Halbdunkel, und braucht die Reihenfolge. Drei Blätter:
//
//   Ladeplan       das Bild — je Lage eine Draufsicht, Stücke nummeriert,
//                  Legende nach Abladegruppe
//   Dock-Liste     die Reihenfolge zum Abhaken, gross genug für schlechtes
//                  Hallenlicht, vorwärts zum Laden und rückwärts zum Abbau
//   Case-Etiketten Nummer, Ziel, Gruppe, Platz — für die Kiste selbst
//
// ─── JEDES BLATT TRÄGT DENSELBEN KOPF ──────────────────────────────────────
//
// Fahrzeug, Datum, Gesamtgewicht, Haftungshinweis. Ein Blatt ohne Fahrzeug
// ist am Dock wertlos: dort stehen drei Fahrzeuge, und die Blätter sehen
// gleich aus.
//
// ─── UND WAS NICHT PASSTE, STEHT DRAUF ─────────────────────────────────────
//
// Nicht platzierte Stücke stehen MIT GRUND auf dem Blatt und nicht nur im
// Werkzeug. Wer am Dock merkt, dass ein Case fehlt, soll auf dem Papier
// lesen, warum — sonst sucht er es im Lager.
//
// ─── DIE ZEICHNUNG IST SVG UND KEIN BILDSCHIRMFOTO ─────────────────────────
//
// Damit sie bei 40 Stücken lesbar bleibt: ein Rasterbild vom Bildschirm hat
// die Auflösung des Bildschirms, ein SVG die des Druckers. Gezeichnet wird
// aus denselben Konturen wie die Draufsicht (`kontur.ts`) — der Umriss am
// Boden, nicht das Rechteck des Hüllquaders.
//
// REIN: keine Uhr, kein Store, kein IO. Das Datum kommt von aussen.
// ───────────────────────────────────────────────────────────────────────────
import { format, quelle, type Uebersetzen } from '../../i18n/quelle'
import type { LoadPlan, Placement } from './loadPacker'
import type { Vehicle } from '../types/vehicle'
import { konturBeiHoehe } from './kontur'
import { gruppenFarbe } from './gruppenFarben'
import { haftungshinweis } from './lastverteilung'

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Die Lagen des Plans, von unten nach oben — jede mit ihren Stücken. */
export function lagen(plan: LoadPlan): { yMm: number; stuecke: Placement[] }[] {
  const nach = new Map<number, Placement[]>()
  for (const p of plan.placements) {
    const liste = nach.get(p.position.y)
    if (liste) liste.push(p)
    else nach.set(p.position.y, [p])
  }
  return [...nach.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([yMm, stuecke]) => ({
      yMm,
      stuecke: stuecke.sort((a, b) => a.ladeSchritt - b.ladeSchritt),
    }))
}

/** Die Stücke in Ladereihenfolge. */
export const inLadereihenfolge = (plan: LoadPlan): Placement[] =>
  [...plan.placements].sort((a, b) => a.ladeSchritt - b.ladeSchritt)

/** Der gemeinsame Kopf aller drei Blätter. */
function kopf(
  kicker: string,
  ladungName: string,
  v: Vehicle,
  plan: LoadPlan,
  dateLabel: string,
  t: Uebersetzen,
): string {
  const zeilen = [
    v.name,
    format(t('out.totalWeight', '{kg} kg placed'), { kg: Math.round(plan.gesetztKg) }),
    plan.ohneGewicht > 0
      ? format(t('out.unweighed', 'without a recorded weight: {n}'), { n: plan.ohneGewicht })
      : '',
    dateLabel,
  ].filter(Boolean)
  return `<p class="kicker">${esc(kicker)}</p>
  <hr class="kopflinie">
  <h1>${esc(ladungName)}</h1>
  <div class="meta">${esc(zeilen.join(' · '))}</div>
  <p class="haftung">${esc(haftungshinweis(t))}</p>`
}

/** Die gemeinsame Formatvorlage. Helle Anwendung der Marke, wie die Packliste. */
const STIL = `
  /* Marken-Palette, helle Anwendung (Brand Guide 2.0):
     Off-White #F6F5F0 Grund · Zumpe Navy #1D324F Schrift · Schiefer #5C6B85
     Sekundärtext · Stahlblau #8C9CB3 Linie. Keine Rundungen, keine Schatten,
     keine Verläufe, kein Tally-Rot. */
  @page { size: A4; margin: 15mm 16mm 18mm; }
  body {
    font-family: 'Public Sans', system-ui, 'Segoe UI', Roboto, Arial, sans-serif;
    background: #F6F5F0;
    color: #1D324F;
    font-size: 10pt;
    line-height: 1.45;
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
  h1 { font-size: 15pt; font-weight: 800; margin: 0 0 1mm; }
  h2 {
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .14em;
    color: #5C6B85;
    margin: 6mm 0 2mm;
  }
  .meta { color: #5C6B85; font-size: 9pt; }
  .haftung { color: #5C6B85; font-size: 8.5pt; margin: 1mm 0 4mm; max-width: 140mm; }
`

/**
 * Eine Lage als Draufsicht.
 *
 * Der Umriss kommt aus `konturBeiHoehe` auf der Höhe DIESER Lage: eine obere
 * Lage in einem Kastenwagen hat weniger Fläche als der Boden, und ein
 * Rechteck zu zeichnen hiesse, Platz zu zeigen, den es dort nicht gibt.
 */
function lageSvg(
  v: Vehicle,
  stuecke: readonly Placement[],
  yMm: number,
  gruppen: readonly string[],
): string {
  const raum = { x: v.cargoMm.widthMm, z: v.cargoMm.lengthMm }
  const rand = 40
  const kontur = konturBeiHoehe(v, yMm)
  const punkte = kontur.map((p) => `${rand + p.x},${rand + p.z}`).join(' ')

  const kisten = stuecke
    .map((p) => {
      const farbe = gruppenFarbe(p.gruppe, gruppen)
      const mitte = { x: rand + p.position.x + p.sizeMm.x / 2, y: rand + p.position.z + p.sizeMm.z / 2 }
      const grad = Math.max(60, Math.min(p.sizeMm.x, p.sizeMm.z) * 0.3)
      return `<rect x="${rand + p.position.x}" y="${rand + p.position.z}" width="${p.sizeMm.x}" height="${p.sizeMm.z}" fill="${farbe}" stroke="#1D324F" stroke-width="6"/>
      <text x="${mitte.x}" y="${mitte.y}" text-anchor="middle" dominant-baseline="central" font-size="${grad}" font-weight="700" fill="#1D324F">${p.ladeSchritt}</text>`
    })
    .join('\n')

  // `preserveAspectRatio` mit `meet` plus feste Rahmenhöhe im Stil: ohne das
  // wächst die Zeichnung mit dem Seitenverhältnis des Laderaums — ein 4 m
  // langer Kasten wurde auf dem ersten Bogen (gemessen 2026-09-18) 1,5 m
  // hoch und drückte den Rest von der Seite.
  return `<svg viewBox="0 0 ${raum.x + 2 * rand} ${raum.z + 2 * rand}" class="lage" preserveAspectRatio="xMidYMid meet">
    <polygon points="${punkte}" fill="none" stroke="#8C9CB3" stroke-width="8"/>
    ${kisten}
    <line x1="${rand}" y1="${rand + raum.z}" x2="${rand + raum.x}" y2="${rand + raum.z}" stroke="#1D324F" stroke-width="14"/>
  </svg>`
}

/** Das Bild: je Lage eine Draufsicht, plus Legende und was nicht passte. */
export function buildLadeplanHtml(
  ladungName: string,
  v: Vehicle,
  plan: LoadPlan,
  gruppen: readonly string[],
  dateLabel = '',
  t: Uebersetzen = quelle,
): string {
  const bilder = lagen(plan)
    .map(
      ({ yMm, stuecke }, i) => `<figure class="lage-block">
      <figcaption>${esc(
        format(t('out.layer', 'Layer {n} — {y} mm above the floor · pieces: {c}'), {
          n: i + 1,
          y: yMm,
          c: stuecke.length,
        }),
      )}</figcaption>
      ${lageSvg(v, stuecke, yMm, gruppen)}
    </figure>`,
    )
    .join('\n')

  // Die Legende umrandet ihre Flächen: die Gruppentöne sind gegen Deep Navy
  // gewählt, und „Nebel" ist auf Off-White fast weiss.
  const legende = gruppen
    .map(
      (g) =>
        `<li><span class="tupfer" style="background:${gruppenFarbe(g, gruppen)}"></span>${esc(g)}</li>`,
    )
    .join('')

  const offen = plan.unplaced
    .map((u) => `<li><strong>${esc(u.label)}</strong> — ${esc(u.text)}</li>`)
    .join('')

  const titel = format(t('out.planTitle', 'Load plan — {name}'), { name: ladungName })

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(titel)}</title>
<style>${STIL}
  /* Zwei Lagen nebeneinander, solange sie passen: ein Blatt je Lage wäre bei
     vier Lagen ein Stapel, den am Dock niemand blättert. */
  .lagen { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }
  .lage-block { margin: 0; page-break-inside: avoid; }
  .lage-block figcaption { font-size: 8.5pt; color: #5C6B85; margin-bottom: 1.5mm; }
  /* Feste Höhe, damit zwei Lagen nebeneinander auf eine Seite gehen und
     jede Lage gleich gross ist — gleich gross heisst vergleichbar. */
  .lage { width: 100%; height: 105mm; }
  ul { margin: 0; padding-left: 5mm; }
  .legende { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 4mm; }
  .tupfer {
    display: inline-block;
    width: 4mm;
    height: 4mm;
    margin-right: 1.5mm;
    vertical-align: -0.5mm;
    border: 1px solid #5C6B85;
  }
</style></head><body>
  ${kopf(t('out.planKicker', 'Load plan'), ladungName, v, plan, dateLabel, t)}

  <h2>${esc(t('out.groups', 'Unload groups — first group comes out first'))}</h2>
  <ul class="legende">${legende}</ul>

  <div class="lagen">${bilder}</div>

  ${
    offen
      ? `<h2>${esc(t('out.notPlaced', 'Not laid out'))}</h2><ul>${offen}</ul>`
      : ''
  }
</body></html>`
}

/**
 * Die Dock-Liste.
 *
 * GROSS, und das ist kein Geschmack: sie wird im Hallenlicht gelesen, von
 * jemandem mit einem Case in der Hand. 13 pt statt 10, die Nummer fett, das
 * Kästchen daneben gross genug für einen Handschuh.
 *
 * Vorwärts UND rückwärts auf demselben Blatt: der Abbau läuft in der
 * umgekehrten Reihenfolge, und zwei Blätter wären zwei Stände.
 */
export function buildDockListeHtml(
  ladungName: string,
  v: Vehicle,
  plan: LoadPlan,
  dateLabel = '',
  t: Uebersetzen = quelle,
): string {
  const reihe = inLadereihenfolge(plan)

  const zeilen = (liste: readonly Placement[]): string =>
    liste
      .map(
        (p) => `<tr>
      <td class="kasten"></td>
      <td class="nr">${p.ladeSchritt}</td>
      <td>${esc(p.label)}</td>
      <td class="leise">${esc(p.gruppe ?? t('out.noGroup', 'no group'))}</td>
      <td class="leise">${esc(
        format(t('out.spot', '{x}/{z} mm, layer at {y} mm'), {
          x: p.position.x,
          z: p.position.z,
          y: p.position.y,
        }),
      )}</td>
    </tr>`,
      )
      .join('')

  const offen = plan.unplaced
    .map((u) => `<li><strong>${esc(u.label)}</strong> — ${esc(u.text)}</li>`)
    .join('')

  const titel = format(t('out.dockTitle', 'Dock checklist — {name}'), { name: ladungName })

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(titel)}</title>
<style>${STIL}
  /* Für schlechtes Hallenlicht: grösser als jedes andere Blatt dieses Hauses. */
  table { width: 100%; border-collapse: collapse; font-size: 13pt; }
  td { padding: 2mm 1mm; border-bottom: 1px solid #8C9CB3; vertical-align: middle; }
  .kasten {
    width: 8mm;
    height: 8mm;
    border: 1.5px solid #1D324F;
    padding: 0;
  }
  .nr { width: 12mm; font-weight: 800; font-variant-numeric: tabular-nums; }
  .leise { color: #5C6B85; font-size: 10pt; }
  ul { margin: 0; padding-left: 5mm; }
  /* Im Druck eine neue Seite, am Bildschirm wenigstens Luft: ohne den
     Abstand klebte die Rückladeliste an der Fussnote der ersten. */
  .zweites { page-break-before: always; margin-top: 10mm; }
</style></head><body>
  ${kopf(t('out.dockKicker', 'Dock checklist'), ladungName, v, plan, dateLabel, t)}

  <h2>${esc(t('out.loading', 'Loading — in this order'))}</h2>
  <table>${zeilen(reihe)}</table>

  ${offen ? `<h2>${esc(t('out.notPlaced', 'Not laid out'))}</h2><ul>${offen}</ul>` : ''}

  <div class="zweites">
    ${kopf(t('out.returnKicker', 'Return list'), ladungName, v, plan, dateLabel, t)}
    <h2>${esc(t('out.unloading', 'Unloading — the same list backwards'))}</h2>
    <table>${zeilen([...reihe].reverse())}</table>
  </div>
</body></html>`
}

/**
 * Die Case-Etiketten.
 *
 * Nummer gross, darunter Ladung, Gruppe und Platz. Sie kleben auf der Kiste
 * und beantworten am Dock die Frage „wo kommt DAS hin" ohne Blatt und ohne
 * Bildschirm.
 *
 * Dieselbe Kachelung wie die Regal-Etiketten (`regalEtiketten.ts`) — 62 ×
 * 33 mm, drei je Reihe. Die Masse dort sind an einem gerenderten Bogen
 * gemessen und nicht im Kopf gerechnet; sie hier zu wiederholen hiesse, die
 * Messung zu kopieren statt sie zu benutzen.
 */
export function buildCaseEtikettenHtml(
  ladungName: string,
  plan: LoadPlan,
  dateLabel = '',
  t: Uebersetzen = quelle,
): string {
  const etiketten = inLadereihenfolge(plan)
    .map(
      (p) => `<div class="etikett">
      <div class="nr">${p.ladeSchritt}</div>
      <div class="text">${esc(p.label)}</div>
      <div class="pfad">${esc(
        [ladungName, p.gruppe, format(t('out.spotShort', '{x}/{z} mm'), { x: p.position.x, z: p.position.z })]
          .filter(Boolean)
          .join(' · '),
      )}</div>
    </div>`,
    )
    .join('\n')

  const titel = format(t('out.labelTitle', 'Case labels — {name}'), { name: ladungName })

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(titel)}</title>
<style>${STIL}
  @page { size: A4; margin: 8mm; }
  .bogen { display: grid; grid-template-columns: repeat(3, 62mm); gap: 2mm; }
  .etikett {
    height: 33mm;
    border: 1px solid #8C9CB3;
    box-sizing: border-box;
    padding: 2.5mm;
    display: flex;
    flex-direction: column;
    justify-content: center;
    page-break-inside: avoid;
  }
  .etikett .nr {
    font-size: 24pt;
    font-weight: 800;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .etikett .text { font-size: 10pt; font-weight: 700; margin-top: 1mm; overflow-wrap: anywhere; }
  .etikett .pfad { font-size: 7.5pt; color: #5C6B85; overflow-wrap: anywhere; }
</style></head><body>
  <p class="kicker">${esc(t('out.labelKicker', 'Case labels'))}</p>
  <hr class="kopflinie">
  ${
    etiketten
      ? `<div class="bogen">${etiketten}</div>`
      : `<p>${esc(t('out.labelNone', 'Nothing is laid out — there is nothing to label.'))}</p>`
  }
  <p class="kicker" style="margin-top:6mm">${esc(ladungName)}${
    dateLabel ? ` · ${esc(dateLabel)}` : ''
  }</p>
</body></html>`
}

/**
 * Die Ladung als Tabelle, für die Weitergabe.
 *
 * Kopfzeile plus Zeilen, noch kein CSV: das Serialisieren gehört dem
 * generischen Helfer (`lib/csv.ts`), die Frage „welche Spalten" gehört der
 * Domäne. Nicht platzierte Stücke stehen MIT drin — eine Liste, aus der sie
 * stillschweigend fehlen, sieht vollständig aus und ist es nicht.
 */
export function ladungTabelle(
  plan: LoadPlan,
  t: Uebersetzen = quelle,
): { headers: string[]; rows: (string | number)[][] } {
  const headers = [
    t('out.csv.step', 'Order'),
    t('out.csv.label', 'Piece'),
    t('out.csv.group', 'Unload group'),
    t('out.csv.weight', 'kg'),
    t('out.csv.x', 'x mm'),
    t('out.csv.y', 'y mm'),
    t('out.csv.z', 'z mm'),
    t('out.csv.size', 'w × h × d mm'),
    t('out.csv.state', 'State'),
  ]
  const rows: (string | number)[][] = inLadereihenfolge(plan).map((p) => [
    p.ladeSchritt,
    p.label,
    p.gruppe ?? '',
    p.weightKg ?? '',
    p.position.x,
    p.position.y,
    p.position.z,
    `${p.sizeMm.x} × ${p.sizeMm.y} × ${p.sizeMm.z}`,
    p.verankert ? t('out.csv.byHand', 'placed by hand') : t('out.csv.byPacker', 'placed by the packer'),
  ])
  for (const u of plan.unplaced) {
    rows.push(['', u.label, '', '', '', '', '', '', u.text])
  }
  return { headers, rows }
}
