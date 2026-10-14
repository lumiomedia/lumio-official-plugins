/**
 * Längd, genrer och bilder per TMDb-titel. Biblioteket har det oftast själv
 * (Plex sätter aldrig runtime), watchlist och debrid aldrig. Uppslagen är
 * TMDb-anrop via värden — cachade i 30 dagar och högst två åt gången, så en
 * ny kanal inte sveper hundratals anrop på en gång.
 */
export interface TitleMeta {
  /** TMDb:s titel (för poster som matchats på namn). */
  title?: string
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
  // store.read() är en hel JSON.parse av kartan: läs den en gång per ensure()
  // (och lat vid första get()), inte en gång per titel.
  let snapshot: Record<string, TitleMeta> | null = null
  const stored = (): Record<string, TitleMeta> => (snapshot ??= store.read())

  function get(kind: 'movie' | 'tv', tmdbId: number): TitleMeta | null {
    const key = metaKey(kind, tmdbId)
    const entry = pending[key] ?? stored()[key]
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
    snapshot = merged
  }

  async function ensure(list: Array<{ kind: 'movie' | 'tv'; tmdbId: number }>): Promise<void> {
    // En färsk läsning per ensure(): fångar det en annan skrivare (t.ex. profilbyte) ändrat.
    snapshot = store.read()
    const current = snapshot
    const seen = new Set<string>()
    const missing = list.filter(({ kind, tmdbId }) => {
      const key = metaKey(kind, tmdbId)
      if (seen.has(key)) return false
      seen.add(key)
      return !fresh(pending[key] ?? current[key])
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
  // En läsning (JSON.parse) av kartan, inte en per serie; flush håller den aktuell.
  let snapshot: Record<string, SeasonsEntry> | null = null

  function flush(): void {
    if (timer) { clearTimeout(timer); timer = undefined }
    const keys = Object.keys(pending)
    if (keys.length === 0) return
    const merged: Record<string, SeasonsEntry> = {}
    for (const [k, v] of Object.entries({ ...store.read(), ...pending })) if (fresh(v)) merged[k] = v
    for (const k of keys) delete pending[k]
    store.write(merged)
    snapshot = merged
  }

  function load(tmdbId: number): Promise<SeasonList> {
    const key = `seasons:${tmdbId}`
    const hit = pending[key] ?? (snapshot ??= store.read())[key]
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

/**
 * Namnmatchning för poster som källan inte kunnat matcha (inget tmdbId):
 * tvättad titel + år → tmdbId via värdens TMDb-sökning. Träffar sparas länge
 * (90 dagar), missar en vecka; ett misslyckat anrop sparas inte. Högst två
 * sökningar åt gången och högst `perEnsure` nya per genomgång, så ett stort
 * omatchat bibliotek fylls på över flera laddningar i stället för i en skur.
 */
export interface MatchEntry { id: number | null; at: number }
export interface MatchStore {
  read(): Record<string, MatchEntry>
  write(all: Record<string, MatchEntry>): void
}
export type MatchRef = { kind: 'movie' | 'tv'; title: string; year: number | null }

const HIT_TTL_MS = 90 * 24 * 3600 * 1000
const MISS_TTL_MS = 7 * 24 * 3600 * 1000

export const matchKey = (r: MatchRef): string =>
  `${r.kind}:${r.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}:${r.year ?? ''}`

export function createTitleMatchCache(
  store: MatchStore,
  search: (ref: MatchRef) => Promise<number | null | undefined>,
  now: () => number = Date.now,
  perEnsure = 60,
) {
  let snapshot: Record<string, MatchEntry> | null = null
  const pending: Record<string, MatchEntry> = {}
  const inflight = new Map<string, Promise<void>>()
  const fresh = (e: MatchEntry | undefined): e is MatchEntry =>
    e != null && now() - e.at < (e.id != null ? HIT_TTL_MS : MISS_TTL_MS)

  /** tmdbId, null = känd miss, undefined = okänd (inte sökt än). */
  function get(ref: MatchRef): number | null | undefined {
    const key = matchKey(ref)
    const entry = pending[key] ?? (snapshot ??= store.read())[key]
    return fresh(entry) ? entry.id : undefined
  }

  function flush(): void {
    const keys = Object.keys(pending)
    if (keys.length === 0) return
    const merged: Record<string, MatchEntry> = {}
    for (const [k, v] of Object.entries({ ...store.read(), ...pending })) if (fresh(v)) merged[k] = v
    for (const k of keys) delete pending[k]
    store.write(merged)
    snapshot = merged
  }

  async function ensure(list: MatchRef[]): Promise<void> {
    snapshot = store.read()
    const seen = new Set<string>()
    const todo = list.filter((r) => {
      const key = matchKey(r)
      if (seen.has(key)) return false
      seen.add(key)
      return get(r) === undefined
    }).slice(0, perEnsure)
    let cursor = 0
    const worker = async () => {
      while (cursor < todo.length) {
        const ref = todo[cursor++]!
        const key = matchKey(ref)
        let job = inflight.get(key)
        if (!job) {
          job = search(ref)
            .then((id) => { if (id !== undefined) pending[key] = { id, at: now() } })
            .catch(() => {})
            .finally(() => inflight.delete(key))
          inflight.set(key, job)
        }
        await job
      }
    }
    try {
      await Promise.all(Array.from({ length: Math.min(PARALLEL, todo.length) }, worker))
    } finally {
      flush()
    }
  }

  return { get, ensure }
}
