import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'

/**
 * Liveformatet i den riktiga spelaren (mpv-motorn): en Xtream-kanal vars
 * konto tillåter m3u8 öppnas som HLS; kommer HLS inte igång inom startvaktens
 * budget tas samma kanal om som TS — EN gång — och först därefter går
 * trappan vidare till värdens proxy.
 */
vi.mock('@/lib/plugin-sdk', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/plugin-sdk')
  return { ...actual, isDesktopTauriEnv: true, isAndroidTauriEnv: false }
})

import { __resetForTests, surfaceCalls, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from './live-tv-data'
import { __resetHlsFailuresForTests, hasHlsFailed } from './live-format'
import { __resetLiveFormatResolveForTests } from './live-format-resolve'
import { LiveTvPlayer } from './live-tv-player'
import { __setHlsPlaylistProxyForTests, hlsPlaylistProxyUrl } from './hls-playlist-proxy'

const TS = 'http://tv.kkz.test:8080/live/u/p/8171.ts'
const HLS = 'http://tv.kkz.test:8080/live/u/p/8171.m3u8'
const channel = { name: 'V Sport', logo: null, group: 'Sport', url: TS, tvgId: null }

const opens = () => surfaceCalls.filter((c) => c.startsWith('mpv:open:')).map((c) => c.slice('mpv:open:'.length))

async function flush(ms = 0): Promise<void> {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms) })
}

beforeEach(() => {
  __resetForTests()
  __resetHlsFailuresForTests()
  __resetLiveFormatResolveForTests()
  surfaceCalls.length = 0
  vi.useFakeTimers()
  vi.stubGlobal('fetch', (() => Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as unknown as Response)) as typeof fetch)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  __setHlsPlaylistProxyForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'xtream_logins', [{ id: 'login-1', base: 'http://tv.kkz.test:8080', username: 'u', password: 'p', format: 'ts', categoryIds: [], allowedFormats: ['m3u8', 'ts', 'rtmp'] }])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ id: 'x1', name: 'tv.kkz.test:8080', kind: 'xtream', source: 'xtream://tv.kkz.test:8080/login-1', xtreamLoginId: 'login-1', createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }])
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); __setHlsPlaylistProxyForTests(null) })

describe('LiveTvPlayer: liveformat', () => {
  it('Auto + konto med m3u8 → HLS; ingen start → samma kanal som TS, sedan proxyn', async () => {
    render(<LiveTvPlayer channel={channel} onClose={() => {}} />)
    await flush()
    // HLS går genom appens spellisteproxy, med panelens ursprungliga .m3u8.
    const viaProxy = hlsPlaylistProxyUrl(window.location.origin, HLS)
    expect(opens()).toEqual([viaProxy])

    await flush(9_000)
    expect(hasHlsFailed(TS)).toBe(true)
    expect(opens()).toEqual([viaProxy, TS])

    await flush(9_000)
    const third = opens()[2]
    expect(third).toContain('/api/m3u?stream=')
    expect(decodeURIComponent(third)).toContain(TS)
  })

  it('appen utan spellisteproxy: Auto öppnar TS direkt', async () => {
    __setHlsPlaylistProxyForTests(false)
    render(<LiveTvPlayer channel={channel} onClose={() => {}} />)
    await flush()
    expect(opens()).toEqual([TS])
  })

  it('uttryckligt TS på listan → kanalens egen URL direkt', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ id: 'x1', name: 'tv.kkz.test:8080', kind: 'xtream', source: 'xtream://tv.kkz.test:8080/login-1', xtreamLoginId: 'login-1', createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null, liveFormat: 'ts' }])
    render(<LiveTvPlayer channel={channel} onClose={() => {}} />)
    await flush()
    expect(opens()).toEqual([TS])
  })
})
