import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { __resetPluginStorageForTests, __setLangForTests } from '@/lib/plugin-sdk'
import { SportResults, formLetters, groupResults } from './sport-results'
import { tvText } from '../../tv/tv-strings'
import { setSportSettings, toggleFollow } from '../sport-store'
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

describe('SportResults: Mina lag', () => {
  it('förvalt när användaren följer något; visar följda lag och kan bytas till Alla', () => {
    setSportSettings({ apiKey: 'k123' })
    toggleFollow({ sport: 'football', kind: 'team', key: 'aik', name: 'AIK' })
    const controller = { standings: vi.fn(() => null), loadStandings: vi.fn(async () => null), subscribe: () => () => {} }
    const other = m({ home: 'Lazio', away: 'Roma', homeKey: 'lazio', awayKey: 'roma', fixture: { provider: 'api-sports', id: 'x', leagueId: '135', season: '2026' } })
    render(<SportResults matches={[m(), other]} controller={controller as never} onOpenMatch={vi.fn()} tv={false} />)
    expect(screen.getByTestId('results-filter-followed')).toHaveTextContent('Mina lag (1)')
    expect(screen.getAllByTestId(/^results-group-/).map((g) => g.getAttribute('data-testid'))).toEqual(['results-group-football|113'])
    fireEvent.click(screen.getByTestId('results-filter-all'))
    expect(screen.getAllByTestId(/^results-group-/)).toHaveLength(2)
  })
  it('utan följda: Alla förvalt', () => {
    setSportSettings({ apiKey: 'k123' })
    const controller = { standings: vi.fn(() => null), loadStandings: vi.fn(async () => null), subscribe: () => () => {} }
    render(<SportResults matches={[m()]} controller={controller as never} onOpenMatch={vi.fn()} tv={false} />)
    expect(screen.getByTestId('results-group-football|113')).toBeTruthy()
    expect(screen.getByTestId('results-filter-followed')).toHaveTextContent('Mina lag (0)')
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

  it('Dina ligor: kort rad med kopplade ligor, dubblettnamn med land, sportchipet respekteras; Fler ligor… öppnar lådan per land och filtrerar', async () => {
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
    fireEvent.click(hits[0])
    expect(layers).toHaveLength(1)
    // Valet FILTRERAR till ligan; den valda står markerad och "Alla ligor ✕" återställer.
    await waitFor(() => expect(screen.getAllByTestId(/^results-group-/).map((g) => g.getAttribute('data-testid'))).toEqual(['results-group-football|140']))
    expect(screen.getByTestId('league-chip-football|140').getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByTestId('league-reset'))
    expect(screen.getAllByTestId(/^results-group-/).length).toBeGreaterThan(1)
    // Ett chip i Dina ligor filtrerar likadant, och ett andra tryck släpper.
    fireEvent.click(screen.getByTestId('league-chip-football|113'))
    expect(screen.getAllByTestId(/^results-group-/).map((g) => g.getAttribute('data-testid'))).toEqual(['results-group-football|113'])
    fireEvent.click(screen.getByTestId('league-chip-football|113'))
    expect(screen.getAllByTestId(/^results-group-/).length).toBeGreaterThan(1)

    rerender(<SportResults matches={world} controller={controller as never} onOpenMatch={vi.fn()} tv={false} nav={nav as never} sport="hockey" />)
    expect(screen.getByText('FLEST MATCHER')).toBeTruthy()
    expect([...screen.getByTestId('your-leagues').querySelectorAll('[data-testid^="league-chip-"]')].map((c) => c.textContent)).toEqual(['SHL1'])
    expect(screen.queryByText('Allsvenskan · Omgång 27')).toBeNull()
  })
})

describe('SportResults: tabellen (Jerry 2026-10-12)', () => {
  const rows = [{ rank: 1, team: { id: '262', name: 'Djurgården', crest: null }, played: 14, points: 31, goalDiff: 21, form: 'WL', group: null }]
  const world = () => [m(), m({ home: 'Lazio', away: 'Roma', homeKey: 'lazio', awayKey: 'roma', league: 'Serie A', fixture: { provider: 'api-sports', id: 'x', leagueId: '135', season: '2026' } })]

  it('tydlig Tabell-knapp med ikon som visar och döljer; en saknad tabell säger det i stället för en tom rubrikrad', async () => {
    setSportSettings({ apiKey: 'k123' })
    const controller = { standings: vi.fn(() => null), loadStandings: vi.fn(async () => []), subscribe: () => () => {} }
    render(<SportResults matches={world()} controller={controller as never} onOpenMatch={vi.fn()} tv />)
    const btn = screen.getByTestId('results-table-football|113')
    expect(btn).toHaveAttribute('data-f')
    expect(btn.querySelector('svg')).not.toBeNull()
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(btn)
    expect(await screen.findByTestId('sport-standings-empty')).toHaveTextContent('Ingen tabell för ligan just nu.')
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    expect(btn).toHaveTextContent('Dölj tabell')
    fireEvent.click(btn)
    expect(screen.queryByTestId('sport-standings-empty')).toBeNull()
  })

  it('Alla ligor: stängda; en vald liga visar sin tabell direkt utan tryck', async () => {
    setSportSettings({ apiKey: 'k123' })
    const controller = { standings: vi.fn(() => null), loadStandings: vi.fn(async () => rows), subscribe: () => () => {} }
    render(<SportResults matches={world()} controller={controller as never} onOpenMatch={vi.fn()} tv={false} />)
    expect(screen.queryByTestId('sport-standings')).toBeNull()
    expect(controller.loadStandings).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('league-chip-football|113'))
    await waitFor(() => expect(screen.getByTestId('sport-standings')).toHaveTextContent('Djurgården'))
    expect(controller.loadStandings).toHaveBeenCalledWith('football', '113', '2026')
    expect(screen.getByTestId('results-table-football|113')).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(screen.getByTestId('league-chip-football|113'))
    expect(screen.getAllByTestId(/^results-group-/)).toHaveLength(2)
    expect(screen.queryByTestId('sport-standings')).toBeNull()
  })
})

describe('Tabeller & resultat på TV (Jerry 2026-10-12)', () => {
  const controller = () => ({ standings: vi.fn(() => null), loadStandings: vi.fn(async () => null), subscribe: () => () => {} })
  const lazio = () => m({ home: 'Lazio', away: 'Roma', homeKey: 'lazio', awayKey: 'roma', league: 'Serie A', leagueKey: 'serie-a', fixture: { provider: 'api-sports', id: `x${++n}`, leagueId: '135', season: '2026' } })

  it('chipsen är tydliga: ovald tät pill med vit text, vald fylld ljus pill med mörk text', () => {
    setSportSettings({ apiKey: 'k123' })
    render(<SportResults matches={[m()]} controller={controller() as never} onOpenMatch={vi.fn()} tv />)
    const on = screen.getByTestId('results-filter-all')
    const off = screen.getByTestId('results-filter-live')
    expect(on).toHaveAttribute('data-chip-on', '1')
    expect(on.style.background).toBe('#f3f4f8')
    expect(on.style.color).toBe('#12152a')
    expect(off).toHaveAttribute('data-chip-on', '0')
    expect(off.style.color).toBe('#f3f4f8')
    expect(off.style.border).toContain('1px solid')
    expect(screen.getByTestId('league-more')).toHaveAttribute('data-chip-on', '0')
  })

  it('Alla ligor-lådan listar varje liga i dagens data oavsett Mina lag-filtret, på tät yta', () => {
    setSportSettings({ apiKey: 'k123' })
    toggleFollow({ sport: 'football', kind: 'team', key: 'aik', name: 'AIK' })
    render(<SportResults matches={[m(), lazio()]} controller={controller() as never} onOpenMatch={vi.fn()} tv nav={{ pushLayer: () => () => {} } as never} />)
    expect(screen.getAllByTestId(/^results-group-/)).toHaveLength(1)
    fireEvent.click(screen.getByTestId('league-more'))
    const drawer = screen.getByTestId('league-drawer')
    expect(drawer.textContent).toContain('Serie A')
    expect(drawer.textContent).toContain('Allsvenskan')
    // Bakgrunden är var(--sport-drawer-solid, …) (jsdom släpper var() i stilen; konstanten testas i surface.test): ingen oskärpa, ingen genomlysning.
    expect(drawer.style.backdropFilter || '').not.toContain('blur')
  })

  it('Tabell-knappen nås ur gruppens rader: ▸ från en rad, ▴ från första raden; läsordning Tabell → rader → nästa grupps Tabell', () => {
    setSportSettings({ apiKey: 'k123' })
    const a1 = m(); const a2 = m(); const b1 = lazio()
    render(<SportResults matches={[a1, a2, b1]} controller={controller() as never} onOpenMatch={vi.fn()} tv />)
    const q = (sel: string | null) => (sel ? document.querySelector(sel) : null)
    const tableA = screen.getByTestId('results-table-football|113')
    const tableB = screen.getByTestId('results-table-football|135')
    const r1 = screen.getByTestId(`results-row-${a1.id}`)
    const r2 = screen.getByTestId(`results-row-${a2.id}`)
    expect(q(r2.getAttribute('data-f-right'))).toBe(tableA)
    expect(q(r1.getAttribute('data-f-up'))).toBe(tableA)
    expect(q(tableA.getAttribute('data-f-down'))).toBe(r1)
    expect(q(tableA.getAttribute('data-f-left'))).toBe(r1)
    expect(q(r2.getAttribute('data-f-down'))).toBe(tableB)
    expect(q(tableB.getAttribute('data-f-up'))).toBe(r2)
  })

  it('öppen tabell på TV: lag- och ligasidans rader i TV-skala, kompakt bredd, formbrickor, följda lag markerade, raderna öppnar lagets sida', async () => {
    setSportSettings({ apiKey: 'k123' })
    toggleFollow({ sport: 'football', kind: 'team', key: 'aik', name: 'AIK' })
    const rows = [
      { rank: 1, team: { id: '363', name: 'AIK Stockholm', crest: null }, played: 26, points: 58, goalDiff: 25, form: 'WWDWL', group: null },
      { rank: 2, team: { id: '375', name: 'Malmo FF', crest: null }, played: 26, points: 52, goalDiff: 18, form: 'LWW', group: null },
    ]
    const c = { standings: vi.fn(() => null), loadStandings: vi.fn(async () => rows), standingsSource: vi.fn(() => ({ provider: 'sportapi', leagueId: 'sa-113', season: 'current' })), subscribe: () => () => {} }
    const onOpenTeam = vi.fn()
    const a1 = m(); const b1 = lazio()
    render(<SportResults matches={[a1, b1]} controller={c as never} onOpenMatch={vi.fn()} onOpenTeam={onOpenTeam} tv />)
    fireEvent.click(screen.getByTestId('results-filter-all'))
    fireEvent.click(screen.getByTestId('results-table-football|113'))
    await waitFor(() => expect(screen.getAllByTestId('page-standings-row')).toHaveLength(2))
    const wrap = screen.getByTestId('results-standings-football|113')
    // Full bredd som matchraderna (Jerry 2026-10-12: "denna måste gå hela vägen"): inget tak.
    expect(wrap.style.maxWidth).toBe('')
    expect(wrap.style.width).toBe('100%')
    const [r1, r2] = screen.getAllByTestId('page-standings-row')
    // TV-minimum: text ≥ 24, rad ≥ 56, rubrik ≥ 20, formbricka ≥ 30.
    expect(parseFloat(r1.style.fontSize)).toBeGreaterThanOrEqual(24)
    expect(parseFloat(r1.style.minHeight)).toBeGreaterThanOrEqual(56)
    expect(parseFloat(screen.getByTestId('sport-standings-head').style.fontSize)).toBeGreaterThanOrEqual(20)
    const badges = r1.querySelectorAll<HTMLElement>('[data-testid="form-letter"]')
    expect(badges).toHaveLength(5)
    expect(parseFloat(badges[0].style.width)).toBeGreaterThanOrEqual(30)
    // Fasta kolumner: bara lagnamnet töjer sig.
    expect(r1.style.gridTemplateColumns.match(/minmax/g)).toHaveLength(1)
    expect(r1.style.gridTemplateColumns).not.toContain('fr ')
    // Formen står en bit från poängen.
    expect(parseFloat(r1.querySelector<HTMLElement>('[data-testid="standings-form"]')!.style.paddingLeft)).toBeGreaterThanOrEqual(30)
    expect(r1).toHaveAttribute('data-mark', '1')
    expect(r2).toHaveAttribute('data-mark', '0')
    expect(r1).toHaveAttribute('data-f')
    // Grannar: sista matchraden → tabellens första rad → … → nästa grupps Tabell.
    const q = (sel: string | null) => (sel ? document.querySelector(sel) : null)
    const row = screen.getByTestId(`results-row-${a1.id}`)
    const tableB = screen.getByTestId('results-table-football|135')
    expect(q(row.getAttribute('data-f-down'))).toBe(r1)
    expect(q(r1.getAttribute('data-f-up'))).toBe(row)
    expect(q(r2.getAttribute('data-f-down'))).toBe(tableB)
    expect(q(tableB.getAttribute('data-f-up'))).toBe(r2)
    fireEvent.click(r2)
    expect(onOpenTeam).toHaveBeenCalledWith(expect.objectContaining({ sport: 'football', name: 'Malmo FF', ids: { sportapi: '375' }, league: expect.objectContaining({ provider: 'sportapi', id: 'sa-113' }) }))
  })

  it('skrivbordet: läsbara mått (Jerry 2026-10-13) — rader, rubrik, märken, status och samma kompakta tabell som TV, skalad för skrivbordet', async () => {
    setSportSettings({ apiKey: 'k123' })
    const rows = [{ rank: 1, team: { id: '363', name: 'AIK Stockholm', crest: null }, played: 26, points: 58, goalDiff: 25, form: 'WWDWW', group: null }]
    const c = { standings: vi.fn(() => null), loadStandings: vi.fn(async () => rows), subscribe: () => () => {} }
    const a1 = m()
    render(<SportResults matches={[a1]} controller={c as never} onOpenMatch={vi.fn()} tv={false} />)
    const row = screen.getByTestId(`results-row-${a1.id}`)
    expect(row.style.fontSize).toBe('24px')
    expect(row.style.minHeight).toBe('62px')
    const status = within(row).getByTestId('results-status')
    expect(status.style.fontSize).toBe('15px')
    expect(within(row).getByTestId('match-score').style.fontSize).toBe('26px')
    expect(screen.getByTestId('results-head-football|113').style.fontSize).toBe('26px')
    fireEvent.click(screen.getByTestId('results-table-football|113'))
    await waitFor(() => expect(screen.getAllByTestId('page-standings-row')).toHaveLength(1))
    expect(screen.getByTestId('sport-standings').querySelector('table')).toBeNull()
    const r1 = screen.getByTestId('page-standings-row')
    // Jerry 2026-10-13 "öka lite mer": rad 22/56, rubrik 16, formbricka 26, #-kolumnen 40.
    expect(r1.style.fontSize).toBe('22px')
    expect(r1.style.minHeight).toBe('56px')
    expect(screen.getByTestId('sport-standings-head').style.fontSize).toBe('16px')
    expect(r1.querySelector<HTMLElement>('[data-testid="form-letter"]')!.style.width).toBe('26px')
    expect(r1.style.gridTemplateColumns.startsWith('40px ')).toBe(true)
    expect(r1.style.gridTemplateColumns.match(/minmax/g)).toHaveLength(1)
  })

})
