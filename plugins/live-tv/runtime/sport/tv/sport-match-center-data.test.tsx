import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { __resetPluginStorageForTests, __setLangForTests } from '@/lib/plugin-sdk'
import { MatchCenterData } from './sport-match-center-data'
import { apiSports } from '../api-sports'
import { getSportSettings } from '../sport-store'
import { fxMatch } from '../__sport-fixture'
import footballId from '../__fixtures__/api-sports/football-fixture-id.json'
import hockeyDate from '../__fixtures__/api-sports/hockey-games-date.json'
import hockeyEvents from '../__fixtures__/api-sports/hockey-games-events.json'
import type { SportMatch } from '../sport-model'

const match = (over: Partial<SportMatch> = {}): SportMatch => fxMatch({
  id: 'm1', home: 'Malmo FF', away: 'Djurgardens IF', homeKey: 'malmo', awayKey: 'dif', league: 'Allsvenskan', leagueKey: 'a',
  start: Date.now(), stop: Date.now() + 1, status: 'live', minute: 67, score: { home: 2, away: 1 }, coverage: 'full',
  fixture: { provider: 'api-sports', id: '1180001' }, ...over,
})

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

beforeEach(() => { __resetPluginStorageForTests(); __setLangForTests('sv') })
afterEach(() => { cleanup(); __setLangForTests('en'); h.controller = null })

describe('MatchCenterData', () => {
  it('fotboll: händelser, statistik och uppställningar', async () => {
    const c = fakeController(apiSports.fixture('football', '1180001', { finished: false }).parse([footballId]))
    render(<MatchCenterData match={match()} />)
    await waitFor(() => expect(screen.getByText('Händelser')).toBeTruthy())
    expect(c.loadFixture).toHaveBeenCalledWith('football', '1180001', false)
    expect(screen.getByText('Gult kort')).toBeTruthy()
    expect(screen.getByText('Bollinnehav')).toBeTruthy()
    expect(screen.getByText('Laguppställningar')).toBeTruthy()
    expect(screen.getByText('I. Kiese Thelin', { selector: '[data-lineup] *' })).toBeTruthy()
    expect(screen.getByTestId('sport-rate-line').textContent).toContain('Uppdateras var 3:e min · 41 anrop kvar i dag')
  })
  it('tidslinjen 0–90 med halvtidsstreck, mål och kort som markörer (hemma ovanför, borta under), nu-markör på minuten, listan under', async () => {
    fakeController(apiSports.fixture('football', '1180001', { finished: false }).parse([footballId]))
    render(<MatchCenterData match={match()} />)
    const line = await screen.findByTestId('mc-timeline')
    expect(line.getAttribute('data-length')).toBe('90')
    expect(Array.from(line.querySelectorAll('[data-period]')).map((p) => p.getAttribute('data-period'))).toEqual(['45'])
    const markers = screen.getAllByTestId('mc-marker')
    expect(markers.length).toBeGreaterThan(0)
    for (const mk of markers) expect(['goal', 'yellow', 'red']).toContain(mk.getAttribute('data-kind'))
    const away = markers.find((mk) => mk.getAttribute('data-side') === 'away')
    const home = markers.find((mk) => mk.getAttribute('data-side') === 'home')
    if (away && home) expect(parseFloat(away.style.top)).toBeGreaterThan(parseFloat(home.style.top))
    expect(screen.getByTestId('mc-timeline-now').style.left).toBe(`${(67 / 90) * 100}%`)
    const events = screen.getAllByTestId('mc-event')
    expect(line.compareDocumentPosition(events[0]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
  it('hockey: tre perioder på tidslinjen', async () => {
    fakeController(apiSports.fixture('hockey', '51001', { finished: false }).parse([{ response: [hockeyDate.response[0]] }, hockeyEvents]))
    render(<MatchCenterData match={match({ kind: 'hockey', minute: null, fixture: { provider: 'api-sports', id: '51001' } })} />)
    const line = await screen.findByTestId('mc-timeline')
    expect(line.getAttribute('data-length')).toBe('60')
    expect(Array.from(line.querySelectorAll('[data-period]')).map((p) => p.getAttribute('data-period'))).toEqual(['20', '40'])
    expect(screen.queryByTestId('mc-timeline-now')).toBeNull()
  })
  it('pågående match: minuten ensam hämtar inte om, ett mål gör det', async () => {
    const c = fakeController(null)
    const { rerender } = render(<MatchCenterData match={match()} />)
    await waitFor(() => expect(c.loadFixture).toHaveBeenCalledTimes(1))
    rerender(<MatchCenterData match={match({ minute: 68 })} />)
    rerender(<MatchCenterData match={match({ minute: 69 })} />)
    await Promise.resolve()
    expect(c.loadFixture).toHaveBeenCalledTimes(1)
    rerender(<MatchCenterData match={match({ minute: 70, score: { home: 3, away: 1 } })} />)
    await waitFor(() => expect(c.loadFixture).toHaveBeenCalledTimes(2))
  })
  it('hockey: tom statistik och tomma uppställningar döljs', async () => {
    fakeController(apiSports.fixture('hockey', '51001', { finished: false }).parse([{ response: [hockeyDate.response[0]] }, hockeyEvents]))
    render(<MatchCenterData match={match({ kind: 'hockey', fixture: { provider: 'api-sports', id: '51001' } })} />)
    await waitFor(() => expect(screen.getByText('Händelser')).toBeTruthy())
    expect(screen.getByText('Utvisning')).toBeTruthy()
    expect(screen.queryByText('Statistik')).toBeNull()
    expect(screen.queryByText('Laguppställningar')).toBeNull()
  })
  it('otäckt sport eller ingen fixtur: ingenting och inga anrop', () => {
    const c = fakeController(null)
    const { container } = render(<MatchCenterData match={match({ kind: 'tennis', coverage: 'epg', fixture: undefined })} />)
    expect(container.innerHTML).toBe('')
    expect(c.loadFixture).not.toHaveBeenCalled()
  })
  it('Notis vid mål sparas per match och säger att det bara gäller när appen körs', async () => {
    fakeController(null)
    render(<MatchCenterData match={match()} />)
    expect(screen.getByText('Bara när appen körs')).toBeTruthy()
    fireEvent.click(screen.getByTestId('sport-goal-alert'))
    expect(Object.keys(getSportSettings().goalAlertMatches)).toEqual(['m1'])
  })
})
