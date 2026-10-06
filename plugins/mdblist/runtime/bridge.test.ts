import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MdblistApi } from './api'
import { startBridge, type BridgeDeps } from './bridge'
import { createPrefs } from '../../_shared/tracker-kit/prefs'

type Listener<T> = (m: T) => void

function setup(callImpl?: (path: string) => { ok: boolean }) {
  const listeners: Record<string, Listener<any>> = {}
  const call = vi.fn(async (_m: string, path: string) => (callImpl ? callImpl(path) : { ok: true as const, data: null }))
  const data: Record<string, string> = { mdblist_sync_watched_enabled: '1', mdblist_sync_watchlist_enabled: '1' }
  const deps: BridgeDeps = {
    subscribe: {
      onShow: (l) => { listeners.show = l; return () => {} },
      onMovie: (l) => { listeners.movie = l; return () => {} },
      onEpisodeWatched: (l) => { listeners.ep = l; return () => {} },
      onMovieWatched: (l) => { listeners.mw = l; return () => {} },
    },
    api: { call: call as unknown as MdblistApi['call'], getAllPages: vi.fn(), pausedUntil: () => 0, hasAuth: () => true },
    prefs: createPrefs({ get: (k) => data[k] ?? null, set: (k, v) => { data[k] = v } }, () => {}, 'mdblist'),
    isUserMutation: (s) => s === 'local',
    log: () => {},
    now: () => Date.now(),
    schedule: (fn, ms) => setTimeout(fn, ms),
    cancel: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
  }
  const stop = startBridge(deps)
  return { listeners, call, stop, data }
}

describe('realtidsbryggan', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('batchar lokala ändringar i 3 s och skickar en gång per slag', async () => {
    const { listeners, call } = setup()
    listeners.show({ action: 'add', entry: { tmdbId: '1399', imdbId: null, title: 'GoT', posterUrl: null }, source: 'local' })
    listeners.show({ action: 'add', entry: { tmdbId: '1400', imdbId: null, title: 'X', posterUrl: null }, source: 'local' })
    listeners.ep({ tmdbId: '1399', season: 1, episode: 1, watched: true, source: 'local', watchedAt: 'T' })
    expect(call).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(3_000)
    expect(call).toHaveBeenCalledWith('POST', '/watchlist/items/add', { body: { shows: [{ tmdb: 1399 }, { tmdb: 1400 }] } })
    expect(call).toHaveBeenCalledWith('POST', '/sync/watched', { body: { movies: [], shows: [{ ids: { tmdb: 1399 }, seasons: [{ number: 1, episodes: [{ number: 1, watched_at: 'T' }] }] }] } })
  })

  it('ignorerar trakt- och tracker-ändringar (ingen eko-loop)', async () => {
    const { listeners, call } = setup()
    listeners.movie({ action: 'add', entry: { tmdbId: '603', imdbId: null, title: 'M', posterUrl: null }, source: 'trakt' })
    listeners.mw({ action: 'add', entry: { tmdbId: '603', watchedAt: 'T' }, source: 'tracker', entries: [] })
    await vi.advanceTimersByTimeAsync(3_000)
    expect(call).not.toHaveBeenCalled()
  })

  it('avmarkering går till /sync/watched/remove', async () => {
    const { listeners, call } = setup()
    listeners.mw({ action: 'remove', entry: { tmdbId: '603', imdbId: null, watchedAt: 'T' }, source: 'local', entries: [] })
    await vi.advanceTimersByTimeAsync(3_000)
    expect(call).toHaveBeenCalledWith('POST', '/sync/watched/remove', { body: { movies: [{ ids: { tmdb: 603 }, watched_at: 'T' }], shows: [] } })
  })

  it('respekterar reglagen', async () => {
    const { listeners, call, data } = setup()
    data.mdblist_sync_watchlist_enabled = '0'
    listeners.show({ action: 'remove', entry: { tmdbId: '1399', imdbId: null, title: 'GoT', posterUrl: null }, source: 'local' })
    await vi.advanceTimersByTimeAsync(3_000)
    expect(call).not.toHaveBeenCalled()
  })

  it('I3: ta bort och ångra inom 3 s — bara den sista ändringen skickas', async () => {
    const { listeners, call } = setup()
    const entry = { tmdbId: '603', imdbId: null, title: 'M', posterUrl: null }
    listeners.movie({ action: 'remove', entry, source: 'local' })
    listeners.movie({ action: 'add', entry, source: 'local' })
    await vi.advanceTimersByTimeAsync(3_000)
    expect(call).toHaveBeenCalledTimes(1)
    expect(call).toHaveBeenCalledWith('POST', '/watchlist/items/add', { body: { movies: [{ tmdb: 603 }] } })
  })

  it('I4: en avmarkering som inte nådde fram försöks igen', async () => {
    let fail = true
    const { listeners, call } = setup((path) => ({ ok: !(fail && path === '/sync/watched/remove') }))
    listeners.ep({ tmdbId: '1399', season: 1, episode: 1, watched: false, source: 'local', watchedAt: 'T' })
    await vi.advanceTimersByTimeAsync(3_000)
    expect(call).toHaveBeenCalledTimes(1)
    fail = false
    await vi.advanceTimersByTimeAsync(60_000)
    expect(call).toHaveBeenCalledTimes(2)
    expect(call).toHaveBeenLastCalledWith('POST', '/sync/watched/remove', expect.anything())
  })
})
