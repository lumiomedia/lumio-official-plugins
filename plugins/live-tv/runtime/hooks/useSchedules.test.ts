import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, cleanup } from '@testing-library/react'
import type { EpgProgramme } from '../epg/types'

vi.mock('../index-client', () => ({
  epgSchedule: vi.fn(async () => ({}) as Record<string, EpgProgramme[]>),
}))

import { epgSchedule } from '../index-client'
import { useSchedules } from './useSchedules'
import { __resetScheduleCacheForTests } from '../epg/schedule-cache'

const ch = (name: string) => ({ name, logo: null, group: 'Sport', url: `http://x/${name}`, tvgId: null })
const key = (name: string) => `${name}::http://x/${name}`
const FROM = 1_000_000
const TO = 2_000_000

beforeEach(() => {
  __resetScheduleCacheForTests()
  vi.mocked(epgSchedule).mockReset()
  vi.mocked(epgSchedule).mockResolvedValue({})
})

afterEach(cleanup)

describe('useSchedules', () => {
  it('hämtar alla kanalers fönster i ETT anrop och nycklar på kanalnyckel', async () => {
    vi.mocked(epgSchedule).mockResolvedValue({ [key('A')]: [{ title: 'P', start: FROM, stop: TO }] })
    const channels = [ch('A'), ch('B')]
    const { result } = renderHook(() => useSchedules(channels, FROM, TO))
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(epgSchedule).toHaveBeenCalledTimes(1)
    expect(epgSchedule).toHaveBeenCalledWith('global', [key('A'), key('B')], FROM, TO)
    expect(result.current.schedules[key('A')]?.[0].title).toBe('P')
    // Kanaler utan tablå svarar tomt, inte "saknas".
    expect(result.current.schedules[key('B')]).toEqual([])
  })

  it('samma fönster igen kostar inget anrop', async () => {
    const channels = [ch('A')]
    const first = renderHook(() => useSchedules(channels, FROM, TO))
    await waitFor(() => expect(first.result.current.loading).toBe(false))
    first.unmount()

    const { result } = renderHook(() => useSchedules([ch('A')], FROM, TO))
    // Cachen svarar synkront — ingen laddningsblink och inget nytt anrop.
    expect(result.current.loading).toBe(false)
    expect(epgSchedule).toHaveBeenCalledTimes(1)
  })

  it('ett annat fönster är en egen post', async () => {
    const { rerender } = renderHook(({ to }: { to: number }) => useSchedules([ch('A')], FROM, to), {
      initialProps: { to: TO },
    })
    await waitFor(() => expect(epgSchedule).toHaveBeenCalledTimes(1))
    rerender({ to: TO + 3_600_000 })
    await waitFor(() => expect(epgSchedule).toHaveBeenCalledTimes(2))
  })

  it('utan kanaler frågas ingenting', async () => {
    const { result } = renderHook(() => useSchedules([], FROM, TO))
    expect(result.current.loading).toBe(false)
    expect(epgSchedule).not.toHaveBeenCalled()
  })

  it('ett riktigt list-id frågar den globala EPG-store:n', async () => {
    const { result } = renderHook(() => useSchedules([ch('A')], FROM, TO, 'list-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(vi.mocked(epgSchedule).mock.calls[0][0]).toBe('global')
  })

  it('ett svar som landar efter avmontering skriver inte till en död komponent', async () => {
    const pending: ((value: Record<string, EpgProgramme[]>) => void)[] = []
    vi.mocked(epgSchedule).mockImplementation(
      () => new Promise((resolve) => { pending.push(resolve) }),
    )
    const { unmount } = renderHook(() => useSchedules([ch('A')], FROM, TO))
    await waitFor(() => expect(epgSchedule).toHaveBeenCalled())
    unmount()
    pending[0]({ [key('A')]: [] })
    // Ingen "state update on unmounted component" — och svaret hamnar ändå i
    // modulcachen, så nästa vy slipper anropet.
    const { result } = renderHook(() => useSchedules([ch('A')], FROM, TO))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(epgSchedule).toHaveBeenCalledTimes(1)
  })
})
