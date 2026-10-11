import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { __resetPluginStorageForTests, __setLangForTests } from '@/lib/plugin-sdk'
import { SportResults, formLetters, groupResults } from './sport-results'
import { tvText } from '../../tv/tv-strings'
import { setSportSettings } from '../sport-store'
import { fxMatch } from '../__sport-fixture'
import type { SportMatch } from '../sport-model'

const tt = (k: Parameters<typeof tvText>[1], v?: Record<string, string | number>) => tvText('sv', k, v)
let n = 0
// fxMatch ger Allsvenskan, AIK - Hammarby och en källa (TV4); fixturen och ställningen läggs på här.
const m = (over: Partial<SportMatch> = {}): SportMatch => fxMatch({
  id: `m${++n}`, home: 'Malmo FF', away: 'AIK', homeKey: 'malmo', awayKey: 'aik', start: n, stop: n + 1,
  status: 'finished', score: { home: 1, away: 0 }, round: 27, coverage: 'full',
  fixture: { provider: 'api-sports', id: `f${n}`, leagueId: '113', season: '2026' }, ...over,
})

beforeEach(() => { __resetPluginStorageForTests(); __setLangForTests('sv') })
afterEach(() => { cleanup(); __setLangForTests('en') })

describe('groupResults', () => {
  it('ligagrupper med omgång; tennis och EPG utan fixtur listas aldrig', () => {
    const list = [m(), m({ status: 'live' }), m({ kind: 'hockey', league: 'SHL', fixture: { provider: 'api-sports', id: 'h', leagueId: '47', season: '2026' } }), m({ kind: 'tennis', coverage: 'epg' }), m({ fixture: undefined })]
    const r = groupResults(list, 'all')
    expect(r.groups.map((g) => [g.league, g.round, g.matches.length])).toEqual([['Allsvenskan', 27, 2], ['SHL', 27, 1]])
    expect(r.liveCount).toBe(1)
    expect(r.mineCount).toBe(3)
  })
  it('Bara live och Mina kanaler', () => {
    const list = [m({ status: 'live' }), m(), m({ resultOnly: true, sources: [] })]
    expect(groupResults(list, 'live').groups[0].matches).toHaveLength(1)
    expect(groupResults(list, 'mine').groups[0].matches).toHaveLength(2)
  })
  it('form på svenska', () => {
    expect(formLetters('WDL', tt).map((f) => f.letter).join('')).toBe('VOF')
    expect(formLetters(null, tt)).toEqual([])
  })
})

describe('SportResults', () => {
  it('utan nyckel: nyckelkortet (inget "Inte nu")', () => {
    render(<SportResults matches={[]} controller={null} onOpenMatch={vi.fn()} tv={false} />)
    expect(screen.getByTestId('sport-key-card-tab')).toBeTruthy()
    expect(screen.queryByText('Inte nu')).toBeNull()
  })
  it('med nyckel: grupper, HOPPA TILL och Tabell med form', async () => {
    setSportSettings({ apiKey: 'k123' })
    const rows = [{ rank: 1, team: { id: '363', name: 'AIK Stockholm', crest: null }, played: 26, points: 58, goalDiff: 25, form: 'WWDWW', group: null }]
    const controller = { standings: vi.fn(() => null), loadStandings: vi.fn(async () => rows), subscribe: () => () => {} }
    render(<SportResults matches={[m()]} controller={controller as never} onOpenMatch={vi.fn()} tv={false} />)
    expect(screen.getByText('Allsvenskan · Omgång 27')).toBeTruthy()
    expect(screen.getByText('DINA LIGOR')).toBeTruthy()
    fireEvent.click(screen.getByText('Tabell'))
    await waitFor(() => expect(screen.getByText('AIK Stockholm')).toBeTruthy())
    expect(controller.loadStandings).toHaveBeenCalledWith('football', '113', '2026')
    expect(screen.getByText('58')).toBeTruthy()
  })

  it('Dina ligor: kort rad med kopplade ligor, dubblettnamn med land, sportchipet respekteras; Fler ligor… öppnar lådan per land och hoppar', async () => {
    setSportSettings({ apiKey: 'k123' })
    const controller = { standings: vi.fn(() => null), loadStandings: vi.fn(async () => null), subscribe: () => () => {} }
    const fx = (leagueId: string, country: string) => ({ provider: 'api-sports', id: `f${++n}`, leagueId, season: '2026', country })
    const world = [
      m({ league: 'Allsvenskan', fixture: fx('113', 'Sweden') }),
      m({ league: 'Premier League', fixture: fx('39', 'England'), status: 'live' }),
      ...Array.from({ length: 3 }, () => m({ league: 'Premier League', fixture: fx('500', 'Wales'), resultOnly: true, sources: [] })),
      m({ league: 'Primera División', fixture: fx('140', 'Spain'), resultOnly: true, sources: [] }),
      m({ kind: 'hockey', league: 'SHL', fixture: fx('47', 'Sweden'), resultOnly: true, sources: [] }),
    ]
    const layers: Array<() => void> = []
    const nav = { pushLayer: (close: () => void) => { layers.push(close); return () => {} } }
    const { rerender } = render(<SportResults matches={world} controller={controller as never} onOpenMatch={vi.fn()} tv={false} nav={nav as never} />)
    const row = screen.getByTestId('your-leagues')
    expect(row.textContent).toContain('DINA LIGOR')
    // Kopplade (Allsvenskan, PL England) — inte okopplade Wales/Spanien/SHL.
    expect([...row.querySelectorAll('[data-testid^="league-chip-"]')].map((c) => c.textContent)).toEqual(['Premier League · England1', 'Allsvenskan1'])
    expect(row.querySelectorAll('[data-testid="league-live-dot"]')).toHaveLength(1)
    expect(screen.getByText('Premier League · Wales · Omgång 27')).toBeTruthy()

    fireEvent.click(screen.getByTestId('league-more'))
    const drawer = screen.getByTestId('league-drawer')
    expect([...drawer.querySelectorAll('[data-testid^="league-country-"]')].map((g) => g.getAttribute('data-testid'))).toEqual(['league-country-Sweden', 'league-country-Wales', 'league-country-England', 'league-country-Spain'])
    fireEvent.change(screen.getByTestId('league-search'), { target: { value: 'primera' } })
    const hits = drawer.querySelectorAll('[data-testid^="league-row-"]')
    expect(hits).toHaveLength(1)
    expect(hits[0].textContent).toContain('Spain')
    const scroll = vi.fn()
    ;(screen.getByTestId('results-group-football|140') as HTMLElement).scrollIntoView = scroll
    fireEvent.click(hits[0])
    expect(layers).toHaveLength(1)
    await waitFor(() => expect(scroll).toHaveBeenCalled())

    rerender(<SportResults matches={world} controller={controller as never} onOpenMatch={vi.fn()} tv={false} nav={nav as never} sport="hockey" />)
    expect(screen.getByText('FLEST MATCHER')).toBeTruthy()
    expect([...screen.getByTestId('your-leagues').querySelectorAll('[data-testid^="league-chip-"]')].map((c) => c.textContent)).toEqual(['SHL1'])
    expect(screen.queryByText('Allsvenskan · Omgång 27')).toBeNull()
  })
})
