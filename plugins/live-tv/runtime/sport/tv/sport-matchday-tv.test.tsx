import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests } from '@/lib/plugin-sdk'
import { SportMatchday } from './sport-matchday'
import { __resetPageTabsForTests } from '../team-page/page-tabs'
import { SPORT_FOCUS_CSS } from '../surface'
import { HOUR, MIN, fakeCtx, fxMatch } from '../__sport-fixture'

/*
  Matchdag på TV (Jerry 2026-10-12): underflikarna Matchdag / Matcher /
  Repriser under heron, i stället för allt under varandra.
*/

const now = Date.now()
const live = fxMatch({ id: 'live', home: 'GAIS', away: 'Sirius', start: now - 30 * MIN, stop: now + 90 * MIN })
const later = fxMatch({ id: 'later', home: 'AIK', away: 'Hammarby', start: now + 2 * HOUR })
const rerun = fxMatch({ id: 'rp', home: 'Mjällby AIF', away: 'Degerfors IF', start: now - 30 * MIN, stop: now + HOUR, rerun: true })

beforeEach(() => { __resetForTests(); __resetPageTabsForTests() })
afterEach(cleanup)

const mount = (tv: boolean, replays = [rerun]) => {
  __setTvModeForTests(tv)
  return render(<SportMatchday ctx={fakeCtx({ now })} matches={[live, later]} dayFrom={now - 12 * HOUR} replays={replays} />)
}

describe('Matchdag på TV: underflikar', () => {
  it('heron överst, flikarna Matchdag (förvald) / Matcher / Repriser, och bara en flik i taget', () => {
    mount(true)
    expect(screen.getByTestId('sport-hero')).toBeInTheDocument()
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Matchday', 'Matches', 'Replays'])
    expect(screen.getByTestId('sport-timeline')).toBeInTheDocument()
    expect(screen.queryByTestId('sport-strip')).toBeNull()
    expect(screen.queryByTestId('sport-grid')).toBeNull()
    expect(screen.queryByTestId('sport-replays')).toBeNull()
  })
  it('Matcher är ett rutnät av kort (ingen vågrät remsa); Repriser är reprislistan', () => {
    mount(true)
    fireEvent.click(screen.getByTestId('page-tab-matches'))
    const grid = screen.getByTestId('sport-grid')
    expect(grid.style.display).toBe('grid')
    expect(within(grid).getAllByTestId('sport-card').map((c) => c.getAttribute('data-match-id'))).toEqual(['live', 'later'])
    expect(screen.queryByTestId('sport-timeline')).toBeNull()
    fireEvent.click(screen.getByTestId('page-tab-replays'))
    expect(screen.getByTestId('sport-replays')).toHaveTextContent('Mjällby AIF - Degerfors IF')
  })
  it('Repriser bara när det finns några; ▾ från flikarna in i fliken, ▴ från flikens översta rad tillbaka; fokus byter flik', () => {
    mount(true, [])
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Matchday', 'Matches'])
    expect(screen.getByTestId('page-tab-timeline')).toHaveAttribute('data-f-down', '[data-matchday-tabs] [data-tab-body] [data-f]')
    expect(document.querySelector('[data-tab-body] [data-f]')?.getAttribute('data-f-up')).toBe('[data-matchday-tabs] [data-tab-active]')
    // ▾ från heron går till den VALDA fliken (inte närmaste flik, som bytte flik i förbifarten).
    expect(screen.getByTestId('sport-hero-watch')).toHaveAttribute('data-f-down', '[data-matchday-tabs] [data-tab-active]')
    fireEvent.focus(screen.getByTestId('page-tab-matches'))
    expect(screen.getByTestId('sport-grid')).toBeInTheDocument()
  })
  it('senaste underfliken minns under sessionen', () => {
    const view = mount(true)
    fireEvent.click(screen.getByTestId('page-tab-matches'))
    view.unmount()
    mount(true)
    expect(screen.getByTestId('page-tab-matches')).toHaveAttribute('aria-selected', 'true')
  })
  it('skrivbordet oförändrat: tidslinje, remsa och repriser under varandra, inga flikar', () => {
    mount(false)
    expect(screen.queryByRole('tab')).toBeNull()
    for (const id of ['sport-timeline', 'sport-strip', 'sport-replays']) expect(screen.getByTestId(id)).toBeInTheDocument()
  })
})

describe('Accentfyllda knappar', () => {
  it('Titta har accentsorten: nästan vit kant innanför och lätt ljusning', () => {
    mount(true)
    expect(screen.getByTestId('sport-hero-watch')).toHaveAttribute('data-focus', 'on-accent')
    expect(SPORT_FOCUS_CSS).toMatch(/\[data-focus="on-accent"\]:focus[^{]*\{ box-shadow: inset 0 0 0 3px rgba\(255,255,255,0\.92\) !important; background-image: linear-gradient\(rgba\(255,255,255,0\.14\)/)
  })
})
