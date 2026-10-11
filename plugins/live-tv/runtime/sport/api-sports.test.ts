// runtime/sport/api-sports.test.ts
import { describe, expect, it } from 'vitest'
import { apiSports, roundNumber } from './api-sports'
import footballDate from './__fixtures__/api-sports/football-fixtures-date.json'
import footballLive from './__fixtures__/api-sports/football-fixtures-live.json'
import footballId from './__fixtures__/api-sports/football-fixture-id.json'
import footballStandings from './__fixtures__/api-sports/football-standings.json'
import footballSearch from './__fixtures__/api-sports/football-teams-search.json'
import hockeyDate from './__fixtures__/api-sports/hockey-games-date.json'
import hockeyEvents from './__fixtures__/api-sports/hockey-games-events.json'
import hockeyStandings from './__fixtures__/api-sports/hockey-standings.json'
import status from './__fixtures__/api-sports/status.json'

const DAY = { today: '2026-10-10', tz: 'Europe/Stockholm', dayEndMs: Date.UTC(2026, 9, 10, 22) }

describe('api-sports: täckning och hinkar', () => {
  it('fotboll, hockey, basket och handboll täcks; tennis och motorsport är bara EPG', () => {
    expect(['football', 'hockey', 'basketball', 'handball'].map((s) => apiSports.coverage(s as never))).toEqual(['full', 'full', 'full', 'full'])
    expect(apiSports.coverage('tennis')).toBe('epg')
    expect(apiSports.coverage('motorsport')).toBe('epg')
  })
  it('en hink per sport-API', () => {
    expect(apiSports.bucket('football')).toBe('football')
    expect(apiSports.bucket('hockey')).toBe('hockey')
  })
})

describe('api-sports: förfrågningar', () => {
  it('dagsprogram: idag 15 min, igår slutgiltigt efter dygnets slut + 3 h, imorgon 6 h', () => {
    expect(apiSports.day('football', '2026-10-10', DAY).requests).toEqual([{ sport: 'football', path: '/fixtures?date=2026-10-10&timezone=Europe%2FStockholm', ttlS: 900 }])
    const y = apiSports.day('hockey', '2026-10-09', { ...DAY, dayEndMs: Date.UTC(2026, 9, 9, 22) }).requests[0]
    expect(y).toEqual({ sport: 'hockey', path: '/games?date=2026-10-09&timezone=Europe%2FStockholm', ttlS: 21600, finalAfter: Date.UTC(2026, 9, 10, 1) })
    expect(apiSports.day('football', '2026-10-11', DAY).requests[0].finalAfter).toBeUndefined()
  })
  it('live: fotboll ett allt-live-anrop, hockey dagens matcher; TTL 10 s', () => {
    expect(apiSports.live('football', DAY).requests).toEqual([{ sport: 'football', path: '/fixtures?live=all&timezone=Europe%2FStockholm', ttlS: 10 }])
    expect(apiSports.live('hockey', DAY).requests).toEqual([{ sport: 'hockey', path: '/games?date=2026-10-10&timezone=Europe%2FStockholm', ttlS: 10 }])
  })
  it('matchcenter: fotboll ETT anrop, hockey två; avslutad cachas för alltid', () => {
    expect(apiSports.fixture('football', '1180001', { finished: false }).requests).toEqual([{ sport: 'football', path: '/fixtures?id=1180001', ttlS: 60 }])
    expect(apiSports.fixture('hockey', '51001', { finished: true }).requests).toEqual([
      { sport: 'hockey', path: '/games?id=51001', ttlS: -1 },
      { sport: 'hockey', path: '/games/events?game=51001', ttlS: -1 },
    ])
  })
  it('tabell 24 h, sök kräver tre tecken, status kostar inget', () => {
    expect(apiSports.standings('football', '113', '2026').requests).toEqual([{ sport: 'football', path: '/standings?league=113&season=2026', ttlS: 86400 }])
    expect(apiSports.searchTeams('football', 'ma').requests).toEqual([])
    expect(apiSports.validateKey().requests).toEqual([{ sport: 'football', path: '/status', ttlS: 0 }])
    expect(apiSports.quotaProbe('hockey')?.requests).toEqual([{ sport: 'hockey', path: '/status', ttlS: 0 }])
  })
})

describe('api-sports: tolkning', () => {
  it('fotbollens dagsprogram', () => {
    const [live, later] = apiSports.day('football', '2026-10-10', DAY).parse([footballDate])
    expect(live).toMatchObject({
      provider: 'api-sports', id: '1180001', sport: 'football', kickoff: 1791651600000, status: 'live', statusShort: '2H', minute: 67,
      league: { id: '113', name: 'Allsvenskan', season: '2026', round: 27, country: 'Sweden' },
      home: { id: '375', name: 'Malmo FF', crest: 'https://media.api-sports.io/football/teams/375.png' },
      away: { id: '377', name: 'Djurgardens IF' }, score: { home: 2, away: 1 }, venue: 'Eleda Stadion',
    })
    expect(later).toMatchObject({ id: '1180002', status: 'scheduled', minute: null, score: null })
  })
  it('live-svaret bär senaste målet', () => {
    const [f] = apiSports.live('football', DAY).parse([footballLive])
    expect(f.lastGoal).toEqual({ side: 'home', player: 'S. Larsson', minute: 67 })
  })
  it('matchcentret i fotboll: händelser, statistik, uppställningar', () => {
    const d = apiSports.fixture('football', '1180001', { finished: false }).parse([footballId])!
    expect(d.events.map((e) => [e.minute, e.type, e.side, e.player])).toEqual([
      [12, 'goal', 'home', 'I. Kiese Thelin'], [29, 'card', 'away', 'M. Danielson'], [34, 'goal', 'away', 'T. Asoro'], [67, 'goal', 'home', 'S. Larsson'],
    ])
    expect(d.stats).toEqual([
      { label: 'Ball Possession', home: '58%', away: '42%' },
      { label: 'Total Shots', home: '14', away: '7' },
      { label: 'Shots on Goal', home: '6', away: '0' },
    ])
    expect(d.lineups[0]).toMatchObject({ side: 'home', formation: '4-3-3', startXI: [{ number: 1, name: 'J. Dahlin', pos: 'G' }, { number: 9, name: 'I. Kiese Thelin', pos: 'F' }], subs: [{ number: 20, name: 'O. Berg', pos: 'M' }] })
    // Spelarbild och arenans stad följer med i samma svar — inga extra anrop.
    expect(d.lineups[0]!.startXI[1]!.photo).toBe('https://media.api-sports.io/football/players/1001.png')
    expect(d.fixture.venueCity).toBe('Malmö')
  })
  it('hockeyns dagsprogram och händelser (minut räknas över perioderna)', () => {
    const [g, ns] = apiSports.day('hockey', '2026-10-10', DAY).parse([hockeyDate])
    expect(g).toMatchObject({ id: '51001', sport: 'hockey', status: 'live', statusShort: 'P2', minute: 14, score: { home: 1, away: 2 }, league: { id: '47', name: 'SHL', season: '2026' } })
    expect(ns).toMatchObject({ status: 'scheduled', score: null })
    const d = apiSports.fixture('hockey', '51001', { finished: false }).parse([{ response: [hockeyDate.response[0]] }, hockeyEvents])!
    expect(d.events.map((e) => [e.minute, e.type, e.side, e.player, e.assist])).toEqual([
      [5, 'goal', 'home', 'J. Omark', 'K. Fransson'], [17, 'goal', 'away', 'R. Lindholm', null],
      [28, 'penalty', 'away', 'M. Elfström', null], [32, 'goal', 'away', 'L. Lindgren', 'J. Persson'],
    ])
    expect(d.stats).toEqual([])
    expect(d.lineups).toEqual([])
  })
  it('tabeller med form', () => {
    expect(apiSports.standings('football', '113', '2026').parse([footballStandings])[1]).toEqual({ rank: 2, team: { id: '375', name: 'Malmo FF', crest: 'https://media.api-sports.io/football/teams/375.png' }, played: 26, points: 55, goalDiff: 30, form: 'WLWWD', group: 'Allsvenskan' })
    expect(apiSports.standings('hockey', '47', '2026').parse([hockeyStandings])[0]).toMatchObject({ rank: 1, played: 10, points: 24, goalDiff: 17, form: 'WWLWW', group: 'SHL' })
  })
  it('lagsök och nyckelkontroll', () => {
    expect(apiSports.searchTeams('football', 'malmo').parse([footballSearch])).toEqual([{ id: '375', name: 'Malmo FF', crest: 'https://media.api-sports.io/football/teams/375.png', country: 'Sweden' }])
    expect(apiSports.validateKey().parse([status])).toEqual({ ok: true, plan: 'Free', used: 12, limit: 100 })
    expect(apiSports.validateKey().parse([null])).toEqual({ ok: false, plan: null, used: null, limit: null })
  })
  it('tomma eller trasiga kroppar ger tomma listor, aldrig undantag', () => {
    expect(apiSports.day('football', '2026-10-10', DAY).parse([null])).toEqual([])
    expect(apiSports.fixture('football', '1', { finished: false }).parse([{ response: [] }])).toBeNull()
    expect(roundNumber('Regular Season - 27')).toBe(27)
    expect(roundNumber('Quarter-finals')).toBeNull()
  })
})

describe('api-sports searchLeagues', () => {
  it('leagues?search= (minst 3 tecken), tolkar fotboll och övriga sporter', async () => {
    const { apiSports } = await import('./api-sports')
    expect(apiSports.searchLeagues!('football', 'se').requests).toEqual([])
    const fb = apiSports.searchLeagues!('football', 'serie')
    expect(fb.requests).toEqual([{ sport: 'football', path: '/leagues?search=serie', ttlS: 604800 }])
    expect(fb.parse([{ response: [{ league: { id: 135, name: 'Serie A', logo: 'l.png' }, country: { name: 'Italy' } }] }])).toEqual([{ id: '135', name: 'Serie A', crest: 'l.png', country: 'Italy' }])
    expect(apiSports.searchLeagues!('hockey', 'shl').parse([{ response: [{ id: 47, name: 'SHL', logo: null, country: { name: 'Sweden' } }] }])).toEqual([{ id: '47', name: 'SHL', crest: null, country: 'Sweden' }])
  })
})
