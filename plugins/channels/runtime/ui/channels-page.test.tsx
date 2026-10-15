import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  holdNext: false,
  glassMenu: null as unknown,
}))

vi.mock('@/lib/plugin-sdk', () => ({
  waitForStartIdle: () => Promise.resolve(),
  useTvMode: () => state.tv,
  useLang: () => ({ lang: 'sv' }),
  resolvePluginText: (text: { sv: string }) => text.sv,
  requestBrowseBack: () => { state.back += 1 },
  tvHoldHandlers: (onShort: () => void, onHold: (el: HTMLElement) => void) => ({
    onKeyDown: (e: { key: string; currentTarget: EventTarget | null; preventDefault(): void }) => {
      if (e.key !== 'Enter') return
      e.preventDefault()
      // Testets "håll": Shift+Enter håller, vanlig Enter är ett kort tryck.
      state.holdNext ? onHold(e.currentTarget as HTMLElement) : onShort()
    },
    onKeyUp: () => {},
  }),
  getTvGlassMenu: () => state.glassMenu,
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
  readCachedRundown: () => null,
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
import { guideFadeMask } from './channel-guide'
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
  state.holdNext = false
  state.glassMenu = null
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

  it('väljer första kanalen efter nummer; klick väljer raden (heron följer), klick på vald rad tittar live', () => {
    const { container } = page()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Terminator')
    expect(container.textContent).toContain('KANAL 1 · Första')
    expect(container.querySelectorAll('[data-channel-row]').length).toBe(2)
    fireEvent.click(container.querySelector('[data-channel-row="k2"]')!)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Aliens')
    expect(screen.queryByTestId('player')).toBeNull()
    fireEvent.click(container.querySelector('[data-channel-row="k2"]')!)
    expect(screen.getByTestId('player').textContent).toBe('k2|live|')
  })

  it('dubbelklick på en rad tittar live', () => {
    const { container } = page()
    fireEvent.doubleClick(container.querySelector('[data-channel-row="k2"]')!)
    expect(screen.getByTestId('player').textContent).toBe('k2|live|')
  })

  it('skrivbord: heron följer raden under pekaren och går tillbaka till vald rad', () => {
    const { container } = page()
    const h1 = () => screen.getByRole('heading', { level: 1 }).textContent
    fireEvent.mouseEnter(container.querySelector('[data-channel-row="k2"]')!)
    expect(h1()).toBe('Aliens')
    // Herons knappar gäller vald kanal: pekaren lämnar raderna på väg dit.
    fireEvent.mouseLeave(container.querySelector('[data-channel-row="k2"]')!)
    expect(h1()).toBe('Terminator')
    fireEvent.click(screen.getByText('⟲ Från början'))
    expect(screen.getByTestId('player').textContent).toBe('k1|start|')
  })

  it('sidan har bara hero + tablå: inga HEM-, KANALER-, NY KANAL- eller Redigera-knappar, ingen karusell', () => {
    const { container } = page()
    for (const gone of ['‹ HEM', 'KANALER', '+ NY KANAL', 'Redigera kanal']) expect(screen.queryByText(gone)).toBeNull()
    expect(container.querySelector('[data-channels-topbar]')).toBeNull()
    expect(container.querySelector('[data-hero-dots]')).toBeNull()
    expect([...container.querySelectorAll('[data-hero-actions] button')].map((b) => b.textContent)).toEqual(['▶ Titta live', '⟲ Från början'])
  })

  it('tablån rullar i en egen behållare som tonar ut raderna upptill; sidan själv har fast höjd', () => {
    const { container } = page()
    const scroller = container.querySelector<HTMLElement>('[data-channels-guide-scroll]')!
    expect(scroller.style.overflowY).toBe('auto')
    expect(scroller.hasAttribute('data-scroll')).toBe(true)
    expect(scroller.querySelectorAll('[data-channel-row]').length).toBe(2)
    // Masken (happy-dom tappar mask-image; värdet testas direkt): raderna tonar ut upptill.
    expect(guideFadeMask(false)).toBe('linear-gradient(to bottom, transparent 0, black 28px)')
    expect(guideFadeMask(true)).toBe('linear-gradient(to bottom, transparent 0, black calc(40 * var(--tv-u, 1px)))')
    // Heron ligger utanför rullbehållaren (står still).
    expect(scroller.contains(container.querySelector('[data-channels-hero]'))).toBe(false)
    expect(container.querySelector<HTMLElement>('[data-channels-page]')!.style.overflow).toBe('hidden')
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

  it('tomvyn återställer standardkanalerna och visar var egna kanaler skapas', () => {
    state.channels = []
    const { container } = page()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Inga kanaler')
    expect(container.querySelector('[data-empty-hint]')!.textContent).toContain('Inställningar → Kanaler')
    expect(screen.queryByText('Skapa egen')).toBeNull()
    expect(screen.queryByText('‹ HEM')).toBeNull()
    fireEvent.click(screen.getByText('Återställ standardkanaler'))
    expect(state.restored).toEqual(['sv'])
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

})

describe('Kanaler-sidan på TV', () => {
  it('heron följer raden med fokus; inga knappar i heron; ett startfokus på vald kanals rad', () => {
    state.tv = true
    const { container } = page({ channelId: 'k2' })
    expect(container.querySelector('[data-hero-actions]')).toBeNull()
    expect(container.querySelectorAll('[data-channels-hero] button').length).toBe(0)
    const inits = [...container.querySelectorAll('[data-init]')]
    expect(inits.map((el) => el.getAttribute('data-channel-row'))).toEqual(['k2'])
    expect(document.activeElement).toBe(inits[0])
    fireEvent.focus(container.querySelector('[data-channel-row="k1"]')!)
    expect(container.querySelector('[data-channels-hero]')!.getAttribute('data-hero-channel')).toBe('k1')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Terminator')
  })

  it('OK på en rad tittar live; håll OK öppnar glasmenyn med Från början, Redigera kanal, Zappa', () => {
    state.tv = true
    const targets: Array<{ title: string; actions: Array<{ key: string; label: string; run(): void }> }> = []
    state.glassMenu = ({ target }: { target: (typeof targets)[number] }) => { targets.push(target); return <div data-testid="glass-menu" /> }
    const { container } = page({ channelId: 'k1' })
    const row = container.querySelector<HTMLElement>('[data-channel-row="k2"]')!
    state.holdNext = true
    fireEvent.keyDown(row, { key: 'Enter' })
    expect(screen.getByTestId('glass-menu')).toBeTruthy()
    const menu = targets[targets.length - 1]!
    expect(menu.title).toBe('KANAL 2 · Andra')
    expect(menu.actions.map((a) => a.label)).toEqual(['Från början', 'Redigera kanal', 'Zappa'])
    act(() => menu.actions.find((a) => a.key === 'zap')!.run())
    expect(screen.getByTestId('player').textContent).toBe('k2|live|zap')
    cleanup()
    targets.length = 0
    const second = page({ channelId: 'k1' })
    fireEvent.keyDown(second.container.querySelector('[data-channel-row="k1"]')!, { key: 'Enter' })
    act(() => targets[targets.length - 1]!.actions.find((a) => a.key === 'edit')!.run())
    expect(screen.getByTestId('studio').textContent).toBe('studio:k1')
    cleanup()
    targets.length = 0
    state.holdNext = false
    const third = page({ channelId: 'k1' })
    fireEvent.keyDown(third.container.querySelector('[data-channel-row="k2"]')!, { key: 'Enter' })
    expect(screen.getByTestId('player').textContent).toBe('k2|live|')
  })

  it('utan spelbar värd: glasmenyn har bara Redigera kanal', () => {
    state.tv = true
    state.ready = false
    state.holdNext = true
    const targets: Array<{ actions: Array<{ label: string }> }> = []
    state.glassMenu = ({ target }: { target: (typeof targets)[number] }) => { targets.push(target); return null }
    const { container } = page()
    fireEvent.keyDown(container.querySelector('[data-channel-row="k1"]')!, { key: 'Enter' })
    expect(targets[0]!.actions.map((a) => a.label)).toEqual(['Redigera kanal'])
  })
})

describe('Kanaler-sidans utseende', () => {
  it('inga gradienter utanför herobildens uttoning', () => {
    state.rundowns = { k1: [{ ...item('Terminator', 100_000), backdropUrl: 'https://img/b.jpg' }], k2: [item('Aliens', 100_000)] }
    const { container } = page()
    expect(container.querySelector('[data-hero-image="k1"]')?.getAttribute('style')).toContain('img/b.jpg')
    // Herobildens uttoning är den enda tillåtna gradienten (utöver zappens brus).
    container.querySelector('[data-hero-backdrop]')!.remove()
    // …och tablåns uttoning upptill (raderna försvinner under heron).
    container.querySelector<HTMLElement>('[data-channels-guide-scroll]')!.removeAttribute('style')
    expect(container.innerHTML).not.toMatch(/gradient/i)
  })

  it('heron har fasta rader: ingen "Fler titler laddas…", Sedan-raden finns alltid (heron byter aldrig höjd)', () => {
    state.partial = true
    const { container } = page()
    expect(screen.queryByText('Fler titler laddas…')).toBeNull()
    expect(container.querySelector('[data-hero-meta]')).toBeTruthy()
    expect(container.querySelector('[data-hero-status]')).toBeTruthy()
    expect(container.querySelector('[data-hero-next]')).toBeTruthy()
    // Hela herons struktur (alla element, inte bara raderna) är densamma i vila som live.
    const lines = (root: HTMLElement) => [...root.querySelectorAll('[data-channels-hero] *')].filter((el) => !el.closest('[data-hero-backdrop]')).map((el) => el.tagName).join(',')
    const live = lines(container)
    cleanup()
    // Vilande kanal: samma rader (vilotexten i statusraden, ingen extra rad).
    state.channels = [{ ...channel(1, 'Natt'), airWindow: 'late' }]
    const resting = page().container
    expect(lines(resting)).toBe(live)
    // Återkomsten står i metaraden (ingen egen rad som skjuter innehållet).
    expect(resting.querySelector('[data-hero-meta]')!.textContent).toMatch(/åter \d\d:\d\d · om /)
    expect(screen.queryByText(/^Sänder igen/)).toBeNull()
  })

  it('TV: fast fokusband — ▼/▲ flyttar fokus en rad och spåret glider, ingen inbyggd rullning; ▲ från första raden lämnas åt motorn', () => {
    state.tv = true
    state.channels = [channel(1, 'Första'), channel(2, 'Andra'), channel(3, 'Tredje')]
    state.rundowns = { k1: [item('Terminator', 100_000)], k2: [item('Aliens', 100_000)], k3: [item('Heat', 100_000)] }
    const { container } = page({ channelId: 'k1' })
    const scroller = container.querySelector<HTMLElement>('[data-channels-guide-scroll]')!
    expect(scroller.hasAttribute('data-scroll')).toBe(false)
    expect(scroller.getAttribute('data-guide-band')).toBe('0')
    const row = (id: string) => container.querySelector<HTMLElement>(`[data-channel-row="${id}"]`)!
    const up = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true })
    row('k1').dispatchEvent(up)
    expect(up.defaultPrevented).toBe(false)
    fireEvent.keyDown(row('k1'), { key: 'ArrowDown' })
    expect(document.activeElement).toBe(row('k2'))
    expect(scroller.getAttribute('data-guide-band')).toBe('1')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Aliens')
    // Raden ovanför bandet är ingen station (syns bara i uttoningen).
    expect(row('k1').hasAttribute('data-f')).toBe(false)
    fireEvent.keyDown(row('k2'), { key: 'ArrowDown' })
    expect(scroller.getAttribute('data-guide-band')).toBe('2')
    // Sista raden: bandet står kvar, motorn får ▼.
    const down = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })
    row('k3').dispatchEvent(down)
    expect(down.defaultPrevented).toBe(false)
    fireEvent.keyDown(row('k3'), { key: 'ArrowUp' })
    expect(document.activeElement).toBe(row('k2'))
    expect(scroller.getAttribute('data-guide-band')).toBe('1')
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

  it('tablåblocken: ljusgrå i vila, ljusare på raden under pekaren, pågående i appens accent', () => {
    state.channels = [channel(1, 'Första')]
    state.rundowns = { k1: [item('Terminator', 30), item('Heat', 30), item('Ronin', 30)] }
    const { container } = page({ channelId: 'k1' })
    const idle = () => container.querySelector<HTMLElement>('[data-guide-block="idle"]')!
    const current = container.querySelector<HTMLElement>('[data-guide-block="current"]')!
    const bg = (el: HTMLElement) => el.style.background.replace(/\s/g, '')
    expect(bg(idle())).toContain('rgba(49,51,58,0.9)')
    expect(bg(current)).toContain('rgba(22,18,18,0.96)')
    // Accenten kommer från appens --accent-600 (följer Utseende → Accent), inte en fast orange.
    expect(current.style.boxShadow).toContain('var(--accent-600')
    fireEvent.mouseEnter(container.querySelector('[data-channel-row="k1"]')!)
    expect(bg(idle())).toContain('rgba(63,66,75,0.92)')
    fireEvent.mouseLeave(container.querySelector('[data-channel-row="k1"]')!)
    expect(bg(idle())).toContain('rgba(49,51,58,0.9)')
  })

  it('TV: appens mått — typografitoken för text, eget radavstånd i blocken, ingen krock med appens [data-hero-copy]', () => {
    state.tv = true
    const { container } = page()
    expect(container.querySelector('[data-hero-copy]')).toBeNull()
    expect(container.querySelector('[data-channels-hero-copy]')).not.toBeNull()
    const block = container.querySelector<HTMLElement>('[data-guide-block]')!
    // Eget radavstånd: ärvt 1,4 från TV-lägets <main> klippte titeln.
    expect(block.style.lineHeight).toBe('1.2')
    // Inga numeriska px-texter i TV-läget (tokenvärdena själva testas i tv.test.ts).
    const pxText = [...container.querySelectorAll<HTMLElement>('*')].filter((el) => /font-size:\s*\d+(\.\d+)?px/.test(el.getAttribute('style') ?? ''))
    expect(pxText).toEqual([])
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
