import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createChannel, emptyDraft, type ChannelDef } from '../model/channel'
import type { PoolItem } from '../data/pool'

const state = vi.hoisted(() => ({
  tv: false,
  ready: true,
  channels: [] as unknown[],
  rundowns: {} as Record<string, unknown[]>,
  now: 0,
  saved: [] as unknown[],
  back: 0,
  partial: false,
  lastChannelId: null as string | null,
  seeded: [] as string[],
  restored: [] as string[],
  deleted: [] as string[],
}))

vi.mock('@/lib/plugin-sdk', () => ({
  waitForStartIdle: () => Promise.resolve(),
  useTvMode: () => state.tv,
  useLang: () => ({ lang: 'sv' }),
  resolvePluginText: (text: { sv: string }) => text.sv,
  requestBrowseBack: () => { state.back += 1 },
}))
vi.mock('../host', () => ({
  hostReady: () => state.ready,
  readZapMemory: () => ({ lastChannelId: state.lastChannelId, previousChannelId: null }),
}))
vi.mock('../state/store', () => ({
  useChannels: () => state.channels,
  useChannelPool: (channel: { id: string } | null) => ({ pool: [], rundown: (channel && state.rundowns[channel.id]) ?? [], loading: false, partial: state.partial }),
  useChannelClock: () => state.now,
  saveChannel: (def: unknown) => { state.saved.push(def) },
  seedDefaultChannels: (lang: string) => { state.seeded.push(lang); return 0 },
  restoreDefaultChannels: (lang: string) => { state.restored.push(lang); return 10 },
  deleteChannel: (id: string) => { state.deleted.push(id) },
  readCachedPool: () => null,
}))
vi.mock('./channel-player', () => ({
  ChannelPlayer: ({ initialChannelId, mode, startInZap, onClose }: { initialChannelId: string; mode: string; startInZap?: boolean; onClose(): void }) => (
    <button type="button" data-testid="player" onClick={onClose}>{`${initialChannelId}|${mode}|${startInZap ? 'zap' : ''}`}</button>
  ),
}))

vi.mock('./studio', () => ({
  ChannelStudio: ({ studio, onDone }: { studio: string; onDone(id?: string): void }) => (
    <button type="button" data-testid="studio" onClick={() => onDone(studio === 'new' ? undefined : studio)}>{`studio:${studio}`}</button>
  ),
}))

import { ChannelsPage } from './channels-page'
import { ChannelsPlugin } from '../index'

const at = (h: number, m: number) => new Date(2026, 9, 14, h, m).getTime()
const item = (ref: string, runtimeMin: number): PoolItem => ({
  ref, title: ref, runtimeMin, runtimeKnown: true, year: 1984, kind: 'movie', source: 'library', genres: [],
  play: { type: 'library', key: ref, mediaType: 'movie' },
})
const channel = (n: number, name: string): ChannelDef => ({ ...createChannel({ ...emptyDraft(), name }, [], 1, () => 0.1), id: `k${n}`, number: n })
const page = (params?: Record<string, string>) => render(<ChannelsPage pageId="channels" params={params} onNavigate={() => {}} onOpenDetails={() => {}} />)

beforeEach(() => {
  state.tv = false
  state.ready = true
  state.channels = [channel(2, 'Andra'), channel(1, 'Första')]
  // Lång enda titel: sänds alltid, oavsett epok.
  state.rundowns = { k1: [item('Terminator', 100_000)], k2: [item('Aliens', 100_000)] }
  state.now = at(21, 47)
  state.saved = []
  state.back = 0
  state.partial = false
  state.lastChannelId = null
  state.seeded = []
  state.restored = []
  state.deleted = []
})
afterEach(cleanup)

describe('Kanaler-sidan', () => {
  it('registrerar sida och menyval med samma id', () => {
    const pages: Array<Record<string, unknown>> = []
    const items: Array<Record<string, unknown>> = []
    const rows: Array<Record<string, unknown>> = []
    const sections: Array<Record<string, unknown>> = []
    ChannelsPlugin.register({
      registerSettingsSection: (x: Record<string, unknown>) => { sections.push(x) },
      registerHomeRow: (r: Record<string, unknown>) => { rows.push(r) },
      registerBrowsePage: (p: Record<string, unknown>) => { pages.push(p) },
      registerMainMenuItem: (i: Record<string, unknown>) => { items.push(i) },
    } as never)
    expect(pages).toMatchObject([{ id: 'channels', hideHero: true }])
    expect(items).toMatchObject([{ id: 'channels', target: { pageId: 'channels' }, defaultEnabled: true }])
    expect(rows).toMatchObject([{ id: 'channels-now', showOnHome: true }])
    expect(sections).toMatchObject([{ id: 'channels', label: { sv: 'Kanaler' } }])
    expect(typeof sections[0]!.rows).toBe('function')
  })

  it('väljer första kanalen efter nummer, och klick på rad byter heron', () => {
    const { container } = page()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Terminator')
    expect(container.textContent).toContain('KANAL 1 · Första')
    expect(container.querySelectorAll('[data-channel-row]').length).toBe(2)
    fireEvent.click(container.querySelector('[data-channel-row="k2"]')!)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Aliens')
  })

  it('tidsaxeln börjar på föregående halvtimme', () => {
    const { container } = page()
    expect(container.querySelector('[data-channels-guide]')!.textContent).toContain('21:3022:0022:30')
  })

  it('play i parametrarna öppnar spelaren direkt; stäng visar sidan', () => {
    page({ channelId: 'k2', play: 'live' })
    expect(screen.getByTestId('player').textContent).toBe('k2|live|')
    fireEvent.click(screen.getByTestId('player'))
    expect(screen.queryByTestId('player')).toBeNull()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Aliens')
  })

  it('zap=1 startar spelaren i zappläget', () => {
    page({ zap: '1' })
    expect(screen.getByTestId('player').textContent).toBe('k1|live|zap')
  })

  it('Titta live öppnar spelaren; äldre värd visar banner och inaktiverar knappen', () => {
    page()
    fireEvent.click(screen.getByText('▶ Titta live'))
    expect(screen.getByTestId('player').textContent).toBe('k1|live|')
    cleanup()
    state.ready = false
    page({ play: 'live' })
    expect(screen.queryByTestId('player')).toBeNull()
    expect(screen.getByRole('status').textContent).toContain('0.1.625')
    expect((screen.getByText('▶ Titta live') as HTMLButtonElement).disabled).toBe(true)
  })

  it('första öppningen sår standardkanalerna på användarens språk', () => {
    page()
    expect(state.seeded).toEqual(['sv'])
  })

  it('tomvyn återställer standardkanalerna och "Skapa egen" öppnar studion', () => {
    state.channels = []
    page()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Inga kanaler')
    fireEvent.click(screen.getByText('Återställ standardkanaler'))
    expect(state.restored).toEqual(['sv'])
    fireEvent.click(screen.getByText('Skapa egen'))
    expect(screen.getByTestId('studio').textContent).toBe('studio:new')
  })

  it('studio i parametrarna visar studions plats', () => {
    page({ studio: 'k1' })
    expect(screen.getByTestId('studio').textContent).toBe('studio:k1')
    fireEvent.click(screen.getByTestId('studio'))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Terminator')
  })

  it('TV: fokus väljer rad, OK spelar, ◀▶ rullar tidsaxeln men inte före nu', () => {
    state.tv = true
    const { container } = page()
    const guide = () => container.querySelector('[data-channels-guide]')!.textContent!
    const row2 = container.querySelector<HTMLElement>('[data-channel-row="k2"]')!
    fireEvent.focus(row2)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Aliens')
    const left = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })
    row2.dispatchEvent(left)
    expect(left.defaultPrevented).toBe(false)
    fireEvent.keyDown(row2, { key: 'ArrowRight' })
    expect(guide()).toContain('22:0022:30')
    expect(guide()).not.toContain('21:30')
    fireEvent.keyDown(row2, { key: 'ArrowLeft' })
    expect(guide()).toContain('21:3022:00')
    fireEvent.keyDown(row2, { key: 'Enter' })
    expect(screen.getByTestId('player').textContent).toBe('k2|live|')
  })

  it('‹ HEM går tillbaka', () => {
    page()
    fireEvent.click(screen.getByText('‹ HEM'))
    expect(state.back).toBe(1)
  })
})

describe('Kanaler-sidans utseende', () => {
  it('inga gradienter utanför herobildens uttoning', () => {
    state.rundowns = { k1: [{ ...item('Terminator', 100_000), backdropUrl: 'https://img/b.jpg' }], k2: [item('Aliens', 100_000)] }
    const { container } = page()
    expect(container.querySelector('[data-hero-image="k1"]')?.getAttribute('style')).toContain('img/b.jpg')
    // Herobildens uttoning är den enda tillåtna gradienten (utöver zappens brus).
    container.querySelector('[data-hero-backdrop]')!.remove()
    expect(container.innerHTML).not.toMatch(/gradient/i)
  })

  it('toppknapparna står tillsammans och vänsterställda (inget i högra hörnet)', () => {
    const { container } = page()
    const bar = container.querySelector('[data-channels-topbar]')!
    expect([...bar.querySelectorAll('button, span')].map((el) => el.textContent)).toEqual(['‹ HEM', 'KANALER', '+ NY KANAL'])
    expect(bar.innerHTML).not.toContain('flex: 1')
  })

  it('visar en diskret rad medan fler källor laddas', () => {
    state.partial = true
    page()
    expect(screen.getByText('Fler titler laddas…')).toBeTruthy()
  })

  it('KANALER öppnar Hantera kanaler; Ta bort i två steg; Tillbaka till tablån', () => {
    page()
    fireEvent.click(screen.getByText('KANALER'))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hantera kanaler')
    expect([...document.querySelectorAll('[data-channel-name]')].map((el) => el.textContent)).toEqual(['Första', 'Andra'])
    const del = () => screen.getAllByText(/Ta bort|Bekräfta/)[0]!
    fireEvent.click(del())
    expect(state.deleted).toEqual([])
    fireEvent.click(del())
    expect(state.deleted).toEqual(['k1'])
    fireEvent.click(screen.getByText('‹ TABLÅ'))
    expect(document.querySelector('[data-channels-hero]')).toBeTruthy()
  })

  it('Redigera i Hantera kanaler öppnar studion för kanalen', () => {
    page()
    fireEvent.click(screen.getByText('KANALER'))
    fireEvent.click(screen.getAllByText('Redigera')[1]!)
    expect(screen.getByTestId('studio').textContent).toBe('studio:k2')
  })

  it('vilande kanal visar VILA, inte LIVE', () => {
    state.channels = [{ ...channel(1, 'Natt'), airWindow: 'late' }]
    page()
    expect(document.querySelector('[data-hero-badge]')?.textContent).toBe('VILA')
    expect(screen.queryByText('LIVE')).toBeNull()
  })

  it('utan angiven kanal börjar sidan på en kanal som sänder, inte på en vilande kanal 1', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      vi.setSystemTime(at(10, 0))
      state.now = at(10, 0)
      state.channels = [{ ...channel(1, 'Kvällsfilm'), airWindow: 'evenings' }, channel(2, 'Dygnet runt')]
      page()
      expect(document.querySelector('[data-hero-badge]')?.textContent).toContain('LIVE')
      expect(document.querySelector('[data-channels-hero]')?.textContent).toContain('Dygnet runt')
      cleanup()
      // Angiven kanal vinner även om den vilar.
      page({ channelId: 'k1' })
      expect(document.querySelector('[data-hero-badge]')?.textContent).toBe('VILA')
    } finally {
      vi.useRealTimers()
    }
  })

  it('heron är en karusell över sändande kanaler: prickar och svep byter vald kanal (inga pilar)', () => {
    state.channels = [channel(1, 'Första'), { ...channel(2, 'Natt'), airWindow: 'late' }, channel(3, 'Tredje')]
    state.rundowns = { k1: [item('Terminator', 100_000)], k2: [item('Aliens', 100_000)], k3: [item('Heat', 100_000)] }
    const { container } = page({ channelId: 'k1' })
    const hero = () => container.querySelector('[data-channels-hero]')!
    expect(hero().getAttribute('data-hero-slides')).toBe('2')
    expect([...container.querySelectorAll('[data-hero-dot]')].map((d) => d.getAttribute('data-hero-dot'))).toEqual(['k1', 'k3'])
    fireEvent.click(container.querySelector('[data-hero-dot="k3"]')!)
    expect(hero().textContent).toContain('Tredje')
    expect(container.querySelector('[data-channel-row="k3"]')?.getAttribute('aria-pressed')).toBe('true')
    expect(container.querySelector('[data-hero-arrow]')).toBeNull()
    fireEvent.click(container.querySelector('[data-hero-dot="k1"]')!)
    expect(hero().textContent).toContain('Första')
    fireEvent.touchStart(hero(), { touches: [{ clientX: 300, clientY: 100 }] })
    fireEvent.touchEnd(hero(), { changedTouches: [{ clientX: 100, clientY: 110 }] })
    expect(hero().textContent).toContain('Tredje')
  })

  it('en vilande vald kanal är en egen bild bland de sändande', () => {
    state.channels = [channel(1, 'Första'), { ...channel(2, 'Natt'), airWindow: 'late' }]
    const { container } = page({ channelId: 'k2' })
    expect([...container.querySelectorAll('[data-hero-dot]')].map((d) => d.getAttribute('data-hero-dot'))).toEqual(['k1', 'k2'])
    expect(document.querySelector('[data-hero-badge]')?.textContent).toBe('VILA')
  })

  it('TV: ◀ på första knappen bläddrar, ▶ mellan knapparna gör det inte', () => {
    state.tv = true
    state.channels = [channel(1, 'Första'), channel(3, 'Tredje')]
    state.rundowns = { k1: [item('Terminator', 100_000)], k3: [item('Heat', 100_000)] }
    const { container } = page({ channelId: 'k1' })
    const buttons = [...container.querySelectorAll<HTMLButtonElement>('[data-hero-actions] button:not([disabled])')]
    buttons[0]!.focus()
    fireEvent.keyDown(buttons[0]!, { key: 'ArrowRight' })
    expect(container.querySelector('[data-channels-hero]')!.textContent).toContain('Första')
    fireEvent.keyDown(buttons[0]!, { key: 'ArrowLeft' })
    expect(container.querySelector('[data-channels-hero]')!.textContent).toContain('Tredje')
  })

  it('herobilden är ett fast lager kant i kant som slutar under heron och följer rullningen', async () => {
    const original = Element.prototype.getBoundingClientRect
    let heroTop = 40
    let layerOrigin = { left: 0, top: 0 }
    const rect = (left: number, top: number, width: number, height: number) => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect
    Element.prototype.getBoundingClientRect = function (this: Element) {
      if (this.hasAttribute('data-channels-hero')) return rect(65, heroTop, 900, 400)
      if (this.hasAttribute('data-hero-backdrop')) {
        const el = this as HTMLElement
        const m = /translate\((-?\d+)px, (-?\d+)px\)/.exec(el.style.transform)
        return rect(layerOrigin.left + (m ? Number(m[1]) : 0), layerOrigin.top + (m ? Number(m[2]) : 0), 1200, 10)
      }
      return original.call(this)
    }
    const widthDesc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get() { return this.hasAttribute('data-channels-hero') ? 900 : 0 } })
    try {
      state.rundowns = { k1: [{ ...item('Terminator', 100_000), backdropUrl: 'https://img/b.jpg' }], k2: [item('Aliens', 100_000)] }
      const { container } = page({ channelId: 'k1' })
      const layer = container.querySelector<HTMLElement>('[data-hero-backdrop]')!
      expect(layer.style.position).toBe('fixed')
      expect([layer.style.left, layer.style.right, layer.style.top]).toEqual(['0px', '0px', '0px'])
      expect(layer.style.zIndex).toBe('-1')
      // Herons nederkant 440 + uttoningens 170 under heron.
      expect(layer.getAttribute('data-hero-layer')).toBe('0,0,610')
      // Rullat 100 px: lagret slutar 100 px högre, bilden behåller sin höjd.
      heroTop = -60
      fireEvent.scroll(window)
      await waitFor(() => expect(layer.getAttribute('data-hero-layer')).toBe('0,0,510'))
      expect(container.querySelector<HTMLElement>('[data-hero-image="k1"]')!.style.height).toBe('610px')
      // En förfader med transform: lagret kompenserar till fönstrets hörn.
      layerOrigin = { left: 30, top: 12 }
      fireEvent(window, new Event('resize'))
      await waitFor(() => expect(layer.getAttribute('data-hero-layer')).toBe('-30,-12,498'))
      expect(container.querySelector<HTMLElement>('[data-channels-page]')!.style.background).toBe('')
    } finally {
      Element.prototype.getBoundingClientRect = original
      if (widthDesc) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', widthDesc)
      else delete (HTMLElement.prototype as { offsetWidth?: number }).offsetWidth
    }
  })

  it('herons bakgrundslager ritas inte medan värdens mpv-spelare är aktiv', async () => {
    state.rundowns = { k1: [{ ...item('Terminator', 100_000), backdropUrl: 'https://img/b.jpg' }], k2: [item('Aliens', 100_000)] }
    const { container } = page({ channelId: 'k1' })
    expect(container.querySelector('[data-hero-backdrop]')).toBeTruthy()
    document.documentElement.classList.add('mpv-playing')
    try {
      await waitFor(() => expect(container.querySelector('[data-hero-backdrop]')).toBeNull())
    } finally {
      document.documentElement.classList.remove('mpv-playing')
    }
    await waitFor(() => expect(container.querySelector('[data-hero-backdrop]')).toBeTruthy())
  })

  it('första bilden syns vid montering; ett program utan bild lånar närmaste programmets', () => {
    state.rundowns = { k1: [item('Rå fil', 60), { ...item('Med bild', 60), backdropUrl: 'https://img/n.jpg' }], k2: [item('Aliens', 100_000)] }
    const { container } = page({ channelId: 'k1' })
    expect(container.querySelector<HTMLElement>('[data-hero-image="k1"]')?.style.background).toContain('img/n.jpg')
  })
})
