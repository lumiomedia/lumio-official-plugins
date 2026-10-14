import { describe, expect, it, vi } from 'vitest'
import { createMetaCache, createSeasonsCache, type SeasonsEntry, type TitleMeta } from './meta-cache'

function memoryStore() {
  let all: Record<string, TitleMeta> = {}
  return { read: () => all, write: (next: Record<string, TitleMeta>) => { all = next } }
}

describe('metadatacachen', () => {
  it('hämtar bara saknade titlar och högst två åt gången', async () => {
    let inFlight = 0
    let peak = 0
    const fetcher = vi.fn(async () => {
      inFlight += 1
      peak = Math.max(peak, inFlight)
      await new Promise((r) => setTimeout(r, 5))
      inFlight -= 1
      return { runtimeMin: 90, genres: ['Drama'], year: 2001 }
    })
    const cache = createMetaCache(memoryStore(), fetcher, () => 1000)
    await cache.ensure([1, 2, 3, 4, 5].map((tmdbId) => ({ kind: 'movie' as const, tmdbId })))
    expect(fetcher).toHaveBeenCalledTimes(5)
    expect(peak).toBeLessThanOrEqual(2)
    await cache.ensure([{ kind: 'movie', tmdbId: 1 }])
    expect(fetcher).toHaveBeenCalledTimes(5)
    expect(cache.get('movie', 1)).toMatchObject({ runtimeMin: 90, at: 1000 })
  })

  it('gränsen på två gäller globalt över samtida ensure()-anrop, med en skrivning per ensure', async () => {
    let inFlight = 0
    let peak = 0
    const fetcher = vi.fn(async () => {
      inFlight += 1
      peak = Math.max(peak, inFlight)
      await new Promise((r) => setTimeout(r, 5))
      inFlight -= 1
      return { runtimeMin: 90, genres: [], year: null }
    })
    const store = memoryStore()
    const write = vi.spyOn(store, 'write')
    const cache = createMetaCache(store, fetcher, () => 1000)
    const ids = (from: number) => [0, 1, 2, 3].map((i) => ({ kind: 'movie' as const, tmdbId: from + i }))
    await Promise.all([cache.ensure(ids(1)), cache.ensure(ids(100))])
    expect(fetcher).toHaveBeenCalledTimes(8)
    expect(peak).toBeLessThanOrEqual(2)
    expect(write).toHaveBeenCalledTimes(2)
  })

  it('hämtar om efter 30 dagar och tål fel från fetchern', async () => {
    let now = 0
    const fetcher = vi.fn(async (_k: 'movie' | 'tv', id: number) => (id === 9 ? null : { runtimeMin: 50, genres: [], year: null }))
    const cache = createMetaCache(memoryStore(), fetcher, () => now)
    await cache.ensure([{ kind: 'tv', tmdbId: 1 }, { kind: 'tv', tmdbId: 9 }])
    expect(cache.get('tv', 9)).toBeNull()
    now = 31 * 24 * 3600 * 1000
    await cache.ensure([{ kind: 'tv', tmdbId: 1 }])
    expect(fetcher).toHaveBeenCalledTimes(3)
  })
})

describe('säsongscachen', () => {
  it('cachar 30 dagar, delar samtida uppslag och cachar inte tomma svar', async () => {
    let all: Record<string, SeasonsEntry> = {}
    let now = 0
    const fetcher = vi.fn(async (id: number) => (id === 9 ? [] : [{ season: 1, episodes: [{ episode: 1, title: 'x', runtime: 40 }] }]))
    const load = createSeasonsCache({ read: () => all, write: (n) => { all = n } }, fetcher, () => now)
    await Promise.all([load(1), load(1)])
    expect(fetcher).toHaveBeenCalledTimes(1)
    await load(1)
    expect(fetcher).toHaveBeenCalledTimes(1)
    await load(9)
    await load(9)
    expect(fetcher).toHaveBeenCalledTimes(3)
    now = 31 * 24 * 3600 * 1000
    await load(1)
    expect(fetcher).toHaveBeenCalledTimes(4)
  })

  it('skriver en gång per skur och släpper utgångna poster', async () => {
    let all: Record<string, SeasonsEntry> = { 'seasons:7': { seasons: [], at: 0 } }
    const write = vi.fn((n: Record<string, SeasonsEntry>) => { all = n })
    const now = 31 * 24 * 3600 * 1000
    const load = createSeasonsCache({ read: () => all, write }, async () => [{ season: 1, episodes: [] }], () => now)
    await Promise.all([load(1), load(2), load(3)])
    load.flush()
    expect(write).toHaveBeenCalledTimes(1)
    expect(Object.keys(all).sort()).toEqual(['seasons:1', 'seasons:2', 'seasons:3'])
  })
})

describe('metadatacachens skrivningar', () => {
  it('ensure över många titlar skriver en gång och släpper utgångna poster', async () => {
    let all: Record<string, TitleMeta> = { 'movie:999': { runtimeMin: 1, genres: [], year: null, at: 0 } }
    const write = vi.fn((n: Record<string, TitleMeta>) => { all = n })
    const now = 31 * 24 * 3600 * 1000
    const cache = createMetaCache({ read: () => all, write }, async () => ({ runtimeMin: 90, genres: [], year: 2000 }), () => now)
    await cache.ensure(Array.from({ length: 20 }, (_, i) => ({ kind: 'movie' as const, tmdbId: i + 1 })))
    expect(write).toHaveBeenCalledTimes(1)
    expect(Object.keys(all)).toHaveLength(20)
    expect(all['movie:999']).toBeUndefined()
    expect(cache.get('movie', 5)).not.toBeNull()
  })
})

describe('läsningar av lagret', () => {
  it('N get() efter en ensure() ger en enda läsning av kartan', async () => {
    const all: Record<string, TitleMeta> = {}
    for (let i = 1; i <= 50; i += 1) all[`movie:${i}`] = { runtimeMin: 90, genres: [], year: 2000, at: 1000 }
    const store = { read: vi.fn(() => all), write: vi.fn() }
    const cache = createMetaCache(store, async () => null, () => 1000)
    await cache.ensure(Array.from({ length: 50 }, (_, i) => ({ kind: 'movie' as const, tmdbId: i + 1 })))
    for (let i = 1; i <= 50; i += 1) expect(cache.get('movie', i)).not.toBeNull()
    expect(store.read).toHaveBeenCalledTimes(1)
    expect(store.write).not.toHaveBeenCalled()
  })

  it('get() utan föregående ensure() läser kartan en gång', () => {
    const store = { read: vi.fn(() => ({ 'tv:7': { runtimeMin: 45, genres: [], year: null, at: 1000 } })), write: vi.fn() }
    const cache = createMetaCache(store, async () => null, () => 1000)
    for (let i = 0; i < 20; i += 1) cache.get('tv', 7)
    expect(store.read).toHaveBeenCalledTimes(1)
  })

  it('säsongscachen läser kartan en gång för många serier', async () => {
    const all: Record<string, SeasonsEntry> = {}
    for (let i = 1; i <= 30; i += 1) all[`seasons:${i}`] = { seasons: [{ season: 1, episodes: [] }], at: 1000 }
    const store = { read: vi.fn(() => all), write: vi.fn() }
    const load = createSeasonsCache(store, async () => [], () => 1000)
    for (let i = 1; i <= 30; i += 1) await load(i)
    expect(store.read).toHaveBeenCalledTimes(1)
  })
})
