// runtime/sport/team-providers.test.ts
import { describe, expect, it } from 'vitest'
import { teamCallsFor } from './team-providers'
import teamFixtures from './__fixtures__/api-sports/football-fixtures-team.json'
import squads from './__fixtures__/api-sports/football-players-squads.json'
import injuries from './__fixtures__/api-sports/football-injuries.json'
import topscorers from './__fixtures__/api-sports/football-topscorers.json'
import hockeyDate from './__fixtures__/api-sports/hockey-games-date.json'
import saTeam from './__fixtures__/sportapi/team.json'
import saSquad from './__fixtures__/sportapi/team-squad.json'
import saLeague from './__fixtures__/sportapi/league.json'
import saScorers from './__fixtures__/sportapi/league-topscorers.json'
import tsdbLast from './__fixtures__/thesportsdb/eventslast.json'
import tsdbNext from './__fixtures__/thesportsdb/eventsnext.json'
import tsdbPlayers from './__fixtures__/thesportsdb/lookup-all-players.json'
import tsdbPast from './__fixtures__/thesportsdb/eventspastleague.json'
import tsdbNextLeague from './__fixtures__/thesportsdb/eventsnextleague.json'

const TZ = 'Europe/Stockholm'

describe('API-Sports: lagsidans anrop', () => {
  const calls = teamCallsFor('api-sports')
  it('lagets matcher: EN säsong per anrop (inte next/last, som gratisplanen saknar), med sidans ttl', () => {
    const call = calls.fixtures('football', '363', { season: '2026', tz: TZ, ttlS: 7200 })!
    expect(call.requests).toEqual([{ sport: 'football', path: '/fixtures?team=363&season=2026&timezone=Europe%2FStockholm', ttlS: 7200 }])
    const feed = call.parse([teamFixtures])
    expect(feed.fixtures).toHaveLength(8)
    expect(feed.fixtures.filter((f) => f.status === 'finished')).toHaveLength(5)
    expect(feed.fixtures[4]).toMatchObject({ provider: 'api-sports', id: '1494294', home: { id: '363', name: 'Hammarby FF' }, away: { name: 'Djurgardens IF' }, score: { home: 0, away: 1 }, league: { id: '113', season: '2026' } })
  })
  it('hockey och basket använder /games', () => {
    const call = calls.fixtures('hockey', '650', { season: '2026', tz: TZ, ttlS: 60 })!
    expect(call.requests[0].path).toBe('/games?team=650&season=2026&timezone=Europe%2FStockholm')
    expect(call.parse([hockeyDate]).fixtures[0]).toMatchObject({ sport: 'hockey', league: { id: '47' } })
  })
  it('truppen med skadorna från lagets senaste match; bara fotboll', () => {
    const call = calls.squad('football', '363', { season: '2026' })!
    expect(call.requests.map((r) => [r.path, r.ttlS])).toEqual([['/players/squads?team=363', 86_400], ['/injuries?team=363&season=2026', 43_200]])
    const squad = call.parse([squads, injuries])
    expect(squad).toHaveLength(7)
    expect(squad.find((p) => p.name === 'M. Fenger')).toMatchObject({ number: 2, pos: 'Defender', injury: 'Knee Injury' })
    expect(squad.find((p) => p.name === 'N. Rosenberg')?.injury).toBe('Muscle Injury')
    // Avstängningen gällde en gammal match.
    expect(squad.find((p) => p.name === 'S. Gustafson')?.injury).toBeNull()
    expect(squad.find((p) => p.name === 'J. Ingelsten')?.number).toBeNull()
    // Skadelistan kan saknas (planen, fel): truppen står ändå.
    expect(call.parse([squads, null]).every((p) => p.injury === null)).toBe(true)
    expect(calls.squad('hockey', '650', { season: '2026' })).toBeNull()
  })
  it('ligans omgång: fotbollens datumfönster; skytteligan', () => {
    const round = calls.leagueFixtures('football', '113', { season: '2026', tz: TZ, from: '2026-10-08', to: '2026-10-16' })!
    expect(round.requests[0].path).toBe('/fixtures?league=113&season=2026&from=2026-10-08&to=2026-10-16&timezone=Europe%2FStockholm')
    expect(calls.leagueFixtures('hockey', '47', { season: '2026', tz: TZ, from: 'x', to: 'y' })!.requests[0].path).toBe('/games?league=47&season=2026&timezone=Europe%2FStockholm')
    const top = calls.topScorers('football', '113', '2026')!
    expect(top.requests[0].path).toBe('/players/topscorers?league=113&season=2026')
    expect(top.parse([topscorers])).toEqual([{ rank: 1, name: 'I. Guidetti', team: 'AIK Stockholm', goals: 17 }, { rank: 2, name: 'N. Karlsson', team: 'Hammarby FF', goals: 12 }])
    expect(calls.topScorers('hockey', '47', '2026')).toBeNull()
  })
})

describe('sportapi.ai: lagsidans anrop', () => {
  const calls = teamCallsFor('sportapi')
  it('/teams/{id}: matcherna, serien och märket; bara datum = dateOnly, inget påhittat klockslag', () => {
    const call = calls.fixtures('football', '311', { season: '', tz: TZ, ttlS: 600 })!
    expect(call.requests).toEqual([{ sport: 'football', path: '/teams/311', ttlS: 600 }])
    const feed = call.parse([saTeam])
    expect(feed.leagueId).toBe('24')
    expect(feed.crest).toBe('https://a.espncdn.com/i/teamlogos/soccer/500/359.png')
    const done = feed.fixtures.filter((f) => f.status === 'finished')
    expect(done.map((f) => f.score)).toEqual([{ home: 2, away: 2 }, { home: 0, away: 1 }])
    const next = feed.fixtures.filter((f) => f.status === 'scheduled')
    expect(next.find((f) => f.away.name === 'Hull City')?.dateOnly).toBe(true)
    expect(next.find((f) => f.away.name === 'Nottingham Forest')?.dateOnly).toBeUndefined()
    expect(calls.fixtures('hockey', '1', { season: '', tz: TZ, ttlS: 1 })).toBeNull()
  })
  it('truppen, ligans omgång och skytteligan', () => {
    expect(calls.squad('football', '311', { season: '' })!.parse([saSquad]).map((p) => [p.name, p.number, p.pos])).toEqual([['David Raya', 1, 'Goalkeeper'], ['William Saliba', 2, 'Defender'], ['Declan Rice', 41, 'Midfielder'], ['Bukayo Saka', 7, 'Forward']])
    const round = calls.leagueFixtures('football', '24', { season: '', tz: TZ, from: '', to: '' })!
    expect(round.requests[0].path).toBe('/leagues/24')
    const list = round.parse([saLeague])
    expect(list.map((f) => [f.home.name, f.status, f.score])).toEqual([['Manchester United', 'finished', { home: 1, away: 1 }], ['Crystal Palace', 'scheduled', null]])
    const top = calls.topScorers('football', '24', '')!
    expect(top.requests[0].path).toBe('/leagues/24/topscorers')
    expect(top.parse([saScorers])[0]).toEqual({ rank: 1, name: 'E. Haaland', team: 'Manchester City', goals: 5 })
  })
})

describe('TheSportsDB: lagsidans anrop', () => {
  const calls = teamCallsFor('thesportsdb')
  it('senaste och nästa matcher, truppen utan ledare, ligans omgång; ingen skytteliga', () => {
    const call = calls.fixtures('football', '134004', { season: '', tz: TZ, ttlS: 900 })!
    expect(call.requests.map((r) => r.path)).toEqual(['/v1/eventslast.php?id=134004', '/v1/eventsnext.php?id=134004'])
    const feed = call.parse([tsdbLast, tsdbNext])
    expect(feed.fixtures.map((f) => [f.home.name, f.status])).toEqual([['Hammarby', 'finished'], ['BK Hacken', 'finished'], ['Hammarby', 'scheduled']])
    const squad = calls.squad('football', '134004', { season: '' })!.parse([tsdbPlayers])
    expect(squad.map((p) => p.name)).toEqual(['Oliver Dovin', 'Shaquille Pinas', 'Nahir Besara'])
    expect(squad[0].photo).toContain('dovin.png')
    expect(squad[2].number).toBeNull()
    const round = calls.leagueFixtures('football', '4347', { season: '', tz: TZ, from: '', to: '' })!
    expect(round.parse([tsdbPast, tsdbNextLeague])).toHaveLength(2)
    expect(calls.topScorers('football', '4347', '2026')).toBeNull()
  })
})
