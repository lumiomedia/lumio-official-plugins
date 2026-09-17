import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { __resetForTests, __setDesktopTauriEnvForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { flushLiveTvIndex, seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import { startOfLocalDay } from '../live-tv-model'
import { formatClock } from '../live-tv-ui'
import { guideWindowStart } from './epg-grid-geometry'
import type { EpgCacheEntry } from '../epg/types'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))
import { LiveTvTvShell } from './tv-shell'

/**
 * Grid i den städade guiden (spec §4, handoffen §1): halvtimmesfönster,
 * block i procent, kollapsade tomma rader sist, pagineringsrad under listan
 * och en permanent detaljpanel till höger. Monteras via skalet i TV-läge
 * med lagrat läge `grid`.
 *
 * `Now A` börjar 45 min före nu — alltså FÖRE fönstrets start (som ligger
 * högst 30 min bakåt) — och ska klippas till spårets vänsterkant.
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
      { title: 'Now A', start: now - 45 * 60_000, stop: now + 20 * 60_000, description: 'Beskrivning A' },
      { title: 'Next A', start: now + 20 * 60_000, stop: now + 50 * 60_000 },
    ],
  },
  fetchedAt: now,
  sources: ['http://x/epg'],
}

afterEach(() => { cleanup(); __setDesktopTauriEnvForTests(false); vi.useRealTimers() })
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_guide_mode_v1', 'grid')
  seedLiveTvIndex({ cache })
})

const mount = async () => {
  const onNavigate = vi.fn()
  render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'guide' }} onNavigate={onNavigate} onOpenDetails={() => {}} />)
  await flushLiveTvIndex()
  return onNavigate
}

const blockByTitle = (title: string): HTMLElement => {
  const found = screen.getAllByTestId('grid-block').find((el) => el.getAttribute('title')?.startsWith(title))
  if (!found) throw new Error(`inget block med titeln ${title}`)
  return found
}
const pct = (value: string) => Number.parseFloat(value)

describe('GuideGridView (TV-läge)', () => {
  it('tidsaxeln har sex etiketter från närmast föregående halvtimme', async () => {
    await mount()
    const labels = screen.getAllByTestId('grid-time-label')
    expect(labels).toHaveLength(6)
    const start = guideWindowStart(now)
    expect(labels[0]).toHaveTextContent(formatClock(start, 'en-GB'))
    expect(labels[5]).toHaveTextContent(formatClock(start + 5 * 30 * 60_000, 'en-GB'))
  })

  it('nu-linjen ligger i vänstra fjärdedelen vid mount och skrivs i procent', async () => {
    await mount()
    const line = screen.getByTestId('grid-now-line')
    expect(line.style.left.endsWith('%')).toBe(true)
    expect(pct(line.style.left)).toBeGreaterThanOrEqual(0)
    expect(pct(line.style.left)).toBeLessThan(25)
  })

  it('ett block som började före fönstret klipps till vänsterkanten och blocken skrivs i procent', async () => {
    await mount()
    const nowBlock = blockByTitle('Now A')
    expect(nowBlock.style.left).toBe('0%')
    expect(nowBlock.style.width.endsWith('%')).toBe(true)
    expect(nowBlock).toHaveAttribute('data-live')
    // 30 min av 180 = 16,67 %.
    const next = blockByTitle('Next A')
    expect(pct(next.style.width)).toBeCloseTo(100 / 6, 1)
    expect(next).not.toHaveAttribute('data-live')
  })

  it('kanaler utan tablå kollapsar till en cell EFTER raderna med tablå', async () => {
    await mount()
    const rows = screen.getAllByTestId('grid-row')
    expect(rows).toHaveLength(1)
    const empty = screen.getAllByTestId('grid-empty-row')
    expect(empty).toHaveLength(2)
    for (const row of empty) {
      expect(row.compareDocumentPosition(rows[0]) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
      expect(within(row).getAllByTestId('grid-empty-cell')).toHaveLength(1)
      expect(within(row).queryAllByTestId('grid-block')).toHaveLength(0)
      expect(row).toHaveTextContent('No guide for this channel · broadcasting live')
    }
  })

  it('detaljpanelen finns alltid och följer fokus på ett block', async () => {
    await mount()
    // Skalet fokuserar startstationen (det pågående blocket) vid mount, och
    // på TV är fokus = markering: panelen är fylld från första bildrutan.
    expect(screen.getByTestId('guide-detail-panel')).toBeInTheDocument()
    expect(screen.getByTestId('detail-title')).toHaveTextContent('Now A')
    fireEvent.focus(blockByTitle('Next A'))
    expect(screen.getByTestId('detail-title')).toHaveTextContent('Next A')
    fireEvent.focus(blockByTitle('Now A'))
    expect(screen.getByTestId('detail-title')).toHaveTextContent('Now A')
    expect(screen.getByTestId('detail-description')).toHaveTextContent('Beskrivning A')
  })

  it('fokus på en tom rad markerar kanalen utan program', async () => {
    await mount()
    fireEvent.focus(screen.getAllByTestId('grid-empty-cell')[0])
    expect(screen.getByTestId('detail-channel')).toHaveTextContent('B')
    expect(screen.getByTestId('detail-title')).toHaveTextContent('No programme information')
  })

  it('ingen banner ligger över sista raden: grid-detail saknas och pagineringen kommer efter listan i DOM', async () => {
    await mount()
    expect(screen.queryByTestId('grid-detail')).not.toBeInTheDocument()
    const scroll = screen.getByTestId('grid-scroll')
    expect(scroll).toHaveAttribute('data-scroll')
    const pagination = screen.getByTestId('grid-pagination')
    expect(scroll.compareDocumentPosition(pagination) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(pagination.style.position).not.toBe('absolute')
    expect(pagination).toHaveTextContent('1 of 3 channels have a guide in this category')
    expect(pagination).toHaveTextContent('Channels without a guide are listed last')
    // Tre kanaler ryms i första sidan — ingen Visa fler.
    expect(screen.queryByTestId('grid-show-more')).not.toBeInTheDocument()
  })

  it('exakt en startstation, på det pågående blocket i första raden', async () => {
    await mount()
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
    expect(blockByTitle('Now A')).toHaveAttribute('data-init')
  })

  it('OK på pågående spelar, OK på kommande markerar utan att navigera', async () => {
    const onNavigate = await mount()
    fireEvent.click(blockByTitle('Next A'))
    expect(screen.getByTestId('detail-title')).toHaveTextContent('Next A')
    expect(onNavigate).not.toHaveBeenCalledWith(expect.objectContaining({ params: expect.objectContaining({ view: 'channel' }) }))
    fireEvent.click(blockByTitle('Now A'))
    expect(await screen.findByTestId('player')).toHaveTextContent('A')
  })

  it('håll OK på ett block öppnar glasmenyn med Påminnelse', async () => {
    await mount()
    const block = blockByTitle('Next A')
    vi.useFakeTimers()
    fireEvent.keyDown(block, { key: 'Enter' })
    vi.advanceTimersByTime(700)
    fireEvent.keyUp(block, { key: 'Enter' })
    vi.useRealTimers()
    expect(await screen.findByTestId('tv-glass-menu')).toBeInTheDocument()
    expect(screen.getByText('Remind me')).toBeInTheDocument()
  })

  it('Imorgon flyttar fönstret till 06:00 nästa dag', async () => {
    await mount()
    fireEvent.click(within(screen.getByTestId('guide-control-row')).getByText('Tomorrow'))
    await flushLiveTvIndex()
    const labels = screen.getAllByTestId('grid-time-label')
    expect(labels[0]).toHaveTextContent(formatClock(startOfLocalDay(now, 1) + 6 * 3_600_000, 'en-GB'))
    expect(screen.queryByTestId('grid-now-line')).not.toBeInTheDocument()
  })
})

describe('GuideGridView (skrivbordsappen, inte TV)', () => {
  beforeEach(() => {
    __setTvModeForTests(false)
    __setDesktopTauriEnvForTests(true)
  })

  it('hovring fyller panelen efter 120 ms utan att flytta fokus', async () => {
    await mount()
    const block = blockByTitle('Next A')
    const before = document.activeElement
    vi.useFakeTimers()
    fireEvent.pointerEnter(block)
    expect(screen.getByTestId('guide-detail-panel')).toHaveTextContent('Select a programme to see details')
    act(() => { vi.advanceTimersByTime(119) })
    expect(screen.getByTestId('guide-detail-panel')).toHaveTextContent('Select a programme to see details')
    act(() => { vi.advanceTimersByTime(1) })
    expect(screen.getByTestId('detail-title')).toHaveTextContent('Next A')
    expect(document.activeElement).toBe(before)
  })

  it('en hovring som lämnar blocket före 120 ms markerar inget', async () => {
    await mount()
    const block = blockByTitle('Next A')
    vi.useFakeTimers()
    fireEvent.pointerEnter(block)
    act(() => { vi.advanceTimersByTime(60) })
    fireEvent.pointerLeave(block)
    act(() => { vi.advanceTimersByTime(200) })
    expect(screen.getByTestId('guide-detail-panel')).toHaveTextContent('Select a programme to see details')
  })
})

describe('GuideGridView (tomläge)', () => {
  it('utan kanaler bär tomrutan startstationen, och ingen pagineringsrad ritas', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ ...list, channels: [] }])
    seedLiveTvIndex({ cache: { index: {}, fetchedAt: now, sources: [] } })
    await mount()
    const empty = screen.getByTestId('grid-empty')
    expect(empty).toBeVisible()
    expect(empty).toHaveAttribute('data-init')
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
    expect(screen.queryByTestId('grid-pagination')).not.toBeInTheDocument()
    expect(screen.getByTestId('guide-detail-panel')).toBeInTheDocument()
  })

  it('bara kanaler utan tablå: första tomma raden bär startstationen och tomrutan är dold', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ ...list, channels: [ch('B', 'Sport'), ch('C', 'News')] }])
    seedLiveTvIndex({ cache: { index: {}, fetchedAt: now, sources: [] } })
    await mount()
    expect(screen.getByTestId('grid-empty')).not.toBeVisible()
    expect(screen.getByTestId('grid-empty')).not.toHaveAttribute('data-init')
    const cells = screen.getAllByTestId('grid-empty-cell')
    expect(cells).toHaveLength(2)
    expect(cells[0]).toHaveAttribute('data-init')
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
    expect(screen.getByTestId('grid-pagination')).toHaveTextContent('0 of 2 channels')
  })

  it('Visa 80 fler ligger i pagineringsraden och utökar listan', async () => {
    const many = Array.from({ length: 90 }, (_, i) => ch(`K${i}`, 'Sport'))
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ ...list, channels: [ch('A', 'Sport', 'a.tv'), ...many] }])
    seedLiveTvIndex({ cache })
    await mount()
    expect(screen.getAllByTestId('grid-empty-row')).toHaveLength(79)
    const more = screen.getByTestId('grid-show-more')
    expect(more).toHaveTextContent('Show 80 more')
    expect(screen.getByTestId('grid-pagination').contains(more)).toBe(true)
    fireEvent.click(more)
    await flushLiveTvIndex()
    expect(screen.getAllByTestId('grid-empty-row')).toHaveLength(90)
    expect(screen.queryByTestId('grid-show-more')).not.toBeInTheDocument()
  })
})
