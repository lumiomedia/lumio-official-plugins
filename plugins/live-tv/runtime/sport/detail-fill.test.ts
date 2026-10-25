import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fillFrom, findSameMatch, keepFilled, lacksDetail, sameTeam } from './detail-fill'
import { SportRouter } from './router'
import { ResultsController } from './results-controller'
import { __resetEspnForTests } from './espn'
import ucl from './__fixtures__/espn/ucl-scoreboard.json'
import summary from './__fixtures__/espn/ucl-summary.json'
import type { Fixture, FixtureDetail } from './provider'
import type { SportFetchResponse } from './sport-fetch'

const team = (name: string) => ({ id: name, name, crest: null })
const fx = (home: string, away: string, kickoff: number, provider: Fixture['provider'] = 'sportapi'): Fixture => ({
  provider, id: `${home}-${away}`, sport: 'football', league: { id: 'l', name: 'L', season: '2026', round: null, country: null },
  kickoff, status: 'finished', statusShort: 'FT', minute: null, home: team(home), away: team(away), score: { home: 1, away: 0 }, venue: null, lastGoal: null,
})
const detail = (f: Fixture, extra: Partial<FixtureDetail> = {}): FixtureDetail => ({ fixture: f, events: [], stats: [], lineups: [], ...extra })
const KO = Date.UTC(2026, 9, 21, 16, 45)

describe('samma match hos två källor', () => {
  it('lagnamn med och utan förkortningar', () => {
    expect(sameTeam('Getafe', 'Getafe CF')).toBe(true)
    expect(sameTeam('Man City', 'Manchester City')).toBe(true)
    expect(sameTeam('Bodø/Glimt', 'FK Bodo/Glimt')).toBe(true)
    expect(sameTeam('Manchester United', 'Manchester City')).toBe(false)
    expect(sameTeam('', 'AIK')).toBe(false)
  })

  it('båda lagen och avspark inom tre timmar; vända sidor känns igen', () => {
    const list = [fx('Como', 'Manchester United', KO, 'espn'), fx('Lille', 'Galatasaray', KO, 'espn')]
    expect(findSameMatch(list, fx('Como 1907', 'Manchester United', KO + 30 * 60_000))).toMatchObject({ fixture: { home: { name: 'Como' } }, swapped: false })
    expect(findSameMatch(list, fx('Galatasaray', 'Lille OSC', KO))).toMatchObject({ fixture: { home: { name: 'Lille' } }, swapped: true })
    expect(findSameMatch(list, fx('Como', 'Manchester United', KO + 5 * 3_600_000))).toBeNull()
  })
})

describe('matchcentrets delar', () => {
  const stats = [{ label: 'Fouls', home: '10', away: '11' }]
  const lineups = [{ side: 'home' as const, formation: '4-4-2', startXI: [], subs: [] }]

  it('ett nytt svar utan statistik och uppställning raderar inte de som fanns', () => {
    const prev = detail(fx('A', 'B', KO), { stats, lineups })
    const fresh = detail(fx('A', 'B', KO), { events: [{ minute: 3, extra: null, side: 'home', type: 'goal', detail: '', player: 'X', assist: null }] })
    const out = keepFilled(prev, fresh)
    expect(out.events).toHaveLength(1)
    expect(out.stats).toBe(stats)
    expect(out.lineups).toBe(lineups)
    expect(keepFilled(null, fresh)).toBe(fresh)
  })

  it('fyller från en annan källa och vänder sidorna när hemma och borta skiljer', () => {
    const other = detail(fx('B', 'A', KO, 'espn'), { stats, lineups })
    const out = fillFrom(detail(fx('A', 'B', KO)), other, true)
    expect(out.stats).toEqual([{ label: 'Fouls', home: '11', away: '10' }])
    expect(out.lineups[0].side).toBe('away')
    expect(lacksDetail(out)).toBe(false)
    expect(fillFrom(detail(fx('A', 'B', KO), { stats: [{ label: 'X', home: '1', away: '2' }] }), other, false).stats[0].label).toBe('X')
  })
})

describe('matchcentret kompletteras från ESPN', () => {
  const flag = globalThis as { __lumioNoKeylessSources?: boolean }
  const NOW = Date.UTC(2026, 9, 21, 20)
  beforeEach(() => { flag.__lumioNoKeylessSources = false; __resetEspnForTests(); vi.useFakeTimers(); vi.setSystemTime(NOW) })
  afterEach(() => { flag.__lumioNoKeylessSources = true; vi.useRealTimers() })

  it('sportapi.ai utan statistik och uppställning: ESPN fyller i, händelserna är kvar', async () => {
    const host = vi.fn(async ({ req }: { req: { path: string } }) => {
      const body = req.path.endsWith('/stats') || req.path.endsWith('/lineups')
        ? { success: true, available: false, data: null }
        : { success: true, fixture: { id: 77, home_team: 'Como', away_team: 'Manchester United', kickoff_utc: '2026-10-21T16:45:00Z', status: 'FT', home_score: 4, away_score: 1 }, events: [{ event_type: 'goal', minute: 2, team_side: 'home', player_name: 'Nico Paz' }] }
      return { data: body, cached: false, fresh: true, fetchedAt: NOW, quota: null, error: null } as SportFetchResponse
    })
    const direct = vi.fn(async ({ req }: { req: { path: string } }) => {
      const data = req.path.includes('/summary') ? summary : req.path.includes('/uefa.champions/') ? ucl : {}
      return { data, cached: false, fresh: true, fetchedAt: NOW, quota: null, error: null } as SportFetchResponse
    })
    const router = new SportRouter({ sportapi: { key: 'k12345', plan: null } }, {}, { fetch: host as never, direct: direct as never, now: () => NOW, sleep: async () => {} })
    const c = new ResultsController(router, { tz: 'Europe/Stockholm', now: () => NOW, startPoller: false })
    const d = (await c.loadFixture('football', { provider: 'sportapi', id: '77' }, true))!
    expect(d.fixture.provider).toBe('sportapi')
    expect(d.events.map((e) => e.player)).toEqual(['Nico Paz'])
    expect(d.stats.length).toBeGreaterThan(0)
    expect(d.lineups.map((l) => l.side)).toEqual(['home', 'away'])
    expect(direct.mock.calls.some(([a]) => (a as { req: { path: string } }).req.path.includes('summary?event=401915395'))).toBe(true)
  })
})

describe('repriser som tablån inte märker', () => {
  const flag = globalThis as { __lumioNoKeylessSources?: boolean }
  const NOW = Date.UTC(2026, 9, 22, 18, 10) // torsdag 20:10 i Stockholm
  beforeEach(() => { flag.__lumioNoKeylessSources = false; __resetEspnForTests(); vi.useFakeTimers(); vi.setSystemTime(NOW) })
  afterEach(() => { flag.__lumioNoKeylessSources = true; vi.useRealTimers() })

  it('en Premier League-match utan match i dag slår upp ligans vecka hos ESPN; en riktig match i dag gör det inte', async () => {
    const played = {
      leagues: [{ name: 'English Premier League', season: { year: 2026 } }],
      events: [{ id: '700', date: '2026-10-17T16:30Z', status: { type: { name: 'STATUS_FULL_TIME', state: 'post', shortDetail: 'FT' } },
        competitions: [{ competitors: [
          { homeAway: 'home', score: '0', team: { id: '361', displayName: 'Newcastle United' } },
          { homeAway: 'away', score: '1', team: { id: '362', displayName: 'Aston Villa' } }] }] }],
    }
    const direct = vi.fn(async ({ req }: { req: { path: string } }) => ({
      data: req.path.includes('/eng.1/') && req.path.includes('dates=20261017') ? played : {}, cached: false, fresh: true, fetchedAt: NOW, quota: null, error: null,
    }) as SportFetchResponse)
    const router = new SportRouter({}, {}, { direct: direct as never, now: () => NOW, sleep: async () => {} })
    const c = new ResultsController(router, { tz: 'Europe/Stockholm', now: () => NOW, startPoller: false })
    const epgMatch = (id: string, leagueKey: string, home: string, away: string) =>
      ({ id, kind: 'football', league: '', leagueKey, home, away, homeKey: home.toLowerCase(), awayKey: away.toLowerCase(), event: null, start: NOW - 30 * 60_000, stop: NOW + 90 * 60_000, status: 'live', rerun: false, round: null, venue: null, sources: [] }) as never
    const epg = [epgMatch('nu', 'premier-league', 'Newcastle', 'Aston Villa'), epgMatch('el', 'uefa-europa-league', 'Juventus', 'Rennes')]
    // Före dagens fixturer: inget uppslag.
    c.probeReplays(epg, '2026-10-22')
    expect(direct).not.toHaveBeenCalled()
    c.applyFixtures('football', '2026-10-22', [fx('Juventus', 'Rennes', NOW - 80 * 60_000, 'espn')], 'day', NOW)
    c.probeReplays(epg, '2026-10-22')
    await vi.waitFor(() => expect(c.history('2026-10-22').some((f) => f.home.name === 'Newcastle United')).toBe(true))
    const paths = direct.mock.calls.map(([a]) => (a as { req: { path: string } }).req.path)
    expect(paths.every((p) => p.includes('/eng.1/'))).toBe(true)
    expect(paths).toHaveLength(8)
    // Samma liga samma dag: inget nytt uppslag.
    c.probeReplays(epg, '2026-10-22')
    expect(direct).toHaveBeenCalledTimes(8)
  })
})

describe('ESPN-dagar och omritning', () => {
  const flag = globalThis as { __lumioNoKeylessSources?: boolean }
  const NOW = Date.UTC(2026, 9, 22, 18, 10)
  beforeEach(() => { flag.__lumioNoKeylessSources = false; __resetEspnForTests(); vi.useFakeTimers(); vi.setSystemTime(NOW) })
  afterEach(() => { flag.__lumioNoKeylessSources = true; vi.useRealTimers() })

  it('bara ESPN: i går och i morgon hämtas först när en vy visar dagen', async () => {
    const direct = vi.fn(async () => ({ data: {}, cached: false, fresh: true, fetchedAt: NOW, quota: null, error: null }) as SportFetchResponse)
    const router = new SportRouter({}, {}, { direct: direct as never, now: () => NOW, sleep: async () => {} })
    const c = new ResultsController(router, { tz: 'Europe/Stockholm', now: () => NOW, startPoller: false })
    await c.runPlan({ sports: ['hockey'], leagues: [] })
    const dates = () => new Set(direct.mock.calls.map(([a]) => /dates=(\d+)/.exec((a as { req: { path: string } }).req.path)![1]))
    // Dagens svenska dygn = östkustens 21:a och 22:a; i morgon (23:e) hämtas inte.
    expect(dates().has('20261023')).toBe(false)
    c.wantDay('2026-10-23')
    await c.runPlan({ sports: ['hockey'], leagues: [] })
    expect(dates().has('20261023')).toBe(true)
  })

  it('flera ändringar i samma omgång ger en signal till vyerna', async () => {
    const router = new SportRouter({}, {}, { now: () => NOW })
    const c = new ResultsController(router, { tz: 'Europe/Stockholm', now: () => NOW, startPoller: false })
    const cb = vi.fn()
    c.subscribe(cb)
    const v0 = c.version
    c.applyFixtures('football', '2026-10-22', [fx('A', 'B', NOW)], 'day', NOW)
    c.applyFixtures('football', '2026-10-22', [fx('C', 'D', NOW)], 'day', NOW + 1)
    expect(c.version).toBe(v0 + 2)
    expect(cb).not.toHaveBeenCalled()
    await Promise.resolve()
    expect(cb).toHaveBeenCalledTimes(1)
  })
})
