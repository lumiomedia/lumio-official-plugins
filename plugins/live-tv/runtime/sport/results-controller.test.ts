import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SportRouter } from './router'
import { ResultsController } from './results-controller'
import { sportApi } from './sportapi'
import { onGoal } from './goal-events'
import { apiSports } from './api-sports'
import { fxMatch } from './__sport-fixture'
import footballDate from './__fixtures__/api-sports/football-fixtures-date.json'
import fixtureId from './__fixtures__/api-sports/football-fixture-id.json'
import type { SportFetchResponse, SportQuota } from './sport-fetch'
import type { BudgetDeps } from './budget'
import type { Fixture } from './provider'

const API_SPORTS = { 'api-sports': { key: 'k123', plan: 'Free' } }
const routerFor = (deps: BudgetDeps, keys: Record<string, { key: string; plan: string | null }> = API_SPORTS) => new SportRouter(keys, {}, deps)

const NOW = Date.UTC(2026, 9, 10, 18) // 20:00 i Stockholm
const quota: SportQuota = { bucket: 'football', limit: 100, remaining: 80, minuteLimit: 10, minuteRemaining: 9, blockedUntil: null, reason: null, plan: 'Free' }

function controller(respond: (path: string) => Partial<SportFetchResponse>) {
  const paths: string[] = [] // bara anrop som FÅR gå uppströms (peek är cache-only)
  const fetch = vi.fn(async ({ req, mode }: { req: { path: string }; mode: string }) => {
    if (mode !== 'cache-only') paths.push(req.path)
    return { data: null, cached: false, fresh: true, fetchedAt: NOW, quota, error: null, ...respond(req.path) } as SportFetchResponse
  })
  const router = routerFor({ fetch: fetch as never, now: () => NOW, sleep: async () => {} })
  const budget = router.budget('api-sports')!
  budget.noteQuota(quota)
  budget.noteQuota({ ...quota, bucket: 'hockey' })
  return { c: new ResultsController(router, { tz: 'Europe/Stockholm', now: () => NOW, startPoller: false }), paths, budget }
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW) })
afterEach(() => { vi.useRealTimers() })

describe('ResultsController', () => {
  it('dygnsplanen: idag först, igår/imorgon en gång, och planerat räknas ned per hink', async () => {
    const { c, paths, budget } = controller(() => ({ data: { response: [] } }))
    await c.runPlan({ sports: ['football', 'tennis'], leagues: [] })
    expect(paths).toEqual([
      '/fixtures?date=2026-10-10&timezone=Europe%2FStockholm',
      '/fixtures?date=2026-10-09&timezone=Europe%2FStockholm',
      '/fixtures?date=2026-10-11&timezone=Europe%2FStockholm',
    ])
    expect(budget.plannedFor('football')).toBe(0)
    await c.runPlan({ sports: ['football'], leagues: [] })
    expect(paths.length).toBe(4) // bara idag igen
  })

  it('historiken för repriser: gårdagen ur planen, dagarna före bara ur diskcachen (inga nya anrop)', async () => {
    const modes: string[] = []
    const fetch = vi.fn(async ({ req, mode }: { req: { path: string }; mode: string }) => {
      modes.push(`${mode}:${req.path}`)
      const date = /date=([\d-]+)/.exec(req.path)?.[1]
      const cachedOld = date === '2026-10-08' || date === '2026-10-07'
      if (mode === 'cache-only' && !cachedOld) return { data: null, cached: false, fresh: false, fetchedAt: null, quota, error: null } as SportFetchResponse
      const body = JSON.parse(JSON.stringify(footballDate)) as typeof footballDate
      for (const r of body.response) r.fixture.id = Number(`${date!.replace(/-/g, '')}${r.fixture.id}`)
      return { data: body, cached: cachedOld, fresh: true, fetchedAt: NOW, quota, error: null } as SportFetchResponse
    })
    const router = routerFor({ fetch: fetch as never, now: () => NOW, sleep: async () => {} })
    router.budget('api-sports')!.noteQuota(quota)
    const c = new ResultsController(router, { tz: 'Europe/Stockholm', now: () => NOW, startPoller: false })
    await c.runPlan({ sports: ['football'], leagues: [] })
    const upstream = modes.filter((m) => !m.startsWith('cache-only'))
    expect(upstream.map((m) => /date=([\d-]+)/.exec(m)?.[1])).toEqual(['2026-10-10', '2026-10-09', '2026-10-11'])
    expect(modes.filter((m) => m.startsWith('cache-only')).map((m) => /date=([\d-]+)/.exec(m)?.[1]).sort()).toEqual(['2026-10-07', '2026-10-08', '2026-10-10'])
    const ids = c.history('2026-10-10').map((f) => f.id.slice(0, 8))
    expect([...new Set(ids)].sort()).toEqual(['20261007', '20261008', '20261009'])
    expect(c.history('2026-10-10').some((f) => f.id.startsWith('20261010') || f.id.startsWith('20261011'))).toBe(false)
  })

  it('dagens fixturer lagras, och ett mål i nästa svar ger en målhändelse', async () => {
    const { c } = controller(() => ({ data: footballDate }))
    await c.runPlan({ sports: ['football'], leagues: [] })
    expect(c.fixtures('football', '2026-10-10').map((f) => f.id)).toEqual(['1180001', '1180002'])
    const goals = vi.fn()
    const off = onGoal(goals)
    const [live] = c.fixtures('football', '2026-10-10')
    c.applyFixtures('football', '2026-10-10', [{ ...live, score: { home: 3, away: 1 } }], 'day', NOW + 500)
    expect(goals).not.toHaveBeenCalled() // dagsprogram ger aldrig MÅL!
    c.applyFixtures('football', '2026-10-10', [{ ...live, score: { home: 4, away: 1 } }], 'live', NOW + 1_000)
    off()
    expect(goals).toHaveBeenCalledTimes(1)
    expect(goals).toHaveBeenCalledWith(expect.objectContaining({ fixtureId: '1180001', side: 'home', score: { home: 4, away: 1 } }))
    expect(c.fixtures('football', '2026-10-10')).toHaveLength(2) // live-svaret ersätter, tappar inte de andra
  })

  it('ett äldre dagsprogram ur diskcachen skriver inte över nyare livedata och ger inget falskt MÅL!', async () => {
    let now = NOW
    const older = JSON.parse(JSON.stringify(footballDate)) as typeof footballDate
    older.response[0].goals = { home: 2, away: 0 } // före 2–1
    const fetch = vi.fn(async () => ({ data: older, cached: true, fresh: true, fetchedAt: NOW - 10 * 60_000, quota, error: null }) as SportFetchResponse)
    const router = routerFor({ fetch: fetch as never, now: () => now, sleep: async () => {} })
    router.budget('api-sports')!.noteQuota(quota)
    const c = new ResultsController(router, { tz: 'Europe/Stockholm', now: () => now, startPoller: false })
    const fresh = apiSports.day('football', '2026-10-10', { today: '2026-10-10', tz: 'Europe/Stockholm', dayEndMs: NOW + 6 * 3_600_000 }).parse([footballDate])
    const goals = vi.fn()
    const off = onGoal(goals)
    c.applyFixtures('football', '2026-10-10', fresh, 'live', now) // live 2–1
    now += 30_000
    await c.runPlan({ sports: ['football'], leagues: [] }) // disk 2–0, tio minuter gammal
    expect(c.fixtures('football', '2026-10-10').find((f) => f.id === '1180001')?.score).toEqual({ home: 2, away: 1 })
    now += 30_000
    c.applyFixtures('football', '2026-10-10', fresh, 'live', now) // live 2–1 igen
    c.applyFixtures('football', '2026-10-10', [{ ...fresh[0], score: { home: 3, away: 1 } }], 'live', now - 45_000) // äldre livesvar
    off()
    expect(goals).not.toHaveBeenCalled()
  })

  it('liveTargets: bara fixturer användaren bryr sig om (kopplade, följda, valda) gör en sport het', async () => {
    const { c } = controller(() => ({ data: footballDate }))
    await c.runPlan({ sports: ['football'], leagues: [] })
    // Dagsprogrammet ensamt (hela världen) gör ingenting hett.
    expect(c.liveTargets()).toEqual([])
    const [live] = c.fixtures('football', '2026-10-10')
    c.setMerged([fxMatch({ id: 'm1', kind: 'football', start: live.kickoff, stop: live.kickoff + 7_200_000, fixture: { provider: 'api-sports', id: live.id } })])
    // Fönstret räknas bara på de relevanta fixturerna (inte världens sista avspark).
    expect(c.liveTargets()).toEqual([{ sport: 'football', hot: true, windowEndsAt: live.kickoff + 7_200_000 }])
  })

  it('status: takt och kvar i dag, paus vid spärr', async () => {
    const { c, budget } = controller(() => ({ data: footballDate }))
    await c.runPlan({ sports: ['football'], leagues: [] })
    const [live] = c.fixtures('football', '2026-10-10')
    c.setMerged([fxMatch({ id: 'm1', kind: 'football', start: live.kickoff, stop: live.kickoff + 7_200_000, fixture: { provider: 'api-sports', id: live.id } })])
    expect(c.status()).toMatchObject({ provider: 'api-sports', state: 'ok', remainingToday: 80, paid: false })
    expect(c.status().intervalMs).toBeGreaterThanOrEqual(15_000)
    budget.noteQuota({ ...quota, remaining: 0, blockedUntil: Date.UTC(2026, 9, 11), reason: 'exhausted' })
    expect(c.status()).toMatchObject({ state: 'paused', pausedUntil: Date.UTC(2026, 9, 11), intervalMs: null })
  })

  it('matchcentret: pågående omhämtning respekterar reserven och planen (som live)', async () => {
    let now = NOW
    const paths: Array<{ path: string; mode: string }> = []
    const fetch = vi.fn(async ({ req, mode }: { req: { path: string }; mode: string }) => {
      paths.push({ path: req.path, mode })
      return { data: { response: [footballDate.response[0]] }, cached: mode === 'cache-only', fresh: true, fetchedAt: now, quota: null, error: null } as SportFetchResponse
    })
    const router = routerFor({ fetch: fetch as never, now: () => now, sleep: async () => {} })
    const budget = router.budget('api-sports')!
    budget.noteQuota({ ...quota, remaining: 12 }) // reserven = 10
    const c = new ResultsController(router, { tz: 'Europe/Stockholm', now: () => now, startPoller: false })
    await c.loadFixture('football', { provider: 'api-sports', id: '1180001' }, false) // första öppningen får ta ur reserven
    now += 61_000
    budget.setPlanned('football', 1)
    await c.loadFixture('football', { provider: 'api-sports', id: '1180001' }, false) // 11 − 1 < 10 + 1 → bara cachen
    expect(paths.map((p) => p.mode)).toEqual(['cache-first', 'cache-only'])
  })

  it('matchcentret cachas i minnet; avslutad hämtas inte om', async () => {
    const { c, paths } = controller(() => ({ data: { response: [footballDate.response[0]] } }))
    const d = await c.loadFixture('football', { provider: 'api-sports', id: '1180001' }, true)
    expect(d?.fixture.id).toBe('1180001')
    await c.loadFixture('football', { provider: 'api-sports', id: '1180001' }, true)
    expect(paths.filter((p) => p.startsWith('/fixtures?id=')).length).toBe(1)
  })

  it('reprisens matchinfo läses bara ur diskcachen: inget anrop uppströms, och en repris gör ingen sport het', async () => {
    const { c, paths } = controller((path) => (path.startsWith('/fixtures?id=') ? { data: fixtureId, cached: true } : {}))
    const d = await c.cachedFixture('football', { provider: 'api-sports', id: '1180001' })
    expect(d?.fixture.id).toBe('1180001')
    expect(d?.events.length).toBeGreaterThan(0)
    expect(paths).toEqual([])
    const f = { ...apiSports.day('football', '2026-10-10', { today: '2026-10-10', tz: 'Europe/Stockholm', dayEndMs: NOW + 1 }).parse([footballDate])[0], status: 'live' as const }
    c.applyFixtures('football', '2026-10-10', [f], 'live', NOW)
    c.setMerged([fxMatch({ id: 'r', kind: 'football', rerun: true, start: f.kickoff, stop: f.kickoff + 7_200_000, fixture: { provider: f.provider, id: f.id } })])
    expect(c.liveTargets()).toEqual([])
  })

  describe('flera källor samma dag', () => {
    const DAY = { today: '2026-10-10', tz: 'Europe/Stockholm', dayEndMs: NOW + 6 * 3_600_000 }
    const BOTH = { sportapi: { key: 'sk_live_1', plan: null }, 'api-sports': { key: 'k123', plan: 'Free' } }
    const two = () => new ResultsController(routerFor({ fetch: vi.fn() as never, now: () => NOW, sleep: async () => {} }, BOTH), { tz: 'Europe/Stockholm', now: () => NOW, startPoller: false })
    /** Samma match (Malmö–AIK 19:00) i båda källornas form. */
    const fromSportApi = (home: number, away: number): Fixture => ({
      ...sportApi.day('football', '2026-10-10', DAY).parse([{ success: true, data: [{ id: 13596201, home_id: 410, away_id: 412, home_team: 'Malmö FF', away_team: 'AIK', kickoff_utc: '2026-10-10T17:00:00Z', status: 'LIVE', minute: "60'", home_score: home, away_score: away, league_id: 61, league_name: 'Allsvenskan' }] }])[0],
    })
    const fromApiSports = (home: number, away: number): Fixture => ({ ...apiSports.day('football', '2026-10-10', DAY).parse([footballDate])[0], kickoff: Date.parse('2026-10-10T17:00:00Z'), home: { id: '375', name: 'Malmo FF', crest: null }, away: { id: '377', name: 'AIK Stockholm', crest: null }, score: { home, away } })

    it('samma match hos två källor blir EN rad, med den nyaste källans data', () => {
      const c = two()
      c.applyFixtures('football', '2026-10-10', [fromSportApi(1, 0)], 'live', NOW)
      c.applyFixtures('football', '2026-10-10', [fromApiSports(1, 0)], 'live', NOW + 1_000)
      const list = c.fixtures('football', '2026-10-10')
      expect(list).toHaveLength(1)
      expect(list[0].provider).toBe('api-sports')
    })

    it('källbytet ger inget falskt MÅL!; en eftersläpande källa sänker inte ställningen; ett riktigt mål räknas en gång', () => {
      const c = two()
      const goals = vi.fn()
      const off = onGoal(goals)
      c.applyFixtures('football', '2026-10-10', [fromSportApi(1, 0)], 'live', NOW)
      c.applyFixtures('football', '2026-10-10', [fromApiSports(0, 0)], 'live', NOW + 1_000) // byte till en eftersläpande källa
      c.applyFixtures('football', '2026-10-10', [fromApiSports(1, 0)], 'live', NOW + 2_000) // ikapp: samma mål, inget nytt
      expect(c.fixtures('football', '2026-10-10')[0].score).toEqual({ home: 1, away: 0 })
      expect(goals).not.toHaveBeenCalled()
      c.applyFixtures('football', '2026-10-10', [fromApiSports(2, 0)], 'live', NOW + 4_000)
      c.applyFixtures('football', '2026-10-10', [fromSportApi(2, 0)], 'live', NOW + 5_000) // tillbaka efter midnatt-liknande byte
      off()
      expect(goals).toHaveBeenCalledTimes(1)
      expect(goals.mock.calls[0][0]).toMatchObject({ provider: 'api-sports', side: 'home', score: { home: 2, away: 0 } })
      expect(goals.mock.calls[0][0].aliases).toEqual(expect.arrayContaining(['fx:sportapi:13596201', `fx:api-sports:${fromApiSports(0, 0).id}`]))
    })

    it('en match kopplad med den första källans id är fortfarande het när en annan källa levererar den', () => {
      const c = two()
      const a = fromSportApi(1, 0)
      c.applyFixtures('football', '2026-10-10', [a], 'live', NOW)
      c.applyFixtures('football', '2026-10-10', [fromApiSports(1, 0)], 'live', NOW + 1_000)
      c.setMerged([fxMatch({ id: 'm1', kind: 'football', start: a.kickoff, stop: a.kickoff + 7_200_000, fixture: { provider: 'sportapi', id: a.id } })])
      expect(c.liveTargets()).toEqual([{ sport: 'football', hot: true, windowEndsAt: a.kickoff + 7_200_000 }])
      expect(c.canonicalOf(fromApiSports(1, 0))).toEqual({ provider: 'sportapi', id: '13596201' })
    })

    it('ett svar utan ställning och minut skriver inte över en annan källas livedata (sportapi.ai LIVE/null mot API-Sports HT 0–2)', () => {
      const c = two()
      c.applyFixtures('football', '2026-10-10', [{ ...fromApiSports(0, 2), status: 'ht', minute: null }], 'live', NOW)
      const empty = { ...fromSportApi(0, 0), score: null, minute: null }
      c.applyFixtures('football', '2026-10-10', [empty], 'day', NOW + 60_000)
      expect(c.fixtures('football', '2026-10-10')[0]).toMatchObject({ provider: 'api-sports', status: 'ht', score: { home: 0, away: 2 } })
      // Slutresultatet från samma källa går igenom.
      c.applyFixtures('football', '2026-10-10', [{ ...fromSportApi(0, 2), status: 'finished', minute: null }], 'day', NOW + 120_000)
      expect(c.fixtures('football', '2026-10-10')[0]).toMatchObject({ provider: 'sportapi', status: 'finished', score: { home: 0, away: 2 } })
    })

    it('API-Sports live=all tar bara med pågående: en match som föll ur listan är slut, med sista ställningen, och gör inte sporten het', () => {
      const c = two()
      const live = fromApiSports(1, 0)
      c.applyFixtures('football', '2026-10-10', [live], 'live', NOW, 'api-sports')
      c.setMerged([fxMatch({ id: 'm1', kind: 'football', start: live.kickoff, stop: live.kickoff + 7_200_000, fixture: { provider: 'api-sports', id: live.id } })])
      expect(c.liveTargets()[0]).toMatchObject({ hot: true })
      c.applyFixtures('football', '2026-10-10', [], 'live', NOW + 15_000, 'api-sports')
      expect(c.fixtures('football', '2026-10-10')[0]).toMatchObject({ status: 'finished', score: { home: 1, away: 0 }, minute: null })
      expect(c.liveTargets()).toEqual([])
    })

    it('sportapi.ai:s live är hela dagen: en match som saknas i svaret rörs inte', () => {
      const c = two()
      c.applyFixtures('football', '2026-10-10', [fromSportApi(1, 0)], 'live', NOW, 'sportapi')
      c.applyFixtures('football', '2026-10-10', [], 'live', NOW + 60_000, 'sportapi')
      expect(c.fixtures('football', '2026-10-10')[0]).toMatchObject({ status: 'live' })
    })

    describe('tabellen (Allsvenskan · Omgång 23 visade bara rubrikraden)', () => {
      // API-Sports gratisplan ger inte säsong 2026 ({"errors":{"plan":…}} → upstream); sportapi.ai har ligan som 21.
      const sportApiTable = { success: true, data: [
        { position: 1, team: { id: 262, name: 'Djurgården', logo: 'swedish-allsvenskan--djurgarden.svg' }, played: 14, points: 31, goal_difference: 21, form: [{ result: 'W' }, { result: 'L' }] },
        { position: 2, team: { id: 251, name: 'Hammarby', logo: 'espn-2495.png' }, played: 12, points: 26, goal_difference: 17, form: [{ result: 'W' }] },
      ] }
      const LEAGUES = { success: true, data: [{ country: 'Sweden', leagues: [{ id: 21, name: 'Swedish Allsvenskan', has_standings: true }] }] }
      function both(apiStandings: Partial<SportFetchResponse>, leagues: unknown = LEAGUES) {
        const paths: string[] = []
        const fetch = vi.fn(async ({ provider, req, mode }: { provider: string; req: { path: string }; mode: string }) => {
          if (mode !== 'cache-only') paths.push(`${provider}${req.path}`)
          const base = { data: null, cached: false, fresh: true, fetchedAt: NOW, quota: null, error: null }
          if (req.path.startsWith('/standings?')) return { ...base, ...apiStandings } as SportFetchResponse
          if (req.path === '/standings/21') return { ...base, data: sportApiTable } as SportFetchResponse
          if (req.path === '/leagues') return { ...base, data: leagues } as SportFetchResponse
          return base as SportFetchResponse
        })
        const router = routerFor({ fetch: fetch as never, now: () => NOW, sleep: async () => {} }, BOTH)
        router.budget('sportapi')!.noteQuota({ ...quota, limit: 2000, remaining: 1500 })
        router.budget('api-sports')!.noteQuota(quota)
        const c = new ResultsController(router, { tz: 'Europe/Stockholm', now: () => NOW, startPoller: false })
        // Samma match hos båda källorna: sportapi.ai:s liga 21, API-Sports liga 113 säsong 2026.
        c.applyFixtures('football', '2026-10-10', [{ ...fromSportApi(1, 0), league: { id: '21', name: 'Swedish Allsvenskan', season: 'current', round: null, country: 'Sweden' } }], 'day', NOW)
        c.applyFixtures('football', '2026-10-10', [{ ...fromApiSports(1, 0), league: { id: '113', name: 'Allsvenskan', season: '2026', round: 23, country: 'Sweden' } }], 'live', NOW + 1_000)
        return { c, paths }
      }

      it('API-Sports svarar med fel: tabellen hämtas hos sportapi.ai för samma liga, och en andra öppning kostar inget', async () => {
        const { c, paths } = both({ error: 'upstream' })
        const rows = await c.loadStandings('football', '113', '2026')
        expect(rows?.map((r) => r.team.name)).toEqual(['Djurgården', 'Hammarby'])
        expect(rows?.[0]).toMatchObject({ rank: 1, played: 14, points: 31, form: 'WL' })
        expect(c.standings('football', '113', '2026')).toHaveLength(2)
        // Radernas lag-id är sportapi.ai:s: en rad som öppnar lagets sida måste veta det.
        expect(c.standingsSource('football', '113', '2026')).toEqual({ provider: 'sportapi', leagueId: '21', season: 'current' })
        expect(paths).toEqual(['api-sports/standings?league=113&season=2026', 'sportapi/standings/21'])
        paths.length = 0
        expect(await c.loadStandings('football', '113', '2026')).toHaveLength(2)
        expect(paths).toEqual([])
      })

      it('en tom tabell räknas som saknad: nästa källa, och den tomma källan frågas inte om igen på ett tag', async () => {
        const { c, paths } = both({ data: { errors: [], response: [] } })
        expect(await c.loadStandings('football', '113', '2026')).toHaveLength(2)
        expect(paths).toEqual(['api-sports/standings?league=113&season=2026', 'sportapi/standings/21'])
        expect(c.standings('football', '113', '2026')).toHaveLength(2)
      })

      it('utan känd motsvarighet: ligan letas upp på namn och land i sportapi.ai:s ligalista (en gång), sedan dess tabell', async () => {
        const { c, paths } = both({ error: 'upstream' })
        ;(c as unknown as { leagueAliases: Map<string, unknown> }).leagueAliases.clear()
        expect((await c.loadStandings('football', '113', '2026'))?.map((r) => r.team.name)).toEqual(['Djurgården', 'Hammarby'])
        expect(paths).toEqual(['api-sports/standings?league=113&season=2026', 'sportapi/leagues', 'sportapi/standings/21'])
      })

      it('ingen källa har tabellen: tomt (vyn säger det), och felet hämtas inte om vid nästa tryck', async () => {
        const { c, paths } = both({ error: 'upstream' }, { success: true, data: [] })
        ;(c as unknown as { leagueAliases: Map<string, unknown> }).leagueAliases.clear()
        expect(await c.loadStandings('football', '113', '2026')).toEqual([])
        expect(paths).toEqual(['api-sports/standings?league=113&season=2026', 'sportapi/leagues'])
        paths.length = 0
        expect(await c.loadStandings('football', '113', '2026')).toEqual([])
        expect(paths).toEqual([])
      })
    })

    it('takraden säger vilken källa sporten faktiskt använder', () => {
      const c = two()
      c.router.budget('sportapi')!.noteQuota({ ...quota, limit: 2000, remaining: 1500 })
      expect(c.status('football')).toMatchObject({ provider: 'sportapi', multi: true, state: 'ok' })
      expect(c.status('hockey')).toMatchObject({ provider: 'api-sports' })
      c.router.budget('sportapi')!.noteQuota({ ...quota, limit: 2000, remaining: 0, blockedUntil: Date.UTC(2026, 9, 11), reason: 'exhausted' })
      expect(c.status('football')).toMatchObject({ provider: 'api-sports', state: 'ok' })
    })
  })
})
