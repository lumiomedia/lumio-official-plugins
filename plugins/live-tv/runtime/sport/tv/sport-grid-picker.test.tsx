import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { __emitTvFocusEdgeForTests } from '@/lib/plugin-sdk'
import { localDayKey } from '../sport-epg'
import { HOUR, MIN, fakeCtx, fxMatch, mountSport } from '../__sport-fixture'
import { GRID_MIN_CARD, MatchGrid } from './sport-parts'

/*
  Jerry 2026-10-12 (TV): rutnätet fyller bredden, kanalväljaren ur matchinfon
  i Sports utseende, och ◂ vid kanten i ett sportlager stänger lagret i
  stället för att öppna appens sidomeny.
*/

vi.mock('../../live-tv-player', () => ({ LiveTvPlayer: () => <div data-testid="player" /> }))

/** Värdens kanttryck: alla lyssnare hör det, och den som agerar tar anspråket. */
function edge(dir: string) {
  let meta = { claimed: false, claim() {} }
  act(() => { meta = __emitTvFocusEdgeForTests(dir) })
  return meta
}

const now = Date.now()
const today = localDayKey(now)
const live = fxMatch({ id: 'live', home: 'GAIS', away: 'Sirius', start: now - 30 * MIN, stop: now + 90 * MIN })
const later = fxMatch({ id: 'later', home: 'AIK', away: 'Hammarby', start: now + 2 * HOUR })

describe('Matcher-rutnätet', () => {
  it('så många kolumner som får plats och korten sträcks ut (minst 420 designpx per kort)', () => {
    render(<MatchGrid matches={[live, later]} ctx={fakeCtx({ now })} />)
    const grid = screen.getByTestId('sport-grid')
    expect(grid.style.gridTemplateColumns).toBe(`repeat(auto-fill, minmax(${GRID_MIN_CARD}px, 1fr))`)
    for (const card of within(grid).getAllByTestId('sport-card')) expect(card.style.width).toBe('100%')
  })
})

describe('Sportlagrens kanter', () => {
  async function openDrawer() {
    mountSport({}, { days: { [today]: [live, later] } })
    await screen.findByTestId('sport-hero')
    fireEvent.click(screen.getByTestId('page-tab-matches'))
    fireEvent.click(within(screen.getByTestId('sport-grid')).getAllByTestId('sport-card')[1])
    return screen.findByTestId('match-center')
  }

  it('◂ i kanalväljaren stänger väljaren (tillbaka till matchinfon) och sidomenyn öppnas aldrig', async () => {
    await openDrawer()
    fireEvent.click(screen.getByTestId('mc-pick-channel'))
    const picker = await screen.findByTestId('channel-picker')
    expect(picker).toHaveAttribute('data-variant', 'sport')
    within(picker).getAllByRole('button')[0].focus()
    const meta = edge('left')
    expect(meta.claimed).toBe(true)
    await waitFor(() => expect(screen.queryByTestId('channel-picker')).toBeNull())
    expect(screen.getByTestId('match-center')).toBeInTheDocument()
  })

  it('◂ i matchinfon stänger den; andra kanttryck i lagret tas också (inga värdmenyer ovanpå)', async () => {
    await openDrawer()
    screen.getByTestId('mc-pick-channel').focus()
    expect(edge('up').claimed).toBe(true)
    expect(screen.getByTestId('match-center')).toBeInTheDocument()
    edge('left')
    await waitFor(() => expect(screen.queryByTestId('match-center')).toBeNull())
  })

  it('utanför sportlagren rörs inget: värdens sidomeny får vänsterkanten', async () => {
    mountSport({}, { days: { [today]: [live, later] } })
    await screen.findByTestId('sport-hero')
    screen.getByTestId('sport-tab-foryou').focus()
    expect(edge('left').claimed).toBe(false)
  })
})

describe('Kanalväljaren i Sports utseende', () => {
  it('täta raderna som Sports radkort, ovanför matchlådan', async () => {
    mountSport({}, { days: { [today]: [live, later] } })
    await screen.findByTestId('sport-hero')
    fireEvent.click(screen.getByTestId('page-tab-matches'))
    fireEvent.click(within(screen.getByTestId('sport-grid')).getAllByTestId('sport-card')[1])
    fireEvent.click(await screen.findByTestId('mc-pick-channel'))
    const picker = await screen.findByTestId('channel-picker')
    expect(Number(picker.style.zIndex)).toBeGreaterThan(60)
    // Bakgrunden är var(--sport-drawer-solid, …) (jsdom släpper var() i stilen; konstanten testas i surface.test): ingen oskärpa, ingen genomlysning.
    expect(picker.style.backdropFilter || '').not.toContain('blur')
    expect(within(picker).getByTestId('picker-row-A').style.border).toContain('1px solid')
  })
})

describe('Kanalväljaren på TV: minimimått och tydliga chips', () => {
  it('chips ≥ 22 text och ≥ 56 höga, vald fylld ljus pill; radens titel ≥ 24 och sekundärtext ≥ 20', async () => {
    mountSport({}, { days: { [today]: [live, later] } })
    await screen.findByTestId('sport-hero')
    fireEvent.click(screen.getByTestId('page-tab-matches'))
    fireEvent.click(within(screen.getByTestId('sport-grid')).getAllByTestId('sport-card')[1])
    fireEvent.click(await screen.findByTestId('mc-pick-channel'))
    const picker = await screen.findByTestId('channel-picker')
    const chips = Array.from(picker.querySelectorAll<HTMLElement>('[data-live-tv-chip]'))
    expect(chips.length).toBeGreaterThan(0)
    for (const c of chips) {
      expect(parseFloat(c.style.fontSize)).toBeGreaterThanOrEqual(22)
      expect(parseFloat(c.style.minHeight)).toBeGreaterThanOrEqual(56)
    }
    const on = chips.find((c) => c.getAttribute('data-chip-on') === '1')!
    expect(on.style.background).toBe('#f3f4f8')
    const row = within(picker).getByTestId('picker-row-A')
    const sizes = Array.from(row.querySelectorAll<HTMLElement>('div')).map((d) => parseFloat(d.style.fontSize)).filter(Number.isFinite)
    expect(sizes).toEqual([24, 20])
  })
})
