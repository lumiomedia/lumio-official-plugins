// runtime/sport/team-data.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SportRouter } from './router'
import { __resetTeamDataForTests, loadLeaguePage, loadTeamPage, type TeamPageData } from './team-data'
import type { TeamTarget } from './team-model'
import type { ProviderId } from './provider'
import type { FetchMode, SportFetchResponse } from './sport-fetch'
import type { ProviderKeys } from './sport-store'
import teamFixtures from './__fixtures__/api-sports/football-fixtures-team.json'
import allsvenskan from './__fixtures__/api-sports/football-standings-allsvenskan.json'
import squads from './__fixtures__/api-sports/football-players-squads.json'
import injuries from './__fixtures__/api-sports/football-injuries.json'
import topscorers from './__fixtures__/api-sports/football-topscorers.json'
import search from './__fixtures__/api-sports/football-teams-search.json'
import saTeam from './__fixtures__/sportapi/team.json'
import saSquad from './__fixtures__/sportapi/team-squad.json'
import saStandings from './__fixtures__/sportapi/standings.json'
import saLeague from './__fixtures__/sportapi/league.json'
import saScorers from './__fixtures__/sportapi/league-topscorers.json'

const NOW = Date.UTC(2026, 9, 12, 10)
const TZ = 'Europe/Stockholm'
const API: ProviderKeys = { 'api-sports': { key: 'aaaa1111', plan: 'Free' } }
const BOTH: ProviderKeys = { sportapi: { key: 'sk_live_1', plan: null }, ...API }

type Call = { provider: ProviderId; path: string; mode: FetchMode; ttl: number }
type Reply = (c: Call) => Partial<SportFetchResponse> | undefined

/** Svar per källa och sökväg; okända vägar = tomt svar. `/status` (kvotprobet) räknas inte i `calls`. */
function harness(keys: ProviderKeys, reply: Reply) {
  const calls: Call[] = []
  const fetch = vi.fn(async ({ provider, req, mode }: { provider: ProviderId; req: { path: string; ttlS: number }; mode: FetchMode }) => {
    const c = { provider, path: req.path, mode, ttl: req.ttlS }
    if (req.path !== '/status') calls.push(c)
    return { data: null, cached: false, fresh: true, fetchedAt: NOW, quota: null, error: null, ...(reply(c) ?? {}) } as SportFetchResponse
  })
  const router = new SportRouter(keys, {}, { fetch: fetch as never, now: () => NOW, sleep: async () => {} })
  return { router, calls }
}

const net = (calls: Call[]) => calls.filter((c) => c.mode === 'cache-first').map((c) => `${c.provider} ${c.path}`)

const HAMMARBY: TeamTarget = { sport: 'football', name: 'Hammarby', key: 'hammarby', crest: null, ids: { 'api-sports': '363' }, league: { provider: 'api-sports', id: '113', season: '2026', name: 'Allsvenskan' } }

const apiReply: Reply = (c) => {
  if (c.mode === 'cache-only') return {}
  if (c.path.startsWith('/fixtures?team=363')) return { data: teamFixtures }
  if (c.path.startsWith('/standings?league=113')) return { data: allsvenskan }
  if (c.path.startsWith('/players/squads')) return { data: squads }
  if (c.path.startsWith('/injuries')) return { data: injuries }
  if (c.path.startsWith('/teams?search=')) return { data: search }
  if (c.path.startsWith('/players/topscorers')) return { data: topscorers }
  return {}
}

beforeEach(() => __resetTeamDataForTests())

describe('lagsidan: anropen', () => {
  it('matcherna (en säsong), tabellen (3 h) och truppen med skador — inget annat', async () => {
    const { router, calls } = harness(API, apiReply)
    const updates: TeamPageData[] = []
    const data = await loadTeamPage(router, HAMMARBY, { now: NOW, tz: TZ, onUpdate: (d) => updates.push(d) })
    expect(net(calls)).toEqual([
      'api-sports /fixtures?team=363&season=2026&timezone=Europe%2FStockholm',
      'api-sports /standings?league=113&season=2026',
      'api-sports /players/squads?team=363',
      'api-sports /injuries?team=363&season=2026',
    ])
    expect(calls.find((c) => c.path.startsWith('/standings'))?.ttl).toBe(3 * 3600)
    expect(data).toMatchObject({ state: 'ready', provider: 'api-sports', teamId: '363', league: { id: '113', season: '2026' } })
    expect(data.fixtures).toHaveLength(8)
    expect(data.standings).toHaveLength(8)
    expect(data.squad?.find((p) => p.name === 'M. Fenger')?.injury).toBe('Knee Injury')
    // Sektionerna kommer allt eftersom.
    expect(updates[0].fixtures).toHaveLength(8)
    expect(updates[0].standings).toBeNull()
  })

  it('matcherna ur cachen gäller till nästa match: TTL:n räknas ur postens ålder', async () => {
    const fetchedAt = NOW - 3_600_000
    const { router, calls } = harness(API, (c) => (c.path.startsWith('/fixtures?team=') ? { data: teamFixtures, fetchedAt, cached: true } : apiReply(c)))
    await loadTeamPage(router, HAMMARBY, { now: NOW, tz: TZ, onUpdate: () => {} })
    const peek = calls.find((c) => c.path.startsWith('/fixtures?team=') && c.mode === 'cache-only')
    const real = calls.find((c) => c.path.startsWith('/fixtures?team=') && c.mode === 'cache-first')
    expect(peek).toBeTruthy()
    // Nästa match (cupen, 2026-10-14 14:00) + 2,5 h, räknat från hämtningen.
    expect(real!.ttl).toBe(Math.round((Date.UTC(2026, 9, 14, 12) + 2.5 * 3_600_000 - fetchedAt) / 1000))
  })

  it('samma sida igen inom några minuter: inga nya anrop', async () => {
    const { router, calls } = harness(API, apiReply)
    await loadTeamPage(router, HAMMARBY, { now: NOW, tz: TZ, onUpdate: () => {} })
    const n = net(calls).length
    await loadTeamPage(router, HAMMARBY, { now: NOW + 60_000, tz: TZ, onUpdate: () => {} })
    expect(net(calls)).toHaveLength(n)
  })

  it('id saknas: ETT lagsök, och id:t lämnas tillbaka för att sparas på posten', async () => {
    const { router, calls } = harness(API, (c) => (c.path.startsWith('/fixtures?team=375&') ? { data: teamFixtures } : apiReply(c)))
    const onResolved = vi.fn()
    await loadTeamPage(router, { ...HAMMARBY, name: 'Malmö', key: 'malmo', ids: {}, league: null }, { now: NOW, tz: TZ, onUpdate: () => {}, onResolved })
    expect(net(calls).filter((c) => c.includes('/teams?search='))).toEqual(['api-sports /teams?search=Malm%C3%B6'])
    expect(onResolved).toHaveBeenCalledWith('api-sports', '375')
  })

  it('en ensam orelaterad sökträff tas inte: inget id, inga fler anrop för laget', async () => {
    const { router, calls } = harness(API, apiReply)
    const onResolved = vi.fn()
    const data = await loadTeamPage(router, { ...HAMMARBY, name: 'Manchester United', key: 'manchester united', ids: {}, league: null }, { now: NOW, tz: TZ, onUpdate: () => {}, onResolved })
    expect(onResolved).not.toHaveBeenCalled()
    expect(net(calls)).toEqual(['api-sports /teams?search=Manchester%20United'])
    expect(data).toMatchObject({ state: 'ready', fixtures: [], squad: null })
  })

  it('sportapi.ai först för fotboll: lagets sida, serien ur svaret, truppen; API-Sports rörs inte', async () => {
    const { router, calls } = harness(BOTH, (c) => {
      if (c.mode === 'cache-only') return {}
      if (c.provider !== 'sportapi') return { data: null }
      if (c.path === '/teams/311') return { data: saTeam }
      if (c.path === '/standings/24') return { data: saStandings }
      if (c.path === '/teams/311/squad') return { data: saSquad }
      return {}
    })
    const data = await loadTeamPage(router, { sport: 'football', name: 'Arsenal', key: 'arsenal', crest: null, ids: { sportapi: '311' }, league: null }, { now: NOW, tz: TZ, onUpdate: () => {} })
    expect(net(calls)).toEqual(['sportapi /teams/311', 'sportapi /standings/24', 'sportapi /teams/311/squad'])
    expect(data).toMatchObject({ provider: 'sportapi', league: { provider: 'sportapi', id: '24' }, crest: 'https://a.espncdn.com/i/teamlogos/soccer/500/359.png' })
    expect(data.squad).toHaveLength(4)
  })

  it('sportapi.ai utan id och utan liga: nästa källa (API-Sports med känt id)', async () => {
    const { router, calls } = harness(BOTH, apiReply)
    const data = await loadTeamPage(router, HAMMARBY, { now: NOW, tz: TZ, onUpdate: () => {} })
    expect(data.provider).toBe('api-sports')
    expect(net(calls).some((c) => c.startsWith('sportapi'))).toBe(false)
  })

  it('källans kvot slut: nästa källa tar över (som routern)', async () => {
    const { router, calls } = harness(BOTH, (c) => {
      if (c.provider === 'sportapi' && c.mode === 'cache-first') return { error: 'exhausted', quota: { bucket: 'football', limit: 2000, remaining: 0, minuteLimit: null, minuteRemaining: null, blockedUntil: NOW + 3_600_000, reason: 'exhausted', plan: null } }
      return apiReply(c)
    })
    const data = await loadTeamPage(router, { ...HAMMARBY, ids: { sportapi: '999', 'api-sports': '363' } }, { now: NOW, tz: TZ, onUpdate: () => {} })
    expect(data.provider).toBe('api-sports')
    expect(net(calls)[0]).toBe('sportapi /teams/999')
    expect(net(calls)).toContain('api-sports /fixtures?team=363&season=2026&timezone=Europe%2FStockholm')
  })

  it('ingen nyckel: inget anrop alls', async () => {
    const fetch = vi.fn()
    const router = new SportRouter({}, {}, { fetch: fetch as never })
    expect((await loadTeamPage(router, HAMMARBY, { now: NOW, tz: TZ, onUpdate: () => {} })).state).toBe('no-key')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('tomma svar: sektionerna saknas, inga fel', async () => {
    const { router } = harness(API, () => ({ data: { errors: [], response: [] } }))
    const data = await loadTeamPage(router, HAMMARBY, { now: NOW, tz: TZ, onUpdate: () => {} })
    expect(data).toMatchObject({ state: 'ready', fixtures: [], standings: null, squad: null })
  })
})

describe('ligasidan', () => {
  it('API-Sports: tabellen, omgången runt idag och skytteligan', async () => {
    const { router, calls } = harness(API, (c) => (c.path.startsWith('/fixtures?league=113') ? { data: teamFixtures } : apiReply(c)))
    const data = await loadLeaguePage(router, { sport: 'football', name: 'Allsvenskan', key: 'allsvenskan', ref: { provider: 'api-sports', id: '113', season: '2026', name: 'Allsvenskan' } }, { now: NOW, tz: TZ, onUpdate: () => {} })
    expect(net(calls)).toEqual([
      'api-sports /standings?league=113&season=2026',
      'api-sports /fixtures?league=113&season=2026&from=2026-10-08&to=2026-10-16&timezone=Europe%2FStockholm',
      'api-sports /players/topscorers?league=113&season=2026',
    ])
    expect(data.standings).toHaveLength(8)
    expect(data.round?.round).toBe(23)
    expect(data.scorers?.[0]).toEqual({ rank: 1, name: 'I. Guidetti', team: 'AIK Stockholm', goals: 17 })
  })
  it('sportapi.ai: /leagues/{id} och skytteligan', async () => {
    const { router, calls } = harness(BOTH, (c) => (c.path === '/standings/24' ? { data: saStandings } : c.path === '/leagues/24' ? { data: saLeague } : c.path === '/leagues/24/topscorers' ? { data: saScorers } : {}))
    const data = await loadLeaguePage(router, { sport: 'football', name: 'Premier League', key: 'fx:sportapi:24', ref: { provider: 'sportapi', id: '24', season: null, name: 'Premier League' } }, { now: NOW, tz: TZ, onUpdate: () => {} })
    expect(net(calls)).toEqual(['sportapi /standings/24', 'sportapi /leagues/24', 'sportapi /leagues/24/topscorers'])
    expect(data.round?.fixtures).toHaveLength(2)
    expect(data.scorers).toHaveLength(2)
  })
  it('ligan finns bara i tablån, eller källan saknar nyckel: inget anrop', async () => {
    const { router, calls } = harness(API, apiReply)
    expect((await loadLeaguePage(router, { sport: 'football', name: 'X', key: 'x', ref: null }, { now: NOW, tz: TZ, onUpdate: () => {} })).state).toBe('no-key')
    expect((await loadLeaguePage(router, { sport: 'football', name: 'X', key: 'x', ref: { provider: 'sportapi', id: '1', season: null, name: 'X' } }, { now: NOW, tz: TZ, onUpdate: () => {} })).state).toBe('no-key')
    expect(calls).toEqual([])
  })
})
