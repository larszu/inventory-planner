// ───────────────────────────────────────────────────────────────────────────
// Der Lastverteilungsplan als Blatt (#24).
//
// ─── WARUM ES DIESES BLATT GIBT ────────────────────────────────────────────
//
// Es ist in Deutschland das Papier, nach dem bei einer Kontrolle gefragt
// wird. Ein Bildschirm ist vergessen, wenn er aus ist; dieses Blatt liegt im
// Fahrerhaus, bis die Fahrt zurück ist. Deshalb steht darauf, was gefragt
// wird — Fahrzeug, Ladung, Achslasten, Datum —, und deshalb steht dort, wo
// eine Zahl fehlt, ein SATZ und keine Lücke.
//
// ─── ES ERTEILT KEINE FREIGABE, UND DAS STEHT OBEN ─────────────────────────
//
// Nicht im Kleingedruckten und nicht am Fuss: der Haftungshinweis steht im
// Kopf, wo er gelesen wird. Ein Blatt, das „in Ordnung" suggeriert, ohne die
// reale Kiste gesehen zu haben, wäre schlimmer als gar keines — die
// Verantwortung bleibt bei Fahrer und Verlader.
//
// ─── DIE HELLE ANWENDUNG DER MARKE ─────────────────────────────────────────
//
// Wie der Packlisten-Bogen: Off-White, Zumpe Navy, Schiefer, Stahlblau, eine
// Kopflinie aus Kicker plus Linie, keine Rundungen, keine Schatten. Und kein
// Tally-Rot — auch nicht für die Überschreitung: der Punkt ist das
// Aufnahmelicht, nicht die Warnleuchte. Was überschritten ist, steht fett
// und mit der Zahl da; eine Zahl liest man, eine rote Fläche überliest man.
//
// REIN: keine Uhr. Das Datum kommt vom Aufrufer.
// ───────────────────────────────────────────────────────────────────────────
import { format, quelle, type Uebersetzen } from '../../i18n/quelle'
import type { LoadPlan } from './loadPacker'
import type { Vehicle } from '../types/vehicle'
import { achslasten, haftungshinweis, schwerpunkt, sicherungsmittel, ueberladung } from './lastverteilung'

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Eine Zeile „Bezeichnung — Wert", wobei der Wert auch ein Satz sein darf. */
const zeile = (name: string, wert: string, fett = false): string =>
  `<tr><th>${esc(name)}</th><td${fett ? ' class="dick"' : ''}>${esc(wert)}</td></tr>`

export function buildLastverteilungHtml(
  ladungName: string,
  v: Vehicle,
  plan: LoadPlan,
  dateLabel = '',
  t: Uebersetzen = quelle,
): string {
  const sp = schwerpunkt(plan, t)
  const achsen = achslasten(plan, v, t)
  const ueber = ueberladung(plan, v, t)

  const kopf: string[] = [
    zeile(t('sheet.vehicle', 'Vehicle'), v.name),
    zeile(
      t('sheet.cargoSpace', 'Cargo space'),
      format(t('sheet.cargoSpaceValue', '{l} × {w} × {h} mm'), {
        l: v.cargoMm.lengthMm,
        w: v.cargoMm.widthMm,
        h: v.cargoMm.heightMm,
      }),
    ),
    zeile(
      t('sheet.payload', 'Payload rating'),
      v.nutzlastKg === undefined
        ? t('vehicle.noPayload', 'No payload rating recorded for this vehicle.')
        : format(t('sheet.kg', '{n} kg'), { n: v.nutzlastKg }),
    ),
    zeile(
      t('sheet.loaded', 'Placed weight'),
      format(t('sheet.kg', '{n} kg'), { n: Math.round(plan.gesetztKg) }),
    ),
  ]

  if (plan.ohneGewicht > 0) {
    kopf.push(
      zeile(
        t('sheet.unweighed', 'Not weighed'),
        format(
          t('sheet.unweighedValue', 'Pieces on board without a recorded weight: {n}. They are in no figure below.'),
          { n: plan.ohneGewicht },
        ),
        true,
      ),
    )
  }

  if (ueber.bekannt && ueber.wert) {
    kopf.push(
      zeile(
        t('sheet.over', 'Over the payload'),
        format(t('sheet.overValue', 'By {n} kg — reached with {label}, in loading order.'), {
          n: ueber.wert.ueberKg,
          label: ueber.wert.label,
        }),
        true,
      ),
    )
  }

  const schwerpunktZeile = sp.bekannt
    ? format(
        t('sheet.cogValue', '{z} mm from the front edge of the floor, {x} mm from the left wall, {y} mm up'),
        { z: sp.wert.zMm, x: sp.wert.xMm, y: sp.wert.yMm },
      )
    : sp.grund

  const achsRows = achsen.bekannt
    ? achsen.wert
        .map((a, i) => {
          const name =
            i === 0 ? t('sheet.frontAxle', 'Front axle') : t('sheet.rearAxle', 'Rear axle')
          const teile = [
            format(t('sheet.fromLoad', 'from the load {n} kg'), { n: a.ausLadungKg }),
            a.gesamtKg === undefined
              ? t('sheet.noEmptyAxle', 'empty axle load not weighed — no total')
              : format(t('sheet.total', 'total {n} kg'), { n: a.gesamtKg }),
            format(t('sheet.permitted', 'permitted {n} kg'), { n: a.maxLastKg }),
          ]
          const satz = teile.join(' · ')
          const ueberSatz =
            a.ueberKg === undefined
              ? ''
              : ` — ${format(t('sheet.axleOver', 'over by {n} kg'), { n: a.ueberKg })}`
          return zeile(name, satz + ueberSatz, a.ueberKg !== undefined)
        })
        .join('')
    : zeile(t('sheet.axleLoads', 'Axle loads'), achsen.grund)

  const mittel = sicherungsmittel(t)
    .map((s) => `<li>${esc(s)}</li>`)
    .join('')

  const titel = format(t('sheet.title', 'Load distribution plan — {name}'), { name: ladungName })

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(titel)}</title>
<style>
  /* Marken-Palette, helle Anwendung (Brand Guide 2.0):
     Off-White #F6F5F0 Grund · Zumpe Navy #1D324F Schrift · Schiefer #5C6B85
     Sekundärtext · Stahlblau #8C9CB3 Linie. Keine Rundungen, keine Schatten,
     keine Verläufe — und kein Tally-Rot, auch nicht für die Überschreitung. */
  @page { size: A4; margin: 18mm 20mm 25mm; }
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
    margin: 7mm 0 2mm;
  }
  .haftung { color: #5C6B85; font-size: 9pt; margin: 0 0 6mm; max-width: 130mm; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; vertical-align: top; padding: 1.2mm 0; }
  th {
    width: 42mm;
    font-weight: 400;
    color: #5C6B85;
    font-size: 9pt;
  }
  td { font-variant-numeric: tabular-nums; }
  tr + tr th, tr + tr td { border-top: 1px solid #8C9CB3; }
  /* Fett und mit der Zahl statt farbig: eine rote Fläche überliest man. */
  .dick { font-weight: 700; }
  ul { margin: 0; padding-left: 5mm; color: #1D324F; }
  li { margin: 0.8mm 0; }
  .fuss { color: #5C6B85; font-size: 8.5pt; margin-top: 8mm; }
</style></head><body>
  <p class="kicker">${esc(t('sheet.kicker', 'Load distribution plan'))}</p>
  <hr class="kopflinie">
  <h1>${esc(ladungName)}</h1>
  <p class="haftung">${esc(haftungshinweis(t))}</p>

  <h2>${esc(t('sheet.vehicleAndLoad', 'Vehicle and load'))}</h2>
  <table>${kopf.join('')}</table>

  <h2>${esc(t('sheet.cog', 'Centre of gravity'))}</h2>
  <table>${zeile(t('sheet.cogRow', 'Position'), schwerpunktZeile)}</table>

  <h2>${esc(t('sheet.axleLoads', 'Axle loads'))}</h2>
  <table>${achsRows}</table>

  <h2>${esc(t('sheet.securing', 'Securing kit — checklist'))}</h2>
  <ul>${mittel}</ul>

  <p class="fuss">${esc(
    t('sheet.securingNote', 'A list, not a calculation: which means a piece needs depends on friction, centre of gravity and body — none of which this tool knows.'),
  )}${dateLabel ? ` · ${esc(dateLabel)}` : ''}</p>
</body></html>`
}
