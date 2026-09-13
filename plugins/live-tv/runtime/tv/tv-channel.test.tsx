import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import type { EpgCacheEntry } from '../epg/types'

vi.mock('../hooks/useLiveTvEpgCache', () => ({ useLiveTvEpgCache: vi.fn(() => null) }))
vi.mock('../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string; url: string } }) => <div data-testid="player">{channel.name}|{channel.url}</div> }))
import { useLiveTvEpgCache } from '../hooks/useLiveTvEpgCache'
import { getReminders } from '../reminders'
import { LiveTvTvShell } from './tv-shell'

const now = Date.now()
const H = 3_600_000
const channel = { name: 'ESPN', logo: null, group: 'Sport', url: 'http://x/espn', tvgId: 'espn.tv', archive: { days: 3, streamId: 7, base: 'http://panel', username: 'u', password: 'p' } }
const list: LiveTvList = { id: 'l1', name: 'Xtream', channels: [channel], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }
const cache: EpgCacheEntry = { index: { 'espn.tv': [
  { title: 'Morning', start: now - 5 * H, stop: now - 4 * H, description: 'Old' },
  { title: 'GameDay', start: now - H, stop: now + H, description: 'Live now' },
  { title: 'Football', start: now + H, stop: now + 2 * H },
] }, fetchedAt: now, sources: [] }

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  vi.mocked(useLiveTvEpgCache).mockReturnValue(cache)
})

const params = { view: 'channel', url: channel.url, name: channel.name, logo: '', group: channel.group, tvgId: channel.tvgId }
const mount = (extra: Record<string, string> = {}) => render(<LiveTvTvShell pageId="live-tv-browse" params={{ ...params, ...extra }} onNavigate={() => {}} onOpenDetails={() => {}} />)

describe('TvChannel', () => {
  it('pågående program är förvalt och primärknappen är Titta nu', () => {
    mount()
    expect(document.querySelector('[data-init]')).toHaveTextContent('GameDay')
    expect(screen.getByTestId('primary-action')).toHaveTextContent('Watch now')
    expect(screen.getByTestId('detail')).toHaveTextContent('Live now')
  })
  it('fokus på passerat program ger Spela repris som spelar timeshift-URL', async () => {
    mount()
    fireEvent.focus(screen.getByText('Morning').closest('[data-f]')!)
    expect(screen.getByTestId('primary-action')).toHaveTextContent('Play replay')
    fireEvent.click(screen.getByTestId('primary-action'))
    expect(await screen.findByTestId('player')).toHaveTextContent('/timeshift/')
  })
  it('fokus på framtida program ger Påminn mig som togglar påminnelse', () => {
    mount()
    fireEvent.focus(screen.getByText('Football').closest('[data-f]')!)
    fireEvent.click(screen.getByTestId('primary-action'))
    expect(getReminders(now)).toHaveLength(1)
    expect(screen.getByTestId('primary-action')).toHaveTextContent('Remove reminder')
  })
  it('programme-param förväljer raden', () => {
    mount({ programme: String(now + H) })
    expect(document.querySelector('[data-init]')).toHaveTextContent('Football')
  })
  it('oupplösbar kanal ger en fokuserbar station som går tillbaka', () => {
    // Utan `url` finns ingen kanal att visa. Den gamla grenen ritade bara en
    // textrad: noll stationer, alltså ingen `data-init` — värdens fokusmotor
    // hade ingen startpunkt och fjärrkontrollen låste sig på en tom skärm.
    const onNavigate = vi.fn()
    render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'channel' }} onNavigate={onNavigate} onOpenDetails={() => {}} />)
    const station = screen.getByTestId('channel-unresolved')
    expect(station).toHaveAttribute('data-init')
    expect(station).toHaveTextContent('No programme information')
    fireEvent.click(station)
    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'guide' } })
  })
  it('dagväljaren har fem dagar och Idag är vald', () => {
    mount()
    expect(screen.getAllByTestId('day-btn')).toHaveLength(5)
    expect(screen.getByTestId('day-btn-0')).toHaveTextContent(/Today|Idag|\w{3}/)
  })
})
