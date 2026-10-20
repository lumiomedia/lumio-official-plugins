import { describe, expect, it } from 'vitest'
import { orderDebridVersions, resolutionOf } from './debrid-versions'
import { createResolver } from './resolve'
import { dedupePool, type PoolItem } from '../data/pool'

const GB = 1024 ** 3
const v = (fileRef: string, name: string, gb: number, provider: 'torbox' | 'realdebrid' = 'torbox') => ({ provider, fileRef, name, size: gb * GB })

describe('debrid-versioner', () => {
  it('läser upplösningen ur filnamnet', () => {
    expect(resolutionOf('Film.2160p.REMUX.mkv')).toBe(2160)
    expect(resolutionOf('Film 1080p WEB')).toBe(1080)
    expect(resolutionOf('Film.mkv')).toBeNull()
  })

  it('inom taket först (bästa först), över taket sist (minsta först)', () => {
    const order = orderDebridVersions(
      [v('4k', 'F.2160p', 60), v('big', 'F.1080p', 30), v('ok', 'F.1080p', 8), v('sd', 'F.720p', 2)],
      { maxBytes: 10 * GB, maxResolution: 1080 },
    )
    expect(order.map((x) => x.fileRef)).toEqual(['ok', 'sd', 'big', '4k'])
  })

  it('poolen slår ihop samma titel och minns de andra filerna', () => {
    const item = (fileRef: string, provider: 'torbox' | 'realdebrid'): PoolItem => ({
      ref: `db:${provider}:${fileRef}`, title: 'Life of Brian', kind: 'movie', source: 'debrid', tmdbId: 583, genres: [], year: 1979,
      runtimeMin: 94, runtimeKnown: true, play: { type: 'debrid', provider, fileRef },
    } as PoolItem)
    const [one, ...rest] = dedupePool([item('a', 'realdebrid'), item('b', 'torbox')])
    expect(rest).toHaveLength(0)
    expect(one!.play.type === 'debrid' && [one!.play.fileRef, ...(one!.play.alts ?? []).map((x) => x.fileRef)].sort()).toEqual(['a', 'b'])
  })

  it('en nekad upplåsning (utgånget konto) går vidare till nästa version', async () => {
    const asked: string[] = []
    const resolver = createResolver({
      library: async () => null,
      stream: async () => null,
      debrid: async (r) => { asked.push(r.fileRef); return r.provider === 'realdebrid' ? null : { url: `https://cdn/${r.fileRef}` } },
      debridCaps: () => ({ maxBytes: null, maxResolution: null }),
    })
    const item = {
      ref: 'db:realdebrid:rd1', title: 'X', kind: 'movie', source: 'debrid', genres: [], year: null, runtimeMin: 90, runtimeKnown: true,
      play: { type: 'debrid', provider: 'realdebrid', fileRef: 'rd1', name: 'X.1080p', size: 9 * GB, alts: [v('tb1', 'X.1080p', 8)] },
    } as unknown as PoolItem
    expect((await resolver.resolve(item))?.url).toBe('https://cdn/tb1')
    // Nästa försök (filen dog): inga fler versioner.
    expect(await resolver.resolve(item, ['https://cdn/tb1'])).toBeNull()
    expect(asked).toEqual(['rd1', 'tb1'])
  })

  it('en död fil provas aldrig: nästa version direkt, utan anrop', async () => {
    const asked: string[] = []
    const resolver = createResolver({
      library: async () => null,
      stream: async () => null,
      debrid: async (r) => { asked.push(r.fileRef); return { url: `https://cdn/${r.fileRef}` } },
      isDead: (f) => f.fileRef === 'rd1',
    })
    const item = {
      ref: 'db:realdebrid:rd1', title: 'X', kind: 'movie', source: 'debrid', genres: [], year: null, runtimeMin: 90, runtimeKnown: true,
      play: { type: 'debrid', provider: 'realdebrid', fileRef: 'rd1', alts: [{ provider: 'torbox', fileRef: 'tb1' }] },
    } as unknown as PoolItem
    expect((await resolver.resolve(item))?.url).toBe('https://cdn/tb1')
    expect(asked).toEqual(['tb1'])
  })
})
