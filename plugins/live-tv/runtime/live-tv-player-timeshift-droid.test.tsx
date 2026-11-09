import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/**
 * Timeshift på Android: spelaren mot appens buffertsession, med en styrbar
 * media3-motor. Sessionen svarar via fetch; kommandona mot bryggan spioneras.
 */
const engine = vi.hoisted(() => {
  const listeners = new Set<() => void>()
  const base = () => ({
    timePos: 0, duration: 0, fileLoaded: false, playbackRestarted: false, firstFrameRendered: false,
    ended: false, loadFailed: false, loadFailedToken: 0, paused: false, pausedForCache: false, isLive: false, behindWindow: false,
  })
  let state = base()
  const calls: string[] = []
  return {
    calls,
    get: () => state,
    set(patch: Partial<ReturnType<typeof base>>) { state = { ...state, ...patch }; listeners.forEach((l) => l()) },
    reset() { state = base(); calls.length = 0 },
    subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } },
    actions: {
      seek: async (s: number) => { calls.push(`seek:${s}`) },
      seekRelative: async (d: number) => { calls.push(`seekRelative:${d}`) },
      setPlayPause: async (p: boolean) => { calls.push(`pause:${p}`); state = { ...state, paused: p }; listeners.forEach((l) => l()) },
      resetEnded: () => {}, resetFileLoaded: () => {}, resetPlaybackRestarted: () => {}, resetFirstFrameRendered: () => {},
    },
  }
})

vi.mock('@/lib/plugin-sdk', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/plugin-sdk')
  const React = await vi.importActual<typeof import('react')>('react')
  const useEngine = () => {
    const s = React.useSyncExternalStore(engine.subscribe, engine.get, engine.get)
    const base = (actual.useNativePlayer as (on: boolean) => Record<string, unknown>)(true)
    return { ...base, ...s, ...engine.actions }
  }
  return {
    ...actual,
    isDesktopTauriEnv: false,
    isAndroidTauriEnv: true,
    useNativePlayer: useEngine,
    openNativePlayer: async (opts: { url: string; mimeType?: string }) => { engine.calls.push(`open:${opts.url}${opts.mimeType ? `|${opts.mimeType}` : ''}`) },
    closeNativePlayer: async () => { engine.calls.push('close') },
    switchNativeSource: async (opts: { url: string; paused: boolean; atEnd: boolean }) => { engine.calls.push(`switch:${opts.url}|${opts.paused}|${opts.atEnd}`) },
  }
})

import { __resetForTests, __setTvModeForTests } from '@/lib/plugin-sdk'
import { setTvSettings } from './tv/tv-settings-store'
import { setTimeshiftOnDevice } from './timeshift-device'
import { __resetRecordingsForTests } from './recordings'
import { LiveTvPlayer } from './live-tv-player'
import type { LiveTvPlayerTvProps } from './tv/tv-player-types'

const TS = 'http://tv.kkz.test:8080/live/u/p/8171.ts'
const channel = { name: 'SVT1', logo: null, group: 'Sweden', url: TS, tvgId: null }
const SESSION = { id: 'ab12', liveUrl: '/api/live-tv/timeshift/ab12/live.ts', playlistUrl: '/api/live-tv/timeshift/ab12/index.m3u8' }

function tv(): LiveTvPlayerTvProps {
  return {
    channelNumber: 1, quality: 'HD', favourite: false, bannerHideMs: 0, neighbours: [channel], pinnedKeys: [],
    nowFor: () => ({ now: null, next: null, later: null }), nowMs: Date.now(), locale: 'en-GB', gateOpen: false, phone: false,
    fullscreenOnRotate: true, keepAwake: true,
    onToggleFavourite: vi.fn(), onOpenChannelDetails: vi.fn(), onOpenMultiview: vi.fn(), onOpenGuide: vi.fn(), onAddToMultiview: vi.fn(), onSwitchChannel: vi.fn(),
  }
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
let fetches: Array<{ url: string; method: string }> = []
let sessionReply: () => Response = () => json(SESSION)
let statusReady = true

beforeEach(() => {
  __resetForTests()
  __resetRecordingsForTests()
  __setTvModeForTests(false)
  engine.reset()
  fetches = []
  statusReady = true
  sessionReply = () => json(SESSION)
  setTvSettings({ timeshiftEnabled: true, timeshiftMinutes: 30 })
  setTimeshiftOnDevice(true)
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const u = String(url)
    const method = init?.method ?? 'GET'
    fetches.push({ url: u, method })
    if (u.startsWith('/api/live-tv/timeshift/session')) return method === 'DELETE' ? new Response(null, { status: 204 }) : sessionReply()
    if (u.endsWith('/status')) return json({ ready: statusReady, bytes: 1, segments: 1, seconds: 120 })
    return json({})
  }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const mount = () => render(<LiveTvPlayer channel={channel} onClose={() => {}} tv={tv()} />)
const openCalls = () => engine.calls.filter((c) => c.startsWith('open:'))

describe('Timeshift på Android', () => {
  it('skapar en session och öppnar reläet, utan mimeType', async () => {
    mount()
    await waitFor(() => expect(openCalls()).toEqual([`open:${SESSION.liveUrl}`]))
    expect(fetches.filter((f) => f.method === 'POST' && f.url === '/api/live-tv/timeshift/session')).toHaveLength(1)
  })

  it('faller tillbaka på direktvägen när appen svarar 507', async () => {
    sessionReply = () => json({ error: 'disk' }, 507)
    mount()
    await waitFor(() => expect(openCalls()).toEqual([`open:${TS}`]))
  })

  it('utan enhetsflaggan: ingen session, direktvägen som förut', async () => {
    setTimeshiftOnDevice(false)
    mount()
    await waitFor(() => expect(openCalls()).toEqual([`open:${TS}`]))
    expect(fetches.some((f) => f.url === '/api/live-tv/timeshift/session')).toBe(false)
  })

  it('paus: pausar reläet och byter till spellistan pausad vid livekanten när den är redo', async () => {
    mount()
    await waitFor(() => expect(openCalls()).toHaveLength(1))
    fireEvent.click(screen.getByLabelText('Pause'))
    await waitFor(() => expect(engine.calls).toContain(`switch:${SESSION.playlistUrl}|true|true`))
    const pauseAt = engine.calls.indexOf('pause:true')
    const switchAt = engine.calls.findIndex((c) => c.startsWith('switch:'))
    expect(pauseAt).toBeGreaterThanOrEqual(0)
    expect(pauseAt).toBeLessThan(switchAt)
    // Play fortsätter där bilden stannade — ingen omladdning.
    act(() => engine.set({ isLive: true, duration: 120, timePos: 100 }))
    fireEvent.click(screen.getByLabelText('Resume'))
    await waitFor(() => expect(engine.calls.filter((c) => c === 'pause:false')).toHaveLength(1))
    expect(openCalls()).toHaveLength(1)
  })

  it('på spellistan: tidslinjen kommer ur livefönstret och Gå live söker till slutet', async () => {
    mount()
    await waitFor(() => expect(openCalls()).toHaveLength(1))
    fireEvent.click(screen.getByLabelText('Pause'))
    await waitFor(() => expect(engine.calls.some((c) => c.startsWith('switch:'))).toBe(true))
    act(() => engine.set({ isLive: true, duration: 600, timePos: 300 }))
    const bar = await screen.findByTestId('timeshift-bar')
    expect(bar).toBeTruthy()
    fireEvent.click(screen.getByText('Go live'))
    await waitFor(() => expect(engine.calls).toContain('seek:599'))
  })

  it('stängning tar bort sessionen innan spelaren stängs', async () => {
    const view = mount()
    await waitFor(() => expect(openCalls()).toHaveLength(1))
    view.unmount()
    await waitFor(() => expect(fetches.some((f) => f.method === 'DELETE')).toBe(true))
    await waitFor(() => expect(engine.calls).toContain('close'))
    // DELETE:n gick iväg före close.
    const deleteIndex = fetches.findIndex((f) => f.method === 'DELETE')
    expect(deleteIndex).toBeGreaterThanOrEqual(0)
  })

  it('proxy-fallbacken tar bort sessionen först, så panelen aldrig ser två anslutningar', async () => {
    mount()
    await waitFor(() => expect(openCalls()).toHaveLength(1))
    act(() => engine.set({ loadFailed: true, loadFailedToken: 1 }))
    await waitFor(() => expect(openCalls()).toHaveLength(2))
    expect(openCalls()[1]).toContain('/api/m3u?stream=')
    expect(fetches.some((f) => f.method === 'DELETE' && f.url.includes('id=ab12'))).toBe(true)
  })

  it('pausen var längre än bufferten: ett kort besked, en gång', async () => {
    mount()
    await waitFor(() => expect(openCalls()).toHaveLength(1))
    act(() => engine.set({ behindWindow: true }))
    expect(await screen.findByTestId('player-notice')).toHaveTextContent('paused longer than the buffer')
  })
})
