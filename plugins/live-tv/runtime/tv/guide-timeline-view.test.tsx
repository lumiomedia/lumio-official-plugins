import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { __resetForTests, __setDesktopTauriEnvForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { flushLiveTvIndex, seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import { startOfLocalDay } from '../live-tv-model'
import { formatClock } from '../live-tv-ui'
import { guideWindowStart, nowLinePx } from './epg-grid-geometry'
import { PX_PER_MIN_GRID } from './guide-grid-view'
import { timelinePxPerMin } from './guide-timeline-view'
import { getGuideMode, getTvSettings, setTvSettings } from './tv-settings-store'
import type { EpgCacheEntry } from '../epg/types'
import { gp } from './guide-view-shared'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))
import { LiveTvTvShell } from './tv-shell'

/**
 * Timeline i den städade guiden (spec §4, handoffen §3): fast kanalkolumn,
 * EN scrollyta med sticky tidsaxel, fönstret från zoomens start till i
 * morgon 06:00 med zoomen som täthet (px/min), rader 40 px, block utan tid,
 * korta block som staplar, sammanslagning bara vid `day`, scroll till nu,
 * och klick/OK i en rad öppnar Grid vid den tidpunkten. Monteras via skalet
 * med lagrat läge `timeline`.
 *
 * Tablån läggs på FASTA klockslag i dagens fönster (14:00–16:20) så testet
 * inte beror på när det körs: `Lone` (10 min) står ensam mellan två långa
 * block och ska bli en stapel utan text; `S1`+`S2` (10 + 15 min) angränsar
 * och ska slås ihop till `S1 · S2` (25 min, över 20-minuterströskeln) vid
 * `day`.
 */
const now = Date.now()
const dayStart = startOfLocalDay(now) + 6 * 3_600_000
/**
 * Grid visar hela dagen och scrollar till begärd tid (Nu när halvtimmen är
 * dagens, annars den klickade), `gp(40)` före, när innehållet kommit —
 * samma formel som vyn. Fönstret börjar halvtimmen före nu i dag, 06:00
 * i morgon.
 */
const expectGridScrolledTo = async (targetMs: number, dayOffset: 0 | 1 = 0) => {
  await flushLiveTvIndex()
  const nowMs = Date.now()
  const gridStart = dayOffset === 1 ? startOfLocalDay(nowMs, 1) + 6 * 3_600_000 : guideWindowStart(nowMs) - 30 * 60_000
  const target = targetMs === guideWindowStart(nowMs) ? nowMs : targetMs
  expect(screen.getByTestId('grid-scroll').scrollLeft).toBeCloseTo(Math.max(0, nowLinePx(target, gridStart, PX_PER_MIN_GRID) - gp(40)), 0)
}
const at = (hours: number, minutes = 0) => dayStart + (hours - 6) * 3_600_000 + minutes * 60_000
const pxDay = timelinePxPerMin('day')
/** Fönstrets slut är alltid i morgon 06:00, oavsett zoom. */
const windowEnd = startOfLocalDay(now, 1) + 6 * 3_600_000
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
      { title: 'S2', start: at(16, 10), stop: at(16, 25) },
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
  it('day ger tolv axel-etiketter 06…04 i 2-timmarsspalter, steg × px/min breda, i en sticky axel', async () => {
    await mount()
    const labels = screen.getAllByTestId('timeline-time-label')
    expect(labels).toHaveLength(12)
    expect(labels[0]).toHaveTextContent(formatClock(at(6), 'en-GB'))
    expect(labels[11]).toHaveTextContent(formatClock(windowEnd - 2 * 3_600_000, 'en-GB'))
    expect(Number.parseFloat(labels[0].style.width)).toBeCloseTo(120 * pxDay, 5)
    const axis = screen.getByTestId('timeline-time-axis')
    expect(axis.style.position).toBe('sticky')
    expect(axis.style.top).toBe('0px')
    // Axeln ligger INUTI scrollytan så den följer med i x; fotraden utanför.
    expect(screen.getByTestId('timeline-scroll')).toContainElement(axis)
    expect(screen.getByTestId('timeline-scroll')).not.toContainElement(screen.getByTestId('timeline-footer'))
  })

  it('rader är 40 px höga, blocken skrivs i px, kanalcellen är sticky och första raden bär startstationen', async () => {
    await mount()
    const rows = screen.getAllByTestId('timeline-row')
    expect(rows).toHaveLength(1)
    expect(rows[0].style.height).toBe(`${gp(40)}px`)
    expect(rows[0]).toHaveAttribute('data-init')
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
    const cell = within(rows[0]).getByTestId('timeline-channel')
    expect(cell.style.position).toBe('sticky')
    expect(cell.style.left).toBe('0px')
    const long = blockByTitle('Long')
    // 60 min × px/min vid day; vänsterkanten 8 h in från 06:00.
    expect(long?.style.width.endsWith('px')).toBe(true)
    expect(Number.parseFloat(long!.style.width)).toBeCloseTo(60 * pxDay, 5)
    expect(Number.parseFloat(long!.style.left)).toBeCloseTo(8 * 60 * pxDay, 5)
    expect(long).toHaveTextContent('Long')
    // Spåret spänner hela fönstret 06 → 06.
    expect(Number.parseFloat(within(rows[0]).getByTestId('timeline-track').style.width)).toBeCloseTo(((windowEnd - at(6)) / 60_000) * pxDay, 5)
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
    expect(blockByTitle('S1 · S2')).toBeUndefined()
  })

  it('zoomsegmentet skriver timelineZoom och 2h ger halvtimmesetiketter från halvtimmen före nu', async () => {
    await mount()
    fireEvent.click(screen.getByText('2 h'))
    expect(getTvSettings().timelineZoom).toBe('2h')
    // Nytt fönster = ny tablåhämtning; axeln ligger i scrollytan som är tom tills raderna kommit.
    await flushLiveTvIndex()
    const labels = screen.getAllByTestId('timeline-time-label')
    expect(labels[0]).toHaveTextContent(formatClock(guideWindowStart(now) - 30 * 60_000, 'en-GB'))
    expect(Number.parseFloat(labels[0].style.width)).toBeCloseTo(30 * timelinePxPerMin('2h'), 5)
  })

  it('kanaler utan tablå kollapsar till en cell sist, och fotraden bär hjälptexten', async () => {
    await mount()
    const row = screen.getAllByTestId('timeline-row')[0]
    const empty = screen.getAllByTestId('timeline-empty-row')
    expect(empty).toHaveLength(2)
    for (const e of empty) {
      expect(e.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
      expect(e.style.height).toBe(`${gp(40)}px`)
      expect(e).toHaveTextContent('No guide for this channel · broadcasting live')
    }
    const footer = screen.getByTestId('timeline-footer')
    expect(footer.style.height).toBe(`${gp(48)}px`)
    expect(footer).toHaveTextContent('Click anywhere in a row to open Grid at that time')
    expect(screen.queryByTestId('timeline-show-more')).not.toBeInTheDocument()
  })

  describe('OK-fönstret vid fast systemtid (2h-fönstret måste ligga i den seedade tablån)', () => {
    // 2h-fönstret räknas från live Date.now(), men tablån ovan är fast vid
    // 14:00–16:20. Utan fast systemtid faller testet beroende på när det
    // körs (t.ex. kvällstid ligger "nu" helt utanför fönstret och raden
    // saknas). Klamma klockan till 15:00 samma dag som tablån är seedad.
    const fixedNow = at(15)
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(fixedNow)
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    // 2h börjar halvtimmen före nu (14:30 → nu 30 min in), 6h timmen före (14:00 → 60 min in).
    const nowLeft2h = 30 * timelinePxPerMin('2h')
    const nowLeft6h = 60 * timelinePxPerMin('6h')

    it('2h vid 15:00: fönstret 14:30 → i morgon 06:00 i halvtimmar, nu-linjen i px och scrollen landar gp(40) före nu', async () => {
      setTvSettings({ timelineZoom: '2h' })
      await mount()
      const labels = screen.getAllByTestId('timeline-time-label')
      expect(labels).toHaveLength((windowEnd - at(14, 30)) / (30 * 60_000))
      expect(labels[0]).toHaveTextContent(formatClock(at(14, 30), 'en-GB'))
      const nowLine = screen.getByTestId('timeline-now-line')
      expect(nowLine.style.left.endsWith('px')).toBe(true)
      expect(Number.parseFloat(nowLine.style.left)).toBeCloseTo(nowLeft2h, 5)
      expect(screen.getByTestId('timeline-scroll').scrollLeft).toBeCloseTo(Math.max(0, nowLeft2h - gp(40)), 0)
    })

    it('zoomen är täthet: ett 60-minutersblock är 3× bredare vid 2h än vid 6h, och zoombytet scrollar om till nu', async () => {
      setTvSettings({ timelineZoom: '2h' })
      await mount()
      // `Big` (15:10–16:00, 50 min) ligger helt i båda fönstren, till skillnad från `Long` som klipps vid 14:30.
      const wide = Number.parseFloat(blockByTitle('Big')!.style.width)
      expect(wide).toBeCloseTo(50 * timelinePxPerMin('2h'), 5)
      fireEvent.click(screen.getByText('6 h'))
      await flushLiveTvIndex()
      const narrow = Number.parseFloat(blockByTitle('Big')!.style.width)
      expect(wide / narrow).toBeCloseTo(3, 5)
      expect(screen.getByTestId('timeline-scroll').scrollLeft).toBeCloseTo(Math.max(0, nowLeft6h - gp(40)), 0)
    })

    it('Nu-knappen (nowTick) scrollar tillbaka till nu-linjen', async () => {
      setTvSettings({ timelineZoom: '2h' })
      await mount()
      const scroll = screen.getByTestId('timeline-scroll')
      scroll.scrollLeft = 0
      fireEvent.click(screen.getByTestId('guide-now'))
      await flushLiveTvIndex()
      expect(scroll.scrollLeft).toBeCloseTo(Math.max(0, nowLeft2h - gp(40)), 0)
    })

    it('OK på en rad (2h, nu i fönstret) öppnar Grid med fönstret på nuvarande halvtimme', async () => {
      setTvSettings({ timelineZoom: '2h' })
      await mount()
      // Raden bär håll-OK (glasmenyn), så ett kort OK fyrar vid keyUp.
      const row = screen.getAllByTestId('timeline-row')[0]
      fireEvent.keyDown(row, { key: 'Enter' })
      fireEvent.keyUp(row, { key: 'Enter' })
      expect(getGuideMode()).toBe('grid')
      expect(screen.getByTestId('guide-shell')).toHaveAttribute('data-guide-mode', 'grid')
      await expectGridScrolledTo(guideWindowStart(fixedNow))
    })
  })

  it('håll OK på en rad öppnar glasmenyn för kanalen', async () => {
    await mount()
    const row = screen.getAllByTestId('timeline-row')[0]
    vi.useFakeTimers()
    fireEvent.keyDown(row, { key: 'Enter' })
    vi.advanceTimersByTime(700)
    fireEvent.keyUp(row, { key: 'Enter' })
    vi.useRealTimers()
    expect(await screen.findByTestId('tv-glass-menu')).toBeInTheDocument()
    // Hållet får inte också öppna Grid.
    expect(getGuideMode()).toBe('timeline')
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
    // happy-dom ger nollor — spåret får en fast geometri från x = 100 px.
    track.getBoundingClientRect = () => ({ left: 100, width: 1000, top: 0, right: 1100, bottom: 40, height: 40, x: 100, y: 0, toJSON: () => ({}) })
    // 450 px in i spåret / px-per-min från 06:00 → Grid öppnar den halvtimmen.
    fireEvent.click(row, { clientX: 550 })
    expect(getGuideMode()).toBe('grid')
    const expected = guideWindowStart(at(6) + (450 / pxDay) * 60_000)
    expect(expected).toBeGreaterThan(at(6))
    await expectGridScrolledTo(expected)
  })

  it('Imorgon + klick i spåret öppnar Grid vid den klickade tiden imorgon — inte 06:00', async () => {
    await mount()
    fireEvent.click(screen.getByText('Tomorrow'))
    // Nytt fönster = ny tablåhämtning; imorgon saknar tablå i fixturen, så
    // alla rader blir tomrader — som också är spår.
    await flushLiveTvIndex()
    const cell = within(screen.getAllByTestId('timeline-empty-row')[0]).getByTestId('timeline-empty-cell')
    cell.getBoundingClientRect = () => ({ left: 0, width: 1000, top: 0, right: 1000, bottom: 40, height: 40, x: 0, y: 0, toJSON: () => ({}) })
    // 450 px in i spåret från 06:00 imorgon → Grid öppnar den halvtimmen imorgon.
    fireEvent.click(cell, { clientX: 450 })
    expect(getGuideMode()).toBe('grid')
    const tomorrow06 = startOfLocalDay(now, 1) + 6 * 3_600_000
    await expectGridScrolledTo(guideWindowStart(tomorrow06 + (450 / pxDay) * 60_000), 1)
    expect(screen.getByTestId('guide-day').querySelector('[data-active]')).toHaveTextContent('Tomorrow')
  })

  it('klick i en tom rad öppnar också Grid', async () => {
    await mount()
    const cell = within(screen.getAllByTestId('timeline-empty-row')[0]).getByTestId('timeline-empty-cell')
    cell.getBoundingClientRect = () => ({ left: 0, width: 1000, top: 0, right: 1000, bottom: 40, height: 40, x: 0, y: 0, toJSON: () => ({}) })
    // 0 px = fönstrets start = 06:00.
    fireEvent.click(cell, { clientX: 0 })
    expect(getGuideMode()).toBe('grid')
    await expectGridScrolledTo(at(6))
  })
})
