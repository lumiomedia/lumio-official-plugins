import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetForTests } from '@/lib/plugin-sdk'

vi.mock('./sport/home-rows/rows-feed', () => ({ useSportRows: () => ({ matches: [] }) }))
vi.mock('./sport/results-controller', () => ({ currentResults: () => null }))

import { GRACE_MS, LONG_STALL_MS } from './stream-fallback'
import { setTvSettings } from './tv/tv-settings-store'
import { useStreamFallback } from './use-stream-fallback'

const ch = (name: string, url: string) => ({ name, url, logo: null, group: 'g', tvgId: null })
const current = ch('V Sport Fotboll HD SE', 'a')
const other = ch('V Sport Fotboll HD SE', 'b')

beforeEach(() => { __resetForTests(); vi.useFakeTimers() })
afterEach(() => { cleanup(); vi.useRealTimers() })

/** Ett långt stopp efter startfönstret: det som utlöser förslaget. */
function stallLong() {
  const onSwitch = vi.fn()
  const hook = renderHook((p: { paused: boolean }) => useStreamFallback({ channel: current, pausedForCache: p.paused, userPaused: false, channels: [current, other], onSwitch }), { initialProps: { paused: false } })
  act(() => { vi.advanceTimersByTime(GRACE_MS + 1_000) })
  hook.rerender({ paused: true })
  for (let i = 0; i < LONG_STALL_MS / 1_000 + 2; i++) act(() => { vi.advanceTimersByTime(1_000) })
  return hook
}

describe('useStreamFallback', () => {
  it('föreslår nästa källa när kanalen hackar (på som standard, 5 s)', () => {
    const hook = stallLong()
    expect(hook.result.current.target?.url).toBe('b')
    expect(hook.result.current.autoSwitchS).toBe(5)
  })
  it('avstängt i inställningarna: inget förslag alls', () => {
    setTvSettings({ streamFallback: false })
    const hook = stallLong()
    expect(hook.result.current.target).toBeNull()
  })
  it('läser inställningarna live: Aldrig syns direkt i hooken', () => {
    const hook = stallLong()
    act(() => { setTvSettings({ streamFallbackAfterS: 0 }) })
    expect(hook.result.current.autoSwitchS).toBe(0)
    act(() => { setTvSettings({ streamFallback: false }) })
    expect(hook.result.current.target).toBeNull()
  })
})
