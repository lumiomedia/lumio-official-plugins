/**
 * Längd, genrer och bilder per TMDb-titel. Biblioteket har det oftast själv
 * (Plex sätter aldrig runtime), watchlist och debrid aldrig. Uppslagen är
 * TMDb-anrop via värden — cachade i 30 dagar och högst två åt gången, så en
 * ny kanal inte sveper hundratals anrop på en gång.
 */
export interface TitleMeta {
  runtimeMin: number | null
  genres: string[]
  year: number | null
  posterUrl?: string
  backdropUrl?: string
  imdbId?: string
  at: number
}

export interface MetaStore {
  read(): Record<string, TitleMeta>
  write(all: Record<string, TitleMeta>): void
}

const TTL_MS = 30 * 24 * 3600 * 1000
const PARALLEL = 2

export function metaKey(kind: 'movie' | 'tv', tmdbId: number, season?: number, episode?: number): string {
  return season != null && episode != null ? `${kind}:${tmdbId}:${season}:${episode}` : `${kind}:${tmdbId}`
}

export function createMetaCache(
  store: MetaStore,
  fetcher: (kind: 'movie' | 'tv', tmdbId: number) => Promise<Omit<TitleMeta, 'at'> | null>,
  now: () => number = Date.now,
) {
  const inflight = new Map<string, Promise<void>>()
  const fresh = (entry: TitleMeta | undefined): entry is TitleMeta => entry != null && now() - entry.at < TTL_MS

  function get(kind: 'movie' | 'tv', tmdbId: number): TitleMeta | null {
    const entry = store.read()[metaKey(kind, tmdbId)]
    return fresh(entry) ? entry : null
  }

  function fetchOne(kind: 'movie' | 'tv', tmdbId: number): Promise<void> {
    const key = metaKey(kind, tmdbId)
    const running = inflight.get(key)
    if (running) return running
    const job = (async () => {
      const meta = await fetcher(kind, tmdbId).catch(() => null)
      if (!meta) return
      store.write({ ...store.read(), [key]: { ...meta, at: now() } })
    })().finally(() => inflight.delete(key))
    inflight.set(key, job)
    return job
  }

  async function ensure(list: Array<{ kind: 'movie' | 'tv'; tmdbId: number }>): Promise<void> {
    const seen = new Set<string>()
    const missing = list.filter(({ kind, tmdbId }) => {
      const key = metaKey(kind, tmdbId)
      if (seen.has(key)) return false
      seen.add(key)
      return !fresh(store.read()[key])
    })
    let cursor = 0
    const worker = async () => {
      while (cursor < missing.length) {
        const next = missing[cursor++]!
        await fetchOne(next.kind, next.tmdbId)
      }
    }
    await Promise.all(Array.from({ length: Math.min(PARALLEL, missing.length) }, worker))
  }

  return { get, ensure }
}

/** Säsongslistor (avsnitt + längd) per serie, för watchlist-tablån. */
export type SeasonList = Array<{ season: number; episodes: Array<{ episode: number; title: string; runtime: number | null }> }>
export interface SeasonsEntry { seasons: SeasonList; at: number }
export interface SeasonsStore {
  read(): Record<string, SeasonsEntry>
  write(all: Record<string, SeasonsEntry>): void
}

/** Cachar fetcher-svaret 30 dagar per tmdbId; samtida anrop för samma serie delar ett uppslag. */
export function createSeasonsCache(store: SeasonsStore, fetcher: (tmdbId: number) => Promise<SeasonList>, now: () => number = Date.now) {
  const inflight = new Map<number, Promise<SeasonList>>()
  return function load(tmdbId: number): Promise<SeasonList> {
    const key = `seasons:${tmdbId}`
    const hit = store.read()[key]
    if (hit && now() - hit.at < TTL_MS) return Promise.resolve(hit.seasons)
    const running = inflight.get(tmdbId)
    if (running) return running
    const job = fetcher(tmdbId)
      .then((seasons) => {
        // Tomt svar (fel eller okänd serie) cachas inte, så nästa laddning provar igen.
        if (seasons.length > 0) store.write({ ...store.read(), [key]: { seasons, at: now() } })
        return seasons
      })
      .finally(() => inflight.delete(tmdbId))
    inflight.set(tmdbId, job)
    return job
  }
}
