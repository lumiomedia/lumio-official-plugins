import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { writePluginJson, __resetForTests } from '@/lib/plugin-sdk'

vi.mock('./live-tv-player', () => ({ LiveTvPlayer: () => <div data-testid="player" /> }))
// Pagineringen kommer från värdens @heroui/react, som inte finns i testträdet.
vi.mock('./results-pagination', () => ({ ResultsPagination: () => null }))

import { LiveTvGrid } from './live-tv-grid'
import { LIVE_TV_PLUGIN_ID } from './live-tv-data'

const PLAYLIST_URL = 'http://example.test/playlist.m3u8'
const CHANNELS = [
  {
    name: 'Kanal 1',
    logo: null,
    group: 'Sport',
    url: 'http://example.test/1.m3u8',
    tvgId: null,
    key: 'Kanal 1::http://example.test/1.m3u8',
    number: 1,
    tvgIdResolved: null,
  },
]

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  __resetForTests()
  writePluginJson(LIVE_TV_PLUGIN_ID, 'm3u_urls', [PLAYLIST_URL])
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ items: CHANNELS, total: CHANNELS.length, known: true }),
    })),
  )
})

describe('rutnätets guideknapp', () => {
  it('navigerar till bläddringssidans guidevy i stället för en egen overlay', async () => {
    const onNavigate = vi.fn()
    render(<LiveTvGrid onNavigate={onNavigate} />)

    const guide = await screen.findByRole('button', { name: /liveTvOpenGuide/i })
    fireEvent.click(guide)

    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'guide' } })
    // Ingen plugin-egen guide monteras längre i rutnätet.
    expect(document.querySelector('[data-testid="live-tv-guide"]')).toBeNull()
  })

  it('är passiv utan onNavigate — den öppnar aldrig en egen vy', async () => {
    render(<LiveTvGrid />)
    const guide = await screen.findByRole('button', { name: /liveTvOpenGuide/i })
    expect(() => fireEvent.click(guide)).not.toThrow()
  })
})
