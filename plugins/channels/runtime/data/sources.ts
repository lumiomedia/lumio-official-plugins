/**
 * Källadaptrar för titelpoolen. Alla beroenden kommer in som parametrar så
 * logiken kan testas utan SDK; host.ts kopplar in de riktiga.
 */
import { applyChannelRules, DEFAULT_RUNTIME, dedupePool, restrictToTitles, type PoolItem } from './pool'
import type { createMetaCache, createTitleMatchCache, MatchRef, SeasonList } from './meta-cache'
import { cleanTitle, looksLikeEpisode } from './title-clean'
import { hasTitles, type ChannelDef, type ChannelTitle, type SourceId } from '../model/channel'

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
  /** Biblioteksindexets källa(or); en sammanslagen titel listar alla. */
  sourceId?: string
  sources?: string[]
}

/** IPTV/Xtream-VOD-katalogen i biblioteket (källid xtream-vod:…). */
export const isVodSourceId = (id: string): boolean => id.startsWith('xtream-vod:')

/**
 * Vilka av kanalens bibliotekskällor titeln hör till: 'library' om den har
 * någon version utanför VOD-katalogen, 'vod' om den har någon VOD-version.
 * En sammanslagen titel hör till båda (dubblettrensningen tar en); uppslaget
 * släpper ändå VOD-versionen när kanalen inte har VOD (allowCatalog).
 */
export function librarySides(t: Pick<LibraryTitleLike, 'sourceId' | 'sources'>): { library: boolean; vod: boolean } {
  const ids = t.sources && t.sources.length > 0 ? t.sources : t.sourceId ? [t.sourceId] : []
  if (ids.length === 0) return { library: true, vod: false }
  return { library: ids.some((id) => !isVodSourceId(id)), vod: ids.some(isVodSourceId) }
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
  /**
   * Säsong 4 och framåt (för en utvald serie som inte finns i någon källa).
   * Cachas som fetchSeasons; hämtas i bakgrunden efter de tre första.
   */
  fetchRestSeasons?(tmdbId: number): Promise<SeasonList>
  listDebridCloud(): Promise<DebridTitleLike[]>
  meta: ReturnType<typeof createMetaCache>
  /**
   * Värdens startgrind (waitForStartIdle): nätverkstungt poolbygge —
   * watchlist, debrid och metadataberikning — väntar här så det aldrig
   * konkurrerar med en filmstart. Biblioteket (lokalt index) väntar inte.
   */
  waitForIdle?(): Promise<void>
  /** Namnmatchning för poster utan tmdbId (tvättad titel + år → tmdbId). */
  titleMatch?: Pick<ReturnType<typeof createTitleMatchCache>, 'get' | 'ensure'>
}

/** Matchningsnyckel för en post utan tmdbId; null för avsnittsliknande namn (matchas inte som titel). */
function matchRef(kind: 'movie' | 'tv', rawTitle: string, year: number | null | undefined): MatchRef | null {
  if (kind === 'movie' && looksLikeEpisode(rawTitle)) return null
  return { kind, title: cleanTitle(rawTitle), year: year ?? null }
}

/** tmdbId: källans egen, annars en sparad namnträff. */
function resolvedId(deps: SourceDeps, kind: 'movie' | 'tv', own: number | null | undefined, rawTitle: string, year: number | null | undefined): number | undefined {
  if (own != null) return own
  const ref = matchRef(kind, rawTitle, year)
  const hit = ref ? deps.titleMatch?.get(ref) : undefined
  return typeof hit === 'number' ? hit : undefined
}

/**
 * Namnmatchning i bakgrunden (bakom startgrinden). Sant om något nytt
 * kan ha matchats — då ska listan byggas om.
 */
async function matchUnmatched(deps: SourceDeps, refs: Array<MatchRef | null>): Promise<boolean> {
  const tm = deps.titleMatch
  if (!tm) return false
  const todo = refs.filter((r): r is MatchRef => r != null && tm.get(r) === undefined)
  if (todo.length === 0) return false
  await idle(deps)
  await tm.ensure(todo).catch(() => {})
  return true
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
const idle = (deps: SourceDeps): Promise<void> => (deps.waitForIdle ? deps.waitForIdle().catch(() => {}) : Promise.resolve())

async function enrich(deps: SourceDeps, refs: MetaRef[], rebuild: () => void): Promise<boolean> {
  const missing = uncached(deps, refs)
  if (missing.length === 0) return false
  await idle(deps)
  await deps.meta.ensure(missing).catch(() => {})
  rebuild()
  return true
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

/**
 * Biblioteks- och VOD-källan läser samma index: en PÅGÅENDE hämtning delas
 * av båda (och av samtidiga kanaler); en senare laddning hämtar på nytt.
 */
const titleFetches = new WeakMap<SourceDeps, { strict: boolean; promise: Promise<LibraryTitleLike[]> }>()

function sharedLibraryTitles(deps: SourceDeps, opts: LoadOptions): Promise<LibraryTitleLike[]> {
  const hit = titleFetches.get(deps)
  if (hit && (hit.strict || !opts.strict)) return hit.promise
  const promise = fetchLibraryTitles(deps, opts)
  const entry = { strict: !!opts.strict, promise }
  titleFetches.set(deps, entry)
  const release = () => { if (titleFetches.get(deps) === entry) titleFetches.delete(deps) }
  promise.then(release, release)
  return promise
}

function buildLibraryItems(titles: LibraryTitleLike[], deps: SourceDeps, side: 'library' | 'vod' = 'library'): PoolItem[] {
  const items: PoolItem[] = []
  for (const t of titles) {
    if (!librarySides(t)[side]) continue
    const tv = t.kind !== 'movie'
    const tmdbId = resolvedId(deps, tv ? 'tv' : 'movie', t.tmdbId, t.title, t.year)
    const meta = tmdbId != null ? deps.meta.get(tv ? 'tv' : 'movie', tmdbId) : null
    // Omatchad post: filnamnet tvättat, eller TMDb:s titel när namnmatchningen träffat.
    const name = t.tmdbId != null ? t.title : meta?.title ?? cleanTitle(t.title)
    const common = {
      source: side,
      genres: t.genres?.length ? t.genres : meta?.genres ?? [],
      year: t.year ?? meta?.year ?? null,
      ...(tmdbId != null ? { tmdbId } : {}),
      ...(t.imdbId ? { imdbId: t.imdbId } : meta?.imdbId ? { imdbId: meta.imdbId } : {}),
      ...(t.posterUrl ?? meta?.posterUrl ? { posterUrl: (t.posterUrl ?? meta?.posterUrl)! } : {}),
      ...(t.backdropUrl ?? meta?.backdropUrl ? { backdropUrl: (t.backdropUrl ?? meta?.backdropUrl)! } : {}),
    }
    if (!tv) {
      items.push({
        ...common, ref: `lib:${t.key}`, title: name, kind: 'movie',
        ...pickRuntime(t.runtimeMin, meta?.runtimeMin, DEFAULT_RUNTIME.movie),
        play: { type: 'library', key: t.key, mediaType: 'movie' },
      })
      continue
    }
    for (const ep of t.episodes ?? []) {
      items.push({
        ...common, ref: `lib:${t.key}:${ep.key}`, title: ep.title || name, seriesTitle: name, kind: 'episode',
        seriesKey: `lib:${t.key}`, season: ep.season, episode: ep.episode,
        ...pickRuntime(ep.runtimeMin ?? t.runtimeMin, meta?.runtimeMin, DEFAULT_RUNTIME.episode),
        play: { type: 'library', key: t.key, mediaType: 'tv', season: ep.season, episode: ep.episode },
      })
    }
  }
  return items
}

const libraryStream = (side: 'library' | 'vod'): SourceStream => async (deps, emit, opts = {}) => {
  const all = await sharedLibraryTitles(deps, opts)
  const titles = all.filter((t) => librarySides(t)[side])
  const rebuild = () => emit(buildLibraryItems(titles, deps, side))
  rebuild()
  const kindOf = (t: LibraryTitleLike) => (t.kind === 'movie' ? 'movie' as const : 'tv' as const)
  // Omatchade poster (filnamn som titel): namnmatcha, så de får bild och metadata.
  const matched = await matchUnmatched(deps, titles.filter((t) => t.tmdbId == null).map((t) => matchRef(kindOf(t), t.title, t.year)))
  // Plex och WebDAV sätter sällan runtimeMin: hämta längd via metadata för titlar
  // som saknar den, och allt för namnmatchade poster (titel, bilder, genrer).
  const refs: MetaRef[] = []
  for (const t of titles) {
    const id = resolvedId(deps, kindOf(t), t.tmdbId, t.title, t.year)
    if (id == null) continue
    const lacksRuntime = t.kind === 'movie' ? !(t.runtimeMin! > 0) : !(t.runtimeMin! > 0) && (t.episodes ?? []).some((e) => !(e.runtimeMin! > 0))
    if (lacksRuntime || t.tmdbId == null) refs.push({ kind: kindOf(t), tmdbId: id })
  }
  const rebuilt = await enrich(deps, refs, rebuild)
  if (matched && !rebuilt) rebuild()
}

export const streamLibraryItems = libraryStream('library')
export const streamVodItems = libraryStream('vod')

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
  await idle(deps)
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
  await idle(deps)
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
    const tmdbId = resolvedId(deps, t.kind, t.tmdbId, t.title, t.year)
    const meta = tmdbId != null ? deps.meta.get(t.kind, tmdbId) : null
    const imdbId = t.imdbId ?? meta?.imdbId
    const name = t.tmdbId != null ? t.title : meta?.title ?? cleanTitle(t.title)
    for (const f of t.files) {
      items.push({
        ref: `db:${f.provider}:${f.fileRef}`, title: name, kind: tv ? 'episode' : 'movie', source: 'debrid',
        genres: meta?.genres ?? [], year: t.year ?? meta?.year ?? null,
        ...(tmdbId != null ? { tmdbId } : {}),
        ...(imdbId ? { imdbId } : {}),
        ...(meta?.posterUrl ? { posterUrl: meta.posterUrl } : {}),
        ...(meta?.backdropUrl ? { backdropUrl: meta.backdropUrl } : {}),
        ...(tv ? { seriesTitle: name, seriesKey: `db:tv:${tmdbId ?? t.title}`, ...(f.season != null ? { season: f.season } : {}), ...(f.episode != null ? { episode: f.episode } : {}) } : {}),
        ...pickRuntime(null, meta?.runtimeMin, tv ? DEFAULT_RUNTIME.episode : DEFAULT_RUNTIME.movie),
        play: { type: 'debrid', provider: f.provider, fileRef: f.fileRef },
      })
    }
  }
  return items
}

export const streamDebridItems: SourceStream = async (deps, emit) => {
  // Listningen (RD pausar per torrent) körs först när ingen start pågår, bara
  // för kanaler som använder debrid; värdens 6 h-cache och delade hämtning gäller.
  await idle(deps)
  const titles = await deps.listDebridCloud()
  const rebuild = () => emit(buildDebridItems(titles, deps))
  rebuild()
  const matched = await matchUnmatched(deps, titles.filter((t) => t.tmdbId == null).map((t) => matchRef(t.kind, t.title, t.year)))
  const refs: MetaRef[] = []
  for (const t of titles) {
    const id = resolvedId(deps, t.kind, t.tmdbId, t.title, t.year)
    if (id != null) refs.push({ kind: t.kind, tmdbId: id })
  }
  const rebuilt = await enrich(deps, refs, rebuild)
  if (matched && !rebuilt) rebuild()
}

/**
 * Reservvägen för utvalda titlar som inte finns i någon av kanalens källor:
 * en film blir en strömpost (imdbId via /api/item), en serie avsnitt via
 * säsongslistorna. Säsong 1–3 kommer direkt; med `allSeasons` hämtas resten
 * efteråt, en serie åt gången bakom startgrinden. `emit` får hela listan
 * varje gång den växer. Titlar utan tmdbId kan inte hämtas och hoppas över.
 */
export async function loadTitleFallback(titles: readonly ChannelTitle[], deps: SourceDeps, emit: Emit, opts: { allSeasons?: boolean } = {}): Promise<void> {
  const wanted = titles.filter((t): t is ChannelTitle & { tmdbId: number } => t.tmdbId != null)
  if (wanted.length === 0) return
  const movies = wanted.filter((t) => t.kind === 'movie')
  const shows = wanted.filter((t) => t.kind === 'tv')
  const perShow: PoolItem[][] = shows.map(() => [])
  const build = (): PoolItem[] => {
    const out: PoolItem[] = []
    for (const m of movies) {
      const meta = deps.meta.get('movie', m.tmdbId)
      if (!meta?.imdbId) continue
      out.push({
        ref: `ti:movie:${m.tmdbId}`, title: meta.title ?? m.title, kind: 'movie', source: 'watchlist',
        genres: meta.genres, year: meta.year ?? m.year ?? null, tmdbId: m.tmdbId, imdbId: meta.imdbId,
        ...(meta.posterUrl ? { posterUrl: meta.posterUrl } : {}),
        ...(meta.backdropUrl ? { backdropUrl: meta.backdropUrl } : {}),
        ...pickRuntime(null, meta.runtimeMin, DEFAULT_RUNTIME.movie),
        play: { type: 'stream', imdbId: meta.imdbId, mediaType: 'movie' },
      })
    }
    return [...out, ...perShow.flat()]
  }
  const addSeasons = (idx: number, seasons: SeasonList) => {
    const s = shows[idx]!
    const meta = deps.meta.get('tv', s.tmdbId)
    const imdbId = meta?.imdbId
    if (!imdbId) return
    const name = meta.title ?? s.title
    const out = perShow[idx]!
    const have = new Set(out.map((i) => `${i.season}:${i.episode}`))
    for (const season of seasons) {
      if (season.season < 1) continue
      for (const ep of season.episodes) {
        if (have.has(`${season.season}:${ep.episode}`)) continue
        out.push({
          ref: `ti:tv:${s.tmdbId}:${season.season}:${ep.episode}`, title: ep.title || name, seriesTitle: name,
          kind: 'episode', source: 'watchlist', seriesKey: `ti:tv:${s.tmdbId}`, season: season.season, episode: ep.episode,
          genres: meta.genres, year: meta.year ?? s.year ?? null, tmdbId: s.tmdbId, imdbId,
          ...(meta.posterUrl ? { posterUrl: meta.posterUrl } : {}),
          ...(meta.backdropUrl ? { backdropUrl: meta.backdropUrl } : {}),
          ...pickRuntime(ep.runtime, meta.runtimeMin, DEFAULT_RUNTIME.episode),
          play: { type: 'stream', imdbId, mediaType: 'series', season: season.season, episode: ep.episode },
        })
      }
    }
  }
  await idle(deps)
  await deps.meta.ensure(wanted.map((t) => ({ kind: t.kind, tmdbId: t.tmdbId }))).catch(() => {})
  emit(build())
  if (shows.length === 0) return
  // Säsong 1–3: högst två serier åt gången mot /api/tv-info, som watchlisten.
  let cursor = 0
  const worker = async () => {
    while (cursor < shows.length) {
      const idx = cursor++
      if (!deps.meta.get('tv', shows[idx]!.tmdbId)?.imdbId) continue
      addSeasons(idx, await deps.fetchSeasons(shows[idx]!.tmdbId).catch(() => []))
      emit(build())
    }
  }
  await Promise.all(Array.from({ length: Math.min(2, shows.length) }, worker))
  if (!opts.allSeasons || !deps.fetchRestSeasons) return
  // Resten i bakgrunden: en serie åt gången, aldrig mitt i en filmstart.
  for (let idx = 0; idx < shows.length; idx += 1) {
    if (!deps.meta.get('tv', shows[idx]!.tmdbId)?.imdbId) continue
    await idle(deps)
    const rest = await deps.fetchRestSeasons(shows[idx]!.tmdbId).catch(() => [])
    if (rest.length === 0) continue
    addSeasons(idx, rest)
    emit(build())
  }
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
export const loadVodItems = (deps: SourceDeps, opts: LoadOptions = {}) => collect(streamVodItems, deps, opts)

const STREAMS: Record<SourceId, SourceStream> = {
  library: streamLibraryItems, watchlist: streamWatchlistItems, debrid: streamDebridItems, vod: streamVodItems,
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
  let extra: PoolItem[] = []
  const all = () => dedupePool(channel.sources.flatMap((s) => bySource.get(s) ?? []))
  const merged = () => applyChannelRules(all(), channel, extra)
  await Promise.all(channel.sources.map((s) =>
    runShared(s, deps, (items) => {
      bySource.set(s, items)
      onUpdate?.(merged())
    }).catch(() => {}),
  ))
  // Utvalda titlar som ingen källa har: hämtas först när alla källor svarat,
  // så inget uppslag görs för en titel som redan finns.
  if (hasTitles(channel)) {
    const { missing } = restrictToTitles(all(), channel.titles!)
    if (missing.length > 0) {
      await loadTitleFallback(missing, deps, (items) => {
        extra = items
        onUpdate?.(merged())
      }, { allSeasons: true }).catch(() => {})
    }
  }
  return merged()
}

export function loadPool(channel: ChannelDef, deps: SourceDeps): Promise<PoolItem[]> {
  return loadPoolProgressive(channel, deps)
}
