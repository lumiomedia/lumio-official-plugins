import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, fireEvent, waitFor } from '@testing-library/react'
const vodState = vi.hoisted(() => ({ total: 0, calls: 0, modelCalls: 0 }))
vi.mock('../vod-client', async (orig) => ({
  ...(await orig<object>()),
  listVodCategories: async () => { vodState.calls++; return { categories: [], total: vodState.total, known: true, importing: false } },
}))
const toneState = vi.hoisted(() => ({ tones: {} as Record<string, [number, number, number]>, asked: [] as Array<string | null> }))
vi.mock('../sport/backdrop', async (orig) => ({
  ...(await orig<object>()),
  useImageTone: (src: string | null, wanted: boolean) => { toneState.asked.push(wanted ? src : null); return wanted && src ? toneState.tones[src] ?? null : null },
}))
vi.mock('../live-tv-model', async (orig) => ({
  ...(await orig<object>()),
  useLiveTvModel: () => { vodState.modelCalls++; throw new Error('modellen ska inte monteras i ramen') },
}))
import { LiveTvLibraryFrame, readHomeHeroImage } from './live-tv-library-frame'
import { act } from '@testing-library/react'
import { __resetForTests } from '@/lib/plugin-sdk'
import { setTvSettings } from './tv-settings-store'

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
  it('telefon: Mer öppnar Mer-arket; Favoriter går till Live TV:s favoritvy', async () => {
    const props = { ...base, platform: 'phone' as const, onNavigate: vi.fn() }
    const { getByTestId, findByTestId, getByText } = render(<LiveTvLibraryFrame {...props} />)
    fireEvent.click(getByTestId('tab-more'))
    await findByTestId('more-sheet')
    expect(props.onNavigate).not.toHaveBeenCalled()
    fireEvent.click(getByText('Favourites'))
    expect(props.onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'favs' } })
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
  it('ramen har v2-bakgrunden (Jerry 2026-10-30)', () => {
    render(<LiveTvLibraryFrame {...{ ...base, platform: 'desktop' as const, onNavigate: vi.fn() }} />)
    expect(document.querySelector('[data-live-tv-frame-bg]')!.getAttribute('data-live-tv-frame-bg')).toBe('#161a23')
  })
  it('appens sidbakgrund (.bg-mesh) får v2-tonen bara medan ramen är monterad', () => {
    const { unmount } = render(<LiveTvLibraryFrame {...{ ...base, platform: 'desktop' as const, onNavigate: vi.fn() }} />)
    const css = Array.from(document.querySelectorAll('style')).map((s) => s.textContent ?? '').join('\n')
    expect(css).toContain('.bg-mesh')
    expect(css).toContain('#161a23')
    unmount()
    const after = Array.from(document.querySelectorAll('style')).map((s) => s.textContent ?? '').join('\n')
    expect(after).not.toContain('.bg-mesh')
  })
})

describe('LiveTvLibraryFrame egna färger', () => {
  afterEach(() => { cleanup(); __resetForTests() })
  it('egen bakgrund i ramen och .bg-mesh; rälsens variabel på ramens rot (TV — skrivbordets glas gör rälsen genomskinlig)', () => {
    setTvSettings({ liveBgColor: '#203040', liveSurfaceColor: '#405060' })
    render(<LiveTvLibraryFrame {...{ ...base, platform: 'tv' as const, onNavigate: vi.fn() }} />)
    const frame = document.querySelector('[data-live-tv-frame-bg]') as HTMLElement
    expect(frame.getAttribute('data-live-tv-frame-bg')).toBe('#203040')
    expect(frame.style.getPropertyValue('--lt-rail')).toContain('#405060')
    const css = Array.from(document.querySelectorAll('style')).map((s) => s.textContent ?? '').join('\n')
    expect(css).toContain('background-color: #203040')
  })
  it('skrivbord: glaset utan hero tonas av den egna bakgrundsfärgen', () => {
    setTvSettings({ liveBgColor: '#203040', liveSurfaceColor: '#405060' })
    render(<LiveTvLibraryFrame {...base} platform="desktop" />)
    const frame = document.querySelector('[data-live-tv-frame-bg]') as HTMLElement
    expect(frame.getAttribute('data-live-tv-frame-tint')).toBe('rgb(32,48,64)')
  })
})


describe('LiveTvLibraryFrame detaljsidans Hem-pill', () => {
  afterEach(cleanup)
  it('appens flytande Hem-knapp ([data-details-home]) göms bara medan ramen är monterad — rälsen har Hem', () => {
    const { unmount } = render(<LiveTvLibraryFrame {...base} platform="desktop" />)
    const css = Array.from(document.querySelectorAll('style')).map((s) => s.textContent ?? '').join('\n')
    expect(css).toMatch(/\[data-details-home\]\s*\{\s*display:\s*none !important/)
    unmount()
    const after = Array.from(document.querySelectorAll('style')).map((s) => s.textContent ?? '').join('\n')
    expect(after).not.toContain('[data-details-home]')
  })
})

/** Appens hero-karusell som den ser ut i DOM:en (hero-carousel.tsx): slides med bildlager + prickar med data-active. */
function mountHero(urls: string[], active: number): HTMLElement {
  const root = document.createElement('div')
  root.setAttribute('data-testid', 'fake-hero')
  for (const url of urls) {
    const slide = document.createElement('div')
    slide.className = 'hero-carousel-slide'
    const media = document.createElement('div')
    media.className = 'hero-slide-media'
    const img = document.createElement('div')
    img.style.backgroundImage = `url("${url}")`
    media.appendChild(img)
    slide.appendChild(media)
    root.appendChild(slide)
  }
  urls.forEach((_, i) => {
    const dot = document.createElement('button')
    dot.className = 'hero-carousel-dot'
    if (i === active) dot.setAttribute('data-active', '1')
    root.appendChild(dot)
  })
  document.body.appendChild(root)
  return root
}

describe('LiveTvLibraryFrame glasräls på Hem (Jerry 2026-10-30)', () => {
  afterEach(() => { cleanup(); document.querySelectorAll('[data-testid="fake-hero"]').forEach((n) => n.remove()); toneState.tones = {}; toneState.asked = [] })
  it('heron läses ur den aktiva sliden; utan prickar den första; utan hero null', () => {
    expect(readHomeHeroImage(document)).toBeNull()
    const one = mountHero(['http://x/a.jpg'], -1)
    expect(readHomeHeroImage(document)).toBe('http://x/a.jpg')
    one.remove()
    mountHero(['http://x/a.jpg', 'http://x/b.jpg', 'http://x/c.jpg'], 1)
    expect(readHomeHeroImage(document)).toBe('http://x/b.jpg')
  })
  it('skrivbord: rälsen är glas (genomskinlig, oskärpa) och tonas av heron', () => {
    toneState.tones['http://x/b.jpg'] = [200, 40, 40]
    mountHero(['http://x/a.jpg', 'http://x/b.jpg'], 1)
    render(<LiveTvLibraryFrame {...base} platform="desktop" />)
    const frame = document.querySelector('[data-live-tv-frame-bg]') as HTMLElement
    expect(frame.getAttribute('data-live-tv-frame-glass')).toBe('1')
    expect(frame.getAttribute('data-live-tv-frame-blur')).toBe('blur(24px) saturate(140%)')
    // Tonen mörkas (darkTone) så vit text läses; rälsens egen yta blir genomskinlig.
    expect(frame.getAttribute('data-live-tv-frame-tint')).toMatch(/^rgb\(\d+,\d+,\d+\)$/)
    expect(frame.style.backgroundColor).toMatch(/^rgba\(/)
    expect(frame.style.getPropertyValue('--lt-rail')).toBe('transparent')
  })
  it('skrivbord utan hero: glaset står kvar, tonat av sidtonen', () => {
    render(<LiveTvLibraryFrame {...base} platform="desktop" />)
    const frame = document.querySelector('[data-live-tv-frame-bg]') as HTMLElement
    expect(frame.getAttribute('data-live-tv-frame-glass')).toBe('1')
    expect(frame.getAttribute('data-live-tv-frame-tint')).toBe('rgb(22,26,35)')
  })
  it('heron byter slide → tonen följer med', async () => {
    toneState.tones['http://x/a.jpg'] = [10, 120, 10]
    toneState.tones['http://x/b.jpg'] = [10, 10, 160]
    const hero = mountHero(['http://x/a.jpg', 'http://x/b.jpg'], 0)
    render(<LiveTvLibraryFrame {...base} platform="desktop" />)
    const frame = document.querySelector('[data-live-tv-frame-bg]') as HTMLElement
    const first = frame.getAttribute('data-live-tv-frame-tint')
    await act(async () => {
      const dots = hero.querySelectorAll('.hero-carousel-dot')
      dots[0]!.removeAttribute('data-active')
      dots[1]!.setAttribute('data-active', '1')
      await new Promise((r) => setTimeout(r, 50))
    })
    await waitFor(() => expect(frame.getAttribute('data-live-tv-frame-tint')).not.toBe(first))
    expect(toneState.asked).toContain('http://x/b.jpg')
  })
  it('TV: rälsen förblir solid (oskärpa är för tungt på Mi Box/Shield) och heron provas inte', () => {
    mountHero(['http://x/a.jpg'], 0)
    render(<LiveTvLibraryFrame {...base} platform="tv" />)
    const frame = document.querySelector('[data-live-tv-frame-bg]') as HTMLElement
    expect(frame.hasAttribute('data-live-tv-frame-glass')).toBe(false)
    expect(frame.style.background).toBeTruthy()
    expect(frame.style.getPropertyValue('--lt-rail')).not.toBe('transparent')
    expect(toneState.asked.every((s) => s === null)).toBe(true)
  })
})
