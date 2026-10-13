/**
 * Titelpoolen: allt en kanal KAN sända, efter regler och dubbletter.
 * Ren logik — källorna hämtas i sources.ts.
 */
import { ERA_RANGES, type ChannelDef, type SourceId } from '../model/channel'
import type { ScheduleItem } from '../model/schedule'

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
  const wanted = channel.genres.map((g) => g.toLowerCase())
  const range = channel.era === 'any' ? null : ERA_RANGES[channel.era]
  return items.filter((item) => {
    if (channel.kind === 'movie' && item.kind !== 'movie') return false
    if (channel.kind === 'tv' && item.kind !== 'episode') return false
    if (wanted.length > 0 && !item.genres.some((g) => wanted.includes(g.toLowerCase()))) return false
    if (range && (item.year == null || item.year < range[0] || item.year > range[1])) return false
    return LENGTH_TEST[channel.length](item.runtimeMin)
  })
}

const RANK: Record<SourceId, number> = { library: 0, debrid: 1, watchlist: 2 }

export function dedupePool(items: PoolItem[]): PoolItem[] {
  const best = new Map<string, PoolItem>()
  for (const item of items) {
    const key = item.tmdbId != null ? `tmdb:${item.tmdbId}:${item.season ?? ''}:${item.episode ?? ''}` : `ref:${item.ref}`
    const current = best.get(key)
    if (!current || RANK[item.source] < RANK[current.source]) best.set(key, item)
  }
  return [...best.values()]
}

export function poolSignature(channel: ChannelDef, sourceSigs: Partial<Record<SourceId, string>>): string {
  return JSON.stringify({
    rules: {
      sources: [...channel.sources].sort(),
      genres: [...channel.genres].map((g) => g.toLowerCase()).sort(),
      era: channel.era, length: channel.length, kind: channel.kind,
    },
    sigs: Object.fromEntries(Object.entries(sourceSigs).sort(([a], [b]) => a.localeCompare(b))),
  })
}
