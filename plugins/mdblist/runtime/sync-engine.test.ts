import { describe, expect, it, vi } from 'vitest'
import type { ApiResult, MdblistApi } from './api'
import { createPrefs } from './prefs'
import { runMdblistSync, SNAPSHOT_KEY, type SyncHost } from './sync-engine'
import type { LocalEntry, RemoteEntry } from './types'

/** Värdens riktiga merge, förenklad: union + keepLocal (räcker för motorns tester). */
function planner(local: LocalEntry[], remote: RemoteEntry[], snapshotIds: string[] | null, _rule: string, opts?: { keepLocal?: boolean }) {
  const l = new Map(local.map((e) => [e.tmdbId, e]))
  const r = new Map(remote.map((e) => [e.tmdbId, e]))
  const snap = new Set(snapshotIds ?? [])
  const plan = { pushAdds: [] as RemoteEntry[], pushRemoves: [] as RemoteEntry[], localAdds: [] as RemoteEntry[], localRemoveIds: [] as string[], nextIds: [] as string[] }
  for (const [id, e] of l) if (!r.has(id)) {
    if (snapshotIds && snap.has(id) && !opts?.keepLocal) plan.localRemoveIds.push(id)
    else plan.pushAdds.push({ tmdbId: id, imdbId: e.imdbId ?? null, title: e.title, posterUrl: null })
  }
  for (const [id, e] of r) if (!l.has(id)) {
    if (snapshotIds && snap.has(id)) plan.pushRemoves.push(e)
    else plan.localAdds.push(e)
  }
  const removed = new Set(plan.localRemoveIds)
  plan.nextIds = [...new Set([...l.keys(), ...r.keys()])].filter((id) => !removed.has(id) && !plan.pushRemoves.some((e) => e.tmdbId === id))
  return plan
}

function makeHost(over: Partial<SyncHost> = {}) {
  const store: Record<string, unknown> = {}
  const host: SyncHost = {
    getShows: () => [],
    getMovies: () => [],
    addShow: vi.fn(),
    removeShow: vi.fn(),
    addMovie: vi.fn(),
    removeMovie: vi.fn(),
    getWatchedEpisodes: () => [],
    getWatchedMovies: () => [],
    markEpisodeWatched: vi.fn(),
    markMovieWatched: vi.fn(),
    planWatchlistSync: planner,
    readJson: <T>(key: string) => (store[key] as T) ?? null,
    writeJson: (key: string, value: unknown) => { store[key] = value },
    waitForStartIdle: async () => {},
    log: () => {},
    now: () => 1_000_000_000,
    accountKey: () => 'acct-1',
    scopeId: () => 'p1',
    ...over,
  }
  return { host, store }
}

type Route = (method: string, path: string, opts?: { query?: Record<string, string | number>; body?: unknown }) => ApiResult<unknown>

function makeApi(route: Route) {
  const call = vi.fn(async (method: 'GET' | 'POST', path: string, opts?: { query?: Record<string, string | number>; body?: unknown }) => route(method, path, opts))
  const api: MdblistApi = {
    call: call as MdblistApi['call'],
    getAllPages: async (path, query) => {
      const result = route('GET', path, { query })
      if (!result.ok) return result
      const data = result.data
      return { ok: true, data: Array.isArray(data) ? { items: data } : (data as Record<string, unknown[]>) }
    },
    pausedUntil: () => 0,
    hasAuth: () => true,
  }
  return { api, call }
}

const prefsOn = (watched = true, watchlist = true) => {
  const data: Record<string, string> = {}
  if (watched) data.mdblist_sync_watched_enabled = '1'
  if (watchlist) data.mdblist_sync_watchlist_enabled = '1'
  return createPrefs({ get: (k) => data[k] ?? null, set: (k, v) => { data[k] = v } }, () => {})
}

const ok = (data: unknown): ApiResult<unknown> => ({ ok: true, data })

/** En giltig snapshot för kontot acct-1 med båda slagen synkade. */
const snap = (over: Record<string, unknown> = {}) => ({
  version: 2, accountKey: 'acct-1', shows: [], movies: [], activities: {},
  syncedKinds: { watched: true, watchlist: true }, watchedHash: '0:0', watchedPending: false,
  unconfirmed: {}, fullAt: 0, syncedAt: 1, ...over,
})

describe('synkmotorn', () => {
  it('avstår utan påslagna reglage', async () => {
    const { host } = makeHost()
    const { api, call } = makeApi(() => ok({}))
    const out = await runMdblistSync({ host, api, prefs: prefsOn(false, false) }, { pushWatched: false, reason: 'test' })
    expect(out).toEqual({ status: 'skipped', reason: 'inga reglage påslagna' })
    expect(call).not.toHaveBeenCalled()
  })

  it('oförändrade stämplar och inget lokalt → ett enda anrop', async () => {
    const { host, store } = makeHost()
    store[SNAPSHOT_KEY] = snap({ activities: { watched_at: 'A' }, fullAt: 1_000_000_000 })
    const { api, call } = makeApi((_m, p) => (p === '/sync/last_activities' ? ok({ watched_at: 'A', server_time: 'S' }) : ok({})))
    const out = await runMdblistSync({ host, api, prefs: prefsOn() }, { pushWatched: true, reason: 'test' })
    expect(out).toEqual({ status: 'unchanged' })
    expect(call).toHaveBeenCalledTimes(1)
  })

  it('hämtar watchlist, lägger till lokalt med tracker-källan och skickar lokala poster uppåt', async () => {
    const { host, store } = makeHost({ getMovies: () => [{ tmdbId: '603', imdbId: null, title: 'Matrix' }] })
    let remoteMovies = [{ id: 13, title: 'Forrest', mediatype: 'movie' }]
    const { api, call } = makeApi((m, p) => {
      if (p === '/sync/last_activities') return ok({ watchlisted_at: 'B' })
      if (m === 'GET' && p === '/watchlist/items') return ok({ items: remoteMovies })
      if (p === '/watchlist/items/add') { remoteMovies = [...remoteMovies, { id: 603, title: 'Matrix', mediatype: 'movie' }]; return ok({}) }
      if (p === '/sync/watched') return ok({ movies: [], episodes: [] })
      return ok({})
    })
    const out = await runMdblistSync({ host, api, prefs: prefsOn(false, true) }, { pushWatched: false, reason: 'test' })
    expect(out.status).toBe('done')
    expect(host.addMovie).toHaveBeenCalledWith(expect.objectContaining({ tmdbId: '13' }))
    expect(call).toHaveBeenCalledWith('POST', '/watchlist/items/add', { body: { movies: [{ tmdb: 603 }] } })
    expect((store[SNAPSHOT_KEY] as { movies: string[] }).movies.sort()).toEqual(['13', '603'])
  })

  it('tom fjärrlista bredvid stor snapshot raderar ingenting lokalt', async () => {
    const ids = Array.from({ length: 20 }, (_, i) => String(i + 1))
    const { host, store } = makeHost({ getShows: () => ids.map((id) => ({ tmdbId: id, imdbId: null, title: id })) })
    store[SNAPSHOT_KEY] = snap({ shows: ids, activities: { watchlisted_at: 'old' } })
    const { api, call } = makeApi((m, p) => {
      if (p === '/sync/last_activities') return ok({ watchlisted_at: 'C' })
      if (m === 'GET' && p === '/watchlist/items') return ok({ items: [] })
      return ok({})
    })
    await runMdblistSync({ host, api, prefs: prefsOn(false, true) }, { pushWatched: false, reason: 'test' })
    expect(host.removeShow).not.toHaveBeenCalled()
    expect(call).not.toHaveBeenCalledWith('POST', '/watchlist/items/remove', expect.anything())
  })

  it('sedda: hämtning markerar lokalt; push bara när pushWatched, med lokal tid och tak 100', async () => {
    const local = Array.from({ length: 130 }, (_, i) => ({ tmdbId: '1399', season: 1, episode: i + 1, watchedAt: `T${i}` }))
    const { host, store } = makeHost({ getWatchedEpisodes: () => local })
    const { api, call } = makeApi((m, p) => {
      if (p === '/sync/last_activities') return ok({ watched_at: 'D' })
      if (m === 'GET' && p === '/sync/watched') return ok({ movies: [{ movie: { ids: { tmdb: 603 } }, last_watched_at: 'R1' }], episodes: [] })
      return ok({})
    })
    await runMdblistSync({ host, api, prefs: prefsOn(true, false) }, { pushWatched: false, reason: 'start' })
    expect(host.markMovieWatched).toHaveBeenCalledWith({ tmdbId: '603', imdbId: null, watchedAt: 'R1' })
    expect(call).not.toHaveBeenCalledWith('POST', '/sync/watched', expect.anything())

    call.mockClear()
    // Annars är allt "oförändrat" sedan förra körningen och grinden stoppar den.
    delete store[SNAPSHOT_KEY]
    await runMdblistSync({ host, api, prefs: prefsOn(true, false) }, { pushWatched: true, reason: 'interval' })
    const pushes = call.mock.calls.filter(([m, p]) => m === 'POST' && p === '/sync/watched')
    const sent = pushes.flatMap(([, , o]) => ((o as { body: { shows: Array<{ seasons: Array<{ episodes: unknown[] }> }> } }).body.shows
      .flatMap((s) => s.seasons.flatMap((x) => x.episodes))))
    expect(sent).toHaveLength(100)
    expect(sent[0]).toEqual({ number: 1, watched_at: 'T0' })
  })

  it('429 mitt i körningen: snapshoten rörs inte', async () => {
    const { host, store } = makeHost()
    store[SNAPSHOT_KEY] = snap({ shows: ['1'], activities: { watchlisted_at: 'old' } })
    const before = JSON.stringify(store[SNAPSHOT_KEY])
    const { api } = makeApi((_m, p) => {
      if (p === '/sync/last_activities') return ok({ watchlisted_at: 'new' })
      return { ok: false, status: 429, retryAfter: 30, error: 'rate limited' }
    })
    const out = await runMdblistSync({ host, api, prefs: prefsOn(false, true) }, { pushWatched: false, reason: 'test' })
    expect(out.status).toBe('failed')
    expect(JSON.stringify(store[SNAPSHOT_KEY])).toBe(before)
  })

  it('fel nyckel rapporteras som authFailed', async () => {
    const { host } = makeHost()
    const { api } = makeApi(() => ({ ok: false, status: 401, retryAfter: null, error: 'mdblist 401' }))
    const out = await runMdblistSync({ host, api, prefs: prefsOn() }, { pushWatched: false, reason: 'test' })
    expect(out).toEqual({ status: 'failed', error: 'mdblist 401', authFailed: true })
  })
})

describe('synkmotorn efter granskningen', () => {
  it('C1: en snapshot från ett annat konto raderar inget lokalt', async () => {
    const { host, store } = makeHost({ getMovies: () => [{ tmdbId: '603', imdbId: null, title: 'M' }] })
    store[SNAPSHOT_KEY] = snap({ accountKey: 'other', movies: ['603'], fullAt: 1_000_000_000 })
    const { api } = makeApi((m, p) => {
      if (p === '/sync/last_activities') return ok({ watchlisted_at: 'X' })
      if (m === 'GET' && p === '/watchlist/items') return ok({ items: [{ id: 13, title: 'F', mediatype: 'movie' }] })
      return ok({})
    })
    await runMdblistSync({ host, api, prefs: prefsOn(false, true) }, { pushWatched: false, reason: 'test' })
    expect(host.removeMovie).not.toHaveBeenCalled()
  })

  it('C2: en hämtningskörning döljer inte osända sedda för nästa intervallkörning', async () => {
    const local = [{ tmdbId: '1399', season: 1, episode: 1, watchedAt: 'T0' }]
    const { host } = makeHost({ getWatchedEpisodes: () => local })
    const { api, call } = makeApi((m, p) => {
      if (p === '/sync/last_activities') return ok({ watched_at: 'D' })
      if (m === 'GET' && p === '/sync/watched') return ok({ movies: [], episodes: [] })
      return ok({})
    })
    await runMdblistSync({ host, api, prefs: prefsOn(true, false) }, { pushWatched: false, reason: 'start' })
    expect(call).not.toHaveBeenCalledWith('POST', '/sync/watched', expect.anything())
    await runMdblistSync({ host, api, prefs: prefsOn(true, false) }, { pushWatched: true, reason: 'intervall' })
    expect(call).toHaveBeenCalledWith('POST', '/sync/watched', expect.anything())
  })

  it('I1: profilbyte mitt i körningen — inga lokala skrivningar, ingen snapshot', async () => {
    let scope = 'p1'
    const { host, store } = makeHost({ scopeId: () => scope })
    const { api } = makeApi((m, p) => {
      if (p === '/sync/last_activities') return ok({ watchlisted_at: 'X' })
      if (m === 'GET' && p === '/watchlist/items') { scope = 'p2'; return ok({ items: [{ id: 13, title: 'F', mediatype: 'movie' }] }) }
      return ok({})
    })
    const out = await runMdblistSync({ host, api, prefs: prefsOn(false, true) }, { pushWatched: false, reason: 'test' })
    expect(out).toEqual({ status: 'skipped', reason: 'profilbyte' })
    expect(host.addMovie).not.toHaveBeenCalled()
    expect(store[SNAPSHOT_KEY]).toBeUndefined()
  })

  it('I2: ett nytt reglage hämtar trots oförändrade stämplar', async () => {
    const { host, store } = makeHost()
    store[SNAPSHOT_KEY] = snap({ activities: { watchlisted_at: 'A' }, syncedKinds: { watched: true, watchlist: false }, fullAt: 1_000_000_000 })
    const { api } = makeApi((m, p) => {
      if (p === '/sync/last_activities') return ok({ watchlisted_at: 'A' })
      if (m === 'GET' && p === '/watchlist/items') return ok({ items: [{ id: 13, title: 'F', mediatype: 'movie' }] })
      return ok({ movies: [], episodes: [] })
    })
    await runMdblistSync({ host, api, prefs: prefsOn(true, true) }, { pushWatched: false, reason: 'reglage' })
    expect(host.addMovie).toHaveBeenCalledWith(expect.objectContaining({ tmdbId: '13' }))
  })

  it('I5: hämtningen markerar bara det som saknas, och skriver aldrig över en tid', async () => {
    const { host } = makeHost({ getWatchedEpisodes: () => [{ tmdbId: '1399', season: 1, episode: 1, watchedAt: 'LOCAL' }] })
    const { api } = makeApi((m, p) => {
      if (p === '/sync/last_activities') return ok({ watched_at: 'D' })
      if (m === 'GET' && p === '/sync/watched') return ok({ movies: [], episodes: [
        { episode: { show: { ids: { tmdb: 1399 } }, season: 1, number: 1 }, watched_at: 'REMOTE' },
        { episode: { show: { ids: { tmdb: 1399 } }, season: 1, number: 2 }, watched_at: 'R2' },
      ] })
      return ok({})
    })
    await runMdblistSync({ host, api, prefs: prefsOn(true, false) }, { pushWatched: false, reason: 'test' })
    expect(host.markEpisodeWatched).toHaveBeenCalledTimes(1)
    expect(host.markEpisodeWatched).toHaveBeenCalledWith('1399', 1, 2, 'R2')
  })

  it('I8: utan lokal tid skickas inget, och obekräftade ger upp efter två försök', async () => {
    const { host, store } = makeHost({ getWatchedMovies: () => [
      { tmdbId: '1', watchedAt: '' as unknown as string },
      { tmdbId: '2', watchedAt: 'T2' },
    ] })
    const { api, call } = makeApi((m, p) => {
      if (p === '/sync/last_activities') return ok({ watched_at: String(Math.random()) })
      if (m === 'GET' && p === '/sync/watched') return ok({ movies: [], episodes: [] })
      return ok({})
    })
    const run = () => runMdblistSync({ host, api, prefs: prefsOn(true, false) }, { pushWatched: true, reason: 'intervall' })
    await run()
    const first = call.mock.calls.filter(([m, p]) => m === 'POST' && p === '/sync/watched')
    expect(JSON.stringify(first[0][2])).not.toContain('"tmdb":1,')
    await run()
    call.mockClear()
    await run()
    expect(call).not.toHaveBeenCalledWith('POST', '/sync/watched', expect.anything())
    expect((store[SNAPSHOT_KEY] as { unconfirmed: Record<string, { attempts: number }> }).unconfirmed['m:tmdb:2'].attempts).toBe(2)
  })

  it('Minor 1: våra egna pausscrobbles (paused_at) startar ingen körning', async () => {
    const { host, store } = makeHost()
    store[SNAPSHOT_KEY] = snap({ activities: { watched_at: 'A', watchlisted_at: 'B' }, fullAt: 1_000_000_000 })
    const { api, call } = makeApi((_m, p) => p === '/sync/last_activities'
      ? ok({ watched_at: 'A', watchlisted_at: 'B', paused_at: 'NY', episode_paused_at: 'NY' })
      : ok({}))
    expect(await runMdblistSync({ host, api, prefs: prefsOn() }, { pushWatched: true, reason: 'test' })).toEqual({ status: 'unchanged' })
    expect(call).toHaveBeenCalledTimes(1)
  })

  it('Minor 2: utan push läses watchlisten en gång', async () => {
    const { host } = makeHost()
    let reads = 0
    const { api } = makeApi((m, p) => {
      if (p === '/sync/last_activities') return ok({ watchlisted_at: 'X' })
      if (m === 'GET' && p === '/watchlist/items') { reads += 1; return ok({ items: [] }) }
      return ok({})
    })
    await runMdblistSync({ host, api, prefs: prefsOn(false, true) }, { pushWatched: false, reason: 'test' })
    expect(reads).toBe(1)
  })
})
