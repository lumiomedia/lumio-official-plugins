import { describe, expect, it } from 'vitest'
import { genreOptions, previewFor, sourceCounts, tonightEnd } from './studio-logic'
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
