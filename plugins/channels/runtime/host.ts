/**
 * Värdadapter: enda filen i logiklagret som rör @/lib/plugin-sdk. Kopplar
 * lagring, bibliotek, watchlist, debrid och TMDb-uppslag (via värdens egna
 * endpoints) till de rena källadaptrarna. Alla TMDb-uppslag går via cache.
 */
import {
  channelListDebridCloud, channelResolveLibraryPlayback, channelResolveTitleStream, channelUnrestrictDebridFile,
  fetchLibraryStatus, getMovieWatchlist, getWatchlist, hasChannelHost, onPluginStorageChanged, queryLibrary,
  readPluginJson, writePluginJson,
} from '@/lib/plugin-sdk'
import type { ChannelDef, SourceId } from './model/channel'
import { createMetaCache, createSeasonsCache, type MetaStore, type SeasonList, type SeasonsStore, type TitleMeta } from './data/meta-cache'
import type { SourceDeps } from './data/sources'
import { createResolver } from './play/resolve'

export const PLUGIN_ID = 'com.lumio.channels'

export interface ZapMemory { lastChannelId: string | null; previousChannelId: string | null }

const object = <T>(value: unknown): Record<string, T> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, T>) : {}

export function readChannels(): ChannelDef[] {
  const raw = readPluginJson<unknown>(PLUGIN_ID, 'channels', [])
  return Array.isArray(raw) ? (raw as ChannelDef[]) : []
}

export function writeChannels(next: ChannelDef[]): void {
  writePluginJson(PLUGIN_ID, 'channels', next)
}

export function onChannelsChanged(cb: () => void): () => void {
  return onPluginStorageChanged(PLUGIN_ID, 'channels', cb)
}

export function readZapMemory(): ZapMemory {
  const raw = object<string | null>(readPluginJson<unknown>(PLUGIN_ID, 'zap', {}))
  return { lastChannelId: raw.lastChannelId ?? null, previousChannelId: raw.previousChannelId ?? null }
}

export function writeZapMemory(next: ZapMemory): void {
  writePluginJson(PLUGIN_ID, 'zap', next)
}

/** Poolcache och metadata skrivs utan ändringsevent: ingen ska reagera på dem. */
export function readPoolCache(id: string): { sig: string; items: unknown[] } | null {
  const raw = readPluginJson<{ sig?: unknown; items?: unknown } | null>(PLUGIN_ID, `poolCache:${id}`, null)
  return raw && typeof raw.sig === 'string' && Array.isArray(raw.items) ? { sig: raw.sig, items: raw.items } : null
}

export function writePoolCache(id: string, value: { sig: string; items: unknown[] }): void {
  writePluginJson(PLUGIN_ID, `poolCache:${id}`, value, { emitChange: false })
}

const metaStore: MetaStore = {
  read: () => object<TitleMeta>(readPluginJson<unknown>(PLUGIN_ID, 'meta', {})),
  write: (all) => writePluginJson(PLUGIN_ID, 'meta', all, { emitChange: false }),
}

const seasonsStore: SeasonsStore = {
  read: () => object(readPluginJson<unknown>(PLUGIN_ID, 'seasons', {})),
  write: (all) => writePluginJson(PLUGIN_ID, 'seasons', all, { emitChange: false }),
}

async function getJson(url: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(url)
  return res.ok ? ((await res.json()) as Record<string, unknown>) : null
}

/** /api/item → { item: { runtimeMinutes, genres: string[], year, posterUrl, backdropUrl, imdbId } } */
async function fetchMeta(kind: 'movie' | 'tv', tmdbId: number): Promise<Omit<TitleMeta, 'at'> | null> {
  const body = await getJson(`/api/item?tmdbId=${tmdbId}&type=${kind}`)
  const item = body?.item as Record<string, unknown> | undefined
  if (!item) return null
  const genres = Array.isArray(item.genres)
    ? item.genres.map((g) => (typeof g === 'string' ? g : (g as { name?: string } | null)?.name ?? '')).filter(Boolean)
    : []
  return {
    runtimeMin: typeof item.runtimeMinutes === 'number' && item.runtimeMinutes > 0 ? item.runtimeMinutes : null,
    genres,
    year: typeof item.year === 'number' ? item.year : null,
    ...(typeof item.posterUrl === 'string' ? { posterUrl: item.posterUrl } : {}),
    ...(typeof item.backdropUrl === 'string' ? { backdropUrl: item.backdropUrl } : {}),
    ...(typeof item.imdbId === 'string' && item.imdbId ? { imdbId: item.imdbId } : {}),
  }
}

/** /api/tv-info?tmdbId=N&season=S → { episodes: [{ episode_number, name, runtime }] }. Säsong 1–3. */
async function fetchSeasonsUncached(tmdbId: number): Promise<SeasonList> {
  const head = await getJson(`/api/tv-info?tmdbId=${tmdbId}`)
  const listed = Array.isArray(head?.seasons) ? (head!.seasons as Array<{ season_number?: number }>) : []
  const numbers = listed.map((s) => s.season_number ?? 0).filter((n) => n >= 1 && n <= 3)
  const out: SeasonList = []
  for (const season of numbers) {
    const body = await getJson(`/api/tv-info?tmdbId=${tmdbId}&season=${season}`).catch(() => null)
    const episodes = Array.isArray(body?.episodes) ? (body!.episodes as Array<{ episode_number?: number; name?: string; runtime?: number | null }>) : []
    out.push({
      season,
      episodes: episodes
        .filter((e) => typeof e.episode_number === 'number')
        .map((e) => ({ episode: e.episode_number!, title: e.name ?? '', runtime: e.runtime && e.runtime > 0 ? e.runtime : null })),
    })
  }
  return out
}

export const sourceDeps: SourceDeps = {
  queryLibrary: (q) => queryLibrary(q as never) as never,
  getMovieWatchlist: () => getMovieWatchlist().map((e) => ({ ...e, tmdbId: Number(e.tmdbId) })) as never,
  getWatchlist: () => getWatchlist().map((e) => ({ ...e, tmdbId: Number(e.tmdbId) })) as never,
  fetchSeasons: createSeasonsCache(seasonsStore, fetchSeasonsUncached),
  listDebridCloud: () => channelListDebridCloud() as never,
  meta: createMetaCache(metaStore, fetchMeta),
}

const maxAdded = (list: Array<{ addedAt?: string }>): number =>
  list.reduce((max, e) => Math.max(max, Date.parse(e.addedAt ?? '') || 0), 0)

/** Billiga ändringsmärken per källa; ändras märket räknas poolen om. */
export async function sourceSignatures(): Promise<Partial<Record<SourceId, string>>> {
  const movies = getMovieWatchlist() as Array<{ addedAt?: string }>
  const shows = getWatchlist() as Array<{ addedAt?: string }>
  const status = await fetchLibraryStatus().catch(() => null)
  const synced = (status?.sources ?? []).reduce((max, s) => Math.max(max, s.lastFullSync ?? 0, s.lastDeltaSync ?? 0), 0)
  return {
    library: `${status?.total ?? 0}:${synced}`,
    watchlist: `${movies.length}:${maxAdded(movies)}|${shows.length}:${maxAdded(shows)}`,
    // Debridlistan cachas av värden i 6 h; samma fönster här.
    debrid: String(Math.floor(Date.now() / (6 * 3600e3))),
  }
}

export const resolver = createResolver({
  library: (r) => channelResolveLibraryPlayback(r),
  stream: (r) => channelResolveTitleStream(r),
  debrid: (r) => channelUnrestrictDebridFile(r),
})

export function hostReady(): boolean {
  return hasChannelHost()
}
