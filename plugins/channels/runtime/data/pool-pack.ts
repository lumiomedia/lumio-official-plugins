/**
 * Kompakt lagringsform för poolcachen. Poolen i minnet bär genrer, id:n och
 * bild-URL:er per post; för en serie upprepas allt det per avsnitt (~550 tecken
 * per post, 100 serier × 40 avsnitt ≈ 2,5 M tecken per kanal). Lagrat behövs
 * bara det som tablå, hemrad, hero och zapp visar plus spelreferensen — serie-
 * gemensamma fält läggs i en grupptabell och refereras med index.
 *
 * Genrer, tmdbId och imdbId (utom i spelreferensen) sparas inte: filtrering
 * och dubblettrensning är redan gjorda när poolen sparas. Källan följer av
 * spelreferensen. Ren logik, ingen SDK.
 */
import type { PlayRef, PoolItem } from './pool'
import type { SourceId } from '../model/channel'

export const POOL_PACK_VERSION = 2

/** Grupp: det som delas av alla poster i samma serie (eller en film). */
interface PackedGroup { sk?: string; st?: string; p?: string; b?: string }

/** En post. `g` pekar i grupptabellen; `u` = längden är en standardgissning. */
interface PackedItem {
  r: string
  t: string
  m: number
  y: number | null
  e?: 1
  g?: number
  s?: number
  n?: number
  u?: 1
  /** Spelreferens utan säsong/avsnitt (de står i s/n). */
  p: PackedPlay
}

type PackedPlay =
  | { l: string; tv?: 1; v?: 1 }
  | { i: string; tv?: 1 }
  | { d: 'realdebrid' | 'torbox' | 'alldebrid'; f: string }

export interface PackedPool { v: typeof POOL_PACK_VERSION; g: PackedGroup[]; i: PackedItem[] }

function packPlay(play: PlayRef, source: SourceId): PackedPlay {
  if (play.type === 'library') {
    // v: posten kom från IPTV-VOD-källan (samma spelreferens, annan källa).
    const vod = source === 'vod' ? { v: 1 as const } : {}
    return play.mediaType === 'tv' ? { l: play.key, tv: 1, ...vod } : { l: play.key, ...vod }
  }
  if (play.type === 'stream') return play.mediaType === 'series' ? { i: play.imdbId, tv: 1 } : { i: play.imdbId }
  return { d: play.provider, f: play.fileRef }
}

function unpackPlay(p: PackedPlay, season?: number, episode?: number): PlayRef {
  const se = { ...(season != null ? { season } : {}), ...(episode != null ? { episode } : {}) }
  if ('l' in p) return { type: 'library', key: p.l, mediaType: p.tv ? 'tv' : 'movie', ...(p.tv ? se : {}) }
  if ('i' in p) return { type: 'stream', imdbId: p.i, mediaType: p.tv ? 'series' : 'movie', ...(p.tv ? se : {}) }
  return { type: 'debrid', provider: p.d, fileRef: p.f }
}

const SOURCE_OF: Record<'l' | 'i' | 'd', SourceId> = { l: 'library', i: 'watchlist', d: 'debrid' }

export function packPool(items: PoolItem[]): PackedPool {
  const groups: PackedGroup[] = []
  const groupIndex = new Map<string, number>()
  const out: PackedItem[] = []
  for (const item of items) {
    const group: PackedGroup = {
      ...(item.seriesKey ? { sk: item.seriesKey } : {}),
      ...(item.seriesTitle ? { st: item.seriesTitle } : {}),
      ...(item.posterUrl ? { p: item.posterUrl } : {}),
      ...(item.backdropUrl ? { b: item.backdropUrl } : {}),
    }
    let g: number | undefined
    if (Object.keys(group).length > 0) {
      const key = JSON.stringify(group)
      g = groupIndex.get(key)
      if (g === undefined) {
        g = groups.length
        groups.push(group)
        groupIndex.set(key, g)
      }
    }
    out.push({
      r: item.ref, t: item.title, m: item.runtimeMin, y: item.year,
      ...(item.kind === 'episode' ? { e: 1 as const } : {}),
      ...(g !== undefined ? { g } : {}),
      ...(item.season != null ? { s: item.season } : {}),
      ...(item.episode != null ? { n: item.episode } : {}),
      ...(item.runtimeKnown ? {} : { u: 1 as const }),
      p: packPlay(item.play, item.source),
    })
  }
  return { v: POOL_PACK_VERSION, g: groups, i: out }
}

/** null när värdet inte är en packad pool av rätt version (gammal cache räknas som kall). */
export function unpackPool(value: unknown): PoolItem[] | null {
  const packed = value as Partial<PackedPool> | null
  if (!packed || packed.v !== POOL_PACK_VERSION || !Array.isArray(packed.i) || !Array.isArray(packed.g)) return null
  const groups = packed.g
  return packed.i.map((it): PoolItem => {
    const group = it.g != null ? groups[it.g] ?? {} : {}
    const play = unpackPlay(it.p, it.s, it.n)
    const source: SourceId = 'l' in it.p && it.p.v ? 'vod' : SOURCE_OF['l' in it.p ? 'l' : 'i' in it.p ? 'i' : 'd']
    return {
      ref: it.r, title: it.t, runtimeMin: it.m, year: it.y, kind: it.e ? 'episode' : 'movie',
      ...(group.sk ? { seriesKey: group.sk } : {}),
      ...(it.s != null ? { season: it.s } : {}),
      ...(it.n != null ? { episode: it.n } : {}),
      source, genres: [], runtimeKnown: !it.u,
      ...(group.st ? { seriesTitle: group.st } : {}),
      ...(group.p ? { posterUrl: group.p } : {}),
      ...(group.b ? { backdropUrl: group.b } : {}),
      ...(play.type === 'stream' ? { imdbId: play.imdbId } : {}),
      play,
    }
  })
}
