// ───────────────────────────────────────────────────────────────────────────
// Die Ausgabe der Ladeplanung: was am Dock an der Bordwand hängt (#25).
//
// Diese Datei baut NICHTS. Sie öffnet, was `domain/lib/ladeplanBlatt.ts`
// liefert, und lädt herunter, was `lib/csv.ts` daraus macht. Sie weiss als
// einzige, dass es ein Fenster und eine Datei gibt — die Blätter selbst sind
// reine Zeichenketten und in einem Test lesbar.
//
// VIER KNÖPFE UND KEIN MENÜ: es sind vier Blätter, und ein Auswahlfeld
// darüber machte aus einem Handgriff zwei.
// ───────────────────────────────────────────────────────────────────────────
import { useT } from '../i18n'
import { dateiName, herunterladen } from '../lib/herunterladen'
import {
  buildCaseEtikettenHtml,
  buildDockListeHtml,
  buildLadeplanHtml,
  ladungTabelle,
} from '../domain/lib/ladeplanBlatt'
import { toCsv } from '../lib/csv'
import type { LoadPlan } from '../domain/lib/loadPacker'
import type { Vehicle } from '../domain/types/vehicle'

interface Props {
  ladungName: string
  vehicle: Vehicle
  plan: LoadPlan
  gruppen: readonly string[]
  datum: string
  onFehler: (text: string) => void
}

export function Ladeausgabe({ ladungName, vehicle, plan, gruppen, datum, onFehler }: Props) {
  const { t } = useT()

  const oeffnen = (html: string) => {
    const w = window.open('', '_blank')
    if (!w) {
      onFehler(t('out.blocked', 'The sheet could not be opened — the browser blocked the window.'))
      return
    }
    w.document.write(html)
    w.document.close()
  }

  const csvLaden = () => {
    const { headers, rows } = ladungTabelle(plan, t)
    // Der Name der Ladung im Dateinamen, entschaerft: am Dock liegen zehn
    // Dateien nebeneinander, und „ladung.csv" ist dort keine Auskunft.
    herunterladen(
      new Blob([toCsv(headers, rows)], { type: 'text/csv;charset=utf-8' }),
      `${dateiName(ladungName) || 'load'}.csv`,
    )
  }

  return (
    <section className="block ladeausgabe">
      <h3 className="kicker">{t('out.head', 'For the dock')}</h3>
      <p className="hinweis">
        {t(
          'out.intro',
          'At the dock nobody stands with the 3D view. Every sheet carries the vehicle, the date, the placed weight and what could not be laid out, with the reason.',
        )}
      </p>
      <div className="zeile">
        <button
          type="button"
          className="still"
          onClick={() => oeffnen(buildLadeplanHtml(ladungName, vehicle, plan, gruppen, datum, t))}
        >
          {t('out.plan', 'Load plan')}
        </button>
        <button
          type="button"
          className="still"
          onClick={() => oeffnen(buildDockListeHtml(ladungName, vehicle, plan, datum, t))}
        >
          {t('out.dock', 'Dock checklist')}
        </button>
        <button
          type="button"
          className="still"
          onClick={() => oeffnen(buildCaseEtikettenHtml(ladungName, plan, datum, t))}
        >
          {t('out.labels', 'Case labels')}
        </button>
        <button type="button" className="still" onClick={csvLaden}>
          {t('out.csv', 'CSV')}
        </button>
      </div>
    </section>
  )
}
