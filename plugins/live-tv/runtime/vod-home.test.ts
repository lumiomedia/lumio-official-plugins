import { describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/plugin-sdk', async (orig) => ({ ...(await orig<object>()), fetchLibraryStatus: vi.fn() }))
import { fetchLibraryStatus } from '@/lib/plugin-sdk'
import { hasVodIndex, vodHomeTarget } from './vod-home'

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
