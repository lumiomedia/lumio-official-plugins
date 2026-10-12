// runtime/sport/budget.test.ts
import { describe, expect, it, vi } from 'vitest'
import { Budget, reserveFor } from './budget'
import type { ProviderCall, SportsProvider } from './provider'
import type { FetchMode, SportFetchResponse, SportQuota } from './sport-fetch'

const NOW = Date.UTC(2026, 9, 10, 18, 0)

const q = (over: Partial<SportQuota> = {}): SportQuota => ({ bucket: 'football', limit: 100, remaining: 80, minuteLimit: 10, minuteRemaining: 9, blockedUntil: null, reason: null, plan: 'Free', ...over })

const call = (sport: 'football' | 'tennis' = 'football'): ProviderCall<number[]> => ({
  requests: [{ sport, path: '/fixtures?date=2026-10-10', ttlS: 900 }],
  parse: (b) => ((b[0] as { response?: number[] } | null)?.response ?? []),
})

const fake: SportsProvider = {
  id: 'api-sports', liveFloorMs: 15_000,
  coverage: (s) => (s === 'tennis' ? 'epg' : 'full'), bucket: (s) => s,
  day: () => call() as never, live: () => call() as never, fixture: () => ({ requests: [], parse: () => null }),
  standings: () => ({ requests: [], parse: () => [] }), searchTeams: () => ({ requests: [], parse: () => [] }),
  validateKey: () => ({ requests: [{ sport: 'football', path: '/status', ttlS: 0 }], parse: (b) => ({ ok: b[0] != null, plan: 'Free', used: 12, limit: 100 }) }),
  quotaProbe: (sport) => ({ requests: [{ sport, path: '/status', ttlS: 0 }], parse: () => ({ ok: true, plan: 'Free', used: 0, limit: 100 }) }),
  crestUrl: () => null,
  teamArt: () => null,
}

function harness(responses: Array<Partial<SportFetchResponse>>, quota: SportQuota | null = q()) {
  const calls: Array<{ path: string; mode: FetchMode }> = []
  let i = 0
  const fetch = vi.fn(async ({ req, mode }: { req: { path: string }; mode: FetchMode }) => {
    calls.push({ path: req.path, mode })
    const r = responses[Math.min(i++, responses.length - 1)]
    return { data: null, cached: false, fresh: true, fetchedAt: NOW, quota, error: null, ...r } as SportFetchResponse
  })
  let now = NOW
  const budget = new Budget(fake, 'k123', { fetch: fetch as never, now: () => now, sleep: async () => {} })
  if (quota) budget.noteQuota(quota)
  return { budget, calls, fetch, advance: (ms: number) => { now += ms } }
}

describe('reserven', () => {
  it('10 %, minst 5', () => {
    expect(reserveFor(100)).toBe(10)
    expect(reserveFor(30)).toBe(5)
    expect(reserveFor(7500)).toBe(750)
    expect(reserveFor(null)).toBe(0)
  })
})

describe('Budget.run', () => {
  it('utan nyckel görs inget anrop', async () => {
    const fetch = vi.fn()
    const b = new Budget(fake, null, { fetch: fetch as never })
    expect(await b.run('day', 'football', call())).toMatchObject({ ok: false, reason: 'no-key' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('sport utan täckning (tennis) ger inga anrop', async () => {
    const { budget, fetch } = harness([{}])
    expect(await budget.run('day', 'tennis', call('tennis'))).toMatchObject({ ok: false, reason: 'no-coverage' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('dagsprogram inom budget går cache-first och tolkas', async () => {
    const { budget, calls } = harness([{ data: { response: [1, 2] } }])
    expect(await budget.run('day', 'football', call())).toEqual({ ok: true, data: [1, 2], cached: false, fetchedAt: NOW })
    expect(calls).toEqual([{ path: '/fixtures?date=2026-10-10', mode: 'cache-first' }])
  })

  it('i reserven: dagsprogram bara ur cachen, matchcenter släpps igenom', async () => {
    const { budget, calls } = harness([{ data: { response: [9] }, cached: true, fresh: false }], q({ remaining: 10 }))
    const day = await budget.run('day', 'football', call())
    expect(day).toMatchObject({ ok: false, reason: 'over-budget', data: [9] })
    await budget.run('fixture', 'football', call())
    expect(calls.map((c) => c.mode)).toEqual(['cache-only', 'cache-first'])
  })

  it('live respekterar planerade anrop', () => {
    const { budget } = harness([{}], q({ remaining: 20 }))
    budget.setPlanned('football', 5)
    expect(budget.allows('live', 'football', 1)).toBe(true)  // 19 ≥ 10 + 5
    budget.noteQuota(q({ remaining: 15 }))
    expect(budget.allows('live', 'football', 1)).toBe(false) // 14 < 15
    expect(budget.allows('day', 'football', 1)).toBe(true)   // 14 ≥ 10
  })

  it('slut kvot: pausar, och nästa anrop går bara ur cachen tills spärren släpper', async () => {
    const until = Date.UTC(2026, 9, 11)
    const { budget, calls, advance } = harness([{ error: 'exhausted', quota: q({ remaining: 0, blockedUntil: until, reason: 'exhausted' }) }, { data: { response: [] } }])
    expect(await budget.run('day', 'football', call())).toMatchObject({ ok: false, reason: 'paused', until })
    await budget.run('day', 'football', call())
    expect(calls[1].mode).toBe('cache-only')
  })

  it('paused_until_passes_then_allows', async () => {
    const until = NOW + 60_000
    const { budget, advance } = harness([{}], q({ blockedUntil: until, reason: 'rate-limited' }))
    expect(budget.allows('day', 'football', 1)).toBe(false)
    advance(60_001)
    expect(budget.allows('day', 'football', 1)).toBe(true)
  })

  it('slut kvot (remaining 0) släpps vid dygnsskiftet utan nytt svar', () => {
    const midnight = Date.UTC(2026, 9, 11)
    const { budget, advance } = harness([{}], q({ remaining: 0, blockedUntil: midnight, reason: 'exhausted' }))
    expect(budget.liveIntervalMs('football', midnight + 3_600_000)).toBeNull()
    advance(midnight - NOW + 1)
    expect(budget.allows('live', 'football', 1)).toBe(true)
    expect(budget.liveIntervalMs('football', midnight + 3_600_000)).toBe(15_000)
  })

  it('fel nyckel stoppar allt utom validering, utan nät', async () => {
    const { budget, fetch } = harness([{ error: 'unauthorized' }])
    expect(await budget.run('day', 'football', call())).toMatchObject({ ok: false, reason: 'invalid-key' })
    expect(budget.isInvalid()).toBe(true)
    await budget.run('live', 'football', call())
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('nätfel: exakt ett omförsök, sedan cachen', async () => {
    const { budget, calls } = harness([{ error: 'network', data: { response: [7] }, cached: true, fresh: false }])
    const r = await budget.run('day', 'football', call())
    expect(calls).toHaveLength(2)
    expect(r).toMatchObject({ ok: false, reason: 'network', data: [7] })
  })

  it('peek läser bara diskcachen och spenderar inget', async () => {
    const { budget, calls } = harness([{ data: { response: [4] }, cached: true, fresh: false }], q({ remaining: 0, blockedUntil: NOW + 1_000, reason: 'exhausted' }))
    expect(await budget.peek('football', call())).toEqual([4])
    expect(calls.map((c) => c.mode)).toEqual(['cache-only'])
    expect(await new Budget(fake, null).peek('football', call())).toBeNull()
  })

  it('okänd kvot hos API-Sports: gratis status-prov först', async () => {
    const { budget, calls } = harness([{ data: {} }, { data: { response: [] } }], null)
    await budget.run('day', 'hockey', { requests: [{ sport: 'hockey', path: '/games?date=2026-10-10', ttlS: 900 }], parse: () => [] })
    expect(calls.map((c) => c.path)).toEqual(['/status', '/games?date=2026-10-10'])
  })
})

describe('liveIntervalMs', () => {
  it('gratis en matchkväll: ~3,6 min', () => {
    const { budget } = harness([{}], q({ remaining: 80 }))
    budget.setPlanned('football', 4)
    expect(budget.liveIntervalMs('football', NOW + 4 * 3_600_000)).toBe(Math.ceil(14_400_000 / 66))
  })
  it('betald: golvet 15 s', () => {
    const { budget } = harness([{}], q({ limit: 7500, remaining: 7000 }))
    expect(budget.liveIntervalMs('football', NOW + 4 * 3_600_000)).toBe(15_000)
  })
  it('inget kvar ovanför reserven: ingen pollning', () => {
    const { budget } = harness([{}], q({ remaining: 10 }))
    expect(budget.liveIntervalMs('football', NOW + 3_600_000)).toBeNull()
  })
  it('spärrad: ingen pollning', () => {
    const { budget } = harness([{}], q({ blockedUntil: NOW + 1000, reason: 'rate-limited' }))
    expect(budget.liveIntervalMs('football', NOW + 3_600_000)).toBeNull()
  })
  it('ingen dygnskvot (TheSportsDB): golvet', () => {
    const { budget } = harness([{}], q({ remaining: null, limit: null }))
    expect(budget.liveIntervalMs('football', NOW + 3_600_000)).toBe(15_000)
  })
})

describe('Budget.peekAged', () => {
  it('läser bara diskcachen och ger postens ålder (lagsidans TTL räknas ur den)', async () => {
    const { budget, calls } = harness([{ data: { response: [7] }, fetchedAt: NOW - 3_600_000, cached: true }])
    expect(await budget.peekAged('football', call())).toEqual({ data: [7], fetchedAt: NOW - 3_600_000 })
    expect(calls.map((c) => c.mode)).toEqual(['cache-only'])
  })
  it('ingen post: null, och inget anrop utan nyckel', async () => {
    const { budget } = harness([{ data: null, fetchedAt: null }])
    expect(await budget.peekAged('football', call())).toBeNull()
    const fetch = vi.fn()
    expect(await new Budget(fake, null, { fetch: fetch as never }).peekAged('football', call())).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })
})
