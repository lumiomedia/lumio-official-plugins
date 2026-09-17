import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { GuideControlRow, type GuideControls } from './guide-control-row'
import { gp } from './guide-view-shared'

/**
 * Kontrollraden (spec §2, handoffen §Ram och kontrollrad): EN rad, fast
 * ordning, och lägesberoende delar (Nu, zoom, Detaljer) som bara finns i
 * sina lägen.
 */
function base(over: Partial<GuideControls> = {}): GuideControls {
  return {
    mode: 'grid',
    onMode: () => {},
    sourceLabel: 'Xtream',
    sourceCount: 8,
    onOpenSource: () => {},
    categoryLabel: 'All categories',
    categoryCount: 8,
    onOpenCategory: () => {},
    dayOffset: 0,
    onDay: () => {},
    clock: <span data-testid="clock-node">08:44</span>,
    ...over,
  }
}

/** Testid:n i DOM-ordning — ordningen är kravet, inte bara förekomsten. */
const order = () => Array.from(screen.getByTestId('guide-control-row').querySelectorAll('[data-testid]')).map((el) => el.getAttribute('data-testid'))

afterEach(cleanup)

describe('GuideControlRow', () => {
  it('Grid: källa · kategori · dag · Nu · läge · klocka, i den ordningen', () => {
    render(<GuideControlRow {...base({ onNow: () => {} })} />)
    const ids = order()
    const pick = ids.filter((id) => ['guide-source', 'guide-category', 'guide-day', 'guide-now', 'guide-mode', 'guide-zoom', 'guide-details', 'clock-node'].includes(id ?? ''))
    expect(pick).toEqual(['guide-source', 'guide-category', 'guide-day', 'guide-now', 'guide-mode', 'clock-node'])
    // Skalans 56 px hög och den enda raden: inga barnrader, bara stationer.
    expect(screen.getByTestId('guide-control-row').style.height).toBe(`${gp(56)}px`)
  })

  it('Timeline: zoomsegmentet ligger efter lägessegmentet, före klockan', () => {
    render(<GuideControlRow {...base({ mode: 'timeline', onNow: () => {}, zoom: '6h', onZoom: () => {} })} />)
    const ids = order().filter((id) => ['guide-now', 'guide-mode', 'guide-zoom', 'guide-details', 'clock-node'].includes(id ?? ''))
    expect(ids).toEqual(['guide-now', 'guide-mode', 'guide-zoom', 'clock-node'])
    expect(screen.queryByTestId('guide-details')).not.toBeInTheDocument()
  })

  it('Now/Next: ingen dag, ingen Nu-knapp, ingen zoom, men Detaljer-toggle före klockan', () => {
    render(<GuideControlRow {...base({ mode: 'nownext', details: true, onDetails: () => {} })} />)
    const ids = order().filter((id) => ['guide-day', 'guide-now', 'guide-mode', 'guide-zoom', 'guide-details', 'clock-node'].includes(id ?? ''))
    expect(ids).toEqual(['guide-mode', 'guide-details', 'clock-node'])
    // Now / Next visar alltid just nu — dagsegmentet hade inget att styra.
    expect(screen.queryByTestId('guide-day')).not.toBeInTheDocument()
    expect(screen.queryByTestId('guide-now')).not.toBeInTheDocument()
    expect(screen.queryByTestId('guide-zoom')).not.toBeInTheDocument()
  })

  it('Nu och zoom renderas bara när läget ger dem, även om callbacks finns', () => {
    render(<GuideControlRow {...base({ mode: 'nownext', onNow: () => {}, zoom: '2h', onZoom: () => {}, details: false, onDetails: () => {} })} />)
    expect(screen.queryByTestId('guide-now')).not.toBeInTheDocument()
    expect(screen.queryByTestId('guide-zoom')).not.toBeInTheDocument()
    expect(screen.getByTestId('guide-details')).toBeInTheDocument()
  })

  it('dropdowns visar namn + antal och är stationer som öppnar sina paneler', () => {
    const onOpenSource = vi.fn()
    const onOpenCategory = vi.fn()
    render(<GuideControlRow {...base({ onOpenSource, onOpenCategory })} />)
    const source = screen.getByTestId('guide-source')
    expect(source).toHaveAttribute('data-f')
    expect(source).toHaveTextContent('Xtream')
    expect(source).toHaveTextContent('8')
    fireEvent.click(source)
    expect(onOpenSource).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(screen.getByTestId('guide-category'), { key: 'Enter' })
    expect(onOpenCategory).toHaveBeenCalledTimes(1)
  })

  it('segmenten ropar sina callbacks med vald nyckel', () => {
    const onMode = vi.fn()
    const onDay = vi.fn()
    const onZoom = vi.fn()
    const onNow = vi.fn()
    const onDetails = vi.fn()
    render(<GuideControlRow {...base({ mode: 'timeline', onMode, onDay, onNow, zoom: 'day', onZoom, onDetails })} />)
    fireEvent.click(screen.getByText('Now / Next'))
    expect(onMode).toHaveBeenCalledWith('nownext')
    fireEvent.click(screen.getByText('Tomorrow'))
    expect(onDay).toHaveBeenCalledWith(1)
    fireEvent.click(screen.getByText('2 h'))
    expect(onZoom).toHaveBeenCalledWith('2h')
    fireEvent.click(screen.getByTestId('guide-now'))
    expect(onNow).toHaveBeenCalledTimes(1)
    // Aktiv "Today" är vit yta med mörk text (handoffen).
    const today = screen.getByText('Today')
    // jsdom lämnar hex-färger orörda i `style`.
    expect(today.style.background).toBe('#f3f4f8')
    expect(today.style.color).toBe('#111')
    // Alla segmentknappar är stationer.
    expect(screen.getByText('Timeline')).toHaveAttribute('data-f')
  })
})
