import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useOrientation } from './useOrientation'

type Listener = (event: { matches: boolean }) => void

function stubMatchMedia(matches: boolean) {
  const listeners = new Set<Listener>()
  const mql = {
    matches,
    media: '(orientation: landscape)',
    addEventListener: (_: string, fn: Listener) => { listeners.add(fn) },
    removeEventListener: (_: string, fn: Listener) => { listeners.delete(fn) },
  }
  vi.stubGlobal('matchMedia', vi.fn(() => mql))
  return {
    mql,
    flip: (next: boolean) => { mql.matches = next; listeners.forEach((fn) => fn({ matches: next })) },
    count: () => listeners.size,
  }
}

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('useOrientation', () => {
  it("är 'portrait' utan matchMedia", () => {
    vi.stubGlobal('matchMedia', undefined)
    const { result } = renderHook(() => useOrientation())
    expect(result.current).toBe('portrait')
  })
  it("läser 'landscape' ur matchMedia och frågar efter orientation: landscape", () => {
    const stub = stubMatchMedia(true)
    const { result } = renderHook(() => useOrientation())
    expect(result.current).toBe('landscape')
    expect(window.matchMedia).toHaveBeenCalledWith('(orientation: landscape)')
    expect(stub.count()).toBe(1)
  })
  it('vänder på change och släpper lyssnaren vid unmount', () => {
    const stub = stubMatchMedia(false)
    const { result, unmount } = renderHook(() => useOrientation())
    expect(result.current).toBe('portrait')
    act(() => stub.flip(true))
    expect(result.current).toBe('landscape')
    act(() => stub.flip(false))
    expect(result.current).toBe('portrait')
    unmount()
    expect(stub.count()).toBe(0)
  })
})
