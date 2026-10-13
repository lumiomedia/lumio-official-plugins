import { describe, expect, it } from 'vitest'
import { dedupePool, filterPool, poolSignature, type PoolItem } from './pool'
import { createChannel, emptyDraft } from '../model/channel'

const p = (over: Partial<PoolItem>): PoolItem => ({
  ref: 'r', title: 't', runtimeMin: 100, runtimeKnown: true, year: 1985, kind: 'movie', source: 'library', genres: ['Science Fiction'],
  play: { type: 'library', key: 'k', mediaType: 'movie' }, ...over,
})

describe('filterPool', () => {
  const base = { kind: 'any', genres: [], era: 'any', length: 'any' } as const
  it('filtrerar typ, genre, era och längd', () => {
    const items = [
      p({ ref: 'a' }),
      p({ ref: 'b', kind: 'episode', runtimeMin: 45 }),
      p({ ref: 'c', year: 1995 }),
      p({ ref: 'd', genres: ['Drama'] }),
      p({ ref: 'e', year: null }),
      p({ ref: 'f', runtimeMin: 25 }),
    ]
    expect(filterPool(items, { ...base, kind: 'tv' }).map((i) => i.ref)).toEqual(['b'])
    expect(filterPool(items, { ...base, genres: ['science fiction'] }).map((i) => i.ref)).toEqual(['a', 'b', 'c', 'e', 'f'])
    expect(filterPool(items, { ...base, era: '80s' }).map((i) => i.ref)).toEqual(['a', 'b', 'd', 'f'])
    expect(filterPool(items, { ...base, length: 'short' }).map((i) => i.ref)).toEqual(['f'])
    expect(filterPool(items, { ...base, length: 'episode' }).map((i) => i.ref)).toEqual(['b', 'f'])
    expect(filterPool(items, { ...base, length: 'feature' }).map((i) => i.ref)).toEqual(['a', 'c', 'd', 'e'])
  })
})

describe('dedupePool', () => {
  it('library vinner över debrid som vinner över watchlist', () => {
    const items = [
      p({ ref: 'wl', source: 'watchlist', tmdbId: 1 }),
      p({ ref: 'db', source: 'debrid', tmdbId: 1 }),
      p({ ref: 'lib', source: 'library', tmdbId: 1 }),
      p({ ref: 'db2', source: 'debrid', tmdbId: 2 }),
      p({ ref: 'wl2', source: 'watchlist', tmdbId: 2 }),
      p({ ref: 'solo' }),
    ]
    expect(dedupePool(items).map((i) => i.ref).sort()).toEqual(['db2', 'lib', 'solo'])
  })

  it('skiljer avsnitt åt', () => {
    const items = [
      p({ ref: 'e1', kind: 'episode', tmdbId: 5, season: 1, episode: 1 }),
      p({ ref: 'e2', kind: 'episode', tmdbId: 5, season: 1, episode: 2 }),
    ]
    expect(dedupePool(items)).toHaveLength(2)
  })
})

describe('poolSignature', () => {
  it('ändras med regler och källsignatur men inte med ordningen i listor', () => {
    const ch = createChannel({ ...emptyDraft(), name: 'A', sources: ['library', 'debrid'], genres: ['Drama', 'Action'] }, [], 1, () => 0.1)
    const swapped = { ...ch, sources: ['debrid', 'library'] as const, genres: ['Action', 'Drama'] }
    expect(poolSignature(ch, { library: '1' })).toBe(poolSignature(swapped as never, { library: '1' }))
    expect(poolSignature(ch, { library: '2' })).not.toBe(poolSignature(ch, { library: '1' }))
    expect(poolSignature({ ...ch, era: '80s' }, { library: '1' })).not.toBe(poolSignature(ch, { library: '1' }))
    expect(poolSignature({ ...ch, order: 'chrono' }, { library: '1' })).toBe(poolSignature(ch, { library: '1' }))
  })
})
