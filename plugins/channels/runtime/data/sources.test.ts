import { describe, expect, it, vi } from 'vitest'
import { loadDebridItems, loadLibraryItems, loadPool, loadWatchlistItems, type SourceDeps } from './sources'
import { createSeasonsCache, type SeasonsEntry } from './meta-cache'
import { createChannel, emptyDraft } from '../model/channel'

function deps(over: Partial<SourceDeps> = {}): SourceDeps {
  return {
    queryLibrary: vi.fn(async () => ({ items: [
      { key: 'm1', kind: 'movie' as const, tmdbId: 1, title: 'Alien', year: 1979, genres: ['Science Fiction'], runtimeMin: null },
      { key: 's1', kind: 'series' as const, tmdbId: 2, title: 'Reacher', year: 2022, genres: ['Action'], episodes: [
        { key: 'e1', season: 1, episode: 1, title: 'Welcome', runtimeMin: 48 },
      ] },
    ] })),
    getMovieWatchlist: () => [{ tmdbId: 1, imdbId: 'tt1', title: 'Alien' }, { tmdbId: 3, imdbId: 'tt3', title: 'Heat' }],
    getWatchlist: () => [{ tmdbId: 4, imdbId: 'tt4', title: 'Dark' }],
    fetchSeasons: vi.fn(async () => [{ season: 1, episodes: [{ episode: 1, title: 'Secrets', runtime: 51 }] }]),
    listDebridCloud: vi.fn(async () => [{ kind: 'movie' as const, title: 'Unknown', year: null, files: [{ provider: 'torbox' as const, fileRef: '7|1' }] }]),
    meta: { get: (kind: 'movie' | 'tv', id: number) => (id === 1 ? { runtimeMin: 117, genres: ['Horror'], year: 1979, at: 0 } : id === 3 ? { runtimeMin: 170, genres: ['Crime'], year: 1995, imdbId: 'tt3', at: 0 } : null), ensure: vi.fn(async () => {}) },
    ...over,
  }
}

describe('källadaptrarna', () => {
  it('bibliotek: film + avsnitt, runtime från metadata, annars standard', async () => {
    const d = deps()
    const items = await loadLibraryItems(d)
    expect(d.queryLibrary).toHaveBeenCalledWith({ kind: 'recent', full: true, limit: 200, offset: 0 })
    expect(items.map((i) => [i.ref, i.runtimeMin, i.runtimeKnown, i.kind])).toEqual([
      ['lib:m1', 117, true, 'movie'],
      ['lib:s1:e1', 48, true, 'episode'],
    ])
    expect(items[1]).toMatchObject({ seriesKey: 'lib:s1', season: 1, episode: 1, play: { type: 'library', key: 's1', mediaType: 'tv', season: 1, episode: 1 } })
  })

  it('watchlist: filmer som strömuppslag, serier som avsnitt', async () => {
    const items = await loadWatchlistItems(deps())
    expect(items.map((i) => i.ref)).toEqual(['wl:movie:1', 'wl:movie:3', 'wl:tv:4:1:1'])
    expect(items[2]).toMatchObject({ runtimeMin: 51, play: { type: 'stream', imdbId: 'tt4', mediaType: 'series', season: 1, episode: 1 } })
  })

  it('debrid: omatchade titlar med standardlängd', async () => {
    const items = await loadDebridItems(deps())
    expect(items[0]).toMatchObject({ ref: 'db:torbox:7|1', runtimeMin: 100, runtimeKnown: false, play: { type: 'debrid', provider: 'torbox', fileRef: '7|1' } })
  })

  it('loadPool laddar bara valda källor och slår ihop dubletter', async () => {
    const d = deps()
    const ch = createChannel({ ...emptyDraft(), name: 'A', sources: ['library', 'watchlist'], kind: 'movie' }, [], 1, () => 0.1)
    const pool = await loadPool(ch, d)
    expect(d.listDebridCloud).not.toHaveBeenCalled()
    expect(pool.map((i) => i.ref).sort()).toEqual(['lib:m1', 'wl:movie:3'])
  })

  it('en källa som kastar ger de andra källornas titlar', async () => {
    const ch = createChannel({ ...emptyDraft(), name: 'A', sources: ['library', 'debrid'] }, [], 1, () => 0.1)
    const pool = await loadPool(ch, deps({ listDebridCloud: vi.fn(async () => { throw new Error('nät') }) }))
    expect(pool.length).toBeGreaterThan(0)
  })

  it('watchlist: andra laddningen gör inga nya säsongsanrop', async () => {
    let all: Record<string, SeasonsEntry> = {}
    const fetcher = vi.fn(async () => [{ season: 1, episodes: [{ episode: 1, title: 'S', runtime: 51 }] }])
    const d = deps({ fetchSeasons: createSeasonsCache({ read: () => all, write: (n) => { all = n } }, fetcher) })
    await loadWatchlistItems(d)
    await loadWatchlistItems(d)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('debrid: avsnitt utan nummer från samma serie blir egna poolposter', async () => {
    const f = (n: number) => ({ provider: 'torbox' as const, fileRef: `${n}|1` })
    const d = deps({ listDebridCloud: vi.fn(async () => [{ kind: 'tv' as const, title: 'Show', year: 2000, tmdbId: 11, files: [f(1), f(2)] }]) })
    const pool = await loadPool(createChannel({ ...emptyDraft(), name: 'A', sources: ['debrid'] }, [], 1, () => 0.1), d)
    expect(pool).toHaveLength(2)
  })

  it('bibliotek: längd ur egen runtime, annars metadata, annars standard', async () => {
    const ensure = vi.fn(async () => {})
    const d = deps({
      queryLibrary: vi.fn(async () => ({ items: [
        { key: 'a', kind: 'series' as const, tmdbId: 1, title: 'A', episodes: [{ key: 'e1', season: 1, episode: 1 }, { key: 'e2', season: 1, episode: 2, runtimeMin: 30 }] },
        { key: 'b', kind: 'series' as const, tmdbId: 99, title: 'B', episodes: [{ key: 'e1', season: 1, episode: 1 }] },
      ] })),
      meta: { get: (_k: 'movie' | 'tv', id: number) => (id === 1 ? { runtimeMin: 55, genres: [], year: null, at: 0 } : null), ensure },
    })
    const items = await loadLibraryItems(d)
    expect(ensure).toHaveBeenCalledWith([{ kind: 'tv', tmdbId: 1 }, { kind: 'tv', tmdbId: 99 }])
    expect(items.map((i) => [i.ref, i.runtimeMin, i.runtimeKnown])).toEqual([
      ['lib:a:e1', 55, true], ['lib:a:e2', 30, true], ['lib:b:e1', 45, false],
    ])
  })

  it('bibliotek: kastar en senare sida behålls de tidigare', async () => {
    const page = Array.from({ length: 200 }, (_, i) => ({ key: `m${i}`, kind: 'movie' as const, title: 't', runtimeMin: 90 }))
    const q = vi.fn().mockResolvedValueOnce({ items: page, total: 400 }).mockRejectedValueOnce(new Error('nät'))
    const items = await loadLibraryItems(deps({ queryLibrary: q }))
    expect(items).toHaveLength(200)
  })

  it('strict: källfel kastar i stället för tom lista; utan strict som förut', async () => {
    const down = deps({ queryLibrary: vi.fn().mockRejectedValue(new Error('nät')), listDebridCloud: vi.fn().mockRejectedValue(new Error('nät')) })
    await expect(loadLibraryItems(down, { strict: true })).rejects.toThrow('nät')
    await expect(loadDebridItems(down, { strict: true })).rejects.toThrow('nät')
    expect(await loadLibraryItems(down)).toEqual([])
    // En senare sida som faller är inget källfel.
    const page = Array.from({ length: 200 }, (_, i) => ({ key: `m${i}`, kind: 'movie' as const, title: 't', runtimeMin: 90 }))
    const q = vi.fn().mockResolvedValueOnce({ items: page, total: 400 }).mockRejectedValueOnce(new Error('nät'))
    expect(await loadLibraryItems(deps({ queryLibrary: q }), { strict: true })).toHaveLength(200)
  })
})
