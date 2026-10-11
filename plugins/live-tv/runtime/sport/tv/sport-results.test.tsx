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
  it('utan nyckel: nyckelkortet; efter "Inte nu": den diskreta raden', () => {
    const { rerender } = render(<SportResults matches={[]} controller={null} onOpenMatch={vi.fn()} tv={false} />)
    expect(screen.getByTestId('sport-key-card-tab')).toBeTruthy()
    setSportSettings({ keyCardDismissed: true })
    rerender(<SportResults matches={[]} controller={null} onOpenMatch={vi.fn()} tv={false} />)
    expect(screen.getByText('Visa resultat – lägg till nyckel')).toBeTruthy()
  })
  it('med nyckel: grupper, HOPPA TILL och Tabell med form', async () => {
    setSportSettings({ apiKey: 'k123' })
    const rows = [{ rank: 1, team: { id: '363', name: 'AIK Stockholm', crest: null }, played: 26, points: 58, goalDiff: 25, form: 'WWDWW', group: null }]
    const controller = { standings: vi.fn(() => null), loadStandings: vi.fn(async () => rows), subscribe: () => () => {} }
    render(<SportResults matches={[m()]} controller={controller as never} onOpenMatch={vi.fn()} tv={false} />)
    expect(screen.getByText('Allsvenskan · Omgång 27')).toBeTruthy()
    expect(screen.getByText('HOPPA TILL')).toBeTruthy()
    fireEvent.click(screen.getByText('Tabell'))
    await waitFor(() => expect(screen.getByText('AIK Stockholm')).toBeTruthy())
    expect(controller.loadStandings).toHaveBeenCalledWith('football', '113', '2026')
    expect(screen.getByText('58')).toBeTruthy()
  })
})
