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

export async function loadLibraryItems(deps: SourceDeps, opts: LoadOptions = {}): Promise<PoolItem[]> {
  try {
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
    // Plex sätter aldrig runtimeMin: hämta längd via metadata för titlar som saknar den.
    const lacking = titles.filter((t) => t.tmdbId != null && (t.kind === 'movie' ? !(t.runtimeMin! > 0) : !(t.runtimeMin! > 0) && (t.episodes ?? []).some((e) => !(e.runtimeMin! > 0))))
    await deps.meta.ensure(lacking.map((t) => ({ kind: t.kind === 'movie' ? 'movie' as const : 'tv' as const, tmdbId: t.tmdbId! }))).catch(() => {})
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
  } catch (err) {
    if (opts.strict) throw err
    return []
  }
}

export async function loadWatchlistItems(deps: SourceDeps, opts: LoadOptions = {}): Promise<PoolItem[]> {
  try {
    const movies = deps.getMovieWatchlist()
    const shows = deps.getWatchlist()
    await deps.meta.ensure([
      ...movies.map((m) => ({ kind: 'movie' as const, tmdbId: m.tmdbId })),
      ...shows.map((s) => ({ kind: 'tv' as const, tmdbId: s.tmdbId })),
    ])
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
    // Högst två serier åt gången mot /api/tv-info (fetchSeasons cachar själv).
    const perShow: PoolItem[][] = shows.map(() => [])
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
    items.push(...perShow.flat())
    return items
  } catch (err) {
    if (opts.strict) throw err
    return []
  }
}

export async function loadDebridItems(deps: SourceDeps, opts: LoadOptions = {}): Promise<PoolItem[]> {
  try {
    const titles = await deps.listDebridCloud()
    await deps.meta.ensure(titles.filter((t) => t.tmdbId != null).map((t) => ({ kind: t.kind, tmdbId: t.tmdbId! })))
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
  } catch (err) {
    if (opts.strict) throw err
    return []
  }
}

export async function loadPool(channel: ChannelDef, deps: SourceDeps): Promise<PoolItem[]> {
  const loaders: Record<SourceId, (d: SourceDeps) => Promise<PoolItem[]>> = {
    library: loadLibraryItems, watchlist: loadWatchlistItems, debrid: loadDebridItems,
  }
  const lists = await Promise.all(channel.sources.map((s) => loaders[s](deps).catch(() => [] as PoolItem[])))
  return filterPool(dedupePool(lists.flat()), channel)
}
