// runtime/sport/sportapi.test.ts
import { describe, expect, it } from 'vitest'
import { sportApi, sportApiCrest, sportApiMinute } from './sportapi'
import date from './__fixtures__/sportapi/fixtures-date.json'
import detail from './__fixtures__/sportapi/fixture-id.json'
import stats from './__fixtures__/sportapi/fixture-stats.json'
import lineups from './__fixtures__/sportapi/fixture-lineups.json'
import standings from './__fixtures__/sportapi/standings.json'
import leagues from './__fixtures__/sportapi/leagues.json'

// Svarsformerna kommer ur sportapi.ai/docs (2026-10-11) och är INTE verifierade med en riktig nyckel.
const DAY = { today: '2026-10-10', tz: 'Europe/Stockholm', dayEndMs: Date.UTC(2026, 9, 10, 22) }

describe('sportapi.ai: täckning, hink och golv', () => {
  it('bara fotboll; en dygnshink; livegolv en minut (källan uppdaterar varje minut)', () => {
    expect(sportApi.id).toBe('sportapi')
    expect(sportApi.coverage('football')).toBe('full')
    for (const s of ['hockey', 'basketball', 'handball', 'motorsport', 'tennis'] as const) expect(sportApi.coverage(s)).toBe('epg')
    expect(sportApi.bucket('football')).toBe('football')
    expect(sportApi.liveFloorMs).toBe(60_000)
  })
})

describe('sportapi.ai: förfrågningar', () => {
  it('dagsprogram per datum; igår slutgiltigt efter dygnets slut + 3 h', () => {
    expect(sportApi.day('football', '2026-10-10', DAY).requests).toEqual([{ sport: 'football', path: '/fixtures/date/2026-10-10', ttlS: 900 }])
    const y = sportApi.day('football', '2026-10-09', { ...DAY, dayEndMs: Date.UTC(2026, 9, 9, 22) }).requests[0]
    expect(y).toEqual({ sport: 'football', path: '/fixtures/date/2026-10-09', ttlS: 21_600, finalAfter: Date.UTC(2026, 9, 10, 1) })
  })
  it('live: ingen liveväg finns, så dagens datum med kort TTL (samma cachepost som dagsprogrammet)', () => {
    expect(sportApi.live('football', DAY).requests).toEqual([{ sport: 'football', path: '/fixtures/date/2026-10-10', ttlS: 30 }])
  })
  it('matchcenter: match+händelser, statistik och uppställningar; avslutad cachas för alltid', () => {
    expect(sportApi.fixture('football', '13596176', { finished: true }).requests).toEqual([
      { sport: 'football', path: '/fixtures/13596176', ttlS: -1 },
      { sport: 'football', path: '/fixtures/13596176/stats', ttlS: -1 },
      { sport: 'football', path: '/fixtures/13596176/lineups', ttlS: -1 },
    ])
    const live = sportApi.fixture('football', '13596176', { finished: false }).requests
    expect(live.map((r) => r.ttlS)).toEqual([60, 60, 600])
  })
  it('tabell 24 h (säsongen ignoreras); lagsök finns inte (inget anrop); ligasök läser ligalistan, cachad en vecka', () => {
    expect(sportApi.standings('football', '24', 'current').requests).toEqual([{ sport: 'football', path: '/standings/24', ttlS: 86_400 }])
    expect(sportApi.searchTeams('football', 'arsenal').requests).toEqual([])
    expect(sportApi.searchLeagues!('football', 'pre').requests).toEqual([{ sport: 'football', path: '/leagues', ttlS: 604_800 }])
    expect(sportApi.searchLeagues!('football', 'pr').requests).toEqual([])
    expect(sportApi.quotaProbe('football')).toBeNull()
    expect(sportApi.teamArt('football', '1')).toBeNull()
  })
  it('validering: ett räknat anrop mot ligalistan (källan saknar statusväg)', () => {
    const v = sportApi.validateKey()
    expect(v.requests).toEqual([{ sport: 'football', path: '/leagues', ttlS: 0 }])
    expect(v.parse([leagues])).toEqual({ ok: true, plan: null, used: null, limit: null })
    expect(v.parse([{ success: false, message: 'Invalid API key' }]).ok).toBe(false)
  })
})

describe('sportapi.ai: tolkning', () => {
  const list = sportApi.day('football', '2026-10-10', DAY).parse([date])

  it('dagsprogrammet: id, avspark (UTC), status, ställning, liga och lag', () => {
    expect(list).toHaveLength(4)
    expect(list[0]).toMatchObject({
      provider: 'sportapi', id: '13596176', sport: 'football', kickoff: Date.parse('2026-10-10T11:30:00Z'), status: 'finished', statusShort: 'FT', minute: null,
      league: { id: '24', name: 'Premier League', season: 'current', round: null, country: 'England' },
      home: { id: '311', name: 'Arsenal', crest: 'https://a.espncdn.com/i/teamlogos/soccer/500/359.png' },
      away: { id: '352', name: 'Leeds United' },
      score: { home: 2, away: 1 }, venue: null, lastGoal: null,
    })
    expect(list[1]).toMatchObject({ status: 'live', statusShort: 'LIVE', minute: 67, score: { home: 1, away: 0 } })
    expect(list[2]).toMatchObject({ status: 'scheduled', score: null, home: { crest: null }, away: { crest: 'https://example.invalid/hammarby.png' } })
    expect(list[3].status).toBe('postponed')
  })

  it('minuten och märkena', () => {
    expect(sportApiMinute("67'")).toEqual({ minute: 67, extra: null })
    expect(sportApiMinute("90+3'")).toEqual({ minute: 90, extra: 3 })
    expect(sportApiMinute(null)).toEqual({ minute: null, extra: null })
    expect(sportApiCrest('espn-382.png')).toBe('https://a.espncdn.com/i/teamlogos/soccer/500/382.png')
    expect(sportApiCrest('')).toBeNull()
    expect(sportApiCrest('../x.png')).toBeNull()
  })

  it('matchcentret: händelser, statistik med API-Sports etiketter, uppställningar och arena', () => {
    const d = sportApi.fixture('football', '13596176', { finished: true }).parse([detail, stats, lineups])!
    expect(d.fixture).toMatchObject({ id: '13596176', status: 'finished', venue: 'Emirates Stadium', venueCity: 'London', score: { home: 2, away: 1 } })
    expect(d.fixture.lastGoal).toEqual({ side: 'home', player: 'V. Gyökeres', minute: 90 })
    expect(d.events.map((e) => [e.type, e.side, e.minute, e.extra, e.player])).toEqual([
      ['goal', 'home', 23, null, 'B. Saka'],
      ['card', 'away', 41, null, 'E. Ampadu'],
      ['goal', 'away', 55, null, 'J. Justin'],
      ['sub', 'home', 82, null, 'P. Hincapié'],
      ['goal', 'home', 90, 3, 'V. Gyökeres'],
    ])
    expect(d.stats.slice(0, 3)).toEqual([
      { label: 'Total Shots', home: '13', away: '11' },
      { label: 'Shots on Goal', home: '6', away: '5' },
      { label: 'Shots off Goal', home: '7', away: '6' },
    ])
    expect(d.stats.find((s) => s.label === 'Passes %')).toEqual({ label: 'Passes %', home: '85.3%', away: '78.9%' })
    expect(d.lineups).toEqual([
      { side: 'home', formation: null, startXI: [{ number: 1, name: 'David Raya', pos: 'Goalkeeper', photo: null }], subs: [{ number: 5, name: 'P. Hincapié', pos: null, photo: null }] },
    ])
  })

  it('matchcentret klarar saknad statistik och uppställning (svarar null eller available:false)', () => {
    const d = sportApi.fixture('football', '13596176', { finished: false }).parse([detail, null, { success: true, available: false, data: null }])!
    expect(d.stats).toEqual([])
    expect(d.lineups).toEqual([])
    expect(sportApi.fixture('football', '1', { finished: false }).parse([{ success: false }, null, null])).toBeNull()
  })

  it('tabellen: placering, poäng, målskillnad och form', () => {
    const rows = sportApi.standings('football', '24', 'current').parse([standings])
    expect(rows[0]).toEqual({ rank: 1, team: { id: '324', name: 'Manchester City', crest: 'https://a.espncdn.com/i/teamlogos/soccer/500/382.png' }, played: 5, points: 15, goalDiff: 8, form: 'WW', group: null })
    expect(rows[1].form).toBeNull()
  })

  it('ligasök filtrerar ligalistan lokalt (accentokänsligt, namn eller land)', () => {
    const hits = sportApi.searchLeagues!('football', 'allsven').parse([leagues])
    expect(hits).toEqual([{ id: '61', name: 'Allsvenskan', crest: null, country: 'Sweden' }])
    expect(sportApi.searchLeagues!('football', 'england').parse([leagues]).map((h) => h.id)).toEqual(['24'])
  })
})
