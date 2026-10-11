import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { __resetPluginStorageForTests, __setLangForTests } from '@/lib/plugin-sdk'
import { SportFeed } from './tv/sport-feed'
import { SportMatchday } from './tv/sport-matchday'
import { SportResults } from './tv/sport-results'
import { SportFollows } from './tv/sport-follows'
import { SportResultsPhone } from './mobile/sport-results-phone'
import { setSportSettings, toggleFollow } from './sport-store'
import { localDayKey } from './sport-epg'
import { HOUR, MIN, fakeCtx, fxDay, fxMatch, fxSource, mountSport } from './__sport-fixture'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => null }))

/*
  Alla kort och rader ovanpå Sports bakgrund ska läsa SAMMA kortyta (`sportCardStyle`
  / kortvariabeln) så att inställningen Kort (opacitet + ton) ger likadana ytor.
  happy-dom släpper `background: var(...)` ur style-attributet, så ytmodulen byts
  mot en med en fast markörfärg: en yta som fortfarande har en egen färg (TV.s05,
  rgba(...)) eller går via `sportBg` med egen reserv avslöjas av jämförelsen.
*/
vi.mock('./surface', async (orig) => {
  const actual = await orig<typeof import('./surface')>()
  const { cardStyle } = await import('../tv/tv-ui')
  const MARK = 'rgb(11, 22, 33)'
  const sportSurface = (fallback: string = MARK) => ({ background: fallback, backdropFilter: 'blur(1px)' })
  return { ...actual, sportBg: () => MARK, SPORT_CARD_BG: MARK, sportSurface, sportCardStyle: { ...cardStyle, ...sportSurface() } }
})
const MARK = 'rgb(11, 22, 33)'
const bg = (el: HTMLElement) => el.style.background || el.style.backgroundColor

const now = new Date(2026, 9, 10, 19, 15).getTime()
const dayFrom = new Date(2026, 9, 10, 0, 0).getTime()
const live = fxMatch({ id: 'live', home: 'FC Barcelona', away: 'Paris SG', homeKey: 'barcelona', start: now - 30 * MIN, stop: now + 90 * MIN, sources: [fxSource('V Sport Fotboll FHD'), fxSource('B')] })
const a = fxMatch({ id: 'a', home: 'AIK', away: 'Hammarby', start: now + 35 * MIN })
const done = fxMatch({ id: 'done', home: 'Örgryte', away: 'GAIS', start: now - 4 * HOUR, stop: now - 2 * HOUR })
const all = [done, live, a]
const follows = [{ sport: 'football' as const, kind: 'team' as const, key: 'barcelona', name: 'FC Barcelona' }]

let n = 0
const res = () => fxMatch({
  id: `r${++n}`, home: 'Malmo FF', away: 'AIK', homeKey: 'malmo', awayKey: 'aik', start: n, stop: n + 1,
  status: 'finished', score: { home: 1, away: 0 }, round: 27, coverage: 'full',
  fixture: { provider: 'api-sports', id: `f${n}`, leagueId: '113', season: '2026' },
})
const standings = [{ rank: 1, team: { id: '363', name: 'AIK Stockholm', crest: null }, played: 26, points: 58, goalDiff: 25, form: 'WWDWW', group: null }]
const controller = { standings: vi.fn(() => null), loadStandings: vi.fn(async () => standings), subscribe: () => () => {} }

beforeEach(() => { __resetPluginStorageForTests(); __setLangForTests('sv') })
afterEach(() => { cleanup(); __setLangForTests('en') })

describe('Sports kortyta: allt delar samma bakgrund', () => {
  it('flödet: Dina lag, pågår nu, avslutade', () => {
    render(<SportFeed ctx={fakeCtx({ now, follows })} matches={all} days={[fxDay('d0', all), null]} />)
    for (const el of [screen.getByTestId('feed-teams'), screen.getByTestId('feed-now-row'), screen.getByText('Örgryte - GAIS').parentElement!]) expect(bg(el)).toBe(MARK)
  })
  it('matchdagen: hero (med accentglöd ovanpå), nästa-ruta och tidslinje', () => {
    render(<SportMatchday ctx={fakeCtx({ now })} matches={all} dayFrom={dayFrom} />)
    expect(bg(screen.getByTestId('sport-next'))).toBe(MARK)
    expect(bg(screen.getByTestId('sport-timeline'))).toBe(MARK)
    // Heron lägger glöden som översta lager och kortytan som botten (inte en egen vit 7 %-färg).
    expect(screen.getByTestId('sport-hero').getAttribute('style') ?? '').not.toContain('252, 252, 255')
  })
  it('Tabeller & resultat: resultatrader och tabellen', async () => {
    setSportSettings({ apiKey: 'k123' })
    render(<SportResults matches={[res()]} controller={controller as never} onOpenMatch={vi.fn()} tv={false} />)
    const row = screen.getByText('Malmo FF').closest('[style*="grid"]') as HTMLElement
    expect(bg(row)).toBe(MARK)
    fireEvent.click(screen.getByText('Tabell'))
    await waitFor(() => expect(screen.getByTestId('sport-standings')).toBeTruthy())
    expect(bg(screen.getByTestId('sport-standings'))).toBe(MARK)
  })
  it('Mina lag: följda rader och tomt läge', () => {
    toggleFollow({ sport: 'football', kind: 'team', key: 'barcelona', name: 'FC Barcelona' })
    const { unmount } = render(<SportFollows ctx={fakeCtx({ now, follows })} days={[fxDay('d0', all), null]} />)
    expect(bg(screen.getByTestId('follow-row'))).toBe(MARK)
    expect(bg(screen.getByTestId('follows-alert'))).toBe(MARK)
    unmount()
    render(<SportFollows ctx={fakeCtx({ now, follows: [] })} days={[null, null]} />)
    expect(bg(screen.getByTestId('follows-empty'))).toBe(MARK)
  })
  it('telefon: resultatrader', () => {
    setSportSettings({ apiKey: 'k123' })
    render(<SportResultsPhone matches={[res()]} controller={controller as never} onOpenMatch={vi.fn()} pushLayer={() => () => {}} />)
    expect(bg(screen.getAllByTestId('phone-result-row')[0]!)).toBe(MARK)
  })
})

describe('Sport-vyn: dagstegaren och kortinställningen', () => {
  const today = localDayKey(Date.now())
  const stageVar = () => screen.getByTestId('sport-stage').style.getPropertyValue('--sport-card-bg')
  it('skrivbord: dagstegaren läser kortytan och inställningen ändrar variabeln', async () => {
    mountSport({}, { tv: false, days: { [today]: [fxMatch({ id: 'x', start: Date.now() + HOUR })] } })
    expect(bg(await screen.findByTestId('sport-day-stepper'))).toBe(MARK)
    const before = stageVar()
    act(() => { setSportSettings({ cards: { opacity: 80, tone: 'gray' } }) })
    expect(stageVar()).not.toBe(before)
    expect(stageVar()).toBe('rgba(28, 29, 34, 0.8)')
  })
  it('telefon: dagstegaren följer kortvariabeln (P.card)', async () => {
    mountSport({}, { phone: true, days: { [today]: [fxMatch({ id: 'y', start: Date.now() + HOUR })] } })
    expect(bg(await screen.findByTestId('sport-phone-days'))).toBe(MARK)
    act(() => { setSportSettings({ cards: { opacity: 70, tone: 'gray' } }) })
    expect(stageVar()).toBe('rgba(28, 29, 34, 0.7)')
  })
})
