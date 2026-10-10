import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, fireEvent, waitFor } from '@testing-library/react'
const vodState = vi.hoisted(() => ({ total: 0, calls: 0, modelCalls: 0 }))
vi.mock('../vod-client', async (orig) => ({
  ...(await orig<object>()),
  listVodCategories: async () => { vodState.calls++; return { categories: [], total: vodState.total, known: true, importing: false } },
}))
vi.mock('../live-tv-model', async (orig) => ({
  ...(await orig<object>()),
  useLiveTvModel: () => { vodState.modelCalls++; throw new Error('modellen ska inte monteras i ramen') },
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
  it('telefon: Bibliotek-fliken syns när VOD finns, annars inte', async () => {
    const props = { ...base, platform: 'phone' as const }
    vodState.total = 0
    vodState.calls = 0
    const none = render(<LiveTvLibraryFrame {...props} />)
    await waitFor(() => expect(vodState.calls).toBe(1))
    expect(none.queryByTestId('tab-library')).toBeNull()
    none.unmount()
    vodState.total = 5
    const some = render(<LiveTvLibraryFrame {...props} />)
    expect(await some.findByTestId('tab-library')).toBeTruthy()
    vodState.total = 0
  })
  it('skrivbord: varken modellen eller VOD-kategorier anropas', async () => {
    vodState.calls = 0; vodState.modelCalls = 0
    render(<LiveTvLibraryFrame {...base} platform="desktop" />)
    await new Promise((r) => setTimeout(r, 20))
    expect(vodState.calls).toBe(0)
    expect(vodState.modelCalls).toBe(0)
  })
})
