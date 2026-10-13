import { describe, expect, it, vi } from 'vitest'
import { createLatestGate, createResolver } from './resolve'
import type { PoolItem } from '../data/pool'

const item = (ref: string, play: PoolItem['play']): PoolItem =>
  ({ ref, title: ref, runtimeMin: 10, runtimeKnown: true, year: null, kind: 'movie', source: 'library', genres: [], play })

describe('createResolver', () => {
  it('väljer värdfunktion efter play.type', async () => {
    const deps = {
      library: vi.fn(async () => ({ url: 'L' })),
      stream: vi.fn(async () => ({ url: 'S', forceProxy: true })),
      debrid: vi.fn(async () => ({ url: 'D' })),
    }
    const r = createResolver(deps)
    expect(await r.resolve(item('a', { type: 'library', key: 'k', mediaType: 'movie' }))).toEqual({ url: 'L' })
    expect(await r.resolve(item('b', { type: 'stream', imdbId: 'tt1', mediaType: 'movie' }))).toEqual({ url: 'S', forceProxy: true })
    expect(await r.resolve(item('c', { type: 'debrid', provider: 'torbox', fileRef: '1|2' }))).toEqual({ url: 'D' })
  })

  it('cachar i 10 min, delar pågående löften och cachar inte null', async () => {
    let now = 0
    const library = vi.fn(async () => ({ url: 'L' }))
    const stream = vi.fn(async () => null)
    const r = createResolver({ library, stream, debrid: vi.fn() }, () => now)
    const a = item('a', { type: 'library', key: 'k', mediaType: 'movie' })
    await Promise.all([r.resolve(a), r.resolve(a)])
    expect(library).toHaveBeenCalledTimes(1)
    now = 9 * 60_000
    await r.resolve(a)
    expect(library).toHaveBeenCalledTimes(1)
    now = 11 * 60_000
    await r.resolve(a)
    expect(library).toHaveBeenCalledTimes(2)
    const s = item('s', { type: 'stream', imdbId: 'tt', mediaType: 'movie' })
    await r.resolve(s)
    await r.resolve(s)
    expect(stream).toHaveBeenCalledTimes(2)
  })

  it('forget tvingar ny resolve, och ett kastat fel blir null', async () => {
    const library = vi.fn(async () => ({ url: 'L' }))
    const r = createResolver({ library, stream: vi.fn(), debrid: vi.fn() })
    const a = item('a', { type: 'library', key: 'k', mediaType: 'movie' })
    await r.resolve(a)
    r.forget('a')
    await r.resolve(a)
    expect(library).toHaveBeenCalledTimes(2)
    const failing = createResolver({ library: vi.fn(async () => { throw new Error('x') }), stream: vi.fn(), debrid: vi.fn() })
    expect(await failing.resolve(a)).toBeNull()
  })
})

describe('createLatestGate', () => {
  it('bara den senaste begäran är aktuell', () => {
    const gate = createLatestGate()
    const first = gate.begin()
    const second = gate.begin()
    expect(gate.isCurrent(first)).toBe(false)
    expect(gate.isCurrent(second)).toBe(true)
  })
})
