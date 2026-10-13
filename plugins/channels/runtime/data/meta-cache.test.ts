import { describe, expect, it, vi } from 'vitest'
import { createMetaCache, type TitleMeta } from './meta-cache'

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
