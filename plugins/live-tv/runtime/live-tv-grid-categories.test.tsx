import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { writePluginJson, __resetForTests } from '@/lib/plugin-sdk'

vi.mock('./hooks/useLiveTvEpgCache', () => ({ useLiveTvEpgCache: vi.fn(() => null) }))
vi.mock('./live-tv-player', () => ({ LiveTvPlayer: () => <div data-testid="player" /> }))
// Pagineringen kommer från värdens @heroui/react, som inte finns i testträdet.
vi.mock('./results-pagination', () => ({ ResultsPagination: () => null }))

import { LiveTvGrid } from './live-tv-grid'
import { LIVE_TV_PLUGIN_ID } from './live-tv-data'

const PLAYLIST_URL = 'http://example.test/playlist.m3u8'

/** Free-TV-spellistan har 97 grupper — fler än någon telefonskärm rymmer. */
const CATEGORIES = Array.from({ length: 97 }, (_, i) => `Land ${String(i + 1).padStart(2, '0')}`)

const CHANNELS = CATEGORIES.map((group, i) => ({
  name: `Kanal ${i + 1}`,
  logo: null,
  group,
  url: `http://example.test/${i + 1}.m3u8`,
  tvgId: null,
  key: `Kanal ${i + 1}::http://example.test/${i + 1}.m3u8`,
  number: i + 1,
  tvgIdResolved: null,
}))

afterEach(cleanup)

beforeEach(() => {
  __resetForTests()
  writePluginJson(LIVE_TV_PLUGIN_ID, 'm3u_urls', [PLAYLIST_URL])
  // Kanalerna bor i appens index sedan v2 — grid.tsx läser dem via
  // `loadAllChannels` (index-client), inte längre `channels:`-nyckeln.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ items: CHANNELS, total: CHANNELS.length, known: true }),
    })),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('kategorimenyn på en telefonskärm', () => {
  it('får ett höjdtak och egen rullning så alla grupper går att nå', async () => {
    render(<LiveTvGrid />)

    const trigger = await screen.findByRole('button', { name: /allCategories/i })
    fireEvent.click(trigger)

    const item = await screen.findByRole('button', { name: 'Land 97' })
    const panel = item.parentElement as HTMLElement

    // Layout finns inte i happy-dom, så taket och rullningen kontrolleras
    // på klasserna — det är dem regressionen skulle ta bort.
    expect(panel.className).toContain('overflow-y-auto')
    expect(panel.className).toContain('max-h-[min(60vh,360px)]')
    expect(panel.className).not.toContain('overflow-hidden')
  })
})
