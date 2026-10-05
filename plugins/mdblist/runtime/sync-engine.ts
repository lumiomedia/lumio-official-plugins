import type { ApiResult, MdblistApi } from './api'
import { parseActivities, parseWatched, parseWatchlist } from './parse'
import { buildWatchedPayload, buildWatchlistPayload, type WatchedPush } from './payloads'
import type { Prefs } from './prefs'
import type { LocalEntry, RemoteEntry } from './types'

export const SNAPSHOT_KEY = 'mdblist_sync_snapshot'
const WATCHED_PUSH_LIMIT_PER_RUN = 100
const WATCHED_BATCH = 100
const FULL_RUN_EVERY_MS = 24 * 60 * 60_000
/** Tom fjärrlista + snapshot större än så här = API-hicka, inte "allt borttaget". */
const EMPTY_REMOTE_GUARD = 15

export interface WatchlistPlanLike {
  pushAdds: RemoteEntry[]
  pushRemoves: RemoteEntry[]
  localAdds: RemoteEntry[]
  localRemoveIds: string[]
  nextIds: string[]
}

/** Det motorn behöver av värden. index.ts kopplar in SDK:n; testerna fejkar. */
export interface SyncHost {
  getShows(): LocalEntry[]
  getMovies(): LocalEntry[]
  addShow(entry: RemoteEntry): void
  removeShow(tmdbId: string): void
  addMovie(entry: RemoteEntry): void
  removeMovie(tmdbId: string): void
  getWatchedEpisodes(): Array<{ tmdbId: string; season: number; episode: number; watchedAt?: string }>
  getWatchedMovies(): Array<{ tmdbId?: string | null; imdbId?: string | null; watchedAt: string }>
  markEpisodeWatched(tmdbId: string, season: number, episode: number, watchedAt: string | null): void
  markMovieWatched(movie: { tmdbId: string | null; imdbId: string | null; watchedAt: string | null }): void
  planWatchlistSync(
    local: LocalEntry[],
    remote: RemoteEntry[],
    snapshotIds: string[] | null,
    conflictRule: 'merge',
    options?: { keepLocal?: boolean },
  ): WatchlistPlanLike
  readJson<T>(key: string): T | null
  writeJson(key: string, value: unknown): void
  waitForStartIdle(): Promise<void>
  log(message: string): void
  now(): number
}

export interface SyncSnapshot {
  shows: string[]
  movies: string[]
  activities: Record<string, string>
  watchedLocalCount: number
  fullAt: number
  syncedAt: number
}

export type SyncOutcome =
  | { status: 'skipped'; reason: string }
  | { status: 'unchanged' }
  | { status: 'done'; changes: number }
  | { status: 'failed'; error: string; authFailed: boolean }

export interface SyncDeps {
  host: SyncHost
  api: MdblistApi
  prefs: Prefs
}

class SyncAbort extends Error {
  constructor(readonly result: Extract<ApiResult<unknown>, { ok: false }>) {
    super(result.error)
  }
}

function must<T>(result: ApiResult<T>): T {
  if (!result.ok) throw new SyncAbort(result)
  return result.data
}

let running = false

export async function runMdblistSync(deps: SyncDeps, opts: { pushWatched: boolean; reason: string }): Promise<SyncOutcome> {
  const { host, api, prefs } = deps
  const skip = (reason: string): SyncOutcome => {
    host.log(`synk (${opts.reason}): avstår — ${reason}`)
    return { status: 'skipped', reason }
  }
  await host.waitForStartIdle()
  if (running) return skip('en körning pågår redan')
  const wantWatched = prefs.isOn('watched')
  const wantWatchlist = prefs.isOn('watchlist')
  if (!wantWatched && !wantWatchlist) return skip('inga reglage påslagna')
  if (!api.hasAuth()) return skip('inte ansluten')
  if (api.pausedUntil() > host.now()) return skip('MDBList har bett oss vänta (429)')

  running = true
  try {
    const activities = parseActivities(must(await api.call('GET', '/sync/last_activities')))
    const snapshot = host.readJson<SyncSnapshot>(SNAPSHOT_KEY)
    const remoteChanged = !snapshot
      || Object.entries(activities).some(([key, value]) => snapshot.activities[key] !== value)
    const localShows = host.getShows()
    const localMovies = host.getMovies()
    const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id))
    const watchlistDirty = wantWatchlist && (!snapshot
      || !sameSet(localShows.map((e) => e.tmdbId), snapshot.shows)
      || !sameSet(localMovies.map((e) => e.tmdbId), snapshot.movies))
    const localWatchedCount = host.getWatchedEpisodes().length + host.getWatchedMovies().length
    const watchedDirty = wantWatched && opts.pushWatched && localWatchedCount !== (snapshot?.watchedLocalCount ?? -1)
    const fullDue = !snapshot || host.now() - snapshot.fullAt > FULL_RUN_EVERY_MS
    if (!remoteChanged && !watchlistDirty && !watchedDirty && !fullDue) {
      host.log(`synk (${opts.reason}): inget nytt — ett anrop`)
      return { status: 'unchanged' }
    }

    let changes = 0
    let nextShows = snapshot?.shows ?? []
    let nextMovies = snapshot?.movies ?? []

    if (wantWatchlist) {
      const remote = parseWatchlist(must(await api.getAllPages('/watchlist/items', { limit: 100 })))
      const snapCount = (snapshot?.shows.length ?? 0) + (snapshot?.movies.length ?? 0)
      if (remote.shows.length + remote.movies.length === 0 && snapCount > EMPTY_REMOTE_GUARD) {
        host.log(`watchlist: MDBList svarade tomt men snapshoten har ${snapCount} — hoppar över, raderar inget`)
      } else {
        const showPlan = host.planWatchlistSync(localShows, remote.shows, snapshot?.shows ?? null, 'merge', { keepLocal: true })
        const moviePlan = host.planWatchlistSync(localMovies, remote.movies, snapshot?.movies ?? null, 'merge')
        for (const [kind, plan] of [['show', showPlan], ['movie', moviePlan]] as const) {
          if (plan.pushAdds.length) must(await api.call('POST', '/watchlist/items/add', { body: buildWatchlistPayload(plan.pushAdds, kind) }))
          if (plan.pushRemoves.length) must(await api.call('POST', '/watchlist/items/remove', { body: buildWatchlistPayload(plan.pushRemoves, kind) }))
          for (const entry of plan.localAdds) (kind === 'show' ? host.addShow : host.addMovie)(entry)
          for (const id of plan.localRemoveIds) (kind === 'show' ? host.removeShow : host.removeMovie)(id)
          changes += plan.pushAdds.length + plan.pushRemoves.length + plan.localAdds.length + plan.localRemoveIds.length
          host.log(`watchlist ${kind}: upp +${plan.pushAdds.length}/-${plan.pushRemoves.length}, ner +${plan.localAdds.length}/-${plan.localRemoveIds.length}`)
        }
        // Bekräfta före enighet: bara det MDBList faktiskt visar efter pushen hamnar i snapshoten.
        const confirmed = parseWatchlist(must(await api.getAllPages('/watchlist/items', { limit: 100 })))
        const confirmedShows = new Set(confirmed.shows.map((e) => e.tmdbId))
        const confirmedMovies = new Set(confirmed.movies.map((e) => e.tmdbId))
        nextShows = showPlan.nextIds.filter((id) => confirmedShows.has(id))
        nextMovies = moviePlan.nextIds.filter((id) => confirmedMovies.has(id))
      }
    }

    if (wantWatched) {
      const remote = parseWatched(must(await api.getAllPages('/sync/watched', { limit: 1000 })))
      for (const ep of remote.episodes) host.markEpisodeWatched(ep.tmdbId, ep.season, ep.episode, ep.watchedAt)
      for (const movie of remote.movies) host.markMovieWatched(movie)
      if (opts.pushWatched) {
        const remoteEp = new Set(remote.episodes.map((e) => `${e.tmdbId}-${e.season}-${e.episode}`))
        const remoteMovie = new Set(remote.movies.flatMap((m) => [m.tmdbId && `tmdb:${m.tmdbId}`, m.imdbId && `imdb:${m.imdbId}`].filter(Boolean) as string[]))
        const now = new Date(host.now()).toISOString()
        const pushes: WatchedPush[] = [
          ...host.getWatchedEpisodes()
            .filter((e) => !remoteEp.has(`${e.tmdbId}-${e.season}-${e.episode}`))
            .map((e): WatchedPush => ({ kind: 'episode', tmdbId: e.tmdbId, season: e.season, episode: e.episode, watchedAt: e.watchedAt ?? now })),
          ...host.getWatchedMovies()
            .filter((m) => (m.tmdbId || m.imdbId) && !remoteMovie.has(`tmdb:${m.tmdbId}`) && !remoteMovie.has(`imdb:${m.imdbId}`))
            .map((m): WatchedPush => ({ kind: 'movie', tmdbId: m.tmdbId ?? null, imdbId: m.imdbId ?? null, watchedAt: m.watchedAt })),
        ].slice(0, WATCHED_PUSH_LIMIT_PER_RUN)
        for (let i = 0; i < pushes.length; i += WATCHED_BATCH) {
          must(await api.call('POST', '/sync/watched', { body: buildWatchedPayload(pushes.slice(i, i + WATCHED_BATCH)) }))
        }
        changes += pushes.length
        host.log(`sedda: hämtade ${remote.episodes.length} avsnitt/${remote.movies.length} filmer, skickade ${pushes.length}`)
      } else {
        host.log(`sedda: hämtade ${remote.episodes.length} avsnitt/${remote.movies.length} filmer (bara hämtning)`)
      }
    }

    const finalActivities = parseActivities(must(await api.call('GET', '/sync/last_activities')))
    host.writeJson(SNAPSHOT_KEY, {
      shows: nextShows,
      movies: nextMovies,
      activities: finalActivities,
      watchedLocalCount: host.getWatchedEpisodes().length + host.getWatchedMovies().length,
      fullAt: host.now(),
      syncedAt: host.now(),
    } satisfies SyncSnapshot)
    host.log(`synk (${opts.reason}) klar: ${changes} ändringar`)
    return { status: 'done', changes }
  } catch (error) {
    if (error instanceof SyncAbort) {
      const authFailed = error.result.status === 401 || error.result.status === 403
      host.log(`synk (${opts.reason}) AVBRUTEN: ${error.result.error} — snapshot orörd, samma diff försöks igen`)
      return { status: 'failed', error: error.result.error, authFailed }
    }
    const message = error instanceof Error ? error.message : String(error)
    host.log(`synk (${opts.reason}) AVBRUTEN: ${message}`)
    return { status: 'failed', error: message, authFailed: false }
  } finally {
    running = false
  }
}
