import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { TV_SCENE_BOX_ATTR, TV_SCENE_NARROW_ATTR, TV_SCENE_PHONE_ATTR, __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { seedLiveTvIndex, flushLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import type { EpgCacheEntry } from '../epg/types'
import { PHONE_HIT_MIN_DP, PHONE_TEXT_MIN_DP } from './tv-ui'
import { TvPlayerChrome } from './tv-player-chrome'
import type { LiveTvPlayerTvProps, LiveTvPlayerControls } from './tv-player-types'

/**
 * M-P4, fixrunda 2 (granskningsfynd): golvtestet i `tv-ui-floors.test.tsx`
 * monterar bara varje vys STANDARDLÄGE — det når aldrig spelarkromet
 * (spelaren mockas bort helt där) eller guidens Rutnät-/Spellistläge (bara
 * Nu-läget öppnas). Fixrunda 1 höjde måtten på alla tre ytorna, men INGET
 * test bevakade dem — en framtida ändring hade kunnat sätta tillbaka
 * `dp(52)` på pausknappen utan att sviten märkte det. De här testerna
 * monterar de tre ytorna på RIKTIGT (en spelande kanal, ett faktiskt
 * lägesbyte) och mäter mot samma golv som resten av sviten.
 */

function assertFloors(container: ParentNode) {
  const buttons = [...container.querySelectorAll<HTMLElement>('[role="button"], [role="slider"]')]
  expect(buttons.length).toBeGreaterThan(0)
  for (const el of buttons) {
    const h = Number.parseFloat(getComputedStyle(el).minHeight || '0')
    expect(h, `${el.getAttribute('data-testid') ?? el.tagName} minHeight`).toBeGreaterThanOrEqual(PHONE_HIT_MIN_DP)
  }
  const texts = [...container.querySelectorAll<HTMLElement>('[style*="font-size"]')]
  expect(texts.length).toBeGreaterThan(0)
  for (const el of texts) {
    const size = Number.parseFloat(el.style.fontSize)
    if (Number.isFinite(size)) expect(size, `"${(el.textContent ?? '').slice(0, 30)}" font-size`).toBeGreaterThanOrEqual(PHONE_TEXT_MIN_DP)
  }
}

function makePhoneBox(): HTMLElement {
  const box = document.createElement('div')
  box.setAttribute(TV_SCENE_BOX_ATTR, '1')
  box.setAttribute(TV_SCENE_NARROW_ATTR, '1')
  box.setAttribute(TV_SCENE_PHONE_ATTR, '1')
  document.body.appendChild(box)
  return box
}

// ---------------------------------------------------------------------------
// 1) Spelarkromet, med en spelande kanal (banner, ⋯, ljud/volym/fullskärm).
// ---------------------------------------------------------------------------

describe('Telefonens golv — spelarkromet', () => {
  let box: HTMLElement | null = null
  afterEach(() => { cleanup(); box?.remove(); box = null })
  beforeEach(() => { __setTvModeForTests(false) })

  const now = Date.now()
  const ch = (name: string) => ({ name, logo: null, group: 'Sport', url: `http://x/${name}`, tvgId: null })
  const channels = [ch('A'), ch('B'), ch('C')]
  const nowFor = (c: { name: string }) => (c.name === 'B'
    ? { now: { title: 'GameDay', start: now - 60_000, stop: now + 60_000 }, next: { title: 'Football', start: now + 60_000, stop: now + 120_000 }, later: null }
    : { now: null, next: null, later: null })
  const tv = (overrides: Partial<LiveTvPlayerTvProps> = {}): LiveTvPlayerTvProps => ({
    channelNumber: 2, quality: '4K', favourite: false, bannerHideMs: 4000, neighbours: channels, nowFor,
    nowMs: now, locale: 'en-GB', gateOpen: false, onToggleFavourite: vi.fn(), onOpenChannelDetails: vi.fn(),
    onOpenMultiview: vi.fn(), onOpenGuide: vi.fn(), onAddToMultiview: vi.fn(), onSwitchChannel: vi.fn(), ...overrides,
  })
  const controls: LiveTvPlayerControls = {
    muted: false, volume: 0.6, fullscreen: false, aspectLabel: 'Auto',
    onToggleMute: vi.fn(), onVolume: vi.fn(), onToggleFullscreen: vi.fn(), onCycleAspect: vi.fn(),
  }

  function mount() {
    box = makePhoneBox()
    return render(
      <TvPlayerChrome channel={channels[1]} tv={tv()} controls={controls} paused={false} onTogglePause={() => {}} onClose={() => {}} />,
      { container: box },
    )
  }

  it('banner, ⋯ och pekarkontrollerna renderas med en spelande kanal', () => {
    mount()
    // Beviset på att kromet faktiskt är monterat med riktigt innehåll —
    // inte bara skalet runt det.
    expect(screen.getByText('GameDay')).toBeInTheDocument()
    expect(screen.getByLabelText('More')).toBeInTheDocument()
    expect(screen.getByLabelText('Mute')).toBeInTheDocument()
  })

  it('inget tryckbart element i kromet är lägre än träffytegolvet', () => {
    mount()
    assertFloors(box!)
  })

  it('ingen text i kromet är mindre än teckengolvet', () => {
    mount()
    assertFloors(box!)
  })
})

// ---------------------------------------------------------------------------
// 2) och 3) Guidens Rutnät- och Spellistläge, nådda genom ett RIKTIGT
// lägesbyte (samma klick som tv-guide-grid.test.tsx/tv-guide-playlists.test.tsx
// använder för att öppna dem), inte genom att förmontera default-läget.
// ---------------------------------------------------------------------------

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => null }))
import { LiveTvTvShell } from './tv-shell'

describe('Telefonens golv — guidens rutnätsläge', () => {
  let box: HTMLElement | null = null
  afterEach(() => { cleanup(); box?.remove(); box = null })

  const now = Date.now()
  const ch = (name: string, group: string, tvgId: string | null = null) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId })
  const list: LiveTvList = {
    id: 'l1', name: 'Xtream', channels: [ch('A', 'Sport', 'a.tv'), ch('B', 'Sport'), ch('C', 'News')],
    createdAt: '', urlTvg: 'http://x/epg', epgUrls: [], autoEpgDisabled: false, fetchedAt: null,
  }
  const cache: EpgCacheEntry = {
    index: { 'a.tv': [
      { title: 'Now A', start: now - 10 * 60_000, stop: now + 20 * 60_000 },
      { title: 'Next A', start: now + 20 * 60_000, stop: now + 50 * 60_000 },
    ] },
    fetchedAt: now, sources: ['http://x/epg'],
  }

  beforeEach(() => {
    __resetForTests()
    __setTvModeForTests(false)
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
    writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
    seedLiveTvIndex({ cache })
  })

  async function mountGrid() {
    box = makePhoneBox()
    render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'guide' }} onNavigate={() => {}} onOpenDetails={() => {}} />, { container: box })
    await flushLiveTvIndex()
    // Samma väg som tv-guide-grid.test.tsx: segmentväxeln, inget genvägs-URL-läge.
    fireEvent.click(screen.getByText('Grid'))
    await flushLiveTvIndex()
  }

  it('lägesbytet landar faktiskt i rutnätet', async () => {
    await mountGrid()
    expect(screen.getByTestId('grid-scroll')).toBeInTheDocument()
    expect(screen.getAllByTestId('grid-block').length).toBeGreaterThan(0)
  })

  it('inget tryckbart element i rutnätet är lägre än träffytegolvet', async () => {
    await mountGrid()
    assertFloors(box!)
  })

  it('ingen text i rutnätet är mindre än teckengolvet', async () => {
    await mountGrid()
    assertFloors(box!)
  })
})

describe('Telefonens golv — guidens spellistläge', () => {
  let box: HTMLElement | null = null
  afterEach(() => { cleanup(); box?.remove(); box = null })

  const now = Date.now()
  const ch = (name: string, group: string, tvgId: string | null = null) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId })
  const lists: LiveTvList[] = [
    { id: 'l1', name: 'Xtream', kind: 'm3u', source: 'http://a.tld/list.m3u', url: 'http://a.tld/list.m3u', channels: [ch('A', 'Sport', 'a.tv'), ch('B', 'News')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null } as LiveTvList,
  ]
  const cache: EpgCacheEntry = {
    index: { 'a.tv': [{ title: 'Now A', start: now - 60_000, stop: now + 60_000 }, { title: 'Next A', start: now + 60_000, stop: now + 120_000 }] },
    fetchedAt: now, sources: [],
  }

  beforeEach(() => {
    __resetForTests()
    __setTvModeForTests(false)
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', lists)
    writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
    seedLiveTvIndex({ cache })
  })

  async function mountPlaylists() {
    box = makePhoneBox()
    render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'guide' }} onNavigate={() => {}} onOpenDetails={() => {}} />, { container: box })
    await flushLiveTvIndex()
    fireEvent.click(screen.getByText('Playlists'))
    await flushLiveTvIndex()
  }

  it('lägesbytet landar faktiskt i spellistvyn', async () => {
    await mountPlaylists()
    expect(screen.getByTestId('playlists-column')).toBeInTheDocument()
    expect(screen.getAllByTestId('pl-row').length).toBeGreaterThan(0)
  })

  it('inget tryckbart element i spellistvyn är lägre än träffytegolvet', async () => {
    await mountPlaylists()
    assertFloors(box!)
  })

  it('ingen text i spellistvyn är mindre än teckengolvet', async () => {
    await mountPlaylists()
    assertFloors(box!)
  })
})
