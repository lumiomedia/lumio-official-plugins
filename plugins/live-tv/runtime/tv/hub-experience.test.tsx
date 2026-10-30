import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { flushLiveTvIndex, seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, channelKey, type LiveTvList } from '../live-tv-data'
import type { EpgCacheEntry } from '../epg/types'
import { setTvSettings } from './tv-settings-store'
import { v2Ambient } from './v2-tokens'
import { TV } from './tv-ui'
import { fxMatch, fxSource, stubSportDays } from '../sport/__sport-fixture'
import { localDayKey } from '../sport/sport-epg'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))
import { LiveTvTvShell } from './tv-shell'

/**
 * Kanaler, layout Upplevelse (handoff "Screen 1"): hero med knappar, chips och
 * fem rader med egen zonnavigering (reducern testas för sig).
 */
const now = Date.now()
const ch = (name: string, group: string, tvgId: string | null = null) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId })
const list: LiveTvList = {
  id: 'l1', name: 'Xtream', channels: [ch('A', 'Sport', 'a.tv'), ch('B', 'Sport', 'b.tv'), ch('C', 'News')],
  createdAt: '', urlTvg: 'http://x/epg', epgUrls: [], autoEpgDisabled: false, fetchedAt: null,
}
const cache: EpgCacheEntry = {
  index: {
    'a.tv': [{ title: 'Now A', start: now - 10 * 60_000, stop: now + 20 * 60_000 }],
    'b.tv': [{ title: 'Now B', start: now - 5 * 60_000, stop: now + 40 * 60_000 }],
  },
  fetchedAt: now, sources: ['http://x/epg'],
}
const keyOf = (name: string) => channelKey({ name, url: `http://x/${name}` })

afterEach(() => { cleanup(); vi.useRealTimers() })
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [keyOf('A')])
  seedLiveTvIndex({ cache })
  setTvSettings({ hubLayout: 'experience' })
})

const mount = async () => {
  const navigations: Record<string, string>[] = []
  const propsFor = (params: Record<string, string>) => ({ pageId: 'live-tv-browse', params, onNavigate, onOpenDetails: () => {} }) as unknown as ComponentProps<typeof LiveTvTvShell>
  function onNavigate(to: { params: Record<string, string> }) {
    navigations.push(to.params)
    out.rerender(<LiveTvTvShell {...propsFor(to.params)} />)
  }
  const out = render(<LiveTvTvShell {...propsFor({})} />)
  await flushLiveTvIndex()
  return { navigations }
}
const press = (key: string) => act(() => { fireEvent.keyDown(document.activeElement ?? document.body, { key }) })
const focusInit = () => act(() => { document.querySelector<HTMLElement>('[data-init]')!.focus() })

describe('HubExperience', () => {
  it('väljs av inställningen; initial fokus = heronas primärknapp, exakt en [data-init]', async () => {
    await mount()
    expect(screen.getByTestId('hub-experience')).toBeInTheDocument()
    expect(screen.queryByTestId('hub-classic')).not.toBeInTheDocument()
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
    expect(document.querySelector('[data-init]')).toBe(screen.getByTestId('xp-hero-btn-0'))
    expect(screen.getByTestId('xp-hero-buttons')).toBeInTheDocument()
    expect(screen.queryByTestId('xp-legend')).not.toBeInTheDocument()
  })

  it('▼▼ når raderna; tangentlegenden ersätter knapparna, Bakåt tar fokus tillbaka till heron', async () => {
    await mount()
    focusInit()
    press('ArrowDown')
    expect(document.activeElement?.getAttribute('data-xp')).toMatch(/^chip-/)
    press('ArrowDown')
    expect(document.activeElement?.getAttribute('data-xp')).toBe('r0-0')
    expect(screen.queryByTestId('xp-hero-buttons')).not.toBeInTheDocument()
    expect(screen.getByTestId('xp-legend')).toHaveTextContent('Hold OK')
    act(() => { fireEvent.keyDown(window, { key: 'Backspace' }) })
    expect(document.activeElement).toBe(screen.getByTestId('xp-hero-btn-0'))
    expect(screen.getByTestId('xp-hero-buttons')).toBeInTheDocument()
  })

  it('tomma rader utelämnas (ingen historik, inga repriser → ingen Fortsätt titta)', async () => {
    await mount()
    expect(screen.queryByTestId('xp-row-continue')).not.toBeInTheDocument()
    expect(screen.getByTestId('xp-row-onNow')).toBeInTheDocument()
    expect(screen.getByTestId('xp-row-yours')).toBeInTheDocument()
    expect(screen.getByTestId('xp-row-explore')).toBeInTheDocument()
  })

  it('OK på ett Utforska-kort väljer kategorins chip (kategoriläget) i stället för att öppna guiden', async () => {
    const { navigations } = await mount()
    const card = within(screen.getByTestId('xp-row-explore')).getAllByTestId('xp-card').find((el) => el.textContent?.includes('News'))!
    fireEvent.click(card)
    expect(navigations).toEqual([])
    expect(screen.getByTestId('xp-chip-News').getAttribute('data-selected')).toBe('1')
    expect(within(screen.getByTestId('xp-grid')).getAllByTestId('xp-card')).toHaveLength(1)
  })

  it('mus: första klicket fokuserar, andra aktiverar', async () => {
    await mount()
    const card = within(screen.getByTestId('xp-row-onNow')).getAllByTestId('xp-card')[0]!
    fireEvent.pointerDown(card)
    fireEvent.click(card)
    expect(document.activeElement).toBe(card)
    expect(screen.queryByTestId('player')).not.toBeInTheDocument()
    fireEvent.pointerDown(card)
    fireEvent.click(card)
    expect(await screen.findByTestId('player')).toBeInTheDocument()
  })

  it('heron följer det fokuserade kortet efter 300 ms', async () => {
    await mount()
    const cards = within(screen.getByTestId('xp-row-onNow')).getAllByTestId('xp-card')
    const b = cards.find((el) => el.textContent?.includes('Now B'))!
    vi.useFakeTimers()
    act(() => { b.focus() })
    expect(screen.getByTestId('xp-hero-title')).not.toHaveTextContent('Now B')
    act(() => { vi.advanceTimersByTime(320) })
    expect(screen.getByTestId('xp-hero-title')).toHaveTextContent('Now B')
  })

  it('ingen chip är vald från början och hemraderna visas (Jerry 2026-10-30)', async () => {
    await mount()
    expect(document.querySelectorAll('[data-testid^="xp-chip-"][data-selected="1"]')).toHaveLength(0)
    expect(screen.getByTestId('xp-row-yours')).toBeInTheDocument()
    expect(screen.getByTestId('xp-row-explore')).toBeInTheDocument()
    expect(screen.queryByTestId('xp-grid')).not.toBeInTheDocument()
  })

  it('chip Sport: Sänds nu filtrerad + rutnät med kategorins kanaler; samma chip igen = hemraderna', async () => {
    await mount()
    expect(within(screen.getByTestId('xp-row-onNow')).getAllByTestId('xp-card')).toHaveLength(3)
    fireEvent.click(screen.getByTestId('xp-chip-Sport'))
    expect(screen.getByTestId('xp-chip-Sport').getAttribute('data-selected')).toBe('1')
    expect(document.querySelectorAll('[data-selected="1"]')).toHaveLength(1)
    expect(within(screen.getByTestId('xp-row-onNow')).getAllByTestId('xp-card')).toHaveLength(2)
    expect(within(screen.getByTestId('xp-grid')).getAllByTestId('xp-card')).toHaveLength(2)
    expect(screen.queryByTestId('xp-row-yours')).not.toBeInTheDocument()
    expect(screen.queryByTestId('xp-row-explore')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('xp-chip-Sport'))
    expect(screen.queryByTestId('xp-grid')).not.toBeInTheDocument()
    expect(screen.getByTestId('xp-row-yours')).toBeInTheDocument()
    expect(screen.getByTestId('xp-chip-Sport').hasAttribute('data-selected')).toBe(false)
  })

  it('chip Alla visar alla kanaler i rutnätet', async () => {
    await mount()
    fireEvent.click(screen.getByTestId('xp-chip-all'))
    expect(screen.getByTestId('xp-chip-all').getAttribute('data-selected')).toBe('1')
    expect(within(screen.getByTestId('xp-grid')).getAllByTestId('xp-card')).toHaveLength(3)
  })

  it('Bakåt: raderna → chippen, chippen med vald chip → hemraderna, sedan heron', async () => {
    await mount()
    focusInit()
    press('ArrowDown')
    press('ArrowRight'); press('ArrowRight')
    expect(document.activeElement).toBe(screen.getByTestId('xp-chip-Sport'))
    act(() => { fireEvent.keyDown(document.activeElement!, { key: 'Enter' }) })
    expect(screen.getByTestId('xp-chip-Sport').getAttribute('data-selected')).toBe('1')
    press('ArrowDown'); press('ArrowDown')
    expect(within(screen.getByTestId('xp-grid')).getAllByTestId('xp-card')).toContain(document.activeElement)
    act(() => { fireEvent.keyDown(window, { key: 'Backspace' }) })
    expect(document.activeElement).toBe(screen.getByTestId('xp-chip-Sport'))
    expect(screen.getByTestId('xp-grid')).toBeInTheDocument()
    act(() => { fireEvent.keyDown(window, { key: 'Backspace' }) })
    expect(screen.queryByTestId('xp-grid')).not.toBeInTheDocument()
    expect(screen.getByTestId('xp-chip-Sport').hasAttribute('data-selected')).toBe(false)
    expect(document.activeElement).toBe(screen.getByTestId('xp-chip-Sport'))
    act(() => { fireEvent.keyDown(window, { key: 'Backspace' }) })
    expect(document.activeElement).toBe(screen.getByTestId('xp-hero-btn-0'))
  })

  it('Visa fler lägger till 60 kort i rutnätet; stora kategorier monterar bara de visade', async () => {
    __setTvModeForTests(false)
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ ...list, channels: [...(list.channels ?? []), ...Array.from({ length: 130 }, (_, i) => ch(`M${i}`, 'Many'))] }])
    seedLiveTvIndex({ cache })
    await mount()
    fireEvent.click(screen.getByTestId('xp-chip-Many'))
    const cards = () => within(screen.getByTestId('xp-grid')).getAllByTestId('xp-card')
    expect(cards().filter((c) => c.getAttribute('data-kind') === 'live')).toHaveLength(60)
    const more = cards().at(-1)!
    expect(more.getAttribute('data-kind')).toBe('more')
    fireEvent.click(more)
    expect(cards().filter((c) => c.getAttribute('data-kind') === 'live')).toHaveLength(120)
    fireEvent.click(cards().at(-1)!)
    expect(cards().filter((c) => c.getAttribute('data-kind') === 'live')).toHaveLength(130)
    expect(cards().some((c) => c.getAttribute('data-kind') === 'more')).toBe(false)
  })

  it('rutnätet: fem kort per rad (Jerry 2026-10-30: "för många per rad") — fast kolumnantal, en reducerrad per synlig rad', async () => {
    __setTvModeForTests(false)
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ ...list, channels: [...(list.channels ?? []), ...Array.from({ length: 12 }, (_, i) => ch(`M${i}`, 'Many'))] }])
    seedLiveTvIndex({ cache })
    await mount()
    fireEvent.click(screen.getByTestId('xp-chip-Many'))
    const rows = within(screen.getByTestId('xp-grid')).getAllByTestId('xp-row-grid')
    expect(rows.map((r) => within(r).getAllByTestId('xp-card').length)).toEqual([5, 5, 2])
    const gridEl = within(rows[0]!).getAllByTestId('xp-card')[0]!.parentElement as HTMLElement
    expect(gridEl.style.gridTemplateColumns).toBe('repeat(5, minmax(0, 1fr))')
  })

  it('TV: ▲▼ mellan rutnätets rader behåller kolumnen', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ ...list, channels: [...(list.channels ?? []), ...Array.from({ length: 12 }, (_, i) => ch(`M${i}`, 'Many'))] }])
    seedLiveTvIndex({ cache })
    await mount()
    act(() => { screen.getByTestId('xp-chip-Many').focus() })
    fireEvent.click(screen.getByTestId('xp-chip-Many'))
    press('ArrowDown')
    expect(document.activeElement?.getAttribute('data-xp')).toBe('r0-0')
    press('ArrowDown')
    expect(document.activeElement?.getAttribute('data-xp')).toBe('r1-0')
    press('ArrowRight'); press('ArrowRight'); press('ArrowRight')
    press('ArrowDown')
    expect(document.activeElement?.getAttribute('data-xp')).toBe('r2-3')
    press('ArrowDown')
    expect(document.activeElement?.getAttribute('data-xp')).toBe('r3-1')
    press('ArrowUp'); press('ArrowUp'); press('ArrowUp')
    expect(document.activeElement?.getAttribute('data-xp')).toBe('r0-0')
  })

  it('utanför TV-läge: ingen tangentlegend och inga OK-texter', async () => {
    __setTvModeForTests(false)
    await mount()
    const card = within(screen.getByTestId('xp-row-onNow')).getAllByTestId('xp-card')[0]!
    act(() => { card.focus() })
    expect(screen.queryByTestId('xp-legend')).not.toBeInTheDocument()
    expect(screen.queryByText(/OK =/)).not.toBeInTheDocument()
    expect(screen.queryByText('Hold OK')).not.toBeInTheDocument()
  })
  it('layoutbyte medan Kanaler visas byter vy och sätter layoutens startfokus', async () => {
    await mount()
    await act(async () => { setTvSettings({ hubLayout: 'classic' }) })
    expect(screen.getByTestId('hub-classic')).toBeInTheDocument()
    await vi.waitFor(() => expect(document.activeElement?.hasAttribute('data-init')).toBe(true))
    expect(screen.getByTestId('hub-classic').contains(document.activeElement)).toBe(true)
  })
  it('Bakåt med fokus i rälsen tas inte av vyns lager (raderna lämnade, fokus utanför vyn)', async () => {
    await mount()
    focusInit()
    press('ArrowDown'); press('ArrowDown')
    const rail = screen.getByTestId('rail-guide')
    act(() => { rail.focus() })
    act(() => { fireEvent.keyDown(window, { key: 'Escape' }) })
    expect(screen.getByTestId('hub-experience').contains(document.activeElement)).toBe(false)
  })
  it('sifferzappen fungerar i raderna ("nummer = zappa direkt")', async () => {
    await mount()
    focusInit()
    press('ArrowDown'); press('ArrowDown')
    vi.useFakeTimers()
    act(() => { fireEvent.keyDown(window, { key: '2' }) })
    act(() => { vi.advanceTimersByTime(1500) })
    vi.useRealTimers()
    await vi.waitFor(() => expect(screen.getByTestId('player')).toHaveTextContent('B'))
  })
  it('försvinner det fokuserade kortet faller fokus inte till body — vyn tar tillbaka det', async () => {
    await mount()
    focusInit()
    press('ArrowDown'); press('ArrowDown')
    const card = document.activeElement as HTMLElement
    expect(card.hasAttribute('data-xp')).toBe(true)
    // Noden försvinner: blur utan mottagare och fokus på body (som när React tar bort den).
    act(() => { card.blur() })
    // Blur ritar om vyn, och ritningen tar tillbaka fokus till zonens station.
    expect((document.activeElement as HTMLElement).hasAttribute('data-xp')).toBe(true)
  })
  it('skrivbord: raderna scrollar som appens hemrader — inbyggd rullning, inga transformer, klick aktiverar', async () => {
    __setTvModeForTests(false)
    await mount()
    expect(screen.getByTestId('xp-rows-viewport').style.overflowY).toBe('auto')
    const track = screen.getByTestId('xp-rows-track')
    expect(track.style.transform).toBe('')
    for (const strip of screen.getAllByTestId('xp-row-strip')) {
      expect(strip.style.overflowX).toBe('auto')
      expect(strip.style.transform).toBe('')
    }
    // Hovring (musfokus) flyttar ingenting.
    const cards = screen.getAllByTestId('xp-card')
    act(() => { cards[cards.length - 1]!.focus() })
    expect(track.style.transform).toBe('')
    const live = cards.find((c) => c.getAttribute('data-kind') === 'live')!
    act(() => { fireEvent.pointerDown(live); fireEvent.click(live) })
    await vi.waitFor(() => expect(screen.getByTestId('player')).toBeInTheDocument())
  })
  it('TV: stegvisa rader enligt handoffen (fokuserad rad överst)', async () => {
    await mount()
    focusInit()
    const track = screen.getByTestId('xp-rows-track')
    press('ArrowDown'); press('ArrowDown'); press('ArrowDown')
    expect(track.style.transform).toMatch(/translateY\(-[1-9]/)
  })
  it('bakgrunden är den gemensamma neutrala gradienten även när heron visar en kanal med förhandsruta', async () => {
    await mount()
    expect(screen.getByTestId('xp-hero-tile')).toBeInTheDocument()
    expect(screen.getByTestId('xp-ambient').getAttribute('data-bg')).toBe(v2Ambient('slate'))
  })
  it('herorubriken står på en rad (kortas med …) i 60 px', async () => {
    await mount()
    const title = screen.getByTestId('xp-hero-title')
    expect(title.style.whiteSpace).toBe('nowrap')
    expect(title.style.textOverflow).toBe('ellipsis')
    expect(title.style.fontSize).toBe('60px')
  })
  it('heronas förhandsruta är 600×338 och slutar ovanför chipsen (520 px)', async () => {
    await mount()
    const tile = screen.getByTestId('xp-hero-tile')
    expect(tile.style.width).toBe('600px')
    expect(tile.style.height).toBe('338px')
    expect(parseInt(tile.style.top) + 338).toBeLessThan(520)
  })
  it('heronas reservruta: logoplattan är 380×190 (Jerry 2026-10-30: "fyll ut mitten lite mer")', async () => {
    setTvSettings({ hubLayout: 'experience', previewEnabled: false })
    await mount()
    const plate = within(screen.getByTestId('xp-hero-tile')).getByTestId('logo-plate')
    expect(plate.style.width).toBe('380px')
    expect(plate.style.height).toBe('190px')
  })
  it('Dina kanaler: mörk kortyta, loggan utan platta (bar bild med rundade hörn) inom en jämn luft på 11 px, numret som bricka uppe till vänster', async () => {
    await mount()
    const face = within(screen.getByTestId('xp-row-yours')).getAllByTestId('xp-yours-face')[0]!
    expect(face.getAttribute('data-surface')).toBe('dark')
    const plate = within(face).getByTestId('logo-plate')
    expect(plate.getAttribute('data-bare')).toBe('1')
    expect(plate.style.background).toBe('')
    expect(plate.style.width).toBe('228px')
    expect(plate.style.height).toBe('138px')
    expect(plate.style.left).toBe('11px')
    expect(plate.style.top).toBe('11px')
    const number = within(face).getByTestId('xp-yours-number')
    expect(number).toHaveTextContent('1')
    expect(number.style.color).not.toBe('#6b7080')
  })
  it('primärknappen i heron följer appens accent (vit text)', async () => {
    await mount()
    const btn = screen.getByTestId('xp-hero-btn-0')
    expect(btn.getAttribute('data-accent')).toBe('1')
    expect(btn.style.color).toMatch(/^(#fff|rgb\(255, 255, 255\))$/)
    if (btn.style.background) expect(btn.style.background).toContain('accent-500')
    expect(TV.acc).toContain('accent-500')
  })
  it('"…"-knappen hamnar nere till höger på kort vars övre högra hörn redan är upptaget (klocka, tagg, logo)', async () => {
    __setTvModeForTests(false)
    await mount()
    for (const card of within(screen.getByTestId('xp-row-onNow')).getAllByTestId('xp-card')) expect(card.getAttribute('data-hold-corner')).toBe('br')
    for (const card of within(screen.getByTestId('xp-row-yours')).getAllByTestId('xp-card')) expect(card.getAttribute('data-hold-corner')).toBe('tr')
  })
  it('Sänds nu i hemläget hoppar över kanalerna i Fortsätt titta', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'channel_history_v1', [{ name: 'B', url: 'http://x/B', group: 'Sport', watchedAt: now - 60_000 }])
    await mount()
    expect(within(screen.getByTestId('xp-row-continue')).getAllByTestId('xp-card')[0]).toHaveTextContent('Now B')
    const names = within(screen.getByTestId('xp-row-onNow')).getAllByTestId('xp-card').map((c) => c.textContent ?? '')
    expect(names.some((n) => n.includes('Now B'))).toBe(false)
    expect(names.length).toBe(2)
  })
  it('Live sport: raden visas efter Sänds nu när en match pågår på en kanal i listan, med matchtiteln', async () => {
    stubSportDays({ [localDayKey(now)]: [fxMatch({ start: now - 30 * 60_000, stop: now + 60 * 60_000, sources: [fxSource('A', { programmeStart: now - 30 * 60_000, programmeStop: now + 60 * 60_000 })] })] })
    await mount()
    const row = await screen.findByTestId('xp-row-sport')
    expect(within(row).getAllByTestId('xp-card')).toHaveLength(1)
    expect(row).toHaveTextContent('AIK - Hammarby')
    const order = Array.from(document.querySelectorAll('section[data-testid^="xp-row-"]')).map((el) => el.getAttribute('data-testid'))
    expect(order.indexOf('xp-row-sport')).toBe(order.indexOf('xp-row-onNow') + 1)
  })
  it('Live sport utelämnas utan pågående matcher', async () => {
    stubSportDays({})
    await mount()
    await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
    expect(screen.queryByTestId('xp-row-sport')).not.toBeInTheDocument()
  })
})
