import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { writePluginJson } from '@/lib/plugin-sdk'
import type { EpgCacheEntry } from './epg/types'

vi.mock('./hooks/useLiveTvEpgCache', () => ({ useLiveTvEpgCache: vi.fn(() => null) }))
vi.mock('./live-tv-player', () => ({ LiveTvPlayer: () => <div data-testid="player" /> }))

import { useLiveTvEpgCache } from './hooks/useLiveTvEpgCache'
import { LiveTvHub, flattenChannels, topGroups } from './live-tv-hub'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from './live-tv-data'
import { recordChannelWatch, clearChannelHistory } from './channel-history'

const channel = (name: string, group: string, tvgId: string | null = null) => ({
  name,
  logo: null,
  group,
  url: `http://example.test/${name.replace(/\s+/g, '-').toLowerCase()}`,
  tvgId,
})

const list: LiveTvList = {
  id: 'list-1',
  name: 'Test',
  createdAt: '2026-09-02T00:00:00Z',
  urlTvg: 'http://example.test/epg.xml',
  epgUrls: [],
  channels: [
    channel('SVT1', 'Nyheter', 'svt1.se'),
    channel('TV4', 'Underhållning'),
    channel('Eurosport', 'Sport'),
    channel('Viasat Sport', 'Sport'),
    channel('=== Sweden ===', 'Sport'),
  ],
} as LiveTvList

function seedCache(nowMs: number): EpgCacheEntry {
  return {
    index: {
      'svt1.se': [
        { title: 'Rapport', start: nowMs - 10 * 60_000, stop: nowMs + 20 * 60_000 },
        { title: 'Kulturnyheterna', start: nowMs + 20 * 60_000, stop: nowMs + 40 * 60_000 },
      ],
    },
    fetchedAt: nowMs,
    sources: ['http://example.test/epg.xml'],
  }
}

// Utan globals städar inte testing-library själv mellan testerna.
afterEach(cleanup)

beforeEach(() => {
  clearChannelHistory()
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  vi.mocked(useLiveTvEpgCache).mockReturnValue(null)
})

describe('LiveTvHub helpers', () => {
  it('flattens playable channels and drops separator rows', () => {
    const flat = flattenChannels([list])
    expect(flat.map((c) => c.name)).toEqual(['SVT1', 'TV4', 'Eurosport', 'Viasat Sport'])
    expect(topGroups(flat)).toEqual(['Sport', 'Nyheter', 'Underhållning'])
  })
})

describe('LiveTvHub', () => {
  it('shows the empty state when no lists exist', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [])
    render(<LiveTvHub onOpenGrid={() => {}} />)
    expect(screen.getByText('No channels yet')).toBeInTheDocument()
  })

  it('renders the hero from the EPG cache, favourites and history', () => {
    const now = Date.now()
    vi.mocked(useLiveTvEpgCache).mockReturnValue(seedCache(now))
    writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', ['SVT1::http://example.test/svt1'])
    recordChannelWatch(channel('Eurosport', 'Sport'), 'global', now - 60_000)
    render(<LiveTvHub onOpenGrid={() => {}} />)

    // Hero: favourite with a running programme wins.
    expect(screen.getAllByText('Rapport').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Next: .*Kulturnyheterna/).length).toBeGreaterThan(0)
    // Favourites section shows the pinned channel; history shows Eurosport.
    expect(screen.getByText('Your favourite channels')).toBeInTheDocument()
    expect(screen.getByText('Continue watching')).toBeInTheDocument()
    expect(screen.getAllByText('Eurosport').length).toBeGreaterThan(0)
    // Recommended: Viasat Sport shares the group with the watched channel.
    expect(screen.getByText('You often watch Sport')).toBeInTheDocument()
    expect(screen.getAllByText('Viasat Sport').length).toBeGreaterThan(0)
  })

  it('filters the channel list by group chip and opens the grid on demand', () => {
    const onOpenGrid = vi.fn()
    render(<LiveTvHub onOpenGrid={onOpenGrid} />)
    // Gruppchipsen renderas först i DOM:en; kanalrader kan bära samma gruppnamn.
    fireEvent.click(screen.getAllByRole('button', { name: 'Nyheter' })[0])
    expect(screen.getAllByText('SVT1').length).toBeGreaterThan(0)
    expect(screen.queryByText('Eurosport')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'All channels' }))
    expect(onOpenGrid).toHaveBeenCalledTimes(1)
  })

  it('opens the player when a channel is chosen', async () => {
    render(<LiveTvHub onOpenGrid={() => {}} />)
    fireEvent.click(screen.getAllByRole('button', { name: /TV4/ })[0])
    expect(await screen.findByTestId('player')).toBeInTheDocument()
  })
})
