/**
 * Källadaptrar för titelpoolen. Alla beroenden kommer in som parametrar så
 * logiken kan testas utan SDK; host.ts kopplar in de riktiga.
 */
import { DEFAULT_RUNTIME, dedupePool, filterPool, type PoolItem } from './pool'
import type { createMetaCache } from './meta-cache'
import type { ChannelDef, SourceId } from '../model/channel'

export interface LibraryTitleLike {
  key: string
  /** Kärnans index säger 'series'; 'tv' tas emot för tolerans. */
  kind: 'movie' | 'tv' | 'series'
  tmdbId?: number | null
  imdbId?: string | null
  title: string
  year?: number | null
  genres?: string[]
  runtimeMin?: number | null
  posterUrl?: string | null
  backdropUrl?: string | null
  episodes?: Array<{ key: string; season: number; episode: number; title?: string | null; runtimeMin?: number | null }>
}

export interface DebridTitleLike {
  kind: 'movie' | 'tv'
  title: string
  year: number | null
  tmdbId?: number
  imdbId?: string
  files: Array<{ provider: 'realdebrid' | 'torbox' | 'alldebrid'; fileRef: string; season?: number; episode?: number }>
}

interface WatchlistEntry { tmdbId: number; imdbId?: string | null; title: string; posterUrl?: string | null }

export interface SourceDeps {
  /** Kärnans /api/library/query; svaret har även `total`. */
  queryLibrary(q: Record<string, unknown>): Promise<{ items: LibraryTitleLike[]; total?: number }>
  getMovieWatchlist(): WatchlistEntry[]
  getWatchlist(): WatchlistEntry[]
  /** Säsong 1–3 (värden slår ihop /api/tv-info per säsong). */
  fetchSeasons(tmdbId: number): Promise<Array<{ season: number; episodes: Array<{ episode: number; title: string; runtime: number | null }> }>>
  listDebridCloud(): Promise<DebridTitleLike[]>
  meta: ReturnType<typeof createMetaCache>
}

const PAGE = 200 // kärnans MAX_LIMIT per fråga
const MAX_TITLES = 600
const WATCHLIST_SEASONS = 3

/** Känd längd, annars metadatans, annars standard. */
function pickRuntime(known: number | null | undefined, metaMin: number | null | undefined, fallback: number): { runtimeMin: number; runtimeKnown: boolean } {
  if (known != null && known > 0) return { runtimeMin: known, runtimeKnown: true }
  if (metaMin != null && metaMin > 0) return { runtimeMin: metaMin, runtimeKnown: true }
  return { runtimeMin: fallback, runtimeKnown: false }
}

/**
 * `strict`: ett misslyckat hämtförsök kastar i stället för att bli en tom
 * lista, så studion kan skilja "källan är tom" från "källan svarade inte".
 * Kanalens egen pool (loadPool) kör utan och tål källfel som förut.
 */
export interface LoadOptions { strict?: boolean }

/** Varje anrop ersätter källans tidigare lista (bättre metadata, fler avsnitt). */
type Emit = (items: PoolItem[]) => void
type SourceStream = (deps: SourceDeps, emit: Emit, opts?: LoadOptions) => Promise<void>

type MetaRef = { kind: 'movie' | 'tv'; tmdbId: number }
/** Bara titlar utan färsk metadata i cachen; tom lista = ingen berikning behövs. */
const uncached = (deps: SourceDeps, refs: MetaRef[]): MetaRef[] => refs.filter((r) => deps.meta.get(r.kind, r.tmdbId) == null)

/**
 * Metadata ligger aldrig på den kritiska vägen: listan byggs direkt med det
 * som redan finns i cachen (annars standardlängd, runtimeKnown:false), sedan
 * hämtas det som saknas i bakgrunden och listan byggs om EN gång.
 */
async function enrich(deps: SourceDeps, refs: MetaRef[], rebuild: () => void): Promise<void> {
  const missing = uncached(deps, refs)
  if (missing.length === 0) return
  await deps.meta.ensure(missing).catch(() => {})
  rebuild()
}

async function fetchLibraryTitles(deps: SourceDeps, opts: LoadOptions): Promise<LibraryTitleLike[]> {
  const titles: LibraryTitleLike[] = []
  // Kärnan kapar sidan vid 200, så bläddra tills allt (högst 600) är hämtat.
  for (let offset = 0; offset < MAX_TITLES; offset += PAGE) {
    // Fallerar en senare sida behåller vi titlarna från de tidigare.
    const page = await deps.queryLibrary({ kind: 'recent', full: true, limit: PAGE, offset }).catch((err: unknown) => {
      // Bara första sidan räknas som källfel; en senare sida som faller behåller det hämtade.
      if (opts.strict && offset === 0) throw err
      return null
    })
    if (!page) break
    titles.push(...page.items)
    if (page.items.length < PAGE || (page.total != null && titles.length >= page.total)) break
  }
  return titles
}

function buildLibraryItems(titles: LibraryTitleLike[], deps: SourceDeps): PoolItem[] {
  const items: PoolItem[] = []
  for (const t of titles) {
    const tv = t.kind !== 'movie'
    const tmdbId = t.tmdbId ?? undefined
    const meta = tmdbId != null ? deps.meta.get(tv ? 'tv' : 'movie', tmdbId) : null
    const common = {
      source: 'library' as const,
      genres: t.genres?.length ? t.genres : meta?.genres ?? [],
      year: t.year ?? meta?.year ?? null,
      ...(tmdbId != null ? { tmdbId } : {}),
      ...(t.imdbId ? { imdbId: t.imdbId } : meta?.imdbId ? { imdbId: meta.imdbId } : {}),
      ...(t.posterUrl ?? meta?.posterUrl ? { posterUrl: (t.posterUrl ?? meta?.posterUrl)! } : {}),
      ...(t.backdropUrl ?? meta?.backdropUrl ? { backdropUrl: (t.backdropUrl ?? meta?.backdropUrl)! } : {}),
    }
    if (!tv) {
      items.push({
        ...common, ref: `lib:${t.key}`, title: t.title, kind: 'movie',
        ...pickRuntime(t.runtimeMin, meta?.runtimeMin, DEFAULT_RUNTIME.movie),
        play: { type: 'library', key: t.key, mediaType: 'movie' },
      })
      continue
    }
    for (const ep of t.episodes ?? []) {
      items.push({
        ...common, ref: `lib:${t.key}:${ep.key}`, title: ep.title || t.title, seriesTitle: t.title, kind: 'episode',
        seriesKey: `lib:${t.key}`, season: ep.season, episode: ep.episode,
        ...pickRuntime(ep.runtimeMin ?? t.runtimeMin, meta?.runtimeMin, DEFAULT_RUNTIME.episode),
        play: { type: 'library', key: t.key, mediaType: 'tv', season: ep.season, episode: ep.episode },
      })
    }
  }
  return items
}

export const streamLibraryItems: SourceStream = async (deps, emit, opts = {}) => {
  const titles = await fetchLibraryTitles(deps, opts)
  emit(buildLibraryItems(titles, deps))
  // Plex och WebDAV sätter sällan runtimeMin: hämta längd via metadata för titlar som saknar den.
  const lacking = titles.filter((t) => t.tmdbId != null && (t.kind === 'movie' ? !(t.runtimeMin! > 0) : !(t.runtimeMin! > 0) && (t.episodes ?? []).some((e) => !(e.runtimeMin! > 0))))
  await enrich(deps, lacking.map((t) => ({ kind: t.kind === 'movie' ? 'movie' as const : 'tv' as const, tmdbId: t.tmdbId! })), () => emit(buildLibraryItems(titles, deps)))
}

function buildWatchlistMovies(movies: WatchlistEntry[], deps: SourceDeps): PoolItem[] {
  const items: PoolItem[] = []
  for (const m of movies) {
    const meta = deps.meta.get('movie', m.tmdbId)
    const imdbId = m.imdbId || meta?.imdbId
    if (!imdbId) continue
    const poster = m.posterUrl ?? meta?.posterUrl
    items.push({
      ref: `wl:movie:${m.tmdbId}`, title: m.title, kind: 'movie', source: 'watchlist',
      genres: meta?.genres ?? [], year: meta?.year ?? null, tmdbId: m.tmdbId, imdbId,
      ...(poster ? { posterUrl: poster } : {}),
      ...(meta?.backdropUrl ? { backdropUrl: meta.backdropUrl } : {}),
      ...pickRuntime(null, meta?.runtimeMin, DEFAULT_RUNTIME.movie),
      play: { type: 'stream', imdbId, mediaType: 'movie' },
    })
  }
  return items
}

/**
 * Filmerna syns direkt; serierna kräver säsongslistor (upp till tre
 * tv-info-anrop per serie) och läggs till när alla är hämtade.
 */
export const streamWatchlistItems: SourceStream = async (deps, emit) => {
  const movies = deps.getMovieWatchlist()
  const shows = deps.getWatchlist()
  const perShow: PoolItem[][] = shows.map(() => [])
  const build = () => [...buildWatchlistMovies(movies, deps), ...perShow.flat()]
  emit(build())
  await enrich(deps, [
    ...movies.map((m) => ({ kind: 'movie' as const, tmdbId: m.tmdbId })),
    ...shows.map((s) => ({ kind: 'tv' as const, tmdbId: s.tmdbId })),
  ], () => emit(build()))
  if (shows.length === 0) return
  // Högst två serier åt gången mot /api/tv-info (fetchSeasons cachar själv).
  let cursor = 0
  const worker = async () => {
    while (cursor < shows.length) {
      const idx = cursor++
      const s = shows[idx]!
      const out = perShow[idx]!
      const meta = deps.meta.get('tv', s.tmdbId)
      const imdbId = s.imdbId || meta?.imdbId
      if (!imdbId) continue
      const seasons = await deps.fetchSeasons(s.tmdbId).catch(() => [])
      const poster = s.posterUrl ?? meta?.posterUrl
      for (const season of seasons) {
        if (season.season < 1 || season.season > WATCHLIST_SEASONS) continue
        for (const ep of season.episodes) {
          out.push({
            ref: `wl:tv:${s.tmdbId}:${season.season}:${ep.episode}`, title: ep.title || s.title, seriesTitle: s.title,
            kind: 'episode', source: 'watchlist', seriesKey: `wl:tv:${s.tmdbId}`, season: season.season, episode: ep.episode,
            genres: meta?.genres ?? [], year: meta?.year ?? null, tmdbId: s.tmdbId, imdbId,
            ...(poster ? { posterUrl: poster } : {}),
            ...(meta?.backdropUrl ? { backdropUrl: meta.backdropUrl } : {}),
            ...pickRuntime(ep.runtime, meta?.runtimeMin, DEFAULT_RUNTIME.episode),
            play: { type: 'stream', imdbId, mediaType: 'series', season: season.season, episode: ep.episode },
          })
        }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(2, shows.length) }, worker))
  emit(build())
}

function buildDebridItems(titles: DebridTitleLike[], deps: SourceDeps): PoolItem[] {
  const items: PoolItem[] = []
  for (const t of titles) {
    const tv = t.kind === 'tv'
    const meta = t.tmdbId != null ? deps.meta.get(t.kind, t.tmdbId) : null
    const imdbId = t.imdbId ?? meta?.imdbId
    for (const f of t.files) {
      items.push({
        ref: `db:${f.provider}:${f.fileRef}`, title: t.title, kind: tv ? 'episode' : 'movie', source: 'debrid',
        genres: meta?.genres ?? [], year: t.year ?? meta?.year ?? null,
        ...(t.tmdbId != null ? { tmdbId: t.tmdbId } : {}),
        ...(imdbId ? { imdbId } : {}),
        ...(meta?.posterUrl ? { posterUrl: meta.posterUrl } : {}),
        ...(meta?.backdropUrl ? { backdropUrl: meta.backdropUrl } : {}),
        ...(tv ? { seriesTitle: t.title, seriesKey: `db:tv:${t.tmdbId ?? t.title}`, ...(f.season != null ? { season: f.season } : {}), ...(f.episode != null ? { episode: f.episode } : {}) } : {}),
        ...pickRuntime(null, meta?.runtimeMin, tv ? DEFAULT_RUNTIME.episode : DEFAULT_RUNTIME.movie),
        play: { type: 'debrid', provider: f.provider, fileRef: f.fileRef },
      })
    }
  }
  return items
}

export const streamDebridItems: SourceStream = async (deps, emit) => {
  const titles = await deps.listDebridCloud()
  emit(buildDebridItems(titles, deps))
  await enrich(deps, titles.filter((t) => t.tmdbId != null).map((t) => ({ kind: t.kind, tmdbId: t.tmdbId! })), () => emit(buildDebridItems(titles, deps)))
}

/** Hela källan på en gång (studions förhandsvisning): sista listan när allt är klart. */
async function collect(stream: SourceStream, deps: SourceDeps, opts: LoadOptions): Promise<PoolItem[]> {
  let last: PoolItem[] = []
  try {
    await stream(deps, (items) => { last = items }, opts)
  } catch (err) {
    if (opts.strict) throw err
  }
  return last
}

export const loadLibraryItems = (deps: SourceDeps, opts: LoadOptions = {}) => collect(streamLibraryItems, deps, opts)
export const loadWatchlistItems = (deps: SourceDeps, opts: LoadOptions = {}) => collect(streamWatchlistItems, deps, opts)
export const loadDebridItems = (deps: SourceDeps, opts: LoadOptions = {}) => collect(streamDebridItems, deps, opts)

const STREAMS: Record<SourceId, SourceStream> = {
  library: streamLibraryItems, watchlist: streamWatchlistItems, debrid: streamDebridItems,
}

/**
 * En pågående källhämtning, delad av alla kanaler som laddar samtidigt: tio
 * kanaler som öppnas på en gång ger ett bibliotekssvep, en watchlistgenomgång
 * och en debridlistning — inte tio av varje. Bara pågående hämtningar delas;
 * en kanal som laddar senare (ny källsignatur) får en ny hämtning.
 */
interface SharedRun { latest: PoolItem[] | null; listeners: Set<Emit>; done: Promise<void> }
const sharedRuns = new WeakMap<SourceDeps, Map<SourceId, SharedRun>>()

function runShared(source: SourceId, deps: SourceDeps, emit: Emit): Promise<void> {
  let runs = sharedRuns.get(deps)
  if (!runs) { runs = new Map(); sharedRuns.set(deps, runs) }
  const existing = runs.get(source)
  if (existing) {
    existing.listeners.add(emit)
    if (existing.latest) emit(existing.latest)
    return existing.done.finally(() => { existing.listeners.delete(emit) })
  }
  const map = runs
  // Lyssnaren först: watchlist levererar synkront innan första await.
  const run: SharedRun = { latest: null, listeners: new Set([emit]), done: Promise.resolve() }
  map.set(source, run)
  run.done = STREAMS[source](deps, (items) => {
    run.latest = items
    for (const fn of [...run.listeners]) fn(items)
  }).finally(() => {
    if (map.get(source) === run) map.delete(source)
    run.listeners.delete(emit)
  })
  return run.done
}

/**
 * Laddar kanalens källor oberoende av varandra. `onUpdate` får den
 * sammanslagna poolen (dubblettrensad + filtrerad) varje gång en källa
 * levererar eller berikas; löftet ger den slutliga poolen när alla källor och
 * all berikning är klara. Sammanslagningen går alltid i kanalens källordning,
 * så slutpoolen blir densamma oavsett vilken källa som svarar först.
 *
 * Längdfiltret: titlar med okänd längd prövas mot standardlängden (film 100,
 * avsnitt 45) även medan berikningen pågår. Standardvärdena hamnar i den klass
 * en titel av sitt slag oftast tillhör, så de provisoriska träffarna är de
 * troliga — hellre det än att t.ex. en kortfilmskanal tillfälligt visar
 * spelfilmer som sedan försvinner när längden blir känd.
 */
export async function loadPoolProgressive(channel: ChannelDef, deps: SourceDeps, onUpdate?: (pool: PoolItem[]) => void): Promise<PoolItem[]> {
  const bySource = new Map<SourceId, PoolItem[]>()
  const merged = () => filterPool(dedupePool(channel.sources.flatMap((s) => bySource.get(s) ?? [])), channel)
  await Promise.all(channel.sources.map((s) =>
    runShared(s, deps, (items) => {
      bySource.set(s, items)
      onUpdate?.(merged())
    }).catch(() => {}),
  ))
  return merged()
}

export function loadPool(channel: ChannelDef, deps: SourceDeps): Promise<PoolItem[]> {
  return loadPoolProgressive(channel, deps)
}
