import { beforeEach, describe, expect, it } from 'vitest'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { getLiveTvLists, renameLiveTvList, type LiveTvList } from './live-tv-data'
import { playlistTitle } from './playlist-title'

const PLUGIN = 'com.lumio.live-tv'

function seed(lists: Array<Partial<LiveTvList> & { id: string; name: string }>, logins: Array<{ id: string; base: string; username: string; password: string }> = []) {
  writePluginJson(PLUGIN, 'xtream_logins', logins)
  writePluginJson(PLUGIN, 'lists', lists.map((l) => ({ createdAt: '', urlTvg: null, epgUrls: [], ...l })))
}

describe('playlistTitle', () => {
  beforeEach(() => __resetForTests())

  it('två konton på samma server skiljs åt med användarnamnet', () => {
    seed(
      [
        { id: 'a', name: 'live.flixnest.app', kind: 'xtream', source: 'xtream://a', xtreamLoginId: 'la' },
        { id: 'b', name: 'live.flixnest.app', kind: 'xtream', source: 'xtream://b', xtreamLoginId: 'lb' },
      ],
      [
        { id: 'la', base: 'http://live.flixnest.app', username: 'jerry', password: 'x' },
        { id: 'lb', base: 'http://live.flixnest.app', username: 'oskar', password: 'y' },
      ],
    )
    const lists = getLiveTvLists()
    expect(lists.map((l) => playlistTitle(l, lists))).toEqual(['live.flixnest.app · jerry', 'live.flixnest.app · oskar'])
  })

  it('ett eget namn vinner och sparas', () => {
    seed([{ id: 'a', name: 'live.flixnest.app', kind: 'xtream', source: 'xtream://a', xtreamLoginId: 'la' }])
    renameLiveTvList('a', '  Sport  ')
    const lists = getLiveTvLists()
    expect(lists[0]!.label).toBe('Sport')
    expect(playlistTitle(lists[0]!, lists)).toBe('Sport')
    renameLiveTvList('a', '')
    const after = getLiveTvLists()
    expect(after[0]!.label).toBeUndefined()
    expect(playlistTitle(after[0]!, after)).toBe('live.flixnest.app')
  })

  it('en ensam lista visar bara värden', () => {
    seed([{ id: 'a', name: 'x', kind: 'm3u', source: 'http://iptv.test/list.m3u', url: 'http://iptv.test/list.m3u' }])
    const lists = getLiveTvLists()
    expect(playlistTitle(lists[0]!, lists)).toBe('iptv.test')
  })
})
