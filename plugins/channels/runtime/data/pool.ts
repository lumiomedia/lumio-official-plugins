/**
 * Titelpoolen: allt en kanal KAN sända, efter regler och dubbletter.
 * Ren logik — källorna hämtas i sources.ts.
 */
import { ERA_RANGES, type ChannelDef, type SourceId } from '../model/channel'
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

const RANK: Record<SourceId, number> = { library: 0, debrid: 1, watchlist: 2 }

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
export function poolSignature(channel: ChannelDef, sourceSigs: Partial<Record<SourceId, string>>): string {
  const rules = poolRules(channel)
  return JSON.stringify({
    rules,
    sigs: Object.fromEntries(rules.sources.map((id) => [id, sourceSigs[id] ?? null])),
  })
}

/** Reglerna som avgör poolens innehåll (signaturens regeldel). */
export function poolRules(channel: Pick<ChannelDef, 'sources' | 'genres' | 'era' | 'length' | 'kind'>) {
  return {
    sources: [...channel.sources].sort(),
    genres: canonGenres(channel.genres).sort(),
    era: channel.era, length: channel.length, kind: channel.kind,
  }
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
