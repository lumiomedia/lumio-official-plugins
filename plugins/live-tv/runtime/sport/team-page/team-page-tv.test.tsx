import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests } from '@/lib/plugin-sdk'
import { SportRouter } from '../router'
import { ResultsController } from '../results-controller'
import { __resetTeamDataForTests } from '../team-data'
import { __resetPageTabsForTests } from './page-tabs'
import { fakeCtx, fxMatch, stubSportDays } from '../__sport-fixture'
import { TeamPage } from './team-page'
import { LeaguePage } from './league-page'
import { FULL_PAGE_BG, FULL_PAGE_PADDING } from './sport-page-drawer'
import { MatchInfoDrawer } from '../match-info/match-info-drawer'
import { scaleFor } from '../match-info/match-info-parts'
import { TV } from '../../tv/tv-ui'
import type { TeamTarget } from '../team-model'
import type { ProviderId } from '../provider'
import type { SportFetchResponse } from '../sport-fetch'
import saSlug from '../__fixtures__/sportapi/team-slug.json'
import saTeam86 from '../__fixtures__/sportapi/team-86.json'
import saSquad86 from '../__fixtures__/sportapi/team-86-squad.json'
import saTrophies86 from '../__fixtures__/sportapi/team-86-trophies.json'
import saLaLiga from '../__fixtures__/sportapi/standings-laliga.json'
import saLeague from '../__fixtures__/sportapi/league.json'
import saScorers from '../__fixtures__/sportapi/league-topscorers.json'

/*
  TV-läget (Jerry 2026-10-12): lag- och ligasidan som helsida i två kolumner,
  och text i TV-storlek — minsta storlekar i 1080-scenens designpixlar.
*/

const NOW = Date.UTC(2026, 9, 12, 10)
const h = vi.hoisted(() => ({ controller: null as unknown }))
vi.mock('../results-controller', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../results-controller')>()),
  useResultsController: () => h.controller,
}))

const SA: Record<string, unknown> = { '/teams/slug/real-madrid': saSlug, '/teams/86': saTeam86, '/standings/23': saLaLiga, '/teams/86/squad': saSquad86, '/teams/86/trophies': saTrophies86, '/standings/24': saLaLiga, '/leagues/24': saLeague, '/leagues/24/topscorers': saScorers }
function withSportApi() {
  const fetch = vi.fn(async ({ provider, req, mode }: { provider: ProviderId; req: { path: string }; mode: string }) =>
    ({ data: mode === 'cache-only' || provider !== 'sportapi' ? null : SA[req.path] ?? null, cached: false, fresh: true, fetchedAt: NOW, quota: null, error: null }) as SportFetchResponse)
  const router = new SportRouter({ sportapi: { key: 'sk_live_1', plan: null } }, {}, { fetch: fetch as never, now: () => NOW, sleep: async () => {} })
  h.controller = new ResultsController(router, { now: () => NOW, tz: 'Europe/Stockholm', startPoller: false })
}
const RM: TeamTarget = { sport: 'football', name: 'Real Madrid', key: 'real madrid', crest: null, ids: {}, league: null }

beforeEach(() => { __resetForTests(); __resetTeamDataForTests(); __resetPageTabsForTests(); stubSportDays({}); withSportApi() })
afterEach(() => { cleanup(); h.controller = null })

const px = (el: Element) => parseFloat((el as HTMLElement).style.fontSize || 'NaN')
/** Alla textstorlekar på sidan utom märkenas och avatarernas initialer (dekor, aria-hidden). */
function fontSizes(root: Element): number[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[style*="font-size"]'))
    .filter((el) => !el.closest('[data-crest], [data-avatar]'))
    .map(px)
    .filter((n) => Number.isFinite(n))
}

async function mountTv() {
  __setTvModeForTests(true)
  render(<TeamPage ctx={fakeCtx({ now: NOW })} target={RM} matches={[]} depth={0} phone={false} onClose={() => {}} />)
  await screen.findByTestId('page-tab-trophies')
  return screen.getByTestId('team-page')
}

describe('Lagsidan i TV-läget', () => {
  it('helsida: rubrik och flikar står still ovanför rullytan; Översikten i två kolumner (fakta, nästa, form | tabell)', async () => {
    const page = await mountTv()
    expect(page).toHaveAttribute('data-layout', 'page')
    const head = page.querySelector('[data-page-head]')!
    const scroll = screen.getByTestId('page-scroll')
    expect(head.contains(screen.getByTestId('tp-head'))).toBe(true)
    expect(head.contains(screen.getByTestId('page-tabs'))).toBe(true)
    expect(scroll.contains(head)).toBe(false)
    // Rullytan är egen (klipps under rubriken); sidan själv rullar inte.
    expect(scroll).toHaveAttribute('data-scroll')
    expect(page).not.toHaveAttribute('data-scroll')
    const [left, right] = [page.querySelector('[data-col="left"]')!, page.querySelector('[data-col="right"]')!]
    for (const id of ['tp-info', 'tp-next', 'tp-form']) expect(within(left as HTMLElement).getByTestId(id)).toBeInTheDocument()
    expect(within(right as HTMLElement).getByTestId('tp-table')).toBeInTheDocument()
    expect(screen.queryByTestId('tp-matches')).toBeNull()
    expect(screen.queryByTestId('tp-squad')).toBeNull()
  })

  it('flikarna: bara de med innehåll; ▾ till flikens första stopp, ▴ från flikens översta rad till vald flik; fokus på en flik byter (TV)', async () => {
    await mountTv()
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['Overview', 'Matches', 'Squad', 'Trophies'])
    expect(tabs[0]).toHaveAttribute('data-f-down', '[data-page-depth="0"] [data-tab-body] [data-f]')
    const firstInBody = document.querySelector('[data-tab-body] [data-f]')!
    expect(firstInBody.getAttribute('data-f-up')).toBe('[data-page-depth="0"] [data-tab-active]')
    // Rubrikens stopp går ▾ till den valda fliken, inte förbi flikraden.
    expect(screen.getByTestId('tp-heart')).toHaveAttribute('data-f-down', '[data-page-depth="0"] [data-tab-active]')
    fireEvent.focus(screen.getByTestId('page-tab-squad'))
    expect(screen.getByTestId('page-tab-squad')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('tp-squad')).toBeInTheDocument()
    expect(screen.getByTestId('page-tab-squad')).toHaveAttribute('data-tab-active')
  })

  it('senaste fliken minns för nästa lagsida under sessionen', async () => {
    await mountTv()
    fireEvent.click(screen.getByTestId('page-tab-trophies'))
    cleanup()
    __resetTeamDataForTests()
    await mountTv()
    expect(screen.getByTestId('page-tab-trophies')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('tp-trophies')).toBeInTheDocument()
  })

  it('"19 pts" hålls ihop och pilen står i texten', async () => {
    await mountTv()
    await waitFor(() => expect(screen.getByTestId('tp-position').textContent).toContain('19\u00a0pts'))
    expect(screen.getByTestId('tp-league').querySelector('svg')).not.toBeNull()
  })
  it('titlarnas år: de åtta senaste och "+N", aldrig en klippt lista', async () => {
    const many = { success: true, trophies: Array.from({ length: 11 }, (_, i) => ({ year: 2024 - i, position: 1, name: 'La Liga' })) }
    const saved = SA['/teams/86/trophies']
    SA['/teams/86/trophies'] = many
    try {
      await mountTv()
      fireEvent.click(screen.getByTestId('page-tab-trophies'))
      expect(screen.getByTestId('tp-trophy-years').textContent).toBe('2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017 +3')
    } finally { SA['/teams/86/trophies'] = saved }
  })

  it('helsidan är tät och börjar under värdens toppkrom (menypillret), och poängen klipps aldrig', async () => {
    const page = await mountTv()
    // Tät färg: kortvariabeln är genomskinlig med bakgrundsbild och sportsidans rubrik lyste igenom.
    expect(FULL_PAGE_BG).toMatch(/^#[0-9a-f]{6}$/i)
    expect(page.style.background).toBe(FULL_PAGE_BG)
    expect(page.style.animation).toBe('')
    expect(FULL_PAGE_PADDING).toContain('var(--tv-scene-chrome-inset, 0px)')
    expect(screen.getByTestId('tp-position').style.textOverflow).toBe('')
    expect(screen.getByTestId('tp-position').style.whiteSpace).toBe('')
  })

  it('skrivbordet behåller lådan', async () => {
    __setTvModeForTests(false)
    render(<TeamPage ctx={fakeCtx({ now: NOW })} target={RM} matches={[]} depth={0} phone={false} onClose={() => {}} />)
    expect(screen.getByTestId('team-page')).toHaveAttribute('data-layout', 'drawer')
    expect(screen.getByTestId('team-page').querySelector('[data-col]')).toBeNull()
  })

  it('minsta textstorlekar i 1080-designpixlar: inget under 18, sekundärrader ≥ 20, rubrik ~40, tabellrader ≥ 22 och ≥ 56 höga, formens namn ≥ 24, formbrickor ≥ 30', async () => {
    const page = await mountTv()
    expect(Math.min(...fontSizes(page))).toBeGreaterThanOrEqual(18)
    expect(px(screen.getByTestId('tp-name'))).toBeGreaterThanOrEqual(40)
    expect(px(screen.getByTestId('tp-league'))).toBeGreaterThanOrEqual(20)
    const row = within(screen.getByTestId('tp-standings')).getAllByTestId('page-standings-row')[0]
    expect(px(row)).toBeGreaterThanOrEqual(22)
    expect(parseFloat(row.style.minHeight)).toBeGreaterThanOrEqual(56)
    expect(px(screen.getByTestId('page-tab-overview'))).toBeGreaterThanOrEqual(24)
    const form = screen.getAllByTestId('tp-form-row')[0]
    expect(Math.max(...fontSizes(form))).toBeGreaterThanOrEqual(24)
    const letter = within(form).getByTestId('form-letter')
    expect(parseFloat(letter.style.width)).toBeGreaterThanOrEqual(30)
    // Sekundärtext i muted (kontrast), aldrig dim.
    expect(page.innerHTML).not.toContain(TV.dim)
  })

  it('grannarna mellan kolumnerna: vänster ▸ till en station i högerkolumnen och tvärtom; rubrikens egna grannar står kvar', async () => {
    const page = await mountTv()
    await waitFor(() => expect(page.querySelector('[data-col="left"] [data-f-right-auto]')).not.toBeNull())
    const right = page.querySelector('[data-col="right"]')!
    for (const el of Array.from(page.querySelectorAll('[data-col="left"] [data-f-right-auto]'))) {
      const target = page.querySelector(el.getAttribute('data-f-right')!.replace('[data-page-depth="0"] ', ''))
      expect(right.contains(target)).toBe(true)
    }
    const left = page.querySelector('[data-col="left"]')!
    const fromRight = Array.from(page.querySelectorAll('[data-col="right"] [data-f-left-auto]'))
    expect(fromRight.length).toBeGreaterThan(0)
    for (const el of fromRight) expect(left.contains(page.querySelector(el.getAttribute('data-f-left')!.replace('[data-page-depth="0"] ', '')))).toBe(true)
    expect(screen.getByTestId('tp-league').getAttribute('data-f-right')).toContain('tp-heart')
  })
})

describe('Ligasidan i TV-läget', () => {
  it('helsida med flikarna Tabell, omgången och Skytteliga', async () => {
    __setTvModeForTests(true)
    render(<LeaguePage ctx={fakeCtx({ now: NOW })} target={{ sport: 'football', name: 'Premier League', key: 'pl', ref: { provider: 'sportapi', id: '24', season: null, name: 'Premier League' } }} depth={0} phone={false} onClose={() => {}} />)
    await screen.findByTestId('page-tab-scorers')
    const page = screen.getByTestId('league-page')
    expect(page).toHaveAttribute('data-layout', 'page')
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Table', 'This week', 'Top scorers'])
    expect(screen.getByTestId('lp-table')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('page-tab-scorers'))
    expect(screen.getByTestId('lp-scorers')).toBeInTheDocument()
    expect(screen.queryByTestId('lp-table')).toBeNull()
    expect(Math.min(...fontSizes(page))).toBeGreaterThanOrEqual(18)
  })
})

describe('Matchinfon i TV-läget', () => {
  // Bredden (min(1064px, 100%)) tolkas inte av jsdom; den syns i webbläsarprovet.
  it('samma låda med TV-text: inget under 18, sammanhangsraden ≥ 20', () => {
    __setTvModeForTests(true)
    const m = fxMatch({ start: NOW + 3_600_000, venue: 'Friends Arena' })
    render(<MatchInfoDrawer ctx={fakeCtx({ now: NOW })} match={m} onClose={() => {}} />)
    const drawer = screen.getByTestId('match-center')
    expect(px(screen.getByTestId('mc-context'))).toBeGreaterThanOrEqual(20)
    expect(Math.min(...fontSizes(drawer))).toBeGreaterThanOrEqual(18)
  })
  it('skalan: TV 1,4, skrivbord 1, telefon 0,8; sekundärfärgen muted på TV', () => {
    expect([scaleFor(false, true)(15), scaleFor(false)(15), scaleFor(true, true)(15)]).toEqual([21, 15, 12])
    expect(scaleFor(false, true).dim).toBe(TV.muted)
    expect(scaleFor(false).dim).toBe(TV.dim)
  })
})
