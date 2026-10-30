import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { __resetForTests, __setDesktopTauriEnvForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { flushLiveTvIndex, seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import { getActivePlaylistId, getGuideMode, getTvSettings } from './tv-settings-store'
import { guideWindowStart } from './epg-grid-geometry'
import { v2Bg } from './v2-tokens'
import type { EpgCacheEntry } from '../epg/types'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))
import { LiveTvTvShell } from './tv-shell'

/**
 * Kanalguide v2:s skal (handoff "Screen 2", spec "Guiden"): hero med
 * segment och källpill, kategorikolumn eller chips, N/T-tangenterna och
 * Bakåt-kedjan nu → kategorier → lämna. Vyerna själva testas i sina egna
 * sviter.
 */
const now = Date.now()
const ch = (name: string, group: string, tvgId: string | null = null) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId })
const list1: LiveTvList = { id: 'l1', name: 'Xtream', channels: [ch('A', 'Sport', 'a.tv'), ch('B', 'Sport'), ch('C', 'News')], createdAt: '', urlTvg: 'http://x/epg', epgUrls: [], autoEpgDisabled: false, fetchedAt: null }
const list2: LiveTvList = { id: 'l2', name: 'M3U', channels: [ch('D', 'Kids')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }
const cache: EpgCacheEntry = {
  index: { 'a.tv': [
    { title: 'Now A', start: now - 10 * 60_000, stop: now + 20 * 60_000 },
    { title: 'Next A', start: now + 20 * 60_000, stop: now + 50 * 60_000 },
  ] },
  fetchedAt: now, sources: ['http://x/epg'],
}

afterEach(() => { cleanup(); __setDesktopTauriEnvForTests(false); vi.useRealTimers() })
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list1, list2])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  seedLiveTvIndex({ cache })
})

const mount = async (params: Record<string, string> = { view: 'guide' }) => {
  const onNavigate = vi.fn()
  render(<LiveTvTvShell pageId="live-tv-browse" params={params} onNavigate={onNavigate} onOpenDetails={() => {}} />)
  await flushLiveTvIndex()
  return onNavigate
}

const shell = () => screen.getByTestId('guide-shell')
const activeMode = () => screen.getByTestId('guide-mode').querySelector('[data-active]')?.textContent
const column = () => screen.getByTestId('guide-category-column')
const cat = (label: string) => within(document.body).getAllByTestId('guide-cat').find((el) => el.textContent?.startsWith(label))!
const press = (key: string) => fireEvent.keyDown(window, { key })
const leftGuide = (onNavigate: ReturnType<typeof vi.fn>) => onNavigate.mock.calls.some((call) => (call[0] as { params: Record<string, string> }).params.view === 'hub')
const block = (title: string) => screen.getAllByTestId('tl-block').find((el) => el.textContent?.includes(title))!

describe('TvGuideShell v2 (TV-läge)', () => {
  it('hero med segmentet (tre stationer), kategorikolumn och exakt en [data-init]', async () => {
    await mount()
    expect(screen.getByTestId('guide-hero')).toBeInTheDocument()
    expect(screen.getByTestId('guide-mode').querySelectorAll('[data-f]')).toHaveLength(3)
    expect(shell()).toHaveAttribute('data-guide-mode', 'now')
    expect(column()).toBeInTheDocument()
    expect(screen.queryByTestId('guide-category-chips')).not.toBeInTheDocument()
    expect(screen.queryByTestId('guide-control-row')).not.toBeInTheDocument()
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
  })

  it('lagrade lägen normaliseras: playlists → Kanallista, grid → Tablå, nownext → Nu / Sen', async () => {
    for (const [stored, mode, label] of [['playlists', 'list', 'Channel list'], ['grid', 'tl', 'Timeline'], ['nownext', 'now', 'Now / Next']] as const) {
      writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_guide_mode_v1', stored)
      await mount()
      expect(shell()).toHaveAttribute('data-guide-mode', mode)
      expect(activeMode()).toBe(label)
      cleanup()
    }
  })

  it('guideCategoryLayout = chips → chipsraden och ingen kolumn', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_tv_settings_v1', { guideCategoryLayout: 'chips' })
    await mount()
    expect(screen.getByTestId('guide-category-chips')).toBeInTheDocument()
    expect(screen.queryByTestId('guide-category-column')).not.toBeInTheDocument()
  })

  it('segmentet skriver läget; T växlar Nu/Sen ↔ Tablå och från Kanallista till Tablå', async () => {
    await mount()
    fireEvent.click(screen.getByTestId('guide-mode-list'))
    expect(getGuideMode()).toBe('list')
    fireEvent.keyDown(shell(), { key: 't' })
    expect(shell()).toHaveAttribute('data-guide-mode', 'tl')
    fireEvent.keyDown(shell(), { key: 'T' })
    expect(shell()).toHaveAttribute('data-guide-mode', 'now')
    fireEvent.keyDown(shell(), { key: 't' })
    expect(shell()).toHaveAttribute('data-guide-mode', 'tl')
    expect(getGuideMode()).toBe('tl')
  })

  it('N hoppar till nu: fönstret = guideWindowStart(nu) och fokuserat framtida program byts mot det pågående', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_guide_mode_v1', 'tl')
    await mount()
    act(() => { block('Now A').focus() })
    act(() => { block('Next A').focus() })
    fireEvent.keyDown(block('Next A'), { key: 'n' })
    expect(shell()).toHaveAttribute('data-window-start', String(guideWindowStart(Date.now())))
    // Markeringen är tillbaka på nu: Bakåt tar då kategoristeget, inte nu-steget.
    press('Escape')
    expect(column().contains(document.activeElement)).toBe(true)
  })

  it('Bakåt: framtida fokus → nu, sedan kategorierna, sedan lämnas guiden — ett steg per tryck', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_guide_mode_v1', 'tl')
    const onNavigate = await mount()
    act(() => { block('Next A').focus() })
    press('Escape')
    expect(column().contains(document.activeElement)).toBe(false)
    expect(leftGuide(onNavigate)).toBe(false)
    press('Escape')
    expect(column().contains(document.activeElement)).toBe(true)
    expect(leftGuide(onNavigate)).toBe(false)
    press('Escape')
    expect(leftGuide(onNavigate)).toBe(true)
  })

  it('Bakåt från en kanal på nu tar kategorierna först, sedan lämnas guiden', async () => {
    const onNavigate = await mount()
    act(() => { (document.querySelector('[data-init]') as HTMLElement).focus() })
    press('Backspace')
    expect(column().contains(document.activeElement)).toBe(true)
    expect(onNavigate).not.toHaveBeenCalled()
    press('Backspace')
    expect(leftGuide(onNavigate)).toBe(true)
  })

  it('heron byter titel först 300 ms efter att fokus flyttat', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_guide_mode_v1', 'tl')
    await mount()
    act(() => { block('Now A').focus() })
    expect(screen.getByTestId('guide-hero-title')).toHaveTextContent('Now A')
    vi.useFakeTimers()
    act(() => { block('Next A').focus() })
    act(() => { vi.advanceTimersByTime(290) })
    expect(screen.getByTestId('guide-hero-title')).toHaveTextContent('Now A')
    act(() => { vi.advanceTimersByTime(10) })
    expect(screen.getByTestId('guide-hero-title')).toHaveTextContent('Next A')
  })

  it('kategorikolumnen: OK på Sport skriver guideCategory och markerar posten', async () => {
    await mount()
    expect(cat('All')).toHaveAttribute('data-selected')
    expect(cat('Sport')).toHaveTextContent('2')
    fireEvent.click(cat('Sport'))
    expect(getTvSettings().guideCategory).toBe('Sport')
    expect(cat('Sport')).toHaveAttribute('data-selected')
  })

  it('en lagrad kategori som inte längre finns faller tillbaka till Alla', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_tv_settings_v1', { guideCategory: 'Nonexistent' })
    await mount()
    expect(cat('All')).toHaveAttribute('data-selected')
  })

  it('params.group = all nollar, params.group = News skriver kategorin vid inträde', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_tv_settings_v1', { guideCategory: 'Sport' })
    await mount({ view: 'guide', group: 'all' })
    expect(getTvSettings().guideCategory).toBeNull()
    cleanup()
    await mount({ view: 'guide', group: 'News' })
    expect(getTvSettings().guideCategory).toBe('News')
    expect(cat('News')).toHaveAttribute('data-selected')
  })

  it('fler än tolv grupper: "All groups (N)" öppnar grupplistan, valet skrivs; en lagrad grupp bortom taket står kvar', async () => {
    const many: LiveTvList = { id: 'l9', name: 'Big', channels: Array.from({ length: 20 }, (_, i) => ch(`K${i + 1}`, `G${String(i + 1).padStart(3, '0')}`)), createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [many])
    seedLiveTvIndex()
    await mount()
    expect(within(column()).queryByText('G013')).not.toBeInTheDocument()
    fireEvent.click(cat('All groups (20)'))
    fireEvent.click(within(screen.getByTestId('group-picker')).getByTestId('group-row-G017'))
    expect(getTvSettings().guideCategory).toBe('G017')
    expect(screen.queryByTestId('group-picker')).not.toBeInTheDocument()
    expect(cat('G017')).toHaveAttribute('data-selected')
  })

  it('källpillen öppnar panelen; valet skrivs till aktiv spellista och Bakåt stänger utan att lämna', async () => {
    const onNavigate = await mount()
    const source = screen.getByTestId('guide-source')
    expect(source).toHaveTextContent('All playlists')
    fireEvent.click(source)
    expect(screen.getByTestId('choice-row-All playlists')).toHaveTextContent('4')
    press('Escape')
    expect(screen.queryByTestId('choice-panel')).not.toBeInTheDocument()
    expect(leftGuide(onNavigate)).toBe(false)
    fireEvent.click(screen.getByTestId('guide-source'))
    fireEvent.click(screen.getByTestId('choice-row-Xtream'))
    expect(getActivePlaylistId()).toBe('l1')
    expect(screen.queryByTestId('choice-panel')).not.toBeInTheDocument()
    expect(screen.getByTestId('guide-source')).toHaveTextContent('Xtream')
  })

  it('N/T fångas inte medan en panel är öppen', async () => {
    await mount()
    fireEvent.click(screen.getByTestId('guide-source'))
    fireEvent.keyDown(shell(), { key: 't' })
    expect(shell()).toHaveAttribute('data-guide-mode', 'now')
  })
})

describe('TvGuideShell v2 (skrivbordsappen, inte TV)', () => {
  beforeEach(() => {
    __setTvModeForTests(false)
    __setDesktopTauriEnvForTests(true)
  })

  it('samma skal, och inga "OK = …"/"håll OK" i något av de tre lägena', async () => {
    for (const stored of ['now', 'tl', 'list'] as const) {
      writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_guide_mode_v1', stored)
      await mount()
      expect(shell()).toHaveAttribute('data-guide-mode', stored)
      expect(screen.getByTestId('guide-hero')).toBeInTheDocument()
      expect(shell().textContent).not.toMatch(/OK =|hold OK|håll OK/)
      cleanup()
    }
  })
})

describe('guidens bakgrund', () => {
  it('slät sidton utan gradient (bilden har sin egen övertoning i heron)', async () => {
    await mount()
    expect(screen.getByTestId('guide-bg').getAttribute('data-bg')).toBe(v2Bg('slate'))
  })
})
