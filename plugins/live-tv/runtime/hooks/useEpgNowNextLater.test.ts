import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act, cleanup } from '@testing-library/react'
import type { EpgProgramme } from '../epg/types'

vi.mock('../index-client', () => ({
  epgSchedule: vi.fn(async () => ({}) as Record<string, EpgProgramme[]>),
}))

import { epgSchedule } from '../index-client'
import { useEpgNowNextLater } from './useEpgNowNextLater'
import { __resetScheduleCacheForTests } from '../epg/schedule-cache'

const channel = (tvgId: string | null = null) => ({ tvgId, name: 'Sky', url: 'http://x/sky' })
const KEY = 'Sky::http://x/sky'

beforeEach(() => {
  __resetScheduleCacheForTests()
  vi.mocked(epgSchedule).mockReset()
  vi.mocked(epgSchedule).mockResolvedValue({})
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useEpgNowNextLater', () => {
  it('ger tomt utan lista att fråga', async () => {
    const { result } = renderHook(() => useEpgNowNextLater(channel(), null, ['u']))
    expect(result.current).toEqual({ now: null, next: null, later: null })
    expect(epgSchedule).not.toHaveBeenCalled()
  })

  it('läser nu/härnäst/senare ur appens tablå, på kanalnyckeln', async () => {
    const now = Date.now()
    vi.mocked(epgSchedule).mockResolvedValue({
      [KEY]: [
        { title: 'P0', start: now - 60_000, stop: now + 60_000 },
        { title: 'P1', start: now + 60_000, stop: now + 120_000 },
        { title: 'P2', start: now + 120_000, stop: now + 180_000 },
      ],
    })
    const { result } = renderHook(() => useEpgNowNextLater(channel('A'), 'global', ['u']))
    await waitFor(() => expect(result.current.now?.title).toBe('P0'))
    expect(result.current.next?.title).toBe('P1')
    expect(result.current.later?.title).toBe('P2')
    expect(vi.mocked(epgSchedule).mock.calls[0][1]).toEqual([KEY])
  })

  it('ett RIKTIGT list-id frågar ändå den globala EPG-store:n', async () => {
    // Startsideöverstyrningen och appens hemrad (bryggan window.__LumioLiveTvEpg)
    // skickar listans egna id. Pluginet skriver bara EN store, så ett sådant id
    // gav tom EPG tills det översattes här.
    const now = Date.now()
    vi.mocked(epgSchedule).mockResolvedValue({ [KEY]: [{ title: 'P0', start: now - 1000, stop: now + 1000 }] })
    const { result } = renderHook(() => useEpgNowNextLater(channel('A'), 'list-1', ['u']))
    await waitFor(() => expect(result.current.now?.title).toBe('P0'))
    expect(vi.mocked(epgSchedule).mock.calls[0][0]).toBe('global')
  })

  it('rullar vidare vid programgränsen', async () => {
    // Falsk klocka som ändå går framåt av sig själv: gränstimern ska kunna
    // spolas fram med advanceTimersByTime, medan waitFor får ticka som vanligt.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const start = Date.now()
    vi.mocked(epgSchedule).mockResolvedValue({
      [KEY]: [
        { title: 'P0', start, stop: start + 5000 },
        { title: 'P1', start: start + 5000, stop: start + 10_000 },
      ],
    })
    const { result } = renderHook(() => useEpgNowNextLater(channel('A'), 'global', ['u']))
    await waitFor(() => expect(result.current.now?.title).toBe('P0'))
    await act(async () => {
      vi.advanceTimersByTime(5001)
    })
    await waitFor(() => expect(result.current.now?.title).toBe('P1'))
  })
})
