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
import type { StorageNode } from '../../domain/types/inventory'

interface Props {
  eigene: readonly KatalogCase[]
  node: StorageNode
  ausbau: CaseAusbau | undefined
  onUebernehmen: (patch: Partial<Omit<CaseAusbau, 'nodeId' | 'updatedAt'>>) => void
  onVorlageSpeichern: (v: KatalogCase) => void
}

export function VorlagenWahl({ eigene, node, ausbau, onUebernehmen, onVorlageSpeichern }: Props) {
  const { t, format } = useT()
  const [gewaehlt, setGewaehlt] = useState('')
  const [hersteller, setHersteller] = useState('')
  const [modell, setModell] = useState('')
  const [meldung, setMeldung] = useState<string | null>(null)

  const liste = alleVorlagen(eigene)
  const vorlage = liste.find((v) => v.id === gewaehlt)

  const uebernehmen = () => {
    if (!vorlage) return
    if (!hatUebernehmbares(vorlage)) {
      // Ehrlich statt hilfreich-aussehend: eine Vorlage ohne Masse zu
      // übernehmen setzte nichts und sähe aus, als hätte sie es getan.
      setMeldung(
        t(
          'vorlage.noSizeToApply',
          'This template carries no dimensions yet. Measure the case, then save it back as a template — from then on it carries them.',
        ),
      )
      return
    }
    setMeldung(null)
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
          {t('vorlage.pick', 'Shell from a template')}
          <select
            value={gewaehlt}
            onChange={(e) => {
              setGewaehlt(e.target.value)
              setMeldung(null)
            }}
            aria-label={t('vorlage.pick', 'Shell from a template')}
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
        <button type="button" onClick={uebernehmen} disabled={!vorlage}>
          {t('vorlage.apply', 'Apply')}
        </button>
      </div>
      {vorlage && massZeile(vorlage, t).length > 0 && <p>{massZeile(vorlage, t).join(' · ')}</p>}
      {vorlage && <p className="hinweis">{massAuskunft(vorlage, t)}</p>}

      <p className="hinweis">
        {t(
          'vorlage.shippedHint',
          'The shipped templates carry data-sheet figures with their source. A measured case beats the data sheet: measure once and save it back, and your numbers replace the shipped ones for this model.',
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
      {meldung && <p className="hinweis">{meldung}</p>}
    </>
  )
}
