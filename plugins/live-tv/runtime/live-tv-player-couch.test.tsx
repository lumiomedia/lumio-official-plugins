import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, type CouchPlayerHandlers } from '@/lib/plugin-sdk'
import { LiveTvPlayer } from './live-tv-player'

/** Soffläge: kanalen registreras som telefonens spelare och tar paus och volym. */

const ch = { name: 'TV4 Sport', logo: null, group: 'Sport', url: 'http://x/tv4.m3u8', tvgId: null }
type W = { __lumioPluginRuntime?: { sdk?: Record<string, unknown> } }

function host() {
  const off = vi.fn()
  const registerPlayer = vi.fn((_h: CouchPlayerHandlers) => off)
  const notifyState = vi.fn()
  ;(globalThis as W).__lumioPluginRuntime = { sdk: { couch: { registerSurface: vi.fn(), notifySurface: vi.fn(), registerPlayer, notifyState } } }
  return { registerPlayer, notifyState, off }
}

beforeEach(() => { __resetForTests(); __setTvModeForTests(false) })
afterEach(() => { cleanup(); delete (globalThis as W).__lumioPluginRuntime })

describe('LiveTvPlayer i Soffläge', () => {
  it('registrerar kanalen som spelare och släpper den när spelaren stängs', () => {
    const { registerPlayer, off } = host()
    const { unmount } = render(<LiveTvPlayer channel={ch} onClose={() => {}} />)
    expect(registerPlayer).toHaveBeenCalledOnce()
    expect(registerPlayer.mock.calls[0][0].snapshot()).toMatchObject({ kind: 'channel', channelName: 'TV4 Sport', canSeek: false, volume: 100 })
    unmount()
    expect(off).toHaveBeenCalledOnce()
  })

  it('volym från telefonen syns i nästa bild och meddelas värden', () => {
    const { registerPlayer, notifyState } = host()
    render(<LiveTvPlayer channel={ch} onClose={() => {}} />)
    const h = registerPlayer.mock.calls[0][0]
    notifyState.mockClear()
    act(() => { void h.run({ id: 'v', type: 'volume', value: 30 }) })
    expect(h.snapshot()?.volume).toBe(30)
    expect(notifyState).toHaveBeenCalled()
  })

  it('kraschar inte mot en äldre app utan Soffläge', () => {
    ;(globalThis as W).__lumioPluginRuntime = { sdk: {} }
    expect(() => render(<LiveTvPlayer channel={ch} onClose={() => {}} />)).not.toThrow()
  })
})
