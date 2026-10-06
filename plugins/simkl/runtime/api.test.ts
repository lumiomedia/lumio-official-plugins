import { describe, expect, it, vi } from 'vitest'
import { createSimklApi } from './api'

function res(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })
}

function setup(responses: Response[], token: string | null = 'T') {
  let clock = 1_000_000
  const slept: number[] = []
  const onPause = vi.fn()
  const fetchImpl = vi.fn(async () => responses.shift() ?? res(500, {}))
  const api = createSimklApi({
    fetchImpl: fetchImpl as unknown as typeof fetch,
    getToken: async () => token,
    hasToken: () => token != null,
    clientId: 'CID',
    appVersion: '0.1.0',
    now: () => clock,
    sleep: async (ms) => { slept.push(ms); clock += ms },
    log: () => {},
    onPause,
  })
  const call = (n = 0) => fetchImpl.mock.calls[n] as unknown as [string, RequestInit]
  return { api, fetchImpl, call, slept, onPause, tick: (ms: number) => { clock += ms } }
}

describe('SIMKL-klienten', () => {
  it('varje anrop bär client_id, app-name och app-version; Bearer på användaranrop', async () => {
    const { api, call } = setup([res(200, { ok: 1 })])
    const result = await api.call('GET', '/sync/activities')
    expect(result).toEqual({ ok: true, data: { ok: 1 } })
    const url = new URL(call()[0])
    expect(url.origin + url.pathname).toBe('https://api.simkl.com/sync/activities')
    expect(url.searchParams.get('client_id')).toBe('CID')
    expect(url.searchParams.get('app-name')).toBe('lumio')
    expect(url.searchParams.get('app-version')).toBe('0.1.0')
    expect((call()[1].headers as Record<string, string>).Authorization).toBe('Bearer T')
  })

  it('auth: false skickar ingen Bearer (cachade katalog-anrop)', async () => {
    const { api, call } = setup([res(200, [])])
    await api.call('GET', '/tv/best/all', { auth: false })
    expect((call()[1].headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it('utan inloggning görs inget användaranrop', async () => {
    const { api, fetchImpl } = setup([], null)
    expect((await api.call('GET', '/sync/activities')).ok).toBe(false)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('POST pacas till en per sekund', async () => {
    const { api, slept } = setup([res(201, {}), res(201, {})])
    await api.call('POST', '/sync/history', { body: {} })
    await api.call('POST', '/sync/history', { body: {} })
    expect(slept.some((ms) => ms >= 1000)).toBe(true)
  })

  it('429 med Retry-After pausar alla anrop och meddelar statusen', async () => {
    const { api, fetchImpl, onPause, tick } = setup([res(429, {}, { 'Retry-After': '30' }), res(200, {})])
    expect((await api.call('POST', '/scrobble/start', { body: {} })).ok).toBe(false)
    expect(onPause).toHaveBeenCalledWith(1_000_000 + 30_000)
    expect((await api.call('GET', '/sync/activities')).ok).toBe(false)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    tick(30_001)
    expect((await api.call('GET', '/sync/activities')).ok).toBe(true)
  })

  it('412 client_id_failed stoppar alla anrop resten av sessionen', async () => {
    const { api, fetchImpl, tick } = setup([res(412, { error: 'client_id_failed' }), res(200, {})])
    await api.call('GET', '/sync/activities')
    tick(60 * 60_000)
    expect((await api.call('GET', '/sync/activities')).ok).toBe(false)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('X-RateLimit-Remaining sparas', async () => {
    const { api } = setup([res(200, {}, { 'X-RateLimit-Remaining': '42' })])
    expect(api.remaining()).toBeNull()
    await api.call('GET', '/sync/activities')
    expect(api.remaining()).toBe(42)
  })

  it('CDN-anrop: inga parametrar, ingen header, inte pausade av kvoten', async () => {
    const { api, call } = setup([res(429, {}, { 'Retry-After': '30' }), res(200, [{ title: 'X' }])])
    await api.call('GET', '/sync/activities')
    expect(await api.cdn('/discover/trending/movies/today_100.json')).toEqual({ ok: true, data: [{ title: 'X' }] })
    expect(call(1)[0]).toBe('https://data.simkl.in/discover/trending/movies/today_100.json')
    expect(call(1)[1]?.headers).toBeUndefined()
  })

  it('ett tomt svar (201 utan kropp) är ok med null', async () => {
    const { api } = setup([new Response(null, { status: 201 })])
    expect(await api.call('POST', '/scrobble/pause', { body: {} })).toEqual({ ok: true, data: null })
  })
})
