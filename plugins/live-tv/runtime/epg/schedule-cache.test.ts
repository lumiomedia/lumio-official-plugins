import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { EpgProgramme } from './types'

vi.mock('../index-client', () => ({
  epgSchedule: vi.fn(async () => ({}) as Record<string, EpgProgramme[]>),
}))

import { epgSchedule } from '../index-client'
import { __resetScheduleCacheForTests, fetchSchedules, getCachedSchedules, hourWindow } from './schedule-cache'

beforeEach(() => {
  __resetScheduleCacheForTests()
  vi.mocked(epgSchedule).mockReset()
  vi.mocked(epgSchedule).mockResolvedValue({})
})

describe('schedule-cache', () => {
  it('översätter alla list-id till den globala store:n', async () => {
    await fetchSchedules('list-1', ['k1'], 0, 100)
    expect(vi.mocked(epgSchedule).mock.calls[0][0]).toBe('global')
    // Samma post: ett annat list-id ska inte ge ett nytt anrop.
    await fetchSchedules('global', ['k1'], 0, 100)
    expect(epgSchedule).toHaveBeenCalledTimes(1)
  })

  it('slår ihop enskilda nycklar som frågas i samma tick till ETT anrop', async () => {
    // Varje kanalkort (`useEpgNowNextLater`) frågar efter EN nyckel. Fyrtio
    // kort som monteras samtidigt gav fyrtio POST:ar för samma fönster.
    const pending = [
      fetchSchedules('global', ['k1'], 0, 100),
      fetchSchedules('global', ['k2'], 0, 100),
      fetchSchedules('global', ['k3'], 0, 100),
    ]
    await Promise.all(pending)
    expect(epgSchedule).toHaveBeenCalledTimes(1)
    expect(vi.mocked(epgSchedule).mock.calls[0][1]).toEqual(['k1', 'k2', 'k3'])
  })

  it('kastar de äldsta posterna när taket nås', async () => {
    // 700 kanaler i ETT fönster spränger taket på 600.
    const keys = Array.from({ length: 700 }, (_, i) => `k${i}`)
    await fetchSchedules('global', keys, 0, 100)
    const { missing } = getCachedSchedules('global', keys, 0, 100)
    expect(missing.length).toBeGreaterThan(0)
    // De SENAST skrivna finns kvar.
    expect(missing).not.toContain('k699')
  })

  it('hourWindow rundar kanterna till hel timme', () => {
    const win = hourWindow(new Date(2026, 8, 14, 19, 42, 31).getTime(), 6, 24)
    expect(new Date(win.from).getMinutes()).toBe(0)
    expect(win.to - win.from).toBe(30 * 3_600_000)
  })
})
