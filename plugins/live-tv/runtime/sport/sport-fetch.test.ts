import { afterEach, describe, expect, it, vi } from 'vitest'
import { SPORT_KEY_HEADER, sportFetch, sportFetchUrl } from './sport-fetch'

const req = { sport: 'football' as const, path: '/fixtures?date=2026-10-10', ttlS: 900 }

afterEach(() => { vi.unstubAllGlobals() })

describe('sport-fetch', () => {
  it('bygger URL:en med källa, sport, sökväg, ttl och läge', () => {
    const url = new URL(sportFetchUrl('api-sports', { ...req, finalAfter: 123 }, 'cache-first'), 'http://x')
    expect(url.pathname).toBe('/api/live-tv/sport/fetch')
    expect(Object.fromEntries(url.searchParams)).toEqual({ provider: 'api-sports', sport: 'football', path: '/fixtures?date=2026-10-10', ttl: '900', mode: 'cache-first', finalAfter: '123' })
  })

  it('skickar nyckeln i headern, aldrig i URL:en', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: { ok: 1 }, cached: false, fresh: true, fetchedAt: 5, quota: null, error: null })))
    vi.stubGlobal('fetch', fetchMock)
    const res = await sportFetch({ provider: 'api-sports', key: 'secret123', req, mode: 'cache-first' })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).not.toContain('secret123')
    expect((init.headers as Record<string, string>)[SPORT_KEY_HEADER]).toBe('secret123')
    expect(res).toEqual({ data: { ok: 1 }, cached: false, fresh: true, fetchedAt: 5, quota: null, error: null })
  })

  it('nätfel och 4xx blir felkoder, inte undantag', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline') }))
    expect((await sportFetch({ provider: 'api-sports', key: 'k123', req, mode: 'cache-first' })).error).toBe('network')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"not-allowed"}', { status: 403 })))
    expect((await sportFetch({ provider: 'api-sports', key: 'k123', req, mode: 'cache-first' })).error).toBe('not-allowed')
  })
})

describe('kvothanteraren äger varje anrop', () => {
  const sources = import.meta.glob('../**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
  it('bara budget.ts importerar sport-fetch med värde', () => {
    const offenders = Object.entries(sources)
      .filter(([path]) => !/\.test\.tsx?$/.test(path) && !/(^|\/)budget\.ts$/.test(path) && !/(^|\/)sport-fetch\.ts$/.test(path))
      .filter(([, src]) => /^import (?!type)[^\n]*sport-fetch'/m.test(src))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })
  it('bara budget.ts importerar sport-direct med värde', () => {
    const offenders = Object.entries(sources)
      .filter(([path]) => !/\.test\.tsx?$/.test(path) && !/(^|\/)budget\.ts$/.test(path) && !/(^|\/)sport-direct\.ts$/.test(path))
      .filter(([, src]) => /^import (?!type)[^\n]*sport-direct'/m.test(src))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })
  it('bara sport-fetch.ts känner genomkopplingens adress', () => {
    const offenders = Object.entries(sources)
      .filter(([path]) => !/\.test\.tsx?$/.test(path) && !/(^|\/)sport-fetch\.ts$/.test(path))
      .filter(([, src]) => src.includes('/api/live-tv/sport/fetch'))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })
})
