import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, BROWSE_BACK_EVENT, writePluginJson } from '@/lib/plugin-sdk'
import { seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'

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

/** Pekaren rapporterar grovt (pekskärm/fjärr) — spec §5. */
function stubCoarsePointer(coarse: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('pointer: coarse') ? coarse : false,
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
    stubCoarsePointer(true)
    mount()
    fireEvent.pointerOver(firstHoldStation())
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

    // 1. Lager: hubbens spellistmeny registreras med nav.pushLayer.
    fireEvent.click(screen.getByTestId('playlist-pill'))
    expect(screen.getByTestId('playlist-l1')).toBeTruthy()
    trigger()
    events.push(screen.queryByTestId('playlist-l1') ? 'lager kvar' : 'lager stängt')

    // 2. Spelaren.
    fireEvent.click(firstHoldStation())
    await screen.findByTestId('player')
    trigger()
    events.push(screen.queryByTestId('player') ? 'spelare kvar' : 'spelare stängd')

    // 3. Vyn.
    view.rerender(page({ view: 'favs' }))
    trigger()

    // 4. Ut ur Live TV.
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
    expect(fromKey).toEqual(['lager stängt', 'spelare stängd', 'vy:hub', 'browse-back'])
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
