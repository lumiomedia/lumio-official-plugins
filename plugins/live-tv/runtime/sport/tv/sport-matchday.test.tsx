import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { SportMatchday } from './sport-matchday'
import { HOUR, MIN, fakeCtx, fxMatch, fxSource } from '../__sport-fixture'

afterEach(cleanup)
const now = new Date(2026, 9, 10, 19, 15).getTime()
const dayFrom = new Date(2026, 9, 10, 0, 0).getTime()
const live = fxMatch({ id: 'live', home: 'FC Barcelona', away: 'Paris SG', league: 'Champions League', leagueKey: 'uefa-champions-league', venue: 'Estadi Olímpic', start: now - 30 * MIN, stop: now + 90 * MIN, sources: [fxSource('V Sport Fotboll', { quality: 'FHD' }), fxSource('V Sport Fotboll HD'), fxSource('Sport SE')] })
const next1 = fxMatch({ id: 'n1', home: 'AIK', away: 'Hammarby', start: now + 35 * MIN })
const next2 = fxMatch({ id: 'n2', home: 'Malmö FF', away: 'IFK Göteborg', start: now + 45 * MIN })
const next3 = fxMatch({ id: 'n3', home: 'Liverpool', away: 'Chelsea', league: 'Premier League', leagueKey: 'premier-league', start: now + 105 * MIN })
const next4 = fxMatch({ id: 'n4', home: 'Real', away: 'Inter', start: now + 3 * HOUR })
const done = fxMatch({ id: 'done', home: 'Örgryte', away: 'GAIS', start: now - 4 * HOUR, stop: now - 2 * HOUR })
const all = [done, live, next1, next2, next3, next4]

describe('Matchdag', () => {
  it('hero: pågående match, LIVE-fönster utan ställning, Titta och Matchcenter', () => {
    const ctx = fakeCtx({ now })
    render(<SportMatchday ctx={ctx} matches={all} dayFrom={dayFrom} />)
    const hero = screen.getByTestId('sport-hero')
    expect(hero).toHaveTextContent('FC Barcelona')
    expect(hero).toHaveTextContent('Paris SG')
    expect(hero).toHaveTextContent(/LIVE · \d\d:\d\d–\d\d:\d\d/)
    expect(hero).toHaveTextContent('Champions League · Estadi Olímpic')
    expect(hero).toHaveTextContent('3 sources in your playlists')
    expect(hero.querySelector('[data-score]')).toBeNull()
    fireEvent.click(screen.getByTestId('sport-hero-watch'))
    expect(ctx.watch).toHaveBeenCalledWith(live)
    expect(screen.getByTestId('sport-hero-watch')).toHaveTextContent('Watch on V Sport Fotboll')
    fireEvent.click(screen.getByTestId('sport-hero-mc'))
    expect(ctx.openMatch).toHaveBeenCalledWith(live)
  })
  it('nästa på dina kanaler: tre kommande, inte hero-matchen, klocka på påmind', () => {
    const ctx = fakeCtx({ now, isReminded: (m) => m.id === 'n2' })
    render(<SportMatchday ctx={ctx} matches={all} dayFrom={dayFrom} />)
    const rows = within(screen.getByTestId('sport-next')).getAllByTestId('sport-next-row')
    expect(rows.map((r) => r.getAttribute('data-match-id'))).toEqual(['n1', 'n2', 'n3'])
    expect(within(rows[1]!).getByTestId('next-reminded')).toBeInTheDocument()
  })
  it('tidslinjen: rad per liga, status per block, klick öppnar matchcentret', () => {
    const ctx = fakeCtx({ now })
    render(<SportMatchday ctx={ctx} matches={all} dayFrom={dayFrom} />)
    const timeline = screen.getByTestId('sport-timeline')
    expect(timeline).toHaveTextContent('Champions League')
    expect(timeline).toHaveTextContent('Premier League')
    expect(screen.getByTestId('sport-block-live').getAttribute('data-status')).toBe('live')
    expect(screen.getByTestId('sport-block-done').getAttribute('data-status')).toBe('finished')
    expect(screen.getByTestId('sport-block-n1').getAttribute('data-status')).toBe('upcoming')
    fireEvent.click(screen.getByTestId('sport-block-n3'))
    expect(ctx.openMatch).toHaveBeenCalledWith(next3)
  })
  it('sektionerna Live nu / Senare / Avslutade', () => {
    render(<SportMatchday ctx={fakeCtx({ now })} matches={all} dayFrom={dayFrom} />)
    expect(within(screen.getByTestId('sport-section-live')).getAllByTestId('sport-card')).toHaveLength(1)
    expect(within(screen.getByTestId('sport-section-later')).getAllByTestId('sport-card')).toHaveLength(4)
    expect(within(screen.getByTestId('sport-section-finished')).getByTestId('sport-card')).toHaveTextContent('ENDED')
  })
})
