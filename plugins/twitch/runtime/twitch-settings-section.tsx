'use client'

import { useEffect, useState } from 'react'
import { Card, PillBtn, TOKENS, eyebrowStyle, inputStyle } from '@/lib/plugin-sdk'
import {
  onAuthCapabilitiesChanged,
  resolveAuthCapabilityStatus,
  resolvePluginText,
  useLang,
} from '@/lib/plugin-sdk'
import { connectTwitch, disconnectTwitch, openTwitchUrl, openTwitchVerificationUrl, TwitchAuthError } from './twitch-auth'
import { getTwitchClientId, setTwitchClientId } from './twitch-app-credentials'
import {
  getTwitchHomeCategory,
  getTwitchHomeChannels,
  setTwitchHomeCategory,
  setTwitchHomeChannels,
} from './twitch-storage'

const settingsActionButtonClass =
  'rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-300 transition hover:border-white/20 hover:text-white disabled:opacity-40'

const settingsPrimaryActionButtonClass =
  'rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-200 transition hover:border-white/20 hover:text-white disabled:opacity-40'

/**
 * Typografin läses ur appens `--st-*`-skala i stället för att skrivas i px.
 *
 * I TV-läget ritas allt i en 1920×1080-designscen, och där är ett hårdkodat
 * `fontSize: 12` tolv DESIGNpixlar — ungefär hälften av vad som är läsbart på
 * tio fots avstånd. Variablerna bär TV:ns egna tal (`calc(15.5 * var(--tv-u))`
 * m.fl.) och följer dessutom användarens textstorleksinställning för TV-läget.
 * Se kommentaren vid `--st-body` i appens index.css.
 */
const TYPE = {
  label: 'var(--st-label)',
  small: 'var(--st-small)',
  body: 'var(--st-body)',
  h3: 'var(--st-h3)',
  h1: 'var(--st-h1)',
} as const

const TEXT = {
  appTitle: { en: 'Twitch application', sv: 'Twitch-applikation', de: 'Twitch-Anwendung', fr: 'Application Twitch', es: 'Aplicación de Twitch' },
  appNote: {
    en: 'Twitch limits each application to 800 requests per minute. Lumio therefore uses your own registration instead of a shared one, so your limit is yours alone.',
    sv: 'Twitch begränsar varje applikation till 800 anrop per minut. Därför använder Lumio din egen registrering i stället för en delad — din kvot är då bara din.',
    de: 'Twitch begrenzt jede Anwendung auf 800 Anfragen pro Minute. Deshalb nutzt Lumio deine eigene Registrierung statt einer gemeinsamen – dein Limit gehört dir allein.',
    fr: 'Twitch limite chaque application à 800 requêtes par minute. Lumio utilise donc votre propre enregistrement plutôt qu’un enregistrement partagé : votre quota n’est qu’à vous.',
    es: 'Twitch limita cada aplicación a 800 solicitudes por minuto. Por eso Lumio usa tu propio registro en lugar de uno compartido, así el límite es solo tuyo.',
  },
  appRegistered: { en: 'Client ID saved', sv: 'Client ID sparat', de: 'Client-ID gespeichert', fr: 'Client ID enregistré', es: 'Client ID guardado' },
  appMissing: { en: 'No application registered yet', sv: 'Ingen applikation registrerad än', de: 'Noch keine Anwendung registriert', fr: 'Aucune application enregistrée', es: 'Aún no hay ninguna aplicación registrada' },
  clientIdLabel: { en: 'Client ID', sv: 'Client ID', de: 'Client-ID', fr: 'Client ID', es: 'Client ID' },
  clientIdPlaceholder: { en: 'Paste the Client ID from dev.twitch.tv', sv: 'Klistra in Client ID från dev.twitch.tv', de: 'Client-ID von dev.twitch.tv einfügen', fr: 'Collez le Client ID de dev.twitch.tv', es: 'Pega el Client ID de dev.twitch.tv' },
  openConsole: { en: 'Open dev.twitch.tv', sv: 'Öppna dev.twitch.tv', de: 'dev.twitch.tv öffnen', fr: 'Ouvrir dev.twitch.tv', es: 'Abrir dev.twitch.tv' },
  stepsTitle: { en: 'How to register', sv: 'Så registrerar du', de: 'So registrierst du dich', fr: 'Comment l’enregistrer', es: 'Cómo registrarla' },
  step1: { en: 'Open the Twitch developer console and click Register Your Application.', sv: 'Öppna Twitchs utvecklarkonsol och klicka Register Your Application.', de: 'Öffne die Twitch-Entwicklerkonsole und klicke auf Register Your Application.', fr: 'Ouvrez la console développeur Twitch et cliquez sur Register Your Application.', es: 'Abre la consola de desarrolladores de Twitch y haz clic en Register Your Application.' },
  step2: { en: 'Name it anything (for example "Lumio").', sv: 'Döp den till vad du vill (till exempel "Lumio").', de: 'Gib ihr einen beliebigen Namen (zum Beispiel „Lumio“).', fr: 'Donnez-lui le nom de votre choix (par exemple « Lumio »).', es: 'Ponle el nombre que quieras (por ejemplo, «Lumio»).' },
  step3: { en: 'Set OAuth Redirect URL to http://localhost — the device login never uses it, but Twitch requires a value.', sv: 'Sätt OAuth Redirect URL till http://localhost — enhetsinloggningen använder den aldrig, men Twitch kräver ett värde.', de: 'Setze die OAuth Redirect URL auf http://localhost – die Geräteanmeldung nutzt sie nie, aber Twitch verlangt einen Wert.', fr: 'Définissez l’OAuth Redirect URL sur http://localhost : la connexion par code appareil ne l’utilise jamais, mais Twitch exige une valeur.', es: 'Establece la OAuth Redirect URL en http://localhost: el inicio de sesión con código de dispositivo nunca la usa, pero Twitch exige un valor.' },
  step4: { en: 'Set Client Type to Public. Then no secret is needed, and none is ever stored here.', sv: 'Sätt Client Type till Public. Då behövs ingen hemlighet, och ingen lagras heller här.', de: 'Setze Client Type auf Public. Dann ist kein Secret nötig, und hier wird nie eines gespeichert.', fr: 'Définissez Client Type sur Public. Aucun secret n’est alors nécessaire, et aucun n’est jamais stocké ici.', es: 'Establece Client Type en Public. Así no hace falta ningún secreto y aquí nunca se guarda ninguno.' },
  step5: { en: 'Copy the Client ID and paste it above.', sv: 'Kopiera Client ID och klistra in det ovan.', de: 'Kopiere die Client-ID und füge sie oben ein.', fr: 'Copiez le Client ID et collez-le ci-dessus.', es: 'Copia el Client ID y pégalo arriba.' },
  connectNeedsApp: {
    en: 'Save a Client ID above before signing in.',
    sv: 'Spara ett Client ID ovan innan du loggar in.',
    de: 'Speichere oben eine Client-ID, bevor du dich anmeldest.',
    fr: 'Enregistrez un Client ID ci-dessus avant de vous connecter.',
    es: 'Guarda un Client ID arriba antes de iniciar sesión.',
  },
  connection: { en: 'Connection', sv: 'Anslutning', de: 'Verbindung', fr: 'Connexion', es: 'Conexión' },
  notConnected: { en: 'Not connected', sv: 'Inte ansluten', de: 'Nicht verbunden', fr: 'Non connecté', es: 'No conectado' },
  connectedAs: { en: 'Connected as', sv: 'Ansluten som', de: 'Verbunden als', fr: 'Connecté en tant que', es: 'Conectado como' },
  connect: { en: 'Connect Twitch', sv: 'Anslut Twitch', de: 'Twitch verbinden', fr: 'Connecter Twitch', es: 'Conectar Twitch' },
  connecting: { en: 'Connecting…', sv: 'Ansluter…', de: 'Verbinde …', fr: 'Connexion…', es: 'Conectando…' },
  disconnect: { en: 'Disconnect', sv: 'Koppla från', de: 'Trennen', fr: 'Déconnecter', es: 'Desconectar' },
  disconnecting: { en: 'Disconnecting…', sv: 'Kopplar från…', de: 'Trenne …', fr: 'Déconnexion…', es: 'Desconectando…' },
  connectError: { en: 'Could not connect Twitch.', sv: 'Kunde inte ansluta Twitch.', de: 'Twitch konnte nicht verbunden werden.', fr: 'Impossible de connecter Twitch.', es: 'No se pudo conectar Twitch.' },
  disconnectError: { en: 'Could not disconnect Twitch.', sv: 'Kunde inte koppla från Twitch.', de: 'Twitch konnte nicht getrennt werden.', fr: 'Impossible de déconnecter Twitch.', es: 'No se pudo desconectar Twitch.' },
  connectionNote: {
    en: 'Sign in with your Twitch account to browse followed channels and access your streams.',
    sv: 'Logga in med ditt Twitch-konto för att bläddra bland kanaler du följer och dina streams.',
    de: 'Melde dich mit deinem Twitch-Konto an, um gefolgte Kanäle und deine Streams zu durchsuchen.',
    fr: 'Connectez-vous avec votre compte Twitch pour parcourir les chaînes suivies et accéder à vos streams.',
    es: 'Inicia sesión con tu cuenta de Twitch para explorar los canales que sigues y acceder a tus streams.',
  },
  deviceCodeIntro: {
    en: 'Open the Twitch activation page and enter this code:',
    sv: 'Öppna Twitchs aktiveringssida och ange denna kod:',
    de: 'Öffne die Twitch-Aktivierungsseite und gib diesen Code ein:',
    fr: 'Ouvrez la page d’activation de Twitch et saisissez ce code :',
    es: 'Abre la página de activación de Twitch e introduce este código:',
  },
  openVerificationUrl: { en: 'Open twitch.tv/activate', sv: 'Öppna twitch.tv/activate', de: 'twitch.tv/activate öffnen', fr: 'Ouvrir twitch.tv/activate', es: 'Abrir twitch.tv/activate' },
  waitingForApproval: { en: 'Waiting for approval on twitch.tv…', sv: 'Väntar på godkännande på twitch.tv…', de: 'Warte auf Bestätigung auf twitch.tv …', fr: 'En attente d’approbation sur twitch.tv…', es: 'Esperando la aprobación en twitch.tv…' },
  homeRows: { en: 'Home rows', sv: 'Hemmarader', de: 'Startseiten-Reihen', fr: 'Rangées d’accueil', es: 'Filas de inicio' },
  homeRowsNote: {
    en: 'Used by the "Twitch: Category" and "Twitch: Channels" home rows (Settings → Home → row source).',
    sv: 'Används av hemmaraderna "Twitch: Kategori" och "Twitch: Kanaler" (Inställningar → Hem → radkälla).',
    de: 'Wird von den Startseiten-Reihen „Twitch: Kategorie“ und „Twitch: Kanäle“ verwendet (Einstellungen → Start → Reihenquelle).',
    fr: 'Utilisé par les rangées d’accueil « Twitch : Catégorie » et « Twitch : Chaînes » (Paramètres → Accueil → source de la rangée).',
    es: 'Lo usan las filas de inicio «Twitch: Categoría» y «Twitch: Canales» (Ajustes → Inicio → fuente de la fila).',
  },
  homeCategoryLabel: { en: 'Category row: category', sv: 'Kategorirad: kategori', de: 'Kategorie-Reihe: Kategorie', fr: 'Rangée catégorie : catégorie', es: 'Fila de categoría: categoría' },
  homeCategoryPlaceholder: { en: 'e.g. Counter-Strike', sv: 't.ex. Counter-Strike', de: 'z. B. Counter-Strike', fr: 'p. ex. Counter-Strike', es: 'p. ej. Counter-Strike' },
  homeChannelsLabel: { en: 'Channels row: channels (comma-separated)', sv: 'Kanalrad: kanaler (kommaseparerade)', de: 'Kanäle-Reihe: Kanäle (durch Komma getrennt)', fr: 'Rangée chaînes : chaînes (séparées par des virgules)', es: 'Fila de canales: canales (separados por comas)' },
  homeChannelsPlaceholder: { en: 'e.g. shroud, cohhcarnage', sv: 't.ex. shroud, cohhcarnage', de: 'z. B. shroud, cohhcarnage', fr: 'p. ex. shroud, cohhcarnage', es: 'p. ej. shroud, cohhcarnage' },
} as const

const settingsTextInputClass =
  'w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition focus:border-white/25'

export function TwitchSettingsSection() {
  const { lang } = useLang()
  const [sessionLabel, setSessionLabel] = useState('')
  const [sessionDetail, setSessionDetail] = useState('')
  const [busy, setBusy] = useState<'idle' | 'connecting' | 'disconnecting'>('idle')
  const [error, setError] = useState('')
  const [userCode, setUserCode] = useState('')
  const [verificationUri, setVerificationUri] = useState('')
  const [homeCategory, setHomeCategory] = useState('')
  const [homeChannels, setHomeChannels] = useState('')
  const [clientId, setClientId] = useState('')

  function text(key: keyof typeof TEXT): string {
    return (TEXT[key] as { en: string } & Record<string, string | undefined>)[lang] ?? TEXT[key].en
  }

  // TwitchAuthError carries its own {en, sv} copy; anything else is either a
  // raw Twitch API code or an unexpected throw, so fall back to local copy.
  function errorText(error: unknown, fallbackKey: keyof typeof TEXT): string {
    if (error instanceof TwitchAuthError) return resolvePluginText(error.text, lang)
    if (error instanceof Error && error.message) return error.message
    return text(fallbackKey)
  }

  useEffect(() => {
    // Read once on mount; the fields are edited here, so re-reading them on
    // every keystroke's own change event would fight the user's typing.
    setHomeCategory(getTwitchHomeCategory())
    setHomeChannels(getTwitchHomeChannels())
    setClientId(getTwitchClientId())
  }, [])

  useEffect(() => {
    const sync = () => {
      void resolveAuthCapabilityStatus('twitch-auth')
        .then((status) => {
          if (!status) {
            setSessionLabel(text('notConnected'))
            setSessionDetail('')
            return
          }
          if (status.state === 'connected' && status.accountLabel) {
            setSessionLabel(`${text('connectedAs')} ${status.accountLabel}`)
          } else {
            setSessionLabel(text('notConnected'))
          }
          setSessionDetail(status.detail ? resolvePluginText(status.detail, lang) : '')
        })
        .catch(() => {
          setSessionLabel(text('notConnected'))
          setSessionDetail('')
        })
    }
    sync()
    return onAuthCapabilitiesChanged(sync)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  async function handleConnect() {
    setBusy('connecting')
    setError('')
    setUserCode('')
    setVerificationUri('')
    try {
      await connectTwitch((nextUserCode, nextVerificationUri) => {
        setUserCode(nextUserCode)
        setVerificationUri(nextVerificationUri)
      })
      const nextStatus = await resolveAuthCapabilityStatus('twitch-auth')
      setSessionLabel(
        nextStatus?.state === 'connected' && nextStatus.accountLabel
          ? `${text('connectedAs')} ${nextStatus.accountLabel}`
          : text('notConnected'),
      )
      setSessionDetail(nextStatus?.detail ? resolvePluginText(nextStatus.detail, lang) : '')
    } catch (connectError) {
      setError(errorText(connectError, 'connectError'))
    } finally {
      setUserCode('')
      setVerificationUri('')
      setBusy('idle')
    }
  }

  async function handleDisconnect() {
    setBusy('disconnecting')
    setError('')
    try {
      disconnectTwitch()
      setSessionLabel(text('notConnected'))
      setSessionDetail('')
    } catch (disconnectError) {
      setError(errorText(disconnectError, 'disconnectError'))
    } finally {
      setBusy('idle')
    }
  }

  const field = (label: string, value: string, placeholder: string, onChange: (value: string) => void) => (
    <div>
      <div style={{ ...eyebrowStyle, marginBottom: 6 }}>{label}</div>
      <input type="text" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} style={inputStyle} />
    </div>
  )

  const step = (n: number, body: string) => (
    <li style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
      <span
        aria-hidden
        style={{
          flex: 'none', minWidth: '1.6em', height: '1.6em', borderRadius: 999,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${TOKENS.border}`, background: TOKENS.surface0,
          fontSize: TYPE.label, fontWeight: 600, color: TOKENS.textMute,
        }}
      >
        {n}
      </span>
      <span style={{ fontSize: TYPE.small, lineHeight: 1.55, color: TOKENS.textMute }}>{body}</span>
    </li>
  )

  const hasClientId = clientId.trim().length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card>
        <div style={{ ...eyebrowStyle }}>{text('appTitle')}</div>
        <div
          style={{
            marginTop: 6, fontSize: TYPE.body, fontWeight: 600,
            color: hasClientId ? TOKENS.text : TOKENS.warn,
          }}
        >
          {hasClientId ? text('appRegistered') : text('appMissing')}
        </div>
        <p style={{ margin: '6px 0 12px', fontSize: TYPE.small, lineHeight: 1.55, color: TOKENS.textMute }}>{text('appNote')}</p>
        {field(text('clientIdLabel'), clientId, text('clientIdPlaceholder'), (value) => {
          setClientId(value)
          setTwitchClientId(value)
        })}
        <div style={{ marginTop: 12 }}>
          <PillBtn variant="accent" size="sm" onClick={() => void openTwitchUrl('https://dev.twitch.tv/console/apps/create')}>
            {text('openConsole')}
          </PillBtn>
        </div>
        <div style={{ ...eyebrowStyle, marginTop: 16 }}>{text('stepsTitle')}</div>
        <ol style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '8px 0 0', padding: 0, listStyle: 'none' }}>
          {step(1, text('step1'))}
          {step(2, text('step2'))}
          {step(3, text('step3'))}
          {step(4, text('step4'))}
          {step(5, text('step5'))}
        </ol>
      </Card>

      <Card>
        <div style={{ ...eyebrowStyle }}>{text('connection')}</div>
        <div style={{ marginTop: 6, fontSize: TYPE.body, fontWeight: 600, color: TOKENS.text }}>{sessionLabel}</div>
        {sessionDetail ? <p style={{ margin: '6px 0 0', fontSize: TYPE.small, color: TOKENS.warn }}>{sessionDetail}</p> : null}
        <p style={{ margin: '6px 0 12px', fontSize: TYPE.small, lineHeight: 1.55, color: TOKENS.textMute }}>
          {hasClientId ? text('connectionNote') : text('connectNeedsApp')}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <PillBtn variant="accent" onClick={handleConnect} disabled={busy !== 'idle' || !hasClientId}>
            {busy === 'connecting' ? text('connecting') : text('connect')}
          </PillBtn>
          <PillBtn variant="danger" onClick={handleDisconnect} disabled={busy !== 'idle'}>
            {busy === 'disconnecting' ? text('disconnecting') : text('disconnect')}
          </PillBtn>
        </div>
        {busy === 'connecting' && userCode ? (
          <div style={{ marginTop: 12, padding: '12px 16px', borderRadius: 12, border: `1px solid ${TOKENS.accent}`, background: TOKENS.accentSoft }}>
            <div style={{ fontSize: TYPE.small, color: TOKENS.textDim }}>{text('deviceCodeIntro')}</div>
            <div style={{ marginTop: 6, fontSize: TYPE.h1, fontWeight: 600, letterSpacing: '0.3em', color: TOKENS.text }}>{userCode}</div>
            <div style={{ marginTop: 10 }}>
              <PillBtn variant="accent" size="sm" onClick={() => void openTwitchVerificationUrl(verificationUri)}>{text('openVerificationUrl')}</PillBtn>
            </div>
            <div style={{ marginTop: 10, fontSize: TYPE.small, color: TOKENS.textMute }}>{text('waitingForApproval')}</div>
          </div>
        ) : null}
        {error ? <p style={{ margin: '10px 0 0', fontSize: TYPE.small, color: TOKENS.red }}>{error}</p> : null}
      </Card>

      <Card>
        <div style={{ ...eyebrowStyle }}>{text('homeRows')}</div>
        <p style={{ margin: '6px 0 12px', fontSize: TYPE.small, lineHeight: 1.55, color: TOKENS.textMute }}>{text('homeRowsNote')}</p>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {field(text('homeCategoryLabel'), homeCategory, text('homeCategoryPlaceholder'), (value) => {
            setHomeCategory(value)
            setTwitchHomeCategory(value)
          })}
          {field(text('homeChannelsLabel'), homeChannels, text('homeChannelsPlaceholder'), (value) => {
            setHomeChannels(value)
            setTwitchHomeChannels(value)
          })}
        </div>
      </Card>
    </div>
  )

}
