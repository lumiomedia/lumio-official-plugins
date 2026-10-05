// runtime/host.ts — den ENDA modulen (utöver UI och index) som rör SDK:n.
// Allt annat i pluginet tar sina beroenden som parametrar och testas utan värd.
import {
  addToMovieWatchlist, addToWatchlist, getActiveProfileId, getMdblistApiKey, getMovieWatchlist,
  getScopedStorageItem, getTraktAuth, getWatchedEpisodes, getWatchedMovies, getWatchlist,
  isUserMutation, onMovieWatchlistMutation, onProfileChanged, onRatingSourcesChanged,
  onWatchedEpisodeMutation, onWatchedMovieMutation, onWatchlistMutation, planWatchlistSync,
  removeFromMovieWatchlist, removeFromWatchlist, removeScopedStorageItem, setMovieWatched,
  setScopedStorageItem, setWatched, waitForStartIdle,
} from '@/lib/plugin-sdk'
import { createMdblistApi, type ApiAuth } from './api'
import { startBridge } from './bridge'
import { createDeviceAuth, type OauthToken } from './device-auth'
import { createListSource } from './list-source'
import { parseUser } from './parse'
import { createPrefs, type PrefKind } from './prefs'
import { startScheduler } from './scheduler'
import { createStatus } from './status'
import { runMdblistSync, SNAPSHOT_KEY, type SyncHost } from './sync-engine'
import { createScrobbler } from './tracker'

/** Lumio som "Device Code App" på mdblist.com/developer. Publikt id, ingen hemlighet. */
export const MDBLIST_CLIENT_ID = 'COMQozk02g5TQOKSNLV3Xwccb675R0c1SycYHM0j'

const PREFS_EVENT = 'lumio-mdblist-prefs-changed'
const AUTH_EVENT = 'lumio-mdblist-auth-changed'
const TOKEN_KEY = 'mdblist_oauth'
const LAST_SYNC_KEY = 'mdblist_last_sync'

export function log(message: string): void {
  void fetch(`/api/debug-log?msg=${encodeURIComponent(`[mdblist] ${message}`)}`).catch(() => {})
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
)
export const onPrefsChanged = (listener: () => void) => listen(PREFS_EVENT, listener)

/** Ny token, frånkoppling eller ändrad API-nyckel — allt som byter vem vi är hos MDBList. */
export const onAuthChanged = (listener: () => void) => {
  const offs = [listen(AUTH_EVENT, listener), onRatingSourcesChanged(listener)]
  return () => { for (const off of offs) off() }
}

export const prefsSnapshot = (): Record<PrefKind, boolean> => ({
  scrobble: prefs.isOn('scrobble'), watched: prefs.isOn('watched'), watchlist: prefs.isOn('watchlist'),
})

const lastSync = readJson<{ at: number; changes: number }>(LAST_SYNC_KEY)
export const status = createStatus(lastSync ? { lastSyncAt: lastSync.at, lastChanges: lastSync.changes } : {})

async function oauth(endpoint: 'device-authorization' | 'token' | 'revoke_token', form: Record<string, string>) {
  try {
    const response = await fetch('/api/plugins/mdblist/oauth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, form }),
    })
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
    return { status: response.status, data }
  } catch {
    return { status: 0, data: {} }
  }
}

export const device = createDeviceAuth({
  oauth,
  readToken: () => readJson<OauthToken>(TOKEN_KEY),
  writeToken: (token) => {
    if (token) writeJson(TOKEN_KEY, token)
    else removeScopedStorageItem(TOKEN_KEY)
    emit(AUTH_EVENT)
  },
  now: () => Date.now(),
  schedule: (fn, ms) => window.setTimeout(fn, ms),
  cancel: (handle) => window.clearTimeout(handle as number),
  clientId: MDBLIST_CLIENT_ID,
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

export const hasApiKey = () => getMdblistApiKey().trim().length > 0
export const hasAuth = () => device.hasToken() || hasApiKey()

export const api = createMdblistApi({
  fetchImpl: (...args) => fetch(...args),
  getAuth: async (): Promise<ApiAuth | null> => {
    const token = await device.getAccessToken()
    if (token) return { accessToken: token }
    const key = getMdblistApiKey().trim()
    return key ? { apikey: key } : null
  },
  hasAuth,
  now: () => Date.now(),
  log,
  onPause: (until) => status.set({ pausedUntil: until }),
})

export const scrobbler = createScrobbler({ api, prefs, now: () => Date.now(), log })
export const listSource = createListSource({ api, readJson, writeJson, now: () => Date.now(), log })
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
  const result = await api.call('GET', '/user')
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

export async function syncNow(opts: { pushWatched: boolean; reason: string }): Promise<void> {
  status.set({ syncing: true })
  const out = await runMdblistSync({ host: syncHost, api, prefs }, opts)
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
