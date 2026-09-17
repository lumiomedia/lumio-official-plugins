import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { __resetForTests, __setDesktopTauriEnvForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { flushLiveTvIndex, seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import { startOfLocalDay } from '../live-tv-model'
import { formatClock } from '../live-tv-ui'
import { guideWindowStart, nowLinePx } from './epg-grid-geometry'
import { PX_PER_MIN_GRID } from './guide-grid-view'
import { gp } from './guide-view-shared'
import type { EpgCacheEntry } from '../epg/types'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))
import { LiveTvTvShell } from './tv-shell'

/**
 * Grid i den städade guiden (spec §4, handoffen §1, Jerrys feedback):
 * hela dagen i px bakom en fast kanalkolumn, x-scroll i EN yta med sticky
 * tidsaxel, kollapsade tomma rader sist, pagineringsrad under ytan och en
 * permanent detaljpanel till höger. Monteras via skalet i TV-läge med lagrat
 * läge `grid`.
 *
 * `Now A` börjar 45 min före nu — alltså FÖRE fönstrets start (halvtimmen
 * före nu, som ligger 30–60 min bakåt) — och ska klippas till spårets
 * vänsterkant.
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
const px = (value: string) => Number.parseFloat(value)
/** Fönstrets start: halvtimmen före närmast föregående halvtimme. */
const gridStart = guideWindowStart(now) - 30 * 60_000

describe('GuideGridView (TV-läge)', () => {
  it('tidsaxeln har en etikett var 30:e minut från halvtimmen före nu till i morgon 06:00', async () => {
    await mount()
    const labels = screen.getAllByTestId('grid-time-label')
    // Fönstret slutar 06:00 i morgon, så antalet 30-min-etiketter beror på
    // klockslaget: minst 2 × 6 h + 1 = 13 (kl 23:30), som mest ≈ 61 (kl 00:00).
    expect(labels.length).toBeGreaterThanOrEqual(13)
    expect(labels[0]).toHaveTextContent(formatClock(gridStart, 'en-GB'))
    expect(labels[1]).toHaveTextContent(formatClock(gridStart + 30 * 60_000, 'en-GB'))
    expect(Number(labels[labels.length - 1].getAttribute('data-ms'))).toBeLessThan(startOfLocalDay(now, 1) + 6 * 3_600_000)
    for (const label of labels) expect(px(label.style.width)).toBe(30 * PX_PER_MIN_GRID)
  })

  it('nu-linjen skrivs i px från fönstrets start, 30–60 min in', async () => {
    await mount()
    const line = screen.getByTestId('grid-now-line')
    expect(line.style.left.endsWith('px')).toBe(true)
    // Modellens nu är en bråkdel av en sekund efter testets — långt under en minut.
    expect(Math.abs(px(line.style.left) - nowLinePx(now, gridStart, PX_PER_MIN_GRID))).toBeLessThan(PX_PER_MIN_GRID)
    expect(px(line.style.left)).toBeGreaterThanOrEqual(30 * PX_PER_MIN_GRID)
    expect(px(line.style.left)).toBeLessThanOrEqual(60 * PX_PER_MIN_GRID)
  })

  it('kanalkolumnen är sticky i varje rad och i tidsaxelns hörn', async () => {
    await mount()
    for (const cell of screen.getAllByTestId('grid-channel')) {
      expect(cell.style.position).toBe('sticky')
      expect(cell.style.left).toBe('0px')
    }
    const corner = screen.getByTestId('grid-time-axis').firstElementChild as HTMLElement
    expect(corner.style.position).toBe('sticky')
    expect(screen.getByTestId('grid-time-axis').style.position).toBe('sticky')
    expect(screen.getByTestId('grid-scroll').contains(screen.getByTestId('grid-time-axis'))).toBe(true)
    // Tomma raders cell spänner spåret och är INTE sticky.
    expect(screen.getAllByTestId('grid-empty-cell')[0].style.position).not.toBe('sticky')
  })

  it('scrollar så nu-linjen landar strax intill kanalkolumnen när raderna kommit', async () => {
    await mount()
    const nowLeft = px(screen.getByTestId('grid-now-line').style.left)
    expect(screen.getByTestId('grid-scroll').scrollLeft).toBeCloseTo(Math.max(0, nowLeft - gp(40)), 3)
  })

  it('Nu-knappen scrollar tillbaka till nu-linjen även när fönstret redan står på dagens halvtimme', async () => {
    await mount()
    const scroll = screen.getByTestId('grid-scroll')
    const expected = scroll.scrollLeft
    scroll.scrollLeft = expected + 3000
    fireEvent.click(screen.getByTestId('guide-now'))
    expect(scroll.scrollLeft).toBeCloseTo(expected, 3)
  })

  it('ett block som började före fönstret klipps till vänsterkanten och blocken skrivs i px', async () => {
    await mount()
    const nowBlock = blockByTitle('Now A')
    // Fönstret börjar 30 min före föregående halvtimme; "Now A" startar
    // now−45 min och klipps bara när klockan är < 15 min in i halvtimmen.
    // Annars ligger blocket helt i fönstret — då är left > 0 och det är rätt.
    const minuteInHalfHour = Math.floor(now / 60_000) % 30
    if (minuteInHalfHour < 15) expect(nowBlock.style.left).toBe('0px')
    else expect(Number.parseFloat(nowBlock.style.left)).toBeGreaterThan(0)
    expect(nowBlock.style.width.endsWith('px')).toBe(true)
    expect(nowBlock).toHaveAttribute('data-live')
    if (minuteInHalfHour < 15) expect(nowBlock).toHaveAttribute('title', expect.stringContaining('…–'))
    // 30 min = 30 × PX_PER_MIN_GRID px, tillräckligt för titel + tid.
    const next = blockByTitle('Next A')
    expect(px(next.style.width)).toBeCloseTo(30 * PX_PER_MIN_GRID, 1)
    expect(next).toHaveAttribute('data-shape', 'full')
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

  it('Imorgon flyttar fönstret till 06:00–06:00 nästa dag', async () => {
    await mount()
    fireEvent.click(within(screen.getByTestId('guide-control-row')).getByText('Tomorrow'))
    await flushLiveTvIndex()
    const labels = screen.getAllByTestId('grid-time-label')
    expect(labels).toHaveLength(48)
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
