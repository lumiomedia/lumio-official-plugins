import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SportCouchMount } from './sport-couch-mount'
import { setPlayingChannel } from '../goal-alerts'
import { __resetPresenceForTests, hasCouchPresence, markPresence, PRESENCE_TTL_MS } from './presence'

// Feedern ska inte hämta tablån på riktigt i testet.
vi.mock('../sport-epg', async (orig) => ({ ...(await orig<typeof import('../sport-epg')>()), useSportDay: () => ({ data: null, state: 'ready' }) }))

type W = { __lumioPluginRuntime?: { sdk?: Record<string, unknown> } }
afterEach(() => { delete (globalThis as W).__lumioPluginRuntime; setPlayingChannel(null); __resetPresenceForTests(); vi.useRealTimers() })

function host() {
  const off = vi.fn()
  const registerSurface = vi.fn((_id: string, _s: unknown) => off)
  const notifySurface = vi.fn()
  ;(globalThis as W).__lumioPluginRuntime = { sdk: { couch: { registerSurface, notifySurface, registerPlayer: vi.fn(), notifyState: vi.fn() } } }
  return { registerSurface, notifySurface, off }
}

describe('SportCouchMount', () => {
  it('gör ingenting på en äldre värd', () => {
    ;(globalThis as W).__lumioPluginRuntime = { sdk: {} }
    expect(() => render(<SportCouchMount />)).not.toThrow()
  })
  it('registrerar ytan och buntar notify vid kanalbyte', () => {
    vi.useFakeTimers()
    const { registerSurface, notifySurface, off } = host()
    const { unmount } = render(<SportCouchMount />)
    expect(registerSurface).toHaveBeenCalledWith('sport', expect.objectContaining({ snapshot: expect.any(Function), run: expect.any(Function), query: expect.any(Function) }))
    setPlayingChannel('a'); setPlayingChannel('b')
    vi.advanceTimersByTime(260)
    expect(notifySurface).toHaveBeenCalledTimes(1)
    unmount()
    expect(off).toHaveBeenCalledOnce()
  })
  it('bilden utan nyckel saknar ställning och följer kanalen', () => {
    const { registerSurface } = host()
    render(<SportCouchMount />)
    const surface = registerSurface.mock.calls[0][1] as { snapshot: () => { hasKey: boolean; focus: unknown } }
    expect(surface.snapshot()).toMatchObject({ hasKey: false, focus: null })
  })
  it('en tyst telefon sopas bort efter TTL', () => {
    vi.useFakeTimers()
    const { notifySurface } = host()
    render(<SportCouchMount />)
    act(() => { markPresence('p1', true, Date.now()) })
    expect(hasCouchPresence()).toBe(true)
    act(() => { vi.advanceTimersByTime(PRESENCE_TTL_MS + 16_000) })
    expect(hasCouchPresence()).toBe(false)
    expect(notifySurface).toHaveBeenCalled()
  })
})
