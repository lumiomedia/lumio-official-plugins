import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MobileChips } from './mobile-chips'

afterEach(cleanup)
const items = [
  { key: 'all', label: 'All', id: 'all' },
  { key: 'sport', label: 'Sport', id: 'sport' },
  { key: 'news', label: 'News', id: 'news' },
]

describe('MobileChips', () => {
  it('ritar alla chips, aktiv har aria-pressed och fet stil', () => {
    render(<MobileChips items={items} value="sport" onChange={vi.fn()} />)
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('Sport')).toBeInTheDocument()
    expect(screen.getByText('News')).toBeInTheDocument()
    const active = screen.getByTestId('chip-sport')
    expect(active.getAttribute('aria-pressed')).toBe('true')
    expect(active.style.fontWeight).toBe('600')
    const inactive = screen.getByTestId('chip-all')
    expect(inactive.getAttribute('aria-pressed')).toBe('false')
  })
  it('klick på ett chip ropar onChange med dess key', () => {
    const onChange = vi.fn()
    render(<MobileChips items={items} value="sport" onChange={onChange} />)
    fireEvent.click(screen.getByTestId('chip-news'))
    expect(onChange).toHaveBeenCalledWith('news')
  })
  it('raden är minst 44 px hög', () => {
    render(<MobileChips items={items} value="sport" onChange={vi.fn()} testId="genre-chips" />)
    const row = screen.getByTestId('genre-chips')
    expect(parseFloat(row.style.minHeight)).toBeGreaterThanOrEqual(44)
  })
})
