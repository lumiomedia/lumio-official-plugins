import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, getPluginMemoryCache, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from './live-tv-data'
import type { IndexChannel } from './index-client'
import type { NowNextLater } from './epg/types'

/**
 * Modellen v2 pratar BARA med appen genom `index-client` (spec 4.2), så det är
 * den modulen som mockas här — inte `fetch`. Då syns exakt vad modellen ber om:
 * vilken källa som laddas, när uppslaget för favoriter utanför källan görs, och
 * att EPG:t hämtas om bara när appens `fetchedAt` är gammal.
 */
vi.mock('./index-client', () => ({
  INDEX_CHANGED_EVENT: 'lumio-live-tv-index-changed',
  emitIndexChanged: vi.fn(),
  onIndexChanged: vi.fn(() => () => {}),
  loadAllChannels: vi.fn(async () => [] as IndexChannel[]),
  lookupChannels: vi.fn(async () => [] as IndexChannel[]),
  queryChannels: vi.fn(async () => ({ items: [], total: 0, known: true })),
  searchChannels: vi.fn(async () => []),
  listGroups: vi.fn(async () => []),
  indexStatus: vi.fn(async () => ({ sources: ['s1', 's2'] })),
  batchChannels: vi.fn(async () => {}),
  startImport: vi.fn(async () => 'job'),
  importStatus: vi.fn(async () => ({ state: 'done', received: 0 })),
  waitForJob: vi.fn(async () => ({ state: 'done', received: 0 })),
  refreshEpg: vi.fn(async () => 'epg-job'),
  epgNow: vi.fn(async () => ({ at: Date.now(), fetchedAt: Date.now(), items: {} as Record<string, NowNextLater> })),
  epgSchedule: vi.fn(async () => ({})),
  epgSearch: vi.fn(async () => []),
}))

import { epgNow, loadAllChannels, lookupChannels, refreshEpg, waitForJob } from './index-client'
import { __resetLiveTvModelForTests, useLiveTvModel } from './live-tv-model'
import { __resetScheduleCacheForTests } from './epg/schedule-cache'
import { __resetNowSnapshotForTests } from './epg/now-snapshot'
import { __resetChannelResolverForTests } from './channel-resolver'
import { ACTIVE_PLAYLIST_KEY } from './tv/tv-settings-store'

const ch = (name: string, group: string, number: number): IndexChannel => ({
  name,
  logo: null,
  group,
  url: `http://x/${name}`,
  tvgId: null,
  key: `${name}::http://x/${name}`,
  number,
  tvgIdResolved: null,
})

const A = ch('A', 'Sport', 1)
const B = ch('B', 'Sport', 2)
const C = ch('C', 'News', 1)

const lists: LiveTvList[] = [
  { id: 'l1', name: 'Xtream', kind: 'm3u', source: 's1', createdAt: '', urlTvg: 'http://epg/1.xml', epgUrls: [], autoEpgDisabled: false, fetchedAt: null, channelCount: 2, groups: [] },
  { id: 'l2', name: 'Nordic', kind: 'm3u', source: 's2', createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null, channelCount: 1, groups: [] },
]

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __resetLiveTvModelForTests()
  __resetScheduleCacheForTests()
  __resetNowSnapshotForTests()
  __resetChannelResolverForTests()
  vi.clearAllMocks()
  // Spellistfiltret är ett TV-begrepp: modellen tillämpar det bara i TV-läge.
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', lists)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', ['C::http://x/C', 'A::http://x/A'])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_storage_v2_migrated', true)
  vi.mocked(loadAllChannels).mockImplementation(async (source) =>
    source === 's2' ? [C] : source === 's1' ? [A, B] : [A, B, C],
  )
  vi.mocked(epgNow).mockResolvedValue({ at: Date.now(), fetchedAt: Date.now(), items: {} })
})

describe('useLiveTvModel: kanaler ur indexet', () => {
  it('laddar hela indexet till minnescachen och växlar channelsLoading', async () => {
    const { result } = renderHook(() => useLiveTvModel())
    expect(result.current.channelsLoading).toBe(true)
    await waitFor(() => expect(result.current.channelsLoading).toBe(false))

    expect(loadAllChannels).toHaveBeenCalledWith(null)
    expect(result.current.channels.map((c) => c.name)).toEqual(['A', 'B', 'C'])
    expect(getPluginMemoryCache(LIVE_TV_PLUGIN_ID, 'channels:all')).toHaveLength(3)
  })

  it('en andra modell läser minnescachen i stället för att ladda om', async () => {
    const first = renderHook(() => useLiveTvModel())
    await waitFor(() => expect(first.result.current.channelsLoading).toBe(false))
    first.unmount()
    vi.mocked(loadAllChannels).mockClear()

    const { result } = renderHook(() => useLiveTvModel())
    // Cachen svarar synkront: inga kanaler saknas medan omladdningen pågår.
    expect(result.current.channelsLoading).toBe(false)
    expect(result.current.channels.map((c) => c.name)).toEqual(['A', 'B', 'C'])
  })

  it('spellistbyte laddar om från den listans källa och numrerar ur indexet', async () => {
    const { result } = renderHook(() => useLiveTvModel())
    await waitFor(() => expect(result.current.channelsLoading).toBe(false))
    // Utan aktiv källa är numret platsen i den laddade listan.
    expect(result.current.channelNumber(result.current.channels[2])).toBe(3)

    await act(async () => result.current.setActivePlaylist('l2'))
    await waitFor(() => expect(result.current.channels.map((c) => c.name)).toEqual(['C']))
    expect(loadAllChannels).toHaveBeenCalledWith('s2')
    expect(result.current.activePlaylistName).toBe('Nordic')
    // Med aktiv källa kommer numret ur indexet (C är nummer 1 i sin källa).
    expect(result.current.channelNumber(result.current.channels[0])).toBe(1)
  })

  it('favoriter utanför den laddade källan slås upp mot indexet', async () => {
    vi.mocked(lookupChannels).mockResolvedValue([C])
    writePluginJson(LIVE_TV_PLUGIN_ID, ACTIVE_PLAYLIST_KEY, 'l1')
    const { result } = renderHook(() => useLiveTvModel())
    await waitFor(() => expect(result.current.channels.map((c) => c.name)).toEqual(['A', 'B']))
    await waitFor(() => expect(result.current.favouriteChannels.map((c) => c.name)).toEqual(['C', 'A']))
    expect(lookupChannels).toHaveBeenCalledWith(['C::http://x/C'])
  })

  it('utanför TV-läget ignoreras ett sparat spellistval helt', async () => {
    // Skrivbordet och mobilen har ingen ratt för aktiv spellista. Ett val som
    // blivit kvar i lagringen klippte ändå deras kanallista till en enda
    // spellista, utan förklaring och utan väg tillbaka.
    writePluginJson(LIVE_TV_PLUGIN_ID, ACTIVE_PLAYLIST_KEY, 'l2')
    __setTvModeForTests(false)
    const { result } = renderHook(() => useLiveTvModel())
    await waitFor(() => expect(result.current.channelsLoading).toBe(false))
    expect(result.current.channels.map((c) => c.name)).toEqual(['A', 'B', 'C'])
    expect(result.current.byKey.size).toBe(3)
    expect(result.current.groups).toEqual(['Sport', 'News'])
    expect(result.current.activePlaylistId).toBeNull()
    expect(loadAllChannels).toHaveBeenCalledWith(null)
  })
})

describe('useLiveTvModel: EPG ur appen', () => {
  it('nowFor läser nu-snapshotet', async () => {
    const programme = { title: 'Matchen', start: Date.now() - 1000, stop: Date.now() + 1000 }
    vi.mocked(epgNow).mockResolvedValue({
      at: Date.now(),
      fetchedAt: Date.now(),
      items: { 'A::http://x/A': { now: programme, next: null, later: null } },
    })
    const { result } = renderHook(() => useLiveTvModel())
    await waitFor(() => expect(result.current.hasEpg).toBe(true))
    expect(result.current.nowFor(A).now?.title).toBe('Matchen')
    expect(result.current.nowFor(B).now).toBeNull()
    expect(result.current.epgFetchedAt).not.toBeNull()
  })

  it('ber appen hämta om EPG:t när den aldrig hämtat, och läser om snapshotet', async () => {
    const fresh = { title: 'Nyheterna', start: Date.now() - 1000, stop: Date.now() + 1000 }
    vi.mocked(epgNow)
      .mockResolvedValueOnce({ at: Date.now(), fetchedAt: null, items: {} })
      .mockResolvedValue({
        at: Date.now(),
        fetchedAt: Date.now(),
        items: { 'A::http://x/A': { now: fresh, next: null, later: null } },
      })
    const { result } = renderHook(() => useLiveTvModel())
    await waitFor(() => expect(refreshEpg).toHaveBeenCalledWith('global', ['http://epg/1.xml'], ['s1', 's2']))
    expect(waitForJob).toHaveBeenCalledWith('epg-job')
    await waitFor(() => expect(result.current.nowFor(A).now?.title).toBe('Nyheterna'))
  })

  it('hämtar inte om när appens EPG är färskt', async () => {
    vi.mocked(epgNow).mockResolvedValue({ at: Date.now(), fetchedAt: Date.now() - 60_000, items: {} })
    const { result } = renderHook(() => useLiveTvModel())
    await waitFor(() => expect(result.current.epgLoading).toBe(false))
    expect(refreshEpg).not.toHaveBeenCalled()
  })
})
