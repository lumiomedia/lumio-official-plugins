import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import type { EpgCacheEntry } from '../epg/types'

vi.mock('../hooks/useLiveTvEpgCache', () => ({ useLiveTvEpgCache: vi.fn(() => null) }))
vi.mock('../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))
import { useLiveTvEpgCache } from '../hooks/useLiveTvEpgCache'
import { LiveTvTvShell } from './tv-shell'

const now = Date.now()
const ch = (name: string, group: string, tvgId: string | null = null) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId })
const list: LiveTvList = { id: 'l1', name: 'Xtream', channels: [ch('A', 'Sport', 'a.tv'), ch('B', 'Sport'), ch('C', 'News')], createdAt: '', urlTvg: 'http://x/epg', epgUrls: [], autoEpgDisabled: false, fetchedAt: null }
const cache: EpgCacheEntry = {
  index: { 'a.tv': [
    { title: 'Now A', start: now - 10 * 60_000, stop: now + 20 * 60_000 },
    { title: 'Next A', start: now + 20 * 60_000, stop: now + 50 * 60_000 },
    { title: 'Later A', start: now + 50 * 60_000, stop: now + 80 * 60_000 },
  ] },
  fetchedAt: now, sources: ['http://x/epg'],
}

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  vi.mocked(useLiveTvEpgCache).mockReturnValue(cache)
})

const mount = (params: Record<string, string> = { view: 'guide' }) => render(<LiveTvTvShell pageId="live-tv-browse" params={params} onNavigate={() => {}} onOpenDetails={() => {}} />)

describe('TvGuide', () => {
  it('visar Nu/Sen/Senare för kanalen med tablå och tomtext för de utan', () => {
    mount()
    expect(screen.getByText('Now A')).toBeInTheDocument()
    expect(screen.getByText('Next A')).toBeInTheDocument()
    expect(screen.getByText('Later A')).toBeInTheDocument()
    expect(screen.getAllByText('No programme information').length).toBeGreaterThan(0)
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
  })
  it('fokus på en rad uppdaterar toppbandet', () => {
    mount()
    const rows = screen.getAllByTestId('guide-row')
    fireEvent.focus(rows[2])
    expect(screen.getByTestId('guide-headline')).toHaveTextContent('C')
  })
  it('segmentväxeln byter till tablåläge med nu-linje', () => {
    mount()
    fireEvent.click(screen.getByText('Timeline'))
    expect(screen.getByTestId('now-line')).toBeInTheDocument()
    expect(screen.getByText('Now A')).toBeInTheDocument()
  })
  it('OK på raden spelar kanalen', async () => {
    mount()
    fireEvent.click(screen.getAllByTestId('guide-row')[1])
    expect(await screen.findByTestId('player')).toHaveTextContent('B')
  })
  it('okänd group-parameter faller tillbaka till Alla i stället för en tom vy', () => {
    mount({ view: 'guide', group: 'Nonexistent' })
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
    expect(screen.getAllByTestId('guide-row')).toHaveLength(3)
  })
})
