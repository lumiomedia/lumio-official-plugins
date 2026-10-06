import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPrefs } from '../../_shared/tracker-kit/prefs'
import type { SimklApi } from './api'
import { startBridge, type BridgeDeps } from './bridge'

type Listener = (m: never) => void

function setup(opts: { fail?: (path: string) => boolean; started?: string[]; watchedMovies?: string[] } = {}) {
  const listeners: Record<string, Listener> = {}
  const posts: Array<[string, unknown]> = []
  const call = vi.fn(async (_m: string, path: string, o?: { body?: unknown }) => {
    posts.push([path, o?.body])
    return opts.fail?.(path) ? { ok: false as const, status: 500, retryAfter: null, error: 'x' } : { ok: true as const, data: null }
  })
  const data: Record<string, string> = { simkl_sync_watched_enabled: '1', simkl_sync_watchlist_enabled: '1' }
  const deps: BridgeDeps = {
    subscribe: {
      onShow: (l) => { listeners.show = l as Listener; return () => {} },
      onMovie: (l) => { listeners.movie = l as Listener; return () => {} },
      onEpisodeWatched: (l) => { listeners.ep = l as Listener; return () => {} },
      onMovieWatched: (l) => { listeners.mw = l as Listener; return () => {} },
    },
    api: { call: call as unknown as SimklApi['call'], cdn: vi.fn(), pausedUntil: () => 0, hasAuth: () => true, remaining: () => null },
    prefs: createPrefs({ get: (k) => data[k] ?? null, set: (k, v) => { data[k] = v } }, () => {}, 'simkl'),
    isUserMutation: (s) => s === 'local',
    isShowStarted: (id) => (opts.started ?? []).includes(id),
    isMovieWatched: (id) => (opts.watchedMovies ?? []).includes(id),
    log: () => {},
    now: () => Date.now(),
    schedule: (fn, ms) => setTimeout(fn, ms),
    cancel: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
  }
  startBridge(deps)
  const fire = (name: string, m: unknown) => (listeners[name] as unknown as (x: unknown) => void)(m)
  return { fire, posts, call }
}

const entry = (tmdbId: string) => ({ tmdbId, imdbId: null, title: tmdbId, posterUrl: null })

describe('SIMKL-bryggan', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('följ: påbörjad serie blir watching, annars plantowatch; film plantowatch', async () => {
    const { fire, posts } = setup({ started: ['1'] })
    fire('show', { action: 'add', entry: entry('1'), source: 'local' })
    fire('show', { action: 'add', entry: entry('2'), source: 'local' })
    fire('movie', { action: 'add', entry: entry('603'), source: 'local' })
    await vi.advanceTimersByTimeAsync(3_000)
    expect(posts).toContainEqual(['/sync/add-to-list', { shows: [{ to: 'watching', ids: { tmdb: 1 } }] }])
    expect(posts).toContainEqual(['/sync/add-to-list', { shows: [{ to: 'plantowatch', ids: { tmdb: 2 } }] }])
    expect(posts).toContainEqual(['/sync/add-to-list', { movies: [{ to: 'plantowatch', ids: { tmdb: 603 } }] }])
  })

  it('sluta följa: serie blir dropped, osedd film tas bort, sedd film blir completed', async () => {
    const { fire, posts } = setup({ watchedMovies: ['604'] })
    fire('show', { action: 'remove', entry: entry('1'), source: 'local' })
    fire('movie', { action: 'remove', entry: entry('603'), source: 'local' })
    fire('movie', { action: 'remove', entry: entry('604'), source: 'local' })
    await vi.advanceTimersByTimeAsync(3_000)
    expect(posts).toContainEqual(['/sync/add-to-list', { shows: [{ to: 'dropped', ids: { tmdb: 1 } }] }])
    expect(posts).toContainEqual(['/sync/history/remove', { movies: [{ ids: { tmdb: 603 } }] }])
    expect(posts).toContainEqual(['/sync/add-to-list', { movies: [{ to: 'completed', ids: { tmdb: 604 } }] }])
  })

  it('sedda och avmarkerade avsnitt går till history respektive history/remove', async () => {
    const { fire, posts } = setup()
    fire('ep', { tmdbId: '1399', season: 1, episode: 1, watched: true, source: 'local', watchedAt: 'T' })
    fire('ep', { tmdbId: '1399', season: 1, episode: 2, watched: false, source: 'local', watchedAt: 'T' })
    await vi.advanceTimersByTimeAsync(3_000)
    expect(posts.map(([p]) => p).sort()).toEqual(['/sync/history', '/sync/history/remove'])
  })

  it('ta bort och ångra inom 3 s skickar bara det sista', async () => {
    const { fire, posts } = setup()
    fire('movie', { action: 'remove', entry: entry('603'), source: 'local' })
    fire('movie', { action: 'add', entry: entry('603'), source: 'local' })
    await vi.advanceTimersByTimeAsync(3_000)
    expect(posts).toEqual([['/sync/add-to-list', { movies: [{ to: 'plantowatch', ids: { tmdb: 603 } }] }]])
  })

  it('en avmarkering som inte nådde fram försöks igen', async () => {
    let fail = true
    const { fire, call } = setup({ fail: (p) => fail && p === '/sync/history/remove' })
    fire('ep', { tmdbId: '1399', season: 1, episode: 1, watched: false, source: 'local', watchedAt: 'T' })
    await vi.advanceTimersByTimeAsync(3_000)
    fail = false
    await vi.advanceTimersByTimeAsync(60_000)
    expect(call).toHaveBeenCalledTimes(2)
  })

  it('trakt- och tracker-ändringar ignoreras', async () => {
    const { fire, call } = setup()
    fire('movie', { action: 'add', entry: entry('603'), source: 'trakt' })
    fire('mw', { action: 'add', entry: { tmdbId: '603', watchedAt: 'T' }, source: 'tracker', entries: [] })
    await vi.advanceTimersByTimeAsync(3_000)
    expect(call).not.toHaveBeenCalled()
  })
})
