import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { flushLiveTvIndex, seedLiveTvIndex } from '../src/__test-stubs__/live-tv-index'
import { getM3uFetchProgress, resetM3uFetchProgressForTests, subscribeM3uFetch } from './m3u-fetch-progress'

vi.mock('./live-tv-player', () => ({ LiveTvPlayer: () => <div data-testid="player" /> }))
// Pagineringen kommer från värdens @heroui/react, som inte finns i testträdet.
vi.mock('./results-pagination', () => ({ ResultsPagination: () => null }))

import * as liveTvData from './live-tv-data'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from './live-tv-data'
import { LiveTvGrid } from './live-tv-grid'

const PLAYLIST_URL = 'http://example.test/playlist.m3u'

const ch = (name: string, group = 'Sport') => ({
  name,
  logo: null,
  group,
  url: `http://example.test/${name}.m3u8`,
  tvgId: null,
})

function rawList(overrides: Partial<LiveTvList> & { id: string; name: string }): LiveTvList {
  return {
    createdAt: '',
    urlTvg: null,
    epgUrls: [],
    autoEpgDisabled: false,
    fetchedAt: null,
    channels: [],
    ...overrides,
  } as LiveTvList
}

const imported = rawList({
  id: 'l1',
  name: 'Importerad panel',
  kind: 'm3u',
  source: PLAYLIST_URL,
  url: PLAYLIST_URL,
  channels: [ch('Kanal A'), ch('Kanal B')],
})
const custom = rawList({
  id: 'l2',
  name: 'Mina kanaler',
  kind: 'custom',
  source: 'custom:l2',
  channels: [ch('Kanal A')],
})

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  resetM3uFetchProgressForTests()
  writePluginJson(LIVE_TV_PLUGIN_ID, 'm3u_urls', [PLAYLIST_URL])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [imported, custom])
  seedLiveTvIndex()
})

afterEach(() => {
  vi.restoreAllMocks()
})

const mount = async () => {
  const rendered = render(<LiveTvGrid />)
  await flushLiveTvIndex()
  return rendered
}

describe('LiveTvGrid: listor', () => {
  it('"Lägg till i lista" erbjuder bara manuellt skapade listor', async () => {
    await mount()
    // Kanalen läggs inbäddad i listan. För en importerad lista skrivs den över
    // vid nästa hämtning — och lägger tillbaka kanalnyttolast i lagringen som
    // v2 just tömt. Bara `custom`-listor får därför synas här.
    fireEvent.click(screen.getAllByTitle('liveTvAddToList')[0])
    const picker = await screen.findByTestId('list-picker')
    expect(picker).toHaveTextContent('Mina kanaler')
    expect(picker).not.toHaveTextContent('Importerad panel')
  })

  it('Uppdatera kör importjobbet för de importerade listorna, inte för de manuella', async () => {
    // Jobbets förlopp ska nå den delade raden: en 17 000-kanalspanel tar
    // tiotals sekunder inom ETT steg i kön, och utan `received/total` står
    // knappen bara och snurrar.
    const reported: Array<{ received: number; total: number | null } | null> = []
    const off = subscribeM3uFetch(() => reported.push(getM3uFetchProgress().jobProgress))
    const importSpy = vi.spyOn(liveTvData, 'importList').mockImplementation(async (_list, onProgress) => {
      onProgress?.({ state: 'fetching', received: 12_000, total: 17_000 })
      return { state: 'done', received: 17_000, total: 17_000, result: { total: 17_000, groups: [], urlTvg: null, truncated: false } }
    })

    await mount()
    fireEvent.click(screen.getByLabelText('refreshStatus'))

    await waitFor(() => expect(importSpy).toHaveBeenCalledTimes(1))
    expect(importSpy.mock.calls[0][0]).toMatchObject({ id: 'l1', kind: 'm3u', source: PLAYLIST_URL })
    expect(reported).toContainEqual({ received: 12_000, total: 17_000 })
    off()
  })

  it('ett importfel visar jobbets EGEN text, inte den generiska m3u-strängen', async () => {
    vi.spyOn(liveTvData, 'importList').mockResolvedValue({
      state: 'error',
      received: 0,
      error: 'could not resolve host a.tld',
    })

    await mount()
    fireEvent.click(screen.getByLabelText('refreshStatus'))

    expect(await screen.findByText(/could not resolve host a.tld/)).toBeInTheDocument()
  })
})
