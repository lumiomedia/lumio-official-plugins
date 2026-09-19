import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetPluginStorageForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from './live-tv-data'
import type { VodEpisode, VodItem } from './vod-client'

const queryVod = vi.fn()
const fetchVodEpisodes = vi.fn()

vi.mock('./vod-client', async () => {
  const actual = await vi.importActual<typeof import('./vod-client')>('./vod-client')
  return {
    ...actual,
    queryVod: (...args: unknown[]) => queryVod(...args),
    fetchVodEpisodes: (...args: unknown[]) => fetchVodEpisodes(...args),
  }
})

const { getVodStreams } = await import('./vod-streams')

const SOURCE_A = 'xtream://panel-a/login-a'
const SOURCE_B = 'xtream://panel-b/login-b'

function list(id: string, source: string, loginId: string): LiveTvList {
  return {
    id,
    name: source,
    kind: 'xtream',
    source,
    xtreamLoginId: loginId,
    channels: [],
    createdAt: '',
    urlTvg: null,
    epgUrls: [],
    autoEpgDisabled: false,
    fetchedAt: null,
  }
}

function movie(overrides: Partial<VodItem> = {}): VodItem {
  return {
    key: 'vod:1',
    kind: 'movie',
    title: 'Dune',
    categoryId: '5',
    categoryName: 'MOVIE: Swedish',
    tmdbId: 438631,
    url: 'http://panel-a/movie/u/p/1.mkv',
    ...overrides,
  }
}

function episode(season: number, ep: number): VodEpisode {
  return { season, episode: ep, title: `S${season}E${ep}`, url: `http://panel-a/series/u/p/${season}${ep}.mkv` }
}

const EMPTY = { items: [], total: 0, known: true }

afterEach(() => vi.clearAllMocks())
beforeEach(() => {
  __resetPluginStorageForTests?.()
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list('l1', SOURCE_A, 'login-a'), list('l2', SOURCE_B, 'login-b')])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'xtream_logins', [
    { id: 'login-a', base: 'http://panel-a', username: 'u', password: 'p', format: 'ts', categoryIds: [] },
    { id: 'login-b', base: 'http://panel-b', username: 'u2', password: 'p2', format: 'ts', categoryIds: [] },
  ])
})

describe('getVodStreams', () => {
  it('hittar filmen på tmdb-id och svarar med panelens URL', async () => {
    queryVod.mockResolvedValue({ items: [movie()], total: 1, known: true })
    const streams = await getVodStreams({ mediaType: 'movie', tmdbId: '438631' })
    expect(streams).toHaveLength(1)
    expect(streams[0].directUrl).toBe('http://panel-a/movie/u/p/1.mkv')
    // Uppslaget går på id:t, aldrig på titeln — ingen gissning.
    expect(queryVod).toHaveBeenCalledWith(expect.objectContaining({ tmdbId: 438631, kind: 'movie' }))
  })

  it('letar vidare i nästa panel när den första inte har titeln', async () => {
    queryVod
      .mockResolvedValueOnce(EMPTY)
      .mockResolvedValueOnce({ items: [movie({ url: 'http://panel-b/movie/u2/p2/9.mp4' })], total: 1, known: true })
    const streams = await getVodStreams({ mediaType: 'movie', tmdbId: '438631' })
    expect(streams[0].directUrl).toBe('http://panel-b/movie/u2/p2/9.mp4')
    expect(queryVod).toHaveBeenCalledTimes(2)
  })

  it('svarar tomt när ingen panel har titeln', async () => {
    queryVod.mockResolvedValue(EMPTY)
    expect(await getVodStreams({ mediaType: 'movie', tmdbId: '111' })).toEqual([])
  })

  it('frågar inte panelen alls utan tmdb-id', async () => {
    expect(await getVodStreams({ mediaType: 'movie', tmdbId: null })).toEqual([])
    expect(await getVodStreams({ mediaType: 'movie', tmdbId: '0' })).toEqual([])
    expect(await getVodStreams({ mediaType: 'movie', tmdbId: 'inte-ett-tal' })).toEqual([])
    expect(queryVod).not.toHaveBeenCalled()
  })

  it('en panel som felar tar inte ner uppslaget', async () => {
    queryVod
      .mockRejectedValueOnce(new Error('/api/live-tv/vod/query returned 500'))
      .mockResolvedValueOnce({ items: [movie()], total: 1, known: true })
    const streams = await getVodStreams({ mediaType: 'movie', tmdbId: '438631' })
    expect(streams).toHaveLength(1)
  })

  it('plockar rätt avsnitt ur serien', async () => {
    queryVod.mockResolvedValue({
      items: [movie({ key: 'series:7', kind: 'series', seriesId: 7, url: undefined, tmdbId: 1396 })],
      total: 1,
      known: true,
    })
    fetchVodEpisodes.mockResolvedValue([episode(1, 1), episode(1, 2), episode(2, 1)])
    const streams = await getVodStreams({ mediaType: 'tv', tmdbId: '1396', season: 1, episode: 2 })
    expect(streams).toHaveLength(1)
    expect(streams[0].directUrl).toBe('http://panel-a/series/u/p/12.mkv')
    // Avsnitten hämtas med KÄLLANS egen inloggning, inte den andra panelens.
    expect(fetchVodEpisodes).toHaveBeenCalledWith(
      SOURCE_A,
      7,
      expect.objectContaining({ base: 'http://panel-a', username: 'u' }),
    )
  })

  it('hämtar inga avsnitt alls utan säsong och avsnitt', async () => {
    const streams = await getVodStreams({ mediaType: 'tv', tmdbId: '1396' })
    expect(streams).toEqual([])
    // Serien har ingen ström i sig — att hämta 200 avsnitt för ingenting vore
    // ett bortkastat panelanrop.
    expect(fetchVodEpisodes).not.toHaveBeenCalled()
    expect(queryVod).not.toHaveBeenCalled()
  })

  it('svarar tomt när panelen saknar just det avsnittet', async () => {
    queryVod.mockResolvedValue({
      items: [movie({ key: 'series:7', kind: 'series', seriesId: 7, url: undefined, tmdbId: 1396 })],
      total: 1,
      known: true,
    })
    fetchVodEpisodes.mockResolvedValue([episode(1, 1)])
    expect(await getVodStreams({ mediaType: 'tv', tmdbId: '1396', season: 9, episode: 9 })).toEqual([])
  })

  it('struntar i spellistor som inte är Xtream', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ ...list('l3', 'http://x.m3u', ''), kind: 'm3u' }])
    expect(await getVodStreams({ mediaType: 'movie', tmdbId: '438631' })).toEqual([])
    expect(queryVod).not.toHaveBeenCalled()
  })
})
