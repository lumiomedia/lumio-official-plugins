import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

const storage = new Map<string, unknown>()
let libraryStatus: unknown = { total: 3, sources: [{ lastFullSync: 100, lastDeltaSync: null }] }
vi.mock('@/lib/plugin-sdk', () => ({
  readPluginJson: (_id: string, key: string, fallback: unknown) => storage.get(key) ?? fallback,
  removePluginStorageItem: (_id: string, key: string) => { storage.delete(key) },
  writePluginJson: (_id: string, key: string, value: unknown) => { storage.set(key, value) },
  onPluginStorageChanged: () => () => {},
  queryLibrary: async () => ({ items: [] }),
  getMovieWatchlist: () => [],
  getWatchlist: () => [],
  fetchLibraryStatus: async () => libraryStatus,
  channelListDebridCloud: async () => [],
  channelResolveLibraryPlayback: async () => null,
  channelResolveTitleStream: async () => null,
  channelUnrestrictDebridFile: async () => null,
  hasChannelHost: () => true,
}))

import { deleteChannel, loadPoolCached, saveChannel, useChannelClock } from './store'
import { prunePoolCaches, readChannels, resetSourceSignatures, sourceSignatures } from '../host'
import { createChannel, emptyDraft } from '../model/channel'

beforeEach(() => { resetSourceSignatures(); storage.clear(); libraryStatus = { total: 3, sources: [{ lastFullSync: 100, lastDeltaSync: null }] } })

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

describe('poolcache och signatur', () => {
  const deps = { queryLibrary: async () => ({ items: [] }), getMovieWatchlist: () => [], getWatchlist: () => [], fetchSeasons: async () => [], listDebridCloud: async () => [], meta: { get: () => null, ensure: async () => {} } }

  it('deleteChannel tar bort poolcachen', async () => {
    const a = createChannel({ ...emptyDraft(), name: 'A', sources: ['library'] }, [], 1, () => 0.1)
    saveChannel(a)
    await loadPoolCached(a, deps as never)
    expect(storage.has(`poolCache:${a.id}`)).toBe(true)
    deleteChannel(a.id)
    expect(storage.has(`poolCache:${a.id}`)).toBe(false)
  })

  it('prunePoolCaches städar kanaler som försvunnit men behåller levande', async () => {
    const a = createChannel({ ...emptyDraft(), name: 'A', sources: ['library'] }, [], 1, () => 0.1)
    const b = createChannel({ ...emptyDraft(), name: 'B', sources: ['library'] }, [a], 2, () => 0.2)
    await loadPoolCached(a, deps as never)
    await loadPoolCached(b, deps as never)
    prunePoolCaches([b.id])
    expect(storage.has(`poolCache:${a.id}`)).toBe(false)
    expect(storage.has(`poolCache:${b.id}`)).toBe(true)
  })

  it('biblioteksignaturen ändras med lastFullSync', async () => {
    const before = (await sourceSignatures()).library
    libraryStatus = { total: 3, sources: [{ lastFullSync: 200, lastDeltaSync: null }] }
    resetSourceSignatures()
    expect((await sourceSignatures()).library).not.toBe(before)
  })
})

describe('delade laddningar', () => {
  it('samtida loadPoolCached för samma kanal ger ett poolanrop', async () => {
    const ch = createChannel({ ...emptyDraft(), name: 'A', sources: ['library'] }, [], 1, () => 0.1)
    const queryLibrary = vi.fn(async () => { await new Promise((r) => setTimeout(r, 5)); return { items: [] } })
    const deps = { queryLibrary, getMovieWatchlist: () => [], getWatchlist: () => [], fetchSeasons: async () => [], listDebridCloud: async () => [], meta: { get: () => null, ensure: async () => {} } }
    const [a, b, c] = await Promise.all([loadPoolCached(ch, deps as never), loadPoolCached(ch, deps as never), loadPoolCached(ch, deps as never)])
    expect(queryLibrary).toHaveBeenCalledTimes(1)
    expect(b).toBe(a)
    expect(c).toBe(a)
  })

  it('samtida sourceSignatures ger en fetchLibraryStatus, och minnet släpps efter ~2 s', async () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(1_000_000)
      const spy = vi.spyOn(await import('@/lib/plugin-sdk'), 'fetchLibraryStatus')
      spy.mockClear()
      await Promise.all([sourceSignatures(), sourceSignatures(), sourceSignatures()])
      expect(spy).toHaveBeenCalledTimes(1)
      vi.setSystemTime(1_000_000 + 2500)
      await sourceSignatures()
      expect(spy).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
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
