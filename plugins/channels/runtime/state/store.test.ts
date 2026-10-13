import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

const storage = new Map<string, unknown>()
vi.mock('@/lib/plugin-sdk', () => ({
  readPluginJson: (_id: string, key: string) => storage.get(key) ?? null,
  writePluginJson: (_id: string, key: string, value: unknown) => { storage.set(key, value) },
  onPluginStorageChanged: () => () => {},
  queryLibrary: async () => ({ items: [] }),
  getMovieWatchlist: () => [],
  getWatchlist: () => [],
  fetchLibraryStatus: async () => ({ updatedAt: 1 }),
  channelListDebridCloud: async () => [],
  channelResolveLibraryPlayback: async () => null,
  channelResolveTitleStream: async () => null,
  channelUnrestrictDebridFile: async () => null,
  hasChannelHost: () => true,
}))

import { deleteChannel, loadPoolCached, saveChannel, useChannelClock } from './store'
import { readChannels } from '../host'
import { createChannel, emptyDraft } from '../model/channel'

beforeEach(() => storage.clear())

describe('kanallagret', () => {
  it('sparar, ersätter och tar bort kanaler', () => {
    const a = createChannel({ ...emptyDraft(), name: 'A' }, [], 1, () => 0.1)
    saveChannel(a)
    saveChannel({ ...a, name: 'A2' })
    expect(readChannels().map((c) => c.name)).toEqual(['A2'])
    deleteChannel(a.id)
    expect(readChannels()).toEqual([])
  })

  it('poolen räknas om bara när signaturen ändras', async () => {
    const ch = createChannel({ ...emptyDraft(), name: 'A', sources: ['library'] }, [], 1, () => 0.1)
    const queryLibrary = vi.fn(async () => ({ items: [{ key: 'm', kind: 'movie', tmdbId: 1, title: 'X', year: 2000, genres: [], runtimeMin: 90 }] }))
    const deps = { queryLibrary, getMovieWatchlist: () => [], getWatchlist: () => [], fetchSeasons: async () => [], listDebridCloud: async () => [], meta: { get: () => null, ensure: async () => {} } }
    await loadPoolCached(ch, deps as never)
    await loadPoolCached(ch, deps as never)
    expect(queryLibrary).toHaveBeenCalledTimes(1)
    await loadPoolCached({ ...ch, era: '80s' }, deps as never)
    expect(queryLibrary).toHaveBeenCalledTimes(2)
  })
})

describe('useChannelClock', () => {
  it('startar inga timers utan rundown och städar vid unmount', () => {
    vi.useFakeTimers()
    try {
      const ch = createChannel({ ...emptyDraft(), name: 'A' }, [], 1, () => 0.1)
      const idle = renderHook(() => useChannelClock([{ rundown: [], channel: ch }]))
      expect(vi.getTimerCount()).toBe(0)
      idle.unmount()
      const item = { ref: 'a', title: 'a', runtimeMin: 10, runtimeKnown: true, year: null, kind: 'movie' as const, source: 'library' as const, genres: [], play: { type: 'library' as const, key: 'k', mediaType: 'movie' as const } }
      const rundowns = [{ rundown: [item], channel: ch }]
      const busy = renderHook(() => useChannelClock(rundowns))
      expect(vi.getTimerCount()).toBe(1)
      busy.unmount()
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })
})
