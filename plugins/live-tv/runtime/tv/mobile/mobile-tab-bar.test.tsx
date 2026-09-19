import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MobileTabBar, tabForView } from './mobile-tab-bar'

afterEach(cleanup)

describe('MobileTabBar', () => {
  it('ritar fem flikar med etiketter och markerar den aktiva', () => {
    render(<MobileTabBar view="guide" onGo={vi.fn()} onMore={vi.fn()} />)
    for (const label of ['Home', 'Guide', 'Favourites', 'Search', 'More']) expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.getByTestId('tab-guide')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByTestId('tab-hub')).not.toHaveAttribute('aria-current')
  })
  it('kanaldetalj räknas som Guide, multivy och inställningar som More', () => {
    expect(tabForView('channel')).toBe('guide')
    expect(tabForView('multi')).toBe('more')
    expect(tabForView('settings')).toBe('more')
    expect(tabForView('hub')).toBe('hub')
  })
  it('tryck går till vyn, More ropar onMore', () => {
    const onGo = vi.fn(); const onMore = vi.fn()
    render(<MobileTabBar view="hub" onGo={onGo} onMore={onMore} />)
    fireEvent.click(screen.getByTestId('tab-favs'))
    expect(onGo).toHaveBeenCalledWith('favs')
    fireEvent.click(screen.getByTestId('tab-more'))
    expect(onMore).toHaveBeenCalled()
  })
  it('varje flik är minst 44 px hög', () => {
    render(<MobileTabBar view="hub" onGo={vi.fn()} onMore={vi.fn()} />)
    for (const id of ['hub', 'guide', 'favs', 'search', 'more']) expect(parseFloat(screen.getByTestId(`tab-${id}`).style.minHeight)).toBeGreaterThanOrEqual(44)
  })
})
