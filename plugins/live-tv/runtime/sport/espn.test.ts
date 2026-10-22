import { beforeEach, describe, expect, it } from 'vitest'
import { __resetEspnForTests, espn, espnDatesFor, espnEventType, espnMinute, espnScoreboard, ESPN_LEAGUES, localDay } from './espn'
import type { ProviderRequest } from './provider'
import ucl from './__fixtures__/espn/ucl-scoreboard.json'
import nba from './__fixtures__/espn/nba-scoreboard.json'
import summary from './__fixtures__/espn/ucl-summary.json'
import standings from './__fixtures__/espn/epl-standings.json'

// Svensk tid (CEST) 2026-10-21: dygnet 20-10 22:00Z – 21-10 22:00Z.
const DAY_END_21 = Date.UTC(2026, 9, 21, 22, 0)
const OPTS = { today: '2026-10-21', tz: 'Europe/Stockholm', dayEndMs: DAY_END_21 }
/** Svaren i förfrågningarnas ordning: `body` för ligan `slug`, tomt för resten. */
const answer = (reqs: ProviderRequest[], slug: string, body: unknown) => reqs.map((r) => (r.path.includes(`/${slug}/`) ? body : {}))

beforeEach(() => __resetEspnForTests())

describe('ESPN: scoreboarden', () => {
  it('matcherna med lag, ställning, status, arena och liga', () => {
    const list = espnScoreboard('football', 'uefa.champions', ucl)
    expect(list).toHaveLength(3)
    expect(list[0]).toMatchObject({
      provider: 'espn', id: 'uefa.champions:401915395', sport: 'football',
      league: { id: 'uefa.champions', name: 'UEFA Champions League', season: '2026' },
      kickoff: Date.UTC(2026, 9, 21, 16, 45), status: 'finished', statusShort: 'FT', minute: null,
      home: { id: '2572', name: 'Como', crest: expect.stringContaining('espncdn.com') }, away: { name: 'Manchester United' },
      score: { home: 4, away: 1 }, venue: 'Giuseppe Sinigaglia', venueCity: 'Como',
    })
  })

  it('status: pågående, halvtid, uppskjuten och ej startad', () => {
    const ev = (name: string, state: string, clock = "67'") => ({
      leagues: [{ name: 'Allsvenskan' }],
      events: [{ id: '1', date: '2026-10-21T17:00Z', status: { displayClock: clock, type: { name, state, shortDetail: clock } },
        competitions: [{ competitors: [{ homeAway: 'home', score: '1', team: { id: '1', displayName: 'AIK' } }, { homeAway: 'away', score: '0', team: { id: '2', displayName: 'Hammarby' } }] }] }],
    })
    expect(espnScoreboard('football', 'swe.1', ev('STATUS_SECOND_HALF', 'in'))[0]).toMatchObject({ status: 'live', minute: 67, score: { home: 1, away: 0 } })
    expect(espnScoreboard('football', 'swe.1', ev('STATUS_HALFTIME', 'in', 'HT'))[0]).toMatchObject({ status: 'ht', minute: null })
    expect(espnScoreboard('football', 'swe.1', ev('STATUS_POSTPONED', 'post'))[0]).toMatchObject({ status: 'postponed', score: null })
    expect(espnScoreboard('football', 'swe.1', ev('STATUS_SCHEDULED', 'pre', '0\''))[0]).toMatchObject({ status: 'scheduled', score: null })
    // Basket och hockey har perioder, inte matchminuter.
    expect(espnScoreboard('basketball', 'nba', ev('STATUS_IN_PROGRESS', 'in', '4:12'))[0].minute).toBeNull()
  })

  it('tål okända och trasiga svar', () => {
    expect(espnScoreboard('football', 'eng.1', null)).toEqual([])
    expect(espnScoreboard('football', 'eng.1', { events: [{ id: '1' }, { date: 'x' }] })).toEqual([])
    expect(espnMinute("90'+3'")).toBe(90)
    expect(espnMinute('12:00')).toBeNull()
  })
})

describe('ESPN: dagen och livepollen', () => {
  it('ett anrop per liga och östkustdatum, och bara matcher inom det lokala dygnet', () => {
    const call = espn.day('football', '2026-10-21', OPTS)
    expect(espnDatesFor({ start: DAY_END_21 - 86_400_000, end: DAY_END_21 })).toEqual(['20261020', '20261021'])
    expect(call.requests).toHaveLength(ESPN_LEAGUES.football!.length * 2)
    expect(call.requests[0]).toMatchObject({ path: 'site/v2/sports/soccer/uefa.champions/scoreboard?dates=20261020&limit=300', ttlS: 900 })
    expect(call.requests[1].path).toContain('dates=20261021')
    // Samma svar för båda datumen: varje match en gång.
    expect(call.parse(answer(call.requests, 'uefa.champions', ucl)).map((f) => f.home.name)).toEqual(['Como', 'Lille', 'Aston Villa'])
    // Dygnet efter (svensk tid) har inga av matcherna.
    const next = espn.day('football', '2026-10-22', { ...OPTS, dayEndMs: DAY_END_21 + 86_400_000 })
    expect(next.parse(answer(next.requests, 'uefa.champions', ucl))).toEqual([])
  })

  it('NBA-matchen 01:00 svensk tid hör till nästa svenska dygn', () => {
    const call = espn.day('basketball', '2026-10-22', { today: '2026-10-22', tz: 'Europe/Stockholm', dayEndMs: DAY_END_21 + 86_400_000 })
    expect(call.parse(answer(call.requests, 'nba', nba))).toHaveLength(1)
  })

  it('livepollen frågar bara ligorna som hade matcher i dag', () => {
    const day = espn.day('football', '2026-10-21', OPTS)
    day.parse(answer(day.requests, 'uefa.champions', ucl))
    const live = espn.live('football', { today: '2026-10-21', tz: 'Europe/Stockholm' })
    expect(live.requests.length).toBeGreaterThan(0)
    expect(live.requests.every((r) => r.path.includes('/uefa.champions/scoreboard') && r.ttlS === 30)).toBe(true)
    // En ny dag: reservlistan (de största ligorna) tills dagsanropet svarat.
    const next = new Set(espn.live('football', { today: '2026-10-22', tz: 'Europe/Stockholm' }).requests.map((r) => r.path.split('/')[4]))
    expect(next.has('uefa.champions')).toBe(true)
    expect(next.size).toBeLessThan(ESPN_LEAGUES.football!.length)
  })

  it('täcker fotboll, hockey och basket; inte handboll, motorsport eller tennis', () => {
    expect(['football', 'hockey', 'basketball', 'handball', 'motorsport', 'tennis'].map((s) => espn.coverage(s as never))).toEqual(['full', 'full', 'full', 'epg', 'epg', 'epg'])
    expect(espn.keyless).toBe(true)
    // Nyårsskiftet: dygnet 1 jan svensk vintertid täcker östkustens 31 dec och 1 jan.
    expect(espnDatesFor({ start: Date.UTC(2026, 11, 31, 23), end: Date.UTC(2027, 0, 1, 23) })).toEqual(['20261231', '20270101'])
  })
})

describe('ESPN: matchcentret och tabellen', () => {
  it('summary: händelser, statistik och uppställningar med rätt sida', () => {
    const call = espn.fixture('football', 'uefa.champions:401915395', { finished: true })
    expect(call.requests).toEqual([{ sport: 'football', path: 'site/v2/sports/soccer/uefa.champions/summary?event=401915395', ttlS: -1 }])
    const d = call.parse([summary])!
    expect(d.fixture).toMatchObject({ id: 'uefa.champions:401915395', home: { name: 'Como' }, score: { home: 4, away: 1 }, venue: 'Giuseppe Sinigaglia' })
    const goals = d.events.filter((e) => e.type === 'goal')
    expect(goals[0]).toMatchObject({ minute: 2, side: 'home', player: 'Nico Paz', assist: 'Lucas Da Cunha' })
    expect(d.events.some((e) => e.type === 'card')).toBe(true)
    expect(d.fixture.lastGoal).not.toBeNull()
    expect(d.stats[0]).toEqual({ label: 'Fouls', home: '10', away: '11' })
    expect(d.lineups).toHaveLength(2)
    expect(d.lineups[0]).toMatchObject({ side: 'home', formation: '4-2-3-1' })
    expect(d.lineups[0].startXI[0]).toMatchObject({ number: 1, name: 'Jean Butez', pos: 'G' })
    expect(d.lineups[0].subs.length).toBeGreaterThan(0)
  })

  it('ett id utan liga ger inget anrop', () => {
    expect(espn.fixture('football', '401915395', { finished: true }).requests).toEqual([])
  })

  it('tabellen ur standings', () => {
    const call = espn.standings('football', 'eng.1', '2026')
    expect(call.requests[0].path).toBe('v2/sports/soccer/eng.1/standings')
    const rows = call.parse([standings])
    expect(rows[0]).toMatchObject({ rank: 1, team: { name: 'Manchester City' }, played: 7, points: 21, goalDiff: 12, group: null })
    expect(espn.standings('football', 'okand.liga', '2026').requests).toEqual([])
  })
})

describe('ESPN: granskningens fall', () => {
  it('målens undertyper räknas som mål; missad straff gör det inte', () => {
    expect(espnEventType({ type: { type: 'goal---header' } })).toBe('goal')
    expect(espnEventType({ type: { type: 'goal---free-kick' } })).toBe('goal')
    expect(espnEventType({ type: { type: 'penalty---scored' }, scoringPlay: true })).toBe('goal')
    expect(espnEventType({ type: { type: 'own-goal' } })).toBe('goal')
    expect(espnEventType({ type: { type: 'penalty---missed' } })).toBe('penalty')
    expect(espnEventType({ type: { type: 'yellow-red-card' } })).toBe('card')
    expect(espnEventType({ type: { type: 'kickoff' } })).toBeNull()
  })

  it('livepollen utan dagens svar: bara de största ligorna, inte hela katalogen', () => {
    const slugs = new Set(espn.live('football', { today: '2026-10-21', tz: 'Europe/Stockholm' }).requests.map((r) => r.path.split('/')[4]))
    expect(slugs.has('uefa.champions')).toBe(true)
    expect(slugs.has('swe.1')).toBe(true)
    expect(slugs.size).toBeLessThan(10)
    // Hockey och basket har få ligor: alla.
    expect(espn.live('hockey', { today: '2026-10-21', tz: 'Europe/Stockholm' }).requests.length).toBeGreaterThan(0)
  })

  it('sommartidsbytet: dygnet 25 oktober är 25 timmar', () => {
    const d = localDay('2026-10-25', 'Europe/Stockholm')
    expect(d.end - d.start).toBe(25 * 3_600_000)
  })

  it('en liga vars svar saknades stannar i livepollen', () => {
    const day = espn.day('football', '2026-10-21', OPTS)
    day.parse(day.requests.map((r) => (r.path.includes('/uefa.champions/') ? ucl : r.path.includes('/swe.1/') ? null : {})))
    const live = new Set(espn.live('football', { today: '2026-10-21', tz: 'Europe/Stockholm' }).requests.map((r) => r.path.split('/')[4]))
    expect([...live].sort()).toEqual(['swe.1', 'uefa.champions'])
  })
})
