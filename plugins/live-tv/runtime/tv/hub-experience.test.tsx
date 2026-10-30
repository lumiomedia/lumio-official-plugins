import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { flushLiveTvIndex, seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, channelKey, type LiveTvList } from '../live-tv-data'
import type { EpgCacheEntry } from '../epg/types'
import { setTvSettings } from './tv-settings-store'
import { v2Ambient } from './v2-tokens'

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

  it('OK på ett Utforska-kort öppnar kanalguiden filtrerad på kategorin', async () => {
    const { navigations } = await mount()
    const card = within(screen.getByTestId('xp-row-explore')).getAllByTestId('xp-card').find((el) => el.textContent?.includes('News'))!
    fireEvent.click(card)
    expect(navigations.at(-1)).toEqual({ view: 'guide', group: 'News' })
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

  it('chipfiltret Sport tar bort News-kanalen ur Sänds nu', async () => {
    await mount()
    expect(within(screen.getByTestId('xp-row-onNow')).getAllByTestId('xp-card')).toHaveLength(3)
    fireEvent.click(screen.getByTestId('xp-chip-Sport'))
    expect(within(screen.getByTestId('xp-row-onNow')).getAllByTestId('xp-card')).toHaveLength(2)
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
})
