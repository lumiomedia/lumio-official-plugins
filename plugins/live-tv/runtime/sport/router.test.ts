// runtime/sport/router.test.ts
import { describe, expect, it, vi } from 'vitest'
import { SportRouter } from './router'
import { effectiveOrder, orderFor } from './providers'
import type { ProviderId } from './provider'
import type { FetchMode, SportFetchResponse, SportQuota } from './sport-fetch'
import type { ProviderKeys } from './sport-store'

const NOW = Date.UTC(2026, 9, 10, 18, 0)
const MIDNIGHT = Date.UTC(2026, 9, 11)
const DAY = { today: '2026-10-10', tz: 'Europe/Stockholm', dayEndMs: Date.UTC(2026, 9, 10, 22) }

const ALL: ProviderKeys = { sportapi: { key: 'sk_live_1', plan: null }, 'api-sports': { key: 'aaaa1111', plan: 'Free' }, thesportsdb: { key: '123456', plan: 'Premium' } }
const quota = (bucket: string, over: Partial<SportQuota> = {}): SportQuota => ({ bucket, limit: 2000, remaining: 1500, minuteLimit: null, minuteRemaining: null, blockedUntil: null, reason: null, plan: null, ...over })

type Reply = (args: { provider: ProviderId; path: string; mode: FetchMode }) => Partial<SportFetchResponse>

function harness(keys: ProviderKeys, reply: Reply, order = {}) {
  let now = NOW
  const calls: Array<{ provider: ProviderId; path: string; mode: FetchMode }> = []
  const fetch = vi.fn(async ({ provider, req, mode }: { provider: ProviderId; req: { path: string }; mode: FetchMode }) => {
    calls.push({ provider, path: req.path, mode })
    return { data: null, cached: false, fresh: true, fetchedAt: now, quota: null, error: null, ...reply({ provider, path: req.path, mode }) } as SportFetchResponse
  })
  const router = new SportRouter(keys, order, { fetch: fetch as never, now: () => now, sleep: async () => {} })
  return { router, calls, advance: (ms: number) => { now += ms }, setNow: (t: number) => { now = t } }
}

/** Ett giltigt dagsprogram i varje källas form (en match). */
function dayBody(provider: ProviderId): unknown {
  if (provider === 'sportapi') return { success: true, data: [{ id: 1, home_team: 'Arsenal', away_team: 'Leeds United', kickoff_utc: '2026-10-10T11:30:00Z', status: 'FT', home_score: 2, away_score: 1 }] }
  if (provider === 'api-sports') return { errors: [], response: [{ fixture: { id: 2, timestamp: 1791631800, status: { short: 'FT' } }, teams: { home: { id: 1, name: 'Arsenal' }, away: { id: 2, name: 'Leeds' } }, goals: { home: 2, away: 1 }, league: {} }] }
  return { events: [{ idEvent: '3', strHomeTeam: 'Arsenal', strAwayTeam: 'Leeds', strTimestamp: '2026-10-10T11:30:00', strStatus: 'FT', intHomeScore: '2', intAwayScore: '1' }] }
}

describe('källordning per sport', () => {
  it('standard: fotboll sportapi.ai → API-Sports → TheSportsDB; övriga lagsporter API-Sports → TheSportsDB', () => {
    expect(orderFor({}, 'football')).toEqual(['sportapi', 'api-sports', 'thesportsdb'])
    expect(orderFor({}, 'hockey')).toEqual(['api-sports', 'thesportsdb'])
    expect(orderFor({}, 'handball')).toEqual(['api-sports', 'thesportsdb'])
    expect(orderFor({}, 'motorsport')).toEqual([])
  })
  it('bara källor med nyckel; egen ordning vinner, källor som saknas i den läggs sist; okänd täckning släpps', () => {
    expect(effectiveOrder({ keys: { 'api-sports': ALL['api-sports'] }, order: {} }, 'football')).toEqual(['api-sports'])
    expect(effectiveOrder({ keys: ALL, order: { football: ['thesportsdb'] } }, 'football')).toEqual(['thesportsdb', 'sportapi', 'api-sports'])
    expect(effectiveOrder({ keys: ALL, order: { hockey: ['sportapi', 'thesportsdb'] } }, 'hockey')).toEqual(['thesportsdb', 'api-sports'])
  })
})

describe('SportRouter: första källan med kvot, sedan nästa tills kvoten nollställs', () => {
  it('fotboll går till sportapi.ai, hockey till API-Sports', async () => {
    const { router, calls } = harness(ALL, ({ provider }) => ({ data: dayBody(provider) }))
    const r = await router.day('football', '2026-10-10', DAY)
    expect(r).toMatchObject({ ok: true, provider: 'sportapi' })
    await router.day('hockey', '2026-10-10', DAY)
    expect(calls.filter((c) => c.path !== '/status').map((c) => c.provider)).toEqual(['sportapi', 'api-sports'])
  })

  it('429 hos sportapi.ai: samma anrop faller till API-Sports, nästa går direkt dit, och efter midnatt UTC tillbaka', async () => {
    const { router, calls, setNow } = harness(ALL, ({ provider, mode }) => {
      if (provider === 'sportapi' && mode === 'cache-first') return { error: 'exhausted', quota: quota('football', { remaining: 0, blockedUntil: MIDNIGHT, reason: 'exhausted' }) }
      return { data: dayBody(provider) }
    })
    const first = await router.live('football', DAY)
    expect(first).toMatchObject({ ok: true, provider: 'api-sports' })
    expect(router.activeProvider('football')).toBe('api-sports')
    calls.length = 0
    await router.live('football', DAY)
    expect(calls.filter((c) => c.path !== '/status').map((c) => c.provider)).toEqual(['api-sports'])
    setNow(MIDNIGHT + 1_000)
    expect(router.activeProvider('football')).toBe('sportapi')
  })

  it('boken på 0 utan spärr (lokal nedräkning) faller också igenom, och dygnsskiftet släpper den', () => {
    const { router, setNow } = harness(ALL, () => ({}))
    router.budget('sportapi')!.noteQuota(quota('football', { remaining: 0 }))
    expect(router.activeProvider('football')).toBe('api-sports')
    setNow(MIDNIGHT + 1)
    expect(router.activeProvider('football')).toBe('sportapi')
  })

  it('ogiltig nyckel hos första källan: nästa källa tar över', async () => {
    const { router } = harness(ALL, ({ provider }) => (provider === 'sportapi' ? { error: 'unauthorized' } : { data: dayBody(provider) }))
    expect(await router.day('football', '2026-10-10', DAY)).toMatchObject({ ok: true, provider: 'api-sports' })
    expect(router.activeProvider('football')).toBe('api-sports')
    expect(router.isInvalid()).toBe(false)
  })

  it('nätfel faller INTE igenom (det är inte kvoten), och utan nycklar görs inga anrop', async () => {
    const { router, calls } = harness(ALL, ({ provider }) => (provider === 'sportapi' ? { error: 'network' } : { data: dayBody(provider) }))
    expect(await router.day('football', '2026-10-10', DAY)).toMatchObject({ ok: false, reason: 'network', provider: 'sportapi' })
    expect(new Set(calls.map((c) => c.provider))).toEqual(new Set(['sportapi']))
    const empty = harness({}, () => ({}))
    expect(await empty.router.day('football', '2026-10-10', DAY)).toMatchObject({ ok: false, reason: 'no-key', provider: null })
    expect(empty.calls).toEqual([])
  })

  it('ingen källa har kvot kvar: bara ur cachen hos den första, och pausen räknas till den första spärren som släpper', async () => {
    const until = NOW + 60_000
    const { router, calls } = harness({ sportapi: ALL.sportapi, 'api-sports': ALL['api-sports'] }, () => ({ data: null }))
    router.budget('sportapi')!.noteQuota(quota('football', { remaining: 0, blockedUntil: MIDNIGHT, reason: 'exhausted' }))
    router.budget('api-sports')!.noteQuota(quota('football', { limit: 100, remaining: 50, blockedUntil: until, reason: 'rate-limited' }))
    expect(router.activeProvider('football')).toBeNull()
    expect(router.pausedUntil('football')).toBe(until)
    expect(router.liveIntervalMs('football', NOW + 3_600_000)).toBeNull()
    await router.live('football', DAY)
    expect(calls.map((c) => [c.provider, c.mode])).toEqual([['sportapi', 'cache-only']])
  })

  it('livetakten följer källan som faktiskt används (sportapi.ai golv 60 s, API-Sports 15 s)', () => {
    const { router } = harness(ALL, () => ({}))
    router.budget('sportapi')!.noteQuota(quota('football', { remaining: 1900 }))
    expect(router.liveIntervalMs('football', NOW + 3_600_000)).toBe(60_000)
    router.budget('sportapi')!.noteQuota(quota('football', { remaining: 0, blockedUntil: MIDNIGHT, reason: 'exhausted' }))
    router.budget('api-sports')!.noteQuota(quota('football', { limit: 7500, remaining: 7000 }))
    expect(router.liveIntervalMs('football', NOW + 3_600_000)).toBe(15_000)
  })

  it('matchcentret: ägarens id först; är ägaren spärrad används samma match hos en annan källa', async () => {
    const { router, calls } = harness(ALL, ({ provider }) => ({ data: provider === 'api-sports' ? { errors: [], response: [{ fixture: { id: 77, timestamp: 1, status: { short: '2H' } }, teams: { home: {}, away: {} }, goals: {}, league: {} }] } : null }))
    router.budget('sportapi')!.noteQuota(quota('football', { remaining: 0, blockedUntil: MIDNIGHT, reason: 'exhausted' }))
    const r = await router.fixture('football', [{ provider: 'sportapi', id: '13596176' }, { provider: 'api-sports', id: '77' }], { finished: false })
    expect(r).toMatchObject({ ok: true, provider: 'api-sports' })
    expect(calls.filter((c) => c.path !== '/status').map((c) => c.path)).toEqual(['/fixtures?id=77'])
  })

  it('lagsök: källor utan sökväg (sportapi.ai) hoppas över utan anrop', async () => {
    const { router, calls } = harness(ALL, () => ({ data: { errors: [], response: [{ team: { id: 42, name: 'Arsenal' } }] } }))
    const r = await router.searchTeams('football', 'arsenal')
    expect(r).toMatchObject({ ok: true, provider: 'api-sports', data: [{ id: '42', name: 'Arsenal' }] })
    expect(calls.some((c) => c.provider === 'sportapi')).toBe(false)
  })

  it('planerade anrop läggs på den källa sporten faktiskt använder', () => {
    const { router } = harness(ALL, () => ({}))
    router.setPlanned(new Map([['football', 3], ['hockey', 2]]))
    expect(router.budget('sportapi')!.plannedFor('football')).toBe(3)
    expect(router.budget('api-sports')!.plannedFor('football')).toBe(0)
    expect(router.budget('api-sports')!.plannedFor('hockey')).toBe(2)
  })
})
