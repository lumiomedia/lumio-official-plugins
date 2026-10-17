import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetForTests, readPluginJson, writePluginJson } from '@/lib/plugin-sdk'
import {
  LIVE_TV_PLUGIN_ID,
  __resetXtreamAccountCacheForTests,
  fetchXtreamAccount,
  getLiveTvListFormat,
  getLiveTvLists,
  getXtreamLogins,
  setLiveTvListFormat,
  type LiveTvList,
  type XtreamLogin,
} from './live-tv-data'
import {
  __resetHlsFailuresForTests,
  chooseLiveUrl,
  hasHlsFailed,
  nextLiveFormat,
  parseXtreamLiveUrl,
  sanitizeLiveFormat,
  withXtreamLiveExt,
} from './live-format'
import {
  __resetLiveFormatResolveForTests,
  autoFormatFor,
  fallBackToTs,
  redactLiveUrl,
  resolveLivePlayUrl,
  shouldFallBackToTs,
} from './live-format-resolve'
import { __setHlsPlaylistProxyForTests } from './hls-playlist-proxy'

const TS = 'http://tv.kkz.test:8080/live/u/p/8171.ts'
const HLS = 'http://tv.kkz.test:8080/live/u/p/8171.m3u8'

function list(overrides: Partial<LiveTvList> & { id: string; name: string }): LiveTvList {
  return { createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null, ...overrides } as LiveTvList
}
const login = (over: Partial<XtreamLogin> = {}): XtreamLogin => ({ id: 'login-1', base: 'http://tv.kkz.test:8080', username: 'u', password: 'p', format: 'ts', categoryIds: [], ...over })
const xtreamList = (over: Partial<LiveTvList> = {}) => list({ id: 'x1', name: 'tv.kkz.test:8080', kind: 'xtream', source: 'xtream://tv.kkz.test:8080/login-1', xtreamLoginId: 'login-1', ...over })
const m3uList = (over: Partial<LiveTvList> = {}) => list({ id: 'm1', name: 'tv.kkz.test:8080', kind: 'm3u', source: 'http://tv.kkz.test:8080/get.php?username=u&password=p&type=m3u_plus', url: 'http://tv.kkz.test:8080/get.php?username=u&password=p&type=m3u_plus', ...over })

describe('liveformatets rena delar', () => {
  it('tolkar Xtream-länkar och byter bara ändelsen', () => {
    expect(parseXtreamLiveUrl(TS)).toMatchObject({ origin: 'http://tv.kkz.test:8080', username: 'u', password: 'p', streamId: '8171', ext: 'ts' })
    expect(withXtreamLiveExt(TS, 'm3u8')).toBe(HLS)
    expect(withXtreamLiveExt(HLS, 'ts')).toBe(TS)
    expect(withXtreamLiveExt('http://h/live/a%20b/p/1.ts?x=1', 'm3u8')).toBe('http://h/live/a%20b/p/1.m3u8?x=1')
    // Catch-up, VOD och andra adresser är inga live-länkar.
    expect(parseXtreamLiveUrl('http://h/timeshift/u/p/60/2026-10-17:20-00/1.ts')).toBeNull()
    expect(parseXtreamLiveUrl('http://h/movie/u/p/1.mkv')).toBeNull()
    expect(parseXtreamLiveUrl('https://cdn.example/stream/index.m3u8')).toBeNull()
  })

  it('standard är Auto och valet stegar Auto → TS → HLS', () => {
    expect(sanitizeLiveFormat(undefined)).toBe('auto')
    expect(sanitizeLiveFormat('nonsense')).toBe('auto')
    expect(nextLiveFormat('auto')).toBe('ts')
    expect(nextLiveFormat('ts')).toBe('hls')
    expect(nextLiveFormat('hls')).toBe('auto')
  })

  it('Xtream Auto: HLS när kontot tillåter m3u8 och appens spellisteproxy finns, annars kanalens egen URL', () => {
    expect(chooseLiveUrl(TS, { kind: 'xtream', format: 'auto', allowedFormats: ['m3u8', 'ts', 'rtmp'], hlsProxy: true })).toBe(HLS)
    expect(chooseLiveUrl(TS, { kind: 'xtream', format: 'auto', allowedFormats: ['ts'], hlsProxy: true })).toBe(TS)
    expect(chooseLiveUrl(TS, { kind: 'xtream', format: 'auto', allowedFormats: [], hlsProxy: true })).toBe(TS)
    expect(chooseLiveUrl(TS, { kind: 'xtream', format: 'auto', allowedFormats: null, hlsProxy: true })).toBe(TS)
  })

  it('Xtream Auto utan appens spellisteproxy: alltid TS (rå HLS 509:ar på omladdningen)', () => {
    expect(chooseLiveUrl(TS, { kind: 'xtream', format: 'auto', allowedFormats: ['m3u8', 'ts'] })).toBe(TS)
    expect(chooseLiveUrl(TS, { kind: 'xtream', format: 'auto', allowedFormats: ['m3u8', 'ts'], hlsProxy: false })).toBe(TS)
    // En .m3u8 i indexet blir TS när kontot tillåter det.
    expect(chooseLiveUrl(HLS, { kind: 'xtream', format: 'auto', allowedFormats: ['m3u8', 'ts'] })).toBe(TS)
    expect(chooseLiveUrl(HLS, { kind: 'xtream', format: 'auto', allowedFormats: ['m3u8', 'ts'], hlsProxy: true })).toBe(HLS)
    // Uttryckligt HLS får försöka rå HLS även utan proxyn.
    expect(chooseLiveUrl(TS, { kind: 'xtream', format: 'hls', allowedFormats: ['m3u8'] })).toBe(HLS)
  })

  it('Xtream TS/HLS: det uttryckliga valet vinner', () => {
    expect(chooseLiveUrl(TS, { kind: 'xtream', format: 'ts', allowedFormats: ['m3u8', 'ts'] })).toBe(TS)
    expect(chooseLiveUrl(HLS, { kind: 'xtream', format: 'ts', allowedFormats: ['m3u8'] })).toBe(TS)
    expect(chooseLiveUrl(TS, { kind: 'xtream', format: 'hls', allowedFormats: null })).toBe(HLS)
  })

  it('M3U: orörd utom vid uttryckligt HLS på en Xtream-länk', () => {
    expect(chooseLiveUrl(TS, { kind: 'm3u', format: 'auto', allowedFormats: null })).toBe(TS)
    expect(chooseLiveUrl(TS, { kind: 'm3u', format: 'ts', allowedFormats: null })).toBe(TS)
    expect(chooseLiveUrl(TS, { kind: 'm3u', format: 'hls', allowedFormats: null })).toBe(HLS)
    expect(chooseLiveUrl('http://cdn.example/ch/1.ts', { kind: 'm3u', format: 'hls', allowedFormats: null })).toBe('http://cdn.example/ch/1.ts')
    expect(chooseLiveUrl(TS, { kind: null, format: 'hls', allowedFormats: null })).toBe(TS)
  })

  it('en kanal där HLS fallerat spelas med sin egen URL', () => {
    expect(chooseLiveUrl(TS, { kind: 'xtream', format: 'hls', allowedFormats: ['m3u8'], hlsFailed: true })).toBe(TS)
  })
})

describe('liveformatet mot lagringen', () => {
  const fetches: string[] = []
  beforeEach(() => {
    __resetForTests()
    __resetXtreamAccountCacheForTests()
    __resetHlsFailuresForTests()
    __resetLiveFormatResolveForTests()
    fetches.length = 0
    vi.stubGlobal('fetch', ((input: RequestInfo | URL) => {
      const raw = typeof input === 'string' ? input : String(input)
      fetches.push(raw)
      if (raw.includes('player_api.php')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ user_info: { auth: 1, status: 'Active', allowed_output_formats: ['m3u8', 'ts', 'rtmp'] } }) } as unknown as Response)
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as unknown as Response)
    }) as typeof fetch)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    __setHlsPlaylistProxyForTests(true)
  })
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); __setHlsPlaylistProxyForTests(null) })

  it('valet sparas per spellista; Auto lagras som frånvaro', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [xtreamList(), m3uList()])
    expect(getLiveTvListFormat(getLiveTvLists()[0])).toBe('auto')
    setLiveTvListFormat('x1', 'hls')
    expect(getLiveTvLists().find((l) => l.id === 'x1')?.liveFormat).toBe('hls')
    expect(getLiveTvLists().find((l) => l.id === 'm1')?.liveFormat).toBeUndefined()
    setLiveTvListFormat('x1', 'auto')
    const raw = readPluginJson<Record<string, unknown>[]>(LIVE_TV_PLUGIN_ID, 'lists', [])
    expect('liveFormat' in raw.find((l) => l.id === 'x1')!).toBe(false)
  })

  it('Xtream Auto med kända format → HLS; utan kända format → TS och ett enda bakgrundsuppslag som sparar dem', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [xtreamList()])
    writePluginJson(LIVE_TV_PLUGIN_ID, 'xtream_logins', [login()])
    expect(resolveLivePlayUrl(TS)).toBe(TS)
    expect(resolveLivePlayUrl(TS)).toBe(TS)
    await vi.waitFor(() => expect(getXtreamLogins()[0].allowedFormats).toEqual(['m3u8', 'ts', 'rtmp']))
    // Bara player_api — ingen strömanslutning — och bara en gång.
    expect(fetches.filter((u) => u.includes('player_api.php'))).toHaveLength(1)
    expect(fetches.some((u) => u.includes('/live/'))).toBe(false)
    expect(resolveLivePlayUrl(TS)).toBe(HLS)
    expect(autoFormatFor(getLiveTvLists()[0])).toBe('hls')
  })

  it('appen utan spellisteproxy → Auto blir TS även när kontot tillåter m3u8', () => {
    __setHlsPlaylistProxyForTests(false)
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [xtreamList()])
    writePluginJson(LIVE_TV_PLUGIN_ID, 'xtream_logins', [login({ allowedFormats: ['m3u8', 'ts'] })])
    expect(resolveLivePlayUrl(TS)).toBe(TS)
    expect(autoFormatFor(getLiveTvLists()[0])).toBe('ts')
    setLiveTvListFormat('x1', 'hls')
    expect(resolveLivePlayUrl(TS)).toBe(HLS)
  })

  it('panelen utan m3u8 → Auto blir TS; uttryckligt TS gäller oavsett', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [xtreamList()])
    writePluginJson(LIVE_TV_PLUGIN_ID, 'xtream_logins', [login({ allowedFormats: ['ts'] })])
    expect(resolveLivePlayUrl(TS)).toBe(TS)
    expect(autoFormatFor(getLiveTvLists()[0])).toBe('ts')
    writePluginJson(LIVE_TV_PLUGIN_ID, 'xtream_logins', [login({ allowedFormats: ['m3u8', 'ts'] })])
    setLiveTvListFormat('x1', 'ts')
    expect(resolveLivePlayUrl(TS)).toBe(TS)
    expect(fetches).toHaveLength(0)
  })

  it('M3U-listor: Auto lämnar adressen orörd, HLS skriver om Xtream-länken', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [m3uList()])
    expect(resolveLivePlayUrl(TS)).toBe(TS)
    setLiveTvListFormat('m1', 'hls')
    expect(resolveLivePlayUrl(TS)).toBe(HLS)
    expect(resolveLivePlayUrl('http://other.test/live/u/p/1.ts')).toBe('http://other.test/live/u/p/1.ts')
    expect(fetches).toHaveLength(0)
  })

  it('catch-up och okända adresser passerar orörda', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [xtreamList({ liveFormat: 'hls' })])
    writePluginJson(LIVE_TV_PLUGIN_ID, 'xtream_logins', [login({ allowedFormats: ['m3u8'] })])
    const timeshift = 'http://tv.kkz.test:8080/timeshift/u/p/60/2026-10-17:20-00/8171.ts'
    expect(resolveLivePlayUrl(timeshift)).toBe(timeshift)
  })

  it('reserven: HLS som föll ger TS för kanalen resten av sessionen, och loggen bär inget lösenord', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [xtreamList()])
    writePluginJson(LIVE_TV_PLUGIN_ID, 'xtream_logins', [login({ allowedFormats: ['m3u8', 'ts'] })])
    const play = resolveLivePlayUrl(TS)
    expect(play).toBe(HLS)
    expect(shouldFallBackToTs(TS, play, 0)).toBe(true)
    // Proxyförsöket och redan-HLS-kanaler faller inte tillbaka.
    expect(shouldFallBackToTs(TS, play, 1)).toBe(false)
    expect(shouldFallBackToTs(HLS, HLS, 0)).toBe(false)
    expect(shouldFallBackToTs(TS, TS, 0)).toBe(false)

    fallBackToTs(TS, 'no-start')
    expect(hasHlsFailed(TS)).toBe(true)
    expect(resolveLivePlayUrl(TS)).toBe(TS)
    expect(shouldFallBackToTs(TS, resolveLivePlayUrl(TS), 0)).toBe(false)
    const log = fetches.find((u) => u.startsWith('/api/debug-log'))
    expect(log).toBeDefined()
    expect(decodeURIComponent(log!)).toContain('HLS fallback → TS (no-start): tv.kkz.test:8080/live/…/8171.ts')
    expect(decodeURIComponent(log!)).not.toContain('/u/p/')
    expect(redactLiveUrl(TS)).toBe('tv.kkz.test:8080/live/…/8171.ts')
  })

  it('kontouppslaget sparar tillåtna format på den sparade inloggningen', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'xtream_logins', [login()])
    await fetchXtreamAccount(login())
    expect(getXtreamLogins()[0].allowedFormats).toEqual(['m3u8', 'ts', 'rtmp'])
  })
})
