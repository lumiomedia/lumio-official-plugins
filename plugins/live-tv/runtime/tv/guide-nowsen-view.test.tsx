import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { __resetForTests, __setDesktopTauriEnvForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { flushLiveTvIndex, seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, channelKey, type LiveTvList } from '../live-tv-data'
import { getReminders } from '../reminders'
import { GUIDE_MODE_KEY, TV_SETTINGS_KEY } from './tv-settings-store'
import { ROWS_STEP } from './guide-view-shared'
import type { EpgCacheEntry } from '../epg/types'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))
import { LiveTvTvShell } from './tv-shell'

/**
 * Nu/Sen i Kanalguide v2 (handoff "Modes / Nu / Sen"): kanalcell 380 + tre
 * celler Nu (1.3) · Sen · Senare. Kanal utan tablå = en cell som ändå är
 * station. ◂ från Nu → kategorikolumnen. Radkapningen är densamma som den
 * gamla Now / Next-vyns (`ROWS_STEP` + "Visa fler").
 */
const now = Date.now()
const ch = (name: string, group: string, tvgId: string | null = null) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId })
const list: LiveTvList = {
  id: 'l1', name: 'Xtream', channels: [ch('B', 'Sport'), ch('A', 'Sport', 'a.tv'), ch('C', 'News')],
  createdAt: '', urlTvg: 'http://x/epg', epgUrls: [], autoEpgDisabled: false, fetchedAt: null,
}
const cache: EpgCacheEntry = {
  index: {
    'a.tv': [
      { title: 'Now A', start: now - 10 * 60_000, stop: now + 20 * 60_000 },
      { title: 'Next A', start: now + 20 * 60_000, stop: now + 50 * 60_000 },
      { title: 'Later A', start: now + 50 * 60_000, stop: now + 80 * 60_000 },
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
  writePluginJson(LIVE_TV_PLUGIN_ID, GUIDE_MODE_KEY, 'now')
  seedLiveTvIndex({ cache })
})

const mount = async (params: Record<string, string> = { view: 'guide' }) => {
  const props = { pageId: 'live-tv-browse', params, onNavigate: () => {}, onOpenDetails: () => {} } as unknown as ComponentProps<typeof LiveTvTvShell>
  render(<LiveTvTvShell {...props} />)
  await flushLiveTvIndex()
}
const rowOf = (name: string) => screen.getAllByTestId('nowsen-row').find((row) => within(row).getByTestId('guide-channel-v2').textContent?.includes(name))!

describe('GuideNowSenView (TV-läge)', () => {
  it('rad per kanal: kanalcell + Nu/Sen/Senare; tablålösa kanaler sist', async () => {
    await mount()
    expect(screen.getByTestId('guide-nowsen-view')).toBeInTheDocument()
    const rows = screen.getAllByTestId('nowsen-row')
    expect(rows).toHaveLength(3)
    const a = rows[0]
    expect(within(a).getByTestId('guide-channel-v2')).toHaveTextContent('A')
    expect(within(a).getByTestId('nowsen-now')).toHaveTextContent('Now A')
    expect(within(a).getByTestId('nowsen-now')).toHaveTextContent('20 min left')
    expect(within(a).getByTestId('nowsen-next')).toHaveTextContent('Next A')
    expect(within(a).getByTestId('nowsen-later')).toHaveTextContent('Later A')
    for (const cell of ['nowsen-now', 'nowsen-next', 'nowsen-later']) expect(within(a).getByTestId(cell)).toHaveAttribute('data-f')
  })

  it('kanal utan tablå: EN cell "Ingen tablå" som ändå är en station', async () => {
    await mount()
    const b = rowOf('B')
    expect(within(b).queryByTestId('nowsen-now')).not.toBeInTheDocument()
    const cell = within(b).getByTestId('nowsen-empty')
    expect(cell).toHaveTextContent('No guide for this channel')
    expect(cell).toHaveAttribute('data-f')
    fireEvent.click(cell)
    expect(await screen.findByTestId('player')).toHaveTextContent('B')
  })

  it('exakt en [data-init], på första radens Nu-cell', async () => {
    await mount()
    const inits = document.querySelectorAll('[data-init]')
    expect(inits).toHaveLength(1)
    expect(inits[0]).toBe(within(rowOf('A')).getByTestId('nowsen-now'))
  })

  it('params.channel ger den kanalen startfokus', async () => {
    await mount({ view: 'guide', channel: channelKey(ch('C', 'News')) })
    const inits = document.querySelectorAll('[data-init]')
    expect(inits).toHaveLength(1)
    expect(inits[0]).toBe(within(rowOf('C')).getByTestId('nowsen-empty'))
  })

  it('◂ från Nu-cellen går till kategorikolumnen (onLeftEdge)', async () => {
    await mount()
    const cell = within(rowOf('A')).getByTestId('nowsen-now')
    act(() => { cell.focus() })
    fireEvent.keyDown(cell, { key: 'ArrowLeft' })
    expect(screen.getByTestId('guide-category-column').contains(document.activeElement)).toBe(true)
  })

  it('chips-layout: ◂ från Nu-cellen lämnas åt appens fokusmotor', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, TV_SETTINGS_KEY, { guideCategoryLayout: 'chips' })
    await mount()
    const cell = within(rowOf('A')).getByTestId('nowsen-now')
    act(() => { cell.focus() })
    const notPrevented = fireEvent.keyDown(cell, { key: 'ArrowLeft' })
    expect(notPrevented).toBe(true)
  })

  it('fokus på Sen följs av heron (programmet, inte bara kanalen)', async () => {
    await mount()
    vi.useFakeTimers()
    act(() => { within(rowOf('A')).getByTestId('nowsen-next').focus() })
    act(() => { vi.advanceTimersByTime(300) })
    expect(screen.getByTestId('guide-hero-title')).toHaveTextContent('Next A')
  })

  it('OK på Nu spelar; OK på Sen sätter påminnelse och ritar klockan', async () => {
    await mount()
    fireEvent.click(within(rowOf('A')).getByTestId('nowsen-next'))
    expect(getReminders()).toHaveLength(1)
    expect(within(rowOf('A')).getByTestId('nowsen-next').querySelector('[data-testid="nowsen-bell"]')).not.toBeNull()
    fireEvent.click(within(rowOf('A')).getByTestId('nowsen-now'))
    expect(await screen.findByTestId('player')).toHaveTextContent('A')
  })

  it('4 000 kanaler: högst ROWS_STEP rader monteras, och "Visa fler" finns', async () => {
    const big: LiveTvList = { ...list, id: 'big', channels: Array.from({ length: 4000 }, (_, i) => ch(`K${i}`, 'Bulk')) }
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [big])
    seedLiveTvIndex({ cache })
    await mount()
    expect(screen.getAllByTestId('nowsen-row').length).toBeLessThanOrEqual(ROWS_STEP)
    expect(screen.getByTestId('nowsen-show-more')).toBeInTheDocument()
  })
})

describe('GuideNowSenView (skrivbordsappen)', () => {
  beforeEach(() => { __setTvModeForTests(false); __setDesktopTauriEnvForTests(true) })

  it('ingen "OK = …" och heron visar första raden utan fokus', async () => {
    await mount()
    expect(screen.getByTestId('guide-nowsen-view').textContent).not.toMatch(/OK =/)
    // Tablån landar efter kanalerna och sorterar om dem; heron följer efter sin fördröjning.
    await act(() => new Promise((resolve) => setTimeout(resolve, 320)))
    expect(screen.getByTestId('guide-hero-title')).toHaveTextContent('Now A')
  })
})
