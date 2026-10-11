import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useKeyHandoff } from './key-handoff'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals() })

describe('useKeyHandoff', () => {
  it('visar adressen, pollar var 2:a s, levererar nyckeln en gång och avbryter vid stängning', async () => {
    const polls = [{ state: 'waiting' }, { state: 'received', key: 'abc12345' }]
    const calls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? 'GET'} ${url}`)
      if (init?.method === 'POST') return new Response(JSON.stringify({ code: 'c0ffee', url: 'http://192.168.1.5:3012/sport-key?c=c0ffee' }))
      if (init?.method === 'DELETE') return new Response('{"ok":true}')
      return new Response(JSON.stringify(polls.shift() ?? { state: 'expired' }))
    }))
    const onKey = vi.fn()
    const { result, unmount } = renderHook(() => useKeyHandoff(true, onKey))
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(result.current.url).toBe('http://192.168.1.5:3012/sport-key?c=c0ffee')
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000) })
    expect(onKey).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000) })
    expect(onKey).toHaveBeenCalledWith('abc12345')
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
    expect(onKey).toHaveBeenCalledTimes(1)
    unmount()
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(calls.filter((c) => c.startsWith('GET')).length).toBe(2)
    expect(calls.some((c) => c.startsWith('DELETE'))).toBe(true)
  })

  it('inaktiv → inga anrop', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderHook(() => useKeyHandoff(false, vi.fn()))
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
