import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatEpgShift, getEpgShiftMinutes, setEpgShiftMinutes, shiftTimes, stepEpgShift } from './epg-shift'
import { epgNow, epgSchedule, epgSearch } from './index-client'
import { fetchSportDay, hostTzOffset, tzOffsetFor, __resetSportDayCache } from './sport/sport-epg'

const H = 3_600_000
const json = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => body } as unknown as Response)

beforeEach(() => { setEpgShiftMinutes(0); __resetSportDayCache() })
afterEach(() => { setEpgShiftMinutes(0); vi.unstubAllGlobals() })

describe('inställningen', () => {
  it('halvtimmar inom ±12 h, och texten', () => {
    setEpgShiftMinutes(125)
    expect(getEpgShiftMinutes()).toBe(120)
    setEpgShiftMinutes(-2000)
    expect(getEpgShiftMinutes()).toBe(-720)
    expect(stepEpgShift(690, 1)).toBe(720)
    expect(stepEpgShift(720, 1)).toBe(720)
    expect(formatEpgShift(120)).toBe('+2 h')
    expect(formatEpgShift(-90)).toBe('−1 h 30 min')
    expect(formatEpgShift(30)).toBe('+30 min')
    expect(shiftTimes({ start: 1, stop: 2 }, 10)).toEqual({ start: 11, stop: 12 })
    expect(shiftTimes(null, 10)).toBeNull()
  })
})

describe('klienten mot värden', () => {
  it('+2 h: fönstret frågas 2 h tidigare och programmen flyttas 2 h framåt', async () => {
    setEpgShiftMinutes(120)
    const bodies: Array<Record<string, unknown>> = []
    vi.stubGlobal('fetch', vi.fn((input: string, init?: RequestInit) => {
      if (init?.body) bodies.push(JSON.parse(String(init.body)))
      if (String(input).includes('/epg/schedule')) return json({ items: { k: [{ title: 'Match', start: 10 * H, stop: 12 * H }] } })
      if (String(input).includes('/epg/search')) return json({ items: [{ key: 'k', programme: { title: 'Match', start: 10 * H, stop: 12 * H } }] })
      return json({ at: 5 * H, items: { k: { now: { title: 'Nu', start: 4 * H, stop: 6 * H }, next: null } } })
    }))
    const sched = await epgSchedule('global', ['k'], 20 * H, 30 * H)
    expect(bodies[0]).toMatchObject({ from: 18 * H, to: 28 * H })
    expect(sched.k[0]).toMatchObject({ start: 12 * H, stop: 14 * H })
    const hits = await epgSearch('global', 'Match', 20 * H, 30 * H)
    expect(hits[0].programme.start).toBe(12 * H)
    const now = await epgNow({ listId: 'global', at: 7 * H })
    expect(String(vi.mocked(fetch).mock.calls.at(-1)![0])).toContain(`at=${5 * H}`)
    expect(now.items.k.now).toMatchObject({ start: 6 * H, stop: 8 * H })
    expect(now.at).toBe(7 * H)
  })

  it('utan förskjutning: oförändrat, och `at` skickas inte när den saknas', async () => {
    vi.stubGlobal('fetch', vi.fn(() => json({ at: 1, items: { k: { now: { title: 'Nu', start: 4 * H, stop: 6 * H } } } })))
    const now = await epgNow({ listId: 'global' })
    expect(String(vi.mocked(fetch).mock.calls[0][0])).not.toContain('at=')
    expect(now.items.k.now?.start).toBe(4 * H)
  })

  it('sportdagen: zonen plus förskjutningen till värden, matcher och kanaler flyttas tillbaka', async () => {
    setEpgShiftMinutes(-60)
    expect(hostTzOffset('2026-10-25')).toBe(tzOffsetFor('2026-10-25') - 60)
    vi.stubGlobal('fetch', vi.fn(() => json({ from: 0, to: 24 * H, at: 0, matches: [{ id: 'm', start: 10 * H, stop: 12 * H, sources: [{ programmeStart: 10 * H, programmeStop: 12 * H }] }] })))
    const day = await fetchSportDay('2026-10-25', 0)
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain(`tzOffset=${tzOffsetFor('2026-10-25') - 60}`)
    expect(day.matches[0]).toMatchObject({ start: 9 * H, stop: 11 * H })
    expect(day.matches[0].sources[0]).toMatchObject({ programmeStart: 9 * H, programmeStop: 11 * H })
  })
})
