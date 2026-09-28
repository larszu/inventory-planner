// Aussenmasse und Leergewicht der Schale. Sie stehen am Lagerknoten und nicht
// im Ausbau, weil die Ladeplanung sie dort liest. Vorher gab es in der ganzen
// Oberflaeche keinen Weg, sie einzutragen: ein selbst angelegtes Case blieb
// in jeder Ladung „cannot be laid out", egal was man im Ausbau ausfuellte.
import { useT } from '../../i18n'
import type { PhysicalDimensions } from '../../domain/types/inventory'

interface Props {
  dimensions: PhysicalDimensions | undefined
  onSetze: (d: PhysicalDimensions) => void
}

export function AussenFelder({ dimensions, onSetze }: Props) {
  const { t } = useT()

  const feld = (schluessel: keyof PhysicalDimensions, label: string) => (
    <label>
      {label}
      <input
        type="number"
        min={0}
        value={dimensions?.[schluessel] ?? ''}
        onChange={(e) =>
          onSetze({
            ...dimensions,
            [schluessel]: e.target.value === '' ? undefined : Number(e.target.value),
          })
        }
        aria-label={label}
      />
    </label>
  )

  return (
    <>
      <div className="zeile">
        {feld('widthMm', t('case.outer.width', 'Outside width (mm)'))}
        {feld('heightMm', t('case.outer.height', 'Outside height (mm)'))}
        {feld('depthMm', t('case.outer.depth', 'Outside depth (mm)'))}
        {feld('weightKg', t('case.outer.weight', 'Empty weight (kg)'))}
      </div>
      <p className="hinweis">
        {t(
          'case.outer.hint',
          'Needed to place the case in a vehicle.',
        )}
      </p>
    </>
  )
}
