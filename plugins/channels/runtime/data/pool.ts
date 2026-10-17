/**
 * Titelpoolen: allt en kanal KAN sända, efter regler och dubbletter.
 * Ren logik — källorna hämtas i sources.ts.
 */
import { canonTitles, ERA_RANGES, hasTitles, normTitle, type ChannelDef, type ChannelTitle, type SourceId } from '../model/channel'
import type { ScheduleItem } from '../model/schedule'
import { canonGenres } from './genres'

export type PlayRef =
  | { type: 'library'; key: string; mediaType: 'movie' | 'tv'; season?: number; episode?: number }
  | { type: 'stream'; imdbId: string; mediaType: 'movie' | 'series'; season?: number; episode?: number }
  | { type: 'debrid'; provider: 'realdebrid' | 'torbox' | 'alldebrid'; fileRef: string }

export interface PoolItem extends ScheduleItem {
  source: SourceId
  genres: string[]
  runtimeKnown: boolean
  seriesTitle?: string
  tmdbId?: number
  imdbId?: string
  posterUrl?: string
  backdropUrl?: string
  play: PlayRef
}

export const DEFAULT_RUNTIME = { movie: 100, episode: 45 } as const

const LENGTH_TEST = {
  any: () => true,
  short: (m: number) => m < 40,
  episode: (m: number) => m < 70,
  feature: (m: number) => m >= 70,
} as const

export function filterPool(items: PoolItem[], channel: Pick<ChannelDef, 'kind' | 'era' | 'length'> & { genres: readonly string[] }): PoolItem[] {
  const wanted = new Set(canonGenres(channel.genres))
  const range = channel.era === 'any' ? null : ERA_RANGES[channel.era]
  return items.filter((item) => {
    if (channel.kind === 'movie' && item.kind !== 'movie') return false
    if (channel.kind === 'tv' && item.kind !== 'episode') return false
    if (wanted.size > 0 && !canonGenres(item.genres).some((g) => wanted.has(g))) return false
    if (range && (item.year == null || item.year < range[0] || item.year > range[1])) return false
    return LENGTH_TEST[channel.length](item.runtimeMin)
  })
}

const RANK: Record<SourceId, number> = { library: 0, debrid: 1, vod: 2, watchlist: 3 }

/**
 * Bästa posten för samma titel: källrang först (bibliotek > debrid >
 * watchlist), sedan en post med bild (en namnmatchad filnamnspost ska inte
 * slå källans egen matchade), sist ref — så valet inte beror på ordningen.
 */
function better(a: PoolItem, b: PoolItem): boolean {
  if (RANK[a.source] !== RANK[b.source]) return RANK[a.source] < RANK[b.source]
  const ia = a.backdropUrl ? 0 : 1
  const ib = b.backdropUrl ? 0 : 1
  if (ia !== ib) return ia < ib
  return a.ref < b.ref
}

export function dedupePool(items: PoolItem[]): PoolItem[] {
  const best = new Map<string, PoolItem>()
  for (const item of items) {
    // Avsnitt utan säsong/avsnittsnummer (debrid) får inte kollapsa till en post per serie.
    const identified = item.tmdbId != null && (item.kind === 'movie' || (item.season != null && item.episode != null))
    const key = identified ? `tmdb:${item.tmdbId}:${item.season ?? ''}:${item.episode ?? ''}` : `ref:${item.ref}`
    const current = best.get(key)
    if (!current || better(item, current)) best.set(key, item)
  }
  return [...best.values()]
}

/**
 * Bara kanalens egna källor räknas: en debridkanal ska inte byggas om för att
 * biblioteket synkat, och tvärtom.
 */
/** Poolbyggets version i signaturen. 2 = namnmatchning av omatchade poster, 3 = IPTV-VOD utbrutet ur biblioteket. */
export const POOL_LOGIC_VERSION = 3

export function poolSignature(channel: ChannelDef, sourceSigs: Partial<Record<SourceId, string>>): string {
  const rules = poolRules(channel)
  return JSON.stringify({
    // Höjs när poolbygget ändras (t.ex. namnmatchning), så sparade pooler byggs om.
    logic: POOL_LOGIC_VERSION,
    rules,
    sigs: Object.fromEntries(rules.sources.map((id) => [id, sourceSigs[id] ?? null])),
  })
}

/**
 * Reglerna som avgör poolens innehåll (signaturens regeldel). Utvalda titlar
 * tas med bara när de finns, så kanaler utan titlar behåller sin signatur
 * (och sin sparade pool).
 */
export function poolRules(channel: Pick<ChannelDef, 'sources' | 'genres' | 'era' | 'length' | 'kind' | 'titles'>) {
  return {
    sources: [...channel.sources].sort(),
    genres: canonGenres(channel.genres).sort(),
    era: channel.era, length: channel.length, kind: channel.kind,
    ...(hasTitles(channel) ? { titles: canonTitles(channel.titles) } : {}),
  }
}

/** Postens biblioteksnyckel (bibliotek/VOD), annars seriens/postens egen nyckel. */
function itemKeys(item: PoolItem): string[] {
  const keys: string[] = []
  if (item.play.type === 'library') keys.push(item.play.key)
  if (item.seriesKey) keys.push(item.seriesKey)
  else keys.push(item.ref)
  return keys
}

/**
 * Hör posten till den utvalda titeln? tmdbId avgör när båda har ett (ingen
 * namngissning mellan två olika id), annars biblioteksnyckel/seriesKey, sist
 * tvättad titel + år (året jämförs bara när båda har ett).
 */
export function itemMatchesTitle(item: PoolItem, title: ChannelTitle): boolean {
  if ((title.kind === 'movie') !== (item.kind === 'movie')) return false
  if (title.tmdbId != null && item.tmdbId != null) return title.tmdbId === item.tmdbId
  if (title.libraryKey && itemKeys(item).includes(title.libraryKey)) return true
  const name = item.kind === 'episode' ? item.seriesTitle ?? item.title : item.title
  if (normTitle(name) !== normTitle(title.title)) return false
  return title.year == null || item.year == null || title.year === item.year
}

/**
 * Bara posterna som hör till någon av titlarna, plus titlarna som inte
 * hittades i någon källa (de fylls på via reservvägen i sources.ts).
 */
export function restrictToTitles(items: PoolItem[], titles: readonly ChannelTitle[]): { items: PoolItem[]; missing: ChannelTitle[] } {
  const found = new Set<number>()
  const kept = items.filter((item) => {
    let hit = false
    titles.forEach((t, i) => {
      if (itemMatchesTitle(item, t)) { found.add(i); hit = true }
    })
    return hit
  })
  return { items: kept, missing: titles.filter((_, i) => !found.has(i)) }
}

/**
 * Kanalens regelfilter: utvalda titlar ersätter genre/epok/längd/slag.
 * `extra` = reservposter för titlar som saknas i källorna.
 */
export function applyChannelRules(items: PoolItem[], channel: Pick<ChannelDef, 'kind' | 'era' | 'length' | 'titles'> & { genres: readonly string[] }, extra: PoolItem[] = []): PoolItem[] {
  if (!hasTitles(channel)) return filterPool(items, channel)
  const { items: kept, missing } = restrictToTitles(items, channel.titles!)
  if (extra.length === 0) return kept
  // Bara reservposter för titlar som inte redan finns i någon källa.
  const add = extra.filter((e) => missing.some((t) => itemMatchesTitle(e, t)))
  return [...kept, ...add]
}

/** Högst så många poster per kanal (lagringen är trång på Android). */
export const MAX_POOL_ITEMS = 2000

/** FNV-1a: stabil spridning av grupper, samma på alla enheter. */
function hash(text: string, seed: number): number {
  let h = (0x811c9dc5 ^ seed) >>> 0
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

/**
 * Kapar poolen till `max` poster utan att slita sönder serier: hela grupper
 * (en serie eller en film) väljs i seedad, deterministisk ordning tills taket
 * nås. Samma pool och seed ger samma urval på varje enhet.
 */
export function capPool(items: PoolItem[], max: number, seed: number): PoolItem[] {
  if (items.length <= max) return items
  const groups = new Map<string, PoolItem[]>()
  for (const item of items) {
    const key = item.seriesKey ?? item.ref
    const list = groups.get(key)
    if (list) list.push(item)
    else groups.set(key, [item])
  }
  const order = [...groups.keys()].sort((a, b) => hash(a, seed) - hash(b, seed) || (a < b ? -1 : a > b ? 1 : 0))
  const kept = new Set<string>()
  let count = 0
  for (const key of order) {
    const size = groups.get(key)!.length
    if (count + size > max) {
      // En jätteserie som ensam spränger taket får sina första avsnitt hellre än inget.
      if (count === 0) {
        return groups.get(key)!.slice().sort((a, b) => (a.season ?? 0) - (b.season ?? 0) || (a.episode ?? 0) - (b.episode ?? 0)).slice(0, max)
      }
      continue
    }
    kept.add(key)
    count += size
    if (count === max) break
  }
  return items.filter((item) => kept.has(item.seriesKey ?? item.ref))
}
