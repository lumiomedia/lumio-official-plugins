import { describe, expect, it, vi } from 'vitest'
import { librarySides, loadDebridItems, loadLibraryItems, loadPool, loadPoolProgressive, loadVodItems, loadWatchlistItems, type SourceDeps } from './sources'
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

describe('IPTV-VOD som egen källa', () => {
  const vodDeps = () => deps({
    queryLibrary: vi.fn(async () => ({ items: [
      { key: 'plex:1', kind: 'movie' as const, tmdbId: 10, title: 'Bara Plex', year: 2000, runtimeMin: 100, sourceId: 'plex-a', sources: ['plex-a'] },
      { key: 'xt:2', kind: 'movie' as const, tmdbId: 11, title: 'Bara VOD', year: 2001, runtimeMin: 100, sourceId: 'xtream-vod:xtream://h/u', sources: ['xtream-vod:xtream://h/u'] },
      { key: 'plex:3', kind: 'movie' as const, tmdbId: 12, title: 'Båda', year: 2002, runtimeMin: 100, sourceId: 'plex-a', sources: ['plex-a', 'xtream-vod:xtream://h/u'] },
    ] })),
  })

  it('titelns sidor: bibliotek om någon version är utanför VOD, VOD om någon är VOD', () => {
    expect(librarySides({ sources: ['plex-a'] })).toEqual({ library: true, vod: false })
    expect(librarySides({ sourceId: 'xtream-vod:x' })).toEqual({ library: false, vod: true })
    expect(librarySides({ sources: ['plex-a', 'xtream-vod:x'] })).toEqual({ library: true, vod: true })
    expect(librarySides({})).toEqual({ library: true, vod: false })
  })

  it('biblioteket utan VOD-katalogen, VOD-källan bara VOD-titlar; en hämtning delas', async () => {
    const d = vodDeps()
    const [lib, vod] = await Promise.all([loadLibraryItems(d), loadVodItems(d)])
    expect(lib.map((i) => [i.ref, i.source])).toEqual([['lib:plex:1', 'library'], ['lib:plex:3', 'library']])
    expect(vod.map((i) => [i.ref, i.source])).toEqual([['lib:xt:2', 'vod'], ['lib:plex:3', 'vod']])
    expect(d.queryLibrary).toHaveBeenCalledTimes(1)
  })

  it('kanal utan VOD får inga VOD-titlar; med VOD dubblettrensas den sammanslagna till biblioteket', async () => {
    const base = createChannel({ ...emptyDraft(), name: 'K', sources: ['library'] }, [], 1, () => 0.1)
    expect((await loadPool(base, vodDeps())).map((i) => i.ref).sort()).toEqual(['lib:plex:1', 'lib:plex:3'])
    const both = { ...base, sources: ['library', 'vod'] as const }
    const pool = await loadPool({ ...both, sources: [...both.sources] }, vodDeps())
    expect(pool.map((i) => [i.ref, i.source]).sort()).toEqual([['lib:plex:1', 'library'], ['lib:plex:3', 'library'], ['lib:xt:2', 'vod']])
  })
})

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
    expect(ensure).toHaveBeenCalledWith([{ kind: 'tv', tmdbId: 99 }])
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

describe('progressiv laddning', () => {
  it('första källan publiceras innan en långsam andra källa svarat', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((r) => { release = r })
    const d = deps({ listDebridCloud: vi.fn(async () => { await gate; return [] }) })
    const ch = createChannel({ ...emptyDraft(), name: 'A', sources: ['library', 'debrid'] }, [], 1, () => 0.1)
    const updates: string[][] = []
    const done = loadPoolProgressive(ch, d, (pool) => updates.push(pool.map((i) => i.ref)))
    await new Promise((r) => setTimeout(r, 0))
    expect(updates.length).toBeGreaterThan(0)
    expect(updates.at(-1)).toEqual(['lib:m1', 'lib:s1:e1'])
    release()
    expect((await done).map((i) => i.ref)).toEqual(['lib:m1', 'lib:s1:e1'])
  })

  it('metadata ligger inte på den kritiska vägen: berikningen publicerar om en gång', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((r) => { release = r })
    const known: Record<number, number> = {}
    const ensure = vi.fn(async () => { await gate; known[5] = 130; known[6] = 22 })
    const d = deps({
      queryLibrary: vi.fn(async () => ({ items: [
        { key: 'a', kind: 'movie' as const, tmdbId: 5, title: 'A' },
        { key: 'b', kind: 'movie' as const, tmdbId: 6, title: 'B' },
      ] })),
      meta: { get: (_k: 'movie' | 'tv', id: number) => (known[id] ? { runtimeMin: known[id]!, genres: [], year: null, at: 0 } : null), ensure },
    })
    const ch = createChannel({ ...emptyDraft(), name: 'A', sources: ['library'] }, [], 1, () => 0.1)
    const updates: Array<Array<[string, number, boolean]>> = []
    const done = loadPoolProgressive(ch, d, (pool) => updates.push(pool.map((i) => [i.ref, i.runtimeMin, i.runtimeKnown])))
    await new Promise((r) => setTimeout(r, 0))
    expect(updates).toEqual([[['lib:a', 100, false], ['lib:b', 100, false]]])
    release()
    await done
    expect(ensure).toHaveBeenCalledTimes(1)
    expect(updates).toHaveLength(2)
    expect(updates[1]).toEqual([['lib:a', 130, true], ['lib:b', 22, true]])
  })

  it('slutpoolen är densamma oavsett vilken källa som svarar först', async () => {
    const ch = createChannel({ ...emptyDraft(), name: 'A', sources: ['library', 'watchlist', 'debrid'] }, [], 1, () => 0.1)
    const slow = <T,>(ms: number, v: T) => new Promise<T>((r) => setTimeout(() => r(v), ms))
    const base = deps()
    const lib = await base.queryLibrary({})
    const deb = await base.listDebridCloud()
    const a = await loadPoolProgressive(ch, deps({ queryLibrary: () => slow(1, lib), listDebridCloud: () => slow(15, deb) }))
    const b = await loadPoolProgressive(ch, deps({ queryLibrary: () => slow(15, lib), listDebridCloud: () => slow(1, deb) }))
    expect(b).toEqual(a)
  })

  it('kanaler som laddar samtidigt delar en hämtning per källa', async () => {
    const d = deps()
    const a = createChannel({ ...emptyDraft(), name: 'A', sources: ['library', 'watchlist', 'debrid'] }, [], 1, () => 0.1)
    const b = createChannel({ ...emptyDraft(), name: 'B', sources: ['library', 'debrid'], kind: 'movie' }, [], 2, () => 0.2)
    const c = createChannel({ ...emptyDraft(), name: 'C', sources: ['watchlist'] }, [], 3, () => 0.3)
    const watch = vi.spyOn(d, 'getWatchlist')
    const [pa, pb, pc] = await Promise.all([loadPoolProgressive(a, d), loadPoolProgressive(b, d), loadPoolProgressive(c, d)])
    expect(d.queryLibrary).toHaveBeenCalledTimes(1)
    expect(d.listDebridCloud).toHaveBeenCalledTimes(1)
    expect(watch).toHaveBeenCalledTimes(1)
    expect(pa.length).toBeGreaterThan(0)
    expect(pb.every((i) => i.kind === 'movie')).toBe(true)
    expect(pc.map((i) => i.ref)).toContain('wl:tv:4:1:1')
    // Klar hämtning delas inte: nästa laddning hämtar igen.
    await loadPoolProgressive(b, d)
    expect(d.queryLibrary).toHaveBeenCalledTimes(2)
  })

  it('watchlist och metadataberikning väntar på startgrinden; biblioteket gör det inte', async () => {
    let open: () => void = () => {}
    const gate = new Promise<void>((r) => { open = r })
    const ensure = vi.fn(async () => {})
    const watch = vi.fn(() => [{ tmdbId: 3, imdbId: 'tt3', title: 'Heat' }])
    const d = deps({
      waitForIdle: () => gate,
      getMovieWatchlist: watch,
      queryLibrary: vi.fn(async () => ({ items: [{ key: 'x', kind: 'movie' as const, tmdbId: 77, title: 'X' }] })),
      meta: { get: () => null, ensure },
    })
    const ch = createChannel({ ...emptyDraft(), name: 'A', sources: ['library', 'watchlist'] }, [], 1, () => 0.1)
    const updates: string[][] = []
    const done = loadPoolProgressive(ch, d, (pool) => updates.push(pool.map((i) => i.ref)))
    await new Promise((r) => setTimeout(r, 0))
    expect(updates.at(-1)).toEqual(['lib:x'])
    expect(watch).not.toHaveBeenCalled()
    expect(ensure).not.toHaveBeenCalled()
    open()
    await done
    expect(watch).toHaveBeenCalled()
    expect(ensure).toHaveBeenCalled()
  })

  it('omatchad biblioteksfil: tvättad titel direkt, namnmatchas bakom grinden och slås ihop med den matchade', async () => {
    const matches: Record<string, number | null> = {}
    const titleMatch = {
      get: (r: { title: string; year: number | null }) => matches[`${r.title}|${r.year}`],
      ensure: vi.fn(async (list: Array<{ title: string; year: number | null }>) => { for (const r of list) matches[`${r.title}|${r.year}`] = r.title === 'Star Wars Episode VI Return of the Jedi' ? 1892 : null }),
    }
    const known: Record<number, { runtimeMin: number; genres: string[]; year: number; title: string; backdropUrl: string; at: number }> = {}
    const d = deps({
      titleMatch,
      queryLibrary: vi.fn(async () => ({ items: [
        { key: 'raw', kind: 'movie' as const, tmdbId: null, title: '03 Star Wars Episode VI Return of the Jedi', year: 1983 },
        { key: 'junk', kind: 'movie' as const, tmdbId: null, title: 'Avatar 4Kreescalado2160 pctmix1 com', year: null },
        { key: 'ep', kind: 'movie' as const, tmdbId: null, title: '[Cifer] Sousou no Frieren S1 - 01 [BD', year: null },
      ] })),
      meta: {
        get: (_k: 'movie' | 'tv', id: number) => known[id] ?? null,
        ensure: vi.fn(async () => { known[1892] = { runtimeMin: 131, genres: ['Action'], year: 1983, title: 'Return of the Jedi', backdropUrl: 'https://img/jedi.jpg', at: 0 } }),
      },
    })
    const ch = createChannel({ ...emptyDraft(), name: 'A', sources: ['library'] }, [], 1, () => 0.1)
    const updates: Array<Array<[string, string, string | undefined]>> = []
    const pool = await loadPoolProgressive(ch, d, (p) => updates.push(p.map((i) => [i.ref, i.title, i.backdropUrl])))
    expect(updates[0]).toEqual([
      ['lib:raw', 'Star Wars Episode VI Return of the Jedi', undefined],
      ['lib:junk', 'Avatar', undefined],
      ['lib:ep', 'Cifer Sousou no Frieren S1 - 01 BD', undefined],
    ])
    // Avsnittsliknande namn söks inte som film.
    expect(titleMatch.ensure.mock.calls[0]![0].map((r: { title: string }) => r.title)).toEqual(['Star Wars Episode VI Return of the Jedi', 'Avatar'])
    expect(pool.find((i) => i.ref === 'lib:raw')).toMatchObject({ title: 'Return of the Jedi', tmdbId: 1892, backdropUrl: 'https://img/jedi.jpg', runtimeMin: 131 })
  })

  it('samma titel två gånger: posten med bild vinner oavsett ordning', async () => {
    const meta = { get: (_k: 'movie' | 'tv', id: number) => (id === 1892 ? { runtimeMin: 131, genres: [], year: 1983, at: 0 } : null), ensure: vi.fn(async () => {}) }
    const raw = { key: 'raw', kind: 'movie' as const, tmdbId: 1892, title: '03 Star Wars', year: 1983 }
    const good = { key: 'good', kind: 'movie' as const, tmdbId: 1892, title: 'Return of the Jedi', year: 1983, backdropUrl: 'https://img/jedi.jpg' }
    const ch = createChannel({ ...emptyDraft(), name: 'A', sources: ['library'] }, [], 1, () => 0.1)
    const a = await loadPoolProgressive(ch, deps({ meta, queryLibrary: vi.fn(async () => ({ items: [raw, good] })) }))
    const b = await loadPoolProgressive(ch, deps({ meta, queryLibrary: vi.fn(async () => ({ items: [good, raw] })) }))
    expect(a.map((i) => i.ref)).toEqual(['lib:good'])
    expect(b.map((i) => i.ref)).toEqual(['lib:good'])
  })
})
