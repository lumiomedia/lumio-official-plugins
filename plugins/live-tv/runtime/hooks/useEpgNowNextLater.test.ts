import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useEpgNowNextLater } from './useEpgNowNextLater'
import * as cacheModule from '../epg/cache'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-13T12:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useEpgNowNextLater', () => {
  it('returns all-null when channel.tvgId is null', () => {
    vi.spyOn(cacheModule, 'readCache').mockReturnValue(null)
    vi.spyOn(cacheModule, 'ensureFresh').mockResolvedValue(null)
    const { result } = renderHook(() => useEpgNowNextLater({ tvgId: null }, 'list-1', ['u']))
    expect(result.current).toEqual({ now: null, next: null, later: null })
  })

  it('returns now/next/later when cache has data', async () => {
    const now = Date.now()
    vi.spyOn(cacheModule, 'readCache').mockReturnValue({
      index: {
        A: [
          { title: 'P0', start: now - 60_000, stop: now + 60_000 },
          { title: 'P1', start: now + 60_000, stop: now + 120_000 },
          { title: 'P2', start: now + 120_000, stop: now + 180_000 },
        ],
      },
      fetchedAt: now,
      sources: ['u'],
    })
    vi.spyOn(cacheModule, 'ensureFresh').mockResolvedValue(null)
    const { result } = renderHook(() => useEpgNowNextLater({ tvgId: 'A' }, 'list-1', ['u']))
    await waitFor(() => expect(result.current.now?.title).toBe('P0'))
    expect(result.current.next?.title).toBe('P1')
    expect(result.current.later?.title).toBe('P2')
  })

  it('re-derives at programme boundary', async () => {
    const start = Date.now()
    vi.spyOn(cacheModule, 'readCache').mockReturnValue({
      index: {
        A: [
          { title: 'P0', start, stop: start + 5000 },
          { title: 'P1', start: start + 5000, stop: start + 10_000 },
        ],
      },
      fetchedAt: start,
      sources: ['u'],
    })
    vi.spyOn(cacheModule, 'ensureFresh').mockResolvedValue(null)
    const { result } = renderHook(() => useEpgNowNextLater({ tvgId: 'A' }, 'list-1', ['u']))
    await waitFor(() => expect(result.current.now?.title).toBe('P0'))
    await act(async () => { vi.advanceTimersByTime(5001) })
    await waitFor(() => expect(result.current.now?.title).toBe('P1'))
  })
})
