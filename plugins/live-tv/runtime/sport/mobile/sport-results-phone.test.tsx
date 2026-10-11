import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { __resetPluginStorageForTests, __setLangForTests } from '@/lib/plugin-sdk'
import { SportResultsPhone } from './sport-results-phone'
import { PhoneFollowSearch } from './sport-follow-search-phone'
import { getFollows, setSportSettings } from '../sport-store'
import { foldTeamKey } from '../merge'
import { fxMatch } from '../__sport-fixture'
import type { SportMatch } from '../sport-model'

vi.mock('../follow-search', () => ({
  searchProviderTeams: vi.fn(async () => [{ id: '375', name: 'Malmo FF', crest: null, country: 'Sweden' }]),
}))

// Rå källtext för telefonträdet: samma grepp som deleted-desktop-views.test.ts.
const sources = import.meta.glob('./*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

let n = 0
const m = (over: Partial<SportMatch> = {}): SportMatch => fxMatch({
  id: `p${++n}`, home: 'Malmo FF', away: 'AIK', homeKey: 'malmo', awayKey: 'aik', start: n, stop: n + 1,
  status: 'finished', score: { home: 1, away: 0 }, round: 27, coverage: 'full',
  fixture: { provider: 'api-sports', id: `f${n}`, leagueId: '113', season: '2026' }, ...over,
})
const pushLayer = () => () => {}
const rows = [{ rank: 1, team: { id: '363', name: 'AIK Stockholm', crest: null }, played: 26, points: 58, goalDiff: 25, form: 'WWDWL', group: null }]
const fakeController = () => ({ standings: vi.fn(() => null), loadStandings: vi.fn(async () => rows), subscribe: () => () => {} })

beforeEach(() => { __resetPluginStorageForTests(); __setLangForTests('sv') })
afterEach(() => { cleanup(); __setLangForTests('en') })

describe('Resultat på telefon', () => {
  it('utan nyckel: nyckelkortet (inget "Inte nu")', () => {
    render(<SportResultsPhone matches={[]} controller={null} onOpenMatch={vi.fn()} pushLayer={pushLayer} />)
    expect(screen.getByTestId('sport-key-card-tab')).toBeTruthy()
    expect(screen.queryByText('Inte nu')).toBeNull()
  })

  it('med nyckel: ligagrupp med omgång, ställning, filter och HOPPA TILL; tryck öppnar matchen', () => {
    setSportSettings({ apiKey: 'k123' })
    const open = vi.fn()
    const live = m({ status: 'live', minute: 67, score: { home: 2, away: 1 } })
    render(<SportResultsPhone matches={[m(), live, m({ kind: 'tennis', coverage: 'epg' })]} controller={fakeController() as never} onOpenMatch={open} pushLayer={pushLayer} />)
    expect(screen.getByText('Allsvenskan · Omgång 27')).toBeTruthy()
    expect(screen.getByText('HOPPA TILL')).toBeTruthy()
    expect(screen.getAllByTestId('phone-result-score').map((e) => e.textContent)).toEqual(['2–1', '1–0']) // `live` skapades först och har tidigast start
    fireEvent.click(screen.getByTestId('chip-live'))
    expect(screen.getAllByTestId('phone-result-row')).toHaveLength(1)
    fireEvent.click(screen.getAllByTestId('phone-result-row')[0]!)
    expect(open).toHaveBeenCalledWith(live)
  })

  it('Tabell öppnar ett ark med M, P och form på svenska', async () => {
    setSportSettings({ apiKey: 'k123' })
    const controller = fakeController()
    render(<SportResultsPhone matches={[m()]} controller={controller as never} onOpenMatch={vi.fn()} pushLayer={pushLayer} />)
    fireEvent.click(screen.getByTestId('phone-table-football|113'))
    const sheet = await screen.findByTestId('phone-standings-sheet')
    await waitFor(() => expect(within(sheet).getByText('AIK Stockholm')).toBeTruthy())
    expect(within(sheet).getByText('58')).toBeTruthy()
    expect(within(sheet).getByText('26')).toBeTruthy()
    expect(within(sheet).getAllByTestId('phone-form').map((e) => e.textContent).join('')).toBe('VVOVF')
    expect(controller.loadStandings).toHaveBeenCalledWith('football', '113', '2026')
  })

  it('telefonträdet importerar aldrig ur sport/tv (importcykelregeln)', () => {
    const offenders = Object.entries(sources).filter(([file, src]) => !file.includes('.test.') && /from '\.\.\/tv\//.test(src)).map(([file]) => file)
    expect(Object.keys(sources).length).toBeGreaterThan(2)
    expect(offenders).toEqual([])
  })
})

describe('Sök i källan på telefon', () => {
  it('utan nyckel ritas inget sökfält', () => {
    const { container } = render(<PhoneFollowSearch sport="football" />)
    expect(container.textContent).toBe('')
  })

  it('sökningen skickas med Sök, och en träff följs med källans id', async () => {
    setSportSettings({ apiKey: 'k123', provider: 'api-sports' })
    render(<PhoneFollowSearch sport="football" />)
    fireEvent.change(screen.getByTestId('phone-follow-search-input'), { target: { value: 'malmo' } })
    fireEvent.submit(screen.getByTestId('phone-follow-search-input').closest('form')!)
    fireEvent.click(await screen.findByTestId('phone-follow-hit-375'))
    expect(getFollows()).toEqual([{ sport: 'football', kind: 'team', key: foldTeamKey('Malmo FF'), name: 'Malmo FF', providerIds: { 'api-sports': '375' } }])
  })
})
