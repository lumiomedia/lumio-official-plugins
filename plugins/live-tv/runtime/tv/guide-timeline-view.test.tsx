import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { __resetForTests, __setDesktopTauriEnvForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { flushLiveTvIndex, seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import { getReminders, toggleReminder } from '../reminders'
import { GUIDE_MODE_KEY } from './tv-settings-store'
import { ROWS_STEP } from './guide-view-shared'
import type { EpgCacheEntry } from '../epg/types'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))
import { LiveTvTvShell } from './tv-shell'

/**
 * Tablå i Kanalguide v2 (handoff "Modes / Tablå"): 2-timmarsfönster med
 * tick var 30:e minut, block placerade i procent ur `epg-grid-geometry`,
 * nu-linjen bara när nu ligger i fönstret, ◂▸ program för program (fönstret
 * följer 30 min i taget), ▲▼ håller tidpunkten. Klockan står fast på 14:45
 * i dag, så fönstret är 14:30–16:30.
 */
const at = (h: number, m: number) => { const d = new Date(); d.setHours(h, m, 0, 0); return d.getTime() }
const NOW = at(14, 45)
const ch = (name: string, group: string, tvgId: string | null = null) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId })
const channelA = ch('A', 'Sport', 'a.tv')
const list: LiveTvList = {
  id: 'l1', name: 'Xtream', channels: [channelA, ch('B', 'Sport', 'b.tv'), ch('C', 'News')],
  createdAt: '', urlTvg: 'http://x/epg', epgUrls: [], autoEpgDisabled: false, fetchedAt: null,
}
const showA = { title: 'Show', start: at(14, 30), stop: at(15, 30) }
const afterA = { title: 'After', start: at(15, 30), stop: at(16, 30) }
const lateA = { title: 'Late', start: at(16, 30), stop: at(17, 30) }
const cache: EpgCacheEntry = {
  index: {
    'a.tv': [showA, afterA, lateA],
    'b.tv': [
      { title: 'Past B', start: at(14, 0), stop: at(14, 40) },
      { title: 'Now B', start: at(14, 40), stop: at(15, 40) },
      { title: 'Eve B', start: at(15, 40), stop: at(17, 0) },
    ],
  },
  fetchedAt: NOW, sources: ['http://x/epg'],
}

afterEach(() => { cleanup(); __setDesktopTauriEnvForTests(false); vi.useRealTimers() })
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  writePluginJson(LIVE_TV_PLUGIN_ID, GUIDE_MODE_KEY, 'tl')
  seedLiveTvIndex({ cache })
})

const mount = async () => {
  const props = { pageId: 'live-tv-browse', params: { view: 'guide' }, onNavigate: () => {}, onOpenDetails: () => {} } as unknown as ComponentProps<typeof LiveTvTvShell>
  render(<LiveTvTvShell {...props} />)
  await flushLiveTvIndex()
  await flushLiveTvIndex()
}
const blockOf = (title: string) => screen.getAllByTestId('tl-block').find((el) => el.textContent?.includes(title))!
const windowStart = () => Number(screen.getByTestId('guide-shell').getAttribute('data-window-start'))

describe('GuideTimelineView (TV-läge)', () => {
  it('fönster 14:30–16:30 med tick var 30:e minut, "◂ tidigare" och en [data-init] på det pågående blocket', async () => {
    await mount()
    expect(screen.getByTestId('guide-timeline-view')).toBeInTheDocument()
    expect(windowStart()).toBe(at(14, 30))
    expect(screen.getAllByTestId('tl-tick')).toHaveLength(4)
    expect(screen.getByTestId('tl-earlier')).toBeInTheDocument()
    const inits = document.querySelectorAll('[data-init]')
    expect(inits).toHaveLength(1)
    expect(inits[0]).toBe(blockOf('Show'))
  })

  it('blocket 14:30–15:30 står på 0 % med bredden 50 %; block utanför fönstret ritas inte', async () => {
    await mount()
    expect(blockOf('Show')).toHaveAttribute('data-left', '0')
    expect(blockOf('Show')).toHaveAttribute('data-width', '50')
    expect(blockOf('After')).toHaveAttribute('data-left', '50')
    expect(screen.queryAllByTestId('tl-block').some((el) => el.textContent?.includes('Late'))).toBe(false)
  })

  it('nu-linjen och klockbrickan finns när nu ligger i fönstret; ticken som krockar med brickan döljs', async () => {
    await mount()
    expect(screen.getByTestId('tl-now-line')).toBeInTheDocument()
    expect(screen.getByTestId('tl-now-badge')).toBeInTheDocument()
    const labels = screen.getAllByTestId('tl-tick').map((el) => el.textContent)
    // 14:30 ligger 15 min från nu (syns), 15:00 också; ingen tick inom 12 min.
    expect(labels.filter((l) => l !== '')).toHaveLength(4)
  })

  it('passerat block har opacitet .6', async () => {
    await mount()
    const past = blockOf('Past B')
    expect(past).toHaveAttribute('data-past')
    expect((past.firstElementChild as HTMLElement).style.opacity).toBe('0.6')
    expect((blockOf('Now B').firstElementChild as HTMLElement).style.opacity).toBe('')
  })

  it('▸ stegar program för program; ▸ på sista synliga blocket flyttar fönstret 30 min och fokuserar nästa program', async () => {
    await mount()
    act(() => { blockOf('Show').focus() })
    fireEvent.keyDown(blockOf('Show'), { key: 'ArrowRight' })
    expect(document.activeElement).toBe(blockOf('After'))
    expect(windowStart()).toBe(at(14, 30))
    fireEvent.keyDown(blockOf('After'), { key: 'ArrowRight' })
    await flushLiveTvIndex()
    expect(windowStart()).toBe(at(15, 0))
    expect(document.activeElement).toBe(blockOf('Late'))
    // Nu (14:45) ligger inte längre i fönstret 15:00–17:00.
    expect(screen.queryByTestId('tl-now-line')).not.toBeInTheDocument()
  })

  it('◂ tillbaka över fönsterkanten flyttar fönstret bakåt; ◂ från första programmet går till kategorierna', async () => {
    await mount()
    act(() => { blockOf('Show').focus() })
    fireEvent.keyDown(blockOf('Show'), { key: 'ArrowRight' })
    fireEvent.keyDown(blockOf('After'), { key: 'ArrowRight' })
    await flushLiveTvIndex()
    expect(windowStart()).toBe(at(15, 0))
    fireEvent.keyDown(blockOf('Late'), { key: 'ArrowLeft' })
    fireEvent.keyDown(blockOf('After'), { key: 'ArrowLeft' })
    await flushLiveTvIndex()
    expect(document.activeElement).toBe(blockOf('Show'))
    expect(windowStart()).toBe(at(14, 30))
    fireEvent.keyDown(blockOf('Show'), { key: 'ArrowLeft' })
    expect(screen.getByTestId('guide-category-column').contains(document.activeElement)).toBe(true)
  })

  it('▲▼ håller tidpunkten: från A "After" (mitt 16:00) landar ▼ på B:s block som täcker 16:00', async () => {
    await mount()
    act(() => { blockOf('After').focus() })
    fireEvent.keyDown(blockOf('After'), { key: 'ArrowDown' })
    expect(document.activeElement).toBe(blockOf('Eve B'))
    fireEvent.keyDown(blockOf('Eve B'), { key: 'ArrowUp' })
    expect(document.activeElement).toBe(blockOf('After'))
    // Tablålös rad: ▼ landar på radens enda cell.
    fireEvent.keyDown(blockOf('After'), { key: 'ArrowDown' })
    fireEvent.keyDown(blockOf('Eve B'), { key: 'ArrowDown' })
    expect(document.activeElement).toBe(screen.getByTestId('tl-empty'))
  })

  it('N efter ett flyttat fönster: tillbaka till nu och fokus på radens pågående program', async () => {
    await mount()
    act(() => { blockOf('Show').focus() })
    fireEvent.keyDown(blockOf('Show'), { key: 'ArrowRight' })
    fireEvent.keyDown(blockOf('After'), { key: 'ArrowRight' })
    await flushLiveTvIndex()
    fireEvent.keyDown(blockOf('Late'), { key: 'n' })
    await flushLiveTvIndex()
    expect(windowStart()).toBe(at(14, 30))
    expect(document.activeElement).toBe(blockOf('Show'))
  })

  it('klocka på block med påminnelse; OK på kommande växlar påminnelsen', async () => {
    toggleReminder(channelA, afterA, NOW)
    await mount()
    expect(within(blockOf('After')).getByTestId('tl-bell')).toBeInTheDocument()
    fireEvent.click(blockOf('After'))
    expect(getReminders()).toHaveLength(0)
  })

  it('4 000 kanaler: högst ROWS_STEP rader monteras', async () => {
    const big: LiveTvList = { ...list, id: 'big', channels: Array.from({ length: 4000 }, (_, i) => ch(`K${i}`, 'Bulk')) }
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [big])
    seedLiveTvIndex({ cache })
    await mount()
    expect(screen.getAllByTestId('tl-row').length).toBeLessThanOrEqual(ROWS_STEP)
    expect(screen.getByTestId('tl-show-more')).toBeInTheDocument()
  })
})

describe('GuideTimelineView (skrivbordsappen)', () => {
  beforeEach(() => { __setTvModeForTests(false); __setDesktopTauriEnvForTests(true) })

  it('samma tablå utan "OK = …"', async () => {
    await mount()
    expect(screen.getByTestId('guide-timeline-view')).toBeInTheDocument()
    expect(screen.getByTestId('guide-timeline-view').textContent).not.toMatch(/OK =/)
  })
  it('hämtar ett enda intervall som täcker hela fönstrets räckvidd (ingen omhämtning vid dygnsgränsen)', async () => {
    const { timelineFetchRange } = await import('./guide-timeline-view')
    const { startOfLocalDay } = await import('../live-tv-model')
    const t = Date.now()
    expect(timelineFetchRange(t)).toEqual({ from: startOfLocalDay(t), to: startOfLocalDay(t, 2) })
    expect(timelineFetchRange(t + 3_600_000).from).toBe(startOfLocalDay(t + 3_600_000))
  })
})
