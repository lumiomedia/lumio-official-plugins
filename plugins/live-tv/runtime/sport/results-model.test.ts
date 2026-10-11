import { describe, expect, it } from 'vitest'
import { defaultResultsFilter, groupResults, onlyLeague } from './results-model'
import { fxMatch } from './__sport-fixture'
import type { SportMatch } from './sport-model'
import type { SportFollow } from './sport-store'

let n = 0
const m = (over: Partial<SportMatch> = {}): SportMatch => fxMatch({
  id: `r${++n}`, home: 'Malmo FF', away: 'AIK', homeKey: 'malmo', awayKey: 'aik', start: n, stop: n + 1,
  status: 'finished', score: { home: 1, away: 0 }, coverage: 'full',
  fixture: { provider: 'api-sports', id: `f${n}`, leagueId: '113', season: '2026' }, ...over,
})
const team = (key: string): SportFollow => ({ sport: 'football', kind: 'team', key, name: key })
const league = (key: string): SportFollow => ({ sport: 'football', kind: 'league', key, name: key })

describe('Mina lag i Tabeller & resultat', () => {
  it('förvalt när användaren följer minst ett lag eller en liga, annars Alla', () => {
    expect(defaultResultsFilter([])).toBe('all')
    expect(defaultResultsFilter([team('aik')])).toBe('followed')
    expect(defaultResultsFilter([league('allsvenskan')])).toBe('followed')
  })
  it('visar matcher med följda lag eller i följda ligor, och räknar dem', () => {
    const aik = m()
    const pl = m({ home: 'Arsenal', away: 'Chelsea', homeKey: 'arsenal', awayKey: 'chelsea', league: 'Premier League', leagueKey: 'premier-league', fixture: { provider: 'api-sports', id: 'pl', leagueId: '39', season: '2026' } })
    const other = m({ home: 'Lazio', away: 'Roma', homeKey: 'lazio', awayKey: 'roma', league: 'Serie A', leagueKey: 'serie-a', fixture: { provider: 'api-sports', id: 'sa', leagueId: '135', season: '2026' } })
    const r = groupResults([aik, pl, other], 'followed', [team('aik'), league('premier-league')])
    expect(r.groups.flatMap((g) => g.matches.map((x) => x.id))).toEqual([aik.id, pl.id])
    expect(r.followedCount).toBe(2)
    expect(groupResults([aik, pl, other], 'all', [team('aik')]).followedCount).toBe(1)
  })
})

describe('onlyLeague', () => {
  it('ett ligaval filtrerar till den ligan; null visar alla', () => {
    const groups = groupResults([m(), m({ kind: 'hockey', fixture: { provider: 'api-sports', id: 'h', leagueId: '47', season: '2026' } })], 'all').groups
    expect(onlyLeague(groups, 'hockey|47').map((g) => g.key)).toEqual(['hockey|47'])
    expect(onlyLeague(groups, null)).toHaveLength(2)
    expect(onlyLeague(groups, 'football|999')).toEqual([])
  })
})
