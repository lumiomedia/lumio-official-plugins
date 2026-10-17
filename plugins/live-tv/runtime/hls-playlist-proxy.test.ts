import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  __setHlsPlaylistProxyForTests,
  detectHlsPlaylistProxy,
  hasHlsPlaylistProxy,
  hlsPlaylistProxyUrl,
  isHlsPlaylistProxyUrl,
  nativeLiveOpenUrl,
} from './hls-playlist-proxy'

const HLS = 'http://tv.kkz.test:8080/live/u/p%40ss/8171.m3u8'
const ORIGIN = 'http://127.0.0.1:3011'

function stubAppInfo(body: unknown, ok = true) {
  const calls: string[] = []
  vi.stubGlobal('fetch', ((input: RequestInfo | URL) => {
    calls.push(String(input))
    return Promise.resolve({ ok, status: ok ? 200 : 500, json: async () => body } as unknown as Response)
  }) as typeof fetch)
  return calls
}

describe('appens spellisteproxy för HLS', () => {
  beforeEach(() => __setHlsPlaylistProxyForTests(null))
  afterEach(() => { vi.unstubAllGlobals(); __setHlsPlaylistProxyForTests(null) })

  it('känns av via /api/app-info → features, en gång', async () => {
    const calls = stubAppInfo({ version: '0.1.630', features: ['hlsPlaylistProxy'] })
    expect(hasHlsPlaylistProxy()).toBe(false) // okänt ännu → nej
    await expect(detectHlsPlaylistProxy()).resolves.toBe(true)
    expect(hasHlsPlaylistProxy()).toBe(true)
    await detectHlsPlaylistProxy()
    expect(calls).toEqual(['/api/app-info'])
  })

  it('äldre app utan features → ingen proxy', async () => {
    stubAppInfo({ version: '0.1.629' })
    await expect(detectHlsPlaylistProxy()).resolves.toBe(false)
    expect(hasHlsPlaylistProxy()).toBe(false)
  })

  it('ett misslyckat svar frågas om nästa gång', async () => {
    const calls = stubAppInfo({}, false)
    await expect(detectHlsPlaylistProxy()).resolves.toBe(false)
    stubAppInfo({ features: ['hlsPlaylistProxy'] })
    await expect(detectHlsPlaylistProxy()).resolves.toBe(true)
    expect(calls).toHaveLength(1)
  })

  it('proxyadressen bär den ursprungliga .m3u8 kodad', () => {
    const url = hlsPlaylistProxyUrl(ORIGIN, HLS)
    expect(url).toBe(`${ORIGIN}/api/live-tv/hls/playlist.m3u8?src=${encodeURIComponent(HLS)}`)
    expect(new URL(url).searchParams.get('src')).toBe(HLS)
    expect(isHlsPlaylistProxyUrl(url)).toBe(true)
  })

  it('nativemotorn öppnar bara Xtream-HLS genom proxyn, och bara när den finns', () => {
    __setHlsPlaylistProxyForTests(false)
    expect(nativeLiveOpenUrl(HLS, ORIGIN)).toBe(HLS)
    __setHlsPlaylistProxyForTests(true)
    expect(nativeLiveOpenUrl(HLS, ORIGIN)).toBe(hlsPlaylistProxyUrl(ORIGIN, HLS))
    const ts = 'http://tv.kkz.test:8080/live/u/p/8171.ts'
    expect(nativeLiveOpenUrl(ts, ORIGIN)).toBe(ts)
    const other = 'https://cdn.example/ch/index.m3u8'
    expect(nativeLiveOpenUrl(other, ORIGIN)).toBe(other)
    expect(nativeLiveOpenUrl(HLS, '')).toBe(HLS)
  })
})
