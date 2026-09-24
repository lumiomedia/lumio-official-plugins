import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetForTests, getPluginMemoryCache, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, updateLiveTvListCuration, type LiveTvList } from './live-tv-data'
import { __resetLiveTvModelForTests, channelsCacheKey, curationForSource, loadChannelsShared } from './live-tv-model'

const SOURCE = 'http://x/p.m3u'
const list: LiveTvList = {
  id: 'l1', name: 'Lista', createdAt: '2026-01-01', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null,
  kind: 'm3u', source: SOURCE, url: SOURCE,
  curation: { hidden: ['News'], merges: [{ name: 'Sport', groups: ['UK Sport'] }] },
}
const ITEMS = [
  { name: 'a', group: 'UK Sport', url: 'http://x/a', tvgId: null, logo: null, key: 'a::http://x/a', number: 1, tvgIdResolved: null },
  { name: 'b', group: 'News', url: 'http://x/b', tvgId: null, logo: null, key: 'b::http://x/b', number: 2, tvgIdResolved: null },
]

beforeEach(() => {
  __resetForTests()
  __resetLiveTvModelForTests()
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  // Bootstrapen: migreringen är gjord, och källan FINNS i indexet — annars
  // startar importMissingSources ett importjobb och väntar på det.
  writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_storage_v2_migrated', true)
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    ok: true,
    status: 200,
    json: async () => (String(url).includes('/api/live-tv/status')
      ? { sources: [{ id: SOURCE, channels: ITEMS.length, updatedAt: 1 }] }
      : { items: ITEMS, total: ITEMS.length, known: true }),
  })))
})
afterEach(() => vi.unstubAllGlobals())

describe('kuratering i modellen', () => {
  it('första listan för källan ger kurateringen', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list, { ...list, id: 'l2', curation: undefined }])
    expect(curationForSource(SOURCE)?.hidden).toEqual(['News'])
  })
  it('tillämpas när kanalerna laddas och hamnar kuraterade i cachen', async () => {
    const items = await loadChannelsShared(SOURCE)
    expect(items.map((c) => `${c.name}:${c.group}`)).toEqual(['a:Sport'])
    expect(getPluginMemoryCache<unknown[]>(LIVE_TV_PLUGIN_ID, channelsCacheKey(SOURCE))).toHaveLength(1)
  })
  it('sparad kuratering nollställer källans cache och "alla"', async () => {
    await loadChannelsShared(SOURCE)
    updateLiveTvListCuration('l1', undefined)
    expect(getPluginMemoryCache(LIVE_TV_PLUGIN_ID, channelsCacheKey(SOURCE))).toBeUndefined()
    expect(getPluginMemoryCache(LIVE_TV_PLUGIN_ID, channelsCacheKey(null))).toBeUndefined()
    const items = await loadChannelsShared(SOURCE)
    expect(items).toHaveLength(2)
  })
})
