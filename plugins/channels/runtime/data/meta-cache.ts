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
  // Nyhämtade poster samlas i minnet och skrivs en gång när en ensure() är klar
  // (annars läses och skrivs hela kartan per titel: O(n²) på första fyllningen).
  const pending: Record<string, TitleMeta> = {}
  const fresh = (entry: TitleMeta | undefined): entry is TitleMeta => entry != null && now() - entry.at < TTL_MS

  function get(kind: 'movie' | 'tv', tmdbId: number): TitleMeta | null {
    const key = metaKey(kind, tmdbId)
    const entry = pending[key] ?? store.read()[key]
    return fresh(entry) ? entry : null
  }

  // Gränsen gäller hela cachen: samtidiga ensure() delar samma kö och samma två platser.
  let active = 0
  const waiting: Array<() => void> = []
  const acquire = (): Promise<void> => {
    if (active < PARALLEL) { active += 1; return Promise.resolve() }
    return new Promise((resolve) => waiting.push(resolve))
  }
  const release = (): void => {
    const next = waiting.shift()
    if (next) next() // platsen går direkt vidare till nästa i kön
    else active -= 1
  }

  function fetchOne(kind: 'movie' | 'tv', tmdbId: number): Promise<void> {
    const key = metaKey(kind, tmdbId)
    const running = inflight.get(key)
    if (running) return running
    const job = (async () => {
      await acquire()
      try {
        const meta = await fetcher(kind, tmdbId).catch(() => null)
        if (!meta) return
        pending[key] = { ...meta, at: now() }
      } finally {
        release()
      }
    })().finally(() => inflight.delete(key))
    inflight.set(key, job)
    return job
  }

  /** Skriver samlade poster en gång och släpper poster äldre än TTL. */
  function flush(): void {
    const keys = Object.keys(pending)
    if (keys.length === 0) return
    const merged: Record<string, TitleMeta> = {}
    for (const [k, v] of Object.entries({ ...store.read(), ...pending })) if (fresh(v)) merged[k] = v
    for (const k of keys) delete pending[k]
    store.write(merged)
  }

  async function ensure(list: Array<{ kind: 'movie' | 'tv'; tmdbId: number }>): Promise<void> {
    const seen = new Set<string>()
    const missing = list.filter(({ kind, tmdbId }) => {
      const key = metaKey(kind, tmdbId)
      if (seen.has(key)) return false
      seen.add(key)
      return !fresh(pending[key] ?? store.read()[key])
    })
    try {
      await Promise.all(missing.map(({ kind, tmdbId }) => fetchOne(kind, tmdbId)))
    } finally {
      flush()
    }
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

/**
 * Cachar fetcher-svaret 30 dagar per tmdbId; samtida anrop för samma serie delar ett uppslag.
 * Skrivningen debounceas (en per skur, inte en per serie) och släpper utgångna poster.
 */
export function createSeasonsCache(store: SeasonsStore, fetcher: (tmdbId: number) => Promise<SeasonList>, now: () => number = Date.now) {
  const inflight = new Map<number, Promise<SeasonList>>()
  const pending: Record<string, SeasonsEntry> = {}
  let timer: ReturnType<typeof setTimeout> | undefined
  const fresh = (e: SeasonsEntry | undefined): e is SeasonsEntry => e != null && now() - e.at < TTL_MS

  function flush(): void {
    if (timer) { clearTimeout(timer); timer = undefined }
    const keys = Object.keys(pending)
    if (keys.length === 0) return
    const merged: Record<string, SeasonsEntry> = {}
    for (const [k, v] of Object.entries({ ...store.read(), ...pending })) if (fresh(v)) merged[k] = v
    for (const k of keys) delete pending[k]
    store.write(merged)
  }

  function load(tmdbId: number): Promise<SeasonList> {
    const key = `seasons:${tmdbId}`
    const hit = pending[key] ?? store.read()[key]
    if (fresh(hit)) return Promise.resolve(hit.seasons)
    const running = inflight.get(tmdbId)
    if (running) return running
    const job = fetcher(tmdbId)
      .then((seasons) => {
        // Tomt svar (fel eller okänd serie) cachas inte, så nästa laddning provar igen.
        if (seasons.length > 0) {
          pending[key] = { seasons, at: now() }
          timer ??= setTimeout(flush, 1000)
        }
        return seasons
      })
      .finally(() => inflight.delete(tmdbId))
    inflight.set(tmdbId, job)
    return job
  }
  return Object.assign(load, { flush })
}
