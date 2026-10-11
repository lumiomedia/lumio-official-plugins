import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { tvText } from '../../tv/tv-strings'
import { MatchCard } from './sport-parts'
import { summaryLine } from '../sport-ctx'
import { HOUR, MIN, fakeCtx, fxMatch, fxSource } from '../__sport-fixture'

afterEach(cleanup)
const now = Date.now()

describe('texterna', () => {
  it('finns på båda språken', () => {
    expect(tvText('sv', 'railSport')).toBe('Sport')
    expect(tvText('sv', 'sportTabForYou')).toBe('Översikt')
    expect(tvText('sv', 'sportTabFollows')).toBe('Mina lag')
    expect(tvText('sv', 'sportEnded')).toBe('SLUT')
    expect(tvText('en', 'sportSources', { n: 3 })).toBe('On 3 channels')
  })
  it('rubrikraden börjar med det som pågår och tappar det när inget pågår', () => {
    const sv = (k: Parameters<typeof tvText>[1], v?: Record<string, string | number>) => tvText('sv', k, v)
    const en = (k: Parameters<typeof tvText>[1], v?: Record<string, string | number>) => tvText('en', k, v)
    expect(summaryLine(sv, 'Idag', 10, 4)).toBe('4 pågår nu · 10 matcher idag')
    expect(summaryLine(en, 'Today', 66, 6)).toBe('6 in play · 66 matches today')
    expect(summaryLine(sv, 'Igår', 89, 0)).toBe('89 matcher igår')
  })
})

describe('MatchCard', () => {
  it('Guide-bricka: kanalens logga som ankare, märkena bredvid varandra, LIVE som orange text, förloppet som underkant', () => {
    const ctx = fakeCtx({ now })
    const m = fxMatch({ start: now - 30 * MIN, sources: [fxSource('TV4 Fotboll FHD SE', { quality: 'FHD' }), fxSource('TV4 Fotboll SE')] })
    render(<MatchCard match={m} ctx={ctx} />)
    const card = screen.getByTestId('sport-card')
    expect(screen.getByTestId('card-status')).toHaveTextContent(/^LIVE$/)
    expect(screen.getByTestId('card-status').getAttribute('data-live')).toBe('1')
    expect(card).toHaveTextContent('TV4 Fotboll FHD SE · 2 sources')
    expect(card).toHaveTextContent('AIK - Hammarby')
    expect(screen.getByTestId('card-anchor').querySelector('[data-initials]')).toHaveTextContent('TF')
    expect(card.querySelectorAll('[data-crest]')).toHaveLength(2)
    const bar = screen.getByTestId('card-progress')
    expect(bar.style.position).toBe('absolute')
    expect(bar.style.bottom).toBe('0px')
    expect(parseFloat((bar.firstElementChild as HTMLElement).style.width)).toBeGreaterThan(0)
    expect(card.textContent).not.toMatch(/\d+\s*[-–]\s*\d+/)
    fireEvent.click(card)
    expect(ctx.openMatch).toHaveBeenCalledWith(m)
  })
  it('utan kanal: sportens ikon som ankare', () => {
    render(<MatchCard match={fxMatch({ kind: 'hockey', sources: [], resultOnly: true })} ctx={fakeCtx({ now })} />)
    expect(screen.getByTestId('card-anchor').querySelector('svg')).not.toBeNull()
    expect(screen.getByTestId('sport-card')).toHaveTextContent('No channel')
  })
  it('kommande visar tid, avslutad SLUT/ENDED, favorit med hjärta', () => {
    const ctx = fakeCtx({ now, follows: [{ sport: 'football', kind: 'team', key: 'aik', name: 'AIK' }] })
    const { rerender } = render(<MatchCard match={fxMatch({ start: now + HOUR })} ctx={ctx} />)
    expect(screen.getByTestId('card-status')).toHaveTextContent(/^\d\d:\d\d$/)
    expect(screen.getByTestId('card-followed').querySelector('svg path')?.getAttribute('d')).toMatch(/^M12 21s/)
    rerender(<MatchCard match={fxMatch({ start: now - 3 * HOUR, stop: now - HOUR })} ctx={ctx} />)
    expect(screen.getByTestId('sport-card')).toHaveTextContent('ENDED')
  })
  it('event utan lag visar eventets namn', () => {
    render(<MatchCard match={fxMatch({ kind: 'motorsport', league: 'Formel 1', leagueKey: 'f1', home: null, away: null, event: 'Singapores GP - Kval' })} ctx={fakeCtx({ now })} />)
    expect(screen.getByTestId('sport-card')).toHaveTextContent('Singapores GP - Kval')
  })
})
