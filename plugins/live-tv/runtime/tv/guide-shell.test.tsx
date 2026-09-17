import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { __resetForTests, __setDesktopTauriEnvForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { flushLiveTvIndex, seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import { getActivePlaylistId, getGuideMode, getTvSettings } from './tv-settings-store'
import type { EpgCacheEntry } from '../epg/types'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))
import { LiveTvTvShell } from './tv-shell'

/**
 * Guidens nya skal (spec §1): kontrollraden är den ENDA raden över
 * innehållet, läget normaliseras per yta, käll- och kategorival går via
 * `TvChoicePanel` och skrivs till samma lagring som förut.
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

afterEach(() => { cleanup(); __setDesktopTauriEnvForTests(false) })
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

const activeMode = () => screen.getByTestId('guide-mode').querySelector('[data-active]')?.textContent

describe('TvGuideShell (TV-läge)', () => {
  it('lagrat playlists normaliseras till Grid som aktivt segment', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_guide_mode_v1', 'playlists')
    await mount()
    expect(activeMode()).toBe('Grid')
    expect(screen.queryByTestId('playlists-column')).not.toBeInTheDocument()
  })

  it('lagrat tl normaliseras till Now / Next som aktivt segment', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_guide_mode_v1', 'tl')
    await mount()
    expect(activeMode()).toBe('Now / Next')
    expect(screen.queryByTestId('now-line')).not.toBeInTheDocument()
  })

  it('lägesbyte skriver det nya läget och Bakåt poppar tillbaka', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_guide_mode_v1', 'grid')
    const onNavigate = await mount()
    // Grid-platshållaren (dagens TvGuideGrid) har ett eget segment med samma
    // etikett — kontrollradens är det som gäller.
    fireEvent.click(within(screen.getByTestId('guide-mode')).getByText('Timeline'))
    expect(getGuideMode()).toBe('timeline')
    expect(activeMode()).toBe('Timeline')
    // Ett tryck = ett läge tillbaka, utan att lämna guiden.
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(getGuideMode()).toBe('grid')
    expect(activeMode()).toBe('Grid')
    expect(onNavigate).not.toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'hub' } })
  })

  it('två byten kräver två Bakåt — ett läge per tryck — och sedan lämnar Bakåt guiden', async () => {
    // Flyttat från den gamla TV-sviten i `tv-guide.test.tsx` (Jerry, riktig
    // TV, plugin 0.5.0): lägesbytet är en navigering INNE i guiden.
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_guide_mode_v1', 'grid')
    const onNavigate = await mount()
    fireEvent.click(within(screen.getByTestId('guide-mode')).getByText('Timeline'))
    fireEvent.click(within(screen.getByTestId('guide-mode')).getByText('Now / Next'))
    expect(getGuideMode()).toBe('nownext')
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(activeMode()).toBe('Timeline')
    expect(getGuideMode()).toBe('timeline')
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(activeMode()).toBe('Grid')
    expect(getGuideMode()).toBe('grid')
    expect(onNavigate).not.toHaveBeenCalled()
    // Stacken är tom: nästa Bakåt lämnar guiden som förut.
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(onNavigate).toHaveBeenCalledTimes(1)
    expect((onNavigate.mock.calls[0][0] as { params: Record<string, string> }).params.view).toBe('hub')
  })

  it('utan lägesbyte i sessionen lämnar Bakåt guiden direkt', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_guide_mode_v1', 'timeline')
    const onNavigate = await mount()
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(onNavigate).toHaveBeenCalledTimes(1)
    expect((onNavigate.mock.calls[0][0] as { params: Record<string, string> }).params.view).toBe('hub')
  })

  it('en lagrad kategori som inte längre finns faller tillbaka till Alla i stället för en tom vy', async () => {
    // Motsvarigheten till den gamla guidens `params.group`-validering: här
    // lagras kategorin (`guideCategory`) och kan ha överlevt en borttagen lista.
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_guide_mode_v1', 'nownext')
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_tv_settings_v1', { guideCategory: 'Nonexistent' })
    await mount()
    expect(screen.getByTestId('guide-category')).toHaveTextContent('All categories')
    // Fyra kanaler i två listor: A (tablå) som rad, B/C/D som kollapsade rader sist.
    expect(screen.getAllByTestId('nownext-row')).toHaveLength(1)
    expect(screen.getAllByTestId('nownext-empty-row')).toHaveLength(3)
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
  })

  it('params.group = all nollar en lagrad kategori vid inträde (hubbens kort, djuplänkar)', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_guide_mode_v1', 'nownext')
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_tv_settings_v1', { guideCategory: 'Sport' })
    await mount({ view: 'guide', group: 'all' })
    expect(screen.getByTestId('guide-category')).toHaveTextContent('All categories')
    expect(getTvSettings().guideCategory).toBeNull()
  })

  it('params.group = News skriver kategorin vid inträde', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_guide_mode_v1', 'nownext')
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_tv_settings_v1', { guideCategory: 'Sport' })
    await mount({ view: 'guide', group: 'News' })
    expect(screen.getByTestId('guide-category')).toHaveTextContent('News')
    expect(getTvSettings().guideCategory).toBe('News')
    expect(screen.getAllByTestId('nownext-empty-row')).toHaveLength(1)
  })

  it('källknappen öppnar panelen; valet skrivs till aktiv spellista och panelen stängs', async () => {
    await mount()
    const source = screen.getByTestId('guide-source')
    expect(source).toHaveTextContent('All playlists')
    fireEvent.click(source)
    const panel = screen.getByTestId('choice-panel')
    expect(panel).toBeInTheDocument()
    // Alla + de två listorna, med antal.
    expect(screen.getByTestId('choice-row-All playlists')).toHaveTextContent('4')
    expect(screen.getByTestId('choice-row-Xtream')).toHaveTextContent('3')
    expect(screen.getByTestId('choice-row-M3U')).toHaveTextContent('1')
    fireEvent.click(screen.getByTestId('choice-row-Xtream'))
    expect(getActivePlaylistId()).toBe('l1')
    expect(screen.queryByTestId('choice-panel')).not.toBeInTheDocument()
    expect(screen.getByTestId('guide-source')).toHaveTextContent('Xtream')
  })

  it('kategoriknappen öppnar panelen; valet skrivs till guideCategory', async () => {
    await mount()
    const category = screen.getByTestId('guide-category')
    expect(category).toHaveTextContent('All categories')
    fireEvent.click(category)
    expect(screen.getByTestId('choice-row-Sport')).toHaveTextContent('2')
    fireEvent.click(screen.getByTestId('choice-row-Sport'))
    expect(getTvSettings().guideCategory).toBe('Sport')
    expect(screen.queryByTestId('choice-panel')).not.toBeInTheDocument()
    expect(screen.getByTestId('guide-category')).toHaveTextContent('Sport')
  })

  it('Bakåt stänger en öppen panel utan att lämna guiden', async () => {
    const onNavigate = await mount()
    fireEvent.click(screen.getByTestId('guide-source'))
    expect(screen.getByTestId('choice-panel')).toBeInTheDocument()
    act(() => { fireEvent.keyDown(window, { key: 'Escape' }) })
    expect(screen.queryByTestId('choice-panel')).not.toBeInTheDocument()
    expect(onNavigate).not.toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'hub' } })
  })

  it('ingen förhandsvisning, och kontrollraden är enda syskonet före innehållet', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_guide_mode_v1', 'now')
    await mount()
    expect(screen.queryByText(/OK = fullscreen/)).not.toBeInTheDocument()
    const row = screen.getByTestId('guide-control-row')
    const shell = row.parentElement!
    expect(shell.firstElementChild).toBe(row)
    expect(row.nextElementSibling).toBe(screen.getByTestId('guide-content'))
    expect(shell.children).toHaveLength(2)
  })

  it('Detaljer-toggeln i Now / Next skriver nowNextDetails', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_guide_mode_v1', 'now')
    await mount()
    expect(getTvSettings().nowNextDetails).toBe(true)
    fireEvent.click(screen.getByTestId('guide-details'))
    expect(getTvSettings().nowNextDetails).toBe(false)
  })

  it('zoomsegmentet i Timeline skriver timelineZoom', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_guide_mode_v1', 'timeline')
    await mount()
    fireEvent.click(screen.getByText('2 h'))
    expect(getTvSettings().timelineZoom).toBe('2h')
  })
})

describe('TvGuideShell (skrivbordsappen, inte TV)', () => {
  beforeEach(() => {
    __setTvModeForTests(false)
    __setDesktopTauriEnvForTests(true)
  })

  it('renderar samma skal med kontrollrad och utan OK = …-text', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_guide_mode_v1', 'tl')
    await mount()
    expect(screen.getByTestId('guide-control-row')).toBeInTheDocument()
    expect(activeMode()).toBe('Now / Next')
    expect(screen.queryByText(/OK = /)).not.toBeInTheDocument()
    expect(screen.queryByTestId('playlists-column')).not.toBeInTheDocument()
  })

  it('lägesbyte skriver bara de nya nycklarna', async () => {
    await mount()
    fireEvent.click(within(screen.getByTestId('guide-mode')).getByText('Timeline'))
    expect(getGuideMode()).toBe('timeline')
  })

  it('inga TV-rester på skrivbordet: ingen "OK = …"/"håll OK" i något av de tre lägena', async () => {
    // Spec §5: `OK = …`-strängarna (okWatch, okRemind, previewLabel/Frame,
    // allChannelsSub) renderas bara när `isTv`. På TV får de finnas; här
    // (skrivbordsappen) får inte ett enda läge bära dem — inte heller med
    // Detaljer-bannern på, som är det enda stället som liknar det gamla toppbandet.
    for (const stored of ['grid', 'nownext', 'timeline'] as const) {
      writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_guide_mode_v1', stored)
      writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_tv_settings_v1', { nowNextDetails: true })
      await mount()
      const shell = screen.getByTestId('guide-shell')
      expect(shell).toHaveAttribute('data-guide-mode', stored)
      expect(shell.textContent).not.toMatch(/OK =|hold OK|håll OK/)
      cleanup()
    }
  })
})
