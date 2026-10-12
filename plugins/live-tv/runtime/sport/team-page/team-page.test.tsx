import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { __resetForTests } from '@/lib/plugin-sdk'
import { SportRouter } from '../router'
import { ResultsController } from '../results-controller'
import { __resetTeamDataForTests } from '../team-data'
import { __resetPageTabsForTests } from './page-tabs'
import { getFollows } from '../sport-store'
import { fakeCtx, fxMatch, fxSource, stubSportDays } from '../__sport-fixture'
import { TeamPage } from './team-page'
import { LeaguePage } from './league-page'
import type { TeamTarget } from '../team-model'
import type { ProviderId } from '../provider'
import type { SportFetchResponse } from '../sport-fetch'
import teamFixtures from '../__fixtures__/api-sports/football-fixtures-team.json'
import allsvenskan from '../__fixtures__/api-sports/football-standings-allsvenskan.json'
import squads from '../__fixtures__/api-sports/football-players-squads.json'
import injuries from '../__fixtures__/api-sports/football-injuries.json'
import topscorers from '../__fixtures__/api-sports/football-topscorers.json'
import saSlug from '../__fixtures__/sportapi/team-slug.json'
import saTeam86 from '../__fixtures__/sportapi/team-86.json'
import saSquad86 from '../__fixtures__/sportapi/team-86-squad.json'
import saTrophies86 from '../__fixtures__/sportapi/team-86-trophies.json'
import saLaLiga from '../__fixtures__/sportapi/standings-laliga.json'

// Dagen efter Hammarby–Djurgården; nästa match cupen 2026-10-14 14:00 (lokal tid i fixturen).
const NOW = Date.UTC(2026, 9, 12, 10)

const h = vi.hoisted(() => ({ controller: null as unknown }))
vi.mock('../results-controller', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../results-controller')>()),
  useResultsController: () => h.controller,
}))

/** Riktig router och resultatlager mot en falsk genomkoppling (källans svar ur fixturerna). */
function withProvider(reply: (path: string, provider: ProviderId) => unknown = defaultReply, keys: Record<string, { key: string; plan: string | null }> = { 'api-sports': { key: 'aaaa1111', plan: 'Free' } }) {
  const paths: string[] = []
  const fetch = vi.fn(async ({ provider, req, mode }: { provider: ProviderId; req: { path: string }; mode: string }) => {
    if (mode === 'cache-first' && req.path !== '/status') paths.push(req.path)
    return { data: mode === 'cache-only' ? null : reply(req.path, provider), cached: false, fresh: true, fetchedAt: NOW, quota: null, error: null } as SportFetchResponse
  })
  const router = new SportRouter(keys, {}, { fetch: fetch as never, now: () => NOW, sleep: async () => {} })
  h.controller = new ResultsController(router, { now: () => NOW, tz: 'Europe/Stockholm', startPoller: false })
  return { paths }
}
function defaultReply(path: string): unknown {
  if (path.startsWith('/fixtures?team=363')) return teamFixtures
  if (path.startsWith('/standings?league=113')) return allsvenskan
  if (path.startsWith('/players/squads')) return squads
  if (path.startsWith('/injuries')) return injuries
  if (path.startsWith('/fixtures?league=113')) return teamFixtures
  if (path.startsWith('/players/topscorers')) return topscorers
  return null
}

const HAMMARBY: TeamTarget = { sport: 'football', name: 'Hammarby', key: 'hammarby', crest: null, ids: { 'api-sports': '363' }, league: { provider: 'api-sports', id: '113', season: '2026', name: 'Allsvenskan' } }

beforeEach(() => { __resetForTests(); __resetTeamDataForTests(); __resetPageTabsForTests(); stubSportDays({}) })
afterEach(() => { cleanup(); h.controller = null })

async function mountTeam(over: { matches?: Parameters<typeof TeamPage>[0]['matches']; target?: TeamTarget } = {}) {
  const ctx = fakeCtx({ now: NOW })
  const onClose = vi.fn()
  render(<TeamPage ctx={ctx} target={over.target ?? HAMMARBY} matches={over.matches ?? []} depth={0} phone={false} onClose={onClose} />)
  return { ctx, onClose }
}

describe('Lagsidan', () => {
  it('rubriken: namn, placering i serien och poäng; Bakåt är ett eget lager', async () => {
    withProvider()
    const { ctx } = await mountTeam()
    expect(screen.getByTestId('tp-name')).toHaveTextContent('Hammarby')
    await waitFor(() => expect(screen.getByTestId('tp-position')).toHaveTextContent('3rd in Allsvenskan · 41 pts'))
    expect(ctx.nav.pushLayer).toHaveBeenCalledTimes(1)
  })

  it('formen: fem senaste, senaste först, med motståndare och resultat', async () => {
    withProvider()
    await mountTeam()
    const rows = await screen.findAllByTestId('tp-form-row')
    expect(rows.map((r) => r.getAttribute('data-result'))).toEqual(['L', 'W', 'W', 'L', 'D'])
    expect(rows[0]).toHaveTextContent('Djurgardens IF')
    expect(rows[0]).toHaveTextContent('0–1')
  })

  it('tabellen: två över och två under med laget markerat, och hela tabellen på begäran', async () => {
    withProvider()
    await mountTeam()
    const table = await screen.findByTestId('tp-standings')
    const rows = within(table).getAllByTestId('page-standings-row')
    expect(rows).toHaveLength(5)
    expect(rows[2]).toHaveAttribute('data-mark', '1')
    expect(rows[2]).toHaveTextContent('Hammarby FF')
    fireEvent.click(screen.getByTestId('tp-table-toggle'))
    expect(within(screen.getByTestId('tp-standings')).getAllByTestId('page-standings-row')).toHaveLength(8)
  })

  it('ett annat lag i tabellen öppnar sin egen sida (ovanpå), med tabellens id', async () => {
    withProvider()
    const { ctx } = await mountTeam()
    const rows = within(await screen.findByTestId('tp-standings')).getAllByTestId('page-standings-row')
    fireEvent.click(rows[1])
    expect(ctx.openTeam).toHaveBeenCalledWith(expect.objectContaining({ name: 'Malmo FF', ids: { 'api-sports': '375' } }))
    fireEvent.click(rows[2])
    expect(ctx.openTeam).toHaveBeenCalledTimes(1)
  })

  it('nästa match och kommande över alla turneringar; utan kanal står det', async () => {
    withProvider()
    await mountTeam()
    const next = await screen.findByTestId('tp-next-card')
    expect(next).toHaveTextContent('Svenska Cupen')
    expect(next).toHaveTextContent('Not on your channels')
    expect(screen.queryByTestId('tp-remind')).toBeNull()
    fireEvent.click(screen.getByTestId('page-tab-matches'))
    expect(screen.getAllByTestId('tp-upcoming-row').map((r) => r.textContent)).toEqual([expect.stringContaining('IF Elfsborg'), expect.stringContaining('Kalmar FF')])
  })

  it('nästa match på användarens kanaler: kanalen och Påminn mig (samma påminnelse som matchinfon)', async () => {
    withProvider()
    const cup = Date.UTC(2026, 9, 14, 12)
    const epg = fxMatch({ home: 'Örgryte', away: 'Hammarby', homeKey: 'orgryte', awayKey: 'hammarby', league: 'Svenska Cupen', start: cup, stop: cup + 2 * 3_600_000, sources: [fxSource('TV4 Sport', { programmeStart: cup, programmeStop: cup + 7_200_000 })] })
    const { ctx } = await mountTeam({ matches: [epg] })
    const next = await screen.findByTestId('tp-next-card')
    await waitFor(() => expect(next).toHaveTextContent('TV4 Sport'))
    fireEvent.click(screen.getByTestId('tp-remind'))
    expect(ctx.toggleRemind).toHaveBeenCalledWith(epg)
  })

  it('pågår nu: ställningen och Titta spelar bästa kanalen och stänger sidan', async () => {
    withProvider()
    const live = fxMatch({ home: 'Hammarby', away: 'AIK', homeKey: 'hammarby', awayKey: 'aik', start: NOW - 30 * 60_000, stop: NOW + 90 * 60_000, coverage: 'full', status: 'live', minute: 31, score: { home: 1, away: 0 }, fixture: { provider: 'api-sports', id: '1' } })
    const { ctx, onClose } = await mountTeam({ matches: [live] })
    expect(screen.getByTestId('tp-now-score')).toHaveTextContent('1–0')
    expect(screen.getByTestId('tp-now-card')).toHaveTextContent("LIVE 31'")
    fireEvent.click(screen.getByTestId('tp-watch'))
    expect(ctx.watch).toHaveBeenCalledWith(live)
    expect(onClose).toHaveBeenCalled()
  })

  it('truppen per position med tröjnummer, och skadorna från källan', async () => {
    withProvider()
    await mountTeam()
    fireEvent.click(await screen.findByTestId('page-tab-squad'))
    expect(within(screen.getByTestId('tp-squad-gk')).getAllByTestId('tp-player')).toHaveLength(2)
    const hurt = screen.getAllByTestId('tp-player').filter((p) => p.getAttribute('data-injured') === '1')
    expect(hurt.map((p) => p.textContent)).toEqual([expect.stringContaining('Injured · Knee Injury'), expect.stringContaining('Injured · Muscle Injury')])
  })

  it('anropen: matcherna, tabellen och truppen — en gång', async () => {
    const { paths } = withProvider()
    await mountTeam()
    await screen.findByTestId('page-tab-squad')
    expect(paths).toEqual([
      '/fixtures?team=363&season=2026&timezone=Europe%2FStockholm',
      '/standings?league=113&season=2026',
      '/players/squads?team=363',
      '/injuries?team=363&season=2026',
    ])
  })

  it('följ och klockan: hjärtat följer (med källans id), klockan växlar lagets egen påminnelse', async () => {
    withProvider()
    await mountTeam()
    fireEvent.click(screen.getByTestId('tp-heart'))
    expect(getFollows()).toEqual([expect.objectContaining({ kind: 'team', key: 'hammarby', providerIds: { 'api-sports': '363' } })])
    cleanup()
    const following = fakeCtx({ now: NOW, follows: getFollows() })
    render(<TeamPage ctx={following} target={HAMMARBY} matches={[]} depth={0} phone={false} onClose={() => {}} />)
    fireEvent.click(screen.getByTestId('tp-bell'))
    expect(getFollows()[0].alert).toBe('kickoff')
    expect(following.nav.toast).toHaveBeenCalled()
  })

  it('serien öppnar ligasidan', async () => {
    withProvider()
    const { ctx } = await mountTeam()
    fireEvent.click(await screen.findByTestId('tp-league'))
    expect(ctx.openLeague).toHaveBeenCalledWith(expect.objectContaining({ name: 'Allsvenskan', ref: expect.objectContaining({ provider: 'api-sports', id: '113' }) }))
  })

  it('utan nyckel: bara det tablån vet, ingen källa frågas', async () => {
    h.controller = null
    const live = fxMatch({ home: 'Hammarby', away: 'AIK', homeKey: 'hammarby', awayKey: 'aik', start: NOW + 3_600_000 })
    await mountTeam({ matches: [live] })
    expect(screen.getByTestId('tp-no-key')).toBeInTheDocument()
    expect(screen.getByTestId('tp-next-card')).toHaveTextContent('Hammarby')
    expect(screen.queryByTestId('tp-form')).toBeNull()
    expect(screen.queryByTestId('tp-table')).toBeNull()
  })

  it('källan har inget: sektionerna döljs och ett lugnt besked står kvar', async () => {
    withProvider(() => ({ errors: [], response: [] }))
    await mountTeam()
    await screen.findByTestId('tp-no-data')
    for (const id of ['tp-now', 'tp-next', 'tp-form', 'tp-table', 'tp-upcoming', 'tp-squad']) expect(screen.queryByTestId(id)).toBeNull()
  })
})

describe('Lagsidan med sportapi.ai (Real Madrid)', () => {
  const reply = (path: string, provider: ProviderId): unknown => {
    if (provider !== 'sportapi') return null
    return ({ '/teams/slug/real-madrid': saSlug, '/teams/86': saTeam86, '/standings/23': saLaLiga, '/teams/86/squad': saSquad86, '/teams/86/trophies': saTrophies86 } as Record<string, unknown>)[path] ?? null
  }
  const RM: TeamTarget = { sport: 'football', name: 'Real Madrid', key: 'real madrid', crest: null, ids: {}, league: null }
  it('serie och placering i rubriken, klubbens fakta, matcher med turneringschips, titlar', async () => {
    withProvider(reply, { sportapi: { key: 'sk_live_1', plan: null } })
    await mountTeam({ target: RM })
    await waitFor(() => expect(screen.getByTestId('tp-position')).toHaveTextContent('2nd in La Liga · 19 pts'))
    const facts = screen.getAllByTestId('tp-fact').map((f) => f.textContent)
    expect(facts).toEqual(['🇪🇸 Spain', 'CityMadrid', 'CoachXabi Alonso', 'StadiumSantiago Bernabéu', 'Founded1902'])
    await screen.findByTestId('page-tab-trophies')
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Overview', 'Matches', 'Squad', 'Trophies'])
    fireEvent.click(screen.getByTestId('page-tab-matches'))
    expect(screen.getAllByTestId('tp-played-row')).toHaveLength(3)
    fireEvent.click(screen.getByTestId('tp-comp-Champions League'))
    expect(screen.getAllByTestId('tp-played-row').map((r) => r.textContent)).toEqual([expect.stringContaining('Juventus – Real Madrid')])
    expect(screen.getAllByTestId('tp-upcoming-row').map((r) => r.textContent)).toEqual([expect.stringContaining('Bayern Munich')])
    fireEvent.click(screen.getByTestId('tp-comp-all'))
    fireEvent.click(screen.getByTestId('page-tab-trophies'))
    expect(screen.getAllByTestId('tp-trophy').map((t) => t.textContent)).toEqual([expect.stringContaining('La Liga'), expect.stringContaining('UEFA Champions League')])
    expect(screen.getAllByTestId('tp-trophy')[0]).toHaveTextContent('×2')
    fireEvent.click(screen.getByTestId('page-tab-squad'))
    expect(within(screen.getByTestId('tp-squad')).getAllByTestId('tp-player')).toHaveLength(4)
  })
})

describe('Ligasidan', () => {
  it('hela tabellen (ett lag öppnar sin sida), omgången och skytteligan; följ ligan', async () => {
    withProvider()
    const ctx = fakeCtx({ now: NOW })
    render(<LeaguePage ctx={ctx} target={{ sport: 'football', name: 'Allsvenskan', key: 'allsvenskan', ref: { provider: 'api-sports', id: '113', season: '2026', name: 'Allsvenskan' } }} depth={0} phone={false} onClose={() => {}} />)
    const rows = within(await screen.findByTestId('lp-standings')).getAllByTestId('page-standings-row')
    expect(rows).toHaveLength(8)
    fireEvent.click(rows[2])
    expect(ctx.openTeam).toHaveBeenCalledWith(expect.objectContaining({ name: 'Hammarby FF', ids: { 'api-sports': '363' } }))
    fireEvent.click(await screen.findByTestId('page-tab-scorers'))
    expect(screen.getAllByTestId('lp-scorer')[0]).toHaveTextContent('I. Guidetti')
    expect(screen.getAllByTestId('lp-scorer')[0]).toHaveTextContent('17 goals')
    expect(screen.getByTestId('page-tab-round')).toHaveTextContent('Round 23')
    fireEvent.click(screen.getByTestId('page-tab-round'))
    expect(screen.getAllByTestId('lp-fixture').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByTestId('lp-heart'))
    expect(getFollows()).toEqual([{ sport: 'football', kind: 'league', key: 'allsvenskan', name: 'Allsvenskan' }])
  })

  it('ligan finns bara i tablån: inget att hämta, inga fel', async () => {
    withProvider()
    render(<LeaguePage ctx={fakeCtx({ now: NOW })} target={{ sport: 'football', name: 'Division 1', key: 'division 1', ref: null }} depth={0} phone={false} onClose={() => {}} />)
    expect(await screen.findByTestId('lp-no-data')).toHaveTextContent('The source has nothing more about the league.')
  })
})

describe('Bakåt i stapeln', () => {
  it('en sida ovanpå en annan: Bakåt stänger bara den översta', async () => {
    withProvider()
    const stack: Array<() => void> = []
    const ctx = fakeCtx({ now: NOW })
    ;(ctx.nav.pushLayer as ReturnType<typeof vi.fn>).mockImplementation((close: () => void) => { stack.push(close); return () => { const i = stack.indexOf(close); if (i >= 0) stack.splice(i, 1) } })
    const { SportPages } = await import('./sport-pages')
    const closeTop = vi.fn()
    render(<SportPages ctx={ctx} matches={[]} phone={false} onPop={closeTop} pages={[{ kind: 'team', target: HAMMARBY }, { kind: 'league', target: { sport: 'football', name: 'Allsvenskan', key: 'allsvenskan', ref: null } }]} />)
    expect(stack).toHaveLength(2)
    act(() => { stack[stack.length - 1]() })
    expect(closeTop).toHaveBeenCalledTimes(1)
    // Den översta ligger över den undre.
    const [team, league] = [screen.getByTestId('team-page'), screen.getByTestId('league-page')]
    expect(Number(league.style.zIndex)).toBeGreaterThan(Number(team.style.zIndex))
  })
})
