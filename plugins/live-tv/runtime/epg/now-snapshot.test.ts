// @vitest-environment happy-dom
// Stegvis omhämtning av nu/nästa: bara kanaler vars program passerat en gräns
// hämtas om och läggs in i snapshotet (en fransk Xtream-lista med tiotusentals
// kanaler tolkade hela flera-MB-svaret varje minut och frös en Shield,
// 2026-10-20). Äldre appar utan vägen ger hela snapshotet som förut.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const epgNow = vi.fn()
const epgNowForKeys = vi.fn()
vi.mock('../index-client', () => ({ epgNow: (...a: unknown[]) => epgNow(...a), epgNowForKeys: (...a: unknown[]) => epgNowForKeys(...a) }))

import { __resetNowSnapshotForTests, fetchNowSnapshot, staleNowKeys } from './now-snapshot'

const prog = (title: string, start: number, stop: number) => ({ title, start, stop }) as never

beforeEach(() => {
  __resetNowSnapshotForTests()
  epgNow.mockReset()
  epgNowForKeys.mockReset()
  vi.useFakeTimers()
  vi.setSystemTime(1_000_000)
})
afterEach(() => vi.useRealTimers())

describe('nu/nästa stegvis', () => {
  it('hämtar bara de inaktuella kanalerna och behåller resten', async () => {
    epgNow.mockResolvedValue({
      at: 1_000_000,
      fetchedAt: 5,
      items: {
        a: { now: prog('A1', 900_000, 1_050_000), next: prog('A2', 1_050_000, 2_000_000), later: null },
        b: { now: prog('B1', 900_000, 3_000_000), next: null, later: null },
        c: { now: prog('C1', 900_000, 1_040_000), next: null, later: null },
      },
    })
    const first = await fetchNowSnapshot('l', null)
    expect(first.count).toBe(3)

    vi.setSystemTime(1_100_000)
    expect(staleNowKeys(first, Date.now()).sort()).toEqual(['a', 'c'])
    epgNowForKeys.mockResolvedValue({
      at: 1_100_000,
      fetchedAt: 5,
      items: { a: { now: prog('A2', 1_050_000, 2_000_000), next: null, later: null } },
    })
    const second = await fetchNowSnapshot('l', null)
    expect(epgNow).toHaveBeenCalledTimes(1)
    expect(epgNowForKeys).toHaveBeenCalledWith(expect.objectContaining({ keys: expect.arrayContaining(['a', 'c']) }))
    expect(second).not.toBe(first)
    expect(second.items.a.now?.title).toBe('A2')
    expect(second.items.b).toBe(first.items.b)
    expect('c' in second.items).toBe(false)
    expect(second.count).toBe(2)
  })

  it('faller tillbaka på hela snapshotet när appen saknar vägen', async () => {
    epgNow.mockResolvedValue({
      at: 1_000_000,
      fetchedAt: 5,
      items: { a: { now: prog('A1', 900_000, 1_050_000), next: null, later: null } },
    })
    await fetchNowSnapshot('l', null)
    vi.setSystemTime(1_100_000)
    epgNowForKeys.mockRejectedValue(new Error('/api/live-tv/epg/now returned 405'))
    await fetchNowSnapshot('l', null)
    expect(epgNow).toHaveBeenCalledTimes(2)
  })

  it('ett snapshot äldre än 10 minuter hämtas helt', async () => {
    epgNow.mockResolvedValue({ at: 1, fetchedAt: 5, items: { a: { now: prog('A1', 0, 1_050_000), next: null, later: null } } })
    await fetchNowSnapshot('l', null)
    vi.setSystemTime(1_000_000 + 11 * 60_000)
    await fetchNowSnapshot('l', null)
    expect(epgNow).toHaveBeenCalledTimes(2)
    expect(epgNowForKeys).not.toHaveBeenCalled()
  })
})
