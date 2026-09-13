import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as sdk from '@/lib/plugin-sdk'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, getLiveTvLists, type LiveTvList } from './live-tv-data'
import { migrateStorageV2, isStorageV2Migrated } from './storage-v2-migration'
import * as indexClient from './index-client'

function ch(name: string, group = 'Other') {
  return { name, logo: null, group, url: `http://x/${name}`, tvgId: null }
}

function rawList(overrides: Partial<LiveTvList> & { id: string; name: string }): LiveTvList {
  return {
    createdAt: '',
    urlTvg: null,
    epgUrls: [],
    autoEpgDisabled: false,
    fetchedAt: null,
    channels: [],
    ...overrides,
  } as LiveTvList
}

beforeEach(() => {
  __resetForTests()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('migrateStorageV2', () => {
  it('batches each list with embedded channels to the index and strips them from storage', async () => {
    const batchSpy = vi.spyOn(indexClient, 'batchChannels').mockResolvedValue(undefined)
    const removeSpy = vi.spyOn(sdk, 'removePluginStorageByPrefix')

    const listA = rawList({ id: 'a', name: 'A', kind: 'm3u', source: 'http://a.tld/list.m3u', url: 'http://a.tld/list.m3u', channels: [ch('One', 'Sport'), ch('Two', 'Sport')] })
    const listB = rawList({ id: 'b', name: 'B', kind: 'xtream', source: 'xtream://b.tld/login1', xtreamLoginId: 'login1', channels: [ch('Three', 'News')] })
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [listA, listB])

    const result = await migrateStorageV2()

    expect(result.migrated).toBe(2)
    expect(batchSpy).toHaveBeenCalledTimes(2)
    expect(batchSpy).toHaveBeenNthCalledWith(
      1,
      'http://a.tld/list.m3u',
      [
        { name: 'One', logo: null, group: 'Sport', url: 'http://x/One', tvgId: null, key: 'One::http://x/One', number: 1 },
        { name: 'Two', logo: null, group: 'Sport', url: 'http://x/Two', tvgId: null, key: 'Two::http://x/Two', number: 2 },
      ],
      true,
    )
    expect(batchSpy).toHaveBeenNthCalledWith(
      2,
      'xtream://b.tld/login1',
      [{ name: 'Three', logo: null, group: 'News', url: 'http://x/Three', tvgId: null, key: 'Three::http://x/Three', number: 1 }],
      true,
    )

    const stored = getLiveTvLists()
    const a = stored.find((l) => l.id === 'a')
    const b = stored.find((l) => l.id === 'b')
    expect(a?.channels).toEqual([])
    expect(a?.channelCount).toBe(2)
    expect(a?.groups).toEqual([{ name: 'Sport', count: 2 }])
    expect(b?.channelCount).toBe(1)

    expect(removeSpy).toHaveBeenCalledWith(LIVE_TV_PLUGIN_ID, 'channels:')
    expect(isStorageV2Migrated()).toBe(true)
  })

  it('leaves lists without embedded channels untouched and does not migrate custom lists', async () => {
    const batchSpy = vi.spyOn(indexClient, 'batchChannels').mockResolvedValue(undefined)

    const empty = rawList({ id: 'empty', name: 'Empty', kind: 'm3u', source: 'http://empty.tld/list.m3u', url: 'http://empty.tld/list.m3u', channels: [] })
    const custom = rawList({ id: 'custom', name: 'My list', kind: 'custom', source: 'custom:custom', channels: [ch('Four')] })
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [empty, custom])

    const result = await migrateStorageV2()

    expect(result.migrated).toBe(0)
    expect(batchSpy).not.toHaveBeenCalled()
    const stored = getLiveTvLists()
    expect(stored.find((l) => l.id === 'custom')?.channels).toEqual([ch('Four')])
  })

  it('is a no-op on a second run', async () => {
    const batchSpy = vi.spyOn(indexClient, 'batchChannels').mockResolvedValue(undefined)
    const listA = rawList({ id: 'a', name: 'A', kind: 'm3u', source: 'http://a.tld/list.m3u', url: 'http://a.tld/list.m3u', channels: [ch('One')] })
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [listA])

    await migrateStorageV2()
    batchSpy.mockClear()
    const second = await migrateStorageV2()

    expect(second.migrated).toBe(0)
    expect(batchSpy).not.toHaveBeenCalled()
  })
})
