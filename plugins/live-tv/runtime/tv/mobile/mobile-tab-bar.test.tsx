import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MobileTabBar, tabForView } from './mobile-tab-bar'

afterEach(cleanup)

describe('MobileTabBar', () => {
  it('ritar sex flikar med etiketter och markerar den aktiva', () => {
    render(<MobileTabBar view="guide" onGo={vi.fn()} onMore={vi.fn()} />)
    for (const label of ['Home', 'Channels', 'Guide', 'Sport', 'Search', 'More']) expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.getByTestId('tab-guide')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByTestId('tab-hub')).not.toHaveAttribute('aria-current')
    expect(screen.getByTestId('tab-home')).not.toHaveAttribute('aria-current')
  })
  it('kanaldetalj räknas som Guide, multivy och inställningar som More', () => {
    expect(tabForView('channel')).toBe('guide')
    expect(tabForView('multi')).toBe('more')
    expect(tabForView('settings')).toBe('more')
    expect(tabForView('favs')).toBe('more')
    expect(tabForView('sport')).toBe('sport')
    expect(tabForView('hub')).toBe('hub')
  })
  it('tryck går till vyn, More ropar onMore', () => {
    const onGo = vi.fn(); const onMore = vi.fn()
    render(<MobileTabBar view="hub" onGo={onGo} onMore={onMore} />)
    fireEvent.click(screen.getByTestId('tab-sport'))
    expect(onGo).toHaveBeenCalledWith('sport')
    fireEvent.click(screen.getByTestId('tab-home'))
    expect(onGo).toHaveBeenCalledWith('home')
    fireEvent.click(screen.getByTestId('tab-hub'))
    expect(onGo).toHaveBeenCalledWith('hub')
    fireEvent.click(screen.getByTestId('tab-more'))
    expect(onMore).toHaveBeenCalled()
  })
  it('varje flik är minst 44 px hög', () => {
    render(<MobileTabBar view="hub" onGo={vi.fn()} onMore={vi.fn()} />)
    for (const id of ['home', 'hub', 'guide', 'sport', 'search', 'more']) expect(parseFloat(screen.getByTestId(`tab-${id}`).style.minHeight)).toBeGreaterThanOrEqual(44)
  })
})
