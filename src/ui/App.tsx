// ───────────────────────────────────────────────────────────────────────────
// Die Oberfläche des Lagers (E-27, ADR-006 Schritt 3).
//
// Der Eigentümer hat am 2026-09-09 nicht „ein Paket" gewählt, sondern ein
// eigenes Werkzeug MIT eigener Bedienung: „Bestand, Ausgabeschein, Sub-Hire
// bekommen ihre eigene Bedienung für den Lageristen."
//
// Das ist der Unterschied, um den es beim ganzen Schnitt geht. Im
// Cable-Planner war das Lager ein Dialog IM Plan — bedienbar nur von jemandem,
// der einen Plan offen hat. Der Lagerist hat keinen Plan offen. Er hat ein
// Regal.
//
// DREI SICHTEN, WEIL ES DREI FRAGEN SIND (der Vertrag aus ADR-006):
//   Bestand        Was ist da, wieviel, und wo liegt es?
//   Ausgabeschein  Was ist draußen, bei wem, und seit wann?
//   Sub-Hire       Was gehört uns nicht — und wann muss es zurück?
//
// DIE VIERTE KAM 2026-09-09 DAZU (B-65), und sie ist keine vierte Frage,
// sondern die Gegenprobe zur ersten: „liegt das hier, was hier liegen soll?"
// `inventoryAudit.ts` und `inventoryScan.ts` beantworten sie seit langem,
// getestet — nur führte kein Weg der Oberfläche dorthin. Von 18 Modulen
// unter `domain/lib/` waren zehn von hier aus unerreichbar; für den
// Lageristen ist so ein Modul kein Code.
// ───────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { STORAGE_KEYS } from '../lib/storageKeys'
import { ANSICHT_IDS, bereiche, bereichVon, type Ansicht } from './navigation'
import { Start } from './Start'
import { useT } from '../i18n'
import { useInventoryStore } from '../domain/store/inventoryStore'
import { useCheckoutStore } from '../domain/store/checkoutStore'
import { Kopfzeile } from './Kopfzeile'
import { Bestand } from './Bestand'
import { Lagerbaum } from './Lagerbaum'
import { Ausgabescheine } from './Ausgabescheine'
import { SubHire } from './SubHire'
import { Inventur } from './Inventur'
import { Stapeln } from './Stapeln'
import { Caseausbau } from './Caseausbau'
import { Fahrzeuge } from './Fahrzeuge'
import { Ladung } from './Ladung'
import { Bericht } from './Bericht'
import { WerteUndSchaeden } from './WerteUndSchaeden'
import { Wareneingang } from './Wareneingang'
import { Bibliothek } from './Bibliothek'
import { autoAbgleichStarten } from '../domain/store/bibliothekStore'


type UebersetzFn = (key: string, en: string) => string

/**
 * Der Zaehler der Statusleiste — was in DIESER Ansicht gezaehlt wird.
 *
 * ADR-007 Abschnitt 6 sagt „Meldungen links · Zaehler rechts" und dazu, was
 * dort NICHT hingehoert: „Werte, die eine Produktentscheidung waeren — eine
 * Komplexitaet, eine Ampel, eine Bewertung". Alles hier ist eine Anzahl, die
 * die Ansicht ohnehin berechnet; keine der sieben Zeilen wertet.
 *
 * Je Reiter eine eigene Zahl und nicht eine feste fuer die ganze App: wer im
 * Sub-Hire steht, will wissen, wieviel fremdes Material im Haus ist, nicht
 * wieviele Artikel es insgesamt gibt.
 */
const zaehler = (
  reiter: Ansicht,
  t: UebersetzFn,
  format: (s: string, v: Record<string, string | number>) => string,
  zahlen: { artikel: number; plaetze: number; einheiten: number; scheine: number; draussen: number; fremd: number },
): string => {
  switch (reiter) {
    case 'ausgabe':
      return format(t('status.checkouts', '{n} checkout notes · {out} still out'), {
        n: zahlen.scheine,
        out: zahlen.draussen,
      })
    case 'subhire':
      return format(t('status.subhire', '{n} items not ours'), { n: zahlen.fremd })
    case 'werte':
      return format(t('status.units', '{n} serialised units'), { n: zahlen.einheiten })
    default:
      return format(t('status.stock', 'Models: {n} · storage places: {p}'), {
        n: zahlen.artikel,
        p: zahlen.plaetze,
      })
  }
}

/** Der Hauptweg vom leeren Lager zur gepackten Ladung — derselbe wie die
 *  Schritte auf der Startseite. Am Ende jeder dieser Ansichten steht der
 *  naechste, damit niemand in dreizehn Ansichten suchen muss. */
const WEITER: Partial<Record<Ansicht, Ansicht>> = {
  bestand: 'lager',
  lager: 'cases',
  cases: 'fahrzeuge',
  fahrzeuge: 'ladung',
}

export function App() {
  const { t, format } = useT()
  const bereichListe = bereiche(t)
  const items = useInventoryStore((s) => s.items)
  const [reiter, setReiterState] = useState<Ansicht>(() => {
    try {
      const gemerkt = localStorage.getItem(STORAGE_KEYS.reiter)
      if (ANSICHT_IDS.includes(gemerkt as Ansicht)) return gemerkt as Ansicht
    } catch {
      // ohne Speicher: Start
    }
    return 'start'
  })
  const setReiter = (r: Ansicht) => {
    setReiterState(r)
    window.scrollTo(0, 0)
    try {
      localStorage.setItem(STORAGE_KEYS.reiter, r)
    } catch {
      // Privates Fenster oder gesperrter Speicher: dann eben ohne Gedaechtnis.
    }
  }
  // Eigene Artikeltypen hoch-, Bibliotheksgeraete herunterladen (Einstellung „automatisch").
  useEffect(() => autoAbgleichStarten(), [])
  const weiter = WEITER[reiter]
  const weiterTitel = weiter && bereichListe.flatMap((b) => b.ansichten).find((a) => a.id === weiter)?.titel
  const bereich = bereichVon(bereichListe, reiter)
  const aktiv = bereich.ansichten.find((a) => a.id === reiter)!

  // Aus dem Store gelesen und nicht durchgereicht: die Statusleiste zeigt den
  // Stand, nicht den Stand von vorhin. Eine Ansicht, die eine Zahl als Prop
  // bekaeme, muesste sie weiterreichen — und die naechste, die es vergisst,
  // zeigt schweigend eine alte.
  const nodes = useInventoryStore((s) => s.nodes)
  const units = useInventoryStore((s) => s.units)
  const records = useCheckoutStore((s) => s.records)
  const stand = zaehler(reiter, t, format, {
    artikel: items.length,
    plaetze: nodes.length,
    einheiten: units.length,
    scheine: records.length,
    draussen: records.filter((r) => !r.in).length,
    fremd: items.filter((i) => i.ownership === 'subhire').length,
  })

  return (
    <div className="app">
      {/* Kopfzeile und Reiter sind ZWEI Zeilen, seit 2026-09-11. Vorher stand
          der App-Name mit den sieben Reitern in einer — und damit sah die
          Modul-Navigation aus wie eine Menueleiste. Die Kopfzeile fuehrt
          jetzt die Menues und rechts aussen die Einstellungen (wie im Cable
          Planner), die Reiter stehen darunter und ordnen die Module. */}
      <Kopfzeile />
      {/* Fuenf Bereiche statt dreizehn gleichrangiger Reiter; die Ansichten
          eines Bereichs stehen darunter, in der Reihenfolge der Arbeit. */}
      <nav className="reiter-leiste" aria-label={t('nav.areas', 'Areas')}>
        {bereichListe.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setReiter(b.id === bereich.id ? reiter : b.ansichten[0]!.id)}
            aria-pressed={b.id === bereich.id}
            className={b.id === bereich.id ? 'reiter aktiv' : 'reiter'}
          >
            {b.titel}
          </button>
        ))}
      </nav>
      {bereich.ansichten.length > 1 && (
        <nav className="unterreiter" aria-label={bereich.titel}>
          {bereich.ansichten.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setReiter(a.id)}
              aria-pressed={a.id === reiter}
              className={a.id === reiter ? 'unterreiter-knopf aktiv' : 'unterreiter-knopf'}
            >
              {a.titel}
            </button>
          ))}
        </nav>
      )}
      {/* Der Inhalt bekommt seine Satzbreite, der Rahmen nicht (suite#231).
          Vorher trug `.app` beides — und damit endete auch die Kopfzeile bei
          1100 px, mitten auf dem Bildschirm. */}
      <main className="inhalt">
        {aktiv.frage && <p className="frage">{aktiv.frage}</p>}
        {reiter === 'start' && <Start bereiche={bereichListe} onGehe={setReiter} />}
        {reiter === 'bestand' && <Bestand />}
        {reiter === 'lager' && <Lagerbaum />}
        {reiter === 'eingang' && <Wareneingang />}
        {reiter === 'inventur' && <Inventur />}
        {reiter === 'ausgabe' && <Ausgabescheine />}
        {reiter === 'bericht' && <Bericht />}
        {reiter === 'werte' && <WerteUndSchaeden />}
        {reiter === 'subhire' && <SubHire />}
        {reiter === 'stapeln' && <Stapeln />}
        {reiter === 'cases' && <Caseausbau onZuLagerorten={() => setReiter('lager')} />}
        {reiter === 'fahrzeuge' && <Fahrzeuge />}
        {reiter === 'ladung' && <Ladung />}
        {reiter === 'bibliothek' && <Bibliothek />}
        {weiter && weiterTitel && (
          <div className="weiter">
            <button type="button" onClick={() => setReiter(weiter)}>
              {format(t('nav.next', 'Next: {view} →'), { view: weiterTitel })}
            </button>
          </div>
        )}
      </main>
      {/* Die Statusleiste des Rahmens (ADR-007 Abschnitt 6). Links steht,
          welche Frage gerade offen ist, rechts ihre Zahl. */}
      <footer className="statusleiste">
        <span>{bereich.id === 'start' ? bereich.titel : `${bereich.titel} › ${aktiv.titel}`}</span>
        <span className="rechts">{stand}</span>
      </footer>
    </div>
  )
}
