import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SportCouchMount } from './sport-couch-mount'
import { setPlayingChannel } from '../goal-alerts'
import { __resetPresenceForTests, hasCouchPresence, markPresence, PRESENCE_TTL_MS } from './presence'
import { __resetGoalsForTests, addGoal, dismissGoal } from './goals'

// Feedern ska inte hämta tablån på riktigt i testet.
const epg = vi.hoisted(() => ({ day: null as null | { matches: unknown[] } }))
vi.mock('../sport-epg', async (orig) => ({ ...(await orig<typeof import('../sport-epg')>()), useSportDay: () => ({ data: epg.day, state: 'ready' }) }))

type W = { __lumioPluginRuntime?: { sdk?: Record<string, unknown> } }
afterEach(() => { __resetGoalsForTests(); epg.day = null; delete (globalThis as W).__lumioPluginRuntime; setPlayingChannel(null); __resetPresenceForTests(); vi.useRealTimers() })

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
  it('utan nyckel och utan telefon i sportfliken: en sportkanal startar sportläget ur EPG:t', () => {
    const now = Date.now()
    epg.day = { matches: [{ id: 'm', kind: 'football', league: 'L', leagueKey: 'l', home: 'A', away: 'B', homeKey: 'a', awayKey: 'b', event: null,
      start: now - 60_000, stop: now + 3_600_000, status: 'live', rerun: false, round: null, venue: null,
      sources: [{ channelKey: 'k1', name: 'K1', url: 'u', logo: null, group: 'g', tvgId: null, sourceId: 's', quality: null, programmeStart: 0, programmeStop: 0, liveFlag: true }] }] }
    const { registerSurface } = host()
    render(<SportCouchMount />)
    act(() => { setPlayingChannel('k1') })
    const surface = registerSurface.mock.calls[0][1] as { snapshot: () => { context: string | null; focus: { id: string } | null } }
    expect(hasCouchPresence()).toBe(false)
    expect(surface.snapshot()).toMatchObject({ context: 'channel', focus: { id: 'm' } })
  })
  it('ett nytt eller stängt mål meddelar telefonerna och följer med i bilden', () => {
    vi.useFakeTimers()
    const { registerSurface, notifySurface } = host()
    render(<SportCouchMount />)
    const surface = registerSurface.mock.calls[0][1] as { snapshot: () => { goals: { goalId: string }[]; multiview: unknown } }
    act(() => { addGoal({ goalId: 'g', matchId: 'm', team: { name: 'A', short: 'A', crest: null }, opponent: 'B', score: [1, 0], minute: null, league: 'L', channel: null, at: 0 }, Date.now()) })
    act(() => { vi.advanceTimersByTime(260) })
    expect(notifySurface).toHaveBeenCalledTimes(1)
    expect(surface.snapshot()).toMatchObject({ goals: [{ goalId: 'g' }], multiview: null })
    act(() => { dismissGoal('g') })
    act(() => { vi.advanceTimersByTime(260) })
    expect(notifySurface).toHaveBeenCalledTimes(2)
    expect(surface.snapshot().goals).toEqual([])
  })
})
