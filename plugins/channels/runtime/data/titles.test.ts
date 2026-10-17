import { describe, expect, it, vi } from 'vitest'
import { itemMatchesTitle, poolRules, poolSignature, restrictToTitles, type PoolItem } from './pool'
import { loadPool, loadPoolProgressive, type SourceDeps } from './sources'
import { createChannel, emptyDraft, sameRules, type ChannelDef } from '../model/channel'
import { lockSignature } from '../model/lock'

const item = (ref: string, over: Partial<PoolItem> = {}): PoolItem => ({
  ref, title: ref, runtimeMin: 60, runtimeKnown: true, year: 2010, kind: 'movie', source: 'library', genres: ['Drama'],
  play: { type: 'library', key: ref, mediaType: 'movie' }, ...over,
})
const ep = (ref: string, seriesTitle: string, over: Partial<PoolItem> = {}): PoolItem =>
  item(ref, { kind: 'episode', seriesTitle, seriesKey: `lib:${seriesTitle}`, season: 1, episode: 1, play: { type: 'library', key: seriesTitle, mediaType: 'tv', season: 1, episode: 1 }, ...over })

describe('titelmatchning', () => {
  it('tmdbId avgör när båda har ett — även mot samma namn', () => {
    expect(itemMatchesTitle(item('a', { tmdbId: 5, title: 'Heat' }), { kind: 'movie', tmdbId: 5, title: 'Annat' })).toBe(true)
    expect(itemMatchesTitle(item('a', { tmdbId: 6, title: 'Heat' }), { kind: 'movie', tmdbId: 5, title: 'Heat' })).toBe(false)
  })

  it('sedan biblioteksnyckel/seriesKey, sist tvättad titel + år', () => {
    expect(itemMatchesTitle(ep('e1', 'AT'), { kind: 'tv', libraryKey: 'AT', title: 'Något' })).toBe(true)
    expect(itemMatchesTitle(item('db1', { source: 'debrid', kind: 'episode', seriesKey: 'db:tv:Adventure Time' }), { kind: 'tv', libraryKey: 'db:tv:Adventure Time', title: 'x' })).toBe(true)
    expect(itemMatchesTitle(ep('e1', 'Adventure Time!', { year: 2010 }), { kind: 'tv', tmdbId: 15260, title: 'adventure time', year: 2010 })).toBe(true)
    expect(itemMatchesTitle(ep('e1', 'Adventure Time', { year: 2010 }), { kind: 'tv', title: 'Adventure Time', year: 2018 })).toBe(false)
    expect(itemMatchesTitle(ep('e1', 'Adventure Time', { year: null }), { kind: 'tv', title: 'Adventure Time', year: 2010 })).toBe(true)
  })

  it('slaget måste stämma: en film matchar aldrig en serie', () => {
    expect(itemMatchesTitle(item('m', { title: 'Adventure Time' }), { kind: 'tv', title: 'Adventure Time' })).toBe(false)
  })

  it('poolen begränsas till titlarna; genre/era/längd ignoreras, saknade titlar rapporteras', () => {
    const items = [ep('e1', 'Adventure Time', { tmdbId: 15260 }), ep('e2', 'Adventure Time', { tmdbId: 15260, episode: 2 }), item('heat', { tmdbId: 949 })]
    const { items: kept, missing } = restrictToTitles(items, [{ kind: 'tv', tmdbId: 15260, title: 'Adventure Time' }, { kind: 'movie', tmdbId: 1, title: 'Alien' }])
    expect(kept.map((i) => i.ref)).toEqual(['e1', 'e2'])
    expect(missing.map((t) => t.title)).toEqual(['Alien'])
  })
})

describe('signaturen och bakåtkompatibilitet', () => {
  const base = createChannel({ ...emptyDraft(), name: 'K' }, [], 1, () => 0.1)

  it('utan titlar (eller tom lista) är signaturen och låset som förut', () => {
    const rules = poolRules(base)
    expect(rules).not.toHaveProperty('titles')
    expect(poolSignature({ ...base, titles: [] }, {})).toBe(poolSignature(base, {}))
    expect(lockSignature({ ...base, titles: [] })).toBe(lockSignature(base))
  })

  it('titlar ändrar signaturen; ordningen mellan titlarna gör det inte', () => {
    const a = { kind: 'tv' as const, tmdbId: 15260, title: 'Adventure Time' }
    const b = { kind: 'movie' as const, tmdbId: 1, title: 'Alien' }
    const withA = poolSignature({ ...base, titles: [a] }, {})
    expect(withA).not.toBe(poolSignature(base, {}))
    expect(poolSignature({ ...base, titles: [a, b] }, {})).not.toBe(withA)
    expect(poolSignature({ ...base, titles: [b, a] }, {})).toBe(poolSignature({ ...base, titles: [a, b] }, {}))
    expect(lockSignature({ ...base, titles: [a] })).not.toBe(lockSignature(base))
  })

  it('en titelkanal är aldrig en regeldubblett av ett förval', () => {
    expect(sameRules(base, { ...base, titles: [{ kind: 'movie', title: 'X' }] })).toBe(false)
    expect(sameRules(base, { ...base })).toBe(true)
  })
})

function deps(over: Partial<SourceDeps> = {}): SourceDeps {
  return {
    queryLibrary: vi.fn(async () => ({ items: [
      { key: 'm1', kind: 'movie' as const, tmdbId: 1, title: 'Alien', year: 1979, genres: ['Horror'], runtimeMin: 117 },
      { key: 's1', kind: 'series' as const, tmdbId: 2, title: 'Reacher', year: 2022, genres: ['Action'], runtimeMin: 48, episodes: [
        { key: 'e1', season: 1, episode: 1, title: 'Welcome', runtimeMin: 48 },
      ] },
    ] })),
    getMovieWatchlist: () => [],
    getWatchlist: () => [],
    fetchSeasons: vi.fn(async () => [
      { season: 1, episodes: [{ episode: 1, title: 'Slumber Party Panic', runtime: 11 }, { episode: 2, title: 'Trouble in Lumpy Space', runtime: 11 }] },
      { season: 2, episodes: [{ episode: 1, title: 'It Came from the Nightosphere', runtime: 11 }] },
    ]),
    fetchRestSeasons: vi.fn(async () => [{ season: 4, episodes: [{ episode: 1, title: 'Hot to the Touch', runtime: 11 }] }]),
    listDebridCloud: vi.fn(async () => []),
    meta: {
      get: (kind: 'movie' | 'tv', id: number) => (
        kind === 'tv' && id === 15260 ? { title: 'Adventure Time', runtimeMin: 11, genres: ['Animation'], year: 2010, imdbId: 'tt1305826', posterUrl: 'p.jpg', at: 0 }
          : kind === 'movie' && id === 949 ? { title: 'Heat', runtimeMin: 170, genres: ['Crime'], year: 1995, imdbId: 'tt0113277', at: 0 }
            : null),
      ensure: vi.fn(async () => {}),
    },
    ...over,
  }
}

const titled = (titles: ChannelDef['titles'], over: Partial<ChannelDef> = {}): ChannelDef =>
  ({ ...createChannel({ ...emptyDraft(), name: 'T', sources: ['library'], genres: ['Comedy'], era: '80s', length: 'short', kind: 'movie' }, [], 1, () => 0.1), titles, ...over })

describe('poolen för en titelkanal', () => {
  it('bara titlarnas poster ur källorna; reglerna för genre/era/längd/slag gäller inte', async () => {
    const d = deps()
    const pool = await loadPool(titled([{ kind: 'tv', tmdbId: 2, title: 'Reacher' }]), d)
    expect(pool.map((i) => i.ref)).toEqual(['lib:s1:e1'])
    // Titeln fanns i en källa: inget reservuppslag.
    expect(d.fetchSeasons).not.toHaveBeenCalled()
  })

  it('utan titlar: reglerna gäller som förut', async () => {
    const pool = await loadPool(titled(undefined, { genres: ['Horror'], era: 'any', length: 'any', kind: 'any' }), deps())
    expect(pool.map((i) => i.ref)).toEqual(['lib:m1'])
  })

  it('saknad film blir en strömpost via imdbId', async () => {
    const pool = await loadPool(titled([{ kind: 'movie', tmdbId: 949, title: 'Heat', year: 1995 }]), deps())
    expect(pool).toEqual([expect.objectContaining({
      ref: 'ti:movie:949', kind: 'movie', title: 'Heat', runtimeMin: 170, source: 'watchlist',
      play: { type: 'stream', imdbId: 'tt0113277', mediaType: 'movie' },
    })])
  })

  it('saknad serie blir avsnitt: alla säsonger (1–3 först, resten efteråt)', async () => {
    const d = deps()
    const updates: string[][] = []
    const pool = await loadPoolProgressive(titled([{ kind: 'tv', tmdbId: 15260, title: 'Adventure Time' }]), d, (p) => updates.push(p.map((i) => i.ref)))
    expect(pool.map((i) => i.ref)).toEqual(['ti:tv:15260:1:1', 'ti:tv:15260:1:2', 'ti:tv:15260:2:1', 'ti:tv:15260:4:1'])
    expect(pool[0]).toMatchObject({ seriesKey: 'ti:tv:15260', seriesTitle: 'Adventure Time', runtimeMin: 11, posterUrl: 'p.jpg', play: { type: 'stream', imdbId: 'tt1305826', mediaType: 'series', season: 1, episode: 1 } })
    // Säsong 1–3 syns innan resten är hämtad.
    expect(updates.some((u) => u.length === 3)).toBe(true)
    expect(d.fetchSeasons).toHaveBeenCalledWith(15260)
    expect(d.fetchRestSeasons).toHaveBeenCalledWith(15260)
  })

  it('en saknad titel utan tmdbId (eller utan imdbId) ger inga poster och inga uppslag', async () => {
    const d = deps()
    const pool = await loadPool(titled([{ kind: 'tv', title: 'Okänd', libraryKey: 'x' }, { kind: 'movie', tmdbId: 77, title: 'Utan imdb' }]), d)
    expect(pool).toEqual([])
    expect(d.fetchSeasons).not.toHaveBeenCalled()
  })

  it('blandat: funnen titel ur källan + saknad via reservvägen', async () => {
    const pool = await loadPool(titled([{ kind: 'movie', tmdbId: 1, title: 'Alien' }, { kind: 'movie', tmdbId: 949, title: 'Heat' }]), deps())
    expect(pool.map((i) => i.ref).sort()).toEqual(['lib:m1', 'ti:movie:949'])
  })
})
