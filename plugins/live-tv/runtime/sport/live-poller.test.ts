// runtime/sport/live-poller.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
    expect(onFixtures).toHaveBeenCalledWith('football', [])
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
