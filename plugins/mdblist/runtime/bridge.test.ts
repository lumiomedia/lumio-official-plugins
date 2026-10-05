import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MdblistApi } from './api'
import { startBridge, type BridgeDeps } from './bridge'
import { createPrefs } from './prefs'

type Listener<T> = (m: T) => void

function setup() {
  const listeners: Record<string, Listener<any>> = {}
  const call = vi.fn(async () => ({ ok: true as const, data: null }))
  const data: Record<string, string> = { mdblist_sync_watched_enabled: '1', mdblist_sync_watchlist_enabled: '1' }
  const deps: BridgeDeps = {
    subscribe: {
      onShow: (l) => { listeners.show = l; return () => {} },
      onMovie: (l) => { listeners.movie = l; return () => {} },
      onEpisodeWatched: (l) => { listeners.ep = l; return () => {} },
      onMovieWatched: (l) => { listeners.mw = l; return () => {} },
    },
    api: { call: call as unknown as MdblistApi['call'], getAllPages: vi.fn(), pausedUntil: () => 0, hasAuth: () => true },
    prefs: createPrefs({ get: (k) => data[k] ?? null, set: (k, v) => { data[k] = v } }, () => {}),
    isUserMutation: (s) => s === 'local',
    log: () => {},
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
})
