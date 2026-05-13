import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useEpgLoadStatus } from './useEpgLoadStatus'
import * as cacheModule from '../epg/cache'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-13T12:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useEpgLoadStatus', () => {
  it('returns "idle" when listId is null', () => {
    const { result } = renderHook(() => useEpgLoadStatus(null, []))
    expect(result.current).toBe('idle')
  })

  it('returns "ready" when cache exists with entries', () => {
    vi.spyOn(cacheModule, 'readCache').mockReturnValue({
      index: { A: [{ title: 'x', start: 0, stop: 1 }] },
      fetchedAt: Date.now(),
      sources: ['u'],
    })
    vi.spyOn(cacheModule, 'ensureFresh').mockResolvedValue(null)
    const { result } = renderHook(() => useEpgLoadStatus('list-1', ['u']))
    expect(result.current).toBe('ready')
  })

  it('returns "empty" when no cache and no urls', async () => {
    vi.spyOn(cacheModule, 'readCache').mockReturnValue(null)
    vi.spyOn(cacheModule, 'ensureFresh').mockResolvedValue(null)
    const { result } = renderHook(() => useEpgLoadStatus('list-1', []))
    await waitFor(() => expect(result.current).toBe('empty'))
  })

  it('returns "loading" briefly then transitions when cache lands', async () => {
    let cacheValue: ReturnType<typeof cacheModule.readCache> = null
    vi.spyOn(cacheModule, 'readCache').mockImplementation(() => cacheValue)
    vi.spyOn(cacheModule, 'ensureFresh').mockResolvedValue(null)
    const { result, rerender } = renderHook(() => useEpgLoadStatus('list-1', ['u']))
    expect(result.current).toBe('loading')
    cacheValue = { index: { A: [{ title: 'p', start: 0, stop: 1 }] }, fetchedAt: Date.now(), sources: ['u'] }
    rerender()
    expect(result.current).toBe('ready')
  })
})
