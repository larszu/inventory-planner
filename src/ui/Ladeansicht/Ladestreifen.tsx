// ───────────────────────────────────────────────────────────────────────────
// Der Lade-Streifen — was drin ist, was gerade drankommt, was folgt.
//
// ─── WARUM EIN STREIFEN UND KEINE ZWEITE LISTE ─────────────────────────────
//
// Die Lagen-Liste darunter beantwortet „was gehört in welche Schicht". Der
// Streifen beantwortet eine andere Frage: „wo bin ich gerade". Beides in
// einer Liste hiesse, beim Laden zu scrollen, um den Stand zu sehen — und
// gescrollt wird am Dock nicht, dort wird getragen.
//
// ─── ER ROLLT, ER SPRINGT NICHT ────────────────────────────────────────────
//
// Das aktuelle Stück wird in die Mitte gescrollt, wenn es sich ändert; die
// schon geladenen bleiben links stehen und sind erreichbar. Ein Karussell,
// das Vergangenes wegwirft, nimmt genau die Kiste aus dem Bild, die jemand
// gerade sucht, weil er sie falsch abgestellt hat.
//
// Gescrollt wird NUR der Streifen selbst. `scrollIntoView` wäre kürzer,
// fasst aber jeden scrollbaren Vorfahren an — auch die Seite. Am Telefon
// heisst das: die Ansicht springt, während jemand mit einem Case in der Hand
// woanders hinsieht. `offsetLeft` gegen die Spur ist exakt und rührt sonst
// nichts an.
//
// ─── DIE ROLLE KOMMT AUS `domain/lib/beladen` ──────────────────────────────
//
// Diese Datei rechnet nichts. Sie stellt `KarussellEintrag[]` dar — dieselbe
// Ableitung, die auch die 3D-Ansicht einfärbt. Zwei Stellen, die „aktuell"
// je für sich bestimmen, gehen irgendwann auseinander.
// ───────────────────────────────────────────────────────────────────────────
import { useEffect, useRef } from 'react'
import type { KarussellEintrag } from '../../domain/lib/beladen'
import { useT } from '../../i18n'
import { gruppenFarbe } from '../../domain/lib/gruppenFarben'

interface Props {
  eintraege: readonly KarussellEintrag[]
  gruppen: readonly string[]
  /** Ein Stück verstauen (offen) bzw. zurückholen (geladen). */
  onVerstauen: (stueckId: string) => void
  onZurueck: (stueckId: string) => void
}

export function Ladestreifen({ eintraege, gruppen, onVerstauen, onZurueck }: Props) {
  const { t, format } = useT()
  const spur = useRef<HTMLOListElement>(null)
  const aktuellId = eintraege.find((e) => e.rolle === 'aktuell')?.placement.stueckId

  // Nur beim Wechsel scrollen, nicht bei jedem Rendern: sonst reisst es dem
  // Ladenden die Ansicht unter dem Finger weg, sobald er selbst geschoben hat.
  useEffect(() => {
    if (!aktuellId) return
    const spurEl = spur.current
    const kachel = spurEl?.querySelector<HTMLElement>(`[data-stueck="${CSS.escape(aktuellId)}"]`)
    if (!spurEl || !kachel) return
    spurEl.scrollTo({
      left: kachel.offsetLeft - (spurEl.clientWidth - kachel.offsetWidth) / 2,
      behavior: 'smooth',
    })
  }, [aktuellId])

  if (eintraege.length === 0) return null

  const beschriftung = (rolle: KarussellEintrag['rolle']) =>
    rolle === 'geladen'
      ? t('loading.roleLoaded', 'Loaded')
      : rolle === 'aktuell'
        ? t('loading.roleCurrent', 'Loading now')
        : t('loading.roleOpen', 'Next up')

  return (
    <ol className="ladestreifen" ref={spur} aria-label={t('loading.stripLabel', 'Loading order with current state')}>
      {eintraege.map(({ placement: p, rolle }) => (
        <li key={p.stueckId} className={`streifen-kachel ${rolle}`} data-stueck={p.stueckId}>
          <span className="streifen-rolle">{beschriftung(rolle)}</span>
          <span className="streifen-schritt">{p.ladeSchritt}</span>
          <span className="streifen-label">
            <span className="gruppen-punkt" style={{ background: gruppenFarbe(p.gruppe, gruppen) }} aria-hidden />
            {p.label}
          </span>
          {rolle === 'geladen' ? (
            <button
              type="button"
              className="still"
              onClick={() => onZurueck(p.stueckId)}
              aria-label={format(t('loading.undoOf', 'Take {label} back out'), { label: p.label })}
            >
              {t('loading.undo', 'Take back')}
            </button>
          ) : (
            <button
              type="button"
              /* Kein Primaerknopf: einer pro Abschnitt, und der steht auf
                 der Karte darueber — dieselbe Handlung am selben Stueck. Die
                 Kachel ist ueber ihre Kopflinie markiert. */
              className="still"
              onClick={() => onVerstauen(p.stueckId)}
              aria-label={format(t('loading.stowOf', 'Mark {label} as stowed'), { label: p.label })}
            >
              {t('loading.stow', 'Stowed')}
            </button>
          )}
        </li>
      ))}
    </ol>
  )
}
