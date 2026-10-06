import { describe, expect, it, vi } from 'vitest'
import { createPrefs } from '../../_shared/tracker-kit/prefs'
import type { ApiResult, SimklApi } from './api'
import { runSimklSync, SNAPSHOT_KEY, type SyncHost } from './sync-engine'
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

type Route = (method: string, path: string, query?: Record<string, string | number>, body?: unknown) => ApiResult<unknown>

function makeApi(route: Route, remaining: number | null = null) {
  const call = vi.fn(async (method: 'GET' | 'POST', path: string, opts?: { query?: Record<string, string | number>; body?: unknown }) =>
    route(method, path, opts?.query, opts?.body))
  const api: SimklApi = {
    call: call as unknown as SimklApi['call'],
    cdn: vi.fn() as unknown as SimklApi['cdn'],
    pausedUntil: () => 0,
    hasAuth: () => true,
    remaining: () => remaining,
  }
  return { api, call }
}

const prefsOn = (watched = true, watchlist = true) => {
  const data: Record<string, string> = {}
  if (watched) data.simkl_sync_watched_enabled = '1'
  if (watchlist) data.simkl_sync_watchlist_enabled = '1'
  return createPrefs({ get: (k) => data[k] ?? null, set: (k, v) => { data[k] = v } }, () => {}, 'simkl')
}

const ok = (data: unknown): ApiResult<unknown> => ({ ok: true, data })
const NOW = 1_000_000_000
const snap = (over: Record<string, unknown> = {}) => ({
  version: 2, accountKey: 'acct-1', shows: [], movies: [], all: 'A0', buckets: {}, remote: {},
  syncedKinds: { watched: true, watchlist: true }, watchedHash: '0:0', watchedPending: false,
  unconfirmed: {}, fullAt: NOW, syncedAt: 1, ...over,
})
const show = (tmdb: string, status: string, seasons: unknown[] = []) => ({ status, show: { title: tmdb, ids: { simkl: Number(tmdb), tmdb } }, seasons })
const movie = (tmdb: string, status: string) => ({ status, last_watched_at: status === 'completed' ? 'RW' : null, movie: { title: tmdb, ids: { simkl: Number(tmdb), tmdb } } })

describe('SIMKL-synkmotorn', () => {
  it('oförändrade aktiviteter och inget lokalt → ett enda anrop', async () => {
    const { host, store } = makeHost({ now: () => NOW })
    store[SNAPSHOT_KEY] = snap({ all: 'A1' })
    const { api, call } = makeApi((_m, p) => (p === '/sync/activities' ? ok({ all: 'A1' }) : ok({})))
    expect(await runSimklSync({ host, api, prefs: prefsOn() }, { pushWatched: true, reason: 't' })).toEqual({ status: 'unchanged' })
    expect(call).toHaveBeenCalledTimes(1)
  })

  it('låg dagskvot: avstår och loggar', async () => {
    const { host } = makeHost()
    const { api, call } = makeApi(() => ok({}), 20)
    const out = await runSimklSync({ host, api, prefs: prefsOn() }, { pushWatched: false, reason: 't' })
    expect(out.status).toBe('skipped')
    expect(call).not.toHaveBeenCalled()
  })

  it('första synken: ett anrop hämtar allt; fjärrens serier och filmer läggs till lokalt', async () => {
    const { host, store } = makeHost({ now: () => NOW })
    const { api, call } = makeApi((m, p) => {
      if (p === '/sync/activities') return ok({ all: 'A1' })
      if (m === 'GET' && p === '/sync/all-items/all/all') return ok({ shows: [show('1399', 'watching')], movies: [movie('603', 'plantowatch')] })
      return ok({})
    })
    await runSimklSync({ host, api, prefs: prefsOn(false, true) }, { pushWatched: false, reason: 'start' })
    expect(host.addShow).toHaveBeenCalledWith(expect.objectContaining({ tmdbId: '1399' }))
    expect(host.addMovie).toHaveBeenCalledWith(expect.objectContaining({ tmdbId: '603' }))
    expect(call.mock.calls.filter(([m]) => m === 'GET')).toHaveLength(2)
    expect((store[SNAPSHOT_KEY] as { all: string }).all).toBe('A1')
  })

  it('en klar serie hos SIMKL raderas inte lokalt och skickas inte tillbaka', async () => {
    const { host, store } = makeHost({ now: () => NOW, getShows: () => [{ tmdbId: '1399', imdbId: null, title: 'GoT' }] })
    store[SNAPSHOT_KEY] = snap({ shows: ['1399'], all: 'A0', fullAt: 0 })
    const { api, call } = makeApi((m, p) => {
      if (p === '/sync/activities') return ok({ all: 'A1' })
      if (m === 'GET' && p === '/sync/all-items/all/all') return ok({ shows: [show('1399', 'completed')] })
      return ok({})
    })
    await runSimklSync({ host, api, prefs: prefsOn(false, true) }, { pushWatched: false, reason: 't' })
    expect(host.removeShow).not.toHaveBeenCalled()
    expect(call).not.toHaveBeenCalledWith('POST', '/sync/add-to-list', expect.anything())
  })

  it('avbruten hos SIMKL (fanns i snapshoten) lämnar följlistan', async () => {
    const { host, store } = makeHost({ now: () => NOW, getShows: () => [{ tmdbId: '1399', imdbId: null, title: 'GoT' }] })
    store[SNAPSHOT_KEY] = snap({ shows: ['1399'], fullAt: 0 })
    const { api } = makeApi((m, p) => {
      if (p === '/sync/activities') return ok({ all: 'A1' })
      if (m === 'GET' && p === '/sync/all-items/all/all') return ok({ shows: [show('1399', 'dropped')] })
      return ok({})
    })
    await runSimklSync({ host, api, prefs: prefsOn(false, true) }, { pushWatched: false, reason: 't' })
    expect(host.removeShow).toHaveBeenCalledWith('1399')
  })

  it('lokala tillägg: serie med sedda avsnitt blir watching, annars plantowatch; film plantowatch', async () => {
    const { host } = makeHost({
      now: () => NOW,
      getShows: () => [{ tmdbId: '1', imdbId: null, title: 'A' }, { tmdbId: '2', imdbId: null, title: 'B' }],
      getMovies: () => [{ tmdbId: '603', imdbId: null, title: 'M' }],
      getWatchedEpisodes: () => [{ tmdbId: '1', season: 1, episode: 1, watchedAt: 'T' }],
    })
    const posted: unknown[] = []
    const { api } = makeApi((m, p, _q, body) => {
      if (p === '/sync/activities') return ok({ all: 'A1' })
      if (m === 'POST' && p === '/sync/add-to-list') { posted.push(body); return ok({}) }
      return ok({})
    })
    await runSimklSync({ host, api, prefs: prefsOn(false, true) }, { pushWatched: false, reason: 't' })
    expect(posted).toContainEqual({ shows: [{ to: 'watching', ids: { tmdb: 1 } }] })
    expect(posted).toContainEqual({ shows: [{ to: 'plantowatch', ids: { tmdb: 2 } }] })
    expect(posted).toContainEqual({ movies: [{ to: 'plantowatch', ids: { tmdb: 603 } }] })
  })

  it('sedda: hämtning markerar saknade lokalt, anime-avsnitt hämtas inte', async () => {
    const { host } = makeHost({ now: () => NOW })
    const { api } = makeApi((m, p) => {
      if (p === '/sync/activities') return ok({ all: 'A1' })
      if (m === 'GET' && p === '/sync/all-items/all/all') return ok({
        shows: [show('1399', 'watching', [{ number: 1, episodes: [{ number: 2, watched_at: 'W' }] }])],
        anime: [show('37854', 'watching', [{ number: 1, episodes: [{ number: 5, watched_at: 'W' }] }])],
        movies: [movie('603', 'completed')],
      })
      return ok({})
    })
    await runSimklSync({ host, api, prefs: prefsOn(true, false) }, { pushWatched: false, reason: 't' })
    expect(host.markEpisodeWatched).toHaveBeenCalledTimes(1)
    expect(host.markEpisodeWatched).toHaveBeenCalledWith('1399', 1, 2, 'W')
    expect(host.markMovieWatched).toHaveBeenCalledWith({ tmdbId: '603', imdbId: null, watchedAt: 'RW' })
  })

  it('löpande körning hämtar med date_from och skickar inte sedda', async () => {
    const local = [{ tmdbId: '9', season: 1, episode: 1, watchedAt: 'T' }]
    const { host, store } = makeHost({ now: () => NOW, getWatchedEpisodes: () => local })
    store[SNAPSHOT_KEY] = snap({ all: 'A0', fullAt: NOW, watchedHash: 'x', buckets: { 'tv_shows.all': 'B0' } })
    const queries: Array<Record<string, string | number> | undefined> = []
    const { api, call } = makeApi((m, p, q) => {
      if (p === '/sync/activities') return ok({ all: 'A1', tv_shows: { all: 'B1' } })
      if (m === 'GET' && p === '/sync/all-items') { queries.push(q); return ok({}) }
      return ok({})
    })
    await runSimklSync({ host, api, prefs: prefsOn(true, false) }, { pushWatched: true, reason: 'intervall' })
    expect(queries[0]).toEqual(expect.objectContaining({ date_from: 'A0', extended: 'full' }))
    expect(call).not.toHaveBeenCalledWith('POST', '/sync/history', expect.anything())
  })

  it('full körning skickar saknade sedda med lokal tid, tak 100, aldrig utan tid', async () => {
    const local = [
      ...Array.from({ length: 120 }, (_, i) => ({ tmdbId: '1399', season: 1, episode: i + 1, watchedAt: `T${i}` })),
      { tmdbId: '7', season: 1, episode: 1 },
    ]
    const { host } = makeHost({ now: () => NOW, getWatchedEpisodes: () => local })
    const posted: unknown[] = []
    const { api } = makeApi((m, p, _q, body) => {
      if (p === '/sync/activities') return ok({ all: 'A1' })
      if (m === 'GET' && p === '/sync/all-items/all/all') return ok({})
      if (m === 'POST' && p === '/sync/history') { posted.push(body); return ok({}) }
      return ok({})
    })
    await runSimklSync({ host, api, prefs: prefsOn(true, false) }, { pushWatched: true, reason: 'Synka nu' })
    const episodes = posted.flatMap((b) => (b as { shows: Array<{ ids: { tmdb: number }; seasons: Array<{ episodes: unknown[] }> }> }).shows
      .flatMap((s) => s.seasons.flatMap((x) => x.episodes.map(() => s.ids.tmdb))))
    expect(episodes).toHaveLength(100)
    expect(episodes).not.toContain(7)
  })

  it('snapshot från ett annat konto används inte', async () => {
    const { host, store } = makeHost({ now: () => NOW, getMovies: () => [{ tmdbId: '603', imdbId: null, title: 'M' }] })
    store[SNAPSHOT_KEY] = snap({ accountKey: 'other', movies: ['603'] })
    const { api } = makeApi((m, p) => {
      if (p === '/sync/activities') return ok({ all: 'A1' })
      if (m === 'GET' && p === '/sync/all-items/all/all') return ok({ movies: [movie('13', 'plantowatch')] })
      return ok({})
    })
    await runSimklSync({ host, api, prefs: prefsOn(false, true) }, { pushWatched: false, reason: 't' })
    expect(host.removeMovie).not.toHaveBeenCalled()
  })

  it('profilbyte mitt i körningen: inga lokala skrivningar', async () => {
    let scope = 'p1'
    const { host, store } = makeHost({ now: () => NOW, scopeId: () => scope })
    const { api } = makeApi((m, p) => {
      if (p === '/sync/activities') return ok({ all: 'A1' })
      if (m === 'GET' && p === '/sync/all-items/all/all') { scope = 'p2'; return ok({ movies: [movie('13', 'plantowatch')] }) }
      return ok({})
    })
    const out = await runSimklSync({ host, api, prefs: prefsOn(false, true) }, { pushWatched: false, reason: 't' })
    expect(out).toEqual({ status: 'skipped', reason: 'profilbyte' })
    expect(host.addMovie).not.toHaveBeenCalled()
    expect(store[SNAPSHOT_KEY]).toBeUndefined()
  })

  it('tomt fjärrsvar bredvid stor snapshot raderar inget', async () => {
    const ids = Array.from({ length: 20 }, (_, i) => String(i + 1))
    const { host, store } = makeHost({ now: () => NOW, getShows: () => ids.map((tmdbId) => ({ tmdbId, imdbId: null, title: tmdbId })) })
    store[SNAPSHOT_KEY] = snap({ shows: ids, fullAt: 0 })
    const { api } = makeApi((m, p) => (p === '/sync/activities' ? ok({ all: 'A1' }) : ok({})))
    await runSimklSync({ host, api, prefs: prefsOn(false, true) }, { pushWatched: false, reason: 't' })
    expect(host.removeShow).not.toHaveBeenCalled()
  })

  // --- granskningsfynd -------------------------------------------------------

  const gets = (call: ReturnType<typeof makeApi>['call']) => call.mock.calls.filter(([m]) => m === 'GET').map(([, p]) => p)

  it('C2: efter en ändring hos SIMKL hämtas bara deltat med date_from, aldrig hela biblioteket', async () => {
    const { host, store } = makeHost({ now: () => NOW, getShows: () => [{ tmdbId: '1', imdbId: null, title: 'A' }] })
    store[SNAPSHOT_KEY] = snap({ shows: ['1'], buckets: { 'tv_shows.watching': 'B0' }, remote: { 's:1': { st: 'watching', k: 's', t: 'A' } } })
    const queries: Array<Record<string, string | number> | undefined> = []
    const { api, call } = makeApi((m, p, q) => {
      if (p === '/sync/activities') return ok({ all: 'A1', tv_shows: { watching: 'B1' } })
      if (p === '/sync/all-items') { queries.push(q); return ok({ shows: [show('2', 'watching')] }) }
      return ok({})
    })
    await runSimklSync({ host, api, prefs: prefsOn() }, { pushWatched: true, reason: 'intervall' })
    expect(gets(call)).toEqual(['/sync/activities', '/sync/all-items'])
    expect(queries[0]).toEqual(expect.objectContaining({ date_from: 'A0' }))
    expect(host.addShow).toHaveBeenCalledWith(expect.objectContaining({ tmdbId: '2' }))
    expect((store[SNAPSHOT_KEY] as { remote: Record<string, unknown> }).remote).toHaveProperty('s:2')
  })

  it('C2: bara en lokal ändring — ingen hämtning alls, statuskartan räcker', async () => {
    const h = makeHost({ now: () => NOW, getShows: () => [{ tmdbId: '1', imdbId: null, title: 'A' }, { tmdbId: '2', imdbId: null, title: 'B' }] })
    h.store[SNAPSHOT_KEY] = snap({ shows: ['1'], remote: { 's:1': { st: 'watching', k: 's', t: 'A' } } })
    const { api, call } = makeApi((m, p) => (p === '/sync/activities' ? ok({ all: 'A0' }) : ok({})))
    await runSimklSync({ host: h.host, api, prefs: prefsOn() }, { pushWatched: true, reason: 'intervall' })
    expect(gets(call)).toEqual(['/sync/activities'])
    expect(call).toHaveBeenCalledWith('POST', '/sync/add-to-list', { body: { shows: [{ to: 'plantowatch', ids: { tmdb: 2 } }] } })
  })

  it('C3: en misslyckad körning backar av — nästa tick gör inga anrop', async () => {
    let clock = NOW
    const { host } = makeHost({ now: () => clock })
    const { api, call } = makeApi((m, p) => (p === '/sync/activities' ? ok({ all: 'A1' }) : { ok: false, status: 500, retryAfter: null, error: 'boom' }))
    expect((await runSimklSync({ host, api, prefs: prefsOn() }, { pushWatched: true, reason: 'intervall' })).status).toBe('failed')
    const before = call.mock.calls.length
    clock += 15 * 60_000
    expect((await runSimklSync({ host, api, prefs: prefsOn() }, { pushWatched: true, reason: 'intervall' })).status).toBe('skipped')
    expect(call.mock.calls.length).toBe(before)
    clock += 6 * 60 * 60_000
    await runSimklSync({ host, api, prefs: prefsOn() }, { pushWatched: true, reason: 'intervall' })
    expect(call.mock.calls.length).toBeGreaterThan(before)
  })

  it('C3: 400 max_items även per typ — statusar utan avsnitt, följlistan synkas ändå, inga sedda skickas', async () => {
    const { host } = makeHost({ now: () => NOW, getWatchedEpisodes: () => [{ tmdbId: '9', season: 1, episode: 1, watchedAt: 'T' }] })
    const { api, call } = makeApi((m, p, q) => {
      if (p === '/sync/activities') return ok({ all: 'A1' })
      if (m === 'GET' && q?.extended === 'full') return { ok: false, status: 400, retryAfter: null, error: 'max_items' }
      if (m === 'GET' && p === '/sync/all-items/all/all') return ok({ shows: [show('1399', 'watching')] })
      return ok({})
    })
    const out = await runSimklSync({ host, api, prefs: prefsOn() }, { pushWatched: true, reason: 'start' })
    expect(out.status).toBe('done')
    expect(host.addShow).toHaveBeenCalledWith(expect.objectContaining({ tmdbId: '1399' }))
    expect(call).not.toHaveBeenCalledWith('POST', '/sync/history', expect.anything())
    expect(gets(call).length).toBeLessThanOrEqual(4)
  })

  it('I1: grundhämtningen tar med avsnitt i klara och avbrutna serier (include_all_episodes=original)', async () => {
    const { host } = makeHost({ now: () => NOW })
    const queries: Array<Record<string, string | number> | undefined> = []
    const { api } = makeApi((m, p, q) => {
      if (p === '/sync/activities') return ok({ all: 'A1' })
      if (m === 'GET' && p === '/sync/all-items/all/all') { queries.push(q); return ok({}) }
      return ok({})
    })
    await runSimklSync({ host, api, prefs: prefsOn() }, { pushWatched: true, reason: 'start' })
    expect(queries[0]).toEqual(expect.objectContaining({ extended: 'full', include_all_episodes: 'original' }))
  })

  it('I1: lokala avsnitt i en serie som är avbruten, pausad eller klar hos SIMKL skickas inte', async () => {
    const { host } = makeHost({
      now: () => NOW,
      getWatchedEpisodes: () => [
        { tmdbId: '5', season: 1, episode: 1, watchedAt: 'T' },
        { tmdbId: '6', season: 1, episode: 1, watchedAt: 'T' },
        { tmdbId: '7', season: 1, episode: 1, watchedAt: 'T' },
        { tmdbId: '8', season: 1, episode: 1, watchedAt: 'T' },
      ],
    })
    const posted: unknown[] = []
    const { api } = makeApi((m, p, _q, body) => {
      if (p === '/sync/activities') return ok({ all: 'A1' })
      if (m === 'GET' && p === '/sync/all-items/all/all') return ok({ shows: [show('5', 'dropped'), show('6', 'hold'), show('7', 'completed')] })
      if (m === 'POST' && p === '/sync/history') { posted.push(body); return ok({}) }
      return ok({})
    })
    await runSimklSync({ host, api, prefs: prefsOn(true, false) }, { pushWatched: true, reason: 'Synka nu', full: true })
    const ids = posted.flatMap((b) => (b as { shows: Array<{ ids: { tmdb: number } }> }).shows.map((s) => s.ids.tmdb))
    expect(ids).toEqual([8])
  })

  it('I2: första synken skriver inte över en status hos SIMKL (pausad serie, klar film)', async () => {
    const { host } = makeHost({
      now: () => NOW,
      getShows: () => [{ tmdbId: '5', imdbId: null, title: 'Pausad' }],
      getMovies: () => [{ tmdbId: '603', imdbId: null, title: 'Klar' }],
    })
    const { api, call } = makeApi((m, p) => {
      if (p === '/sync/activities') return ok({ all: 'A1' })
      if (m === 'GET' && p === '/sync/all-items/all/all') return ok({ shows: [show('5', 'hold')], movies: [movie('603', 'completed')] })
      return ok({})
    })
    await runSimklSync({ host, api, prefs: prefsOn(false, true) }, { pushWatched: false, reason: 'start' })
    expect(call).not.toHaveBeenCalledWith('POST', '/sync/add-to-list', expect.anything())
  })

  it('I3: en post utan tmdb matchas via imdb och följningen ligger kvar', async () => {
    const { host, store } = makeHost({ now: () => NOW, getShows: () => [{ tmdbId: '1399', imdbId: 'tt0944947', title: 'GoT' }] })
    store[SNAPSHOT_KEY] = snap({ shows: ['1399'], fullAt: 0, remote: { 's:1399': { st: 'watching', k: 's', t: 'GoT', i: 'tt0944947' } } })
    const { api, call } = makeApi((m, p) => {
      if (p === '/sync/activities') return ok({ all: 'A1' })
      if (m === 'GET' && p === '/sync/all-items/all/all') return ok({ shows: [{ status: 'watching', show: { title: 'GoT', ids: { simkl: 17465, imdb: 'tt0944947' } } }] })
      return ok({})
    })
    await runSimklSync({ host, api, prefs: prefsOn(false, true) }, { pushWatched: false, reason: 't' })
    expect(host.removeShow).not.toHaveBeenCalled()
    expect(call).not.toHaveBeenCalledWith('POST', '/sync/add-to-list', expect.anything())
  })

  it('I3: ett id som SIMKL aldrig visat med tmdb tas inte bort lokalt', async () => {
    const { host, store } = makeHost({ now: () => NOW, getShows: () => [{ tmdbId: '37854', imdbId: null, title: 'One Piece' }] })
    store[SNAPSHOT_KEY] = snap({ shows: ['37854'], fullAt: 0, remote: {} })
    const { api } = makeApi((m, p) => {
      if (p === '/sync/activities') return ok({ all: 'A1' })
      if (m === 'GET' && p === '/sync/all-items/all/all') return ok({ anime: [{ status: 'watching', show: { title: 'One Piece', ids: { simkl: 38636 } } }] })
      return ok({})
    })
    await runSimklSync({ host, api, prefs: prefsOn(false, true) }, { pushWatched: false, reason: 't' })
    expect(host.removeShow).not.toHaveBeenCalled()
  })

  it('borttagen ur listan hos SIMKL: ids-listan tar bort den ur kartan och ur följlistan', async () => {
    const { host, store } = makeHost({ now: () => NOW, getShows: () => [{ tmdbId: '1', imdbId: null, title: 'A' }, { tmdbId: '2', imdbId: null, title: 'B' }] })
    store[SNAPSHOT_KEY] = snap({
      shows: ['1', '2'], buckets: { 'tv_shows.removed_from_list': 'R0' },
      remote: { 's:1': { st: 'watching', k: 's', t: 'A' }, 's:2': { st: 'watching', k: 's', t: 'B' } },
    })
    const { api, call } = makeApi((m, p, q) => {
      if (p === '/sync/activities') return ok({ all: 'A1', tv_shows: { removed_from_list: 'R1' } })
      if (p === '/sync/all-items') return ok({})
      if (p === '/sync/all-items/all/all' && q?.extended === 'ids_only') return ok({ shows: [show('1', 'watching')] })
      return ok({})
    })
    await runSimklSync({ host, api, prefs: prefsOn(false, true) }, { pushWatched: false, reason: 'intervall' })
    expect(host.removeShow).toHaveBeenCalledWith('2')
    expect(gets(call)).toHaveLength(3)
  })
})
