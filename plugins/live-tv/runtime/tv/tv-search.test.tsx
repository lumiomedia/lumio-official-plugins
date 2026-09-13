import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { flushLiveTvIndex, seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import type { EpgCacheEntry } from '../epg/types'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => <div data-testid="player" /> }))
import { LiveTvTvShell } from './tv-shell'

const now = Date.now()
const ch = (name: string, tvgId: string | null = null) => ({ name, logo: null, group: 'Sport', url: `http://x/${name}`, tvgId })
const list: LiveTvList = { id: 'l1', name: 'X', channels: [ch('Sky Sports', 'sky.tv'), ch('ESPN')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }
const cache: EpgCacheEntry = { index: { 'sky.tv': [{ title: 'Golf Tonight', start: now + 60_000, stop: now + 120_000 }] }, fetchedAt: now, sources: [] }

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  seedLiveTvIndex({ cache: cache })
})

/** Programsökningen är fördröjd 150 ms; kanalsökningen är det inte. */
const settle = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 200)) }) }

describe('TvSearch', () => {
  it('tangenttryck filtrerar kanaler och program; OK på kanal öppnar kanaldetalj', async () => {
    const onNavigate = vi.fn()
    render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'search' }} onNavigate={onNavigate} onOpenDetails={() => {}} />)
    fireEvent.click(screen.getByText('g'))
    await settle()
    expect(within(screen.getByTestId('search-programmes')).getByText('Golf Tonight')).toBeInTheDocument()
    expect(screen.getAllByTestId('search-suggestion').some((el) => el.textContent === 'Golf Tonight')).toBe(true)
    fireEvent.click(screen.getByText('o'))
    fireEvent.click(screen.getByText('l'))
    fireEvent.click(screen.getByText('f'))
    await settle()
    expect(screen.getByTestId('search-channels')).toHaveTextContent('No results')
    fireEvent.click(within(screen.getByTestId('search-programmes')).getByText('Golf Tonight').closest('[data-f]')!)
    expect(onNavigate).toHaveBeenCalledWith(expect.objectContaining({ params: expect.objectContaining({ view: 'channel', name: 'Sky Sports', programme: String(now + 60_000) }) }))
  })
  it('kanalträffarna kommer direkt, programträffarna först efter fördröjningen', async () => {
    // Varje bokstav körde tidigare om HELA programgenomsökningen (dagens tablå
    // per kanal) synkront — på TV skrivs frågan med fjärrkontrollen och
    // tangentbordet hakade upp sig mellan trycken. Kanallistan är billig och
    // ska fortsätta svara direkt.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'search' }} onNavigate={() => {}} onOpenDetails={() => {}} />)
      // 'o' matchar både kanalen "Sky Sports" och programmet "Golf Tonight".
      fireEvent.click(screen.getByText('o'))
      // Kanalen syns omedelbart …
      expect(screen.getByTestId('search-channels')).toHaveTextContent('Sky Sports')
      // … men programsektionen har ännu inte frågat appen för den nya frågan.
      expect(screen.getByTestId('search-programmes')).not.toHaveTextContent('Golf Tonight')
      await act(async () => { vi.advanceTimersByTime(150) })
      await flushLiveTvIndex()
      expect(within(screen.getByTestId('search-programmes')).getByText('Golf Tonight')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})
