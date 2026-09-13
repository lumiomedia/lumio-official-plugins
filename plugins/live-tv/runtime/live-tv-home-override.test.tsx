import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { flushLiveTvIndex, seedLiveTvIndex } from '../src/__test-stubs__/live-tv-index'
import { __resetViewHelpersForTests } from './view-helpers'

// Rutnätet och tablåraden har egna tester; här gäller HJÄLTEKORTET, som är det
// enda i vyn som behöver kanalerna.
vi.mock('./live-tv-grid', () => ({ LiveTvGrid: () => <div data-testid="grid" /> }))
vi.mock('./now-next-later-row', () => ({ NowNextLaterRow: () => <div data-testid="nnl" /> }))
vi.mock('./live-tv-player', () => ({ LiveTvPlayer: () => <div data-testid="player" /> }))

import { LIVE_TV_PLUGIN_ID, type LiveTvList, type M3uChannel } from './live-tv-data'
import { LiveTvHomeOverride } from './live-tv-home-override'

const SOURCE = 'http://example.test/playlist.m3u'

const ch = (name: string, tvgId: string | null = null): M3uChannel => ({
  name,
  logo: null,
  group: 'Sport',
  url: `http://example.test/${name}.m3u8`,
  tvgId,
})

function list(channels: M3uChannel[]): LiveTvList {
  return {
    id: 'l1',
    name: 'Panel',
    kind: 'm3u',
    source: SOURCE,
    url: SOURCE,
    createdAt: '',
    urlTvg: null,
    epgUrls: [],
    autoEpgDisabled: false,
    fetchedAt: null,
    channels,
  } as LiveTvList
}

const CHANNELS = [ch('Ett'), ch('Tva', 'tva.tv'), ch('Tre')]

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __resetViewHelpersForTests()
  // Seedas MED kanaler så indexet får sitt innehåll …
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list(CHANNELS)])
  seedLiveTvIndex()
  // … och skrivs sedan om till v2-form: listmetadata utan inbäddade kanaler,
  // precis som efter migreringen. Vyn får alltså inget att läsa i lagringen.
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [
    { ...list([]), channelCount: CHANNELS.length, groups: [{ name: 'Sport', count: CHANNELS.length }] },
  ])
})

describe('LiveTvHomeOverride', () => {
  it('ritar hjältekortet ur indexet när listan saknar inbäddade kanaler', async () => {
    render(<LiveTvHomeOverride />)
    await flushLiveTvIndex()

    // Förvalet är första kanalen MED tvg-id, av totalt tre ur indexet.
    expect(screen.getByText('Tva')).toBeInTheDocument()
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })

  it('pilarna stegar genom indexets kanaler', async () => {
    render(<LiveTvHomeOverride />)
    await flushLiveTvIndex()

    fireEvent.click(screen.getByLabelText('liveTvNextChannel'))
    expect(screen.getByText('Tre')).toBeInTheDocument()
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
  })
})
