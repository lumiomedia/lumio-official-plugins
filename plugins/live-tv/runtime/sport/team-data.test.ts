// runtime/sport/team-data.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SportRouter } from './router'
import { ResultsController } from './results-controller'
import { __resetTeamDataForTests, loadLeaguePage, loadTeamPage, standingsVia, type TeamPageData } from './team-data'
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
import squad541 from './__fixtures__/api-sports/football-players-squads-541.json'
import hockeyAllsv from './__fixtures__/api-sports/hockey-games-allsvenskan.json'
import saSlug from './__fixtures__/sportapi/team-slug.json'
import saTeam86 from './__fixtures__/sportapi/team-86.json'
import saSquad86 from './__fixtures__/sportapi/team-86-squad.json'
import saTrophies86 from './__fixtures__/sportapi/team-86-trophies.json'
import saLaLiga from './__fixtures__/sportapi/standings-laliga.json'
import { apiSports } from './api-sports'
import { teamCallsFor } from './team-providers'

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
  // Tabellen går resultatlagrets väg (samma som Tabeller & resultat).
  const standings = standingsVia(new ResultsController(router, { now: () => NOW, tz: TZ, startPoller: false }), NOW)
  return { router, calls, standings }
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
  it('matcherna (en säsong), tabellen och truppen med skador — inget annat', async () => {
    const { router, calls, standings } = harness(API, apiReply)
    const updates: TeamPageData[] = []
    const data = await loadTeamPage(router, HAMMARBY, { now: NOW, tz: TZ, standings, onUpdate: (d) => updates.push(d) })
    expect(net(calls)).toEqual([
      'api-sports /fixtures?team=363&season=2026&timezone=Europe%2FStockholm',
      'api-sports /standings?league=113&season=2026',
      'api-sports /players/squads?team=363',
      'api-sports /injuries?team=363&season=2026',
    ])
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
    const { router, calls, standings } = harness(API, (c) => (c.path.startsWith('/fixtures?team=') ? { data: teamFixtures, fetchedAt, cached: true } : apiReply(c)))
    await loadTeamPage(router, HAMMARBY, { now: NOW, tz: TZ, standings, onUpdate: () => {} })
    const peek = calls.find((c) => c.path.startsWith('/fixtures?team=') && c.mode === 'cache-only')
    const real = calls.find((c) => c.path.startsWith('/fixtures?team=') && c.mode === 'cache-first')
    expect(peek).toBeTruthy()
    // Nästa match (cupen, 2026-10-14 14:00) + 2,5 h, räknat från hämtningen.
    expect(real!.ttl).toBe(Math.round((Date.UTC(2026, 9, 14, 12) + 2.5 * 3_600_000 - fetchedAt) / 1000))
  })

  it('samma sida igen inom några minuter: inga nya anrop', async () => {
    const { router, calls, standings } = harness(API, apiReply)
    await loadTeamPage(router, HAMMARBY, { now: NOW, tz: TZ, standings, onUpdate: () => {} })
    const n = net(calls).length
    await loadTeamPage(router, HAMMARBY, { now: NOW + 60_000, tz: TZ, standings, onUpdate: () => {} })
    expect(net(calls)).toHaveLength(n)
  })

  it('id saknas: ETT lagsök, och id:t lämnas tillbaka för att sparas på posten', async () => {
    const { router, calls, standings } = harness(API, (c) => (c.path.startsWith('/fixtures?team=375&') ? { data: teamFixtures } : apiReply(c)))
    const onResolved = vi.fn()
    await loadTeamPage(router, { ...HAMMARBY, name: 'Malmö', key: 'malmo', ids: {}, league: null }, { now: NOW, tz: TZ, standings, onUpdate: () => {}, onResolved })
    expect(net(calls).filter((c) => c.includes('/teams?search='))).toEqual(['api-sports /teams?search=Malm%C3%B6'])
    expect(onResolved).toHaveBeenCalledWith('api-sports', '375')
  })

  it('en ensam orelaterad sökträff tas inte: inget id, inga fler anrop för laget', async () => {
    const { router, calls, standings } = harness(API, apiReply)
    const onResolved = vi.fn()
    const data = await loadTeamPage(router, { ...HAMMARBY, name: 'Manchester United', key: 'manchester united', ids: {}, league: null }, { now: NOW, tz: TZ, standings, onUpdate: () => {}, onResolved })
    expect(onResolved).not.toHaveBeenCalled()
    expect(net(calls)).toEqual(['api-sports /teams?search=Manchester%20United'])
    expect(data).toMatchObject({ state: 'ready', fixtures: [], squad: null })
  })

  it('sportapi.ai först för fotboll: lagets sida, serien ur svaret, truppen; API-Sports rörs inte', async () => {
    const { router, calls, standings } = harness(BOTH, (c) => {
      if (c.mode === 'cache-only') return {}
      if (c.provider !== 'sportapi') return { data: null }
      if (c.path === '/teams/311') return { data: saTeam }
      if (c.path === '/standings/24') return { data: saStandings }
      if (c.path === '/teams/311/squad') return { data: saSquad }
      return {}
    })
    const data = await loadTeamPage(router, { sport: 'football', name: 'Arsenal', key: 'arsenal', crest: null, ids: { sportapi: '311' }, league: null }, { now: NOW, tz: TZ, standings, onUpdate: () => {} })
    expect(net(calls)).toEqual(['sportapi /teams/311', 'sportapi /standings/24', 'sportapi /teams/311/squad', 'sportapi /teams/311/trophies'])
    expect(data).toMatchObject({ provider: 'sportapi', league: { provider: 'sportapi', id: '24' }, crest: 'https://a.espncdn.com/i/teamlogos/soccer/500/359.png' })
    expect(data.squad).toHaveLength(4)
  })

  it('sportapi.ai utan id och utan liga: slug-uppslaget hittar inget → nästa källa (API-Sports med känt id); id:n blandas aldrig', async () => {
    const { router, calls, standings } = harness(BOTH, apiReply)
    const data = await loadTeamPage(router, HAMMARBY, { now: NOW, tz: TZ, standings, onUpdate: () => {} })
    expect(data.provider).toBe('api-sports')
    expect(net(calls).filter((c) => c.startsWith('sportapi'))).toEqual(['sportapi /teams/slug/hammarby'])
    expect(calls.some((c) => c.provider === 'sportapi' && c.path.includes('363'))).toBe(false)
  })

  it('källans kvot slut: nästa källa tar över (som routern)', async () => {
    const { router, calls, standings } = harness(BOTH, (c) => {
      if (c.provider === 'sportapi' && c.mode === 'cache-first') return { error: 'exhausted', quota: { bucket: 'football', limit: 2000, remaining: 0, minuteLimit: null, minuteRemaining: null, blockedUntil: NOW + 3_600_000, reason: 'exhausted', plan: null } }
      return apiReply(c)
    })
    const data = await loadTeamPage(router, { ...HAMMARBY, ids: { sportapi: '999', 'api-sports': '363' } }, { now: NOW, tz: TZ, standings, onUpdate: () => {} })
    expect(data.provider).toBe('api-sports')
    expect(net(calls)[0]).toBe('sportapi /teams/999')
    expect(net(calls)).toContain('api-sports /fixtures?team=363&season=2026&timezone=Europe%2FStockholm')
  })

  it('ingen nyckel: inget anrop alls', async () => {
    const fetch = vi.fn()
    const router = new SportRouter({}, {}, { fetch: fetch as never })
    const standings = vi.fn(async () => null)
    expect((await loadTeamPage(router, HAMMARBY, { now: NOW, tz: TZ, standings, onUpdate: () => {} })).state).toBe('no-key')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('tomma svar: sektionerna saknas, inga fel', async () => {
    const { router, standings } = harness(API, () => ({ data: { errors: [], response: [] } }))
    const data = await loadTeamPage(router, HAMMARBY, { now: NOW, tz: TZ, standings, onUpdate: () => {} })
    expect(data).toMatchObject({ state: 'ready', fixtures: [], standings: null, squad: null })
  })
})

describe('ligasidan', () => {
  it('API-Sports: tabellen, omgången runt idag och skytteligan', async () => {
    const { router, calls, standings } = harness(API, (c) => (c.path.startsWith('/fixtures?league=113') ? { data: teamFixtures } : apiReply(c)))
    const data = await loadLeaguePage(router, { sport: 'football', name: 'Allsvenskan', key: 'allsvenskan', ref: { provider: 'api-sports', id: '113', season: '2026', name: 'Allsvenskan' } }, { now: NOW, tz: TZ, standings, onUpdate: () => {} })
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
    const { router, calls, standings } = harness(BOTH, (c) => (c.path === '/standings/24' ? { data: saStandings } : c.path === '/leagues/24' ? { data: saLeague } : c.path === '/leagues/24/topscorers' ? { data: saScorers } : {}))
    const data = await loadLeaguePage(router, { sport: 'football', name: 'Premier League', key: 'fx:sportapi:24', ref: { provider: 'sportapi', id: '24', season: null, name: 'Premier League' } }, { now: NOW, tz: TZ, standings, onUpdate: () => {} })
    expect(net(calls)).toEqual(['sportapi /standings/24', 'sportapi /leagues/24', 'sportapi /leagues/24/topscorers'])
    expect(data.round?.fixtures).toHaveLength(2)
    expect(data.scorers).toHaveLength(2)
  })
  it('ligan finns bara i tablån och ingen källa känner namnet: ett ligasök, sedan inget mer', async () => {
    const { router, calls, standings } = harness(API, apiReply)
    const res = await loadLeaguePage(router, { sport: 'football', name: 'Xyzliga', key: 'x', ref: null }, { now: NOW, tz: TZ, standings, onUpdate: () => {} })
    expect(res).toMatchObject({ state: 'ready', ref: null, standings: null })
    expect(net(calls)).toEqual(['api-sports /leagues?search=Xyzliga'])
    calls.length = 0
    // Ligan hos en källa utan nyckel: inget anrop.
    expect((await loadLeaguePage(router, { sport: 'football', name: 'X', key: 'x', ref: { provider: 'sportapi', id: '1', season: null, name: 'X' } }, { now: NOW, tz: TZ, standings, onUpdate: () => {} })).ref).toBeNull()
    expect(calls).toEqual([])
  })
})

describe('säsongen', () => {
  it('API-Sports planens säsongsgräns (fel för 2026): nästa källa, aldrig förra säsongens matcher som form', async () => {
    const lastSeason = { ...teamFixtures, response: teamFixtures.response.map((r) => ({ ...r, fixture: { ...r.fixture, timestamp: r.fixture.timestamp - 365 * 86_400 } })) }
    const { router, calls, standings } = harness(API, (c) => {
      if (c.mode === 'cache-only') return {}
      if (c.path.includes('season=2026')) return { error: 'upstream' }
      if (c.path.includes('season=2025')) return { data: lastSeason }
      return apiReply(c)
    })
    // Säsongen gissas (ingen liga känd): 2026 fel → källan släpps, 2025 prövas inte som form.
    const data = await loadTeamPage(router, { ...HAMMARBY, league: null }, { now: NOW, tz: TZ, standings, onUpdate: () => {} })
    expect(data.fixtures).toEqual([])
    expect(net(calls).filter((c) => c.includes('/fixtures?team='))).toEqual(['api-sports /fixtures?team=363&season=2026&timezone=Europe%2FStockholm'])
  })
  it('ett tomt svar för den gissade säsongen prövar nästa, men bara matcher nära idag godtas', async () => {
    const lastSeason = { ...teamFixtures, response: teamFixtures.response.map((r) => ({ ...r, fixture: { ...r.fixture, timestamp: r.fixture.timestamp - 365 * 86_400 } })) }
    const { router, standings } = harness(API, (c) => {
      if (c.mode === 'cache-only') return {}
      if (c.path.includes('season=2026')) return { data: { errors: [], response: [] } }
      if (c.path.includes('season=2025')) return { data: lastSeason }
      return apiReply(c)
    })
    expect((await loadTeamPage(router, { ...HAMMARBY, league: null }, { now: NOW, tz: TZ, standings, onUpdate: () => {} })).fixtures).toEqual([])
  })
})

/*
  Jerrys rapporter 2026-10-12 ~15:45, ur de riktiga svaren i hans cache:
  Real Madrid (följt ur API-Sports sök, id 541) visade bara rubrik och en
  trupp; Hockey Allsvenskan (följd ur tablån) visade "källan har inget mer".
*/

const PLAN_ERROR = { error: 'upstream' as const }

describe('Real Madrid (API-Sports gratisplan, sportapi.ai utan lagsök)', () => {
  const RM: TeamTarget = { sport: 'football', name: 'Real Madrid', key: 'real madrid', crest: null, ids: { 'api-sports': '541' }, league: null }
  const reply: Reply = (c) => {
    if (c.mode === 'cache-only') return {}
    if (c.provider === 'api-sports') return c.path.startsWith('/players/squads?team=541') ? { data: squad541 } : PLAN_ERROR
    if (c.path === '/teams/slug/real-madrid') return { data: saSlug }
    if (c.path === '/teams/86') return { data: saTeam86 }
    if (c.path === '/standings/23') return { data: saLaLiga }
    if (c.path === '/teams/86/squad') return { data: saSquad86 }
    if (c.path === '/teams/86/trophies') return { data: saTrophies86 }
    return {}
  }
  it('sportapi.ai:s id slås upp på slug (en gång, sparas), och sidan får matcher, serie, placering, fakta, trupp och titlar därifrån', async () => {
    const { router, calls, standings } = harness(BOTH, reply)
    const onResolved = vi.fn()
    const data = await loadTeamPage(router, RM, { now: NOW, tz: TZ, standings, onUpdate: () => {}, onResolved })
    expect(onResolved).toHaveBeenCalledWith('sportapi', '86')
    expect(net(calls)).toEqual(['sportapi /teams/slug/real-madrid', 'sportapi /teams/86', 'sportapi /standings/23', 'sportapi /teams/86/squad', 'sportapi /teams/86/trophies'])
    expect(data).toMatchObject({ provider: 'sportapi', teamId: '86', league: { provider: 'sportapi', id: '23', name: 'La Liga' }, info: { country: 'Spain', geo: 'ES', city: 'Madrid', coach: 'Xabi Alonso', stadium: 'Santiago Bernabéu', founded: 1902 } })
    expect(data.fixtures.map((f) => f.league.name)).toEqual(['La Liga', 'Champions League', 'La Liga', 'La Liga', 'Champions League'])
    expect(data.standings?.[1].team.name).toBe('Real Madrid')
    // Truppen är sportapi.ai:s, inte API-Sports blandlista (38 namn med Cucurella, Konaté m.fl.).
    expect(data.squad?.map((p) => p.name)).toEqual(['Thibaut Courtois', 'Antonio Rüdiger', 'Jude Bellingham', 'Kylian Mbappé'])
    expect(data.trophies).toHaveLength(3)
  })
  it('API-Sports id 541 används aldrig hos sportapi.ai, och slug-svaret måste vara laget', async () => {
    const { router, calls, standings } = harness(BOTH, (c) => (c.path.startsWith('/teams/slug/') ? { data: { ...saSlug, team: { ...saSlug.team, id: 999, name: 'Real Sociedad' } } } : reply(c)))
    const data = await loadTeamPage(router, RM, { now: NOW, tz: TZ, standings, onUpdate: () => {} })
    expect(calls.some((c) => c.provider === 'sportapi' && c.path.includes('541'))).toBe(false)
    expect(calls.some((c) => c.path === '/teams/999')).toBe(false)
    expect(data.provider).toBeNull()
  })
  it('skyddsnät: samma spelare två gånger i källans lista blir en rad', () => {
    const doubled = { ...squad541, response: [{ ...squad541.response[0], players: [...squad541.response[0].players, squad541.response[0].players[0]] }] }
    const list = teamCallsFor('api-sports').squad('football', '541', { season: '2026' })!.parse([doubled, null])
    expect(list).toHaveLength(38)
  })
})

describe('Hockey Allsvenskan (API-Sports gratisplan saknar säsong 2026)', () => {
  const known = apiSports.day('hockey', '2026-10-12', { today: '2026-10-12', tz: TZ, dayEndMs: 0 }).parse([hockeyAllsv])
  const reply: Reply = (c) => (c.mode === 'cache-only' ? {} : PLAN_ERROR)
  it('ligasidan: ligan hittas i minnets matcher (inget sök), säsongen 2026 därifrån, omgången ur minnet när ligaanropet nekas', async () => {
    const { router, calls, standings } = harness(API, reply)
    const data = await loadLeaguePage(router, { sport: 'hockey', name: 'Hockey Allsvenskan', key: 'hockey allsvenskan', ref: null }, { now: NOW, tz: TZ, standings, known, onUpdate: () => {} })
    expect(data.ref).toEqual({ provider: 'api-sports', id: '49', season: '2026', name: 'Hockey Allsvenskan' })
    expect(net(calls).some((c) => c.includes('/leagues?search'))).toBe(false)
    expect(net(calls)).toContain('api-sports /standings?league=49&season=2026')
    expect(net(calls)).toContain('api-sports /games?league=49&season=2026&timezone=Europe%2FStockholm')
    expect(data.standings).toBeNull()
    expect(data.round?.fixtures.length).toBeGreaterThan(0)
  })
  it('lagsidan: AIK:s matcher ur minnet när /games?team nekas; ligan och säsongen ur dem', async () => {
    const { router, standings } = harness(API, reply)
    const data = await loadTeamPage(router, { sport: 'hockey', name: 'AIK', key: 'aik', crest: null, ids: {}, league: null }, { now: NOW, tz: TZ, standings, known, onUpdate: () => {} })
    expect(data).toMatchObject({ provider: 'api-sports', teamId: '517', league: { provider: 'api-sports', id: '49', season: '2026' } })
    expect(data.fixtures.map((f) => `${f.home.name}-${f.away.name}`)).toEqual(['AIK-Ostersund'])
  })
})
