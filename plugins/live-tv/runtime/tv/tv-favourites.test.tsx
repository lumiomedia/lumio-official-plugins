import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, channelKey, getPinnedLiveTvKeys, type LiveTvList } from '../live-tv-data'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => <div data-testid="player" /> }))
import { LiveTvTvShell } from './tv-shell'

const ch = (name: string) => ({ name, logo: null, group: 'Sport', url: `http://x/${name}`, tvgId: null })
const list: LiveTvList = { id: 'l1', name: 'Xtream', channels: [ch('A'), ch('B'), ch('C')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [channelKey(ch('A')), channelKey(ch('B'))])
  seedLiveTvIndex()
})

const mount = (onNavigate = vi.fn()) => { render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'favs' }} onNavigate={onNavigate} onOpenDetails={() => {}} />); return onNavigate }

describe('TvFavourites', () => {
  it('visar favoriterna numrerade i sparad ordning', () => {
    mount()
    const cards = screen.getAllByTestId('fav-card')
    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveTextContent('1 · A')
    expect(cards[1]).toHaveTextContent('2 · B')
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
  })
  it('håll OK ger Flytta ner som flyttar ordningen', async () => {
    vi.useFakeTimers()
    mount()
    const first = screen.getAllByTestId('fav-card')[0]
    fireEvent.keyDown(first, { key: 'Enter' })
    vi.advanceTimersByTime(700)
    fireEvent.keyUp(first, { key: 'Enter' })
    vi.useRealTimers()
    fireEvent.click(await screen.findByText('Move down'))
    expect(getPinnedLiveTvKeys()).toEqual([channelKey(ch('B')), channelKey(ch('A'))])
  })
  it('Lägg till från guiden navigerar till guiden', () => {
    const onNavigate = mount()
    fireEvent.click(screen.getByText('+ Add from the guide'))
    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'guide', group: 'all' } })
  })
})

// Jerrys uppföljning: fjärrhjälpen ska bort HELT — även i TV-läge, ingen
// ersättningstext någonstans.
describe('TvFavourites fjärrhjälp (borttagen, Jerrys uppföljning)', () => {
  it('renderas aldrig, varken i TV-läge eller utanför', () => {
    __setTvModeForTests(true)
    mount()
    expect(screen.queryByText(/OK = watch · hold OK = move up\/down/)).not.toBeInTheDocument()
    cleanup()
    __setTvModeForTests(false)
    mount()
    expect(screen.queryByText(/OK = watch · hold OK = move up\/down/)).not.toBeInTheDocument()
  })
})
