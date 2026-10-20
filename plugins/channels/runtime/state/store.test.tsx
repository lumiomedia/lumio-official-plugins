import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

const storage = new Map<string, unknown>()
let failWrites = 0
let libraryStatus: unknown = { total: 3, sources: [{ lastFullSync: 100, lastDeltaSync: null }] }
const sdk = {
  queryLibrary: async (_q: unknown): Promise<{ items: unknown[] }> => ({ items: [] }),
  listDebrid: async (): Promise<unknown[]> => [],
  idle: (): Promise<void> => Promise.resolve(),
  lang: 'sv',
  profileListeners: [] as Array<() => void>,
}
// Molnet är pluginets egen modul (data/cloud): listningen styrs av testet.
vi.mock('../data/cloud', () => ({
  DEBRID_PROVIDERS: ['realdebrid', 'torbox', 'alldebrid'],
  createDebridCloud: () => ({ listDebridCloud: () => sdk.listDebrid(), unrestrictDebridFile: async () => null }),
}))
vi.mock('@/lib/plugin-sdk', () => ({
  readPluginJson: (_id: string, key: string, fallback: unknown) => storage.get(key) ?? fallback,
  removePluginStorageItem: (_id: string, key: string) => { storage.delete(key) },
  writePluginJson: (_id: string, key: string, value: unknown) => { if (failWrites > 0) { failWrites -= 1; throw new Error('lagring full') } storage.set(key, value) },
  onPluginStorageChanged: () => () => {},
  queryLibrary: (q: unknown) => sdk.queryLibrary(q),
  getMovieWatchlist: () => [],
  getWatchlist: () => [],
  fetchLibraryStatus: async () => libraryStatus,
  channelSourceToken: () => null,
  channelClearSourceToken: () => {},
  channelParseFileName: () => null,
  channelMatchTitles: async () => [],
  waitForStartIdle: () => sdk.idle(),
  readStoredLang: () => sdk.lang,
  onProfileChanged: (fn: () => void) => { sdk.profileListeners.push(fn); return () => {} },
  channelResolveLibraryPlayback: async () => null,
  channelResolveTitleStream: async () => null,
  hasChannelHost: () => true,
}))

import { deleteChannel, loadPoolCached, restoreDefaultChannels, saveChannel, seedDefaultChannels, useChannelClock, useChannelPool } from './store'
import { ChannelsBootstrap } from '../ui/bootstrap'
import { render } from '@testing-library/react'
import { prunePoolCaches, readChannels, resetSourceSignatures, sourceSignatures } from '../host'
import { createChannel, emptyDraft } from '../model/channel'

beforeEach(() => { vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) }))); sdk.idle = () => Promise.resolve(); sdk.lang = 'sv'; sdk.profileListeners = []; sdk.queryLibrary = async () => ({ items: [] }); sdk.listDebrid = async () => []; failWrites = 0; resetSourceSignatures(); storage.clear(); libraryStatus = { total: 3, sources: [{ lastFullSync: 100, lastDeltaSync: null }] } })

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

  it('biblioteksignaturen påverkas inte av en tom delta (lastDeltaSync) men av lastChange', async () => {
    const before = (await sourceSignatures()).library
    libraryStatus = { total: 3, sources: [{ lastFullSync: 100, lastDeltaSync: 5000 }] }
    resetSourceSignatures()
    expect((await sourceSignatures()).library).toBe(before)
    libraryStatus = { total: 3, sources: [{ lastFullSync: 100, lastDeltaSync: 5000, lastChange: 4900 }] }
    resetSourceSignatures()
    expect((await sourceSignatures()).library).not.toBe(before)
  })

  it('en debridkanal byggs inte om när biblioteket synkat', async () => {
    const ch = createChannel({ ...emptyDraft(), name: 'D', sources: ['debrid'] }, [], 1, () => 0.1)
    const listDebridCloud = vi.fn(async () => [])
    await loadPoolCached(ch, { ...deps, listDebridCloud } as never)
    libraryStatus = { total: 4, sources: [{ lastFullSync: 300, lastDeltaSync: null, lastChange: 300 }] }
    resetSourceSignatures()
    await loadPoolCached(ch, { ...deps, listDebridCloud } as never)
    expect(listDebridCloud).toHaveBeenCalledTimes(1)
  })

  it('poolcachen sparas packad och läses tillbaka lika', async () => {
    const ch = createChannel({ ...emptyDraft(), name: 'A', sources: ['library'] }, [], 1, () => 0.1)
    const queryLibrary = async () => ({ items: [{ key: 'm', kind: 'movie', tmdbId: 1, title: 'X', year: 2000, genres: ['Drama'], runtimeMin: 90, posterUrl: 'p', backdropUrl: 'b' }] })
    const fresh = await loadPoolCached(ch, { ...deps, queryLibrary } as never)
    const stored = storage.get(`poolCache:${ch.id}`) as { pool: { v: number } }
    expect(stored.pool.v).toBe(2)
    const again = await loadPoolCached(ch, { ...deps, queryLibrary } as never)
    expect(again).toEqual(fresh)
    expect(fresh[0]).toMatchObject({ ref: 'lib:m', title: 'X', posterUrl: 'p', backdropUrl: 'b', play: { type: 'library', key: 'm', mediaType: 'movie' } })
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

describe('laddningsfel och signaturbyte', () => {
  const baseDeps = { getMovieWatchlist: () => [], getWatchlist: () => [], fetchSeasons: async () => [], listDebridCloud: async () => [], meta: { get: () => null, ensure: async () => {} } }

  it('en misslyckad laddning cachas inte: nästa anrop försöker igen', async () => {
    const ch = createChannel({ ...emptyDraft(), name: 'A', sources: ['library'] }, [], 1, () => 0.1)
    // Källorna sväljer egna fel; ett jobb kan ändå falla, t.ex. när cachen inte går att skriva.
    const queryLibrary = vi.fn(async () => ({ items: [] }))
    failWrites = 1
    await expect(loadPoolCached(ch, { ...baseDeps, queryLibrary } as never)).rejects.toThrow('lagring full')
    await expect(loadPoolCached(ch, { ...baseDeps, queryLibrary } as never)).resolves.toEqual([])
    expect(queryLibrary).toHaveBeenCalledTimes(2)
  })

  it('signaturbyte under pågående laddning startar ett nytt jobb', async () => {
    const ch = createChannel({ ...emptyDraft(), name: 'A', sources: ['library'] }, [], 1, () => 0.1)
    let release: () => void = () => {}
    const gate = new Promise<void>((r) => { release = r })
    const queryLibrary = vi.fn(async () => { await gate; return { items: [] } })
    const first = loadPoolCached(ch, { ...baseDeps, queryLibrary } as never)
    await new Promise((r) => setTimeout(r, 0))
    expect(queryLibrary).toHaveBeenCalledTimes(1)
    libraryStatus = { total: 3, sources: [{ lastFullSync: 999, lastDeltaSync: null }] }
    resetSourceSignatures()
    const second = loadPoolCached(ch, { ...baseDeps, queryLibrary } as never)
    await new Promise((r) => setTimeout(r, 0))
    expect(queryLibrary).toHaveBeenCalledTimes(2)
    release()
    await Promise.all([first, second])
  })
})

describe('progressiv pool', () => {
  const movie = (key: string, tmdbId: number) => ({ key, kind: 'movie', tmdbId, title: key, year: 2000, genres: [], runtimeMin: 95 })

  it('första källan visas innan en långsam andra svarat; cachen skrivs först när allt är klart', async () => {
    const ch = createChannel({ ...emptyDraft(), name: 'A', sources: ['library', 'debrid'] }, [], 1, () => 0.1)
    let release: () => void = () => {}
    const gate = new Promise<void>((r) => { release = r })
    sdk.queryLibrary = async () => ({ items: [movie('m1', 1)] })
    sdk.listDebrid = async () => { await gate; return [{ kind: 'movie', title: 'D', year: 2001, files: [{ provider: 'torbox', fileRef: '1|1' }] }] }
    const { result } = renderHook(() => useChannelPool(ch))
    await waitFor(() => expect(result.current.pool.map((i) => i.ref)).toEqual(['lib:m1']))
    expect(result.current.loading).toBe(false)
    expect(result.current.partial).toBe(true)
    expect(storage.has(`poolCache:${ch.id}`)).toBe(false)
    await act(async () => { release() })
    await waitFor(() => expect(result.current.partial).toBe(false))
    expect(result.current.pool.map((i) => i.ref).sort()).toEqual(['db:torbox:1|1', 'lib:m1'])
    expect(storage.has(`poolCache:${ch.id}`)).toBe(true)
  })

  it('två prenumeranter på samma kanal delar en laddning', async () => {
    const ch = createChannel({ ...emptyDraft(), name: 'A', sources: ['library'] }, [], 1, () => 0.1)
    const query = vi.fn(async () => { await new Promise((r) => setTimeout(r, 5)); return { items: [movie('m1', 1)] } })
    sdk.queryLibrary = query
    const a = renderHook(() => useChannelPool(ch))
    const b = renderHook(() => useChannelPool(ch))
    await waitFor(() => expect(a.result.current.pool).toHaveLength(1))
    await waitFor(() => expect(b.result.current.pool).toHaveLength(1))
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('en sparad pool med samma regler visas direkt och byts först mot en komplett', async () => {
    const ch = createChannel({ ...emptyDraft(), name: 'A', sources: ['library', 'debrid'] }, [], 1, () => 0.1)
    sdk.queryLibrary = async () => ({ items: [movie('m1', 1)] })
    await loadPoolCached(ch)
    // Källan har ändrats: signaturen stämmer inte längre, men reglerna gör det.
    libraryStatus = { total: 4, sources: [{ lastFullSync: 999, lastDeltaSync: null }] }
    resetSourceSignatures()
    let release: () => void = () => {}
    const gate = new Promise<void>((r) => { release = r })
    sdk.queryLibrary = async () => ({ items: [movie('m1', 1), movie('m2', 3)] })
    sdk.listDebrid = async () => { await gate; return [] }
    const { result } = renderHook(() => useChannelPool(ch))
    expect(result.current.loading).toBe(false)
    expect(result.current.pool.map((i) => i.ref)).toEqual(['lib:m1'])
    await new Promise((r) => setTimeout(r, 10))
    expect(result.current.pool.map((i) => i.ref)).toEqual(['lib:m1'])
    expect(result.current.partial).toBe(false)
    await act(async () => { release() })
    await waitFor(() => expect(result.current.pool.map((i) => i.ref).sort()).toEqual(['lib:m1', 'lib:m2']))
  })
})

describe('standardkanalerna', () => {
  it('sås en gång per profil; borttagna kommer bara tillbaka via återställ', () => {
    expect(seedDefaultChannels('sv')).toBe(10)
    expect(readChannels()).toHaveLength(10)
    for (const c of readChannels()) deleteChannel(c.id)
    expect(seedDefaultChannels('sv')).toBe(0)
    expect(readChannels()).toEqual([])
    expect(restoreDefaultChannels('en')).toBe(10)
    expect(readChannels()[0]!.name).toBe('Movies around the clock')
  })
})

describe('uppstart och startgrinden', () => {
  it('bootstrap sår standardkanalerna utan nätverk, och en ny profil vid profilbyte', () => {
    const query = vi.fn(async () => ({ items: [] }))
    const debrid = vi.fn(async () => [])
    sdk.queryLibrary = query
    sdk.listDebrid = debrid
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    render(<ChannelsBootstrap />)
    expect(readChannels()).toHaveLength(10)
    expect(readChannels()[0]!.name).toBe('Bio dygnet runt')
    // "Byt profil": tom lagring, engelska.
    storage.clear()
    sdk.lang = 'en'
    for (const fn of sdk.profileListeners) fn()
    expect(readChannels()[0]!.name).toBe('Movies around the clock')
    expect(query).not.toHaveBeenCalled()
    expect(debrid).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('biblioteket publiceras före grinden; watchlist och debrid väntar på waitForStartIdle', async () => {
    const ch = createChannel({ ...emptyDraft(), name: 'A', sources: ['library', 'debrid'] }, [], 1, () => 0.1)
    let open: () => void = () => {}
    const gate = new Promise<void>((r) => { open = r })
    sdk.idle = () => gate
    sdk.queryLibrary = async () => ({ items: [{ key: 'm1', kind: 'movie', tmdbId: 1, title: 'm1', year: 2000, genres: [], runtimeMin: 95 }] })
    const debrid = vi.fn(async () => [{ kind: 'movie', title: 'D', year: 2001, files: [{ provider: 'torbox', fileRef: '1|1' }] }])
    sdk.listDebrid = debrid
    const { result } = renderHook(() => useChannelPool(ch))
    await waitFor(() => expect(result.current.pool.map((i) => i.ref)).toEqual(['lib:m1']))
    await new Promise((r) => setTimeout(r, 10))
    expect(debrid).not.toHaveBeenCalled()
    expect(result.current.partial).toBe(true)
    await act(async () => { open() })
    await waitFor(() => expect(result.current.partial).toBe(false))
    expect(debrid).toHaveBeenCalledTimes(1)
    expect(result.current.pool.map((i) => i.ref).sort()).toEqual(['db:torbox:1|1', 'lib:m1'])
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

describe('tablålåset i lagringen', () => {
  const pool = ['a', 'b', 'c'].map((ref, i) => ({ ref, title: ref, runtimeMin: 40 + i * 13, runtimeKnown: true, year: 2000, kind: 'movie' as const, source: 'library' as const, genres: [], play: { type: 'library' as const, key: ref, mediaType: 'movie' as const } }))

  it('läggs och sparas när tablån visas; samma lås används nästa gång; regeländring och borttagning släpper det', async () => {
    const { lockRundown, saveChannel, deleteChannel } = await import('./store')
    const { buildRundown, programmeAt } = await import('../model/schedule')
    const ch = createChannel({ ...emptyDraft(), name: 'A', sources: ['library'] }, [], 1, () => 0.1)
    saveChannel(ch)
    const now = Date.now()
    const first = lockRundown(ch, buildRundown(pool, ch.order, ch.seed), now)
    const saved = storage.get(`lock:${ch.id}`) as { slots: unknown[] }
    expect(saved.slots.length).toBeGreaterThan(0)
    // Ny pool (en titel till): samma program inom låset.
    const again = lockRundown(ch, buildRundown([...pool, { ...pool[0]!, ref: 'z', title: 'z' }], ch.order, ch.seed), now)
    const at = (r: typeof first, t: number) => { const s = programmeAt(r, ch.airWindow, t); return s.kind === 'programme' ? s.item.ref : s.kind }
    for (let t = now; t < now + 5 * 3600_000; t += 15 * 60_000) expect(at(again, t)).toBe(at(first, t))
    // Namnbyte rör inte låset; ändrade regler släpper det.
    saveChannel({ ...ch, name: 'B' })
    expect(storage.has(`lock:${ch.id}`)).toBe(true)
    saveChannel({ ...ch, era: '80s' })
    expect(storage.has(`lock:${ch.id}`)).toBe(false)
    lockRundown({ ...ch, era: '80s' }, buildRundown(pool, ch.order, ch.seed), now)
    expect(storage.has(`lock:${ch.id}`)).toBe(true)
    deleteChannel(ch.id)
    expect(storage.has(`lock:${ch.id}`)).toBe(false)
  })
})
