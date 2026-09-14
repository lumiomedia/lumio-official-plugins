import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TV_SCENE_BOX_ATTR, TV_SCENE_NARROW_ATTR, __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, channelKey, type LiveTvList } from '../live-tv-data'
import { getMultiviewState } from './tv-multiview-store'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))
import { LiveTvTvShell } from './tv-shell'

const ch = (name: string) => ({ name, logo: null, group: 'Sport', url: `http://x/${name}`, tvgId: null })
const list: LiveTvList = { id: 'l1', name: 'X', channels: [ch('A'), ch('B'), ch('C')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_multiview_v1', { layout: 4, tiles: [channelKey(ch('A')), null, null, null], audioIndex: 0 })
  seedLiveTvIndex()
})

const mount = () => render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'multi' }} onNavigate={() => {}} onOpenDetails={() => {}} />)

describe('TvMultiview', () => {
  it('ritar fyra rutor, ljudtaggen på rutan med ljud och data-init där', () => {
    mount()
    const tiles = screen.getAllByTestId('mv-tile')
    expect(tiles).toHaveLength(4)
    expect(tiles[0]).toHaveTextContent(/LJUD|AUDIO/)
    expect(tiles[0]).toHaveAttribute('data-init')
  })
  it('tom ruta öppnar kanalväljaren och val tilldelar rutan', () => {
    mount()
    fireEvent.click(screen.getAllByTestId('mv-tile')[1])
    expect(screen.getByTestId('channel-picker')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('picker-row-B'))
    expect(getMultiviewState().tiles[1]).toBe(channelKey(ch('B')))
    expect(screen.queryByTestId('channel-picker')).toBeNull()
  })
  it('segmentväxeln byter layout', () => {
    mount()
    fireEvent.click(screen.getByText('2 tiles'))
    expect(screen.getAllByTestId('mv-tile')).toHaveLength(2)
    expect(getMultiviewState().layout).toBe(2)
  })
  it('OK på en tilldelad ruta flyttar ljudet dit', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_multiview_v1', { layout: 2, tiles: [channelKey(ch('A')), channelKey(ch('B'))], audioIndex: 0 })
    mount()
    fireEvent.click(screen.getAllByTestId('mv-tile')[1])
    expect(getMultiviewState().audioIndex).toBe(1)
  })
})

// Jerrys återkoppling 2026-09-14, ändring 1: fjärrhjälpen ("OK on a tile =
// audio here · hold OK = switch channel / remove") beskriver fjärrkontrollen
// och ska bara synas i TV-läge — ljudetiketten ("Audio: A") är innehåll, inte
// fjärrhjälp, och ska vara kvar oavsett läge.
describe('TvMultiview fjärrhjälp (Jerrys återkoppling 2026-09-14)', () => {
  it('visas i TV-läge, tillsammans med ljudetiketten', () => {
    __setTvModeForTests(true)
    mount()
    const help = screen.getByTestId('mv-audio-help')
    expect(help.textContent).toContain('Audio: A')
    expect(help.textContent).toContain('OK on a tile = audio here')
  })
  it('döljs utanför TV-läge, men ljudetiketten är kvar utan ersättningstext', () => {
    __setTvModeForTests(false)
    mount()
    const help = screen.getByTestId('mv-audio-help')
    expect(help.textContent).toContain('Audio: A')
    expect(help.textContent).not.toContain('OK on a tile = audio here')
  })
})

describe('TvMultiview på smal yta', () => {
  /** Samma böjrigg som `tv-shell-scene.test.tsx`: värden lindar sidan i en
      låda med `data-tv-scene-box`/`data-tv-scene-narrow`, pluginet läser dem
      uppåt i DOM:en. */
  function mountInBox(narrow: boolean) {
    const box = document.createElement('div')
    box.setAttribute(TV_SCENE_BOX_ATTR, '1')
    if (narrow) box.setAttribute(TV_SCENE_NARROW_ATTR, '1')
    document.body.appendChild(box)
    return render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'multi' }} onNavigate={() => {}} onOpenDetails={() => {}} />, { container: box })
  }

  beforeEach(() => {
    __setTvModeForTests(false)
  })

  it('smal yta ger två rutor staplade lodrätt', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_multiview_v1', { layout: 4, tiles: [channelKey(ch('A')), channelKey(ch('B')), null, null], audioIndex: 0 })
    mountInBox(true)
    await waitFor(() => expect(screen.getAllByTestId('mv-tile')).toHaveLength(2))
    const grid = screen.getAllByTestId('mv-tile')[0].parentElement as HTMLElement
    expect(grid.style.gridTemplateColumns).toBe('1fr')
    expect(grid.style.gridTemplateRows).toBe('1fr 1fr')
  })

  it('kapacitetsväxeln döljs på smal yta', async () => {
    mountInBox(true)
    await waitFor(() => expect(screen.getAllByTestId('mv-tile')).toHaveLength(2))
    expect(screen.queryByText('2 tiles')).toBeNull()
    expect(screen.queryByText('1 + 2')).toBeNull()
    expect(screen.queryByText('4 tiles')).toBeNull()
  })

  it('det sparade layoutvalet ändras inte av den smala grenen', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_multiview_v1', { layout: 3, tiles: [channelKey(ch('A')), channelKey(ch('B')), null], audioIndex: 0 })
    mountInBox(true)
    await waitFor(() => expect(screen.getAllByTestId('mv-tile')).toHaveLength(2))
    expect(getMultiviewState().layout).toBe(3)
  })

  it('bred yta är oförändrad', () => {
    mountInBox(false)
    expect(screen.getAllByTestId('mv-tile')).toHaveLength(4)
    expect(screen.getByText('2 tiles')).toBeInTheDocument()
    expect(screen.getByText('4 tiles')).toBeInTheDocument()
  })

  it('en tilldelning på smal yta sparar inte layout 2', async () => {
    // Den smala grenen är render-only (Jerrys beslut): en tilldelning som
    // görs medan ytan är smal ska persisteras på RÄTT ruta, men INTE tvinga
    // igenom layout 2 i lagret — annars käkas de rutor som inte syns upp så
    // fort ytan breddas igen.
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_multiview_v1', { layout: 4, tiles: [channelKey(ch('A')), null, null, null], audioIndex: 0 })
    mountInBox(true)
    await waitFor(() => expect(screen.getAllByTestId('mv-tile')).toHaveLength(2))
    fireEvent.click(screen.getAllByTestId('mv-tile')[1])
    expect(screen.getByTestId('channel-picker')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('picker-row-B'))
    expect(getMultiviewState().layout).toBe(4)
    expect(getMultiviewState().tiles).toEqual([channelKey(ch('A')), channelKey(ch('B')), null, null])
  })

  it('ljudrutan syns och behåller data-init även om ljudet ligger på en dold ruta', async () => {
    // Granskningsfynd: audioIndex kan peka på ruta 3 (verkligt index 2) i ett
    // 4-layout — en naiv "de två första" hade tystat ljudrutan helt och gett
    // noll data-init i vyn, trots att rubriken påstår att C spelar.
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_multiview_v1', { layout: 4, tiles: [null, null, channelKey(ch('C')), null], audioIndex: 2 })
    mountInBox(true)
    await waitFor(() => expect(screen.getAllByTestId('mv-tile')).toHaveLength(2))
    const tiles = screen.getAllByTestId('mv-tile')
    const withInit = tiles.filter((t) => t.hasAttribute('data-init'))
    expect(withInit).toHaveLength(1)
    expect(withInit[0]).toHaveTextContent('C')
    expect(withInit[0]).toHaveTextContent(/LJUD|AUDIO/)
  })

  it('fokus flyttas till en synlig ruta när ytan smalnar och den fokuserade rutan döljs', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_multiview_v1', { layout: 4, tiles: [channelKey(ch('A')), null, null, null], audioIndex: 0 })
    const box = document.createElement('div')
    box.setAttribute(TV_SCENE_BOX_ATTR, '1')
    document.body.appendChild(box)
    render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'multi' }} onNavigate={() => {}} onOpenDetails={() => {}} />, { container: box })
    const wideTiles = screen.getAllByTestId('mv-tile')
    expect(wideTiles).toHaveLength(4)
    wideTiles[3].focus()
    expect(document.activeElement).toBe(wideTiles[3])
    box.setAttribute(TV_SCENE_NARROW_ATTR, '1')
    await waitFor(() => expect(screen.getAllByTestId('mv-tile')).toHaveLength(2))
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement?.hasAttribute('data-init')).toBe(true)
  })

  it('hållmenyns Förstora är dold på en smal yta', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_multiview_v1', { layout: 4, tiles: [channelKey(ch('A')), channelKey(ch('B')), null, null], audioIndex: 0 })
    mountInBox(true)
    await waitFor(() => expect(screen.getAllByTestId('mv-tile')).toHaveLength(2))
    fireEvent.contextMenu(screen.getAllByTestId('mv-tile')[0])
    expect(screen.getByTestId('tv-glass-menu')).toBeInTheDocument()
    expect(screen.queryByText('Enlarge')).toBeNull()
    // Regression: menyn öppnas fortfarande med resten av handlingarna intakta.
    expect(screen.getByText('Remove tile')).toBeInTheDocument()
  })
})
