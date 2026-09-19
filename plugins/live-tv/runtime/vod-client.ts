'use client'

/**
 * Typed client for the app's VOD library endpoints (`/api/live-tv/vod/...`).
 *
 * Samma regel som `index-client`: titlarna rör aldrig pluginlagringen. En
 * panel har 40 000 filmer och 8 500 serier, och de bor i värdens index —
 * webbläsaren frågar sida för sida och håller bara det som syns.
 *
 * Sorteringen görs i VÄRDEN. "A–Ö" över 40 000 titlar skulle annars innebära
 * att hela biblioteket gick över bryggan för att sorteras och kastas.
 */

export type VodKind = 'movie' | 'series'
export type VodSort = 'new' | 'az' | 'rating'

/** En titel i biblioteket — speglar `VodItem` i `src-tauri/src/xtream_vod.rs`. */
export interface VodItem {
  key: string
  kind: VodKind
  title: string
  /** Panelens namn ordagrant, när det skiljer sig från visningstiteln. */
  rawTitle?: string
  posterUrl?: string
  year?: number
  rating?: number
  addedAt?: number
  categoryId: string
  /** Ordagrant som leverantören skrev den: `MOVIE: Swedish`. */
  categoryName: string
  /** Panelens egen TMDB-koppling. Finns på 65–97 % av raderna. */
  tmdbId?: number
  imdbId?: string
  streamId?: number
  seriesId?: number
  /** Film: färdig uppspelnings-URL. Serier har ingen — avsnitten har. */
  url?: string
}

export interface VodCategory {
  id: string
  name: string
  kind: VodKind
  count: number
}

export interface VodPage {
  items: VodItem[]
  total: number
  /**
   * Falskt när källan inte finns i indexet alls. Skilt från `total === 0`:
   * "inte hämtat än" och "panelen har ingen film" ser likadana ut annars, och
   * vyn skulle påstå att biblioteket är tomt medan det hämtas.
   */
  known: boolean
}

export interface VodCategories {
  categories: VodCategory[]
  total: number
  known: boolean
  /** Sant medan värden hämtar den här källans bibliotek. */
  importing: boolean
}

export interface VodSourceStatus {
  id: string
  total: number
  movies: number
  series: number
  updatedAt: number
  importing: boolean
}

/** Bus for "the VOD library changed" (an import finished). */
export const VOD_CHANGED_EVENT = 'lumio-live-tv-vod-changed'

export function emitVodChanged(): void {
  window.dispatchEvent(new CustomEvent(VOD_CHANGED_EVENT))
}

export function onVodChanged(cb: () => void): () => void {
  const handler = () => cb()
  window.addEventListener(VOD_CHANGED_EVENT, handler)
  return () => window.removeEventListener(VOD_CHANGED_EVENT, handler)
}

/** Appar äldre än den här versionen saknar `/api/live-tv/vod/*` helt. */
export const VOD_MIN_APP_VERSION = '0.1.601'

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  if (!res.ok) throw new Error(`${path} returned ${res.status}`)
  return (await res.json()) as T
}

export async function queryVod(opts: {
  source?: string
  categoryId?: string
  kind?: VodKind
  q?: string
  sort?: VodSort
  offset: number
  limit: number
  signal?: AbortSignal
}): Promise<VodPage> {
  const qs = buildQuery({
    source: opts.source,
    categoryId: opts.categoryId,
    kind: opts.kind,
    q: opts.q,
    sort: opts.sort,
    offset: opts.offset,
    limit: opts.limit,
  })
  const data = await requestJson<{ items?: VodItem[]; total?: number; known?: boolean }>(
    `/api/live-tv/vod/query${qs}`,
    opts.signal ? { signal: opts.signal } : undefined,
  )
  return { items: data.items ?? [], total: data.total ?? 0, known: Boolean(data.known) }
}

export async function listVodCategories(source: string | null, signal?: AbortSignal): Promise<VodCategories> {
  const qs = buildQuery({ source: source ?? undefined })
  const data = await requestJson<{
    categories?: VodCategory[]
    total?: number
    known?: boolean
    importing?: boolean
  }>(`/api/live-tv/vod/categories${qs}`, signal ? { signal } : undefined)
  return {
    categories: data.categories ?? [],
    total: data.total ?? 0,
    known: Boolean(data.known),
    importing: Boolean(data.importing),
  }
}

export async function vodStatus(): Promise<VodSourceStatus[]> {
  const data = await requestJson<{ sources?: VodSourceStatus[] }>('/api/live-tv/vod/status')
  return data.sources ?? []
}

export async function lookupVod(source: string | null, keys: string[]): Promise<VodItem[]> {
  if (keys.length === 0) return []
  const data = await requestJson<{ items?: VodItem[] }>('/api/live-tv/vod/lookup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ source: source ?? undefined, keys }),
  })
  return data.items ?? []
}

export interface XtreamVodImportSource {
  base: string
  username: string
  password: string
  format: string
}

/**
 * Ber värden hämta biblioteket för en källa. Svarar direkt (202) — hämtningen
 * lever i en egen uppgift, och vyn följer den via `listVodCategories`
 * (`importing`).
 */
export async function startVodImport(source: string, xtream: XtreamVodImportSource): Promise<{ started: boolean }> {
  const data = await requestJson<{ started?: boolean }>('/api/live-tv/vod/import', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ source, xtream }),
  })
  return { started: Boolean(data.started) }
}
