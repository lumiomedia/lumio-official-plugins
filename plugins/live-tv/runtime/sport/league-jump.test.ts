import { describe, expect, it } from 'vitest'
import { countryGroups, leagueEntries, searchLeagues, yourLeagues, type LeagueEntry } from './league-jump'
import type { ResultGroup } from './results-model'
import type { SportFollow } from './sport-store'
import type { SportKind, SportMatch } from './sport-model'
import { fxMatch } from './__sport-fixture'

let n = 0
const match = (over: Partial<SportMatch> = {}): SportMatch => fxMatch({ id: `m${++n}`, start: n, stop: n + 1, coverage: 'full', status: 'finished', ...over })
const group = (league: string, country: string | null, count: number, opts: { sport?: SportKind; live?: number; linked?: number; leagueKey?: string; id?: string } = {}): ResultGroup => {
  const id = opts.id ?? `${league}-${country ?? 'x'}`
  const matches = Array.from({ length: count }, (_, i) => match({
    kind: opts.sport ?? 'football', league, leagueKey: opts.leagueKey ?? `fx:api-sports:${id}`,
    status: i < (opts.live ?? 0) ? 'live' : 'finished',
    resultOnly: i >= (opts.linked ?? 0), sources: [],
  }))
  return { key: `${opts.sport ?? 'football'}|${id}`, sport: opts.sport ?? 'football', league, leagueId: id, season: '2026', round: null, country, matches }
}
const entry = (over: Partial<LeagueEntry>): LeagueEntry => ({ key: over.label ?? 'k', sport: 'football', league: 'L', country: null, label: over.league ?? 'L', count: 1, live: 0, relevant: false, followed: false, ...over })

describe('leagueEntries', () => {
  it('räknar matcher och live, och skiljer dubblettnamn med land', () => {
    const e = leagueEntries([
      group('Premier League', 'England', 10, { live: 2 }),
      group('Premier League', 'Wales', 3),
      group('Allsvenskan', 'Sweden', 8),
    ], [])
    expect(e.map((x) => [x.label, x.count, x.live])).toEqual([
      ['Premier League · England', 10, 2],
      ['Premier League · Wales', 3, 0],
      ['Allsvenskan', 8, 0],
    ])
  })
  it('relevant = kopplad till användarens kanaler eller följd; följd liga markeras', () => {
    const follows: SportFollow[] = [{ sport: 'hockey', kind: 'league', key: 'shl', name: 'SHL' }]
    const e = leagueEntries([
      group('Allsvenskan', 'Sweden', 4, { linked: 1 }),
      group('SHL', 'Sweden', 3, { sport: 'hockey', leagueKey: 'shl' }),
      group('Ligue 1', 'France', 9),
    ], follows)
    expect(e.map((x) => [x.league, x.relevant, x.followed])).toEqual([['Allsvenskan', true, false], ['SHL', true, true], ['Ligue 1', false, false]])
  })
})

describe('yourLeagues', () => {
  it('följda först, sedan live, sedan flest matcher; högst tio', () => {
    const list = [
      entry({ key: 'a', label: 'A', count: 20, relevant: true }),
      entry({ key: 'b', label: 'B', count: 2, relevant: true, followed: true }),
      entry({ key: 'c', label: 'C', count: 5, relevant: true, live: 1 }),
      entry({ key: 'd', label: 'D', count: 99 }),
      ...Array.from({ length: 12 }, (_, i) => entry({ key: `r${i}`, label: `R${i}`, count: 1, relevant: true })),
    ]
    const r = yourLeagues(list)
    expect(r.fallback).toBe(false)
    expect(r.entries).toHaveLength(10)
    expect(r.entries.slice(0, 3).map((x) => x.key)).toEqual(['b', 'c', 'a'])
    expect(r.entries.some((x) => x.key === 'd')).toBe(false)
  })
  it('inget relevant: de sex största ligorna', () => {
    const list = Array.from({ length: 9 }, (_, i) => entry({ key: `k${i}`, label: `K${i}`, count: i }))
    const r = yourLeagues(list)
    expect(r.fallback).toBe(true)
    expect(r.entries.map((x) => x.count)).toEqual([8, 7, 6, 5, 4, 3])
  })
})

describe('countryGroups', () => {
  it('Sverige först, sedan land efter antal matcher; utan land sist; grupper efter de sex första fällda', () => {
    const list = [
      entry({ key: 'e1', league: 'Premier League', country: 'England', count: 10 }),
      entry({ key: 'e2', league: 'Championship', country: 'England', count: 12 }),
      entry({ key: 's1', league: 'Allsvenskan', country: 'Sweden', count: 2 }),
      entry({ key: 'f1', league: 'Ligue 1', country: 'France', count: 30 }),
      entry({ key: 'w1', league: 'Friendlies', country: null, count: 50 }),
      ...['A', 'B', 'C', 'D', 'E'].map((c, i) => entry({ key: `x${c}`, league: `Liga ${c}`, country: `Land ${c}`, count: 5 - i })),
    ]
    const g = countryGroups(list)
    expect(g.map((x) => x.country)).toEqual(['Sweden', 'France', 'England', 'Land A', 'Land B', 'Land C', 'Land D', 'Land E', null])
    expect(g[2].entries.map((x) => x.key)).toEqual(['e2', 'e1'])
    expect(g[2].total).toBe(22)
    expect(g.map((x) => x.collapsed)).toEqual([false, false, false, false, false, false, true, true, true])
  })
  it('Sverige räknas även som "Sverige"', () => {
    const g = countryGroups([entry({ key: 'a', country: 'Spain', count: 9 }), entry({ key: 'b', country: 'Sverige', count: 1 })])
    expect(g[0].country).toBe('Sverige')
  })
})

describe('searchLeagues', () => {
  const list = [
    entry({ key: 'pe', league: 'Premier League', country: 'England', count: 10 }),
    entry({ key: 'pr', league: 'Primera División', country: 'Argentina', count: 3 }),
    entry({ key: 'ps', league: 'Primera División', country: 'Spain', count: 8 }),
    entry({ key: 'al', league: 'Allsvenskan', country: 'Sweden', count: 4 }),
  ]
  it('matchar namn och land utan accenter; namnprefix först, sedan antal', () => {
    expect(searchLeagues(list, 'primera division').map((x) => x.key)).toEqual(['ps', 'pr'])
    expect(searchLeagues(list, 'spain').map((x) => x.key)).toEqual(['ps'])
    expect(searchLeagues(list, 'pr').map((x) => x.key)).toEqual(['pe', 'ps', 'pr'])
    expect(searchLeagues(list, 'league eng').map((x) => x.key)).toEqual(['pe'])
  })
  it('tom fråga ger inget', () => {
    expect(searchLeagues(list, '  ')).toEqual([])
  })
})
