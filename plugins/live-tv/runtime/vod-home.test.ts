import { describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/plugin-sdk', async (orig) => ({ ...(await orig<object>()), fetchLibraryStatus: vi.fn() }))
import { fetchLibraryStatus } from '@/lib/plugin-sdk'
import { hasVodIndex, markVodHomeRedirect, shouldRedirectToVodHome, vodHomeTarget } from './vod-home'

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
  it('fel i statusanropet = inget index', async () => {
    vi.mocked(fetchLibraryStatus).mockRejectedValueOnce(new Error('x'))
    expect(await hasVodIndex()).toBe(false)
  })
})

describe('omdirigering till Hem', () => {
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
