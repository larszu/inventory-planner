// ───────────────────────────────────────────────────────────────────────────
// Welches Rack des Signal-Plans in diesem Case sitzt.
//
// Die Bestückung reicht der Plan als Datei herüber (`cable-planner`,
// Bibliothek → Racks → „Fürs Lager", Format `avplan-rack-belegung`). Hier
// wird sie eingelesen und das Rack gewählt; die Kennung (`planRef`) ist der
// Faden, an dem `rackGegenPlan` die Bestückung wiederfindet.
//
// Ohne Datei bleibt das Freitextfeld: wer die Kennung kennt, trägt sie ein,
// und sobald die Datei kommt, findet sich das Rack von selbst.
// ───────────────────────────────────────────────────────────────────────────
import { useRef, useState } from 'react'
import { useT } from '../../i18n'
import { usePlanRackStore } from '../../domain/store/planRackStore'

interface Props {
  planRef: string | undefined
  onSetze: (planRef: string | undefined) => void
}

export function PlanRackWahl({ planRef, onSetze }: Props) {
  const { t, format } = useT()
  const racks = usePlanRackStore((s) => s.racks)
  const eingelesen = usePlanRackStore((s) => s.eingelesen)
  const einlesen = usePlanRackStore((s) => s.einlesen)
  const dateiFeld = useRef<HTMLInputElement>(null)
  const [meldung, setMeldung] = useState<string | null>(null)

  const dateiGewaehlt = async (datei: File | undefined) => {
    if (!datei) return
    const ok = einlesen(await datei.text())
    setMeldung(
      ok
        ? null
        : t(
            'planRack.notAFile',
            'This is not a rack file from the signal plan. In the Cable Planner: Library → Racks → For the warehouse.',
          ),
    )
    if (dateiFeld.current) dateiFeld.current.value = ''
  }

  const bekannt = racks.some((r) => r.planRef === planRef)

  return (
    <>
      <label>
        {t('ausbau.rackRef', 'Rack in the signal plan')}
        {racks.length > 0 ? (
          <select
            value={planRef ?? ''}
            onChange={(e) => onSetze(e.target.value || undefined)}
            aria-label={t('ausbau.rackRef', 'Rack in the signal plan')}
          >
            <option value="">—</option>
            {/* Eine Kennung, die die Datei nicht mehr kennt, bleibt wählbar
                stehen: sie still zu leeren hiesse, die Verbindung zu kappen,
                ohne dass es jemand gesagt hat. Der Befund sagt es. */}
            {planRef && !bekannt && <option value={planRef}>{planRef}</option>}
            {racks.map((r) => (
              <option key={r.planRef} value={r.planRef}>
                {format(t('planRack.option', '{name} · {he} U'), { name: r.name, he: String(r.hoeheHE) })}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={planRef ?? ''}
            onChange={(e) => onSetze(e.target.value.trim() || undefined)}
            placeholder={t('ausbau.rackRefPlaceholder', 'name or code of the rack')}
            aria-label={t('ausbau.rackRef', 'Rack in the signal plan')}
          />
        )}
      </label>
      <button type="button" onClick={() => dateiFeld.current?.click()}>
        {t('planRack.load', 'Load rack file from the plan')}
      </button>
      <input
        ref={dateiFeld}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => void dateiGewaehlt(e.target.files?.[0])}
      />
      {eingelesen && (
        <p className="hinweis">
          {format(t('planRack.loaded', '{n} racks from the plan, loaded {wann}.'), {
            n: String(racks.length),
            wann: new Date(eingelesen).toLocaleString(),
          })}
        </p>
      )}
      {meldung && <p className="hinweis">{meldung}</p>}
    </>
  )
}
