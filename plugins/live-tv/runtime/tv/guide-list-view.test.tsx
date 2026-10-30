import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { __resetForTests, __setDesktopTauriEnvForTests, __setLangForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { flushLiveTvIndex, seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import { getReminders, toggleReminder } from '../reminders'
import { GUIDE_MODE_KEY } from './tv-settings-store'
import { ROWS_STEP } from './guide-view-shared'
import type { EpgCacheEntry } from '../epg/types'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))
import { LiveTvTvShell } from './tv-shell'

/**
 * Kanallista i Kanalguide v2 (handoff "Modes / Kanallista"): rad = kanalcell
 * + nu-cell (titel, "N min kvar", förlopp). Högerkolumnen 560 px har tre
 * programkort Nu/Sen/Senare för den fokuserade kanalen; ▸ från listan in i
 * korten, ▲▼ mellan dem (heron följer), ◂ tillbaka till samma rad.
 */
const now = Date.now()
const ch = (name: string, group: string, tvgId: string | null = null) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId })
const channelA = ch('A', 'Sport', 'a.tv')
const list: LiveTvList = {
  id: 'l1', name: 'Xtream', channels: [channelA, ch('B', 'Sport', 'b.tv'), ch('C', 'News')],
  createdAt: '', urlTvg: 'http://x/epg', epgUrls: [], autoEpgDisabled: false, fetchedAt: null,
}
const laterA = { title: 'Later A', start: now + 50 * 60_000, stop: now + 80 * 60_000 }
const cache: EpgCacheEntry = {
  index: {
    'a.tv': [
      { title: 'Now A', start: now - 10 * 60_000, stop: now + 20 * 60_000 },
      { title: 'Next A', start: now + 20 * 60_000, stop: now + 50 * 60_000 },
      laterA,
    ],
    'b.tv': [
      { title: 'Now B', start: now - 5 * 60_000, stop: now + 40 * 60_000 },
      { title: 'Next B', start: now + 40 * 60_000, stop: now + 70 * 60_000 },
    ],
  },
  fetchedAt: now, sources: ['http://x/epg'],
}

afterEach(() => { cleanup(); __setDesktopTauriEnvForTests(false); vi.useRealTimers() })
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  writePluginJson(LIVE_TV_PLUGIN_ID, GUIDE_MODE_KEY, 'list')
  seedLiveTvIndex({ cache })
})

const mount = async () => {
  const props = { pageId: 'live-tv-browse', params: { view: 'guide' }, onNavigate: () => {}, onOpenDetails: () => {} } as unknown as ComponentProps<typeof LiveTvTvShell>
  render(<LiveTvTvShell {...props} />)
  await flushLiveTvIndex()
}
const rowOf = (name: string) => screen.getAllByTestId('list-row').find((row) => within(row).getByTestId('guide-channel-v2').textContent?.includes(name))!
const nowCell = (name: string) => within(rowOf(name)).getByTestId('list-now')

describe('GuideListView (TV-läge)', () => {
  it('rad = kanalcell + nu-cell med "N min kvar"; tre programkort för startkanalen', async () => {
    await mount()
    expect(screen.getByTestId('guide-list-view')).toBeInTheDocument()
    expect(nowCell('A')).toHaveTextContent('Now A')
    expect(nowCell('A')).toHaveTextContent('20 min left')
    expect(screen.getByTestId('list-card-now')).toHaveTextContent('Now A')
    expect(screen.getByTestId('list-card-next')).toHaveTextContent('Next A')
    expect(screen.getByTestId('list-card-later')).toHaveTextContent('Later A')
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
    expect(document.querySelector('[data-init]')).toBe(nowCell('A'))
  })

  it('korten följer den fokuserade kanalen', async () => {
    await mount()
    act(() => { nowCell('B').focus() })
    expect(screen.getByTestId('list-card-now')).toHaveTextContent('Now B')
    expect(screen.getByTestId('list-card-next')).toHaveTextContent('Next B')
    expect(screen.queryByTestId('list-card-later')).not.toBeInTheDocument()
  })

  it('▸ från listan fokuserar Nu-kortet; ▼▲ mellan korten; ◂ från ett kort tillbaka till samma rad', async () => {
    await mount()
    act(() => { nowCell('B').focus() })
    fireEvent.keyDown(nowCell('B'), { key: 'ArrowRight' })
    expect(document.activeElement).toBe(screen.getByTestId('list-card-now'))
    fireEvent.keyDown(screen.getByTestId('list-card-now'), { key: 'ArrowDown' })
    expect(document.activeElement).toBe(screen.getByTestId('list-card-next'))
    fireEvent.keyDown(screen.getByTestId('list-card-next'), { key: 'ArrowDown' })
    expect(document.activeElement).toBe(screen.getByTestId('list-card-next'))
    fireEvent.keyDown(screen.getByTestId('list-card-next'), { key: 'ArrowUp' })
    expect(document.activeElement).toBe(screen.getByTestId('list-card-now'))
    fireEvent.keyDown(screen.getByTestId('list-card-next'), { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(nowCell('B'))
  })

  it('heron följer kortet (programmet)', async () => {
    await mount()
    act(() => { nowCell('A').focus() })
    vi.useFakeTimers()
    act(() => { screen.getByTestId('list-card-later').focus() })
    act(() => { vi.advanceTimersByTime(300) })
    expect(screen.getByTestId('guide-hero-title')).toHaveTextContent('Later A')
  })

  it('◂ från listraden går till kategorikolumnen', async () => {
    await mount()
    act(() => { nowCell('A').focus() })
    fireEvent.keyDown(nowCell('A'), { key: 'ArrowLeft' })
    expect(screen.getByTestId('guide-category-column').contains(document.activeElement)).toBe(true)
  })

  it('Senare-kort med påminnelse visar "Påminnelse satt · OK = ta bort"; OK tar bort den', async () => {
    __setLangForTests('sv')
    toggleReminder(channelA, laterA, now)
    await mount()
    const card = screen.getByTestId('list-card-later')
    expect(card).toHaveTextContent('Påminnelse satt · OK = ta bort')
    expect(screen.getByTestId('list-card-next')).toHaveTextContent('OK = påminn mig · håll OK = meny')
    expect(screen.getByTestId('list-card-now')).toHaveTextContent('OK = titta · håll OK = meny')
    fireEvent.click(card)
    expect(getReminders()).toHaveLength(0)
    expect(screen.getByTestId('list-card-later')).toHaveTextContent('OK = påminn mig · håll OK = meny')
  })

  it('kanal utan tablå: raden är en station och kortet spelar kanalen', async () => {
    await mount()
    const c = nowCell('C')
    expect(c).toHaveTextContent('No guide for this channel')
    act(() => { c.focus() })
    fireEvent.click(screen.getByTestId('list-card-now'))
    expect(await screen.findByTestId('player')).toHaveTextContent('C')
  })

  it('4 000 kanaler: högst ROWS_STEP rader monteras', async () => {
    const big: LiveTvList = { ...list, id: 'big', channels: Array.from({ length: 4000 }, (_, i) => ch(`K${i}`, 'Bulk')) }
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [big])
    seedLiveTvIndex({ cache })
    await mount()
    expect(screen.getAllByTestId('list-row').length).toBeLessThanOrEqual(ROWS_STEP)
    expect(screen.getByTestId('list-show-more')).toBeInTheDocument()
  })
})

describe('GuideListView (skrivbordsappen)', () => {
  beforeEach(() => { __setTvModeForTests(false); __setDesktopTauriEnvForTests(true) })

  it('korten utan "OK = …"; en satt påminnelse står kvar som text', async () => {
    toggleReminder(channelA, laterA, now)
    await mount()
    const view = screen.getByTestId('guide-list-view')
    expect(view.textContent).not.toMatch(/OK =|hold OK/)
    expect(screen.getByTestId('list-card-later')).toHaveTextContent('Reminder set')
  })
})
