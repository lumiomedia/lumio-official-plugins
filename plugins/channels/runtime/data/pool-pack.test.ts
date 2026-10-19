import { describe, expect, it } from 'vitest'
import { capPool, MAX_POOL_ITEMS, type PoolItem } from './pool'
import { packPool, unpackPool } from './pool-pack'

const POSTER = 'https://image.tmdb.org/t/p/w500/abcdefghijklmnopqrstuvwxyz012345.jpg'
const BACKDROP = 'https://image.tmdb.org/t/p/original/abcdefghijklmnopqrstuvwxyz012345.jpg'

/** Realistiska avsnitt: 100 serier × 40 avsnitt, samma långa fält per serie. */
function bigPool(series = 100, episodes = 40): PoolItem[] {
  const out: PoolItem[] = []
  for (let s = 0; s < series; s += 1) {
    for (let e = 1; e <= episodes; e += 1) {
      const season = Math.ceil(e / 10)
      const episode = ((e - 1) % 10) + 1
      out.push({
        ref: `lib:plex-1:${1000 + s}:plex-1:${50000 + s * 100 + e}`, title: `Avsnittets titel nummer ${e}`, seriesTitle: `En ganska lång serietitel ${s}`,
        kind: 'episode', seriesKey: `lib:plex-1:${1000 + s}`, season, episode, runtimeMin: 45, runtimeKnown: true, year: 2010 + (s % 10),
        source: 'library', genres: ['Science Fiction', 'Drama', 'Action & Adventure'], tmdbId: 90000 + s, imdbId: `tt${7000000 + s}`,
        posterUrl: POSTER, backdropUrl: BACKDROP,
        play: { type: 'library', key: `plex-1:${1000 + s}`, mediaType: 'tv', season, episode },
      })
    }
  }
  return out
}

describe('packPool/unpackPool', () => {
  it('håller lagrad storlek per post liten', () => {
    const items = bigPool()
    const full = JSON.stringify(items).length / items.length
    const packed = JSON.stringify(packPool(items)).length / items.length
    expect(full).toBeGreaterThan(450)
    expect(packed).toBeLessThan(150)
  })

  it('bevarar allt tablå, hero, hemrad och uppspelning behöver', () => {
    const items: PoolItem[] = [
      ...bigPool(1, 2),
      { ref: 'wl:movie:5', title: 'Alien', kind: 'movie', runtimeMin: 100, runtimeKnown: false, year: 1979, source: 'watchlist', genres: ['Horror'], tmdbId: 5, imdbId: 'tt0078748', posterUrl: POSTER, play: { type: 'stream', imdbId: 'tt0078748', mediaType: 'movie' } },
      { ref: 'wl:tv:9:1:2', title: 'Ep', seriesTitle: 'Show', kind: 'episode', seriesKey: 'wl:tv:9', season: 1, episode: 2, runtimeMin: 45, runtimeKnown: true, year: 2001, source: 'watchlist', genres: [], imdbId: 'tt9', play: { type: 'stream', imdbId: 'tt9', mediaType: 'series', season: 1, episode: 2 } },
      { ref: 'db:torbox:7|1', title: 'X', kind: 'movie', runtimeMin: 100, runtimeKnown: false, year: null, source: 'debrid', genres: [], play: { type: 'debrid', provider: 'torbox', fileRef: '7|1' } },
    ]
    const back = unpackPool(JSON.parse(JSON.stringify(packPool(items))))!
    const shown = (i: PoolItem) => ({ ref: i.ref, title: i.title, kind: i.kind, runtimeMin: i.runtimeMin, runtimeKnown: i.runtimeKnown, year: i.year, seriesKey: i.seriesKey, season: i.season, episode: i.episode, seriesTitle: i.seriesTitle, posterUrl: i.posterUrl, backdropUrl: i.backdropUrl, play: i.play, source: i.source })
    expect(back.map(shown)).toEqual(items.map(shown))
  })

  it('en gammal (opackad) cache räknas som kall', () => {
    expect(unpackPool({ sig: 'x', items: [] })).toBeNull()
    expect(unpackPool(null)).toBeNull()
  })
})

describe('capPool', () => {
  it('håller taket, är deterministisk och slår inte sönder serier', () => {
    const items = bigPool(100, 40) // 4000 poster
    const a = capPool(items, MAX_POOL_ITEMS, 42)
    const b = capPool([...items].reverse(), MAX_POOL_ITEMS, 42)
    expect(a.length).toBeLessThanOrEqual(MAX_POOL_ITEMS)
    expect(a.length).toBe(2000)
    expect(new Set(a.map((i) => i.ref))).toEqual(new Set(b.map((i) => i.ref)))
    const perSeries = new Map<string, number>()
    for (const i of a) perSeries.set(i.seriesKey!, (perSeries.get(i.seriesKey!) ?? 0) + 1)
    expect([...perSeries.values()].every((n) => n === 40)).toBe(true)
    expect(JSON.stringify(packPool(a)).length).toBeLessThan(2000 * 150)
  })

  it('rör inte en pool under taket', () => {
    const items = bigPool(2, 3)
    expect(capPool(items, MAX_POOL_ITEMS, 1)).toBe(items)
  })

  it('en ensam serie över taket ger sina första avsnitt', () => {
    const items = bigPool(1, 40)
    const out = capPool(items, 15, 1)
    expect(out).toHaveLength(15)
    expect(out[0]).toMatchObject({ season: 1, episode: 1 })
  })
})

describe('poolpackningen: IPTV-VOD', () => {
  it('en VOD-post behåller sin källa genom packning', () => {
    const vod: PoolItem = { ref: 'lib:xt:2', title: 'V', runtimeMin: 90, runtimeKnown: true, year: 2001, kind: 'movie', source: 'vod', genres: [], play: { type: 'library', key: 'xt:2', mediaType: 'movie' } }
    const lib: PoolItem = { ...vod, ref: 'lib:p:1', source: 'library', play: { type: 'library', key: 'p:1', mediaType: 'movie' } }
    expect(unpackPool(packPool([vod, lib]))!.map((i) => i.source)).toEqual(['vod', 'library'])
  })
})
