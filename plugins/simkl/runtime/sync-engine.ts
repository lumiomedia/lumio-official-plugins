import type { Prefs } from '../../_shared/tracker-kit/prefs'
import type { ApiResult, SimklApi } from './api'
import { parseActivities, parseAllItems, type SimklItem } from './parse'
import { buildAddToListPayload, buildHistoryPayload, buildRemovePayload, type WatchedPush } from './payloads'
import type { LocalEntry, RemoteEntry } from './types'

export const SNAPSHOT_KEY = 'simkl_sync_snapshot'
const SNAPSHOT_VERSION = 1
const WATCHED_PUSH_LIMIT_PER_RUN = 100
const WATCHED_BATCH = 100
const FULL_RUN_EVERY_MS = 24 * 60 * 60_000
const EMPTY_REMOTE_GUARD = 15
const UNCONFIRMED_MAX_ATTEMPTS = 2
const UNCONFIRMED_COOLDOWN_MS = 7 * 24 * 60 * 60_000
/** Under så här många kvarvarande dagsanrop avstår synken — scrobble får resten. */
const QUOTA_FLOOR = 50

/** Hinkarna i /sync/activities som rör följlistan respektive sedda titlar. */
const WATCHLIST_BUCKETS = [
  ...['tv_shows', 'anime'].flatMap((t) => ['watching', 'plantowatch', 'completed', 'hold', 'dropped', 'removed_from_list'].map((s) => `${t}.${s}`)),
  ...['plantowatch', 'completed', 'dropped', 'removed_from_list'].map((s) => `movies.${s}`),
]
const WATCHED_BUCKETS = ['tv_shows.all', 'anime.all', 'movies.all']

export interface WatchlistPlanLike {
  pushAdds: RemoteEntry[]
  pushRemoves: RemoteEntry[]
  localAdds: RemoteEntry[]
  localRemoveIds: string[]
  nextIds: string[]
}

/** Samma värd som MDBList-motorn. host.ts kopplar in SDK:n; testerna fejkar. */
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
  accountKey(): string | null
  scopeId(): string | null
}

export interface SyncSnapshot {
  version: number
  accountKey: string
  shows: string[]
  movies: string[]
  /** Topptiden ur /sync/activities — `date_from` för nästa löpande hämtning. */
  all: string | null
  buckets: Record<string, string>
  syncedKinds: { watched: boolean; watchlist: boolean }
  watchedHash: string
  watchedPending: boolean
  unconfirmed: Record<string, { attempts: number; lastAt: number }>
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
  api: SimklApi
  prefs: Prefs
}

class SyncAbort extends Error {
  constructor(readonly result: Extract<ApiResult<unknown>, { ok: false }>) {
    super(result.error)
  }
}
class ScopeChanged extends Error {}

function must<T>(result: ApiResult<T>): T {
  if (!result.ok) throw new SyncAbort(result)
  return result.data
}

const episodeKey = (tmdbId: string, season: number, episode: number) => `e:${tmdbId}:${season}:${episode}`
const movieKeys = (m: { tmdbId?: string | null; imdbId?: string | null }) =>
  [m.tmdbId ? `m:tmdb:${m.tmdbId}` : null, m.imdbId ? `m:imdb:${m.imdbId}` : null].filter((k): k is string => k != null)

export function hashKeys(keys: string[]): string {
  let sum = 0
  for (const key of keys) {
    let h = 0
    for (let i = 0; i < key.length; i += 1) h = (Math.imul(h, 31) + key.charCodeAt(i)) | 0
    sum = (sum + (h >>> 0)) % 4294967296
  }
  return `${keys.length}:${sum}`
}

function localWatchedKeys(host: SyncHost): string[] {
  return [
    ...host.getWatchedEpisodes().map((e) => episodeKey(e.tmdbId, e.season, e.episode)),
    ...host.getWatchedMovies().map((m) => movieKeys(m)[0]).filter((k): k is string => k != null),
  ]
}

const toRemote = (item: SimklItem): RemoteEntry => ({ tmdbId: item.tmdbId ?? '', imdbId: item.imdbId, title: item.title, posterUrl: null })

const running = new Set<string>()

/**
 * Hela biblioteket i ett anrop (`/sync/all-items/all/all`). Är det för stort
 * för SIMKL (400 max_items) delas det per typ — tre anrop.
 */
async function fetchLibrary(api: SimklApi, withEpisodes: boolean): Promise<SimklItem[]> {
  const query: Record<string, string> = withEpisodes ? { extended: 'full', episode_watched_at: 'yes' } : {}
  const all = await api.call<unknown>('GET', '/sync/all-items/all/all', { query })
  if (all.ok) return parseAllItems(all.data)
  if (all.status !== 400) throw new SyncAbort(all)
  const parts = []
  for (const type of ['movies', 'shows', 'anime']) parts.push(...parseAllItems(must(await api.call<unknown>('GET', `/sync/all-items/${type}/all`, { query }))))
  return parts
}

export async function runSimklSync(
  deps: SyncDeps,
  opts: { pushWatched: boolean; reason: string; full?: boolean },
): Promise<SyncOutcome> {
  const { host, api, prefs } = deps
  const skip = (reason: string): SyncOutcome => {
    host.log(`synk (${opts.reason}): avstår — ${reason}`)
    return { status: 'skipped', reason }
  }
  await host.waitForStartIdle()
  const scope = host.scopeId() ?? ''
  if (running.has(scope)) return skip('en körning pågår redan')
  const wantWatched = prefs.isOn('watched')
  const wantWatchlist = prefs.isOn('watchlist')
  if (!wantWatched && !wantWatchlist) return skip('inga reglage påslagna')
  if (!api.hasAuth()) return skip('inte ansluten')
  if (api.pausedUntil() > host.now()) return skip('SIMKL har bett oss vänta (429)')
  const left = api.remaining()
  if (left != null && left < QUOTA_FLOOR) return skip(`dagens kvot nästan slut (${left} kvar)`)
  const accountKey = host.accountKey()
  if (!accountKey) return skip('kontot är inte bekräftat än')

  const guard = () => { if ((host.scopeId() ?? '') !== scope) throw new ScopeChanged() }

  running.add(scope)
  try {
    const activities = parseActivities(must(await api.call('GET', '/sync/activities')))
    const stored = host.readJson<SyncSnapshot>(SNAPSHOT_KEY)
    const snapshot = stored && stored.version === SNAPSHOT_VERSION && stored.accountKey === accountKey ? stored : null
    if (stored && !snapshot) host.log('synk: snapshoten hör till ett annat konto eller en äldre version — första synk')

    const moved = (keys: string[]) => !snapshot || keys.some((key) => snapshot.buckets[key] !== activities.buckets[key])
    const localShows = host.getShows()
    const localMovies = host.getMovies()
    const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id))
    const newlyOn = (kind: 'watched' | 'watchlist') => !snapshot || !snapshot.syncedKinds[kind]
    const localHash = hashKeys(localWatchedKeys(host))

    const fullDue = opts.full === true || !snapshot || Math.abs(host.now() - snapshot.fullAt) > FULL_RUN_EVERY_MS
    const watchlistDue = wantWatchlist && (newlyOn('watchlist') || moved(WATCHLIST_BUCKETS)
      || !sameSet(localShows.map((e) => e.tmdbId), snapshot?.shows ?? [])
      || !sameSet(localMovies.map((e) => e.tmdbId), snapshot?.movies ?? []))
    const watchedDue = wantWatched && (newlyOn('watched') || moved(WATCHED_BUCKETS)
      || (opts.pushWatched && (snapshot?.watchedPending === true || localHash !== snapshot?.watchedHash)))
    if (!fullDue && !watchlistDue && !watchedDue) {
      host.log(`synk (${opts.reason}): inget nytt — ett anrop`)
      return { status: 'unchanged' }
    }

    // Full körning: ett anrop ger både statusar och sedda avsnitt. Löpande:
    // följlistan läses hel (statusar, utan avsnitt), sedda bara det som ändrats.
    const full = fullDue || (watchlistDue && watchedDue)
    const library = full || watchlistDue ? await fetchLibrary(api, full && wantWatched) : null
    const changedSince = !full && watchedDue && snapshot?.all
      ? parseAllItems(must(await api.call<unknown>('GET', '/sync/all-items', { query: { date_from: snapshot.all, extended: 'full', episode_watched_at: 'yes' } })))
      : null

    let changes = 0
    let nextShows = snapshot?.shows ?? []
    let nextMovies = snapshot?.movies ?? []

    if (wantWatchlist && library) {
      const shows = library.filter((i) => (i.kind === 'show' || i.kind === 'anime') && i.tmdbId)
      const movies = library.filter((i) => i.kind === 'movie' && i.tmdbId)
      const localShowIds = new Set(localShows.map((e) => e.tmdbId))
      // Följlistan hos SIMKL: Tittar på + Planerar. En KLAR serie räknas som kvar
      // om den redan följs lokalt (raderas inte, skickas inte tillbaka) men
      // importeras inte. Avbruten eller pausad hos SIMKL = ett aktivt val, och
      // serien lämnar följlistan — därför ingen keepLocal här, till skillnad från
      // Trakt, som tar bort serier av sig själv när man tittar.
      const remoteShows = shows
        .filter((i) => i.status === 'watching' || i.status === 'plantowatch' || (i.status === 'completed' && localShowIds.has(i.tmdbId!)))
        .map(toRemote)
      const remoteMovies = movies.filter((i) => i.status === 'plantowatch').map(toRemote)
      const snapCount = (snapshot?.shows.length ?? 0) + (snapshot?.movies.length ?? 0)
      if (library.length === 0 && snapCount > EMPTY_REMOTE_GUARD) {
        host.log(`watchlist: SIMKL svarade tomt men snapshoten har ${snapCount} — hoppar över, raderar inget`)
      } else {
        const showPlan = host.planWatchlistSync(localShows, remoteShows, snapshot?.shows ?? null, 'merge')
        const moviePlan = host.planWatchlistSync(localMovies, remoteMovies, snapshot?.movies ?? null, 'merge')
        const watchedShowIds = new Set(host.getWatchedEpisodes().map((e) => e.tmdbId))
        const locallyWatchedMovie = (e: RemoteEntry) => host.getWatchedMovies().some((m) => m.tmdbId === e.tmdbId || (e.imdbId && m.imdbId === e.imdbId))

        const started = showPlan.pushAdds.filter((e) => watchedShowIds.has(e.tmdbId))
        const planned = showPlan.pushAdds.filter((e) => !watchedShowIds.has(e.tmdbId))
        if (started.length) must(await api.call('POST', '/sync/add-to-list', { body: buildAddToListPayload(started, 'show', 'watching') }))
        if (planned.length) must(await api.call('POST', '/sync/add-to-list', { body: buildAddToListPayload(planned, 'show', 'plantowatch') }))
        if (showPlan.pushRemoves.length) must(await api.call('POST', '/sync/add-to-list', { body: buildAddToListPayload(showPlan.pushRemoves, 'show', 'dropped') }))
        if (moviePlan.pushAdds.length) must(await api.call('POST', '/sync/add-to-list', { body: buildAddToListPayload(moviePlan.pushAdds, 'movie', 'plantowatch') }))
        const watchedRemoved = moviePlan.pushRemoves.filter(locallyWatchedMovie)
        const plainRemoved = moviePlan.pushRemoves.filter((e) => !locallyWatchedMovie(e))
        if (watchedRemoved.length) must(await api.call('POST', '/sync/add-to-list', { body: buildAddToListPayload(watchedRemoved, 'movie', 'completed') }))
        if (plainRemoved.length) must(await api.call('POST', '/sync/history/remove', { body: buildRemovePayload(plainRemoved, 'movie') }))

        guard()
        for (const entry of showPlan.localAdds) host.addShow(entry)
        for (const id of showPlan.localRemoveIds) host.removeShow(id)
        for (const entry of moviePlan.localAdds) host.addMovie(entry)
        for (const id of moviePlan.localRemoveIds) host.removeMovie(id)
        for (const [kind, plan] of [['serier', showPlan], ['filmer', moviePlan]] as const) {
          changes += plan.pushAdds.length + plan.pushRemoves.length + plan.localAdds.length + plan.localRemoveIds.length
          host.log(`watchlist ${kind}: upp +${plan.pushAdds.length}/-${plan.pushRemoves.length}, ner +${plan.localAdds.length}/-${plan.localRemoveIds.length}`)
        }
        nextShows = showPlan.nextIds
        nextMovies = moviePlan.nextIds
      }
    }

    let watchedPending = snapshot?.watchedPending ?? false
    const unconfirmed = { ...(snapshot?.unconfirmed ?? {}) }
    const remoteItems = full ? library : changedSince
    if (wantWatched && remoteItems) {
      // Anime-avsnitt numreras av SIMKL enligt AniDB — de skulle markera fel
      // avsnitt lokalt och hämtas därför inte (v1). Filmer och serier gör det.
      const remoteEpisodes = remoteItems.filter((i) => i.kind === 'show' && i.tmdbId)
        .flatMap((i) => i.episodes.map((ep) => ({ tmdbId: i.tmdbId!, ...ep })))
      const remoteMovies = remoteItems.filter((i) => i.kind === 'movie' && i.status === 'completed')
      const skippedAnime = remoteItems.filter((i) => i.kind === 'anime' && i.episodes.length > 0).length
      const remoteKeys = new Set<string>([
        ...remoteEpisodes.map((e) => episodeKey(e.tmdbId, e.season, e.episode)),
        ...remoteMovies.flatMap((m) => movieKeys(m)),
      ])
      for (const key of Object.keys(unconfirmed)) if (remoteKeys.has(key)) delete unconfirmed[key]

      const localEpisodes = host.getWatchedEpisodes()
      const localMovieList = host.getWatchedMovies()
      const localKeys = new Set<string>([
        ...localEpisodes.map((e) => episodeKey(e.tmdbId, e.season, e.episode)),
        ...localMovieList.flatMap((m) => movieKeys(m)),
      ])
      guard()
      let pulled = 0
      for (const ep of remoteEpisodes) {
        if (localKeys.has(episodeKey(ep.tmdbId, ep.season, ep.episode))) continue
        host.markEpisodeWatched(ep.tmdbId, ep.season, ep.episode, ep.watchedAt)
        pulled += 1
      }
      for (const movie of remoteMovies) {
        if (movieKeys(movie).some((k) => localKeys.has(k))) continue
        host.markMovieWatched({ tmdbId: movie.tmdbId, imdbId: movie.imdbId, watchedAt: movie.lastWatchedAt })
        pulled += 1
      }
      changes += pulled
      if (skippedAnime) host.log(`sedda: ${skippedAnime} anime-titlar hoppades över (AniDB-numrering)`)

      // Skicka bara i fulla körningar: bara de ser hela fjärrbilden.
      if (full) {
        const now = host.now()
        const blocked = (key: string) => {
          const entry = unconfirmed[key]
          return entry != null && entry.attempts >= UNCONFIRMED_MAX_ATTEMPTS && now - entry.lastAt < UNCONFIRMED_COOLDOWN_MS
        }
        const candidates: Array<{ key: string; push: WatchedPush }> = [
          ...localEpisodes.flatMap((e) => {
            const key = episodeKey(e.tmdbId, e.season, e.episode)
            if (!e.watchedAt || remoteKeys.has(key) || blocked(key)) return []
            return [{ key, push: { kind: 'episode' as const, tmdbId: e.tmdbId, season: e.season, episode: e.episode, watchedAt: e.watchedAt } }]
          }),
          ...localMovieList.flatMap((m) => {
            const keys = movieKeys(m)
            if (keys.length === 0 || !m.watchedAt || keys.some((k) => remoteKeys.has(k)) || blocked(keys[0])) return []
            return [{ key: keys[0], push: { kind: 'movie' as const, tmdbId: m.tmdbId ?? null, imdbId: m.imdbId ?? null, watchedAt: m.watchedAt } }]
          }),
        ]
        if (opts.pushWatched) {
          const batch = candidates.slice(0, WATCHED_PUSH_LIMIT_PER_RUN)
          for (let i = 0; i < batch.length; i += WATCHED_BATCH) {
            must(await api.call('POST', '/sync/history', { body: buildHistoryPayload(batch.slice(i, i + WATCHED_BATCH).map((c) => c.push)) }))
          }
          for (const { key } of batch) unconfirmed[key] = { attempts: (unconfirmed[key]?.attempts ?? 0) + 1, lastAt: now }
          changes += batch.length
          watchedPending = candidates.length > batch.length
          host.log(`sedda: hämtade ${pulled} nya, skickade ${batch.length}${watchedPending ? `, ${candidates.length - batch.length} väntar` : ''}`)
        } else {
          watchedPending = candidates.length > 0
          host.log(`sedda: hämtade ${pulled} nya (bara hämtning${watchedPending ? `, ${candidates.length} väntar` : ''})`)
        }
      } else {
        host.log(`sedda: hämtade ${pulled} nya (löpande)`)
      }
    }

    guard()
    host.writeJson(SNAPSHOT_KEY, {
      version: SNAPSHOT_VERSION,
      accountKey,
      shows: nextShows,
      movies: nextMovies,
      all: activities.all,
      buckets: activities.buckets,
      syncedKinds: { watched: wantWatched, watchlist: wantWatchlist },
      watchedHash: hashKeys(localWatchedKeys(host)),
      watchedPending,
      unconfirmed,
      fullAt: full ? host.now() : snapshot?.fullAt ?? host.now(),
      syncedAt: host.now(),
    } satisfies SyncSnapshot)
    host.log(`synk (${opts.reason}) klar: ${changes} ändringar${full ? ' (full)' : ''}`)
    return { status: 'done', changes }
  } catch (error) {
    if (error instanceof ScopeChanged) {
      host.log(`synk (${opts.reason}) AVBRUTEN: profilen byttes mitt i körningen — inget mer skrivs`)
      return { status: 'skipped', reason: 'profilbyte' }
    }
    if (error instanceof SyncAbort) {
      host.log(`synk (${opts.reason}) AVBRUTEN: ${error.result.error} — snapshot orörd, samma diff försöks igen`)
      return { status: 'failed', error: error.result.error, authFailed: error.result.status === 401 }
    }
    const message = error instanceof Error ? error.message : String(error)
    host.log(`synk (${opts.reason}) AVBRUTEN: ${message}`)
    return { status: 'failed', error: message, authFailed: false }
  } finally {
    running.delete(scope)
  }
}
