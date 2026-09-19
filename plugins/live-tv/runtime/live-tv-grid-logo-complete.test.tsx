import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { flushLiveTvIndex, seedLiveTvIndex } from '../src/__test-stubs__/live-tv-index'
import { resetM3uFetchProgressForTests } from './m3u-fetch-progress'

vi.mock('./live-tv-player', () => ({ LiveTvPlayer: () => <div data-testid="player" /> }))
// Pagineringen kommer från värdens @heroui/react, som inte finns i testträdet.
vi.mock('./results-pagination', () => ({ ResultsPagination: () => null }))

// completeLogos gör ett riktigt nätverksanrop i produktionskoden — testerna
// ersätter den med en spion, samma mönster som `live-tv-settings-section.test.tsx`.
vi.mock('./index-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./index-client')>()
  return { ...actual, completeLogos: vi.fn() }
})

import { LIVE_TV_PLUGIN_ID, type LiveTvList } from './live-tv-data'
import { completeLogos } from './index-client'
import { LiveTvGrid } from './live-tv-grid'

const PLAYLIST_URL = 'http://example.test/playlist.m3u'

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
  channels: [],
})

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  resetM3uFetchProgressForTests()
})

afterEach(() => {
  vi.mocked(completeLogos).mockReset()
})

const mount = async () => {
  const rendered = render(<LiveTvGrid />)
  await flushLiveTvIndex()
  return rendered
}

/**
 * Komplettera-knappen bor sedan denna omgång direkt i Live TV-vyn (den
 * administrativa raden ovanför rutnätet, bredvid "Skapa lista"), inte bara i
 * inställningarna — Jerrys ord efter test: "borde vara ... direkt i live
 * ... där man klickar på en knapp, komplettera logos".
 */
describe('LiveTvGrid: komplettera logotyper direkt i vyn', () => {
  it('knappen finns i vyn, kompletterar den synliga listan och visar kvittot', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'm3u_urls', [PLAYLIST_URL])
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [imported])
    seedLiveTvIndex()
    vi.mocked(completeLogos).mockResolvedValue({ matched: 5, total: 8 })
    await mount()

    fireEvent.click(screen.getByTestId('live-tv-logo-complete'))
    expect(completeLogos).toHaveBeenCalledWith(PLAYLIST_URL)
    // Teststubbens useLang()/useHubText() ligger fast på 'en' — samma fälla
    // som redan dokumenterad i `live-tv-settings-section.test.tsx`.
    expect(await screen.findByText(/5 of 8/)).toBeInTheDocument()
  })

  it('visar appens egen feltext, inte en generisk sådan', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'm3u_urls', [PLAYLIST_URL])
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [imported])
    seedLiveTvIndex()
    vi.mocked(completeLogos).mockRejectedValue(new Error('iptv-org svarade 503'))
    await mount()

    fireEvent.click(screen.getByTestId('live-tv-logo-complete'))
    expect(await screen.findByRole('alert')).toHaveTextContent('iptv-org svarade 503')
  })

  it('är avstängd för en lista av typen custom', async () => {
    // `m3u_urls` sätts bara för att undvika vyns tomma läge (den kräver minst
    // en adress, oavsett `lists`) — ingen m3u-lista skapas av den.
    writePluginJson(LIVE_TV_PLUGIN_ID, 'm3u_urls', [PLAYLIST_URL])
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [
      rawList({ id: 'c1', name: 'Mina kanaler', kind: 'custom', source: 'custom:c1', channels: [] }),
    ])
    seedLiveTvIndex()
    await mount()
    expect(screen.getByTestId('live-tv-logo-complete')).toBeDisabled()
  })

  it('är avstängd när listans switch är av', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'm3u_urls', [PLAYLIST_URL])
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ ...imported, logoFallbackEnabled: false }])
    seedLiveTvIndex()
    await mount()
    expect(screen.getByTestId('live-tv-logo-complete')).toBeDisabled()
  })

  it('är avstängd medan en komplettering pågår', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'm3u_urls', [PLAYLIST_URL])
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [imported])
    seedLiveTvIndex()
    let resolveComplete!: (value: { matched: number; total: number }) => void
    vi.mocked(completeLogos).mockReturnValue(new Promise((resolve) => { resolveComplete = resolve }))
    await mount()

    fireEvent.click(screen.getByTestId('live-tv-logo-complete'))
    await waitFor(() => expect(screen.getByTestId('live-tv-logo-complete')).toBeDisabled())
    resolveComplete({ matched: 1, total: 1 })
    await waitFor(() => expect(screen.getByTestId('live-tv-logo-complete')).not.toBeDisabled())
  })
})

/**
 * Granskningsfynd (Important) på flerlistefallet: knappen kör alla listor
 * vars switch är på när ingen flik är vald, men gav bara ett odifferentierat
 * "pågår" — ingen omfattning, inget framsteg, och ett fel mitt i körningen
 * dolde delresultatet från de listor som redan hann bli klara.
 */
describe('LiveTvGrid: komplettera logotyper över flera listor', () => {
  const list2 = rawList({
    id: 'l2',
    name: 'Panel 2',
    kind: 'm3u',
    source: 'http://example.test/playlist-2.m3u',
    url: 'http://example.test/playlist-2.m3u',
    channels: [],
  })
  const list3 = rawList({
    id: 'l3',
    name: 'Panel 3',
    kind: 'm3u',
    source: 'http://example.test/playlist-3.m3u',
    url: 'http://example.test/playlist-3.m3u',
    channels: [],
  })

  it('visar omfattningen direkt och räknar upp framsteget lista för lista', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'm3u_urls', [PLAYLIST_URL])
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [imported, list2, list3])
    seedLiveTvIndex()
    const resolvers: Array<(value: { matched: number; total: number }) => void> = []
    vi.mocked(completeLogos).mockImplementation(() => new Promise((resolve) => { resolvers.push(resolve) }))
    await mount()

    fireEvent.click(screen.getByTestId('live-tv-logo-complete'))
    // Omfattningen (3 listor) ska synas direkt — innan någon lista hunnit bli
    // klar — annars ser en flerlistekörning ut som att appen hänger.
    await waitFor(() => expect(screen.getByTestId('live-tv-logo-complete')).toHaveTextContent('1 of 3'))

    resolvers[0]({ matched: 1, total: 1 })
    await waitFor(() => expect(screen.getByTestId('live-tv-logo-complete')).toHaveTextContent('2 of 3'))

    resolvers[1]({ matched: 1, total: 1 })
    await waitFor(() => expect(screen.getByTestId('live-tv-logo-complete')).toHaveTextContent('3 of 3'))

    resolvers[2]({ matched: 1, total: 1 })
    await waitFor(() => expect(screen.getByTestId('live-tv-logo-complete')).not.toBeDisabled())
  })

  it('en enda lista ser fortfarande ut som idag — ingen "1 av 1"', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'm3u_urls', [PLAYLIST_URL])
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [imported])
    seedLiveTvIndex()
    let resolveComplete!: (value: { matched: number; total: number }) => void
    vi.mocked(completeLogos).mockReturnValue(new Promise((resolve) => { resolveComplete = resolve }))
    await mount()

    fireEvent.click(screen.getByTestId('live-tv-logo-complete'))
    await waitFor(() => expect(screen.getByTestId('live-tv-logo-complete')).toHaveTextContent(/completing/i))
    expect(screen.getByTestId('live-tv-logo-complete')).not.toHaveTextContent(/of 1/i)
    resolveComplete({ matched: 1, total: 1 })
  })

  it('redovisar delresultatet och appens ordagranna feltext vid fel mitt i körningen', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'm3u_urls', [PLAYLIST_URL])
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [imported, list2, list3])
    seedLiveTvIndex()
    vi.mocked(completeLogos)
      .mockResolvedValueOnce({ matched: 2, total: 2 })
      .mockRejectedValueOnce(new Error('iptv-org svarade 503 mitt i listan'))
    await mount()

    fireEvent.click(screen.getByTestId('live-tv-logo-complete'))
    const alert = await screen.findByRole('alert')
    // Den första listan (imported) hann bli klar innan den andra (list2)
    // föll — delresultatet (1 av 3) ska synas TILLSAMMANS med appens egen,
    // ordagranna feltext, inte i stället för den.
    expect(alert).toHaveTextContent('1 of 3')
    expect(alert).toHaveTextContent('iptv-org svarade 503 mitt i listan')
  })
})
