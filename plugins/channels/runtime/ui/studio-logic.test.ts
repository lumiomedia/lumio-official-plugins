import { describe, expect, it, vi } from 'vitest'
import { createTitleSearch, effectiveName, genreOptions, localTitleSuggestions, mergeSuggestions, missingTitles, orderForTitles, previewFor, sourceCounts, tonightEnd } from './studio-logic'
import { emptyDraft } from '../model/channel'
import type { PoolItem } from '../data/pool'

const item = (ref: string, over: Partial<PoolItem> = {}): PoolItem => ({ ref, title: ref, runtimeMin: 60, runtimeKnown: true, year: 1985, kind: 'movie', source: 'library', genres: ['Drama'], play: { type: 'library', key: ref, mediaType: 'movie' }, ...over })
const pools = { library: [item('a'), item('b', { genres: ['Action'] })], watchlist: [item('c', { source: 'watchlist', tmdbId: 9 })], debrid: [], vod: [item('v', { source: 'vod' })] }

describe('studion', () => {
  it('räknar per källa', () => {
    expect(sourceCounts(pools)).toEqual({ library: 2, watchlist: 1, debrid: 0, vod: 1 })
  })

  it('förhandsvisningen följer reglerna direkt', () => {
    const now = new Date(2026, 9, 14, 21, 47).getTime()
    const all = previewFor({ ...emptyDraft(), name: 'X', sources: ['library', 'watchlist'] }, pools, 1, now)
    expect(all.count).toBe(3)
    expect(all.totalHours).toBe(3)
    expect(all.tonight[0]!.isNow).toBe(true)
    const drama = previewFor({ ...emptyDraft(), name: 'X', sources: ['library'], genres: ['Drama'] }, pools, 1, now)
    expect(drama.count).toBe(1)
    expect(previewFor({ ...emptyDraft(), name: 'X', sources: [] }, pools, 1, now).count).toBe(0)
  })

  it('genrelistan innehåller poolens genrer', () => {
    expect(genreOptions(pools)).toEqual(expect.arrayContaining(['Action', 'Drama']))
  })

  it('tablå ikväll slutar 03:00 nästa natt och har högst 8 rader', () => {
    const now = new Date(2026, 9, 14, 21, 47).getTime()
    const end = new Date(2026, 9, 15, 3, 0).getTime()
    expect(tonightEnd(now)).toBe(end)
    // Strax före 03:00: natten därpå.
    expect(tonightEnd(new Date(2026, 9, 15, 2, 30).getTime())).toBe(new Date(2026, 9, 16, 3, 0).getTime())
    const many = { library: Array.from({ length: 20 }, (_, i) => item(`m${i}`, { runtimeMin: 20 })), watchlist: [], debrid: [] }
    const p = previewFor({ ...emptyDraft(), name: 'X' }, many, 7, now)
    expect(p.tonight).toHaveLength(8)
    expect(p.tonight.every((r) => r.start < end)).toBe(true)
    expect(p.tonight.filter((r) => r.isNow)).toHaveLength(1)
    expect(p.tonight[0]!.meta).toBe('Film · 1985 · 20 min')
  })

  it('fönsterkanal utanför sändning visar nästa sändnings program och fönstrets text', () => {
    const now = new Date(2026, 9, 14, 12, 0).getTime()
    const p = previewFor({ ...emptyDraft(), name: 'X', airWindow: 'evenings' }, pools, 1, now)
    expect(p.windowLabel).toBe('windowEvenings')
    expect(p.tonight[0]!.isNow).toBe(false)
    expect(new Date(p.tonight[0]!.start).getHours()).toBe(18)
  })

  it('genrelistan är sorterad, utan skiftlägesdubbletter, med standardgenrer', () => {
    const list = genreOptions({ library: [item('a', { genres: ['drama', 'Egen'] })], watchlist: [], debrid: [] })
    expect(list.filter((g) => g.toLowerCase() === 'drama')).toHaveLength(1)
    expect(list).toEqual(expect.arrayContaining(['Egen', 'Comedy', 'Science Fiction']))
    expect([...list].sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1))).toEqual(list)
  })

  it('genrelistan slår ihop stavningar och delar TV:s sammansatta genrer', () => {
    const list = genreOptions({ library: [item('a', { genres: ['Sci-Fi', 'Action & Adventure'] })], watchlist: [], debrid: [] })
    expect(list.filter((g) => /sci/i.test(g))).toEqual(['Science Fiction'])
    expect(list).toEqual(expect.arrayContaining(['Action', 'Adventure']))
    expect(list).not.toContain('Action & Adventure')
  })
})

describe('studions titelfält', () => {
  const at = (ref: string, over: Partial<PoolItem> = {}): PoolItem => item(ref, {
    kind: 'episode', title: `Avsnitt ${ref}`, seriesTitle: 'Adventure Time', seriesKey: 'lib:at', tmdbId: 15260, year: 2010, play: { type: 'library', key: 'at', mediaType: 'tv' }, ...over,
  })
  const tpools = {
    library: [at('1'), at('2', { posterUrl: 'lib.jpg' }), item('m', { title: 'Time Bandits', tmdbId: 36819, year: 1981 })],
    watchlist: [], debrid: [item('d', { title: 'Adventureland', year: 2009, source: 'debrid', play: { type: 'debrid', provider: 'torbox', fileRef: 'x' } })], vod: [],
  }

  it('lokala förslag: en per titel (serien, inte avsnitten), början av namnet först', () => {
    const hits = localTitleSuggestions(tpools, 'adventure')
    expect(hits.map((h) => [h.kind, h.title])).toEqual([['tv', 'Adventure Time'], ['movie', 'Adventureland']])
    expect(hits[0]).toMatchObject({ tmdbId: 15260, posterUrl: 'lib.jpg' })
    // Utan tmdbId: källans nyckel blir identiteten.
    expect(hits[1]).toMatchObject({ libraryKey: 'd' })
    expect(localTitleSuggestions(tpools, 't')).toEqual([])
    expect(localTitleSuggestions(tpools, 'time').map((h) => h.title)).toEqual(['Time Bandits', 'Adventure Time'])
  })

  it('sammanslagning: lokala först, TMDb-dubbletter bort, redan valda bort', () => {
    const local = localTitleSuggestions(tpools, 'adventure')
    const remote = [
      { kind: 'tv' as const, tmdbId: 15260, title: 'Adventure Time', year: 2010, posterUrl: 'tmdb.jpg' },
      { kind: 'movie' as const, tmdbId: 1, title: 'Adventureland', year: 2009, posterUrl: 'al.jpg' },
      { kind: 'movie' as const, tmdbId: 355460, title: 'Adventure Time', year: 2007 },
    ]
    const merged = mergeSuggestions(local, remote, [])
    expect(merged.map((m) => [m.kind, m.title, m.tmdbId])).toEqual([
      ['tv', 'Adventure Time', 15260], ['movie', 'Adventureland', 1], ['movie', 'Adventure Time', 355460],
    ])
    // Lokala posten utan id/affisch tar TMDb:s.
    expect(merged[1]).toMatchObject({ libraryKey: 'd', posterUrl: 'al.jpg' })
    const without = mergeSuggestions(local, remote, [{ kind: 'tv', tmdbId: 15260, title: 'Adventure Time' }])
    expect(without.map((m) => m.title)).toEqual(['Adventureland', 'Adventure Time'])
    expect(mergeSuggestions(local, remote, [], 2)).toHaveLength(2)
  })

  it('förhandsvisningen med titlar: bara titlarna, reservposter för saknade', () => {
    const draft = { ...emptyDraft(), name: '', sources: ['library' as const, 'debrid' as const], genres: ['Comedy'], titles: [{ kind: 'tv' as const, tmdbId: 15260, title: 'Adventure Time' }, { kind: 'movie' as const, tmdbId: 949, title: 'Heat' }] }
    expect(missingTitles(draft, tpools).map((t) => t.title)).toEqual(['Heat'])
    const heat = item('ti:movie:949', { title: 'Heat', tmdbId: 949, source: 'watchlist' })
    const now = new Date(2026, 9, 14, 21, 47).getTime()
    expect(previewFor(draft, tpools, 1, now).count).toBe(2)
    expect(previewFor(draft, tpools, 1, now, [heat]).count).toBe(3)
    expect(missingTitles({ ...draft, titles: [] }, tpools)).toEqual([])
  })

  it('namnförslag och ordning för en ensam serie', () => {
    const one = [{ kind: 'tv' as const, tmdbId: 15260, title: 'Adventure Time' }]
    expect(effectiveName({ name: ' ', titles: one })).toBe('Adventure Time')
    expect(effectiveName({ name: 'Egen', titles: one })).toBe('Egen')
    expect(effectiveName({ name: '', titles: [...one, { kind: 'movie', title: 'Heat' }] })).toBe('')
    expect(orderForTitles(one, 'shuffle', false)).toBe('episodes')
    expect(orderForTitles(one, 'shuffle', true)).toBe('shuffle')
    expect(orderForTitles([{ kind: 'movie', title: 'Heat' }], 'shuffle', false)).toBe('shuffle')
  })

  it('TMDb-sökningen: debounce, minst två tecken, högst ett anrop ute, cache', async () => {
    vi.useFakeTimers()
    try {
      const pending: Array<{ q: string; resolve(v: never[]): void }> = []
      const search = vi.fn((q: string) => new Promise<never[]>((resolve) => { pending.push({ q, resolve }) }))
      const states: string[] = []
      const s = createTitleSearch(search, (st) => states.push(`${st.status}:${st.query}`))
      s.set('a')
      await vi.advanceTimersByTimeAsync(400)
      expect(search).not.toHaveBeenCalled()
      s.set('ad'); s.set('adv')
      await vi.advanceTimersByTimeAsync(349)
      expect(search).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(1)
      expect(search).toHaveBeenCalledTimes(1)
      s.set('adve')
      await vi.advanceTimersByTimeAsync(350)
      s.set('adven')
      await vi.advanceTimersByTimeAsync(350)
      // Fortfarande ett anrop ute; bara det senaste köas.
      expect(search).toHaveBeenCalledTimes(1)
      pending[0]!.resolve([])
      await vi.advanceTimersByTimeAsync(0)
      expect(search.mock.calls.map((c) => c[0])).toEqual(['adv', 'adven'])
      pending[1]!.resolve([])
      await vi.advanceTimersByTimeAsync(0)
      expect(states.at(-1)).toBe('done:adven')
      s.set('Adven')
      expect(search).toHaveBeenCalledTimes(2)
      expect(states.at(-1)).toBe('done:Adven')
      s.dispose()
    } finally {
      vi.useRealTimers()
    }
  })
})
