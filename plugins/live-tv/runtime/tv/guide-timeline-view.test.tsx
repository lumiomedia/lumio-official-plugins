import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { __resetForTests, __setDesktopTauriEnvForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { flushLiveTvIndex, seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import { startOfLocalDay } from '../live-tv-model'
import { formatClock } from '../live-tv-ui'
import { guideWindowStart } from './epg-grid-geometry'
import { getGuideMode, getTvSettings, setTvSettings } from './tv-settings-store'
import type { EpgCacheEntry } from '../epg/types'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))
import { LiveTvTvShell } from './tv-shell'

/**
 * Timeline i den städade guiden (spec §4, handoffen §3): dagsöversikt 06–24
 * i 2-timmarsspalter, rader 40 px, block utan tid, korta block som staplar,
 * sammanslagning bara vid `day`, och klick/OK i en rad öppnar Grid vid den
 * tidpunkten. Monteras via skalet med lagrat läge `timeline`.
 *
 * Tablån läggs på FASTA klockslag i dagens fönster (14:00–16:20) så testet
 * inte beror på när det körs: `Lone` (10 min) står ensam mellan två långa
 * block och ska bli en stapel utan text; `S1`+`S2` (2 × 10 min) angränsar
 * och ska slås ihop till `S1 · S2` vid `day`.
 */
const now = Date.now()
const dayStart = startOfLocalDay(now) + 6 * 3_600_000
const at = (hours: number, minutes = 0) => dayStart + (hours - 6) * 3_600_000 + minutes * 60_000
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
      { title: 'Long', start: at(14), stop: at(15) },
      { title: 'Lone', start: at(15), stop: at(15, 10) },
      { title: 'Big', start: at(15, 10), stop: at(16) },
      { title: 'S1', start: at(16), stop: at(16, 10) },
      { title: 'S2', start: at(16, 10), stop: at(16, 20) },
    ],
  },
  fetchedAt: now,
  sources: ['http://x/epg'],
}

afterEach(() => { cleanup(); __setDesktopTauriEnvForTests(false) })
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_guide_mode_v1', 'timeline')
  seedLiveTvIndex({ cache })
})

const mount = async () => {
  const onNavigate = vi.fn()
  render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'guide' }} onNavigate={onNavigate} onOpenDetails={() => {}} />)
  await flushLiveTvIndex()
  return onNavigate
}

const blockByTitle = (title: string): HTMLElement | undefined =>
  screen.queryAllByTestId('timeline-block').find((el) => el.getAttribute('title')?.startsWith(title))

describe('GuideTimelineView (TV-läge)', () => {
  it('day ger nio axel-etiketter 06…22 i 2-timmarsspalter', async () => {
    await mount()
    const labels = screen.getAllByTestId('timeline-time-label')
    expect(labels).toHaveLength(9)
    expect(labels[0]).toHaveTextContent(formatClock(at(6), 'en-GB'))
    expect(labels[8]).toHaveTextContent(formatClock(at(22), 'en-GB'))
  })

  it('rader är 40 px höga, blocken skrivs i procent och första raden bär startstationen', async () => {
    await mount()
    const rows = screen.getAllByTestId('timeline-row')
    expect(rows).toHaveLength(1)
    expect(rows[0].style.height).toBe('40px')
    expect(rows[0]).toHaveAttribute('data-init')
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
    const long = blockByTitle('Long')
    expect(long?.style.width.endsWith('%')).toBe(true)
    // 60 min av 18 h = 5,56 %.
    expect(Number.parseFloat(long!.style.width)).toBeCloseTo(100 / 18, 1)
    expect(long).toHaveTextContent('Long')
  })

  it('ett ensamt 10-minutersblock renderas som stapel utan text', async () => {
    await mount()
    const lone = blockByTitle('Lone')
    expect(lone).toBeDefined()
    expect(lone).toHaveAttribute('data-shape', 'marker')
    expect(lone).toHaveTextContent('')
  })

  it('två angränsande 10-minutersblock slås ihop till "S1 · S2" vid day, inte vid 6h', async () => {
    await mount()
    expect(blockByTitle('S1 · S2')).toBeDefined()
    expect(blockByTitle('S1 · S2')).toHaveTextContent('S1 · S2')
    expect(blockByTitle('S2')).toBeUndefined()
    // 6h-fönstret ligger runt nu (tidsberoende om blocken syns alls), men
    // ett sammanslaget block får ALDRIG finnas där.
    fireEvent.click(screen.getByText('6 h'))
    await flushLiveTvIndex()
    expect(getTvSettings().timelineZoom).toBe('6h')
    expect(screen.getAllByTestId('timeline-time-label')).toHaveLength(6)
    expect(blockByTitle('S1 · S2')).toBeUndefined()
  })

  it('zoomsegmentet skriver timelineZoom och 2h ger fyra halvtimmesetiketter', async () => {
    await mount()
    fireEvent.click(screen.getByText('2 h'))
    expect(getTvSettings().timelineZoom).toBe('2h')
    const labels = screen.getAllByTestId('timeline-time-label')
    expect(labels).toHaveLength(4)
    expect(labels[0]).toHaveTextContent(formatClock(guideWindowStart(now) - 30 * 60_000, 'en-GB'))
  })

  it('kanaler utan tablå kollapsar till en cell sist, och fotraden bär hjälptexten', async () => {
    await mount()
    const row = screen.getAllByTestId('timeline-row')[0]
    const empty = screen.getAllByTestId('timeline-empty-row')
    expect(empty).toHaveLength(2)
    for (const e of empty) {
      expect(e.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
      expect(e.style.height).toBe('40px')
      expect(e).toHaveTextContent('No guide for this channel · broadcasting live')
    }
    const footer = screen.getByTestId('timeline-footer')
    expect(footer.style.height).toBe('48px')
    expect(footer).toHaveTextContent('Click anywhere in a row to open Grid at that time')
    expect(screen.queryByTestId('timeline-show-more')).not.toBeInTheDocument()
  })

  it('OK på en rad (2h, nu i fönstret) öppnar Grid med fönstret på nuvarande halvtimme', async () => {
    setTvSettings({ timelineZoom: '2h' })
    await mount()
    expect(screen.getByTestId('timeline-now-line').style.left.endsWith('%')).toBe(true)
    fireEvent.keyDown(screen.getAllByTestId('timeline-row')[0], { key: 'Enter' })
    expect(getGuideMode()).toBe('grid')
    expect(screen.getByTestId('guide-shell')).toHaveAttribute('data-guide-mode', 'grid')
    expect(screen.getAllByTestId('grid-time-label')[0]).toHaveTextContent(formatClock(guideWindowStart(now), 'en-GB'))
  })
})

describe('GuideTimelineView (skrivbordsappen, inte TV)', () => {
  beforeEach(() => {
    __setTvModeForTests(false)
    __setDesktopTauriEnvForTests(true)
  })

  it('klick mitt i spåret öppnar Grid vid den klickade tiden, avrundad nedåt till halvtimme', async () => {
    await mount()
    const row = screen.getAllByTestId('timeline-row')[0]
    const track = within(row).getByTestId('timeline-track')
    // happy-dom ger nollor — spåret får en fast geometri: 100…1100 px.
    track.getBoundingClientRect = () => ({ left: 100, width: 1000, top: 0, right: 1100, bottom: 40, height: 40, x: 100, y: 0, toJSON: () => ({}) })
    // 45 % in i 06–24 = 06 + 8,1 h = 14:06 → Grid öppnar 14:00.
    fireEvent.click(row, { clientX: 550 })
    expect(getGuideMode()).toBe('grid')
    expect(screen.getAllByTestId('grid-time-label')[0]).toHaveTextContent(formatClock(at(14), 'en-GB'))
  })

  it('klick i en tom rad öppnar också Grid', async () => {
    await mount()
    const cell = within(screen.getAllByTestId('timeline-empty-row')[0]).getByTestId('timeline-empty-cell')
    cell.getBoundingClientRect = () => ({ left: 0, width: 1000, top: 0, right: 1000, bottom: 40, height: 40, x: 0, y: 0, toJSON: () => ({}) })
    // 0 % = fönstrets start = 06:00.
    fireEvent.click(cell, { clientX: 0 })
    expect(getGuideMode()).toBe('grid')
    expect(screen.getAllByTestId('grid-time-label')[0]).toHaveTextContent(formatClock(at(6), 'en-GB'))
  })
})
