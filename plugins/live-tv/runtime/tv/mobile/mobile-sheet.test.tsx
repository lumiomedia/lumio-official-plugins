import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MobileSheet } from './mobile-sheet'

afterEach(cleanup)
const items = [{ key: 'play', label: 'Watch now', run: vi.fn() }, { key: 'pin', label: 'Add to favourites', run: vi.fn() }]

describe('MobileSheet', () => {
  it('ritar rubrik, poster och Avbryt som dialog', () => {
    render(<MobileSheet title="SVT1" subtitle="1 · Sport" items={items} onClose={vi.fn()} pushLayer={() => () => {}} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('SVT1')
    expect(screen.getByText('Watch now')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })
  it('en post kör run och stänger', () => {
    const onClose = vi.fn()
    render(<MobileSheet title="SVT1" items={items} onClose={onClose} pushLayer={() => () => {}} />)
    fireEvent.click(screen.getByText('Watch now'))
    expect(items[0].run).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
  it('scrim och Avbryt stänger utan att köra något', () => {
    const onClose = vi.fn()
    render(<MobileSheet title="SVT1" items={items} onClose={onClose} pushLayer={() => () => {}} />)
    fireEvent.click(screen.getByTestId('sheet-scrim'))
    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
  it('registrerar sig som lager så Bakåt stänger, och avregistrerar vid unmount', () => {
    const off = vi.fn()
    const pushLayer = vi.fn((_close: () => void) => off) // typad param: annars tappar mock.calls[0][0] sin typ under tsc
    const onClose = vi.fn()
    const { unmount } = render(<MobileSheet title="SVT1" items={items} onClose={onClose} pushLayer={pushLayer} />)
    expect(pushLayer).toHaveBeenCalledTimes(1)
    pushLayer.mock.calls[0][0]()       // skalets back() ropar lagrets close
    expect(onClose).toHaveBeenCalled()
    unmount()
    expect(off).toHaveBeenCalled()
  })
  it('posterna är minst 44 px och texten ligger hel i DOM', () => {
    render(<MobileSheet title="SVT1" items={[{ key: 'x', label: 'A very long channel name that must not be truncated in DOM', run: vi.fn() }]} onClose={vi.fn()} pushLayer={() => () => {}} />)
    const item = screen.getByText('A very long channel name that must not be truncated in DOM')
    expect(parseFloat((item.closest('[data-sheet-item]') as HTMLElement).style.minHeight)).toBeGreaterThanOrEqual(44)
  })
})
