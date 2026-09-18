// ───────────────────────────────────────────────────────────────────────────
// Die Kanten eines Laderaums eintragen.
//
// ─── WARUM DAS EINE EIGENE DATEI IST ───────────────────────────────────────
//
// Weil es die Stelle ist, an der aus einer Zahl im Modell eine Messung am
// Fahrzeug wird. Wer hier steht, hat einen Zollstock in der Hand und liest:
// „die Dachkante rechts ist auf etwa 300 mm gerundet". Die Maske muss dieser
// Reihenfolge folgen — erst wo, dann wie, dann wie tief —, sonst muss jemand
// sein Messergebnis im Kopf in ein Achsensystem übersetzen.
//
// ─── DIE BEZEICHNUNGEN SIND MENSCHLICH UND NICHT ACHSPARALLEL ──────────────
//
// Im Modell heisst die gerundete Dachkante rechts `achse: 'z'`,
// `seiten: ['max','max']`. Das ist präzise und für niemanden lesbar, der ein
// Fahrzeug ausmisst. Angeboten wird deshalb eine Liste benannter Kanten —
// „Dachkante rechts", „Bodenkante links", „Heckkante oben" —, und die
// Übersetzung passiert hier. Eine Auswahl aus zwölf benannten Kanten ist
// ausserdem etwas, das man nicht falsch ausfüllen kann; zwei Achsen und zwei
// Seiten sind es sehr wohl.
//
// ─── UND WAS NICHT PASSIERT ────────────────────────────────────────────────
//
// Es gibt keine Vorgabewerte je Fahrzeugklasse. „Transporter haben meist
// 200 mm" wäre eine Zahl, die aussieht wie eine Messung — genau das, was die
// Hausregel verbietet. Ohne Eintrag bleibt die Kante scharf, und scharf
// lässt höchstens Platz ungenutzt.
// ───────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useT, type Uebersetzen } from '../i18n'
import type { Achse, Kantenform, Seite, Vehicle } from '../domain/types/vehicle'

/** Eine benannte Kante des Laderaums — die zwölf, die es gibt. */
interface KantenWahl {
  id: string
  achse: Achse
  seiten: [Seite, Seite]
  /** Beschriftung der ersten bzw. zweiten Tiefe, in der Sprache des Bildes. */
  a: string
  b: string
  name: (t: Uebersetzen) => string
}

/**
 * Die zwölf Kanten, benannt.
 *
 * Als FUNKTION und nicht als Modul-Konstante: eine Tabelle mit
 * Beschriftungen wird beim Laden einmal gebaut und bliebe in der Sprache
 * stehen, die damals galt. (Hausregel, `CLAUDE.md`.)
 */
function kantenWahl(t: Uebersetzen): KantenWahl[] {
  const laengs = t('edge.along', 'runs along the whole length')
  const quer = t('edge.across', 'runs across the vehicle')
  const senkrecht = t('edge.upright', 'runs from floor to roof')
  return [
    // Kanten entlang der Länge (z): Dach- und Bodenkanten links/rechts.
    { id: 'dach-links', achse: 'z', seiten: ['min', 'max'], a: t('edge.depth.width', 'into the width (mm)'), b: t('edge.depth.height', 'into the height (mm)'), name: () => `${t('edge.roofLeft', 'Roof edge, left')} — ${laengs}` },
    { id: 'dach-rechts', achse: 'z', seiten: ['max', 'max'], a: t('edge.depth.width', 'into the width (mm)'), b: t('edge.depth.height', 'into the height (mm)'), name: () => `${t('edge.roofRight', 'Roof edge, right')} — ${laengs}` },
    { id: 'boden-links', achse: 'z', seiten: ['min', 'min'], a: t('edge.depth.width', 'into the width (mm)'), b: t('edge.depth.height', 'into the height (mm)'), name: () => `${t('edge.floorLeft', 'Floor edge, left')} — ${laengs}` },
    { id: 'boden-rechts', achse: 'z', seiten: ['max', 'min'], a: t('edge.depth.width', 'into the width (mm)'), b: t('edge.depth.height', 'into the height (mm)'), name: () => `${t('edge.floorRight', 'Floor edge, right')} — ${laengs}` },
    // Kanten quer (x): vorn/hinten oben und unten.
    { id: 'heck-oben', achse: 'x', seiten: ['max', 'max'], a: t('edge.depth.height', 'into the height (mm)'), b: t('edge.depth.length', 'into the length (mm)'), name: () => `${t('edge.rearTop', 'Rear edge, top')} — ${quer}` },
    { id: 'heck-unten', achse: 'x', seiten: ['min', 'max'], a: t('edge.depth.height', 'into the height (mm)'), b: t('edge.depth.length', 'into the length (mm)'), name: () => `${t('edge.rearBottom', 'Rear edge, bottom')} — ${quer}` },
    { id: 'front-oben', achse: 'x', seiten: ['max', 'min'], a: t('edge.depth.height', 'into the height (mm)'), b: t('edge.depth.length', 'into the length (mm)'), name: () => `${t('edge.frontTop', 'Front edge, top')} — ${quer}` },
    { id: 'front-unten', achse: 'x', seiten: ['min', 'min'], a: t('edge.depth.height', 'into the height (mm)'), b: t('edge.depth.length', 'into the length (mm)'), name: () => `${t('edge.frontBottom', 'Front edge, bottom')} — ${quer}` },
    // Kanten senkrecht (y): die vier Raumecken.
    { id: 'ecke-heck-links', achse: 'y', seiten: ['min', 'max'], a: t('edge.depth.width', 'into the width (mm)'), b: t('edge.depth.length', 'into the length (mm)'), name: () => `${t('edge.cornerRearLeft', 'Corner, rear left')} — ${senkrecht}` },
    { id: 'ecke-heck-rechts', achse: 'y', seiten: ['max', 'max'], a: t('edge.depth.width', 'into the width (mm)'), b: t('edge.depth.length', 'into the length (mm)'), name: () => `${t('edge.cornerRearRight', 'Corner, rear right')} — ${senkrecht}` },
    { id: 'ecke-front-links', achse: 'y', seiten: ['min', 'min'], a: t('edge.depth.width', 'into the width (mm)'), b: t('edge.depth.length', 'into the length (mm)'), name: () => `${t('edge.cornerFrontLeft', 'Corner, front left')} — ${senkrecht}` },
    { id: 'ecke-front-rechts', achse: 'y', seiten: ['max', 'min'], a: t('edge.depth.width', 'into the width (mm)'), b: t('edge.depth.length', 'into the length (mm)'), name: () => `${t('edge.cornerFrontRight', 'Corner, front right')} — ${senkrecht}` },
  ]
}

/** Die Wahl, die zu einer gespeicherten Kante gehört. */
function wahlZu(k: Kantenform, wahl: readonly KantenWahl[]): KantenWahl | undefined {
  return wahl.find((w) => w.achse === k.achse && w.seiten[0] === k.seiten[0] && w.seiten[1] === k.seiten[1])
}

interface Props {
  vehicle: Vehicle
  onAendern: (kanten: Kantenform[]) => void
}

export function Kantenformen({ vehicle, onAendern }: Props) {
  const { t, format } = useT()
  const wahl = kantenWahl(t)
  const [welche, setWelche] = useState(wahl[1]!.id)
  const [art, setArt] = useState<'fase' | 'rundung'>('rundung')
  const [a, setA] = useState('')
  const [b, setB] = useState('')

  const kanten = vehicle.kanten ?? []
  const aktuelle = wahl.find((w) => w.id === welche)!

  const hinzufuegen = (e: React.FormEvent) => {
    e.preventDefault()
    const aMm = Number(a)
    const bMm = Number(b)
    if (!(aMm > 0) || !(bMm > 0)) return
    // Eine Kante gibt es nur einmal: ein zweiter Eintrag an derselben Stelle
    // ersetzt den ersten, statt sich mit ihm zu überlagern.
    const ohne = kanten.filter((k) => wahlZu(k, wahl)?.id !== aktuelle.id)
    onAendern([
      ...ohne,
      { achse: aktuelle.achse, seiten: aktuelle.seiten, art, aMm, bMm, name: aktuelle.name(t) },
    ])
    setA('')
    setB('')
  }

  return (
    <details className="kanten">
      <summary>
        {kanten.length === 0
          ? t('edge.none', 'Shape of the cargo space — sharp box, nothing measured')
          : format(t('edge.count', 'Shape of the cargo space — {n} edges measured'), { n: kanten.length })}
      </summary>

      <p className="hinweis">
        {t(
          'edge.intro',
          'A cargo space is rarely a box: roof edges are rounded, walls taper, a car boot narrows towards the tailgate. What is not entered stays a sharp edge — that only ever leaves room unused, it never promises room that is not there.',
        )}
      </p>

      {kanten.length > 0 && (
        <ul className="kanten-liste">
          {kanten.map((k, i) => (
            <li key={`${k.achse}-${k.seiten.join('')}-${i}`}>
              <strong>{wahlZu(k, wahl)?.name(t) ?? k.name ?? ''}</strong>
              {' — '}
              {format(
                k.art === 'rundung'
                  ? t('edge.roundedBy', 'rounded, {a} x {b} mm')
                  : t('edge.chamferedBy', 'chamfered, {a} x {b} mm'),
                { a: k.aMm, b: k.bMm },
              )}
              <button
                type="button"
                className="still"
                onClick={() => onAendern(kanten.filter((_, j) => j !== i))}
              >
                {t('edge.remove', 'Remove')}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="block" onSubmit={hinzufuegen}>
        <label>
          {t('edge.which', 'Which edge')}
          <select value={welche} onChange={(e) => setWelche(e.target.value)}>
            {wahl.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name(t)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('edge.art', 'Shape')}
          <select value={art} onChange={(e) => setArt(e.target.value as 'fase' | 'rundung')}>
            <option value="rundung">{t('edge.rounded', 'Rounded')}</option>
            <option value="fase">{t('edge.chamfered', 'Chamfered (straight)')}</option>
          </select>
        </label>
        <div className="zeile">
          <label>
            {aktuelle.a}
            <input type="number" value={a} onChange={(e) => setA(e.target.value)} />
          </label>
          <label>
            {aktuelle.b}
            <input type="number" value={b} onChange={(e) => setB(e.target.value)} />
          </label>
        </div>
        <p className="leise">
          {art === 'rundung'
            ? t('edge.hintRound', 'Equal values give a quarter circle, different ones an ellipse. Measure how far the curve reaches into each direction.')
            : t('edge.hintChamfer', 'A straight cut from one wall to the other — measure how far it reaches into each direction.')}
        </p>
        <button type="submit">{t('edge.add', 'Record this edge')}</button>
      </form>
    </details>
  )
}
