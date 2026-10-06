// runtime/host.ts — den ENDA modulen (utöver UI och index) som rör SDK:n.
// Allt annat i pluginet tar sina beroenden som parametrar och testas utan värd.
import {
  addToMovieWatchlist, addToWatchlist, getActiveProfileId, getMovieWatchlist,
  getScopedStorageItem, getTraktAuth, getWatchedEpisodes, getWatchedMovies, getWatchlist,
  isUserMutation, onMovieWatchlistMutation, onProfileChanged, readStoredLang,
  onWatchedEpisodeMutation, onWatchedMovieMutation, onWatchlistMutation, planWatchlistSync,
  removeFromMovieWatchlist, removeFromWatchlist, removeScopedStorageItem, setMovieWatched,
  setScopedStorageItem, setWatched, waitForStartIdle,
} from '@/lib/plugin-sdk'
import { createSimklApi } from './api'
import { startBridge } from './bridge'
import { createDeviceAuth, type OauthToken } from '../../_shared/tracker-kit/device-auth'
import { createListSource } from './list-source'
import { parseUser } from './parse'
import { createPrefs, type PrefKind } from '../../_shared/tracker-kit/prefs'
import { startScheduler } from '../../_shared/tracker-kit/scheduler'
import { createStatus } from '../../_shared/tracker-kit/status'
import { runSimklSync, SNAPSHOT_KEY, type SyncHost } from './sync-engine'
import { S } from './strings'
import { createScrobbler } from './tracker'

/** Lumio som AUTH V2-app ("TV, devices & command line") på simkl.com. Publikt id, ingen hemlighet. */
export const SIMKL_CLIENT_ID = 'b28530cfc06b97379bfc3c00ac4560354052567e6713ccc3db70fca8a8573e40'
const PLUGIN_VERSION = '0.1.0'
const API = 'https://api.simkl.com'

const PREFS_EVENT = 'lumio-simkl-prefs-changed'
const AUTH_EVENT = 'lumio-simkl-auth-changed'
const TOKEN_KEY = 'simkl_oauth'
const LAST_SYNC_KEY = 'simkl_last_sync'

export function log(message: string): void {
  void fetch(`/api/debug-log?msg=${encodeURIComponent(`[simkl] ${message}`)}`).catch(() => {})
}

const readJson = <T,>(key: string): T | null => {
  try {
    const raw = getScopedStorageItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
const writeJson = (key: string, value: unknown) => setScopedStorageItem(key, JSON.stringify(value))

const emit = (name: string) => window.dispatchEvent(new CustomEvent(name))
const listen = (name: string, listener: () => void) => {
  window.addEventListener(name, listener)
  return () => window.removeEventListener(name, listener)
}

export const prefs = createPrefs(
  { get: (k) => getScopedStorageItem(k), set: (k, v) => setScopedStorageItem(k, v) },
  () => emit(PREFS_EVENT),
  'simkl',
)
export const onPrefsChanged = (listener: () => void) => listen(PREFS_EVENT, listener)

/** Ny token eller frånkoppling — det som byter vem vi är hos MDBList. */
export const onAuthChanged = (listener: () => void) => listen(AUTH_EVENT, listener)

export const prefsSnapshot = (): Record<PrefKind, boolean> => ({
  scrobble: prefs.isOn('scrobble'), watched: prefs.isOn('watched'), watchlist: prefs.isOn('watchlist'),
})

const lastSync = readJson<{ at: number; changes: number }>(LAST_SYNC_KEY)
export const status = createStatus(lastSync ? { lastSyncAt: lastSync.at, lastChanges: lastSync.changes } : {})

/** SIMKL:s OAuth-anrop som formulär, direkt — SIMKL skickar CORS `*` även på /oauth2. */
async function oauth(path: '/oauth2/device' | '/oauth2/token' | '/oauth2/revoke', form: Record<string, string>) {
  try {
    const response = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(form).toString(),
    })
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
    return { status: response.status, data }
  } catch {
    return { status: 0, data: {} }
  }
}

export const device = createDeviceAuth({
  transport: {
    device: (form) => oauth('/oauth2/device', form),
    token: (form) => oauth('/oauth2/token', form),
    revoke: (form) => oauth('/oauth2/revoke', form),
  },
  scope: 'media:read media:write',
  // SIMKL nedgraderar okända scope tyst till läsning — utan media:write kan
  // inget skickas, och användaren ska få veta det direkt.
  acceptToken: (data) => {
    const scope = typeof data.scope === 'string' ? data.scope : ''
    return !scope || scope.includes('media:write') ? null : S.readOnly[readStoredLang()]
  },
  readToken: () => readJson<OauthToken>(TOKEN_KEY),
  writeToken: (token) => {
    if (token) writeJson(TOKEN_KEY, token)
    else removeScopedStorageItem(TOKEN_KEY)
    emit(AUTH_EVENT)
  },
  now: () => Date.now(),
  schedule: (fn, ms) => window.setTimeout(fn, ms),
  cancel: (handle) => window.clearTimeout(handle as number),
  clientId: SIMKL_CLIENT_ID,
  log,
  onConnected: () => checkConnection(),
  scopeId: () => getActiveProfileId(),
})

/** Koppla från: återkalla token och glöm snapshoten — nästa konto börjar om som första synk. */
export async function disconnect(): Promise<void> {
  await device.disconnect()
  removeScopedStorageItem(SNAPSHOT_KEY)
  await checkConnection()
}

/** Bara inloggningen — SIMKL har ingen nyckel. Varje enhet loggar in för sig. */
export const hasAuth = () => device.hasToken()

export const api = createSimklApi({
  fetchImpl: (...args) => fetch(...args),
  getToken: () => device.getAccessToken(),
  hasToken: () => device.hasToken(),
  clientId: SIMKL_CLIENT_ID,
  appVersion: PLUGIN_VERSION,
  now: () => Date.now(),
  log,
  onPause: (until) => status.set({ pausedUntil: until }),
})

export const scrobbler = createScrobbler({ api, prefs, log })
export const listSource = createListSource({ api, readJson, writeJson, now: () => Date.now(), log, lang: () => readStoredLang() })
export const isTraktConnected = () => Boolean(getTraktAuth())

const syncHost: SyncHost = {
  getShows: () => getWatchlist(),
  getMovies: () => getMovieWatchlist(),
  addShow: (e) => addToWatchlist(e, { source: 'tracker' }),
  removeShow: (id) => removeFromWatchlist(id, { source: 'tracker' }),
  addMovie: (e) => addToMovieWatchlist({ ...e, monitorForStreams: false }, { source: 'tracker' }),
  removeMovie: (id) => removeFromMovieWatchlist(id, { source: 'tracker' }),
  getWatchedEpisodes: () => getWatchedEpisodes(),
  getWatchedMovies: () => getWatchedMovies(),
  markEpisodeWatched: (tmdbId, season, episode, watchedAt) =>
    setWatched(tmdbId, season, episode, true, { source: 'tracker', watchedAt: watchedAt ?? undefined }),
  markMovieWatched: (m) =>
    setMovieWatched({ tmdbId: m.tmdbId ?? undefined, imdbId: m.imdbId ?? undefined }, true, { source: 'tracker', watchedAt: m.watchedAt ?? undefined }),
  planWatchlistSync: (local, remote, snap, rule, opts) => planWatchlistSync(local, remote, snap, rule, opts),
  readJson,
  writeJson,
  waitForStartIdle: () => waitForStartIdle(),
  log,
  now: () => Date.now(),
  accountKey: () => status.get().accountKey,
  scopeId: () => getActiveProfileId(),
}

/** Vem är vi hos MDBList? `GET /user` — också beviset att nyckeln eller token gäller. */
export async function checkConnection(): Promise<void> {
  if (!hasAuth()) { status.set({ connection: 'none', username: null, supporter: false, accountKey: null }); return }
  const scope = getActiveProfileId()
  const previous = status.get().connection
  if (previous === 'none' || previous === 'bad-key') status.set({ connection: 'checking' })
  const result = await api.call('GET', '/users/settings')
  if (getActiveProfileId() !== scope) return
  if (result.ok) {
    const user = parseUser(result.data)
    status.set({ connection: 'ok', username: user.username, supporter: user.supporter, accountKey: user.accountKey })
  } else if (result.status === 401) {
    status.set({ connection: 'bad-key', username: null, supporter: false, accountKey: null })
  } else if (result.status === 429) {
    // En paus är inte ett avbrott: anslutningen står kvar, pausen visas.
    status.set({ connection: previous === 'checking' ? 'ok' : previous, pausedUntil: api.pausedUntil() })
  } else {
    status.set({ connection: 'offline' })
  }
}

export async function syncNow(opts: { pushWatched: boolean; reason: string; full?: boolean }): Promise<void> {
  status.set({ syncing: true })
  const out = await runSimklSync({ host: syncHost, api, prefs }, opts)
  const patch: Parameters<typeof status.set>[0] = { syncing: false, pausedUntil: api.pausedUntil() }
  if (out.status === 'done' || out.status === 'unchanged') {
    patch.lastSyncAt = Date.now()
    patch.lastChanges = out.status === 'done' ? out.changes : 0
    writeJson(LAST_SYNC_KEY, { at: patch.lastSyncAt, changes: patch.lastChanges })
  }
  if (out.status === 'failed' && out.authFailed) patch.connection = 'bad-key'
  status.set(patch)
}

/**
 * Sekundtick medan en enhetskod väntar — nedräkningen på skrivbordet och i
 * TV-raderna. Bara då; annars ritas ingenting om i onödan.
 */
const tickListeners = new Set<() => void>()
let ticker: number | null = null
device.subscribe(() => {
  const waiting = device.state().phase === 'waiting'
  if (waiting && ticker == null) {
    ticker = window.setInterval(() => { for (const l of tickListeners) l() }, 1000)
  } else if (!waiting && ticker != null) {
    window.clearInterval(ticker)
    ticker = null
  }
})
export const onTick = (listener: () => void) => {
  tickListeners.add(listener)
  return () => { tickListeners.delete(listener) }
}

/** Allt som ska leva medan appen är igång — monteras av bootstrap-komponenten. */
export function startBackground(): () => void {
  void checkConnection()
  const offAuthCheck = onAuthChanged(() => { void checkConnection() })
  const offProfileCheck = onProfileChanged(() => {
    // En väntande enhetskod och bryggans kö hör till den gamla profilen.
    device.cancel()
    status.set({ connection: 'none', username: null, supporter: false, accountKey: null })
    restartBridge()
    void checkConnection()
  })
  const stopScheduler = startScheduler({
    run: (opts) => syncNow(opts),
    onKeyChanged: (l) => onAuthChanged(l),
    onPrefsChanged: (l) => onPrefsChanged(l),
    onProfileChanged: (l) => onProfileChanged(l),
  })
  const makeBridge = () => startBridge({
    subscribe: {
      onShow: (l) => onWatchlistMutation(l),
      onMovie: (l) => onMovieWatchlistMutation(l),
      onEpisodeWatched: (l) => onWatchedEpisodeMutation(l),
      onMovieWatched: (l) => onWatchedMovieMutation(l),
    },
    api, prefs, isUserMutation, log,
    isShowStarted: (tmdbId) => getWatchedEpisodes().some((e) => e.tmdbId === tmdbId),
    isMovieWatched: (tmdbId) => getWatchedMovies().some((m) => m.tmdbId === tmdbId),
    now: () => Date.now(),
    schedule: (fn, ms) => window.setTimeout(fn, ms),
    cancel: (h) => window.clearTimeout(h as number),
  })
  let stopBridge = makeBridge()
  function restartBridge() {
    stopBridge()
    stopBridge = makeBridge()
  }
  return () => {
    offAuthCheck()
    offProfileCheck()
    stopScheduler()
    stopBridge()
    // Avstängt plugin: en väntande enhetskod får inte spara en token efteråt.
    device.cancel()
  }
}
