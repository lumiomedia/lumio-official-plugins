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
  it('telefon: X överst till vänster ovanför hemmet (z 51) lämnar Live TV', () => {
    const props = { ...base, platform: 'phone' as const, onExit: vi.fn() }
    const { getByTestId } = render(<LiveTvLibraryFrame {...props} />)
    const wrap = getByTestId('frame-exit')
    expect(wrap.style.position).toBe('fixed')
    expect(wrap.style.zIndex).toBe('51')
    fireEvent.click(getByTestId('header-close'))
    expect(props.onExit).toHaveBeenCalled()
  })
  it('skrivbord: ingen X', () => {
    const { queryByTestId } = render(<LiveTvLibraryFrame {...base} platform="desktop" />)
    expect(queryByTestId('header-close')).toBeNull()
  })
  it('telefon: flikradens höjd rapporteras till värden, och 0 när ramen tas bort', () => {
    const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ height: 83, width: 390 } as DOMRect)
    try {
      const props = { ...base, platform: 'phone' as const, onInsetBottom: vi.fn() }
      const view = render(<LiveTvLibraryFrame {...props} />)
      expect(props.onInsetBottom).toHaveBeenLastCalledWith(83)
      view.unmount()
      expect(props.onInsetBottom).toHaveBeenLastCalledWith(0)
    } finally {
      spy.mockRestore()
    }
  })
  it('telefon: en äldre värd utan onInsetBottom går bra', () => {
    const props = { ...base, platform: 'phone' as const }
    expect(() => render(<LiveTvLibraryFrame {...props} />)).not.toThrow()
  })
  it('skrivbord: ingen nederkantsrapport', () => {
    const props = { ...base, platform: 'desktop' as const, onInsetBottom: vi.fn() }
    render(<LiveTvLibraryFrame {...props} />)
    expect(props.onInsetBottom).not.toHaveBeenCalled()
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
  it('TV: Back med fokus på rälsen lämnar vyn; Back i hemmets innehåll rörs inte', () => {
    const props = { ...base, platform: 'tv' as const, onExit: vi.fn() }
    const { getByTestId } = render(<LiveTvLibraryFrame {...props} />)
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    const hostBubble = vi.fn()
    window.addEventListener('keydown', hostBubble)
    fireEvent.keyDown(outside, { key: 'Escape' })
    expect(props.onExit).not.toHaveBeenCalled()
    expect(hostBubble).toHaveBeenCalledTimes(1)
    hostBubble.mockClear()
    fireEvent.keyDown(getByTestId('rail-guide'), { key: 'Escape' })
    expect(props.onExit).toHaveBeenCalledTimes(1)
    expect(hostBubble).not.toHaveBeenCalled()
    fireEvent.keyDown(getByTestId('rail-guide'), { key: 'Backspace' })
    expect(props.onExit).toHaveBeenCalledTimes(2)
    window.removeEventListener('keydown', hostBubble)
    outside.remove()
  })
})

describe('LiveTvLibraryFrame omklick', () => {
  afterEach(cleanup)
  it('Hem medan VOD-hemmet visas gör ingenting', () => {
    const props = { onNavigate: vi.fn(), onExit: vi.fn(), onInset: vi.fn(), platform: 'desktop' as const }
    const { getByTestId } = render(<LiveTvLibraryFrame {...props} />)
    fireEvent.click(getByTestId('rail-home'))
    expect(props.onNavigate).not.toHaveBeenCalled()
    expect(props.onExit).not.toHaveBeenCalled()
  })
})
