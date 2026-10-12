// runtime/sport/live-poller.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Budget } from './budget'
import { apiSports } from './api-sports'
import { __resetPollDemandForTests, acquirePollDemand, createLivePoller, hasPollDemand, type LiveTarget } from './live-poller'

const NOW = Date.UTC(2026, 9, 10, 18)

function setup(opts: { interval?: number | null; targets?: LiveTarget[]; visible?: boolean } = {}) {
  let visible = opts.visible ?? true
  let visCb: (() => void) | null = null
  const live = vi.fn(async () => ({ ok: true as const, data: [], cached: false, fetchedAt: NOW }))
  const budget = { live, liveIntervalMs: vi.fn(() => (opts.interval === undefined ? 60_000 : opts.interval)), provider: { bucket: (s: string) => s } }
  const onFixtures = vi.fn()
  const poller = createLivePoller({
    budget: budget as never,
    targets: () => opts.targets ?? [{ sport: 'football', hot: true, windowEndsAt: NOW + 3_600_000 }],
    onFixtures, liveOpts: () => ({ today: '2026-10-10', tz: 'Europe/Stockholm' }),
    now: () => Date.now(),
    isVisible: () => visible,
    onVisibility: (cb) => { visCb = cb; return () => { visCb = null } },
  })
  return { poller, live, onFixtures, hide: () => { visible = false; visCb?.() }, show: () => { visible = true; visCb?.() } }
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); __resetPollDemandForTests() })
afterEach(() => { vi.useRealTimers() })

describe('efterfrågan', () => {
  it('räknas per anledning och släpps idempotent', () => {
    const a = acquirePollDemand('sport-view')
    const b = acquirePollDemand('player')
    a(); a()
    expect(hasPollDemand()).toBe(true)
    b()
    expect(hasPollDemand()).toBe(false)
  })
})

describe('livepollern', () => {
  it('ingen efterfrågan → inga anrop', async () => {
    const { poller, live } = setup()
    poller.start()
    await vi.advanceTimersByTimeAsync(10 * 60_000)
    expect(live).not.toHaveBeenCalled()
  })

  it('med efterfrågan och het sport: ett anrop per intervall', async () => {
    const { poller, live, onFixtures } = setup({ interval: 60_000 })
    poller.start()
    const release = acquirePollDemand('sport-view')
    await vi.advanceTimersByTimeAsync(59_000)
    expect(live).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(2_000)
    expect(live).toHaveBeenCalledTimes(1)
    expect(onFixtures).toHaveBeenCalledWith('football', [], NOW, null)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(live).toHaveBeenCalledTimes(2)
    release()
    await vi.advanceTimersByTimeAsync(10 * 60_000)
    expect(live).toHaveBeenCalledTimes(2)
  })

  it('pausas när appen går i bakgrunden och fortsätter när den syns', async () => {
    const { poller, live, hide, show } = setup({ interval: 60_000 })
    poller.start()
    acquirePollDemand('match-center')
    hide()
    await vi.advanceTimersByTimeAsync(5 * 60_000)
    expect(live).not.toHaveBeenCalled()
    show()
    await vi.advanceTimersByTimeAsync(61_000)
    expect(live).toHaveBeenCalledTimes(1)
  })

  it('ingen het sport eller intervallet null → inga anrop', async () => {
    const cold = setup({ targets: [{ sport: 'football', hot: false, windowEndsAt: NOW }] })
    cold.poller.start()
    acquirePollDemand('sport-view')
    await vi.advanceTimersByTimeAsync(30 * 60_000)
    expect(cold.live).not.toHaveBeenCalled()
    __resetPollDemandForTests()
    const broke = setup({ interval: null })
    broke.poller.start()
    acquirePollDemand('sport-view')
    await vi.advanceTimersByTimeAsync(30 * 60_000)
    expect(broke.live).not.toHaveBeenCalled()
  })

  it('stop() släpper timern', async () => {
    const { poller, live } = setup({ interval: 60_000 })
    poller.start()
    acquirePollDemand('player')
    poller.stop()
    await vi.advanceTimersByTimeAsync(5 * 60_000)
    expect(live).not.toHaveBeenCalled()
  })
})

describe('spärr som släpper medan vyn står öppen', () => {
  it('slut kvot: pollern vaknar själv vid dygnsskiftet (UTC) och pollar igen', async () => {
    const midnight = Date.UTC(2026, 9, 11)
    vi.setSystemTime(midnight - 30 * 60_000)
    const fetch = vi.fn(async (_args: { req: { path: string } }) => ({ data: { response: [] }, cached: false, fresh: true, fetchedAt: Date.now(), quota: null, error: null }))
    const budget = new Budget(apiSports, 'k123', { fetch: fetch as never, sleep: async () => {} })
    budget.noteQuota({ bucket: 'football', limit: 100, remaining: 0, minuteLimit: null, minuteRemaining: null, blockedUntil: midnight, reason: 'exhausted', plan: 'Free' })
    const poller = createLivePoller({
      budget, targets: () => [{ sport: 'football', hot: true, windowEndsAt: midnight + 3 * 3_600_000 }],
      onFixtures: () => {}, liveOpts: () => ({ today: '2026-10-11', tz: 'Europe/Stockholm' }),
      isVisible: () => true, onVisibility: () => () => {},
    })
    poller.start()
    acquirePollDemand('sport-view')
    await vi.advanceTimersByTimeAsync(29 * 60_000)
    expect(fetch).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(60_000 + 20_000) // förbi midnatt + golvet
    expect(fetch.mock.calls.some(([a]) => a.req.path.includes('live='))).toBe(true)
    poller.stop()
  })

  it('minutspärr: pollern vaknar när minutfönstret gått ut', async () => {
    const fetch = vi.fn(async () => ({ data: { response: [] }, cached: false, fresh: true, fetchedAt: Date.now(), quota: null, error: null }))
    const budget = new Budget(apiSports, 'k123', { fetch: fetch as never, sleep: async () => {} })
    budget.noteQuota({ bucket: 'football', limit: 7500, remaining: 7000, minuteLimit: 300, minuteRemaining: 0, blockedUntil: NOW + 60_000, reason: 'rate-limited', plan: 'Pro' })
    const poller = createLivePoller({
      budget, targets: () => [{ sport: 'football', hot: true, windowEndsAt: NOW + 3 * 3_600_000 }],
      onFixtures: () => {}, liveOpts: () => ({ today: '2026-10-10', tz: 'Europe/Stockholm' }),
      isVisible: () => true, onVisibility: () => () => {},
    })
    poller.start()
    acquirePollDemand('sport-view')
    await vi.advanceTimersByTimeAsync(60_000 + 16_000)
    expect(fetch).toHaveBeenCalled()
    poller.stop()
  })
})

describe('ingen dubbel livepollning', () => {
  it('en omplanering mitt i en tick (kvotsvaret) startar ingen parallell tick för en sport som redan står på tur', async () => {
    let poller: ReturnType<typeof createLivePoller> | null = null
    const live = vi.fn(async (_sport: string) => {
      poller?.reschedule() // som noteQuota → emit → reschedule
      await new Promise((r) => setTimeout(r, 50))
      return { ok: true as const, data: [], cached: false, fetchedAt: Date.now() }
    })
    const budget = { live, liveIntervalMs: () => 60_000, pausedUntil: () => null, provider: { bucket: (s: string) => s } }
    poller = createLivePoller({
      budget: budget as never,
      targets: () => [{ sport: 'football', hot: true, windowEndsAt: NOW + 3_600_000 }, { sport: 'hockey', hot: true, windowEndsAt: NOW + 3_600_000 }],
      onFixtures: () => {}, liveOpts: () => ({ today: '2026-10-10', tz: 'Europe/Stockholm' }),
      isVisible: () => true, onVisibility: () => () => {},
    })
    poller.start()
    acquirePollDemand('sport-view')
    await vi.advanceTimersByTimeAsync(60_500)
    expect(live.mock.calls.map(([s]) => s).sort()).toEqual(['football', 'hockey'])
    poller.stop()
  })
})
