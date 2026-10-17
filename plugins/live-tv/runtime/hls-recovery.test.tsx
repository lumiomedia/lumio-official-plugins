import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'

/**
 * Återhämtningen för HLS ur liveformatet: de rena reglerna, och samma regler
 * i den riktiga spelaren med en styrbar mpv-motor.
 */
const engine = vi.hoisted(() => {
  const listeners = new Set<() => void>()
  let state = {
    timePos: 0, fileLoaded: false, playbackRestarted: false, firstFrameRendered: false,
    ended: false, loadFailed: false, loadFailedToken: 0, paused: false, pausedForCache: false,
  }
  return {
    get: () => state,
    set(patch: Partial<typeof state>) { state = { ...state, ...patch }; listeners.forEach((l) => l()) },
    reset() {
      state = { timePos: 0, fileLoaded: false, playbackRestarted: false, firstFrameRendered: false, ended: false, loadFailed: false, loadFailedToken: 0, paused: false, pausedForCache: false }
    },
    subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } },
    // Stabila identiteter: spelarens öppningseffekt har dem som beroenden.
    resets: {
      resetEnded: () => { state = { ...state, ended: false }; listeners.forEach((l) => l()) },
      resetFileLoaded: () => { state = { ...state, fileLoaded: false }; listeners.forEach((l) => l()) },
      resetPlaybackRestarted: () => { state = { ...state, playbackRestarted: false }; listeners.forEach((l) => l()) },
      resetFirstFrameRendered: () => { state = { ...state, firstFrameRendered: false }; listeners.forEach((l) => l()) },
    },
  }
})

vi.mock('@/lib/plugin-sdk', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/plugin-sdk')
  const React = await vi.importActual<typeof import('react')>('react')
  const useEngine = () => {
    const s = React.useSyncExternalStore(engine.subscribe, engine.get, engine.get)
    const base = (actual.useMpvPlayer as (on: boolean) => Record<string, unknown>)(true)
    return {
      ...base,
      ...s,
      ...engine.resets,
    }
  }
  return { ...actual, isDesktopTauriEnv: true, isAndroidTauriEnv: false, useMpvPlayer: useEngine }
})

import { __resetForTests, surfaceCalls, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from './live-tv-data'
import { __resetHlsFailuresForTests, hasHlsFailed } from './live-format'
import { __resetAccountSessionsForTests, __resetLiveFormatResolveForTests, noteLiveStreamEnded, resolveLivePlayUrl } from './live-format-resolve'
import {
  HLS_DEMUXER_LAVF_O,
  HLS_REOPEN_BACKOFF_MS,
  HLS_STALL_MS,
  hlsFailureAction,
  isHlsStalled,
  nextRecoveryStep,
} from './hls-recovery'
import { LiveTvPlayer } from './live-tv-player'

const TS = 'http://tv.kkz.test:8080/live/u/p/8171.ts'
const HLS = 'http://tv.kkz.test:8080/live/u/p/8171.m3u8'
const channel = { name: 'V Sport', logo: null, group: 'Sport', url: TS, tvgId: null }

describe('återhämtningens regler', () => {
  it('trappan: 3, 6, 12 s, sedan TS', () => {
    expect(nextRecoveryStep(0)).toEqual({ kind: 'reopen', delayMs: 3_000, attempt: 1 })
    expect(nextRecoveryStep(1)).toEqual({ kind: 'reopen', delayMs: 6_000, attempt: 2 })
    expect(nextRecoveryStep(2)).toEqual({ kind: 'reopen', delayMs: 12_000, attempt: 3 })
    expect(nextRecoveryStep(3)).toEqual({ kind: 'fallback-ts' })
  })

  it('stopp och fel efter spelning går genom trappan; ett första startfel utan färsk session ger TS direkt', () => {
    expect(hlsFailureAction({ reason: 'stall', failures: 0, playedBefore: true, msSinceAccountSession: null })).toBe('ladder')
    expect(hlsFailureAction({ reason: 'load-failed', failures: 0, playedBefore: true, msSinceAccountSession: null })).toBe('ladder')
    expect(hlsFailureAction({ reason: 'no-start', failures: 1, playedBefore: false, msSinceAccountSession: null })).toBe('ladder')
    expect(hlsFailureAction({ reason: 'load-failed', failures: 0, playedBefore: false, msSinceAccountSession: null })).toBe('fallback-ts')
    // 509 strax efter en annan ström på samma konto: vänta och ta om, inte TS.
    expect(hlsFailureAction({ reason: 'load-failed', failures: 0, playedBefore: false, msSinceAccountSession: 38_000 })).toBe('ladder')
    expect(hlsFailureAction({ reason: 'load-failed', failures: 0, playedBefore: false, msSinceAccountSession: 61_000 })).toBe('fallback-ts')
  })

  it('stopp = filslut, eller ingen ny speltid på 8 s utan att tittaren pausat', () => {
    expect(isHlsStalled({ now: 10_000, lastProgressAt: 9_000, ended: true, userPaused: false })).toBe(true)
    expect(isHlsStalled({ now: 9_000 + HLS_STALL_MS, lastProgressAt: 9_000, ended: false, userPaused: false })).toBe(true)
    expect(isHlsStalled({ now: 9_000 + HLS_STALL_MS - 1, lastProgressAt: 9_000, ended: false, userPaused: false })).toBe(false)
    expect(isHlsStalled({ now: 99_000, lastProgressAt: 9_000, ended: false, userPaused: true })).toBe(false)
  })

  it('HLS-demuxern öppnar aldrig en andra anslutning', () => {
    expect(HLS_DEMUXER_LAVF_O).toContain('http_multiple=0')
    expect(HLS_DEMUXER_LAVF_O).toContain('http_persistent=0')
  })
})

describe('LiveTvPlayer: återhämtning för HLS', () => {
  const opens = () => surfaceCalls.filter((c) => c.startsWith('mpv:open:')).map((c) => c.slice('mpv:open:'.length))
  const closedSinceLastOpen = () => surfaceCalls.lastIndexOf('mpv:close') > surfaceCalls.reduce((last, c, i) => (c.startsWith('mpv:open:') ? i : last), -1)
  const flush = async (ms = 0) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms) }) }
  /** Strömmen spelar: bild och speltid som rör sig. */
  const play = async (pos: number) => { await act(async () => { engine.set({ firstFrameRendered: true, playbackRestarted: true, fileLoaded: true, timePos: pos }) }) }

  beforeEach(() => {
    __resetForTests()
    __resetHlsFailuresForTests()
    __resetLiveFormatResolveForTests()
    __resetAccountSessionsForTests()
    engine.reset()
    surfaceCalls.length = 0
    vi.useFakeTimers()
    vi.stubGlobal('fetch', (() => Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as unknown as Response)) as typeof fetch)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    writePluginJson(LIVE_TV_PLUGIN_ID, 'xtream_logins', [{ id: 'login-1', base: 'http://tv.kkz.test:8080', username: 'u', password: 'p', format: 'ts', categoryIds: [], allowedFormats: ['m3u8', 'ts'] }])
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ id: 'x1', name: 'tv.kkz.test:8080', kind: 'xtream', source: 'xtream://tv.kkz.test:8080/login-1', xtreamLoginId: 'login-1', createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }])
  })
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

  it('HLS öppnas med demuxervalet satt FÖRE loadfile', async () => {
    render(<LiveTvPlayer channel={channel} onClose={() => {}} />)
    await flush()
    const prop = surfaceCalls.indexOf(`mpv:prop:demuxer-lavf-o=${HLS_DEMUXER_LAVF_O}`)
    expect(prop).toBeGreaterThanOrEqual(0)
    expect(prop).toBeLessThan(surfaceCalls.indexOf(`mpv:open:${HLS}`))
  })

  it('stopp mitt i: stäng, vänta 3/6/12 s, samma .m3u8 igen; fjärde stoppet → TS för kanalen', async () => {
    render(<LiveTvPlayer channel={channel} onClose={() => {}} />)
    await flush()
    await play(1)
    expect(opens()).toEqual([HLS])

    for (const [i, delay] of HLS_REOPEN_BACKOFF_MS.entries()) {
      await flush(HLS_STALL_MS + 1_000)
      // Stängd direkt — inte först efter väntan.
      expect(closedSinceLastOpen()).toBe(true)
      expect(opens()).toHaveLength(i + 1)
      await flush(delay)
      expect(opens()).toHaveLength(i + 2)
      expect(opens().at(-1)).toBe(HLS)
      // Omtaget kommer igång en stund, sedan stannar det igen.
      await play(i + 2)
    }

    await flush(HLS_STALL_MS + 1_000)
    expect(hasHlsFailed(TS)).toBe(true)
    expect(opens().at(-1)).toBe(TS)
    expect(opens().filter((u) => u === HLS)).toHaveLength(4)
  })

  it('filslut (misslyckad omladdning) är ett stopp direkt', async () => {
    render(<LiveTvPlayer channel={channel} onClose={() => {}} />)
    await flush()
    await play(1)
    await act(async () => { engine.set({ ended: true }) })
    await flush(0)
    expect(closedSinceLastOpen()).toBe(true)
    await flush(3_000)
    expect(opens()).toEqual([HLS, HLS])
  })

  it('ett omtag som spelar ostört nollar trappan', async () => {
    render(<LiveTvPlayer channel={channel} onClose={() => {}} />)
    await flush()
    await play(1)
    await flush(HLS_STALL_MS + 1_000)
    await flush(3_000)
    expect(opens()).toHaveLength(2)
    // Spelar 40 s med speltid som rör sig.
    for (let t = 2; t < 42; t += 1) { await play(t); await flush(1_000) }
    // Nästa stopp börjar om på 3 s, inte 6 s.
    await flush(HLS_STALL_MS + 1_000)
    await flush(3_000)
    expect(opens()).toHaveLength(3)
  })

  it('509 vid HLS-start strax efter en TS-session på kontot: vänta och ta om, inte TS', async () => {
    noteLiveStreamEnded(TS)
    render(<LiveTvPlayer channel={channel} onClose={() => {}} />)
    await flush()
    expect(opens()).toEqual([HLS])
    await act(async () => { engine.set({ loadFailed: true, loadFailedToken: 1 }) })
    await flush(0)
    expect(hasHlsFailed(TS)).toBe(false)
    await flush(3_000)
    expect(opens()).toEqual([HLS, HLS])
    await act(async () => { engine.set({ loadFailed: false }) })
    await play(1)
    await flush(5_000)
    expect(opens()).toEqual([HLS, HLS])
  })

  it('HLS som aldrig spelar på kontot: nästa kanal på samma konto tar TS direkt', async () => {
    render(<LiveTvPlayer channel={channel} onClose={() => {}} />)
    await flush()
    await act(async () => { engine.set({ loadFailed: true, loadFailedToken: 1 }) })
    await flush(0)
    expect(opens()).toEqual([HLS, TS])
    expect(resolveLivePlayUrl('http://tv.kkz.test:8080/live/u/p/9000.ts')).toBe('http://tv.kkz.test:8080/live/u/p/9000.ts')
  })
})
