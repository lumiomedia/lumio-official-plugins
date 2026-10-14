/**
 * Värdadapter: enda filen i logiklagret som rör @/lib/plugin-sdk. Kopplar
 * lagring, bibliotek, watchlist, debrid och TMDb-uppslag (via värdens egna
 * endpoints) till de rena källadaptrarna. Alla TMDb-uppslag går via cache.
 */
import {
  channelListDebridCloud, channelRememberStream, channelResolveLibraryPlayback, channelResolveTitleStream, channelUnrestrictDebridFile,
  fetchLibraryStatus, getMovieWatchlist, getWatchlist, hasChannelHost, onPluginStorageChanged, queryLibrary,
  readPluginJson, removePluginStorageItem, waitForStartIdle, writePluginJson,
} from '@/lib/plugin-sdk'
import type { ChannelDef, SourceId } from './model/channel'
import { createMetaCache, createSeasonsCache, createTitleMatchCache, type MatchRef, type MatchStore, type MetaStore, type SeasonList, type SeasonsStore, type TitleMeta } from './data/meta-cache'
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

/** Standardkanalerna skapas en gång per profil; borttagna kommer aldrig tillbaka av sig själva. */
export function readDefaultsSeeded(): boolean {
  return readPluginJson<unknown>(PLUGIN_ID, 'defaultsSeeded', false) === true
}

export function writeDefaultsSeeded(): void {
  writePluginJson(PLUGIN_ID, 'defaultsSeeded', true, { emitChange: false })
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

/** Verkliga fillängder per post (data/runtime-fix.ts); utan ändringsevent, de gäller först vid nästa poolbygge. */
export function readRuntimeFixes(): Record<string, number> {
  const raw = readPluginJson<unknown>(PLUGIN_ID, 'runtimeFixes', {})
  const out: Record<string, number> = {}
  if (raw && typeof raw === 'object') for (const [k, v] of Object.entries(raw as Record<string, unknown>)) if (typeof v === 'number') out[k] = v
  return out
}

export function writeRuntimeFixes(next: Record<string, number>): void {
  writePluginJson(PLUGIN_ID, 'runtimeFixes', next, { emitChange: false })
}

/** Poolcache och metadata skrivs utan ändringsevent: ingen ska reagera på dem. Värdet är packat (data/pool-pack.ts). */
export function readPoolCache(id: string): { sig: string; pool: unknown } | null {
  const raw = readPluginJson<{ sig?: unknown; pool?: unknown } | null>(PLUGIN_ID, `poolCache:${id}`, null)
  return raw && typeof raw.sig === 'string' && raw.pool != null ? { sig: raw.sig, pool: raw.pool } : null
}

export function writePoolCache(id: string, value: { sig: string; pool: unknown }): void {
  writePluginJson(PLUGIN_ID, `poolCache:${id}`, value, { emitChange: false })
  const index = readPoolIndex()
  if (!index.includes(id)) writePoolIndex([...index, id])
}

/** Register över kanaler med poolcache, så städningen kan hitta dem utan att lista nycklar. */
const readPoolIndex = (): string[] => {
  const raw = readPluginJson<unknown>(PLUGIN_ID, 'poolIndex', [])
  return Array.isArray(raw) ? (raw as string[]) : []
}
const writePoolIndex = (ids: string[]) => writePluginJson(PLUGIN_ID, 'poolIndex', ids, { emitChange: false })

export function removePoolCache(id: string): void {
  removePluginStorageItem(PLUGIN_ID, `poolCache:${id}`, { emitChange: false })
  writePoolIndex(readPoolIndex().filter((x) => x !== id))
}

/** Tar bort poolcache för kanaler som inte längre finns (lagringen är trång på Android). */
export function prunePoolCaches(keep: string[]): void {
  const alive = new Set(keep)
  for (const id of readPoolIndex()) if (!alive.has(id)) removePoolCache(id)
}

const metaStore: MetaStore = {
  read: () => object<TitleMeta>(readPluginJson<unknown>(PLUGIN_ID, 'meta', {})),
  write: (all) => writePluginJson(PLUGIN_ID, 'meta', all, { emitChange: false }),
}

const matchStore: MatchStore = {
  read: () => object(readPluginJson<unknown>(PLUGIN_ID, 'matches', {})),
  write: (all) => writePluginJson(PLUGIN_ID, 'matches', all, { emitChange: false }),
}

/**
 * Värdens TMDb-sökning (samma som lokala mappen och debrid använder): tvättad
 * titel + år, och utan år om det inte gav något. undefined = anropet föll.
 */
async function searchTitle(ref: MatchRef): Promise<number | null | undefined> {
  const run = async (withYear: boolean): Promise<number | null | undefined> => {
    const params = new URLSearchParams({ query: ref.title })
    if (withYear && ref.year) params.set('year', String(ref.year))
    const res = await fetch(`/api/local-files/search?${params}`)
    if (!res.ok) return undefined
    const body = (await res.json()) as { results?: Array<{ type?: string; tmdbId?: number }> }
    const hit = (body.results ?? []).find((r) => r.type === ref.kind && typeof r.tmdbId === 'number')
    return hit ? hit.tmdbId! : null
  }
  const first = await run(true)
  if (first === null && ref.year) return run(false)
  return first
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
    ...(typeof item.title === 'string' && item.title ? { title: item.title } : {}),
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
  waitForIdle: () => waitForStartIdle(),
  titleMatch: createTitleMatchCache(matchStore, searchTitle),
}

const maxAdded = (list: Array<{ addedAt?: string }>): number =>
  list.reduce((max, e) => Math.max(max, Date.parse(e.addedAt ?? '') || 0), 0)

type Signatures = Partial<Record<SourceId, string>>
const SIGNATURE_TTL_MS = 2000
let signatureMemo: { at: number; promise: Promise<Signatures> } | null = null

/** Nollställer minnet (tester, och efter ändringar som måste synas direkt). */
export function resetSourceSignatures(): void {
  signatureMemo = null
}

/**
 * Billiga ändringsmärken per källa; ändras märket räknas poolen om.
 * Samtida anrop (hemrad + tablårader) delar ett svar i ~2 s, så N kanaler
 * ger en fetchLibraryStatus i stället för N.
 */
export function sourceSignatures(): Promise<Signatures> {
  const now = Date.now()
  if (signatureMemo && now - signatureMemo.at < SIGNATURE_TTL_MS) return signatureMemo.promise
  const promise = computeSourceSignatures()
  const entry = { at: now, promise }
  signatureMemo = entry
  // Ett misslyckat svar ska inte stå kvar och förgifta nästa anrop.
  promise.catch(() => { if (signatureMemo === entry) signatureMemo = null })
  return promise
}

async function computeSourceSignatures(): Promise<Signatures> {
  const movies = getMovieWatchlist() as Array<{ addedAt?: string }>
  const shows = getWatchlist() as Array<{ addedAt?: string }>
  const status = await fetchLibraryStatus().catch(() => null)
  // lastDeltaSync stämplas var 15:e minut även när inget ändrats och får inte
  // styra; lastChange sätts av värden bara när en batch faktiskt ändrat titlar
  // (saknas på äldre värdar — då fångar total och den dagliga fulla synken det).
  const sources = (status?.sources ?? []) as Array<{ lastFullSync?: number | null; lastChange?: number | null }>
  const fullSync = sources.reduce((max, s) => Math.max(max, s.lastFullSync ?? 0), 0)
  const changed = sources.reduce((max, s) => Math.max(max, s.lastChange ?? 0), 0)
  return {
    library: `${status?.total ?? 0}:${fullSync}:${changed}`,
    // VOD läser samma index som biblioteket.
    vod: `${status?.total ?? 0}:${fullSync}:${changed}`,
    watchlist: `${movies.length}:${maxAdded(movies)}|${shows.length}:${maxAdded(shows)}`,
    // Debridlistan cachas av värden i 6 h; samma fönster här.
    debrid: String(Math.floor(Date.now() / (6 * 3600e3))),
  }
}

export const resolver = createResolver({
  // exclude: äldre värdar ignorerar fältet och ger samma adress igen (resolvern tolkar det som "inga fler").
  // allowCatalog skickas bara när det är falskt (kanal utan IPTV-VOD); äldre värdar ignorerar fältet.
  library: (r, exclude, allowCatalog) => channelResolveLibraryPlayback({ ...r, ...(exclude?.length ? { exclude } : {}), ...(allowCatalog === false ? { allowCatalog: false } : {}) }),
  stream: (r, exclude) => channelResolveTitleStream(exclude?.length ? { ...r, exclude } : r),
  debrid: (r) => channelUnrestrictDebridFile(r),
})

/**
 * Gör strömvalet bakom ett uppslag ihågkommet. Anropas när bilden syns —
 * aldrig vid uppslaget (förladdning och zappning förbi ska inte minnas).
 */
export function rememberPlayedStream(token: string | undefined): void {
  if (token) channelRememberStream(token)
}

export function hostReady(): boolean {
  return hasChannelHost()
}
