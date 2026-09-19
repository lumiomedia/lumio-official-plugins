import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { __resetForTests, __setDesktopTauriEnvForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { flushLiveTvIndex, seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import { getReminders } from '../reminders'
import { GUIDE_MODE_KEY, TV_SETTINGS_KEY, getTvSettings } from './tv-settings-store'
import type { EpgCacheEntry } from '../epg/types'
import { gp } from './guide-view-shared'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))
import { LiveTvTvShell } from './tv-shell'

/**
 * Now / Next i den städade guiden (spec §4, handoffen §2): infobanner bakom
 * Detaljer, kolumnhuvud med kanalcell 340 + vikter 2 / 1,2 / 1, rader 56,
 * kollapsade tomma rader sist, pagineringsrad. Monteras via skalet i TV-läge
 * med lagrat läge `nownext`; ett skrivbordsfall för hovringen.
 */
const now = Date.now()
const ch = (name: string, group: string, tvgId: string | null = null) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId })
const list: LiveTvList = {
  id: 'l1',
  name: 'Xtream',
  channels: [ch('B', 'Sport'), ch('A', 'Sport', 'a.tv'), ch('C', 'News')],
  createdAt: '',
  urlTvg: 'http://x/epg',
  epgUrls: [],
  autoEpgDisabled: false,
  fetchedAt: null,
}
const cache: EpgCacheEntry = {
  index: {
    'a.tv': [
      { title: 'Now A', start: now - 10 * 60_000, stop: now + 20 * 60_000 },
      { title: 'Next A', start: now + 20 * 60_000, stop: now + 50 * 60_000 },
      { title: 'Later A', start: now + 50 * 60_000, stop: now + 80 * 60_000 },
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
  writePluginJson(LIVE_TV_PLUGIN_ID, GUIDE_MODE_KEY, 'nownext')
  seedLiveTvIndex({ cache })
})

const mount = async () => {
  const onNavigate = vi.fn()
  render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'guide' }} onNavigate={onNavigate} onOpenDetails={() => {}} />)
  await flushLiveTvIndex()
  return onNavigate
}

describe('GuideNowNextView (TV-läge)', () => {
  it('skalet ritar vyn i stället för platshållaren', async () => {
    await mount()
    expect(screen.getByTestId('guide-nownext-view')).toBeInTheDocument()
    expect(screen.queryByTestId('guide-nownext-placeholder')).not.toBeInTheDocument()
  })

  it('nowNextDetails=false → ingen banner; true → banner utan video/TvPreview och utan "OK ="', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, TV_SETTINGS_KEY, { nowNextDetails: false })
    await mount()
    expect(screen.queryByTestId('nownext-banner')).not.toBeInTheDocument()
    cleanup()
    writePluginJson(LIVE_TV_PLUGIN_ID, TV_SETTINGS_KEY, { nowNextDetails: true })
    await mount()
    const banner = screen.getByTestId('nownext-banner')
    expect(banner.querySelector('video')).toBeNull()
    expect(banner.textContent).not.toMatch(/OK =/)
    expect(banner.textContent).not.toMatch(/saved frame/i)
    // Bannern visar första raden (A har tablå och sorteras först): titel,
    // tid · min kvar, och Sen-raden.
    expect(within(banner).getByTestId('nownext-banner-title')).toHaveTextContent('Now A')
    expect(within(banner).getByTestId('nownext-banner-time')).toHaveTextContent('min left')
    expect(within(banner).getByTestId('nownext-banner-next')).toHaveTextContent('Next A')
    expect(within(banner).getByTestId('nownext-banner-watch')).toHaveTextContent('Watch now')
    expect(within(banner).getByTestId('nownext-banner-remind')).toHaveTextContent('Remind me')
  })

  it('Detaljer-knappen i kontrollraden togglar nowNextDetails och bannern', async () => {
    await mount()
    expect(getTvSettings().nowNextDetails).toBe(true)
    expect(screen.getByTestId('nownext-banner')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('guide-details'))
    expect(getTvSettings().nowNextDetails).toBe(false)
    expect(screen.queryByTestId('nownext-banner')).not.toBeInTheDocument()
  })

  it('kolumnhuvudets kanalcell och radernas kanalcell delar samma flex, och kolumnerna väger 2 / 1.2 / 1', async () => {
    await mount()
    const head = screen.getByTestId('nownext-header')
    const headCell = within(head).getByTestId('nownext-header-channel')
    const row = screen.getAllByTestId('nownext-row')[0]
    const rowCell = within(row).getByTestId('guide-cell')
    expect(headCell.style.flex).toBe(rowCell.style.flex)
    expect(headCell.style.flex).toBe(`0 0 ${gp(340)}px`)
    const cols = within(head).getAllByTestId('nownext-header-col')
    expect(cols.map((c) => c.style.flex)).toEqual(['2 1 0%', '1.2 1 0%', '1 1 0%'])
    expect(head).toHaveTextContent('CHANNEL')
    expect(head).toHaveTextContent('NOW')
    expect(head).toHaveTextContent('NEXT')
    expect(head).toHaveTextContent('LATER')
  })

  it('raden visar nu/sen/senare med tider, och ingen rad är högre än 56', async () => {
    await mount()
    const rows = screen.getAllByTestId('nownext-row')
    expect(rows).toHaveLength(1)
    expect(within(rows[0]).getByTestId('nownext-now')).toHaveTextContent('Now A')
    expect(within(rows[0]).getByTestId('nownext-next')).toHaveTextContent('Next A')
    expect(within(rows[0]).getByTestId('nownext-later')).toHaveTextContent('Later A')
    for (const el of [...rows, ...screen.getAllByTestId('nownext-empty-row')]) {
      expect(Number.parseInt(el.style.height, 10)).toBeLessThanOrEqual(gp(56))
    }
  })

  it('kanaler utan tablå kollapsar till EN cell sist med Titta nu', async () => {
    await mount()
    const rows = screen.getAllByTestId('nownext-row')
    const empty = screen.getAllByTestId('nownext-empty-row')
    expect(empty).toHaveLength(2)
    for (const row of empty) {
      expect(row.compareDocumentPosition(rows[0]) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
      expect(within(row).getAllByTestId('nownext-empty-cell')).toHaveLength(1)
      expect(within(row).queryByTestId('nownext-now')).not.toBeInTheDocument()
      expect(row).toHaveTextContent('No guide for this channel · broadcasting live')
      expect(within(row).getByTestId('nownext-watch-pill')).toHaveTextContent('Watch now')
    }
  })

  it('exakt en startstation, på första raden', async () => {
    await mount()
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
    expect(screen.getAllByTestId('nownext-row')[0]).toHaveAttribute('data-init')
  })

  it('fokus markerar raden (bakgrund .05) och bannern följer', async () => {
    await mount()
    const empty = screen.getAllByTestId('nownext-empty-row')[0]
    fireEvent.focus(empty)
    expect(empty).toHaveAttribute('data-selected')
    expect(empty.style.background).toBe('rgba(252, 252, 255, 0.05)')
    expect(screen.getByTestId('nownext-banner-title')).toHaveTextContent('No programme information')
    expect(screen.queryByTestId('nownext-banner-remind')).not.toBeInTheDocument()
    fireEvent.focus(screen.getAllByTestId('nownext-row')[0])
    expect(screen.getByTestId('nownext-banner-title')).toHaveTextContent('Now A')
  })

  it('OK på en rad spelar kanalen', async () => {
    await mount()
    fireEvent.click(screen.getAllByTestId('nownext-row')[0])
    expect(await screen.findByTestId('player')).toHaveTextContent('A')
  })

  it('håll OK på en rad öppnar glasmenyn', async () => {
    await mount()
    const row = screen.getAllByTestId('nownext-row')[0]
    vi.useFakeTimers()
    fireEvent.keyDown(row, { key: 'Enter' })
    vi.advanceTimersByTime(700)
    fireEvent.keyUp(row, { key: 'Enter' })
    vi.useRealTimers()
    expect(await screen.findByTestId('tv-glass-menu')).toBeInTheDocument()
  })

  it('bannerns Titta nu spelar och Påminn mig växlar påminnelsen på Sen', async () => {
    await mount()
    fireEvent.click(screen.getByTestId('nownext-banner-remind'))
    expect(getReminders(now).map((r) => r.title)).toEqual(['Next A'])
    fireEvent.click(screen.getByTestId('nownext-banner-remind'))
    expect(getReminders(now)).toHaveLength(0)
    fireEvent.click(screen.getByTestId('nownext-banner-watch'))
    expect(await screen.findByTestId('player')).toHaveTextContent('A')
  })

  it('pagineringsraden ligger efter listan och Visa 80 fler utökar den', async () => {
    const many = Array.from({ length: 90 }, (_, i) => ch(`K${i}`, 'Sport'))
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ ...list, channels: [ch('A', 'Sport', 'a.tv'), ...many] }])
    seedLiveTvIndex({ cache })
    await mount()
    expect(screen.getAllByTestId('nownext-empty-row')).toHaveLength(79)
    const scroll = screen.getByTestId('nownext-scroll')
    expect(scroll).toHaveAttribute('data-scroll')
    const pagination = screen.getByTestId('nownext-pagination')
    expect(scroll.compareDocumentPosition(pagination) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(pagination).toHaveTextContent('1 of 91 channels have a guide in this category')
    const more = screen.getByTestId('nownext-show-more')
    expect(more).toHaveTextContent('Show 80 more')
    fireEvent.click(more)
    await flushLiveTvIndex()
    expect(screen.getAllByTestId('nownext-empty-row')).toHaveLength(90)
    expect(screen.queryByTestId('nownext-show-more')).not.toBeInTheDocument()
  })

  it('medan snapshotet laddar (kanaler finns) bär tomrutan startstationen — exakt en', () => {
    // Ingen `flushLiveTvIndex()`: kanalerna finns synkront, nu-snapshotet är
    // fortfarande på väg → `epgLoading` och alla kanaler saknar tablå.
    render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'guide' }} onNavigate={() => {}} onOpenDetails={() => {}} />)
    const empty = screen.getByTestId('nownext-empty')
    expect(empty).toBeVisible()
    expect(empty).toHaveTextContent('Fetching guide…')
    expect(empty).toHaveAttribute('data-init')
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
  })

  it('utan kanaler bär tomrutan startstationen och ingen banner ritas', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ ...list, channels: [] }])
    seedLiveTvIndex({ cache: { index: {}, fetchedAt: now, sources: [] } })
    await mount()
    const empty = screen.getByTestId('nownext-empty')
    expect(empty).toBeVisible()
    expect(empty).toHaveAttribute('data-init')
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
    expect(screen.queryByTestId('nownext-banner')).not.toBeInTheDocument()
    expect(screen.queryByTestId('nownext-pagination')).not.toBeInTheDocument()
  })
})

describe('GuideNowNextView (skrivbordsappen, inte TV)', () => {
  beforeEach(() => {
    __setTvModeForTests(false)
    __setDesktopTauriEnvForTests(true)
  })

  it('hovring byter bannerns innehåll efter 120 ms utan att flytta fokus', async () => {
    await mount()
    const empty = screen.getAllByTestId('nownext-empty-row')[0]
    const before = document.activeElement
    vi.useFakeTimers()
    fireEvent.pointerEnter(empty)
    expect(screen.getByTestId('nownext-banner-title')).toHaveTextContent('Now A')
    act(() => { vi.advanceTimersByTime(119) })
    expect(screen.getByTestId('nownext-banner-title')).toHaveTextContent('Now A')
    act(() => { vi.advanceTimersByTime(1) })
    expect(screen.getByTestId('nownext-banner-title')).toHaveTextContent('No programme information')
    expect(document.activeElement).toBe(before)
  })
})
