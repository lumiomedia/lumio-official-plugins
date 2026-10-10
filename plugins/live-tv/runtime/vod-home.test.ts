import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/plugin-sdk', async (orig) => ({ ...(await orig<object>()), fetchLibraryStatus: vi.fn() }))
import { fetchLibraryStatus } from '@/lib/plugin-sdk'
import { resetVodHomeRedirectForTests, hasVodIndex, markVodHomeRedirect, shouldRedirectToVodHome, vodHiddenForActivePlaylist, vodHomeTarget } from './vod-home'
import { setVodMode } from './vod-data'

describe('vod-home', () => {
  it('målet är kärnans biblioteksvy med ram och Kanaler som reserv', () => {
    expect(vodHomeTarget()).toEqual({ pageId: 'library', params: { provider: 'xtream-vod', frame: 'live-tv', fallbackPageId: 'live-tv-browse' } })
  })
  it('index finns bara när en xtream-vod-källa har lastFullSync', async () => {
    vi.mocked(fetchLibraryStatus).mockResolvedValueOnce({ sources: [{ id: 'xtream-vod:a', lastFullSync: null }, { id: 'plex', lastFullSync: 5 }] } as never)
    expect(await hasVodIndex()).toBe(false)
    vi.mocked(fetchLibraryStatus).mockResolvedValueOnce({ sources: [{ id: 'xtream-vod:a', lastFullSync: 5 }] } as never)
    expect(await hasVodIndex()).toBe(true)
  })
  it('statusanrop som aldrig svarar = inget index efter tidsgränsen', async () => {
    vi.useFakeTimers()
    try {
      vi.mocked(fetchLibraryStatus).mockReturnValueOnce(new Promise(() => {}) as never)
      const result = hasVodIndex()
      await vi.advanceTimersByTimeAsync(1500)
      expect(await result).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })
  it('VOD-läget off döljer Hem för den aktiva spellistan', () => {
    setVodMode(null, 'off')
    expect(vodHiddenForActivePlaylist()).toBe(true)
    setVodMode(null, 'link')
    expect(vodHiddenForActivePlaylist()).toBe(false)
  })
  it('fel i statusanropet = inget index', async () => {
    vi.mocked(fetchLibraryStatus).mockRejectedValueOnce(new Error('x'))
    expect(await hasVodIndex()).toBe(false)
  })
})

describe('omdirigering till Hem', () => {
  afterEach(() => resetVodHomeRedirectForTests())
  it('bara utan params', () => {
    expect(shouldRedirectToVodHome(undefined, 100_000)).toBe(true)
    expect(shouldRedirectToVodHome({}, 100_000)).toBe(true)
    expect(shouldRedirectToVodHome({ view: 'hub' }, 100_000)).toBe(false)
    expect(shouldRedirectToVodHome({ url: 'x' }, 100_000)).toBe(false)
  })
  it('högst en gång per 10 s', () => {
    markVodHomeRedirect(200_000)
    expect(shouldRedirectToVodHome(undefined, 205_000)).toBe(false)
    expect(shouldRedirectToVodHome(undefined, 211_000)).toBe(true)
  })
})
