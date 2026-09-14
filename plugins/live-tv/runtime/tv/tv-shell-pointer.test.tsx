import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/**
 * Glasmenyn är VÄRDENS UI och äger sin egen Back — teststubben gör det inte.
 * Utan modellen hade kedjetestets tangentväg jämförts mot en meny som ingen
 * stänger, och asymmetrin hade sett ut som en bugg i skalet i stället för som
 * stubbens lucka. Dubbelgångaren gör exakt det värdens meny gör: stänger sig
 * själv på Escape.
 */
vi.mock('@/lib/plugin-sdk', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  const { createElement, useEffect: onMount } = await import('react')
  const HostGlassMenu = ({ target, onClose }: { target: { title: string; actions: Array<{ key: string; label: string; run: () => void }> }; onClose: () => void }) => {
    onMount(() => {
      const onKey = (event: KeyboardEvent) => {
        if (event.key !== 'Escape' && event.key !== 'Backspace') return
        event.preventDefault()
        event.stopPropagation()
        onClose()
      }
      window.addEventListener('keydown', onKey, true)
      return () => window.removeEventListener('keydown', onKey, true)
    }, [onClose])
    return createElement(
      'div',
      { role: 'menu', 'data-panel-root': '', 'data-testid': 'tv-glass-menu' },
      createElement('div', null, target.title),
      ...target.actions.map((action) => createElement('button', { key: action.key, type: 'button', onClick: () => { action.run(); onClose() } }, action.label)),
    )
  }
  // Explicita `undefined`-nycklar (inte utelämnade): vitests mockade modul
  // KASTAR på `typeof sdk.getAccent` och de andra defensiva probningarna som
  // pluginet gör mot äldre appar, medan en riktig modul bara ger undefined.
  return {
    ...actual,
    getAccent: undefined,
    setAccent: undefined,
    ACCENT_PRESETS: undefined,
    getTvClock: undefined,
    notifyPluginRegistryChanged: undefined,
    createVideoSurface: undefined,
    getVideoSurfaceCapabilities: undefined,
    mpvSetPropertyStrings: undefined,
    closeAllAuxSurfaces: undefined,
    getTvGlassMenu: () => HostGlassMenu,
  }
})

import { __resetForTests, __setProfilePinForTests, __setTvModeForTests, BROWSE_BACK_EVENT, writePluginJson } from '@/lib/plugin-sdk'
import { seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LOCKED_CHANNELS_KEY } from '../channel-locks'
import { LIVE_TV_PLUGIN_ID, channelKey, type LiveTvList } from '../live-tv-data'

// Spelaren äger Back medan den är öppen (se tv-shell.tsx). Mocken måste därför
// stänga sig själv på Back precis som den riktiga spelaren gör — annars hade
// tangentvägen och klickvägen jämförts mot två olika produkter i
// kedjetestet nedan.
vi.mock('../live-tv-player', () => ({
  LiveTvPlayer: ({ channel, onClose }: { channel: { name: string }; onClose: () => void }) => {
    useEffect(() => {
      const onKey = (event: KeyboardEvent) => {
        if (event.key === 'Backspace' || event.key === 'Escape') onClose()
      }
      window.addEventListener('keydown', onKey, true)
      return () => window.removeEventListener('keydown', onKey, true)
    }, [onClose])
    return <div data-testid="player" data-panel-root="">{channel.name}</div>
  },
}))

import { LiveTvTvShell } from './tv-shell'

const ch = (name: string, group: string) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId: null })
const list: LiveTvList = { id: 'l1', name: 'Xtream', channels: [ch('A', 'Sport'), ch('B', 'Sport'), ch('C', 'News')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }

const realMatchMedia = window.matchMedia

afterEach(() => {
  cleanup()
  window.matchMedia = realMatchMedia
})
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(false)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  seedLiveTvIndex()
})

function mount(params: Record<string, string> = {}) {
  const onNavigate = vi.fn()
  const view = render(<LiveTvTvShell pageId="live-tv-browse" params={params} onNavigate={onNavigate} onOpenDetails={() => {}} />)
  return { onNavigate, view }
}

/** Första kanalkortet på hubben — en station MED hållhandling (`data-hold`). */
const firstHoldStation = () => screen.getByTestId('all-channels').querySelectorAll<HTMLElement>('[data-hold]')[0]
const affordance = () => screen.queryByTestId('hold-affordance')

/**
 * En enhet UTAN någon fin pekare (ren pekskärm) — spec §5. Frågan skalet
 * ställer är `(any-pointer: fine)`, så en hybrid med mus behåller knappen.
 */
function stubPointer({ fine }: { fine: boolean }) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('any-pointer: fine') ? fine : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

describe('"…"-knappen på hovring', () => {
  it('pointerover på en [data-hold]-station visar "…"', () => {
    mount()
    expect(affordance()).toBeNull()
    fireEvent.pointerOver(firstHoldStation())
    const button = affordance()
    expect(button).not.toBeNull()
    // Tydlig affordans, inte diskret: ikon OCH verktygstips (Jerrys följdkrav).
    expect(button?.getAttribute('title')).toBe('More options')
    expect(button?.querySelector('svg')).not.toBeNull()
    // Över spelarens lager (z 70): mini-guidens kort är stationer med håll.
    expect(Number((button as HTMLElement).style.zIndex)).toBeGreaterThan(70)
  })

  it('det finns bara EN knapp för hela skalet', () => {
    mount()
    const stations = screen.getByTestId('all-channels').querySelectorAll<HTMLElement>('[data-hold]')
    expect(stations.length).toBeGreaterThan(1)
    fireEvent.pointerOver(stations[0])
    fireEvent.pointerOver(stations[1])
    expect(screen.getAllByTestId('hold-affordance')).toHaveLength(1)
  })

  it('klick på "…" kör stationens onHold', () => {
    mount()
    fireEvent.pointerOver(firstHoldStation())
    fireEvent.click(affordance() as HTMLElement)
    // Hållhandlingen på ett kanalkort är glasmenyn för kanalen.
    expect(screen.getByTestId('tv-glass-menu')).toHaveTextContent('A')
  })

  it('pointerleave döljer knappen', () => {
    mount()
    fireEvent.pointerOver(firstHoldStation())
    expect(affordance()).not.toBeNull()
    fireEvent.pointerLeave(document.querySelector('[data-live-tv-tv-root]') as HTMLElement)
    expect(affordance()).toBeNull()
  })

  it('scroll i skalet döljer knappen', () => {
    mount()
    fireEvent.pointerOver(firstHoldStation())
    expect(affordance()).not.toBeNull()
    fireEvent.scroll(screen.getByTestId('all-channels'))
    expect(affordance()).toBeNull()
  })

  it('ingen "…"-knapp i TV-läge', () => {
    // TV-designen är godkänd: "vad ser annorlunda ut på TV?" — ingenting.
    __setTvModeForTests(true)
    mount()
    fireEvent.pointerOver(firstHoldStation())
    expect(affordance()).toBeNull()
  })

  it('ingen "…"-knapp när pekaren är grov', () => {
    // Spec §5: långtryck är enda vägen till hållmenyn på en pekskärm.
    stubPointer({ fine: false })
    mount()
    fireEvent.pointerOver(firstHoldStation())
    expect(affordance()).toBeNull()
  })

  it('en hybrid med mus behåller knappen', () => {
    // `(any-pointer: fine)` matchar så fort NÅGON fin pekare finns, även när
    // den primära är grov (pekskärmslaptop).
    stubPointer({ fine: true })
    mount()
    fireEvent.pointerOver(firstHoldStation())
    expect(affordance()).not.toBeNull()
  })

  it('pointermove på en station visar knappen utan föregående pointerover', () => {
    // Listan kan scrolla under en stillastående mus: då kommer ingen
    // pointerover, bara rörelse.
    mount()
    fireEvent.pointerMove(firstHoldStation())
    expect(affordance()).not.toBeNull()
  })

  it('vybyte tar bort knappen', () => {
    // Stationen den pekade på avmonteras med vyn — en knapp kvar i luften
    // pekar på ingenting.
    const { view } = mount()
    fireEvent.pointerOver(firstHoldStation())
    expect(affordance()).not.toBeNull()
    view.rerender(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'favs' }} onNavigate={() => {}} onOpenDetails={() => {}} />)
    expect(affordance()).toBeNull()
  })
})

describe('Bakåt med pekare', () => {
  it('Bakåt-posten finns i raden utanför TV-läget', () => {
    mount()
    expect(screen.getByTestId('rail-back')).toBeTruthy()
  })

  it('Bakåt-posten saknas i TV-läge', () => {
    __setTvModeForTests(true)
    mount()
    expect(screen.queryByTestId('rail-back')).toBeNull()
  })

  /**
   * Samma fyra nivåer, två inmatningsvägar. Sekvensen spelas in som text och
   * jämförs — då kan ingen nivå tappas bort på bara den ena vägen.
   */
  async function runChain(trigger: () => void): Promise<string[]> {
    const events: string[] = []
    const onNavigate = vi.fn((to: { params?: Record<string, string> }) => { events.push(`vy:${to.params?.view}`) })
    const onBrowseBack = () => events.push('browse-back')
    window.addEventListener(BROWSE_BACK_EVENT, onBrowseBack)
    const page = (params: Record<string, string>) => (
      <LiveTvTvShell pageId="live-tv-browse" params={params} onNavigate={onNavigate} onOpenDetails={() => {}} />
    )
    const view = render(page({}))

    // 1. Glasmenyn, överst av alla nivåer. Tangenten når den genom värdens
    // egen meny (som äger sin Back), klicket genom `back()`:s menygren —
    // två vägar, samma utfall.
    fireEvent.contextMenu(firstHoldStation())
    expect(screen.getByTestId('tv-glass-menu')).toBeTruthy()
    trigger()
    events.push(screen.queryByTestId('tv-glass-menu') ? 'meny kvar' : 'meny stängd')

    // 2. Lager: hubbens spellistmeny registreras med nav.pushLayer.
    fireEvent.click(screen.getByTestId('playlist-pill'))
    expect(screen.getByTestId('playlist-l1')).toBeTruthy()
    trigger()
    events.push(screen.queryByTestId('playlist-l1') ? 'lager kvar' : 'lager stängt')

    // 3. Spelaren.
    fireEvent.click(firstHoldStation())
    await screen.findByTestId('player')
    trigger()
    events.push(screen.queryByTestId('player') ? 'spelare kvar' : 'spelare stängd')

    // 4. Vyn.
    view.rerender(page({ view: 'favs' }))
    trigger()

    // 5. Ut ur Live TV.
    view.rerender(page({}))
    trigger()

    window.removeEventListener(BROWSE_BACK_EVENT, onBrowseBack)
    cleanup()
    return events
  }

  it('Bakåt-kedjan är identisk från tangent och från klick', async () => {
    const fromKey = await runChain(() => { fireEvent.keyDown(window, { key: 'Escape' }) })
    __resetForTests()
    __setTvModeForTests(false)
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
    writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
    seedLiveTvIndex()
    const fromClick = await runChain(() => { fireEvent.click(screen.getByTestId('rail-back')) })
    expect(fromClick).toEqual(fromKey)
    expect(fromKey).toEqual(['meny stängd', 'lager stängt', 'spelare stängd', 'vy:hub', 'browse-back'])
  })
})

describe('Kantsvepet', () => {
  function swipeFromLeftEdge() {
    act(() => {
      const start = new Event('touchstart', { bubbles: true })
      Object.defineProperty(start, 'touches', { value: [{ clientX: 8, clientY: 200 }] })
      document.dispatchEvent(start)
      const end = new Event('touchend', { bubbles: true })
      Object.defineProperty(end, 'changedTouches', { value: [{ clientX: 240, clientY: 206 }] })
      document.dispatchEvent(end)
    })
  }

  it('svepet tar ett steg i kedjan i stället för att hoppa till hubben', () => {
    const { onNavigate } = mount()
    fireEvent.click(screen.getByTestId('playlist-pill'))
    expect(screen.getByTestId('playlist-l1')).toBeTruthy()
    swipeFromLeftEdge()
    // Ett steg: lagret stängdes, och ingen navigering skedde.
    expect(screen.queryByTestId('playlist-l1')).toBeNull()
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('svepet är avstängt medan PIN-grinden är öppen', async () => {
    // Andra halvan av `enabled` (`pending === null`): grinden ligger ÖVER
    // sidan men i samma DOM, så utan flaggan hade ett drag bakom den
    // navigerat undan sidan och lämnat grinden utan sammanhang.
    __setProfilePinForTests('1234')
    writePluginJson(LIVE_TV_PLUGIN_ID, LOCKED_CHANNELS_KEY, [channelKey({ name: 'A', url: 'http://x/A' })])
    const { onNavigate } = mount()
    const leftLiveTv = vi.fn()
    window.addEventListener(BROWSE_BACK_EVENT, leftLiveTv)
    fireEvent.click(firstHoldStation())
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    swipeFromLeftEdge()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeNull())
    expect(onNavigate).not.toHaveBeenCalled()
    expect(leftLiveTv).not.toHaveBeenCalled()
    window.removeEventListener(BROWSE_BACK_EVENT, leftLiveTv)
  })

  it('svepet är avstängt medan glasmenyn ligger över', () => {
    // `enabled` stänger av gesten när ett eget lager täcker skärmen men ligger
    // kvar i sidans DOM (spec §4.1) — annars hade ett drag bakom menyn
    // navigerat undan sidan under den.
    const { onNavigate } = mount()
    const leftLiveTv = vi.fn()
    window.addEventListener(BROWSE_BACK_EVENT, leftLiveTv)
    fireEvent.contextMenu(firstHoldStation())
    expect(screen.getByTestId('tv-glass-menu')).toBeTruthy()
    swipeFromLeftEdge()
    expect(screen.queryByTestId('tv-glass-menu')).not.toBeNull()
    expect(onNavigate).not.toHaveBeenCalled()
    // Inte heller ett steg FÖRBI menyn: med gesten påslagen hade `back()`
    // gått vidare i kedjan och kastat ut användaren ur Live TV bakom menyn.
    expect(leftLiveTv).not.toHaveBeenCalled()
    window.removeEventListener(BROWSE_BACK_EVENT, leftLiveTv)
  })
})

describe('Zappen och textytor', () => {
  it('zappen tar fortfarande siffror utanför textytor', () => {
    mount()
    fireEvent.keyDown(window, { key: '1' })
    expect(screen.getByTestId('zap-digits')).toHaveTextContent('1')
  })

  it('zappen äter inte siffror i ett contenteditable', () => {
    mount()
    const field = document.createElement('div')
    field.setAttribute('contenteditable', '')
    document.body.appendChild(field)
    fireEvent.keyDown(field, { key: '2' })
    expect(screen.queryByTestId('zap-digits')).toBeNull()
    field.remove()
  })
})
