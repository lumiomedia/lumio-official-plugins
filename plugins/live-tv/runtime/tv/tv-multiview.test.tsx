import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, channelKey, type LiveTvList } from '../live-tv-data'
import { getMultiviewState } from './tv-multiview-store'

vi.mock('../hooks/useLiveTvEpgCache', () => ({ useLiveTvEpgCache: vi.fn(() => null) }))
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
