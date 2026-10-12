import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../../live-tv-data'
import { SPORT_OVERRIDES_KEY, getFollows, getOverrides, getSportSettings } from '../sport-store'
import { MatchInfoDrawer } from './match-info-drawer'
import { apiSports } from '../api-sports'
import footballId from '../__fixtures__/api-sports/football-fixture-id.json'
import { MIN, fakeCtx, fxMatch, fxSource } from '../__sport-fixture'
import type { SportMatch } from '../sport-model'

const h = vi.hoisted(() => ({ controller: null as unknown }))
vi.mock('../results-controller', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../results-controller')>()),
  useResultsController: () => h.controller,
}))
function fakeController(detail: unknown) {
  const c = { loadFixture: vi.fn(async () => detail), status: () => ({ provider: 'api-sports', state: 'ok', intervalMs: 180_000, remainingToday: 41, pausedUntil: null, paid: false }), subscribe: () => () => {} }
  h.controller = c
  return c
}

afterEach(() => { cleanup(); h.controller = null })
beforeEach(() => __resetForTests())
const now = Date.now()
const m = fxMatch({
  id: 'm', home: 'FC Barcelona', away: 'Paris SG', homeKey: 'barcelona', awayKey: 'paris saint germain',
  league: 'Champions League', leagueKey: 'uefa-champions-league', venue: 'Estadi Olímpic', round: 5,
  start: now - 30 * MIN, stop: now + 90 * MIN,
  sources: [fxSource('V Sport Fotboll', { quality: 'FHD' }), fxSource('V Sport Fotboll HD', { quality: 'HD', sourceId: 'src-b' })],
})
const covered = (over: Partial<SportMatch> = {}): SportMatch => ({
  ...m, home: 'Malmo FF', away: 'Djurgardens IF', homeKey: 'malmo', awayKey: 'dif', venue: 'Eleda Stadion',
  coverage: 'full', status: 'live', minute: 31, score: { home: 2, away: 1 }, fixture: { provider: 'api-sports', id: '1180001' }, ...over,
})
const detail = () => apiSports.fixture('football', '1180001', { finished: false }).parse([footballId])

/** Bakåt-kedjan som en stack: den senast registrerade stängs först. */
function layeredCtx() {
  const ctx = fakeCtx({ now })
  const stack: Array<() => void> = []
  ;(ctx.nav.pushLayer as ReturnType<typeof vi.fn>).mockImplementation((close: () => void) => { stack.push(close); return () => { const i = stack.indexOf(close); if (i >= 0) stack.splice(i, 1) } })
  return { ctx, back: () => act(() => { stack[stack.length - 1]?.() }), stack }
}

describe('Matchinfon: toppen', () => {
  it('LIVE-pill, "liga · arena", följ liga (hjärta), klocka och stäng', () => {
    const ctx = fakeCtx({ now })
    render(<MatchInfoDrawer ctx={ctx} match={m} onClose={() => {}} />)
    expect(screen.getByTestId('mc-status')).toHaveTextContent('LIVE')
    expect(screen.getByTestId('mc-context')).toHaveTextContent(/^Champions League · Estadi Olímpic$/)
    const league = screen.getByTestId('mc-follow-league')
    expect(league.querySelector('svg path')?.getAttribute('d')).toMatch(/^M12 21s/)
    fireEvent.click(league)
    expect(getFollows()).toEqual([{ sport: 'football', kind: 'league', key: 'uefa-champions-league', name: 'Champions League' }])
    fireEvent.click(screen.getByTestId('mc-remind'))
    expect(ctx.toggleRemind).toHaveBeenCalledWith(m)
    expect(ctx.nav.pushLayer).toHaveBeenCalledTimes(1)
  })
  it('lagen: märken, ställning "2 : 1", "31\' · in progress" och följ-pill per lag', () => {
    render(<MatchInfoDrawer ctx={fakeCtx({ now, follows: [{ sport: 'football', kind: 'team', key: 'malmo', name: 'Malmo FF' }] })} match={covered()} onClose={() => {}} />)
    const head = screen.getByTestId('mc-head')
    expect(head.querySelectorAll('[data-crest]')).toHaveLength(2)
    expect(screen.getByTestId('mc-score')).toHaveTextContent('2 : 1')
    expect(screen.getByTestId('mc-scoreline')).toHaveTextContent("31' · in progress")
    expect(screen.getByTestId('mc-follow-home')).toHaveTextContent('Following')
    expect(screen.getByTestId('mc-follow-away')).toHaveTextContent('Follow')
    fireEvent.click(screen.getByTestId('mc-follow-away'))
    expect(getFollows().map((f) => f.key)).toEqual(['dif'])
  })
  it('pågående täckt match: klockan är Notis vid mål (per match)', () => {
    fakeController(null)
    render(<MatchInfoDrawer ctx={fakeCtx({ now })} match={covered()} onClose={() => {}} />)
    expect(screen.queryByTestId('mc-remind')).toBeNull()
    fireEvent.click(screen.getByTestId('mc-goal-alert'))
    expect(Object.keys(getSportSettings().goalAlertMatches)).toEqual(['m'])
  })
})

describe('Matchinfon: SE MATCHEN', () => {
  it('källrader med spellista, kvalitet och BÄST; Välj annan kanal; Titta · FHD spelar vald källa', () => {
    const ctx = fakeCtx({ now })
    const onClose = vi.fn()
    render(<MatchInfoDrawer ctx={ctx} match={m} onClose={onClose} />)
    const rows = screen.getAllByTestId('mc-source')
    expect(rows[0]).toHaveTextContent('V Sport Fotboll')
    expect(rows[0]).toHaveTextContent('Xtream')
    expect(rows[0]).not.toHaveTextContent('—')
    expect(screen.getByTestId('mc-best')).toHaveTextContent('BEST')
    expect(screen.getByTestId('mc-pick-channel')).toHaveTextContent('Choose another channel')
    expect(screen.getByTestId('mc-watch')).toHaveTextContent('Watch · FHD')
    fireEvent.click(rows[1]!)
    fireEvent.click(screen.getByTestId('mc-watch'))
    expect(ctx.watch).toHaveBeenCalledWith(m, m.sources[1])
    expect(onClose).toHaveBeenCalled()
  })
  it('Välj annan kanal ritas helt tät ovanpå matchlådan (ingen genomlysning)', () => {
    const ctx = fakeCtx({ now })
    Object.assign(ctx.model, { favouriteChannels: [], groups: [], channels: [] })
    render(<MatchInfoDrawer ctx={ctx} match={m} onClose={vi.fn()} />)
    fireEvent.click(screen.getByTestId('mc-pick-channel'))
    const picker = screen.getByTestId('channel-picker')
    // Bakgrunden är var(--sport-drawer-solid, …) (jsdom släpper var() i stilen; konstanten testas i surface.test): ingen oskärpa, ingen genomlysning.
    expect(picker.style.backdropFilter || '').not.toContain('blur')
    expect(picker.style.backdropFilter).toBe('none')
  })
  it('åsidosättningen står först som Ditt val och kan tas bort', () => {
    const override = { key: 'C::http://y/C', name: 'C 4K', url: 'http://y/C', logo: null, group: 'Sport', tvgId: null }
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_OVERRIDES_KEY, { m: override })
    render(<MatchInfoDrawer ctx={fakeCtx({ now, overrides: { m: override } })} match={m} onClose={() => {}} />)
    expect(screen.getAllByTestId('mc-source')[0]).toHaveTextContent('Your choice')
    fireEvent.click(screen.getByTestId('mc-clear-override'))
    expect(getOverrides().m).toBeUndefined()
  })
  it('EPG-match utan fixtur: bara arenaraden under MATCHEN och inga anrop', () => {
    const c = fakeController(null)
    render(<MatchInfoDrawer ctx={fakeCtx({ now })} match={m} onClose={() => {}} />)
    expect(screen.queryByTestId('mc-row-events')).toBeNull()
    expect(screen.getByTestId('mc-row-venue')).toHaveTextContent('Estadi Olímpic')
    expect(c.loadFixture).not.toHaveBeenCalled()
  })
})

describe('Matchinfon: MATCHEN och undersidorna (ett anrop)', () => {
  it('rader med sammanfattning; Händelser: hemma vänster, borta speglad, statistik med dubbla staplar; Bakåt en nivå', async () => {
    const c = fakeController(detail())
    const { ctx, back } = layeredCtx()
    render(<MatchInfoDrawer ctx={ctx} match={covered()} onClose={() => {}} />)
    await waitFor(() => expect(screen.getByTestId('mc-row-events')).toHaveTextContent('3 goals · 1 cards'))
    expect(screen.getByTestId('mc-row-lineups')).toHaveTextContent('Starting line-ups')
    expect(screen.getByTestId('mc-row-venue')).toHaveTextContent('Eleda Stadion')
    fireEvent.click(screen.getByTestId('mc-row-events'))
    expect(screen.getByTestId('match-center').getAttribute('data-page')).toBe('events')
    const events = screen.getAllByTestId('mc-event')
    expect(events.map((e) => e.getAttribute('data-align'))).toEqual(['start', 'end', 'end', 'start'])
    expect(events[0]).toHaveTextContent("12'I. Kiese Thelin")
    expect(events[0]).toHaveTextContent('Goal · Assist: A. Christiansen · Malmo FF')
    expect(events[1]).toHaveTextContent('Yellow card · Djurgardens IF')
    const stats = screen.getAllByTestId('mc-stat')
    expect(stats[0]).toHaveTextContent('Ball possession')
    expect(stats[0]!.querySelector('[data-bar="home"]')).not.toBeNull()
    back()
    expect(screen.getByTestId('match-center').getAttribute('data-page')).toBe('main')
    expect(c.loadFixture).toHaveBeenCalledTimes(1)
  })
  it('Laguppställningar per position, borta speglad; spelaren öppnar en profil; Bakåt till uppställningarna', async () => {
    const c = fakeController(detail())
    const { ctx, back } = layeredCtx()
    render(<MatchInfoDrawer ctx={ctx} match={covered()} onClose={() => {}} />)
    fireEvent.click(await screen.findByTestId('mc-row-lineups'))
    const gk = screen.getByTestId('mc-lineup-gk')
    expect(gk).toHaveTextContent('Goalkeeper')
    expect(within(gk).getAllByTestId('mc-player').map((p) => [p.getAttribute('data-side'), p.textContent])).toEqual([['home', 'JDJ. Dahlin1'], ['away', 'JWJ. Widell Zetterström35']])
    fireEvent.click(within(screen.getByTestId('mc-lineup-att')).getAllByTestId('mc-player')[0]!)
    const profile = screen.getByTestId('mc-player-profile')
    expect(profile).toHaveTextContent('I. Kiese Thelin')
    expect(profile).toHaveTextContent('#9 · Malmo FF')
    expect(profile).toHaveTextContent('Attack')
    expect(profile).toHaveTextContent('Goals1')
    back()
    expect(screen.getByTestId('match-center').getAttribute('data-page')).toBe('lineups')
    back()
    expect(screen.getByTestId('match-center').getAttribute('data-page')).toBe('main')
    expect(c.loadFixture).toHaveBeenCalledTimes(1)
  })
  it('Arena: namn och stad ur fixturen, bilden från källans CDN', async () => {
    fakeController(detail())
    render(<MatchInfoDrawer ctx={fakeCtx({ now })} match={covered({ venueImage: 'https://media.api-sports.io/football/venues/1460.png' })} onClose={() => {}} />)
    await waitFor(() => expect(screen.getByTestId('mc-row-lineups')).toBeTruthy())
    fireEvent.click(screen.getByTestId('mc-row-venue'))
    const venue = screen.getByTestId('mc-venue')
    expect(venue).toHaveTextContent('Eleda Stadion')
    expect(venue).toHaveTextContent('CityMalmö')
    expect(screen.getByTestId('mc-venue-image')).toBeTruthy()
  })
  it('arena utan mer data: bara namnet', () => {
    render(<MatchInfoDrawer ctx={fakeCtx({ now })} match={m} onClose={() => {}} />)
    fireEvent.click(screen.getByTestId('mc-row-venue'))
    expect(screen.getByTestId('mc-venue')).toHaveTextContent('The source has no more about the venue.')
  })
})

describe('Matchinfon: repris', () => {
  const replay = (over: Partial<SportMatch> = {}) => covered({
    rerun: true, status: 'finished', minute: null, fixture: undefined, score: undefined,
    replayOf: { kickoff: new Date(2026, 9, 10, 17, 30).getTime(), score: { home: 2, away: 0 }, fixture: { provider: 'api-sports', id: '1180001' } }, ...over,
  })
  function replayController(detail: unknown) {
    const c = { loadFixture: vi.fn(async () => null), cachedFixture: vi.fn(async () => detail), status: () => ({ provider: 'api-sports', state: 'ok', intervalMs: null, remainingToday: 41, pausedUntil: null, paid: false }), subscribe: () => () => {} }
    h.controller = c
    return c
  }

  it('neutral REPRIS-pill, originalets slutresultat och datum — aldrig LIVE eller minut', () => {
    replayController(null)
    render(<MatchInfoDrawer ctx={fakeCtx({ now })} match={replay()} onClose={() => {}} />)
    const pill = screen.getByTestId('mc-status')
    expect(pill).toHaveTextContent('Replay')
    expect(pill).toHaveAttribute('data-live', '0')
    expect(screen.getByTestId('mc-score')).toHaveTextContent('2 : 0')
    expect(screen.getByTestId('mc-status-line')).toHaveTextContent(/^Played Sat 10 Oct$/)
    expect(screen.queryByText(/LIVE/)).toBeNull()
    expect(screen.queryByTestId('mc-goal-alert')).toBeNull()
  })

  it('händelser och statistik ur originalmatchen, bara ur cachen (aldrig loadFixture)', async () => {
    const c = replayController(detail())
    render(<MatchInfoDrawer ctx={fakeCtx({ now })} match={replay()} onClose={() => {}} />)
    await waitFor(() => expect(screen.getByTestId('mc-row-events')).not.toHaveTextContent('…'))
    expect(c.cachedFixture).toHaveBeenCalledWith('football', { provider: 'api-sports', id: '1180001' })
    expect(c.loadFixture).not.toHaveBeenCalled()
  })

  it('repris utan originalmatch i cachen: pill och "Replay", ingen ställning, inga anrop', () => {
    const c = replayController(null)
    render(<MatchInfoDrawer ctx={fakeCtx({ now })} match={replay({ replayOf: undefined })} onClose={() => {}} />)
    expect(screen.getByTestId('mc-status')).toHaveTextContent('Replay')
    expect(screen.queryByTestId('mc-score')).toBeNull()
    expect(screen.queryByTestId('mc-row-events')).toBeNull()
    expect(c.cachedFixture).not.toHaveBeenCalled()
    expect(c.loadFixture).not.toHaveBeenCalled()
  })
})
