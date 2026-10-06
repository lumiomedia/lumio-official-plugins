import type { Prefs } from '../../_shared/tracker-kit/prefs'
import type { ApiResult, SimklApi } from './api'
import { parseActivities, parseAllItems, type SimklItem } from './parse'
import { buildAddToListPayload, buildHistoryPayload, buildRemovePayload, type WatchedPush } from './payloads'
import type { LocalEntry, RemoteEntry } from './types'

export const SNAPSHOT_KEY = 'simkl_sync_snapshot'
/** Misslyckade körningar i rad — styr backoffen. Enhetslokal, som snapshoten. */
export const FAILURE_KEY = 'simkl_sync_failure'
const SNAPSHOT_VERSION = 2
const WATCHED_PUSH_LIMIT_PER_RUN = 100
const WATCHED_BATCH = 100
const FULL_RUN_EVERY_MS = 24 * 60 * 60_000
const EMPTY_REMOTE_GUARD = 15
/** Under så här stor andel poster med tmdb litar vi inte på att en saknad post är borttagen. */
const MIN_TMDB_COVERAGE = 0.9
const UNCONFIRMED_MAX_ATTEMPTS = 2
const UNCONFIRMED_COOLDOWN_MS = 7 * 24 * 60 * 60_000
const BACKOFF_BASE_MS = 15 * 60_000
const BACKOFF_MAX_MS = 6 * 60 * 60_000
/** Under så här många kvarvarande dagsanrop avstår synken — scrobble får resten. */
const QUOTA_FLOOR = 50

/** Hinkarna i /sync/activities som rör följlistan respektive sedda titlar. */
const WATCHLIST_BUCKETS = [
  ...['tv_shows', 'anime'].flatMap((t) => ['watching', 'plantowatch', 'completed', 'hold', 'dropped', 'removed_from_list'].map((s) => `${t}.${s}`)),
  ...['plantowatch', 'completed', 'dropped', 'removed_from_list'].map((s) => `movies.${s}`),
]
const WATCHED_BUCKETS = ['tv_shows.all', 'anime.all', 'movies.all']
const REMOVED_BUCKETS = ['tv_shows', 'anime', 'movies'].map((t) => `${t}.removed_from_list`)

/** Avsnitt för alla statusar, men bara de som faktiskt registrerats (inga påhittade rader). */
const EPISODE_QUERY = { extended: 'full', episode_watched_at: 'yes', include_all_episodes: 'original' }

/**
 * SIMKL:s status per titel, nyckel `m:<tmdb>` eller `s:<tmdb>` (serier och
 * anime). Hålls ajour med deltan — följlistan, bryggan och listraderna läser
 * härifrån i stället för att hämta hela biblioteket.
 */
export type RemoteRow = { st: string; k: 'm' | 's' | 'a'; t: string; i?: string }
export type RemoteMap = Record<string, RemoteRow>
export const remoteKey = (kind: 'movie' | 'show', tmdbId: string) => `${kind === 'movie' ? 'm' : 's'}:${tmdbId}`
/** TMDb har skilda id-serier för filmer och serier — en anime-film är en film. */
const isFilm = (item: SimklItem) => item.kind === 'movie' || (item.kind === 'anime' && item.animeType === 'movie')
const itemKey = (item: SimklItem) => remoteKey(isFilm(item) ? 'movie' : 'show', item.tmdbId!)
/** Synka nu gör ingen ny baslinje om den senaste är färskare än så här. */
const MANUAL_BASELINE_MIN_MS = 10 * 60_000

/** Statusar där en serie inte ska få sina lokala avsnitt skickade (de skulle flytta den till Tittar på). */
const NO_EPISODE_PUSH = new Set(['completed', 'dropped', 'hold'])

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
  remote: RemoteMap
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

const rowEntry = (tmdbId: string, row: RemoteRow): RemoteEntry => ({ tmdbId, imdbId: row.i ?? null, title: row.t, posterUrl: null })

/** Poster utan tmdb får det via imdb, ur lokala listor eller kartan. Resten kan Lumio inte para ihop. */
function resolveTmdb(items: SimklItem[], byImdb: Map<string, string>): SimklItem[] {
  return items.map((item) => (item.tmdbId || !item.imdbId || !byImdb.has(item.imdbId) ? item : { ...item, tmdbId: byImdb.get(item.imdbId)! }))
}

function toRows(items: SimklItem[]): RemoteMap {
  const map: RemoteMap = {}
  for (const item of items) {
    if (!item.tmdbId || !item.status) continue
    const row: RemoteRow = { st: item.status, k: item.kind === 'movie' ? 'm' : item.kind === 'anime' ? 'a' : 's', t: item.title }
    if (item.imdbId) row.i = item.imdbId
    map[itemKey(item)] = row
  }
  return map
}

/** Litar vi på att det som saknas i en hel lista verkligen är borttaget hos SIMKL? */
function trustedListing(items: SimklItem[], previous: number): boolean {
  if (items.length === 0) return previous <= EMPTY_REMOTE_GUARD
  return items.filter((i) => i.tmdbId).length / items.length >= MIN_TMDB_COVERAGE
}

/** Statuskartan ur en baslinje-hämtning (alla statusar, utan avsnitt). Ett anrop. */
export function buildRemoteMap(data: unknown): RemoteMap {
  return toRows(parseAllItems(data))
}

const running = new Set<string>()

/**
 * Hela biblioteket — bara på första synken, en gång per dygn och vid Synka nu.
 * Med avsnitt om sedda synkas; säger SIMKL 400 max_items delas det per typ, och
 * räcker inte det blir det statusar utan avsnitt (sedda väntar till nästa dygn).
 */
async function fetchBaseline(api: SimklApi, withEpisodes: boolean, log: (m: string) => void): Promise<{ items: SimklItem[]; episodes: boolean }> {
  if (withEpisodes) {
    const all = await api.call<unknown>('GET', '/sync/all-items/all/all', { query: EPISODE_QUERY })
    if (all.ok) return { items: parseAllItems(all.data), episodes: true }
    if (all.status !== 400) throw new SyncAbort(all)
    const parts: SimklItem[] = []
    let complete = true
    for (const type of ['movies', 'shows', 'anime']) {
      const part = await api.call<unknown>('GET', `/sync/all-items/${type}/all`, { query: EPISODE_QUERY })
      if (part.ok) { parts.push(...parseAllItems(part.data)); continue }
      if (part.status !== 400) throw new SyncAbort(part)
      complete = false
      break
    }
    if (complete) return { items: parts, episodes: true }
    log('synk: biblioteket är för stort för avsnitt (max_items) — bara statusar den här gången')
  }
  return { items: parseAllItems(must(await api.call<unknown>('GET', '/sync/all-items/all/all'))), episodes: false }
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
  // Ett fel som består (500, max_items, 401) ska inte kosta två anrop per tick
  // hela dygnet. Synka nu går förbi — det är ett enstaka, avsiktligt försök.
  const failure = host.readJson<{ count: number; at: number }>(FAILURE_KEY)
  if (failure && !opts.full) {
    const wait = Math.min(BACKOFF_BASE_MS * 2 ** failure.count, BACKOFF_MAX_MS)
    if (host.now() - failure.at < wait) return skip(`${failure.count} misslyckade körningar i rad — väntar`)
  }

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

    // Grundhämtning: första synken, en gång per dygn, Synka nu, eller när
    // sedda just slagits på (avsnitten behöver en baslinje). Annars deltan.
    // Synka nu tätt efter en baslinje blir en vanlig deltakörning — upprepade
    // tryck ska inte hämta hela biblioteket gång på gång.
    const manualBaseline = opts.full === true && !(snapshot && Math.abs(host.now() - snapshot.fullAt) < MANUAL_BASELINE_MIN_MS)
    const baseline = manualBaseline || !snapshot || !snapshot.all
      || Math.abs(host.now() - snapshot.fullAt) > FULL_RUN_EVERY_MS
      || (wantWatched && newlyOn('watched'))
    const remoteMoved = moved([...WATCHLIST_BUCKETS, ...WATCHED_BUCKETS])
    const localChanged = wantWatchlist && (newlyOn('watchlist')
      || !sameSet(localShows.map((e) => e.tmdbId), snapshot?.shows ?? [])
      || !sameSet(localMovies.map((e) => e.tmdbId), snapshot?.movies ?? []))
    if (!baseline && !remoteMoved && !localChanged) {
      host.log(`synk (${opts.reason}): inget nytt — ett anrop`)
      return { status: 'unchanged' }
    }

    const previous = snapshot?.remote ?? {}
    const byImdb = new Map<string, string>()
    for (const e of [...localShows, ...localMovies]) if (e.imdbId) byImdb.set(e.imdbId, e.tmdbId)
    for (const [key, row] of Object.entries(previous)) if (row.i) byImdb.set(row.i, key.slice(2))

    let remote: RemoteMap = previous
    /** Nycklar som en betrodd hel lista visade är borttagna hos SIMKL just nu. */
    const removedNow = new Set<string>()
    let episodeItems: SimklItem[] | null = null
    let episodesComplete = false

    if (baseline) {
      const fetched = await fetchBaseline(api, wantWatched, host.log)
      const items = resolveTmdb(fetched.items, byImdb)
      const rows = toRows(items)
      if (trustedListing(items, Object.keys(previous).length)) {
        for (const key of Object.keys(previous)) if (!rows[key]) removedNow.add(key)
        remote = rows
      } else {
        host.log(`synk: ${items.length} poster, för få med tmdb — inget räknas som borttaget`)
        remote = { ...previous, ...rows }
      }
      if (fetched.episodes) { episodeItems = items; episodesComplete = true }
    } else if (remoteMoved) {
      const query: Record<string, string> = { date_from: snapshot!.all!, ...(wantWatched ? EPISODE_QUERY : {}) }
      const delta = resolveTmdb(parseAllItems(must(await api.call<unknown>('GET', '/sync/all-items', { query }))), byImdb)
      remote = { ...previous, ...toRows(delta) }
      if (wantWatched) episodeItems = delta
      // Det som tagits bort helt syns inte i ett delta — bara i en id-lista.
      if (moved(REMOVED_BUCKETS)) {
        const listed = resolveTmdb(parseAllItems(must(await api.call<unknown>('GET', '/sync/all-items/all/all', { query: { extended: 'ids_only' } }))), byImdb)
        if (trustedListing(listed, Object.keys(remote).length)) {
          const present = new Set(listed.filter((i) => i.tmdbId).map(itemKey))
          remote = Object.fromEntries(Object.entries(remote).filter(([key]) => {
            if (present.has(key)) return true
            removedNow.add(key)
            return false
          }))
        }
      }
    }

    let changes = 0
    let nextShows = snapshot?.shows ?? []
    let nextMovies = snapshot?.movies ?? []

    if (wantWatchlist) {
      const localShowIds = new Set(localShows.map((e) => e.tmdbId))
      const rows = Object.entries(remote)
      // Följlistan hos SIMKL: Tittar på + Planerar. En KLAR serie räknas som kvar
      // om den redan följs lokalt (raderas inte, skickas inte tillbaka) men
      // importeras inte. Avbruten eller pausad hos SIMKL = ett aktivt val, och
      // serien lämnar följlistan — därför ingen keepLocal här, till skillnad från
      // Trakt, som tar bort serier av sig själv när man tittar.
      const remoteShows = rows
        .filter(([key, r]) => key.startsWith('s:') && (r.st === 'watching' || r.st === 'plantowatch' || (r.st === 'completed' && localShowIds.has(key.slice(2)))))
        .map(([key, r]) => rowEntry(key.slice(2), r))
      const remoteMovies = rows.filter(([key, r]) => key.startsWith('m:') && r.st === 'plantowatch').map(([key, r]) => rowEntry(key.slice(2), r))

      const showPlan = host.planWatchlistSync(localShows, remoteShows, snapshot?.shows ?? null, 'merge')
      const moviePlan = host.planWatchlistSync(localMovies, remoteMovies, snapshot?.movies ?? null, 'merge')
      // Första synken: det SIMKL redan har med en annan status (pausad, klar
      // film …) är inte "saknat" — att skicka det hade skrivit över valet.
      // Lokalt tas bara bort det SIMKL faktiskt visat med en annan status eller
      // som en betrodd lista visat borttaget — aldrig det SIMKL inte kan para ihop.
      const firstSync = !snapshot
      const known = (kind: 'movie' | 'show') => (e: RemoteEntry) => !firstSync || !remote[remoteKey(kind, e.tmdbId)]
      const removable = (kind: 'movie' | 'show') => (id: string) => remote[remoteKey(kind, id)] != null || removedNow.has(remoteKey(kind, id))
      showPlan.pushAdds = showPlan.pushAdds.filter(known('show'))
      moviePlan.pushAdds = moviePlan.pushAdds.filter(known('movie'))
      const keptShows = showPlan.localRemoveIds.filter((id) => !removable('show')(id))
      const keptMovies = moviePlan.localRemoveIds.filter((id) => !removable('movie')(id))
      showPlan.localRemoveIds = showPlan.localRemoveIds.filter(removable('show'))
      moviePlan.localRemoveIds = moviePlan.localRemoveIds.filter(removable('movie'))
      if (keptShows.length + keptMovies.length) host.log(`watchlist: ${keptShows.length + keptMovies.length} saknas hos SIMKL utan att kunna paras ihop — ligger kvar`)

      const watchedShowIds = new Set(host.getWatchedEpisodes().map((e) => e.tmdbId))
      const locallyWatchedMovie = (e: RemoteEntry) => host.getWatchedMovies().some((m) => m.tmdbId === e.tmdbId || (e.imdbId && m.imdbId === e.imdbId))

      const started = showPlan.pushAdds.filter((e) => watchedShowIds.has(e.tmdbId))
      const planned = showPlan.pushAdds.filter((e) => !watchedShowIds.has(e.tmdbId))
      if (started.length) must(await api.call('POST', '/sync/add-to-list', { body: buildAddToListPayload(started, 'show', 'watching') }))
      if (planned.length) must(await api.call('POST', '/sync/add-to-list', { body: buildAddToListPayload(planned, 'show', 'plantowatch') }))
      if (showPlan.pushRemoves.length) must(await api.call('POST', '/sync/add-to-list', { body: buildAddToListPayload(showPlan.pushRemoves, 'show', 'dropped') }))
      if (moviePlan.pushAdds.length) must(await api.call('POST', '/sync/add-to-list', { body: buildAddToListPayload(moviePlan.pushAdds, 'movie', 'plantowatch') }))
      // pushRemoves kommer ur kartan med status Planerar — en history/remove
      // raderar alltså bara ett osett watchlist-tillägg, aldrig historik.
      const watchedRemoved = moviePlan.pushRemoves.filter(locallyWatchedMovie)
      const plainRemoved = moviePlan.pushRemoves.filter((e) => !locallyWatchedMovie(e))
      if (watchedRemoved.length) must(await api.call('POST', '/sync/add-to-list', { body: buildAddToListPayload(watchedRemoved, 'movie', 'completed') }))
      if (plainRemoved.length) must(await api.call('POST', '/sync/history/remove', { body: buildRemovePayload(plainRemoved, 'movie') }))

      // Det vi just skickat speglas i kartan, så att nästa delta inte tolkas fel.
      const pushed = remote === previous ? { ...remote } : remote
      for (const e of started) pushed[remoteKey('show', e.tmdbId)] = { st: 'watching', k: 's', t: e.title, ...(e.imdbId ? { i: e.imdbId } : {}) }
      for (const e of planned) pushed[remoteKey('show', e.tmdbId)] = { st: 'plantowatch', k: 's', t: e.title, ...(e.imdbId ? { i: e.imdbId } : {}) }
      for (const e of showPlan.pushRemoves) if (pushed[remoteKey('show', e.tmdbId)]) pushed[remoteKey('show', e.tmdbId)] = { ...pushed[remoteKey('show', e.tmdbId)], st: 'dropped' }
      for (const e of moviePlan.pushAdds) pushed[remoteKey('movie', e.tmdbId)] = { st: 'plantowatch', k: 'm', t: e.title, ...(e.imdbId ? { i: e.imdbId } : {}) }
      for (const e of watchedRemoved) if (pushed[remoteKey('movie', e.tmdbId)]) pushed[remoteKey('movie', e.tmdbId)] = { ...pushed[remoteKey('movie', e.tmdbId)], st: 'completed' }
      for (const e of plainRemoved) delete pushed[remoteKey('movie', e.tmdbId)]
      remote = pushed

      guard()
      for (const entry of showPlan.localAdds) host.addShow(entry)
      for (const id of showPlan.localRemoveIds) host.removeShow(id)
      for (const entry of moviePlan.localAdds) host.addMovie(entry)
      for (const id of moviePlan.localRemoveIds) host.removeMovie(id)
      for (const [kind, plan] of [['serier', showPlan], ['filmer', moviePlan]] as const) {
        changes += plan.pushAdds.length + plan.pushRemoves.length + plan.localAdds.length + plan.localRemoveIds.length
        host.log(`watchlist ${kind}: upp +${plan.pushAdds.length}/-${plan.pushRemoves.length}, ner +${plan.localAdds.length}/-${plan.localRemoveIds.length}`)
      }
      // Det som inte kunde paras ihop ligger kvar lokalt och därmed i snapshoten.
      nextShows = [...showPlan.nextIds, ...keptShows.filter((id) => !showPlan.nextIds.includes(id))]
      nextMovies = [...moviePlan.nextIds, ...keptMovies.filter((id) => !moviePlan.nextIds.includes(id))]
    }

    let watchedPending = snapshot?.watchedPending ?? false
    const unconfirmed = { ...(snapshot?.unconfirmed ?? {}) }
    if (wantWatched && episodeItems) {
      // Anime-avsnitt numreras av SIMKL enligt AniDB — de skulle markera fel
      // avsnitt lokalt och hämtas därför inte (v1). Filmer och serier gör det.
      const remoteEpisodes = episodeItems.filter((i) => i.kind === 'show' && i.tmdbId)
        .flatMap((i) => i.episodes.map((ep) => ({ tmdbId: i.tmdbId!, ...ep })))
      const remoteMovies = episodeItems.filter((i) => i.kind === 'movie' && i.status === 'completed')
      const skippedAnime = episodeItems.filter((i) => i.kind === 'anime' && i.episodes.length > 0).length
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

      // Skicka bara efter en hel baslinje med avsnitt: bara den ser hela fjärrbilden.
      if (episodesComplete) {
        const now = host.now()
        const blocked = (key: string) => {
          const entry = unconfirmed[key]
          return entry != null && entry.attempts >= UNCONFIRMED_MAX_ATTEMPTS && now - entry.lastAt < UNCONFIRMED_COOLDOWN_MS
        }
        // En klar, pausad eller avbruten serie hos SIMKL får inga avsnitt: en
        // history-post hade flyttat den till Tittar på och ångrat användarens val.
        const settled = (tmdbId: string) => NO_EPISODE_PUSH.has(remote[remoteKey('show', tmdbId)]?.st ?? '')
        const candidates: Array<{ key: string; push: WatchedPush }> = [
          ...localEpisodes.flatMap((e) => {
            const key = episodeKey(e.tmdbId, e.season, e.episode)
            if (!e.watchedAt || remoteKeys.has(key) || blocked(key) || settled(e.tmdbId)) return []
            return [{ key, push: { kind: 'episode' as const, tmdbId: e.tmdbId, season: e.season, episode: e.episode, watchedAt: e.watchedAt } }]
          }),
          ...localMovieList.flatMap((m) => {
            const keys = movieKeys(m)
            if (keys.length === 0 || !m.watchedAt || keys.some((k) => remoteKeys.has(k)) || blocked(keys[0])) return []
            if (m.tmdbId && remote[remoteKey('movie', m.tmdbId)]?.st === 'dropped') return []
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
      remote,
      syncedKinds: { watched: wantWatched && (episodesComplete || (snapshot?.syncedKinds.watched ?? false)), watchlist: wantWatchlist },
      watchedHash: hashKeys(localWatchedKeys(host)),
      watchedPending,
      unconfirmed,
      fullAt: baseline ? host.now() : snapshot?.fullAt ?? host.now(),
      syncedAt: host.now(),
    } satisfies SyncSnapshot)
    if (failure) host.writeJson(FAILURE_KEY, null)
    host.log(`synk (${opts.reason}) klar: ${changes} ändringar${baseline ? ' (baslinje)' : ''}`)
    return { status: 'done', changes }
  } catch (error) {
    if (error instanceof ScopeChanged) {
      host.log(`synk (${opts.reason}) AVBRUTEN: profilen byttes mitt i körningen — inget mer skrivs`)
      return { status: 'skipped', reason: 'profilbyte' }
    }
    host.writeJson(FAILURE_KEY, { count: (failure?.count ?? 0) + 1, at: host.now() })
    if (error instanceof SyncAbort) {
      host.log(`synk (${opts.reason}) AVBRUTEN: ${error.result.error} — snapshot orörd, nytt försök efter backoff`)
      return { status: 'failed', error: error.result.error, authFailed: error.result.status === 401 }
    }
    const message = error instanceof Error ? error.message : String(error)
    host.log(`synk (${opts.reason}) AVBRUTEN: ${message}`)
    return { status: 'failed', error: message, authFailed: false }
  } finally {
    running.delete(scope)
  }
}
