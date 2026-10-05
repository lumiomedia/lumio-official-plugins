'use client'

import { useEffect, useState, type CSSProperties } from 'react'
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
  cancelLibraryScan,
  getActiveLibraryScan,
  onLibraryScanChanged,
  setLibraryMode,
  getStoredLibraryMode,
  useLang,
  useTvMode,
  type LibraryScanProgress,
  type LibraryStatus,
} from '@/lib/plugin-sdk'
import { authenticate, EmbyServerKindError, fetchViews } from './emby-api'
import { describeError, EmbyScanError, logEmby } from './emby-log'
import {
  clearEmbySettings,
  getEmbySettings,
  isEmbyConnected,
  normalizeServerUrl,
  onEmbySettingsChanged,
  setEmbySettings,
  type EmbyLibraryOption,
} from './emby-storage'
import { embyLibraryProvider, getLastEmbyScanNotes, embyLibrarySourceRef } from './emby-library-provider'

/**
 * Inställningar: anslut (server, användare, lösenord), välj bibliotek, bygg
 * indexet. Stapel av värdens kort — värden ritar rubrik och statuspunkt.
 * Strängarna är plugin-lokala (två språk) eftersom pluginet släpps separat.
 */
const STR = {
  en: {
    server: 'Server address', serverPlaceholder: 'http://emby.local:8096', username: 'Username', password: 'Password',
    connect: 'Connect', connecting: 'Connecting…', disconnect: 'Disconnect', connectedAs: 'Signed in as', at: 'on',
    libraries: 'Libraries to index', refreshLibraries: 'Refresh libraries', noLibraries: 'No movie or series libraries found.',
    movies: 'Movies', series: 'Series', authFailed: 'Could not sign in. Check the address, username and password.', isJellyfin: 'This is a Jellyfin server. Use the Jellyfin plugin for it.',
    indexTitle: 'Library index', indexDesc: 'Lumio indexes your Emby libraries locally so the home page, search and Zapp can run on what you own.',
    indexBuild: 'Build index', indexRebuild: 'Rebuild', indexUpdate: 'Update', indexClear: 'Remove index', indexEmpty: 'Not indexed yet.',
    indexStatus: '{titles} titles · {unmatched} unmatched', indexLastSync: 'Last synced', running: '{done} titles', cancel: 'Cancel', busyElsewhere: 'Another library is being indexed. Try again when it is done.',
    homeHint: 'Make it the home page or open the Emby tab: Settings → Home & appearance → Layout → Library.',
    slimmed: 'Too large to index in full (newest episodes kept):',
  },
  sv: {
    server: 'Serveradress', serverPlaceholder: 'http://emby.local:8096', username: 'Användarnamn', password: 'Lösenord',
    connect: 'Anslut', connecting: 'Ansluter…', disconnect: 'Koppla från', connectedAs: 'Inloggad som', at: 'på',
    libraries: 'Bibliotek att indexera', refreshLibraries: 'Uppdatera bibliotek', noLibraries: 'Inga film- eller seriebibliotek hittades.',
    movies: 'Filmer', series: 'Serier', authFailed: 'Kunde inte logga in. Kontrollera adress, användarnamn och lösenord.', isJellyfin: 'Det här är en Jellyfin-server. Använd Jellyfin-pluginet för den.',
    indexTitle: 'Biblioteksindex', indexDesc: 'Lumio indexerar dina Emby-bibliotek lokalt så startsida, sök och Zapp kan gå helt på det du äger.',
    indexBuild: 'Bygg index', indexRebuild: 'Bygg om', indexUpdate: 'Uppdatera', indexClear: 'Ta bort index', indexEmpty: 'Inte indexerat ännu.',
    indexStatus: '{titles} titlar · {unmatched} omatchade', indexLastSync: 'Senast synkat', running: '{done} titlar', cancel: 'Avbryt', busyElsewhere: 'Ett annat bibliotek indexeras. Försök igen när det är klart.',
    homeHint: 'Gör det till startsida eller öppna Emby-fliken: Inställningar → Hem & utseende → Layout → Bibliotek.',
    slimmed: 'För stora för att indexeras helt (nyaste avsnitten med):',
  },
} as const

/** Appens TV-formel (lib/tv-metrics.ts): följer `--ui-scale` och TV-lägets textstorleksval. */
const tvFont = (px: number) => `calc(${px}px * var(--ui-scale, 1) * var(--tv-font-scale, 1))`

/**
 * TEXTSTORLEKAR PER YTA.
 *
 * Talen nedan var skrivbordets (12 och 14,5 px). I TV-läget är en pixel en
 * designpixel i 1080-scenen, så samma tal blev pytteliten text på tre meters
 * håll — sektionen stod bredvid appens egna TV-rader (25 px titlar) som
 * finstilt (Shield-rapporten 2026-10-02). TV-värdena följer appens rader.
 */
function useSectionType() {
  const tv = useTvMode()
  return tv
    ? { tv, title: tvFont(25), body: tvFont(20), gap: 18, rowPad: '16px 22px', bar: 10, input: { fontSize: tvFont(22), padding: '14px 18px' } as CSSProperties }
    : { tv, title: 14.5, body: 12, gap: 12, rowPad: '10px 14px', bar: 6, input: {} as CSSProperties }
}

export function EmbySection() {
  const { lang } = useLang()
  const type = useSectionType()
  const s = STR[lang === 'sv' ? 'sv' : 'en']
  const [settings, setSettings] = useState(() => getEmbySettings())
  useEffect(() => onEmbySettingsChanged(() => setSettings(getEmbySettings())), [])
  const [server, setServer] = useState(settings.serverUrl ?? '')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState<'idle' | 'connecting' | 'libraries'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [available, setAvailable] = useState<EmbyLibraryOption[] | null>(null)
  const connected = isEmbyConnected(settings)
  const stack: CSSProperties = { display: 'flex', flexDirection: 'column', gap: type.gap }

  const loadLibraries = async (next = settings) => {
    setBusy('libraries')
    try {
      const views = await fetchViews(next)
      setAvailable(views)
      if (next.libraries.length === 0 && views.length > 0) setEmbySettings({ ...next, libraries: views })
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
      const next = { serverUrl: url, apiBase: auth.apiBase, serverId: auth.serverId, serverName: auth.serverName, userId: auth.userId, userName: auth.userName, accessToken: auth.accessToken, libraries: [] }
      setEmbySettings(next)
      setPassword('')
      await loadLibraries(next)
    } catch (err) {
      setError(err instanceof EmbyServerKindError ? s.isJellyfin : s.authFailed)
      setBusy('idle')
    }
  }

  const toggleLibrary = (library: EmbyLibraryOption, on: boolean) => {
    const current = settings.libraries.filter((entry) => entry.id !== library.id)
    setEmbySettings({ ...settings, libraries: on ? [...current, library] : current })
  }

  return (
    <div style={stack}>
      <Card>
        {connected ? (
          <div style={stack}>
            <div>
              <div style={{ fontSize: type.title, fontWeight: 600, color: TOKENS.text }}>{s.connectedAs} {settings.userName} {s.at} {settings.serverName}</div>
              <div style={{ fontSize: type.body, color: TOKENS.textMute, marginTop: 2 }}>{settings.serverUrl}</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <PillBtn onClick={() => void loadLibraries()} disabled={busy !== 'idle'}>{s.refreshLibraries}</PillBtn>
              <PillBtn variant="danger" onClick={() => { clearEmbySettings(); setAvailable(null) }}>{s.disconnect}</PillBtn>
            </div>
          </div>
        ) : (
          <div style={stack}>
            <div>
              <div style={{ ...eyebrowStyle, marginBottom: 6 }}>{s.server}</div>
              <input type="url" value={server} onChange={(event) => setServer(event.target.value)} placeholder={s.serverPlaceholder} autoCapitalize="none" autoCorrect="off" spellCheck={false} style={{ ...inputStyle, ...type.input }} />
            </div>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div>
                <div style={{ ...eyebrowStyle, marginBottom: 6 }}>{s.username}</div>
                <input type="text" value={username} onChange={(event) => setUsername(event.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} style={{ ...inputStyle, ...type.input }} />
              </div>
              <div>
                <div style={{ ...eyebrowStyle, marginBottom: 6 }}>{s.password}</div>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="off" style={{ ...inputStyle, ...type.input }} />
              </div>
            </div>
            <PillBtn variant="accent" onClick={() => void connect()} disabled={busy === 'connecting' || !server.trim() || !username.trim()} style={{ alignSelf: 'flex-start' }}>
              {busy === 'connecting' ? s.connecting : s.connect}
            </PillBtn>
          </div>
        )}
        {error ? <p style={{ margin: '10px 0 0', fontSize: type.body, color: TOKENS.red }}>{error}</p> : null}
      </Card>

      {connected ? (
        <Card>
          <div style={{ ...eyebrowStyle, marginBottom: 10 }}>{s.libraries}</div>
          {available && available.length === 0 ? <p style={{ margin: 0, fontSize: type.body, color: TOKENS.textMute }}>{s.noLibraries}</p> : null}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(available ?? settings.libraries).map((library) => {
              const on = settings.libraries.some((entry) => entry.id === library.id)
              return (
                <div key={library.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: type.rowPad, borderRadius: 12, border: `1px solid ${on ? TOKENS.accent : TOKENS.border}`, background: on ? TOKENS.accentSoft : TOKENS.surface0 }}>
                  <Checkbox checked={on} onChange={(value) => toggleLibrary(library, value)} />
                  <span style={{ flex: 1, fontSize: type.title, fontWeight: 600, color: TOKENS.text }}>{library.name}</span>
                  <span style={{ ...eyebrowStyle, marginBottom: 0, lineHeight: 1 }}>{library.type === 'movies' ? s.movies : s.series}</span>
                </div>
              )
            })}
          </div>
        </Card>
      ) : null}

      <EmbyIndexPanel strings={s} />
    </div>
  )
}

function EmbyIndexPanel({ strings: s }: { strings: (typeof STR)['en'] | (typeof STR)['sv'] }) {
  const type = useSectionType()
  const [status, setStatus] = useState<LibraryStatus | null>(null)
  // Förloppet läses ur värdens delade skanning, inte ur egen state:
  // skanningen överlever panelen. Med egen state tappades den när
  // användaren navigerade bort, låset satt kvar och nästa knapptryck
  // svarade "library scan already running" (Emby, 2026-10-02).
  const [active, setActive] = useState(() => getActiveLibraryScan())
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState<string[]>([])
  const settings = getEmbySettings()
  const source = embyLibrarySourceRef(settings)
  const connected = isEmbyConnected(settings) && settings.libraries.length > 0

  const refresh = () => {
    void fetchLibraryStatus().then(setStatus).catch(() => setStatus(null))
  }
  useEffect(() => {
    refresh()
    return onLibraryModeChanged(refresh)
  }, [])
  useEffect(() => onLibraryScanChanged((scan) => {
    setActive(scan)
    // Klar (eller avbruten) medan panelen stod öppen: visa nya siffror.
    if (!scan) refresh()
  }), [])

  const mine = status?.sources.find((entry) => entry.id === source?.id) ?? null
  const progress: LibraryScanProgress | null = active && source && active.sourceId === source.id ? active.progress : null
  // Låset är ett för alla bibliotek: en Plex-skanning håller det också.
  const running = active !== null
  const busyElsewhere = active !== null && progress === null
  const pct = progress?.total ? Math.min(100, Math.round((progress.done / Math.max(1, progress.total)) * 100)) : null

  const run = async (kind: 'full' | 'delta') => {
    if (!source || running) return
    setError(null)
    setNotes([])
    try {
      await runLibraryScan(embyLibraryProvider, { ...source, cursor: mine?.cursor ?? null }, { mode: kind })
    } catch (err) {
      // Fel utanför pluginets egna steg (kärnans rensning/slutpost) har ingen
      // kontext än — loggraden och skärmbilden ska ändå säga var passet var.
      const message = describeError(err)
      if (!(err instanceof EmbyScanError)) logEmby(`scan failed outside the Emby steps (${kind}): ${message}`)
      setError(message)
    } finally {
      setNotes([...getLastEmbyScanNotes()])
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
      <div style={{ fontSize: type.title, fontWeight: 600, color: TOKENS.text }}>{s.indexTitle}</div>
      <p style={{ margin: '4px 0 0', fontSize: type.body, lineHeight: 1.5, color: TOKENS.textMute }}>{s.indexDesc}</p>
      <div style={{ marginTop: 12, fontSize: type.body, color: TOKENS.textDim }}>
        {mine ? (
          <>
            <span style={{ color: TOKENS.text }}>{s.indexStatus.replace('{titles}', String(mine.titles)).replace('{unmatched}', String((mine as { unmatched?: number }).unmatched ?? 0))}</span>
            <span style={{ margin: '0 8px', color: TOKENS.textMute }}>·</span>
            {s.indexLastSync}: {formatWhen(mine.lastDeltaSync ?? mine.lastFullSync)}
          </>
        ) : (
          s.indexEmpty
        )}
      </div>
      {progress ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: type.body, color: TOKENS.textDim }}>
            <span>{progress.section ? `${progress.section} · ` : ''}{s.running.replace('{done}', String(progress.done))}{progress.total ? ` / ${progress.total}` : ''}</span>
            <PillBtn size="sm" onClick={() => cancelLibraryScan()}>{s.cancel}</PillBtn>
          </div>
          <div style={{ marginTop: 8, height: type.bar, width: '100%', overflow: 'hidden', borderRadius: 999, background: TOKENS.surface0 }}>
            <div style={{ height: '100%', borderRadius: 999, background: TOKENS.accent, width: pct != null ? `${pct}%` : '35%', transition: 'width .3s' }} />
          </div>
        </div>
      ) : null}
      {busyElsewhere ? <p style={{ margin: '8px 0 0', fontSize: type.body, color: TOKENS.textDim }}>{s.busyElsewhere}</p> : null}
      {error ? <p style={{ margin: '8px 0 0', fontSize: type.body, color: TOKENS.red, overflowWrap: 'anywhere' }}>{error}</p> : null}
      {notes.length > 0 ? (
        <div style={{ marginTop: 8, fontSize: type.body, lineHeight: 1.5, color: TOKENS.textDim }}>
          {s.slimmed}
          {notes.map((note) => <div key={note} style={{ color: TOKENS.textMute, overflowWrap: 'anywhere' }}>{note}</div>)}
        </div>
      ) : null}
      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <PillBtn variant="accent" disabled={!connected || running} onClick={() => void run('full')}>{mine ? s.indexRebuild : s.indexBuild}</PillBtn>
        {mine ? <PillBtn disabled={running} onClick={() => void run('delta')}>{s.indexUpdate}</PillBtn> : null}
        {mine ? <PillBtn variant="danger" disabled={running} onClick={() => void clear()}>{s.indexClear}</PillBtn> : null}
      </div>
      <p style={{ margin: '12px 0 0', fontSize: type.body, lineHeight: 1.5, color: TOKENS.textMute }}>{s.homeHint}</p>
    </Card>
  )
}
