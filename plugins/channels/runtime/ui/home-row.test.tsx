import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const storage = new Map<string, unknown>()
vi.mock('@/lib/plugin-sdk', () => ({
  waitForStartIdle: () => Promise.resolve(),
  readPluginJson: (_id: string, key: string, fallback: unknown) => storage.get(key) ?? fallback,
  removePluginStorageItem: (_id: string, key: string) => { storage.delete(key) },
  writePluginJson: (_id: string, key: string, value: unknown) => { storage.set(key, value) },
  onPluginStorageChanged: () => () => {},
  queryLibrary: async () => ({ items: [{ key: 'm1', kind: 'movie', tmdbId: 1, title: 'Alien', year: 1979, genres: [], runtimeMin: 117 }] }),
  getMovieWatchlist: () => [],
  getWatchlist: () => [],
  fetchLibraryStatus: async () => ({ total: 1, sources: [] }),
  channelListDebridCloud: async () => [],
  channelResolveLibraryPlayback: async () => null,
  channelResolveTitleStream: async () => null,
  channelUnrestrictDebridFile: async () => null,
  hasChannelHost: () => true,
  useTvMode: () => false,
  useLang: () => ({ lang: 'sv' }),
  resolvePluginText: (t: { sv: string }) => t.sv,
  getPluginHomeRowTrackClass: () => 'grid',
}))

import { ChannelsHomeRow } from './home-row'
import { resetSourceSignatures } from '../host'
import { createChannel, emptyDraft } from '../model/channel'

afterEach(cleanup)
beforeEach(() => { storage.clear(); resetSourceSignatures() })

describe('hemradens komponent', () => {
  it('döljs utan kanaler på hemmet', () => {
    const { container } = render(<ChannelsHomeRow onNavigate={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it('visar ett fokusbart kort som öppnar kanalen live', async () => {
    const ch = { ...createChannel({ ...emptyDraft(), name: 'Film', sources: ['library'] }, [], 1, () => 0.1), id: 'k1' }
    storage.set('channels', [ch])
    const onNavigate = vi.fn()
    render(<ChannelsHomeRow onNavigate={onNavigate} />)
    expect(screen.getByRole('heading', { name: 'Sänds nu på LumioTV' })).toBeTruthy()
    const card = await screen.findByRole('button', { name: /Alien/ })
    expect(card.hasAttribute('data-f')).toBe(true)
    fireEvent.click(card)
    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'channels', params: { channelId: 'k1', play: 'live' } })
    fireEvent.click(screen.getByRole('button', { name: /VISA TABLÅ/ }))
    expect(onNavigate).toHaveBeenLastCalledWith({ pageId: 'channels' })
    await waitFor(() => expect(screen.getByText(/MIN KVAR/)).toBeTruthy())
  })
})
