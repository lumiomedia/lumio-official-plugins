import { describe, expect, it, vi } from 'vitest'
import { createMdblistApi, type ApiAuth } from './api'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function setup(responses: Response[], auth: ApiAuth | null = { apikey: 'k' }) {
  let clock = 1_000_000
  const fetchImpl = vi.fn(async () => responses.shift() ?? jsonResponse(500, { error: 'slut' }))
  const api = createMdblistApi({
    fetchImpl: fetchImpl as unknown as typeof fetch,
    getAuth: async () => auth,
    now: () => clock,
    log: () => {},
  })
  return { api, fetchImpl, tick: (ms: number) => { clock += ms } }
}

const bodyOf = (fetchImpl: ReturnType<typeof vi.fn>, n = 0) =>
  JSON.parse(String((fetchImpl.mock.calls[n] as unknown as [string, RequestInit])[1].body))

describe('MDBList-klienten', () => {
  it('skickar nyckel, metod och sökväg till proxyn och packar upp data', async () => {
    const { api, fetchImpl } = setup([jsonResponse(200, { data: { username: 'jerry' } })])
    const result = await api.call('GET', '/user')
    expect(result).toEqual({ ok: true, data: { username: 'jerry' } })
    expect((fetchImpl.mock.calls[0] as unknown as [string])[0]).toBe('/api/plugins/mdblist/call')
    expect(bodyOf(fetchImpl)).toEqual({ apikey: 'k', method: 'GET', path: '/user' })
  })

  it('en OAuth-token skickas som accessToken, inte som nyckel', async () => {
    const { api, fetchImpl } = setup([jsonResponse(200, { data: {} })], { accessToken: 't' })
    await api.call('GET', '/user')
    expect(bodyOf(fetchImpl)).toEqual({ accessToken: 't', method: 'GET', path: '/user' })
  })

  it('utan auth görs inget anrop', async () => {
    const { api, fetchImpl } = setup([], null)
    const result = await api.call('GET', '/user')
    expect(result.ok).toBe(false)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('429 pausar ALLA anrop tills retryAfter har gått', async () => {
    const { api, fetchImpl, tick } = setup([
      jsonResponse(429, { error: 'rate limited', retryAfter: 30 }),
      jsonResponse(200, { data: {} }),
    ])
    expect((await api.call('POST', '/scrobble/start', { body: {} })).ok).toBe(false)
    const paused = await api.call('GET', '/user')
    expect(paused).toMatchObject({ ok: false, status: 429 })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    tick(30_001)
    expect((await api.call('GET', '/user')).ok).toBe(true)
  })

  it('följer next_cursor och slår ihop listvärda nycklar', async () => {
    const { api, fetchImpl } = setup([
      jsonResponse(200, { data: { movies: [{ a: 1 }], episodes: [], pagination: { next_cursor: 'c2' } } }),
      jsonResponse(200, { data: { movies: [{ a: 2 }], episodes: [{ b: 1 }], pagination: { next_cursor: null } } }),
    ])
    const result = await api.getAllPages('/sync/watched', { limit: 1000 })
    expect(result).toEqual({ ok: true, data: { movies: [{ a: 1 }, { a: 2 }], episodes: [{ b: 1 }] } })
    expect(bodyOf(fetchImpl, 1).query).toEqual({ limit: 1000, cursor: 'c2' })
  })

  it('följer offset/has_more (MDBList:s faktiska form)', async () => {
    const { api, fetchImpl } = setup([
      jsonResponse(200, { data: { movies: [{ a: 1 }], shows: [], pagination: { offset: 0, limit: 1, has_more: true } } }),
      jsonResponse(200, { data: { movies: [{ a: 2 }], shows: [], pagination: { offset: 1, limit: 1, has_more: false } } }),
    ])
    const result = await api.getAllPages('/watchlist/items', { limit: 1 })
    expect(result).toEqual({ ok: true, data: { movies: [{ a: 1 }, { a: 2 }], shows: [] } })
    expect(bodyOf(fetchImpl, 1).query).toEqual({ limit: 1, offset: 1 })
  })

  it('ett platt listsvar blir nyckeln items', async () => {
    const { api } = setup([jsonResponse(200, { data: [{ id: 1 }, { id: 2 }] })])
    expect(await api.getAllPages('/lists/user')).toEqual({ ok: true, data: { items: [{ id: 1 }, { id: 2 }] } })
  })

  it('Minor 4: sidtaket med has_more kvar är ett fel, inte en trunkerad lista', async () => {
    const pages = Array.from({ length: 60 }, (_, i) =>
      jsonResponse(200, { data: { movies: [{ a: i }], pagination: { offset: i, limit: 1, has_more: true } } }))
    const { api } = setup(pages)
    const result = await api.getAllPages('/watchlist/items', { limit: 1 })
    expect(result.ok).toBe(false)
  })

  it('I10: en 429 meddelas så att statusen kan visa pausen', async () => {
    const onPause = vi.fn()
    const fetchImpl = vi.fn(async () => jsonResponse(429, { error: 'rate limited', retryAfter: 30 }))
    const api = createMdblistApi({ fetchImpl: fetchImpl as unknown as typeof fetch, getAuth: async () => ({ apikey: 'k' }), now: () => 1_000, log: () => {}, onPause })
    await api.call('POST', '/scrobble/start', { body: {} })
    expect(onPause).toHaveBeenCalledWith(31_000)
  })
})
