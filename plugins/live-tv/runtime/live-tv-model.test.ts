import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from './live-tv-data'
import { useLiveTvModel } from './live-tv-model'

vi.mock('./hooks/useLiveTvEpgCache', () => ({ useLiveTvEpgCache: vi.fn(() => null) }))

const ch = (name: string, group: string) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId: null })
const lists: LiveTvList[] = [
  { id: 'l1', name: 'Xtream', channels: [ch('A', 'Sport'), ch('B', 'Sport')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null },
  { id: 'l2', name: 'Nordic', channels: [ch('C', 'News')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null },
]

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
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
})
