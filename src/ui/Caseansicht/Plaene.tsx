// ───────────────────────────────────────────────────────────────────────────
// DIE VIER PLÄNE — Schaum, Divider, Schubladen, Rack.
//
// Sie stehen zusammen, weil sie eine Sache gemeinsam haben: sie ZEICHNEN
// nur. Gerechnet wird in `domain/lib/caseLayout` und `caseAusbauLayout`; wer
// hier eine Passt-Regel ergänzt, hat die zweite Wahrheit darüber, ob etwas
// hineingeht.
//
// ─── DIE DRAUFSICHT IST SVG UND KEIN BILDSCHIRMFOTO ────────────────────────
//
// Damit sie bei vierzig Fächern lesbar bleibt: ein Rasterbild hat die
// Auflösung des Bildschirms, ein SVG die des Druckers. Und sie steht sofort
// da, während die 3D-Ansicht noch lädt.
//
// ─── DIE OBERSTE LAGE ZUERST ───────────────────────────────────────────────
//
// Ein Case wird von oben aufgemacht: was man sieht, wenn der Deckel aufgeht,
// steht auch oben auf dem Blatt. Die NUMMER der Lage zählt dagegen von unten
// (Lage 1 liegt am Boden) — beides zusammen ist die Reihenfolge beim Ein-
// und Auspacken.
// ───────────────────────────────────────────────────────────────────────────
import { useT } from '../../i18n'
import type { CaseInnenmass } from '../../domain/types/caseAusbau'
import { fuellgrad, type CaseLage } from '../../domain/lib/caseLayout'
import type { DividerPlan, RackPlan, SchubladenPlan } from '../../domain/lib/caseAusbauLayout'
import { GRUPPEN_TOENE } from '../../domain/lib/gruppenFarben'

type Innen = Required<CaseInnenmass>

/** Der gemeinsame Rahmen jeder Draufsicht: Innenwand plus Koordinatenraum. */
function Draufsicht({
  innen,
  beschriftung,
  children,
}: {
  innen: Innen
  beschriftung: string
  children: React.ReactNode
}) {
  return (
    <svg
      className="draufsicht"
      viewBox={`-10 -10 ${innen.widthMm + 20} ${innen.depthMm + 20}`}
      role="img"
      aria-label={beschriftung}
    >
      {/* Die INNENWAND, nicht das Aussenmass: gezeichnet wird, was wirklich
          frei ist. */}
      <rect
        x={0}
        y={0}
        width={innen.widthMm}
        height={innen.depthMm}
        fill="none"
        stroke="var(--leise)"
        strokeWidth={4}
      />
      {children}
    </svg>
  )
}

/** Die Nummer im Fach. Der Name steht in der Liste daneben — ein Modellname
 *  in einem 80-mm-Fach ist bei jedem Massstab unlesbar. */
function FachNummer({ x, y, b, t: tiefe, nr }: { x: number; y: number; b: number; t: number; nr: number }) {
  return (
    <text
      x={x + b / 2}
      y={y + tiefe / 2}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={Math.max(20, Math.min(b, tiefe) / 3)}
      fill="var(--text)"
    >
      {nr}
    </text>
  )
}

// ── SCHAUM ─────────────────────────────────────────────────────────────────

export function SchaumLage({
  lage,
  innen,
  nr,
  vonOben,
  auswahl,
  onWaehle,
}: {
  lage: CaseLage
  innen: Innen
  nr: number
  vonOben: boolean
  auswahl?: string
  onWaehle: (id: string | undefined) => void
}) {
  const { t, format } = useT()
  return (
    <div className="draufsicht-rahmen">
      <p className="draufsicht-legende">
        {format(t('case.layer', 'Layer {nr} · {mm} mm high · {pct}% of the floor used'), {
          nr,
          mm: lage.hoeheMm,
          pct: Math.round(fuellgrad(lage, innen) * 100),
        })}
        {vonOben ? ` · ${t('case.layer.top', 'this is what you see when the lid opens')}` : ''}
      </p>
      <Draufsicht innen={innen} beschriftung={format(t('case.layer.aria', 'Layer {nr} seen from above'), { nr })}>
        {lage.faecher.map((f, i) => (
          <g key={f.stueckId} onClick={() => onWaehle(auswahl === f.stueckId ? undefined : f.stueckId)}>
            <rect
              x={f.xMm}
              y={f.zMm}
              width={f.breiteMm}
              height={f.tiefeMm}
              fill={GRUPPEN_TOENE[i % GRUPPEN_TOENE.length]}
              fillOpacity={auswahl === f.stueckId ? 0.65 : 0.35}
              stroke="var(--leise)"
              strokeWidth={auswahl === f.stueckId ? 6 : 3}
            />
            <FachNummer x={f.xMm} y={f.zMm} b={f.breiteMm} t={f.tiefeMm} nr={f.nr} />
          </g>
        ))}
      </Draufsicht>
      <ol className="messliste">
        {lage.faecher.map((f) => (
          <li key={f.stueckId}>
            {f.nr} · {f.label} · {f.breiteMm} × {f.tiefeMm} × {f.hoeheMm} mm
            {f.gedreht ? ` · ${t('case.turned', 'turned')}` : ''}
          </li>
        ))}
      </ol>
    </div>
  )
}

// ── DIVIDER ────────────────────────────────────────────────────────────────

export function DividerAnsicht({ plan, innen }: { plan: DividerPlan; innen: Innen }) {
  const { t, format } = useT()
  return (
    <div className="draufsicht-rahmen">
      <p className="draufsicht-legende">
        {format(t('divider.legend', 'Compartments: {n} · {pct}% of the floor is compartment, the rest is wall'), {
          n: plan.faecher.length,
          pct: Math.round(plan.ausnutzung * 100),
        })}
      </p>
      <Draufsicht innen={innen} beschriftung={t('divider.aria', 'The division seen from above')}>
        {plan.faecher.map((f, i) => (
          <g key={f.nr}>
            <rect
              x={f.xMm}
              y={f.zMm}
              width={f.breiteMm}
              height={f.tiefeMm}
              fill={f.stuecke.length ? GRUPPEN_TOENE[i % GRUPPEN_TOENE.length] : 'transparent'}
              fillOpacity={0.35}
              stroke="var(--leise)"
              strokeWidth={3}
            />
            <FachNummer x={f.xMm} y={f.zMm} b={f.breiteMm} t={f.tiefeMm} nr={f.nr} />
          </g>
        ))}
      </Draufsicht>
      <ol className="messliste">
        {plan.faecher.map((f) => (
          <li key={f.nr}>
            {f.nr} · {f.breiteMm} × {f.tiefeMm} mm ·{' '}
            {f.stuecke.length
              ? f.stuecke.map((s) => s.label).join(', ')
              : t('divider.empty', 'empty')}
          </li>
        ))}
      </ol>
    </div>
  )
}

// ── SCHUBLADEN ─────────────────────────────────────────────────────────────

/**
 * Die Auszüge als Schnitt von der Seite.
 *
 * VON DER SEITE und nicht von oben: bei Schubladen ist die Frage, welcher
 * Auszug wie hoch ist und was oben frei bleibt. Eine Draufsicht zeigte
 * immer nur den obersten.
 */
export function SchubladenAnsicht({ plan, innen }: { plan: SchubladenPlan; innen: Innen }) {
  const { t, format } = useT()
  return (
    <div className="draufsicht-rahmen">
      <p className="draufsicht-legende">
        {plan.passtNicht
          ? t('drawers.tooTall', 'The drawers together are taller than the case.')
          : format(t('drawers.legend', 'Drawers: {n} · {mm} mm stay free above'), {
              n: plan.lagen.length,
              mm: plan.restHoeheMm,
            })}
      </p>
      <svg
        className="draufsicht"
        viewBox={`-10 -10 ${innen.widthMm + 20} ${innen.heightMm + 20}`}
        role="img"
        aria-label={t('drawers.aria', 'The drawers seen from the side')}
      >
        <rect
          x={0}
          y={0}
          width={innen.widthMm}
          height={innen.heightMm}
          fill="none"
          stroke="var(--leise)"
          strokeWidth={4}
        />
        {plan.lagen.map((l, i) => {
          // Von UNTEN gestapelt, aber SVG zählt y von oben — deshalb gespiegelt.
          const y = innen.heightMm - l.yMm - l.hoeheMm
          return (
            <g key={l.schublade.id}>
              <rect
                x={0}
                y={y}
                width={innen.widthMm}
                height={l.hoeheMm}
                fill={GRUPPEN_TOENE[i % GRUPPEN_TOENE.length]}
                fillOpacity={0.35}
                stroke="var(--leise)"
                strokeWidth={3}
              />
              <text
                x={innen.widthMm / 2}
                y={y + l.hoeheMm / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={Math.max(18, l.hoeheMm / 2.5)}
                fill="var(--text)"
              >
                {l.schublade.name}
              </text>
            </g>
          )
        })}
      </svg>
      {plan.ohneHoehe.length > 0 && (
        <p className="warnung">
          {format(t('drawers.noHeight', 'Without a clear height, not stacked: {n}'), {
            n: plan.ohneHoehe.length,
          })}
        </p>
      )}
    </div>
  )
}

// ── RACK ───────────────────────────────────────────────────────────────────

/**
 * Das Rack als Höheneinheiten, von oben nach unten gezeichnet.
 *
 * Gezählt wird von UNTEN (HE 1 ist unten, so zählt die Branche), gezeichnet
 * von oben — genau wie man davorsteht.
 */
export function RackAnsicht({ plan }: { plan: RackPlan }) {
  const { t, format } = useT()

  // OHNE HÖHENEINHEITEN GIBT ES KEIN BILD — aber sehr wohl eine Auskunft.
  // Gemessen am 2026-09-20: hier stand ein blosses `return null`, und damit
  // verschluckte die Ansicht genau den Satz, der sagt, was fehlt. Eine
  // Fläche, die auf eine Eingabe gar nicht antwortet, ist von einer kaputten
  // nicht zu unterscheiden.
  if (plan.einheiten.length === 0) {
    return plan.befunde.length > 0 ? (
      <ul className="messliste">
        {plan.befunde.map((b, i) => (
          <li key={`${b.art}-${i}`} className="warnung">
            {b.text}
          </li>
        ))}
      </ul>
    ) : null
  }

  const HE_MM = 44.45
  const breite = 483
  const hoehe = plan.einheiten.length * HE_MM

  return (
    <div className="draufsicht-rahmen">
      <p className="draufsicht-legende">
        {format(t('rack.legend', '{he} U · {frei} free'), {
          he: plan.einheiten.length,
          frei: plan.freiHE,
        })}
      </p>
      <svg
        className="draufsicht"
        viewBox={`-10 -10 ${breite + 20} ${hoehe + 20}`}
        role="img"
        aria-label={t('rack.aria', 'The rack seen from the front')}
      >
        <rect x={0} y={0} width={breite} height={hoehe} fill="none" stroke="var(--leise)" strokeWidth={4} />
        {plan.einheiten.map((e, i) => {
          const y = hoehe - (e.he * HE_MM)
          return (
            <g key={e.he}>
              <rect
                x={0}
                y={y}
                width={breite}
                height={HE_MM}
                fill={e.belegtVon ? GRUPPEN_TOENE[i % GRUPPEN_TOENE.length] : 'transparent'}
                fillOpacity={0.35}
                stroke="var(--leise)"
                strokeWidth={1}
              />
              <text x={6} y={y + HE_MM / 2} dominantBaseline="central" fontSize={18} fill="var(--leise)">
                {e.he}
              </text>
              {e.belegtVon && (
                <text
                  x={breite / 2}
                  y={y + HE_MM / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={20}
                  fill="var(--text)"
                >
                  {e.belegtVon}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {plan.befunde.length > 0 && (
        <ul className="messliste">
          {plan.befunde.map((b, i) => (
            <li key={`${b.art}-${i}`} className={b.art === 'kein-plan' ? undefined : 'warnung'}>
              {b.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
