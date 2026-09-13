import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, cleanup } from '@testing-library/react'
import type { NowNextLater } from '../epg/types'

vi.mock('../index-client', () => ({
  epgNow: vi.fn(async () => ({ at: Date.now(), fetchedAt: null, items: {} as Record<string, NowNextLater> })),
}))

import { epgNow } from '../index-client'
import { useEpgLoadStatus } from './useEpgLoadStatus'
import { __resetNowSnapshotForTests, fetchNowSnapshot } from '../epg/now-snapshot'

const programme = { title: 'x', start: 0, stop: 1 }

/** Modellen är den som hämtar; hooken läser bara det som publicerats. */
const modelFetch = () => fetchNowSnapshot('global', null).catch(() => {})

beforeEach(() => {
  __resetNowSnapshotForTests()
  vi.mocked(epgNow).mockReset()
  vi.mocked(epgNow).mockResolvedValue({ at: Date.now(), fetchedAt: null, items: {} })
})

afterEach(cleanup)

describe('useEpgLoadStatus', () => {
  it('"idle" utan lista', () => {
    const { result } = renderHook(() => useEpgLoadStatus(null, []))
    expect(result.current).toBe('idle')
  })

  it('hämtar ALDRIG själv — modellen äger snapshotet', async () => {
    const { result } = renderHook(() => useEpgLoadStatus('global', ['u']))
    await waitFor(() => expect(result.current).toBe('loading'))
    expect(epgNow).not.toHaveBeenCalled()
  })

  it('"ready" när appen har program att visa', async () => {
    vi.mocked(epgNow).mockResolvedValue({
      at: Date.now(),
      fetchedAt: Date.now(),
      items: { 'A::http://x/A': { now: programme, next: null, later: null } },
    })
    const { result } = renderHook(() => useEpgLoadStatus('global', ['u']))
    await modelFetch()
    await waitFor(() => expect(result.current).toBe('ready'))
  })

  it('ett riktigt list-id duger — samma globala store', async () => {
    vi.mocked(epgNow).mockResolvedValue({
      at: Date.now(),
      fetchedAt: Date.now(),
      items: { 'A::http://x/A': { now: programme, next: null, later: null } },
    })
    const { result } = renderHook(() => useEpgLoadStatus('list-1', ['u']))
    await modelFetch()
    await waitFor(() => expect(result.current).toBe('ready'))
  })

  it('"empty" utan EPG-källor', async () => {
    const { result } = renderHook(() => useEpgLoadStatus('global', []))
    await waitFor(() => expect(result.current).toBe('empty'))
  })

  it('"empty" när appen hämtat men inget matchade', async () => {
    vi.mocked(epgNow).mockResolvedValue({ at: Date.now(), fetchedAt: Date.now(), items: {} })
    const { result } = renderHook(() => useEpgLoadStatus('global', ['u']))
    await modelFetch()
    await waitFor(() => expect(result.current).toBe('empty'))
  })

  it('"loading" tills appen hunnit hämta, "error" när anropet faller', async () => {
    const { result } = renderHook(() => useEpgLoadStatus('global', ['u']))
    // fetchedAt === null: appen har ännu inte hämtat något.
    await modelFetch()
    await waitFor(() => expect(result.current).toBe('loading'))
    cleanup()

    __resetNowSnapshotForTests()
    vi.mocked(epgNow).mockRejectedValue(new Error('boom'))
    const failed = renderHook(() => useEpgLoadStatus('global', ['u']))
    await modelFetch()
    await waitFor(() => expect(failed.result.current).toBe('error'))
  })
})
