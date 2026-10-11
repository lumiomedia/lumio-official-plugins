import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Budget } from './budget'
import { ResultsController } from './results-controller'
import { onGoal } from './goal-events'
import { apiSports } from './api-sports'
import { fxMatch } from './__sport-fixture'
import footballDate from './__fixtures__/api-sports/football-fixtures-date.json'
import type { SportFetchResponse, SportQuota } from './sport-fetch'

const NOW = Date.UTC(2026, 9, 10, 18) // 20:00 i Stockholm
const quota: SportQuota = { bucket: 'football', limit: 100, remaining: 80, minuteLimit: 10, minuteRemaining: 9, blockedUntil: null, reason: null, plan: 'Free' }

function controller(respond: (path: string) => Partial<SportFetchResponse>) {
  const paths: string[] = [] // bara anrop som FÅR gå uppströms (peek är cache-only)
  const fetch = vi.fn(async ({ req, mode }: { req: { path: string }; mode: string }) => {
    if (mode !== 'cache-only') paths.push(req.path)
    return { data: null, cached: false, fresh: true, fetchedAt: NOW, quota, error: null, ...respond(req.path) } as SportFetchResponse
  })
  const budget = new Budget(apiSports, 'k123', { fetch: fetch as never, now: () => NOW, sleep: async () => {} })
  budget.noteQuota(quota)
  budget.noteQuota({ ...quota, bucket: 'hockey' })
  return { c: new ResultsController(budget, { tz: 'Europe/Stockholm', now: () => NOW, startPoller: false }), paths }
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW) })
afterEach(() => { vi.useRealTimers() })

describe('ResultsController', () => {
  it('dygnsplanen: idag först, igår/imorgon en gång, och planerat räknas ned per hink', async () => {
    const { c, paths } = controller(() => ({ data: { response: [] } }))
    await c.runPlan({ sports: ['football', 'tennis'], leagues: [] })
    expect(paths).toEqual([
      '/fixtures?date=2026-10-10&timezone=Europe%2FStockholm',
      '/fixtures?date=2026-10-09&timezone=Europe%2FStockholm',
      '/fixtures?date=2026-10-11&timezone=Europe%2FStockholm',
    ])
    expect(c.budget.plannedFor('football')).toBe(0)
    await c.runPlan({ sports: ['football'], leagues: [] })
    expect(paths.length).toBe(4) // bara idag igen
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
    const budget = new Budget(apiSports, 'k123', { fetch: fetch as never, now: () => now, sleep: async () => {} })
    budget.noteQuota(quota)
    const c = new ResultsController(budget, { tz: 'Europe/Stockholm', now: () => now, startPoller: false })
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
    const { c } = controller(() => ({ data: footballDate }))
    await c.runPlan({ sports: ['football'], leagues: [] })
    const [live] = c.fixtures('football', '2026-10-10')
    c.setMerged([fxMatch({ id: 'm1', kind: 'football', start: live.kickoff, stop: live.kickoff + 7_200_000, fixture: { provider: 'api-sports', id: live.id } })])
    expect(c.status()).toMatchObject({ provider: 'api-sports', state: 'ok', remainingToday: 80, paid: false })
    expect(c.status().intervalMs).toBeGreaterThanOrEqual(15_000)
    c.budget.noteQuota({ ...quota, remaining: 0, blockedUntil: Date.UTC(2026, 9, 11), reason: 'exhausted' })
    expect(c.status()).toMatchObject({ state: 'paused', pausedUntil: Date.UTC(2026, 9, 11), intervalMs: null })
  })

  it('matchcentret: pågående omhämtning respekterar reserven och planen (som live)', async () => {
    let now = NOW
    const paths: Array<{ path: string; mode: string }> = []
    const fetch = vi.fn(async ({ req, mode }: { req: { path: string }; mode: string }) => {
      paths.push({ path: req.path, mode })
      return { data: { response: [footballDate.response[0]] }, cached: mode === 'cache-only', fresh: true, fetchedAt: now, quota: null, error: null } as SportFetchResponse
    })
    const budget = new Budget(apiSports, 'k123', { fetch: fetch as never, now: () => now, sleep: async () => {} })
    budget.noteQuota({ ...quota, remaining: 12 }) // reserven = 10
    const c = new ResultsController(budget, { tz: 'Europe/Stockholm', now: () => now, startPoller: false })
    await c.loadFixture('football', '1180001', false) // första öppningen får ta ur reserven
    now += 61_000
    budget.setPlanned('football', 1)
    await c.loadFixture('football', '1180001', false) // 11 − 1 < 10 + 1 → bara cachen
    expect(paths.map((p) => p.mode)).toEqual(['cache-first', 'cache-only'])
  })

  it('matchcentret cachas i minnet; avslutad hämtas inte om', async () => {
    const { c, paths } = controller(() => ({ data: { response: [footballDate.response[0]] } }))
    const d = await c.loadFixture('football', '1180001', true)
    expect(d?.fixture.id).toBe('1180001')
    await c.loadFixture('football', '1180001', true)
    expect(paths.filter((p) => p.startsWith('/fixtures?id=')).length).toBe(1)
  })
})
