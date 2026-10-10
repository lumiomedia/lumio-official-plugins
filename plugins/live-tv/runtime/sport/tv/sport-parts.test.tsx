import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { tvText } from '../../tv/tv-strings'
import { MatchCard } from './sport-parts'
import { HOUR, MIN, fakeCtx, fxMatch, fxSource } from '../__sport-fixture'

afterEach(cleanup)
const now = Date.now()

describe('texterna', () => {
  it('finns på båda språken', () => {
    expect(tvText('sv', 'railSport')).toBe('Sport')
    expect(tvText('sv', 'sportTabForYou')).toBe('För dig')
    expect(tvText('sv', 'sportEnded')).toBe('SLUT')
    expect(tvText('en', 'sportSources', { n: 3 })).toBe('3 sources in your playlists')
    expect(tvText('sv', 'sportSummary', { day: 'Idag', count: 10, live: 4 })).toBe('Idag · 10 matcher · 4 live')
  })
})

describe('MatchCard', () => {
  it('live: LIVE-tagg, bästa källan och antal källor; OK öppnar matchcentret', () => {
    const ctx = fakeCtx({ now })
    const m = fxMatch({ start: now - 30 * MIN, sources: [fxSource('TV4 Fotboll FHD SE', { quality: 'FHD' }), fxSource('TV4 Fotboll SE')] })
    render(<MatchCard match={m} ctx={ctx} />)
    const card = screen.getByTestId('sport-card')
    expect(card).toHaveTextContent('LIVE')
    expect(card).toHaveTextContent('TV4 Fotboll FHD SE · 2 sources')
    expect(card).toHaveTextContent('AIK')
    expect(card.textContent).not.toMatch(/\d+\s*[-–]\s*\d+/)
    fireEvent.click(card)
    expect(ctx.openMatch).toHaveBeenCalledWith(m)
  })
  it('kommande visar tid, avslutad SLUT/ENDED, följd stjärna', () => {
    const ctx = fakeCtx({ now, follows: [{ sport: 'football', kind: 'team', key: 'aik', name: 'AIK' }] })
    const { rerender } = render(<MatchCard match={fxMatch({ start: now + HOUR })} ctx={ctx} />)
    expect(screen.getByTestId('card-followed')).toBeInTheDocument()
    rerender(<MatchCard match={fxMatch({ start: now - 3 * HOUR, stop: now - HOUR })} ctx={ctx} />)
    expect(screen.getByTestId('sport-card')).toHaveTextContent('ENDED')
  })
  it('event utan lag visar eventets namn', () => {
    render(<MatchCard match={fxMatch({ kind: 'motorsport', league: 'Formel 1', leagueKey: 'f1', home: null, away: null, event: 'Singapores GP - Kval' })} ctx={fakeCtx({ now })} />)
    expect(screen.getByTestId('sport-card')).toHaveTextContent('Singapores GP - Kval')
  })
})
