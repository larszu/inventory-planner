// ───────────────────────────────────────────────────────────────────────────
// Einstellungen → Device library: Server, Anmeldung, Abmelden.
//
// Ein Konto legt man auf der Website an, nicht hier — dort werden E-Mail und
// Richtlinien bestaetigt. Hier steht nur der Weg dorthin.
// ───────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import { useBibliothekStore } from '../domain/store/bibliothekStore'
import { bibliothekFehlerText, richtlinienUrl } from '../domain/lib/geraetebibliothek'
import type { LibraryErrorCode } from '../lib/deviceLibraryClient'
import { DEFAULT_DEVICE_LIBRARY_URL, forgotPasswordUrl, registerUrl } from '../lib/deviceLibraryClient'
import { Feld } from './Formular'

export function BibliothekKonto() {
  const { t, format } = useT()
  const s = useBibliothekStore()
  const [adresse, setAdresse] = useState(s.server)
  const [adresseFalsch, setAdresseFalsch] = useState(false)
  const [kennung, setKennung] = useState('')
  const [passwort, setPasswort] = useState('')
  const [code, setCode] = useState('')

  const pruefeSitzung = useBibliothekStore((x) => x.pruefeSitzung)
  useEffect(() => {
    void pruefeSitzung()
  }, [pruefeSitzung])

  const uebernehmen = () => {
    const ok = s.setzeServer(adresse)
    setAdresseFalsch(!ok)
    if (ok) setAdresse(useBibliothekStore.getState().server)
  }

  return (
    <section>
      <h3>{t('settings.library', 'Device library')}</h3>
      <p className="leise">
        {t(
          'settings.library.hint',
          'Shared device data for the AV Planner suite. Reading it needs an account; the planner stores only the sign-in token, never the password.',
        )}
      </p>

      <form
        className="zeile"
        onSubmit={(e) => {
          e.preventDefault()
          uebernehmen()
        }}
      >
        <Feld name={t('settings.library.server', 'Server')}>
          <input value={adresse} onChange={(e) => setAdresse(e.target.value)} spellCheck={false} />
        </Feld>
        <button type="submit" disabled={adresse.trim() === s.server}>
          {t('settings.library.apply', 'Apply')}
        </button>
        {s.server !== DEFAULT_DEVICE_LIBRARY_URL && (
          <button
            type="button"
            className="still"
            onClick={() => {
              s.serverZuruecksetzen()
              setAdresse(DEFAULT_DEVICE_LIBRARY_URL)
              setAdresseFalsch(false)
            }}
          >
            {t('settings.library.reset', 'Reset to default')}
          </button>
        )}
      </form>
      {adresseFalsch && (
        <p className="warnung">
          {t('settings.library.badServer', 'This is not a usable server address. Use https:// (plain http only for localhost).')}
        </p>
      )}
      <p className="leise">
        {t('settings.library.serverHint', 'Changing the server signs you out and clears the cached devices.')}
      </p>

      {s.token && s.nutzer ? (
        <>
          <p>
            {format(t('settings.library.signedIn', 'Signed in as {name} ({email}).'), {
              name: s.nutzer.username || s.nutzer.email,
              email: s.nutzer.email,
            })}
          </p>
          <button type="button" onClick={() => void s.abmelden()} disabled={s.laeuft}>
            {t('settings.library.signOut', 'Sign out')}
          </button>
        </>
      ) : s.schritt.art === 'code' ? (
        <form
          className="zeile"
          onSubmit={(e) => {
            e.preventDefault()
            void s.zweiterFaktor(code).then(() => setCode(''))
          }}
        >
          <Feld name={t('settings.library.code', 'Authenticator code')}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
            />
          </Feld>
          <button type="submit" className="knopf-primaer" disabled={!code.trim() || s.laeuft}>
            {t('settings.library.verify', 'Confirm')}
          </button>
          <button type="button" className="still" onClick={s.anmeldungAbbrechen}>
            {t('settings.library.cancel', 'Cancel')}
          </button>
        </form>
      ) : (
        <>
          <p className="leise">{t('settings.library.signedOut', 'Not signed in.')}</p>
          <form
            className="zeile"
            onSubmit={(e) => {
              e.preventDefault()
              void s.anmelden(kennung, passwort).then(() => setPasswort(''))
            }}
          >
            <Feld name={t('settings.library.login', 'E-mail or user name')}>
              <input value={kennung} onChange={(e) => setKennung(e.target.value)} autoComplete="username" />
            </Feld>
            <Feld name={t('settings.library.password', 'Password')}>
              <input
                type="password"
                value={passwort}
                onChange={(e) => setPasswort(e.target.value)}
                autoComplete="current-password"
              />
            </Feld>
            <button type="submit" className="knopf-primaer" disabled={!kennung.trim() || !passwort || s.laeuft}>
              {t('settings.library.signIn', 'Sign in')}
            </button>
          </form>
          <p className="leise">
            <a href={registerUrl(s.server)} target="_blank" rel="noreferrer">
              {t('settings.library.register', 'Create an account')}
            </a>
            {' · '}
            <a href={forgotPasswordUrl(s.server)} target="_blank" rel="noreferrer">
              {t('settings.library.forgot', 'Forgot password')}
            </a>
          </p>
        </>
      )}
      <BibliothekFehler fehler={s.fehler} server={s.server} />
    </section>
  )
}

/** Eine Fehlermeldung der Bibliothek; bei geaenderten Richtlinien mit dem Weg dorthin. */
export function BibliothekFehler({ fehler, server }: { fehler: LibraryErrorCode | null; server: string }) {
  const { t } = useT()
  if (!fehler) return null
  return (
    <p className="warnung">
      {bibliothekFehlerText(fehler, t)}
      {fehler === 'guidelines-outdated' && (
        <>
          {' '}
          <a href={richtlinienUrl(server)} target="_blank" rel="noreferrer">
            {t('library.error.guidelinesLink', 'Open the guidelines')}
          </a>
        </>
      )}
    </p>
  )
}
