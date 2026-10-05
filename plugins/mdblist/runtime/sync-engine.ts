import type { ApiResult, MdblistApi } from './api'
import { parseActivities, parseWatched, parseWatchlist } from './parse'
import { buildWatchedPayload, buildWatchlistPayload, type WatchedPush } from './payloads'
import type { Prefs } from './prefs'
import type { LocalEntry, RemoteEntry } from './types'

export const SNAPSHOT_KEY = 'mdblist_sync_snapshot'
const SNAPSHOT_VERSION = 2
const WATCHED_PUSH_LIMIT_PER_RUN = 100
const WATCHED_BATCH = 100
const FULL_RUN_EVERY_MS = 24 * 60 * 60_000
/** Tom fjärrlista + snapshot större än så här = API-hicka, inte "allt borttaget". */
const EMPTY_REMOTE_GUARD = 15
/** En sedd titel MDBList aldrig bekräftar skickas högst så här många gånger per vecka. */
const UNCONFIRMED_MAX_ATTEMPTS = 2
const UNCONFIRMED_COOLDOWN_MS = 7 * 24 * 60 * 60_000

/**
 * Stämplarna i /sync/last_activities som betyder något för oss. `paused_at`
 * flyttas av våra egna pausscrobbles var 30:e sekund, och betyg, samlingar
 * och listor synkar vi inte — med dem i grinden hade varje körning blivit en
 * full hämtning.
 */
const GATE_KEYS = {
  watched: ['watched_at', 'season_watched_at', 'episode_watched_at'],
  watchlist: ['watchlisted_at'],
} as const

export interface WatchlistPlanLike {
  pushAdds: RemoteEntry[]
  pushRemoves: RemoteEntry[]
  localAdds: RemoteEntry[]
  localRemoveIds: string[]
  nextIds: string[]
}

/** Det motorn behöver av värden. host.ts kopplar in SDK:n; testerna fejkar. */
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
  /** Vilket MDBList-konto synken gäller (`/user`). null = okänt än — då körs ingenting. */
  accountKey(): string | null
  /** Aktiv profil. Byts den mitt i en körning avbryts körningen före nästa lokala skrivning. */
  scopeId(): string | null
}

export interface SyncSnapshot {
  version: number
  /** Kontot snapshoten beskriver. Ett annat konto = ingen snapshot (första synk). */
  accountKey: string
  shows: string[]
  movies: string[]
  activities: Record<string, string>
  /** Vilka slag som var påslagna och synkade — ett nytt reglage räknas som ändrat. */
  syncedKinds: { watched: boolean; watchlist: boolean }
  /** Fingeravtryck av de lokala sedda nycklarna vid senaste körningen. */
  watchedHash: string
  /** Lokala sedda som ännu inte nått MDBList (hämtningskörning eller tak). */
  watchedPending: boolean
  /** Sedda som skickats men aldrig bekräftats: nyckel → försök + senast. */
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
  api: MdblistApi
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

/** Billigt, ordningsoberoende fingeravtryck: antal + summa av en enkel hash per nyckel. */
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

function readSnapshot(host: SyncHost, accountKey: string): SyncSnapshot | null {
  const snap = host.readJson<SyncSnapshot>(SNAPSHOT_KEY)
  if (!snap || snap.version !== SNAPSHOT_VERSION) return null
  if (snap.accountKey !== accountKey) {
    host.log('synk: snapshoten hör till ett annat MDBList-konto — börjar om som första synk')
    return null
  }
  return snap
}

const running = new Set<string>()

export async function runMdblistSync(deps: SyncDeps, opts: { pushWatched: boolean; reason: string }): Promise<SyncOutcome> {
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
  if (api.pausedUntil() > host.now()) return skip('MDBList har bett oss vänta (429)')
  const accountKey = host.accountKey()
  if (!accountKey) return skip('kontot är inte bekräftat än')

  /** Varje lokal skrivning föregås av den här: en körning skriver aldrig i fel profil. */
  const guard = () => { if ((host.scopeId() ?? '') !== scope) throw new ScopeChanged() }

  running.add(scope)
  try {
    const activities = parseActivities(must(await api.call('GET', '/sync/last_activities')))
    const snapshot = readSnapshot(host, accountKey)
    const changed = (keys: readonly string[]) => !snapshot || keys.some((key) => snapshot.activities[key] !== activities[key])
    const localShows = host.getShows()
    const localMovies = host.getMovies()
    const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id))
    const newlyOn = (kind: 'watched' | 'watchlist') => !snapshot || !snapshot.syncedKinds[kind]

    const watchlistDue = wantWatchlist && (
      newlyOn('watchlist')
      || changed(GATE_KEYS.watchlist)
      || !sameSet(localShows.map((e) => e.tmdbId), snapshot?.shows ?? [])
      || !sameSet(localMovies.map((e) => e.tmdbId), snapshot?.movies ?? []))
    const localHash = hashKeys(localWatchedKeys(host))
    const watchedDue = wantWatched && (
      newlyOn('watched')
      || changed(GATE_KEYS.watched)
      || (opts.pushWatched && (snapshot?.watchedPending === true || localHash !== snapshot?.watchedHash)))
    const fullDue = !snapshot || Math.abs(host.now() - snapshot.fullAt) > FULL_RUN_EVERY_MS
    if (!watchlistDue && !watchedDue && !fullDue) {
      host.log(`synk (${opts.reason}): inget nytt — ett anrop`)
      return { status: 'unchanged' }
    }
    const doWatchlist = wantWatchlist && (watchlistDue || fullDue)
    const doWatched = wantWatched && (watchedDue || fullDue)

    let changes = 0
    let nextShows = snapshot?.shows ?? []
    let nextMovies = snapshot?.movies ?? []

    if (doWatchlist) {
      const remote = parseWatchlist(must(await api.getAllPages('/watchlist/items', { limit: 100 })))
      const snapCount = (snapshot?.shows.length ?? 0) + (snapshot?.movies.length ?? 0)
      if (remote.shows.length + remote.movies.length === 0 && snapCount > EMPTY_REMOTE_GUARD) {
        host.log(`watchlist: MDBList svarade tomt men snapshoten har ${snapCount} — hoppar över, raderar inget`)
      } else {
        const showPlan = host.planWatchlistSync(localShows, remote.shows, snapshot?.shows ?? null, 'merge', { keepLocal: true })
        const moviePlan = host.planWatchlistSync(localMovies, remote.movies, snapshot?.movies ?? null, 'merge')
        let pushed = false
        for (const [kind, plan] of [['show', showPlan], ['movie', moviePlan]] as const) {
          if (plan.pushAdds.length) { must(await api.call('POST', '/watchlist/items/add', { body: buildWatchlistPayload(plan.pushAdds, kind) })); pushed = true }
          if (plan.pushRemoves.length) { must(await api.call('POST', '/watchlist/items/remove', { body: buildWatchlistPayload(plan.pushRemoves, kind) })); pushed = true }
          guard()
          for (const entry of plan.localAdds) (kind === 'show' ? host.addShow : host.addMovie)(entry)
          for (const id of plan.localRemoveIds) (kind === 'show' ? host.removeShow : host.removeMovie)(id)
          changes += plan.pushAdds.length + plan.pushRemoves.length + plan.localAdds.length + plan.localRemoveIds.length
          host.log(`watchlist ${kind}: upp +${plan.pushAdds.length}/-${plan.pushRemoves.length}, ner +${plan.localAdds.length}/-${plan.localRemoveIds.length}`)
        }
        // Bekräfta före enighet — men bara om vi skrev något. Annars är första läsningen svaret.
        const confirmed = pushed
          ? parseWatchlist(must(await api.getAllPages('/watchlist/items', { limit: 100 })))
          : remote
        const confirmedShows = new Set(confirmed.shows.map((e) => e.tmdbId))
        const confirmedMovies = new Set(confirmed.movies.map((e) => e.tmdbId))
        nextShows = showPlan.nextIds.filter((id) => confirmedShows.has(id))
        nextMovies = moviePlan.nextIds.filter((id) => confirmedMovies.has(id))
      }
    }

    let watchedPending = snapshot?.watchedPending ?? false
    const unconfirmed = { ...(snapshot?.unconfirmed ?? {}) }
    if (doWatched) {
      const remote = parseWatched(must(await api.getAllPages('/sync/watched', { limit: 1000 })))
      const remoteKeys = new Set<string>([
        ...remote.episodes.map((e) => episodeKey(e.tmdbId, e.season, e.episode)),
        ...remote.movies.flatMap((m) => movieKeys(m)),
      ])
      for (const key of Object.keys(unconfirmed)) if (remoteKeys.has(key)) delete unconfirmed[key]

      // Hämta: bara det som saknas lokalt. En befintlig markering (och dess tid)
      // skrivs aldrig över — annars bytte Trakt- och MDBList-hämtningen tid fram
      // och tillbaka på samma titel, med en mutation per titel och körning.
      const localEpisodes = host.getWatchedEpisodes()
      const localMovieList = host.getWatchedMovies()
      const localKeys = new Set<string>([
        ...localEpisodes.map((e) => episodeKey(e.tmdbId, e.season, e.episode)),
        ...localMovieList.flatMap((m) => movieKeys(m)),
      ])
      guard()
      let pulled = 0
      for (const ep of remote.episodes) {
        if (localKeys.has(episodeKey(ep.tmdbId, ep.season, ep.episode))) continue
        host.markEpisodeWatched(ep.tmdbId, ep.season, ep.episode, ep.watchedAt)
        pulled += 1
      }
      for (const movie of remote.movies) {
        if (movieKeys(movie).some((key) => localKeys.has(key))) continue
        host.markMovieWatched(movie)
        pulled += 1
      }
      changes += pulled

      // Skicka: lokala som saknas hos MDBList. Aldrig en påhittad tid (då blir
      // varje omförsök en ny visning), och aldrig något MDBList vägrat bekräfta
      // två gånger den senaste veckan — annars svälter allt bakom det i kön.
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
          must(await api.call('POST', '/sync/watched', { body: buildWatchedPayload(batch.slice(i, i + WATCHED_BATCH).map((c) => c.push)) }))
        }
        for (const { key } of batch) {
          const prev = unconfirmed[key]
          unconfirmed[key] = { attempts: (prev?.attempts ?? 0) + 1, lastAt: now }
        }
        changes += batch.length
        watchedPending = candidates.length > batch.length
        host.log(`sedda: hämtade ${pulled} nya, skickade ${batch.length}${watchedPending ? `, ${candidates.length - batch.length} väntar` : ''}`)
      } else {
        // Hämtningskörning: det som inte nått MDBList ligger kvar som väntande,
        // så nästa skickande körning inte tror att allt redan är gjort.
        watchedPending = candidates.length > 0
        host.log(`sedda: hämtade ${pulled} nya (bara hämtning${watchedPending ? `, ${candidates.length} väntar på att skickas` : ''})`)
      }
    }

    guard()
    host.writeJson(SNAPSHOT_KEY, {
      version: SNAPSHOT_VERSION,
      accountKey,
      shows: nextShows,
      movies: nextMovies,
      // De FÖRSTA stämplarna: en ändring på mdblist.com under körningen syns
      // då nästa gång. Våra egna skrivningar kostar som mest en extra hämtning.
      activities,
      syncedKinds: { watched: wantWatched, watchlist: wantWatchlist },
      watchedHash: hashKeys(localWatchedKeys(host)),
      watchedPending,
      unconfirmed,
      fullAt: fullDue ? host.now() : snapshot?.fullAt ?? host.now(),
      syncedAt: host.now(),
    } satisfies SyncSnapshot)
    host.log(`synk (${opts.reason}) klar: ${changes} ändringar`)
    return { status: 'done', changes }
  } catch (error) {
    if (error instanceof ScopeChanged) {
      host.log(`synk (${opts.reason}) AVBRUTEN: profilen byttes mitt i körningen — inget mer skrivs`)
      return { status: 'skipped', reason: 'profilbyte' }
    }
    if (error instanceof SyncAbort) {
      const authFailed = error.result.status === 401
      host.log(`synk (${opts.reason}) AVBRUTEN: ${error.result.error} — snapshot orörd, samma diff försöks igen`)
      return { status: 'failed', error: error.result.error, authFailed }
    }
    const message = error instanceof Error ? error.message : String(error)
    host.log(`synk (${opts.reason}) AVBRUTEN: ${message}`)
    return { status: 'failed', error: message, authFailed: false }
  } finally {
    running.delete(scope)
  }
}
