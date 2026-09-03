'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  Card,
  Checkbox,
  PillBtn,
  TOKENS,
  eyebrowStyle,
  fetchLibraryStatus,
  inputStyle,
  onLibraryModeChanged,
  resetLibrarySource,
  runLibraryScan,
  setLibraryMode,
  getStoredLibraryMode,
  useLang,
  type LibraryScanProgress,
  type LibraryStatus,
} from '@/lib/plugin-sdk'
import { authenticate, fetchViews } from './jellyfin-api'
import {
  clearJellyfinSettings,
  getJellyfinSettings,
  isJellyfinConnected,
  normalizeServerUrl,
  onJellyfinSettingsChanged,
  setJellyfinSettings,
  type JellyfinLibraryOption,
} from './jellyfin-storage'
import { jellyfinLibraryProvider, jellyfinLibrarySourceRef } from './jellyfin-library-provider'

/**
 * Inställningar: anslut (server, användare, lösenord), välj bibliotek, bygg
 * indexet. Stapel av värdens kort — värden ritar rubrik och statuspunkt.
 * Strängarna är plugin-lokala (två språk) eftersom pluginet släpps separat.
 */
const STR = {
  en: {
    server: 'Server address', serverPlaceholder: 'http://jellyfin.local:8096', username: 'Username', password: 'Password',
    connect: 'Connect', connecting: 'Connecting…', disconnect: 'Disconnect', connectedAs: 'Signed in as', at: 'on',
    libraries: 'Libraries to index', refreshLibraries: 'Refresh libraries', noLibraries: 'No movie or series libraries found.',
    movies: 'Movies', series: 'Series', authFailed: 'Could not sign in. Check the address, username and password.',
    indexTitle: 'Library index', indexDesc: 'Lumio indexes your Jellyfin libraries locally so the home page, search and Zapp can run on what you own.',
    indexBuild: 'Build index', indexRebuild: 'Rebuild', indexUpdate: 'Update', indexClear: 'Remove index', indexEmpty: 'Not indexed yet.',
    indexStatus: '{titles} titles · {unmatched} unmatched', indexLastSync: 'Last synced', running: '{done} titles', cancel: 'Cancel',
    homeHint: 'Make it the home page or open the Jellyfin tab: Settings → Home & appearance → Layout → Library.',
  },
  sv: {
    server: 'Serveradress', serverPlaceholder: 'http://jellyfin.local:8096', username: 'Användarnamn', password: 'Lösenord',
    connect: 'Anslut', connecting: 'Ansluter…', disconnect: 'Koppla från', connectedAs: 'Inloggad som', at: 'på',
    libraries: 'Bibliotek att indexera', refreshLibraries: 'Uppdatera bibliotek', noLibraries: 'Inga film- eller seriebibliotek hittades.',
    movies: 'Filmer', series: 'Serier', authFailed: 'Kunde inte logga in. Kontrollera adress, användarnamn och lösenord.',
    indexTitle: 'Biblioteksindex', indexDesc: 'Lumio indexerar dina Jellyfin-bibliotek lokalt så startsida, sök och Zapp kan gå helt på det du äger.',
    indexBuild: 'Bygg index', indexRebuild: 'Bygg om', indexUpdate: 'Uppdatera', indexClear: 'Ta bort index', indexEmpty: 'Inte indexerat ännu.',
    indexStatus: '{titles} titlar · {unmatched} omatchade', indexLastSync: 'Senast synkat', running: '{done} titlar', cancel: 'Avbryt',
    homeHint: 'Gör det till startsida eller öppna Jellyfin-fliken: Inställningar → Hem & utseende → Layout → Bibliotek.',
  },
} as const

export function JellyfinSection() {
  const { lang } = useLang()
  const s = STR[lang === 'sv' ? 'sv' : 'en']
  const [settings, setSettings] = useState(() => getJellyfinSettings())
  useEffect(() => onJellyfinSettingsChanged(() => setSettings(getJellyfinSettings())), [])
  const [server, setServer] = useState(settings.serverUrl ?? '')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState<'idle' | 'connecting' | 'libraries'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [available, setAvailable] = useState<JellyfinLibraryOption[] | null>(null)
  const connected = isJellyfinConnected(settings)
  const stack: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 }

  const loadLibraries = async (next = settings) => {
    setBusy('libraries')
    try {
      const views = await fetchViews(next)
      setAvailable(views)
      if (next.libraries.length === 0 && views.length > 0) setJellyfinSettings({ ...next, libraries: views })
    } catch {
      setError(s.authFailed)
    } finally {
      setBusy('idle')
    }
  }
  useEffect(() => {
    if (connected && available === null) void loadLibraries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected])

  const connect = async () => {
    const url = normalizeServerUrl(server)
    if (!url || !username.trim()) return
    setBusy('connecting')
    setError(null)
    try {
      const auth = await authenticate(url, username.trim(), password)
      const next = { serverUrl: url, serverId: auth.serverId, serverName: auth.serverName, userId: auth.userId, userName: auth.userName, accessToken: auth.accessToken, libraries: [] }
      setJellyfinSettings(next)
      setPassword('')
      await loadLibraries(next)
    } catch {
      setError(s.authFailed)
      setBusy('idle')
    }
  }

  const toggleLibrary = (library: JellyfinLibraryOption, on: boolean) => {
    const current = settings.libraries.filter((entry) => entry.id !== library.id)
    setJellyfinSettings({ ...settings, libraries: on ? [...current, library] : current })
  }

  return (
    <div style={stack}>
      <Card>
        {connected ? (
          <div style={stack}>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: TOKENS.text }}>{s.connectedAs} {settings.userName} {s.at} {settings.serverName}</div>
              <div style={{ fontSize: 12, color: TOKENS.textMute, marginTop: 2 }}>{settings.serverUrl}</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <PillBtn onClick={() => void loadLibraries()} disabled={busy !== 'idle'}>{s.refreshLibraries}</PillBtn>
              <PillBtn variant="danger" onClick={() => { clearJellyfinSettings(); setAvailable(null) }}>{s.disconnect}</PillBtn>
            </div>
          </div>
        ) : (
          <div style={stack}>
            <div>
              <div style={{ ...eyebrowStyle, marginBottom: 6 }}>{s.server}</div>
              <input type="url" value={server} onChange={(event) => setServer(event.target.value)} placeholder={s.serverPlaceholder} autoCapitalize="none" autoCorrect="off" spellCheck={false} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div>
                <div style={{ ...eyebrowStyle, marginBottom: 6 }}>{s.username}</div>
                <input type="text" value={username} onChange={(event) => setUsername(event.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} style={inputStyle} />
              </div>
              <div>
                <div style={{ ...eyebrowStyle, marginBottom: 6 }}>{s.password}</div>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="off" style={inputStyle} />
              </div>
            </div>
            <PillBtn variant="accent" onClick={() => void connect()} disabled={busy === 'connecting' || !server.trim() || !username.trim()} style={{ alignSelf: 'flex-start' }}>
              {busy === 'connecting' ? s.connecting : s.connect}
            </PillBtn>
          </div>
        )}
        {error ? <p style={{ margin: '10px 0 0', fontSize: 12, color: TOKENS.red }}>{error}</p> : null}
      </Card>

      {connected ? (
        <Card>
          <div style={{ ...eyebrowStyle, marginBottom: 10 }}>{s.libraries}</div>
          {available && available.length === 0 ? <p style={{ margin: 0, fontSize: 12, color: TOKENS.textMute }}>{s.noLibraries}</p> : null}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(available ?? settings.libraries).map((library) => {
              const on = settings.libraries.some((entry) => entry.id === library.id)
              return (
                <div key={library.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, border: `1px solid ${on ? TOKENS.accent : TOKENS.border}`, background: on ? TOKENS.accentSoft : TOKENS.surface0 }}>
                  <Checkbox checked={on} onChange={(value) => toggleLibrary(library, value)} />
                  <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: TOKENS.text }}>{library.name}</span>
                  <span style={{ ...eyebrowStyle, marginBottom: 0 }}>{library.type === 'movies' ? s.movies : s.series}</span>
                </div>
              )
            })}
          </div>
        </Card>
      ) : null}

      <JellyfinIndexPanel strings={s} />
    </div>
  )
}

function JellyfinIndexPanel({ strings: s }: { strings: (typeof STR)['en'] | (typeof STR)['sv'] }) {
  const [status, setStatus] = useState<LibraryStatus | null>(null)
  const [progress, setProgress] = useState<LibraryScanProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const settings = getJellyfinSettings()
  const source = jellyfinLibrarySourceRef(settings)
  const connected = isJellyfinConnected(settings) && settings.libraries.length > 0

  const refresh = () => {
    void fetchLibraryStatus().then(setStatus).catch(() => setStatus(null))
  }
  useEffect(() => {
    refresh()
    return onLibraryModeChanged(refresh)
  }, [])

  const mine = status?.sources.find((entry) => entry.id === source?.id) ?? null
  const running = progress !== null && progress.phase !== 'done'
  const pct = progress?.total ? Math.min(100, Math.round((progress.done / Math.max(1, progress.total)) * 100)) : null

  const run = async (kind: 'full' | 'delta') => {
    if (!source || running) return
    setError(null)
    const controller = new AbortController()
    abortRef.current = controller
    setProgress({ phase: 'listing', done: 0 })
    try {
      await runLibraryScan(jellyfinLibraryProvider, { ...source, cursor: mine?.cursor ?? null }, { mode: kind, signal: controller.signal, onProgress: setProgress })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setProgress(null)
      abortRef.current = null
      refresh()
    }
  }

  const clear = async () => {
    if (!source || running) return
    await resetLibrarySource(source.id)
    const stored = getStoredLibraryMode()
    if (stored?.sourceIds.includes(source.id)) {
      const rest = stored.sourceIds.filter((id) => id !== source.id)
      setLibraryMode(rest.length > 0 ? { sourceIds: rest } : null)
    }
    refresh()
  }

  const formatWhen = (seconds: number | null | undefined) =>
    seconds ? new Date(seconds * 1000).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '–'

  return (
    <Card>
      <div style={{ fontSize: 14.5, fontWeight: 600, color: TOKENS.text }}>{s.indexTitle}</div>
      <p style={{ margin: '4px 0 0', fontSize: 12, lineHeight: 1.5, color: TOKENS.textMute }}>{s.indexDesc}</p>
      <div style={{ marginTop: 12, fontSize: 12, color: TOKENS.textDim }}>
        {mine ? (
          <>
            <span style={{ color: TOKENS.text }}>{s.indexStatus.replace('{titles}', String(mine.titles)).replace('{unmatched}', String(status?.unmatched ?? 0))}</span>
            <span style={{ margin: '0 8px', color: TOKENS.textMute }}>·</span>
            {s.indexLastSync}: {formatWhen(mine.lastDeltaSync ?? mine.lastFullSync)}
          </>
        ) : (
          s.indexEmpty
        )}
      </div>
      {progress ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: TOKENS.textDim }}>
            <span>{progress.section ? `${progress.section} · ` : ''}{s.running.replace('{done}', String(progress.done))}{progress.total ? ` / ${progress.total}` : ''}</span>
            <PillBtn size="sm" onClick={() => abortRef.current?.abort()}>{s.cancel}</PillBtn>
          </div>
          <div style={{ marginTop: 8, height: 6, width: '100%', overflow: 'hidden', borderRadius: 999, background: TOKENS.surface0 }}>
            <div style={{ height: '100%', borderRadius: 999, background: TOKENS.accent, width: pct != null ? `${pct}%` : '35%', transition: 'width .3s' }} />
          </div>
        </div>
      ) : null}
      {error ? <p style={{ margin: '8px 0 0', fontSize: 12, color: TOKENS.red }}>{error}</p> : null}
      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <PillBtn variant="accent" disabled={!connected || running} onClick={() => void run('full')}>{mine ? s.indexRebuild : s.indexBuild}</PillBtn>
        {mine ? <PillBtn disabled={running} onClick={() => void run('delta')}>{s.indexUpdate}</PillBtn> : null}
        {mine ? <PillBtn variant="danger" disabled={running} onClick={() => void clear()}>{s.indexClear}</PillBtn> : null}
      </div>
      <p style={{ margin: '12px 0 0', fontSize: 12, lineHeight: 1.5, color: TOKENS.textMute }}>{s.homeHint}</p>
    </Card>
  )
}
