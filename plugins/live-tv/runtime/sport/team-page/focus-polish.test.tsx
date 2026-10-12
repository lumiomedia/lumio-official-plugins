import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests } from '@/lib/plugin-sdk'
import { SportRouter } from '../router'
import { ResultsController } from '../results-controller'
import { __resetTeamDataForTests } from '../team-data'
import { __resetPageTabsForTests } from './page-tabs'
import { MIN, fakeCtx, fxDay, fxMatch, fxSource, stubSportDays } from '../__sport-fixture'
import { TeamPage } from './team-page'
import { hasPlayerDetails, playerAge } from './player-drawer'
import { SportFeed } from '../tv/sport-feed'
import { SPORT_FOCUS_CSS } from '../surface'
import type { TeamTarget } from '../team-model'
import type { ProviderId } from '../provider'
import type { SportFetchResponse } from '../sport-fetch'
import teamFixtures from '../__fixtures__/api-sports/football-fixtures-team.json'
import allsvenskan from '../__fixtures__/api-sports/football-standings-allsvenskan.json'
import squads from '../__fixtures__/api-sports/football-players-squads.json'
import injuries from '../__fixtures__/api-sports/football-injuries.json'

/*
  Fokusputsen (Jerry 2026-10-12): tabellen nåbar med fjärren, spelarkort,
  och Sports nya fokusmarkering (sorterna på stationerna).
*/

const NOW = Date.UTC(2026, 9, 12, 10)
const h = vi.hoisted(() => ({ controller: null as unknown }))
vi.mock('../results-controller', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../results-controller')>()),
  useResultsController: () => h.controller,
}))

function withApiSports() {
  const reply = (path: string): unknown => (path.startsWith('/fixtures?team=363') ? teamFixtures : path.startsWith('/standings?league=113') ? allsvenskan : path.startsWith('/players/squads') ? squads : path.startsWith('/injuries') ? injuries : null)
  const fetch = vi.fn(async ({ req, mode }: { provider: ProviderId; req: { path: string }; mode: string }) =>
    ({ data: mode === 'cache-only' ? null : reply(req.path), cached: false, fresh: true, fetchedAt: NOW, quota: null, error: null }) as SportFetchResponse)
  const router = new SportRouter({ 'api-sports': { key: 'aaaa1111', plan: 'Free' } }, {}, { fetch: fetch as never, now: () => NOW, sleep: async () => {} })
  h.controller = new ResultsController(router, { now: () => NOW, tz: 'Europe/Stockholm', startPoller: false })
}
const HAM: TeamTarget = { sport: 'football', name: 'Hammarby', key: 'hammarby', crest: null, ids: { 'api-sports': '363' }, league: { provider: 'api-sports', id: '113', season: '2026', name: 'Allsvenskan' } }

beforeEach(() => { __resetForTests(); __resetTeamDataForTests(); __resetPageTabsForTests(); stubSportDays({}); withApiSports() })
afterEach(() => { cleanup(); h.controller = null })

describe('Tabellen med fjärren', () => {
  it('raderna är fokusstopp av tabellradssorten; "Visa hela tabellen" fäller ut och flyttar fokus till lagets egen rad', async () => {
    __setTvModeForTests(true)
    render(<TeamPage ctx={fakeCtx({ now: NOW })} target={HAM} matches={[]} depth={0} phone={false} onClose={() => {}} />)
    const rows = within(await screen.findByTestId('tp-standings')).getAllByTestId('page-standings-row')
    for (const r of rows) {
      expect(r).toHaveAttribute('data-f')
      expect(r).toHaveAttribute('data-focus', 'table-row')
    }
    fireEvent.click(screen.getByTestId('tp-table-toggle'))
    await waitFor(() => expect(document.activeElement).toHaveAttribute('data-mark', '1'))
    expect(within(screen.getByTestId('tp-standings')).getAllByTestId('page-standings-row')).toHaveLength(8)
  })
})

describe('Spelarkortet', () => {
  it('en spelare med fakta öppnar kortet (ålder, nationalitet, skada); utan fakta inget fokusstopp', async () => {
    render(<TeamPage ctx={fakeCtx({ now: NOW })} target={HAM} matches={[]} depth={0} phone={false} onClose={() => {}} />)
    fireEvent.click(await screen.findByTestId('page-tab-squad'))
    const fenger = screen.getAllByTestId('tp-player').find((p) => p.textContent?.includes('M. Fenger'))!
    expect(fenger).toHaveAttribute('data-f')
    fireEvent.click(fenger)
    const drawer = await screen.findByTestId('player-drawer')
    expect(within(drawer).getByTestId('pl-name')).toHaveTextContent('M. Fenger')
    expect(within(drawer).getAllByTestId('pl-fact').map((f) => f.textContent)).toEqual(['Number#2', 'PositionDefence', 'Age25 years', 'InjuredKnee Injury'])
  })
  it('fakta och ålder ur truppens svar', () => {
    expect(hasPlayerDetails({ name: 'X', number: 1, pos: 'Goalkeeper', photo: null, injury: null })).toBe(false)
    expect(hasPlayerDetails({ name: 'X', number: 1, pos: null, photo: null, injury: null, nationality: 'SE' })).toBe(true)
    expect(playerAge({ name: 'X', number: 1, pos: null, photo: null, injury: null, born: '1992-05-11' }, NOW)).toBe(34)
    expect(playerAge({ name: 'X', number: 1, pos: null, photo: null, injury: null, born: '1992-12-11' }, NOW)).toBe(33)
    expect(playerAge({ name: 'X', number: 1, pos: null, photo: null, injury: null, age: 21 }, NOW)).toBe(21)
  })
})

describe('Fokussorterna', () => {
  it('Dina lag: brickan är cirkelsort och cirkeln själv bär markeringen; "Just nu"-raden markeras hel, inte textblocket', () => {
    const now = Date.now()
    const live = fxMatch({ id: 'live', home: 'AIK', away: 'Hammarby', homeKey: 'hammarby', start: now - 30 * MIN, stop: now + 90 * MIN, sources: [fxSource('A')] })
    const ctx = fakeCtx({ now, follows: [{ sport: 'football', kind: 'team', key: 'hammarby', name: 'Hammarby' }] })
    render(<SportFeed ctx={ctx} matches={[live]} days={[fxDay('d', [live]), null]} />)
    const team = screen.getByTestId('feed-team')
    expect(team).toHaveAttribute('data-focus', 'circle')
    expect(team.querySelector('[data-focus-circle]')).not.toBeNull()
    expect(screen.getByTestId('feed-add')).toHaveAttribute('data-focus', 'circle')
    const row = screen.getByTestId('feed-now-row')
    expect(row).toHaveAttribute('data-focus-row')
    expect(row.querySelector('[data-f][data-focus="none"]')).not.toBeNull()
  })
  it('CSS: cirkeln 3 px, flikar och chips accenttext, tabellrader bara ton (egen rad får kanten), kort 1,02; :has() i en egen regel', () => {
    expect(SPORT_FOCUS_CSS).toMatch(/\[data-focus="circle"\]:focus[^{]*\[data-focus-circle\] \{ box-shadow: 0 0 0 3px rgb\(var\(--accent-500\)\)/)
    expect(SPORT_FOCUS_CSS).toMatch(/\[data-focus="tab"\]:focus[^{]*\[data-live-tv-chip\][^{]*\{ box-shadow: none !important; color: rgb\(var\(--accent-500\)\)/)
    expect(SPORT_FOCUS_CSS).toMatch(/\[data-focus="table-row"\]:focus[^{]*\{ box-shadow: none !important; \}/)
    expect(SPORT_FOCUS_CSS).toMatch(/\[data-focus="table-row"\]\[data-mark="1"\]:focus[^{]*\{ box-shadow: inset 0 0 0 2px/)
    expect(SPORT_FOCUS_CSS).toMatch(/\[data-focus="card"\]:focus[^{]*\{ transform: scale\(1\.02\); \}/)
    const hasRules = SPORT_FOCUS_CSS.split('\n').filter((l) => l.includes(':has('))
    expect(hasRules).toHaveLength(1)
    expect(hasRules[0].split('{')[0]).not.toContain(',')
  })
})
