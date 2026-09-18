// ───────────────────────────────────────────────────────────────────────────
// Beladen — der Blick aus der Ladeöffnung, während der LKW voll wird.
//
// ─── DIE EINE FRAGE ────────────────────────────────────────────────────────
//
// Am Heck steht jemand mit einem Case in der Hand und will wissen: wo kommt
// DAS hier hin. Diese Ansicht beantwortet genau das und sonst nichts —
// deshalb steht das nächste Stück gross oben, und deshalb zeigt das Bild nur
// den erreichten Stand plus die eine Lücke.
//
// ─── SCANNEN IST DIE HAUPTGESTE, TIPPEN DIE RÜCKFALLEBENE ──────────────────
//
// Die Hände sind voll. Ein Formular, das nach der Fahrt ausgefüllt wird, ist
// kein Ladeprotokoll, sondern eine Erinnerung — und die ist am nächsten
// Morgen weg. Gescannt wird mit derselben Maschinerie wie in der Inventur
// (`lib/codeLeser.ts`); daneben steht ein Knopf für den Fall, dass der
// Aufkleber hinüber ist.
//
// ─── UND DIE HALTUNG, DIE ALLES TRÄGT ──────────────────────────────────────
//
// Aus der Reihe laden wird GEMELDET, nicht verboten. Wer ein Case einlädt,
// hat es in der Hand; vielleicht stand der Hänger im Weg. Das Werkzeug sagt,
// was dadurch schwerer wird, und lässt den Menschen entscheiden. Ein
// Werkzeug, das am Dock „nein" sagt, wird umgangen — und weiss danach gar
// nichts mehr.
// ───────────────────────────────────────────────────────────────────────────
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useT } from '../i18n'
import { useInventoryStore } from '../domain/store/inventoryStore'
import { useLoadStore } from '../domain/store/loadStore'
import {
  befundFuer,
  befundText,
  fortschritt,
  geladenAus,
  karussell,
  naechstes,
  scanInLadung,
  schichten,
} from '../domain/lib/beladen'
import type { LoadPlan } from '../domain/lib/loadPacker'
import type { Ladung } from '../domain/types/load'
import type { Vehicle } from '../domain/types/vehicle'
import { einLesen, hindernisText, scanFaehigkeit, waehleLeser } from '../lib/codeLeser'
import { gruppenFarbe } from '../domain/lib/gruppenFarben'
import { Ladestreifen } from './Ladeansicht/Ladestreifen'

const Ladeansicht3D = lazy(() => import('./Ladeansicht/Ladeansicht3D'))

interface Props {
  ladung: Ladung
  vehicle: Vehicle
  plan: LoadPlan
  gruppen: readonly string[]
}

export function Beladen({ ladung, vehicle, plan, gruppen }: Props) {
  const { t, format } = useT()
  const setGeladen = useLoadStore((s) => s.setGeladen)
  const items = useInventoryStore((s) => s.items)
  const nodes = useInventoryStore((s) => s.nodes)
  const units = useInventoryStore((s) => s.units)

  const [meldung, setMeldung] = useState<{ art: 'ok' | 'befund' | 'fehler'; text: string } | null>(null)
  const [kameraAn, setKameraAn] = useState(false)
  const video = useRef<HTMLVideoElement>(null)
  const strom = useRef<MediaStream | null>(null)
  /** Welcher Code wann zuletzt gemeldet wurde — gegen die Dauerschleife. */
  const zuletztGesehen = useRef(new Map<string, number>())

  const geladen = useMemo(() => geladenAus(ladung), [ladung])
  const geladenIds = useMemo(() => new Set(geladen.keys()), [geladen])
  const naechstesStueck = naechstes(plan, geladen)
  const stand = fortschritt(plan, geladen, ladung.stuecke)
  const lagen = schichten(plan)
  const streifen = useMemo(() => karussell(plan, geladen), [plan, geladen])

  /**
   * Ein Stück als geladen vermerken.
   *
   * Der Befund wird VOR dem Vermerk gelesen und danach gemeldet — die
   * Reihenfolge ist Absicht: gemeldet wird, was beim Hineinstellen galt, und
   * nicht, was danach gilt.
   */
  const vermerken = useCallback(
    (stueckId: string) => {
      const b = befundFuer(plan, geladen, stueckId)
      const text = befundText(b, t)
      setGeladen(ladung.id, stueckId, new Date().toISOString())
      const p = plan.placements.find((x) => x.stueckId === stueckId)
      setMeldung(
        text
          ? { art: 'befund', text }
          : {
              art: 'ok',
              text: format(t('loading.stowed', '{label} stowed — step {step}.'), {
                label: p?.label ?? '',
                step: p?.ladeSchritt ?? 0,
              }),
            },
      )
    },
    [plan, geladen, setGeladen, ladung.id, t, format],
  )

  const kameraAus = useCallback(() => {
    strom.current?.getTracks().forEach((s) => s.stop())
    strom.current = null
    setKameraAn(false)
  }, [])

  useEffect(() => kameraAus, [kameraAus])

  const kameraStarten = async () => {
    const faehig = scanFaehigkeit()
    if (!faehig.moeglich) {
      setMeldung({ art: 'fehler', text: hindernisText(faehig.grund, t) })
      return
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      strom.current = s
      if (video.current) {
        video.current.srcObject = s
        await video.current.play()
      }
      setKameraAn(true)
    } catch {
      setMeldung({ art: 'fehler', text: t('loading.camFailed', 'The camera could not be started.') })
      kameraAus()
    }
  }

  /**
   * Was ein gelesener Code bedeutet — und was daraufhin passiert.
   *
   * Der Takt unten wird EINMAL aufgesetzt und soll nicht bei jeder Änderung
   * des Lade-Stands neu starten — deshalb ruft er über eine Ref, die hier
   * frisch gehalten wird. Dieselbe Lösung wie beim Übersetzer in
   * `Inventur.tsx`.
   */
  const aufCode = useRef((_code: string) => {})
  // Im Effekt gesetzt und nicht beim Rendern: eine Ref waehrend des Renderns
  // zu beschreiben ist ein Seiteneffekt im Rendern, und React darf einen
  // Durchlauf verwerfen. `react-hooks/refs` sagt es zu Recht.
  useEffect(() => {
    aufCode.current = (code: string) => {
      const e = scanInLadung(code, ladung, { items, nodes, units })
      if (e.art === 'unbekannt') {
        setMeldung({
          art: 'fehler',
          text: format(t('loading.unknownCode', 'Code "{code}" is not in stock.'), { code }),
        })
        return
      }
      if (e.art === 'nicht-in-ladung') {
        setMeldung({
          art: 'fehler',
          text: format(t('loading.notInLoad', '{what} is in stock — but not part of this load. Wrong vehicle?'), {
            what: e.was,
          }),
        })
        return
      }
      if (geladen.has(e.stueck.id)) {
        setMeldung({
          art: 'befund',
          text: format(t('loading.already', '{label} is already stowed.'), { label: e.stueck.label }),
        })
        return
      }
      vermerken(e.stueck.id)
    }
  })

  // Der Lese-Takt. Dieselbe Form wie in `Inventur.tsx`: der Leser kommt
  // asynchron (der native sofort, das WASM geladen), und bis er da ist läuft
  // kein Takt — ein Takt ohne Leser wäre eine Kamera, die zusieht.
  useEffect(() => {
    if (!kameraAn) return
    let laeuft = true
    let takt = 0
    void waehleLeser().then((leser) => {
      if (!laeuft) return
      if (!leser) {
        setMeldung({ art: 'fehler', text: hindernisText('kein-decoder', t) })
        return
      }
      takt = window.setInterval(() => {
        const v = video.current
        if (!laeuft || !v || v.readyState < 2) return
        void einLesen(leser, v, zuletztGesehen.current, Date.now(), {
          aufCode: (c) => aufCode.current(c),
          aufFehler: (m) => setMeldung({ art: 'fehler', text: m }),
        })
      }, 250)
    })
    return () => {
      laeuft = false
      if (takt) window.clearInterval(takt)
    }
    // `t` steht hier bewusst nicht drin: ein Sprachwechsel soll die Kamera
    // nicht neu starten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kameraAn])

  return (
    <div className="beladen">
      {/* Was als Nächstes hineingehört — die eine Frage, gross. */}
      {naechstesStueck ? (
        <div className="naechstes">
          <span className="naechstes-schritt">{naechstesStueck.ladeSchritt}</span>
          <div>
            <strong>{naechstesStueck.label}</strong>
            <p className="leise">
              {format(t('loading.where', 'Layer {layer}, {x} mm from the left, {z} mm deep'), {
                layer: lagen.findIndex((s) => s.yMm === naechstesStueck.position.y) + 1,
                x: naechstesStueck.position.x,
                z: naechstesStueck.position.z,
              })}
            </p>
            {naechstesStueck.gruppe && (
              <p className="leise">
                <span
                  className="gruppen-punkt"
                  style={{ background: gruppenFarbe(naechstesStueck.gruppe, gruppen) }}
                  aria-hidden
                />
                {naechstesStueck.gruppe}
              </p>
            )}
          </div>
          <button type="button" className="knopf-primaer" onClick={() => vermerken(naechstesStueck.stueckId)}>
            {t('loading.stow', 'Stowed')}
          </button>
        </div>
      ) : (
        <p className="befund ja">{t('loading.done', 'Everything on the plan is stowed.')}</p>
      )}

      {/* Der Streifen: was drin ist, was gerade drankommt, was folgt. Er
          steht UNTER der grossen Karte und nicht statt ihr — die Karte
          beantwortet die eine Frage, der Streifen zeigt, wo man steht. */}
      <Ladestreifen
        eintraege={streifen}
        gruppen={gruppen}
        onVerstauen={vermerken}
        onZurueck={(id) => setGeladen(ladung.id, id, undefined)}
      />

      <p className="hinweis">
        {format(t('loading.progress', '{n} of {m} stowed · {kg} kg'), {
          n: stand.geladen,
          m: stand.gesamt,
          kg: Math.round(stand.geladenKg),
        })}
        {stand.ohneGewicht > 0 && (
          <> · {format(t('loading.noWeight', '{n} of them without a weight'), { n: stand.ohneGewicht })}</>
        )}
      </p>

      {meldung && <p className={meldung.art === 'fehler' ? 'befund nein' : meldung.art === 'befund' ? 'warnung' : 'befund ja'}>{meldung.text}</p>}

      <div className="ladeplan-leiste">
        <button type="button" onClick={kameraAn ? kameraAus : () => void kameraStarten()}>
          {kameraAn ? t('loading.camOff', 'Camera off') : t('loading.camOn', 'Scan a case')}
        </button>
      </div>
      <video ref={video} className={kameraAn ? 'sucher' : 'sucher aus'} muted playsInline />

      <Suspense fallback={<p className="hinweis">{t('plan.loading3d', 'Loading the 3D view…')}</p>}>
        <Ladeansicht3D
          vehicle={vehicle}
          plan={plan}
          gruppen={gruppen}
          onWaehle={() => {}}
          onVerschiebe={() => {}}
          rasterMm={0}
          modus="beladen"
          geladen={geladenIds}
          naechstesId={naechstesStueck?.stueckId}
        />
      </Suspense>

      {/* Das Schicht-Modell: was in welcher Lage steht, und was davon schon
          drin ist. Beim Laden arbeitet man eine Lage ab und stellt dann die
          nächste darauf — wer nur eine Reihe sieht, merkt den Wechsel nicht. */}
      <div className="block">
        <h3>{t('loading.layers', 'Layers')}</h3>
        {lagen.map((s, i) => (
          <div key={s.yMm} className="schicht">
            <h4>
              {format(t('loading.layer', 'Layer {n} — {mm} mm above the floor'), { n: i + 1, mm: s.yMm })}
            </h4>
            <ol>
              {s.placements.map((p) => {
                const drin = geladen.has(p.stueckId)
                return (
                  <li key={p.stueckId} className={drin ? 'drin' : undefined}>
                    <span
                      className="gruppen-punkt"
                      style={{ background: gruppenFarbe(p.gruppe, gruppen) }}
                      aria-hidden
                    />
                    {p.ladeSchritt}. {p.label}
                    {drin ? (
                      <button type="button" className="still" onClick={() => setGeladen(ladung.id, p.stueckId, undefined)}>
                        {t('loading.undo', 'Take back')}
                      </button>
                    ) : (
                      <button type="button" className="still" onClick={() => vermerken(p.stueckId)}>
                        {t('loading.stow', 'Stowed')}
                      </button>
                    )}
                  </li>
                )
              })}
            </ol>
          </div>
        ))}
      </div>
    </div>
  )
}
