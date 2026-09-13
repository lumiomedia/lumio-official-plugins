import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from './live-tv-data'
import { useLiveTvModel } from './live-tv-model'
import { ACTIVE_PLAYLIST_KEY } from './tv/tv-settings-store'

vi.mock('./hooks/useLiveTvEpgCache', () => ({ useLiveTvEpgCache: vi.fn(() => null) }))

const ch = (name: string, group: string) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId: null })
const lists: LiveTvList[] = [
  { id: 'l1', name: 'Xtream', channels: [ch('A', 'Sport'), ch('B', 'Sport')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null },
  { id: 'l2', name: 'Nordic', channels: [ch('C', 'News')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null },
]

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  // Spellistfiltret är ett TV-begrepp: modellen tillämpar det bara i TV-läge.
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', lists)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', ['C::http://x/C', 'A::http://x/A'])
})

describe('useLiveTvModel spellistor', () => {
  it('slår ihop alla listor som standard och numrerar', () => {
    const { result } = renderHook(() => useLiveTvModel())
    expect(result.current.playlists.map((p) => p.count)).toEqual([2, 1])
    expect(result.current.channels.map((c) => c.name)).toEqual(['A', 'B', 'C'])
    expect(result.current.channelNumber(result.current.channels[2])).toBe(3)
  })
  it('filtrerar på aktiv spellista men behåller favoriter', () => {
    const { result } = renderHook(() => useLiveTvModel())
    act(() => result.current.setActivePlaylist('l2'))
    expect(result.current.channels.map((c) => c.name)).toEqual(['C'])
    expect(result.current.activePlaylistName).toBe('Nordic')
    expect(result.current.favouriteChannels.map((c) => c.name)).toEqual(['C', 'A'])
  })
  it('utanför TV-läget ignoreras ett sparat spellistval helt', () => {
    // Skrivbordet och mobilen har ingen ratt för aktiv spellista. Ett val som
    // blivit kvar i lagringen klippte ändå deras kanallista till en enda
    // spellista, utan förklaring och utan väg tillbaka.
    writePluginJson(LIVE_TV_PLUGIN_ID, ACTIVE_PLAYLIST_KEY, 'l2')
    __setTvModeForTests(false)
    const { result } = renderHook(() => useLiveTvModel())
    expect(result.current.channels.map((c) => c.name)).toEqual(['A', 'B', 'C'])
    expect(result.current.byKey.size).toBe(3)
    expect(result.current.groups).toEqual(['Sport', 'News'])
    expect(result.current.activePlaylistId).toBeNull()
    expect(result.current.activePlaylistName).toBeNull()
  })
  it('i TV-läget gäller samma sparade val', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, ACTIVE_PLAYLIST_KEY, 'l2')
    __setTvModeForTests(true)
    const { result } = renderHook(() => useLiveTvModel())
    expect(result.current.channels.map((c) => c.name)).toEqual(['C'])
    expect(result.current.activePlaylistId).toBe('l2')
  })
})
