import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, fireEvent } from '@testing-library/react'
const vodState = vi.hoisted(() => ({ total: 0 }))
vi.mock('../hooks/useVodLibrary', async (orig) => ({
  ...(await orig<object>()),
  useVodCategories: () => ({ categories: [], total: vodState.total, known: true, importing: false, loading: false, error: null, reload: () => {} }),
}))
import { LiveTvLibraryFrame } from './live-tv-library-frame'

const base = { onNavigate: vi.fn(), onExit: vi.fn(), onInset: vi.fn() }

describe('LiveTvLibraryFrame', () => {
  afterEach(cleanup)
  it('skrivbord: rälsen med Hem aktivt; poster går in i Live TV', () => {
    const props = { ...base, platform: 'desktop' as const, onNavigate: vi.fn() }
    const { getByTestId } = render(<LiveTvLibraryFrame {...props} />)
    expect(getByTestId('rail-home').hasAttribute('data-current')).toBe(true)
    fireEvent.click(getByTestId('rail-guide'))
    expect(props.onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'guide' } })
  })
  it('Tillbaka lämnar biblioteksvyn', () => {
    const props = { ...base, platform: 'desktop' as const, onExit: vi.fn() }
    const { getByTestId } = render(<LiveTvLibraryFrame {...props} />)
    fireEvent.click(getByTestId('rail-back'))
    expect(props.onExit).toHaveBeenCalled()
  })
  it('telefon: flikraden, ingen räls, inset 0', () => {
    const props = { ...base, platform: 'phone' as const, onInset: vi.fn() }
    const { getByTestId, queryByTestId } = render(<LiveTvLibraryFrame {...props} />)
    expect(getByTestId('mobile-tab-bar')).toBeTruthy()
    expect(queryByTestId('tv-rail')).toBeNull()
    expect(props.onInset).toHaveBeenCalledWith(0)
  })
  it('telefon: Bibliotek-fliken syns när VOD finns, annars inte', () => {
    const props = { ...base, platform: 'phone' as const }
    vodState.total = 0
    const none = render(<LiveTvLibraryFrame {...props} />)
    expect(none.queryByTestId('tab-library')).toBeNull()
    none.unmount()
    vodState.total = 5
    const some = render(<LiveTvLibraryFrame {...props} />)
    expect(some.getByTestId('tab-library')).toBeTruthy()
    vodState.total = 0
  })
})
