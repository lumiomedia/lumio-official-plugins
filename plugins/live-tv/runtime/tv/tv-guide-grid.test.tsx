import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { flushLiveTvIndex, seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import { getGuideMode } from './tv-settings-store'
import type { EpgCacheEntry } from '../epg/types'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))
import { LiveTvTvShell } from './tv-shell'

/**
 * Fönstret i rutnätet är `alignToHour(nu − 1 h)` … +12 h, så allt här ligger
 * med säkerhet inne i det: ett pågående program, ett kommande, och ett på en
 * enda minut (markörfallet ur skärmdumpen).
 */
const now = Date.now()
const ch = (name: string, group: string, tvgId: string | null = null) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId })
const list: LiveTvList = {
  id: 'l1',
  name: 'Xtream',
  channels: [ch('A', 'Sport', 'a.tv'), ch('B', 'Sport'), ch('C', 'News')],
  createdAt: '',
  urlTvg: 'http://x/epg',
  epgUrls: [],
  autoEpgDisabled: false,
  fetchedAt: null,
}
const cache: EpgCacheEntry = {
  index: {
    'a.tv': [
      { title: 'Now A', start: now - 10 * 60_000, stop: now + 20 * 60_000, description: 'Beskrivning A' },
      { title: 'Blink A', start: now + 20 * 60_000, stop: now + 21 * 60_000 },
      { title: 'Next A', start: now + 21 * 60_000, stop: now + 50 * 60_000 },
    ],
  },
  fetchedAt: now,
  sources: ['http://x/epg'],
}

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  seedLiveTvIndex({ cache })
})

/**
 * Vybytet ägs av VÄRDEN (`go()` ropar `onNavigate`), så skalet byter inte vy
 * av sig självt i ett test — en navigering mäts på `onNavigate`, inte på vad
 * som renderas.
 */
const mount = async () => {
  const onNavigate = vi.fn()
  render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'guide' }} onNavigate={onNavigate} onOpenDetails={() => {}} />)
  await flushLiveTvIndex()
  return onNavigate
}

/** Guiden öppnas i Nu/Sen — rutnätet nås genom segmentväxeln, som testet 1 äger. */
const openGrid = async () => {
  const onNavigate = await mount()
  fireEvent.click(screen.getByText('Grid'))
  await flushLiveTvIndex()
  return onNavigate
}

const blockByTitle = (title: string): HTMLElement => {
  const found = screen.getAllByTestId('grid-block').find((el) => el.getAttribute('title')?.startsWith(title))
  if (!found) throw new Error(`inget block med titeln ${title}`)
  return found
}

describe('TvGuideGrid', () => {
  it('Rutnät finns i segmentväxeln och sparas i live_tv_guide_mode_v1', async () => {
    await mount()
    fireEvent.click(screen.getByText('Grid'))
    await flushLiveTvIndex()
    expect(getGuideMode()).toBe('grid')
    expect(screen.getByTestId('grid-scroll')).toBeInTheDocument()
    // Exakt en startstation, som i alla andra vyer.
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
  })

  it('ett pågående program spelas med OK', async () => {
    await openGrid()
    fireEvent.click(blockByTitle('Now A'))
    expect(await screen.findByTestId('player')).toHaveTextContent('A')
  })

  it('ett kommande program öppnar kanaldetaljen med programmet förvalt', async () => {
    const onNavigate = await openGrid()
    fireEvent.click(blockByTitle('Next A'))
    // `programme` är förvalet kanaldetaljen läser (`tv-channel.tsx:45`) — utan
    // det hade sidan öppnat på det pågående programmet i stället.
    expect(onNavigate).toHaveBeenCalledWith({
      pageId: 'live-tv-browse',
      params: expect.objectContaining({ view: 'channel', name: 'A', programme: String(now + 21 * 60_000) }),
    })
  })

  it('håll OK på ett block öppnar menyn med Påminnelse', async () => {
    await openGrid()
    const block = blockByTitle('Next A')
    vi.useFakeTimers()
    fireEvent.keyDown(block, { key: 'Enter' })
    vi.advanceTimersByTime(700)
    fireEvent.keyUp(block, { key: 'Enter' })
    vi.useRealTimers()
    expect(await screen.findByTestId('tv-glass-menu')).toBeInTheDocument()
    expect(screen.getByText('Remind me')).toBeInTheDocument()
  })

  it('smala block ritas utan text men behåller title', async () => {
    await openGrid()
    // Ett program på EN minut är 4 px brett — under MIN_BLOCK_PX. Det ritas
    // som en markör utan text; verktygstipset är enda vägen till titeln.
    const blink = blockByTitle('Blink A')
    expect(blink).toHaveAttribute('data-shape', 'marker')
    expect(blink.textContent).toBe('')
    expect(blink.getAttribute('title')).toContain('Blink A')
    // Och grannen ligger inte ovanpå den (regressionen ur skärmdumpen).
    const next = blockByTitle('Next A')
    const leftOf = (el: HTMLElement) => Number.parseFloat(el.style.left)
    const widthOf = (el: HTMLElement) => Number.parseFloat(el.style.width)
    expect(leftOf(next)).toBeGreaterThanOrEqual(leftOf(blink) + widthOf(blink) - 0.001)
  })

  it('listan bär data-scroll och tidsspåret bär INTE data-row', async () => {
    await openGrid()
    expect(screen.getByTestId('grid-scroll')).toHaveAttribute('data-scroll')
    // `data-row` hade gjort raden till en sluten ◂▸-grupp: ▸ på radens sista
    // block hade hoppat till nästa rads FÖRSTA block, tolv timmar bakåt i
    // tid. Markören ska stå kvar vid radens slut.
    for (const track of screen.getAllByTestId('grid-track')) expect(track).not.toHaveAttribute('data-row')
    // Chipsraden är fortfarande en egen ◂▸-grupp.
    expect(screen.getByTestId('grid-chip-all').closest('[data-row]')).not.toBeNull()
  })

  it('hovring fyller detaljremsan utan att flytta fokus', async () => {
    await openGrid()
    const block = blockByTitle('Next A')
    const before = document.activeElement
    fireEvent.pointerEnter(block)
    expect(screen.getByTestId('grid-detail')).toHaveTextContent('Next A')
    expect(document.activeElement).toBe(before)
  })

  it('utan tablå visas tomtexten, och startstationen är kategorichipet', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ ...list, channels: [ch('B', 'Sport')] }])
    seedLiveTvIndex({ cache: { index: {}, fetchedAt: now, sources: [] } })
    await openGrid()
    expect(screen.getByTestId('grid-empty')).toBeVisible()
    expect(screen.queryAllByTestId('grid-block')).toHaveLength(0)
    // Tomrutan är text, inte en station: den såg ut som en knapp men gjorde
    // ingenting. Startstationen är första chipet, som alltid är monterat.
    expect(screen.getByTestId('grid-empty')).not.toHaveAttribute('data-f')
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
    expect(screen.getByTestId('grid-chip-all')).toHaveAttribute('data-init')
  })

  it('ett pågående program som svalts av överlapp lämnar ändå en startstation', async () => {
    // `Inner` ligger helt inuti `Outer` och ritas därför aldrig. Härleds
    // `data-init` ur råa programlistan (och inte ur de boxar som faktiskt
    // ritas) pekar attributet på ett block som inte finns — vyn får noll
    // startstationer och fjärrkontrollen låser sig på en full skärm.
    seedLiveTvIndex({
      cache: {
        index: { 'a.tv': [
          { title: 'Inner', start: now - 5 * 60_000, stop: now + 5 * 60_000 },
          { title: 'Outer', start: now - 60 * 60_000, stop: now + 60 * 60_000 },
        ] },
        fetchedAt: now,
        sources: ['http://x/epg'],
      },
    })
    await openGrid()
    const blocks = screen.getAllByTestId('grid-block')
    expect(blocks.map((el) => el.getAttribute('title')?.split(' ')[0])).toEqual(['Outer'])
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
    expect(blocks[0]).toHaveAttribute('data-init')
  })

  it('två program med identisk start ger blocket rätt titel och rätt OK-mål', async () => {
    // A 00–01 och B 00–02 delar vänsterkant. En vy som parar box mot program
    // på `left` hade satt A:s titel, tider och `programme`-parameter på B:s
    // block — fel program i kanaldetaljen, fel påminnelse.
    const start = now + 2 * 60 * 60_000
    seedLiveTvIndex({
      cache: {
        index: { 'a.tv': [
          { title: 'Kort', start, stop: start + 60_000 },
          { title: 'Lang', start, stop: start + 120 * 60_000 },
        ] },
        fetchedAt: now,
        sources: ['http://x/epg'],
      },
    })
    const onNavigate = await openGrid()
    const blocks = screen.getAllByTestId('grid-block')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].getAttribute('title')).toContain('Lang')
    fireEvent.click(blocks[0])
    expect(onNavigate).toHaveBeenCalledWith({
      pageId: 'live-tv-browse',
      params: expect.objectContaining({ view: 'channel', programme: String(start) }),
    })
  })

  it('kanalkolumnen ligger fast på en bred yta', async () => {
    await openGrid()
    expect(screen.getAllByTestId('grid-channel')[0].style.position).toBe('sticky')
  })

  it('kanalkolumnen följer med i sidoscrollen när värden flaggar en smal yta', async () => {
    // Måttet är VÄRDENS: `tvScene()` håller golvet 1280 designpixlar och gör
    // scenen högre i stället för smalare, så fönsterbredden säger ingenting.
    // Lådan bär `data-tv-scene-narrow="1"` under 1024 css-px, och det är den
    // flaggan `useNarrowSurface()` (P1) läser.
    const box = document.createElement('div')
    box.setAttribute('data-tv-scene-box', '1')
    box.setAttribute('data-tv-scene-narrow', '1')
    document.body.appendChild(box)
    try {
      await openGrid()
      expect(screen.getAllByTestId('grid-channel')[0].style.position).toBe('')
    } finally {
      box.remove()
    }
  })

  it('kanalkolumnen är en station per rad och detaljremsan går att markera', async () => {
    await openGrid()
    const channels = screen.getAllByTestId('grid-channel')
    expect(channels.length).toBeGreaterThan(0)
    expect(channels[0]).toHaveAttribute('data-f')
    // Fokus på ett block fyller detaljremsan (som i skrivbordets tablå), och
    // beskrivningstexten är undantagen från `user-select: none` (P2).
    fireEvent.focus(blockByTitle('Now A'))
    const strip = screen.getByTestId('grid-detail')
    expect(strip).toHaveTextContent('Now A')
    expect(strip.querySelector('[data-selectable-text]')).not.toBeNull()
  })

  it('Imorgon byter fönster och Nu tar tillbaka dagens', async () => {
    await openGrid()
    fireEvent.click(screen.getByText('Tomorrow'))
    await flushLiveTvIndex()
    expect(screen.queryAllByTestId('grid-block')).toHaveLength(0)
    fireEvent.click(screen.getByText('Now'))
    await flushLiveTvIndex()
    expect(screen.getAllByTestId('grid-block').length).toBeGreaterThan(0)
  })

  it('kategorichipsen filtrerar raderna', async () => {
    await openGrid()
    expect(screen.getAllByTestId('grid-channel')).toHaveLength(1)
    fireEvent.click(screen.getByTestId('grid-chip-News'))
    await flushLiveTvIndex()
    expect(screen.queryAllByTestId('grid-channel')).toHaveLength(0)
  })
})

describe('TvGuideGrid — kanalkolumnens stationer', () => {
  it('OK på kanalkolumnen öppnar kanaldetaljen utan förvalt program', async () => {
    const onNavigate = await openGrid()
    fireEvent.click(screen.getAllByTestId('grid-channel')[0])
    expect(onNavigate).toHaveBeenCalledWith({
      pageId: 'live-tv-browse',
      params: expect.not.objectContaining({ programme: expect.anything() }),
    })
    expect(onNavigate.mock.calls[0][0].params.view).toBe('channel')
  })
})
