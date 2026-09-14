import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { TV_SCENE_BOX_ATTR, TV_SCENE_NARROW_ATTR, TV_SCENE_PHONE_ATTR, __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, channelKey, type LiveTvList } from '../live-tv-data'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))

import { LiveTvTvShell } from './tv-shell'

const ch = (name: string, group: string) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId: null })
const list: LiveTvList = { id: 'l1', name: 'Xtream', channels: [ch('A', 'Sport'), ch('B', 'Sport'), ch('C', 'News')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [channelKey({ name: 'A', url: 'http://x/A' })])
  seedLiveTvIndex()
})

describe('TvHub', () => {
  it('visar spellistpill, kategorichips och alla kanaler', () => {
    render(<LiveTvTvShell pageId="live-tv-browse" params={{}} onNavigate={() => {}} onOpenDetails={() => {}} />)
    expect(screen.getByTestId('playlist-pill')).toHaveTextContent('All playlists')
    expect(screen.getByTestId('all-channels').querySelectorAll('[data-f]').length).toBe(3)
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
  })
  it('OK på ett kanalkort spelar kanalen', async () => {
    render(<LiveTvTvShell pageId="live-tv-browse" params={{}} onNavigate={() => {}} onOpenDetails={() => {}} />)
    fireEvent.click(screen.getByTestId('all-channels').querySelectorAll('[data-f]')[2])
    expect(await screen.findByTestId('player')).toHaveTextContent('C')
  })
  it('kategorichip filtrerar rutnätet', () => {
    render(<LiveTvTvShell pageId="live-tv-browse" params={{}} onNavigate={() => {}} onOpenDetails={() => {}} />)
    fireEvent.click(screen.getByTestId('chip-News'))
    expect(screen.getByTestId('all-channels').querySelectorAll('[data-f]').length).toBe(1)
  })
  it('spellistmenyn byter källa', () => {
    render(<LiveTvTvShell pageId="live-tv-browse" params={{}} onNavigate={() => {}} onOpenDetails={() => {}} />)
    fireEvent.click(screen.getByTestId('playlist-pill'))
    fireEvent.click(screen.getByTestId('playlist-l1'))
    expect(screen.getByTestId('playlist-pill')).toHaveTextContent('Xtream')
  })
})

describe('TvHub i porträtt (telefon)', () => {
  // Lådan som `render(page, { container })` skriver in i — måste bort i
  // `afterEach`, precis som i M-P2:s skaltest.
  let box: HTMLElement | null = null
  afterEach(() => { box?.remove(); box = null })

  function renderHubOnPhone() {
    box = document.createElement('div')
    box.setAttribute(TV_SCENE_BOX_ATTR, '1')
    box.setAttribute(TV_SCENE_NARROW_ATTR, '1')
    box.setAttribute(TV_SCENE_PHONE_ATTR, '1')
    document.body.appendChild(box)
    return render(<LiveTvTvShell pageId="live-tv-browse" params={{}} onNavigate={() => {}} onOpenDetails={() => {}} />, { container: box })
  }
  function renderHubOnDesktop() {
    box = document.createElement('div')
    box.setAttribute(TV_SCENE_BOX_ATTR, '1')
    document.body.appendChild(box)
    return render(<LiveTvTvShell pageId="live-tv-browse" params={{}} onNavigate={() => {}} onOpenDetails={() => {}} />, { container: box })
  }

  it('lägger spotlight i två kolumner på telefon', () => {
    renderHubOnPhone()
    const grid = screen.getByTestId('hub-spotlight')
    expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' })
  })
  it('behåller tre kolumner i spotlighten på skrivbordet', () => {
    renderHubOnDesktop()
    expect(screen.getByTestId('hub-spotlight')).toHaveStyle({ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' })
  })
  // Den gamla specen kallade det här rutnätet "hubbens sexkolumnsrutnät" —
  // spotlighten har alltid varit 3. Samma behandling gäller ändå: två
  // kolumner på telefon, sex kvar på skrivbord/TV.
  it('lägger "alla kanaler" i två kolumner på telefon', () => {
    renderHubOnPhone()
    expect(screen.getByTestId('all-channels')).toHaveStyle({ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' })
  })
  it('behåller sex kolumner i "alla kanaler" på skrivbordet', () => {
    renderHubOnDesktop()
    expect(screen.getByTestId('all-channels')).toHaveStyle({ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' })
  })
})
