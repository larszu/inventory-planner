// ───────────────────────────────────────────────────────────────────────────
// DIE VORLAGEN-WAHL — Peli, Nanuk, und die eigenen.
//
// ─── WOHER DIE ZAHLEN KOMMEN ───────────────────────────────────────────────
//
// Neben JEDER Vorlage steht, woher ihre Zahlen kommen — gemessen, aus dem
// Datenblatt (mit Adresse), oder gar nicht hinterlegt (siehe
// `lib/caseKatalog.ts`). Ohne diese Zeile sähen alle drei gleich aus, und
// beim Zuschnitt zählt der Unterschied.
//
// ─── UND DESHALB IST DER WEG ZURÜCK DER WICHTIGERE ─────────────────────────
//
// „Aus diesem Case eine Vorlage machen": wer das erste Peli 1510 ausmisst,
// hat sie für jedes weitere. Das ist die Stelle, an der dieser Katalog
// wertvoll wird — nicht die mitgelieferte Liste.
// ───────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useT } from '../../i18n'
import {
  alleVorlagen,
  hatUebernehmbares,
  massAuskunft,
  massZeile,
  vorlageAusCase,
  vorlageName,
  type KatalogCase,
} from '../../domain/lib/caseKatalog'
import { ausbauArt, type CaseAusbau } from '../../domain/types/caseAusbau'
import type { PhysicalDimensions, StorageNode } from '../../domain/types/inventory'

interface Props {
  eigene: readonly KatalogCase[]
  node: StorageNode
  ausbau: CaseAusbau | undefined
  onUebernehmen: (patch: Partial<Omit<CaseAusbau, 'nodeId' | 'updatedAt'>>) => void
  onVorlageSpeichern: (v: KatalogCase) => void
  /** Aussenmasse und Leergewicht der Schale — gehoeren an den Knoten, nicht
   *  in den Ausbau: nur dort liest die Ladeplanung sie. */
  onAussen: (d: PhysicalDimensions) => void
}

export function VorlagenWahl({ eigene, node, ausbau, onUebernehmen, onVorlageSpeichern, onAussen }: Props) {
  const { t, format } = useT()
  const [gewaehlt, setGewaehlt] = useState(ausbau?.vorlageId ?? '')
  const [hersteller, setHersteller] = useState('')
  const [modell, setModell] = useState('')
  const [meldung, setMeldung] = useState<string | null>(null)

  const liste = alleVorlagen(eigene)
  const vorlage = liste.find((v) => v.id === gewaehlt)

  // Übernommen wird beim Auswählen: ein zweiter Knopf „Apply" hinter der
  // Auswahl war ein Schritt, den niemand erwartet.
  const uebernehmen = (vorlage: KatalogCase | undefined) => {
    if (!vorlage) return
    if (!hatUebernehmbares(vorlage)) {
      // Ehrlich statt hilfreich-aussehend: eine Vorlage ohne Masse zu
      // übernehmen setzte nichts und sähe aus, als hätte sie es getan.
      setMeldung(
        t(
          'vorlage.noSizeToApply',
          'This template has no dimensions yet.',
        ),
      )
      return
    }
    setMeldung(null)
    if (vorlage.aussenMm) onAussen({ ...node.dimensions, ...vorlage.aussenMm })
    onUebernehmen({
      innenMm: vorlage.innenMm,
      art: vorlage.art,
      vorlageId: vorlage.id,
      ...(vorlage.hoeheHE || vorlage.einbautiefeMm
        ? {
            rack: {
              ...ausbau?.rack,
              ...(vorlage.hoeheHE ? { hoeheHE: vorlage.hoeheHE } : {}),
              ...(vorlage.einbautiefeMm ? { nutzbareTiefeMm: vorlage.einbautiefeMm } : {}),
            },
          }
        : {}),
    })
  }

  const alsVorlage = () => {
    const id = `eigen-${(hersteller + '-' + modell).toLowerCase().trim().replace(/\s+/g, '-')}`
    const v = vorlageAusCase(
      id,
      hersteller,
      modell,
      node.dimensions,
      ausbau?.innenMm,
      ausbauArt(ausbau),
      node.name,
      ausbau?.rack?.hoeheHE,
      ausbau?.rack?.nutzbareTiefeMm,
    )
    if (!v) {
      setMeldung(
        t(
          'vorlage.cannotSave',
          'Nothing to save yet: a template needs a model name and at least one complete set of dimensions.',
        ),
      )
      return
    }
    onVorlageSpeichern(v)
    setMeldung(format(t('vorlage.saved', 'Saved as template “{name}”.'), { name: vorlageName(v) }))
  }

  return (
    <>
      <div className="zeile">
        <label>
          {t('vorlage.pick', 'Case model')}
          <select
            value={gewaehlt}
            onChange={(e) => {
              setGewaehlt(e.target.value)
              setMeldung(null)
              uebernehmen(liste.find((v) => v.id === e.target.value))
            }}
            aria-label={t('vorlage.pick', 'Case model')}
          >
            <option value="">—</option>
            {liste.map((v) => (
              <option key={v.id} value={v.id}>
                {vorlageName(v)}
                {v.eigen ? ' ·' : ''}
                {v.eigen ? t('vorlage.own', ' own') : ''}
              </option>
            ))}
          </select>
        </label>
      </div>
      {vorlage && massZeile(vorlage, t).length > 0 && <p>{massZeile(vorlage, t).join(' · ')}</p>}
      {vorlage && <p className="hinweis">{massAuskunft(vorlage, t)}</p>}

      <details className="optionen">
        <summary>{t('vorlage.saveOwn', 'Measured it yourself? Save as your own template')}</summary>
        <p className="hinweis">
          {t(
            'vorlage.shippedHint',
            'Your measured case replaces the data-sheet values for this model.',
          )}
        </p>

        <div className="zeile">
          <label>
            {t('vorlage.maker', 'Manufacturer')}
            <input
              value={hersteller}
              onChange={(e) => setHersteller(e.target.value)}
              placeholder="Peli"
              aria-label={t('vorlage.maker', 'Manufacturer')}
            />
          </label>
          <label>
            {t('vorlage.model', 'Model')}
            <input
              value={modell}
              onChange={(e) => setModell(e.target.value)}
              placeholder="1510"
              aria-label={t('vorlage.model', 'Model')}
            />
          </label>
          <button type="button" onClick={alsVorlage}>
            {t('vorlage.save', 'Save this case as a template')}
          </button>
        </div>
      </details>
      {meldung && <p className="hinweis">{meldung}</p>}
    </>
  )
}
