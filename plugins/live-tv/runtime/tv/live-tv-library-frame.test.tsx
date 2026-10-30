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
  it('egen bakgrund i ramen och .bg-mesh; kortfärgen på ramens rot, rälsens egen yta genomskinlig så herotonen syns (även TV)', () => {
    setTvSettings({ liveBgColor: '#203040', liveSurfaceColor: '#405060' })
    render(<LiveTvLibraryFrame {...{ ...base, platform: 'tv' as const, onNavigate: vi.fn() }} />)
    const frame = document.querySelector('[data-live-tv-frame-bg]') as HTMLElement
    expect(frame.getAttribute('data-live-tv-frame-bg')).toBe('#203040')
    expect(frame.style.getPropertyValue('--lt-card')).toContain('#405060')
    expect(frame.style.getPropertyValue('--lt-rail')).toBe('transparent')
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
    expect(frame.querySelector('[data-live-tv-frame-tint-layer]')!.getAttribute('data-live-tv-frame-tint-layer')).toMatch(/rgba\(/)
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
  it('TV (Jerry 2026-10-30): samma herotonade genomskinliga toning, men ingen oskärpa och ingen bildkopia (för tungt på Mi Box/Shield)', () => {
    toneState.tones['http://x/a.jpg'] = [200, 40, 40]
    mountHero(['http://x/a.jpg'], 0)
    render(<LiveTvLibraryFrame {...base} platform="tv" />)
    const frame = document.querySelector('[data-live-tv-frame-bg]') as HTMLElement
    expect(frame.getAttribute('data-live-tv-frame-glass')).toBe('1')
    expect(frame.getAttribute('data-live-tv-frame-tint')).toMatch(/^rgb\(\d+,\d+,\d+\)$/)
    expect(frame.getAttribute('data-live-tv-frame-tint')).not.toBe('rgb(22,26,35)')
    expect(frame.hasAttribute('data-live-tv-frame-blur')).toBe(false)
    expect(frame.style.backdropFilter ?? '').toBe('')
    expect(frame.querySelector('[data-live-tv-frame-hero]')).toBeNull()
    expect(frame.querySelector('[data-live-tv-frame-tint-layer]')).not.toBeNull()
    expect(frame.style.getPropertyValue('--lt-rail')).toBe('transparent')
    expect(toneState.asked).toContain('http://x/a.jpg')
  })
  it('TV-heron (tv-hero.tsx): tonen läses ur det senaste bildlagret', () => {
    const root = document.createElement('div')
    root.setAttribute('data-testid', 'fake-hero')
    root.innerHTML = '<section data-tv-hero><div data-tv-hero-backdrop><div><div data-tv-hero-image style="background-image: url(&quot;http://x/old.jpg&quot;)"></div><div data-tv-hero-image style="background-image: url(&quot;http://x/new.jpg&quot;)"></div></div></div></section>'
    document.body.appendChild(root)
    expect(readHomeHeroImage(document)).toBe('http://x/new.jpg')
  })

  /*
    ROTORSAKEN (appen 2026-10-30: "solid mörk räls, ingen genomskinlighet, ingen ton").
    Värden skickar platform="desktop" i Mac-appen (media-explorer: isTvMode ? 'tv'
    : isPhoneViewport ? 'phone' : 'desktop') och glasgrenen VAR aktiv. Men bakom
    rälsen finns bara <main>:s sidbakgrund — heron börjar till höger om insetten,
    och ramen tvingar själv .bg-mesh till den platta sidtonen — så backdrop-filter
    suddade en enfärgad yta. Tonen (darkTone, 55 % över sidtonen och sedan en
    gradient tillbaka mot sidtonen) hamnade några enheter från sidtonen.
  */
  it('rotorsaken, skrivbord: ramen ritar själv en suddig kopia av herobilden bakom rälsen (bakom den finns annars bara sidtonen)', () => {
    toneState.tones['http://x/b.jpg'] = [90, 70, 60]
    mountHero(['http://x/a.jpg', 'http://x/b.jpg'], 1)
    render(<LiveTvLibraryFrame {...base} platform="desktop" />)
    const frame = document.querySelector('[data-live-tv-frame-bg]') as HTMLElement
    const hero = frame.querySelector('[data-live-tv-frame-hero]') as HTMLElement
    expect(hero).not.toBeNull()
    expect(hero.getAttribute('data-live-tv-frame-hero')).toBe('http://x/b.jpg')
    expect(hero.style.backgroundImage).toContain('http://x/b.jpg')
    expect(hero.style.filter).toContain('blur(')
    // Ramens egen yta är inte en ogenomskinlig sidton som döljer kopian.
    expect(frame.style.background).toBe('')
    expect(frame.style.backgroundColor === '' || frame.style.backgroundColor === 'transparent').toBe(true)
  })
  it('rotorsaken, tonen: en vanlig hero (90,70,60) ger en räls som syns skild från sidtonen', () => {
    toneState.tones['http://x/b.jpg'] = [90, 70, 60]
    mountHero(['http://x/b.jpg'], 0)
    render(<LiveTvLibraryFrame {...base} platform="desktop" />)
    const frame = document.querySelector('[data-live-tv-frame-bg]') as HTMLElement
    const layer = frame.querySelector('[data-live-tv-frame-tint-layer]') as HTMLElement
    const m = layer.getAttribute('data-live-tv-frame-tint-layer')!.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/)
    expect(m).not.toBeNull()
    const [r, g, b, a] = m!.slice(1).map(Number) as [number, number, number, number]
    const page = [22, 26, 35]
    const top = [r, g, b].map((c, i) => c * a + page[i]! * (1 - a))
    expect(Math.max(...top.map((c, i) => Math.abs(c - page[i]!)))).toBeGreaterThanOrEqual(24)
  })
  it('skrivbord utan hero: ingen bildkopia, toningen i genomskinlig sidton', () => {
    render(<LiveTvLibraryFrame {...base} platform="desktop" />)
    const frame = document.querySelector('[data-live-tv-frame-bg]') as HTMLElement
    expect(frame.querySelector('[data-live-tv-frame-hero]')).toBeNull()
    const layer = frame.querySelector('[data-live-tv-frame-tint-layer]') as HTMLElement
    expect(layer.getAttribute('data-live-tv-frame-tint-layer')).toContain('rgba(22,26,35,')
  })
})
