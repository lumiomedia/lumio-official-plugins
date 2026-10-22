import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetSportDirectForTests, sportDirect } from './sport-direct'
import { Budget } from './budget'
import { espn } from './espn'
import { SportRouter } from './router'
import type { ProviderRequest } from './provider'

const req = (path: string, ttlS = 60, extra: Partial<ProviderRequest> = {}): ProviderRequest => ({ sport: 'football', path, ttlS, ...extra })
const SB = 'site/v2/sports/soccer/eng.1/scoreboard?dates=20261020-20261022&limit=300'

function fakeFetch(body: unknown = { events: [] }, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }))
}

beforeEach(() => __resetSportDirectForTests())

describe('direkthämtningen (källor utan nyckel)', () => {
  it('hämtar från ESPN, cachar inom TTL och läser cachen i cache-only', async () => {
    let now = 1_000_000
    const fetch = fakeFetch({ events: [1] })
    const deps = { fetch: fetch as never, now: () => now }
    const first = await sportDirect({ provider: 'espn', req: req(SB), mode: 'cache-first' }, deps)
    expect(fetch).toHaveBeenCalledWith(`https://site.api.espn.com/apis/${SB}`, expect.anything())
    expect(first).toMatchObject({ data: { events: [1] }, cached: false, error: null, quota: null })
    expect(await sportDirect({ provider: 'espn', req: req(SB), mode: 'cache-first' }, deps)).toMatchObject({ cached: true, fresh: true })
    expect(fetch).toHaveBeenCalledTimes(1)
    now += 61_000
    expect(await sportDirect({ provider: 'espn', req: req(SB), mode: 'cache-only' }, deps)).toMatchObject({ data: { events: [1] }, fresh: false })
    await sportDirect({ provider: 'espn', req: req(SB), mode: 'cache-first' }, deps)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('samtidiga anrop mot samma adress blir ett', async () => {
    const fetch = fakeFetch()
    await Promise.all([1, 2, 3].map(() => sportDirect({ provider: 'espn', req: req(SB), mode: 'cache-first' }, { fetch: fetch as never })))
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('felsvar ger gamla datat med fel; andra källor och okända vägar avvisas', async () => {
    let now = 0
    await sportDirect({ provider: 'espn', req: req(SB, 1), mode: 'cache-first' }, { fetch: fakeFetch({ ok: 1 }) as never, now: () => now })
    now = 5_000
    expect(await sportDirect({ provider: 'espn', req: req(SB, 1), mode: 'cache-first' }, { fetch: fakeFetch(null, 503) as never, now: () => now }))
      .toMatchObject({ data: { ok: 1 }, error: 'upstream' })
    const fetch = fakeFetch()
    expect(await sportDirect({ provider: 'api-sports', req: req('/fixtures'), mode: 'cache-first' }, { fetch: fetch as never })).toMatchObject({ error: 'not-allowed' })
    expect(await sportDirect({ provider: 'espn', req: req('../../evil'), mode: 'cache-first' }, { fetch: fetch as never })).toMatchObject({ error: 'not-allowed' })
    expect(await sportDirect({ provider: 'espn', req: req('site/v2/sports/soccer/eng.1/athletes'), mode: 'cache-first' }, { fetch: fetch as never })).toMatchObject({ error: 'not-allowed' })
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('direkthämtningen: granskningens fall', () => {
  it('400/404 är en tom liga, inte ett fel', async () => {
    expect(await sportDirect({ provider: 'espn', req: req(SB), mode: 'cache-first' }, { fetch: fakeFetch(null, 400) as never })).toMatchObject({ data: {}, error: null })
  })

  it('en post från en pågående match blir inte slutgiltig när någon frågar med TTL −1', async () => {
    const SUM = 'site/v2/sports/soccer/eng.1/summary?event=1'
    const fetch = fakeFetch({ live: true })
    await sportDirect({ provider: 'espn', req: req(SUM, 60), mode: 'cache-first' }, { fetch: fetch as never })
    await sportDirect({ provider: 'espn', req: req(SUM, -1), mode: 'cache-first' }, { fetch: fetch as never })
    expect(fetch).toHaveBeenCalledTimes(2)
    await sportDirect({ provider: 'espn', req: req(SUM, -1), mode: 'cache-first' }, { fetch: fetch as never })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('en fetch som kastar direkt lämnar ingen hängande post', async () => {
    const boom = vi.fn(() => { throw new Error('x') })
    expect(await sportDirect({ provider: 'espn', req: req(SB), mode: 'cache-first' }, { fetch: boom as never })).toMatchObject({ error: 'network' })
    const ok = fakeFetch({ events: [] })
    expect(await sportDirect({ provider: 'espn', req: req(SB), mode: 'cache-first' }, { fetch: ok as never })).toMatchObject({ error: null })
  })
})

describe('kvothanteraren och routern med ESPN', () => {
  const flag = globalThis as { __lumioNoKeylessSources?: boolean }
  beforeEach(() => { flag.__lumioNoKeylessSources = false })
  afterEach(() => { flag.__lumioNoKeylessSources = true })

  it('en budget utan nyckel hämtar direkt, aldrig genom värden', async () => {
    const direct = vi.fn(async () => ({ data: { events: [] }, cached: false, fresh: true, fetchedAt: 1, quota: null, error: null }))
    const host = vi.fn()
    const b = new Budget(espn, null, { direct: direct as never, fetch: host as never })
    const r = await b.day('hockey', '2026-10-21', { today: '2026-10-21', tz: 'Europe/Stockholm', dayEndMs: Date.UTC(2026, 9, 21, 22) })
    expect(r).toMatchObject({ ok: true, data: [] })
    // NHL: ett anrop per östkustdatum som dygnet täcker.
    expect(direct).toHaveBeenCalledTimes(2)
    expect(host).not.toHaveBeenCalled()
  })

  it('högst sex samtidigt, inga omförsök i följd, och ett fel i en liga fäller inte dagen', async () => {
    let active = 0
    let peak = 0
    const sleep = vi.fn(async () => {})
    const direct = vi.fn(async ({ req }: { req: ProviderRequest }) => {
      active++; peak = Math.max(peak, active)
      await new Promise((r) => setTimeout(r, 1))
      active--
      const bad = req.path.includes('/eng.1/')
      return { data: bad ? null : {}, cached: false, fresh: true, fetchedAt: 1, quota: null, error: bad ? 'network' : null } as const
    })
    const b = new Budget(espn, null, { direct: direct as never, sleep })
    const r = await b.day('football', '2026-10-21', { today: '2026-10-21', tz: 'Europe/Stockholm', dayEndMs: Date.UTC(2026, 9, 21, 22) })
    expect(peak).toBeLessThanOrEqual(6)
    expect(sleep).not.toHaveBeenCalled()
    expect(r.ok).toBe(true)
  })

  it('utan nycklar svarar ESPN; med nyckel går nyckelkällan först', () => {
    const none = new SportRouter({}, {})
    expect(none.hasSource()).toBe(true)
    expect(none.hasKey()).toBe(false)
    expect(none.candidates('football').map((b) => b.provider.id)).toEqual(['espn'])
    expect(none.coverage('handball')).toBe('epg')
    const keyed = new SportRouter({ 'api-sports': { key: 'k12345', plan: 'Free' } }, {})
    expect(keyed.candidates('hockey').map((b) => b.provider.id)).toEqual(['api-sports', 'espn'])
    expect(keyed.isInvalid()).toBe(false)
  })
})
