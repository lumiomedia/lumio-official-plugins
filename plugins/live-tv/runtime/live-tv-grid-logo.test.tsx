import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import * as sdk from '@/lib/plugin-sdk'
import { writePluginJson, __resetForTests } from '@/lib/plugin-sdk'
import { __resetLogoQueueForTests } from './live-tv-logo-image'

vi.mock('./live-tv-player', () => ({ LiveTvPlayer: () => <div data-testid="player" /> }))
// Pagineringen kommer från värdens @heroui/react, som inte finns i testträdet.
vi.mock('./results-pagination', () => ({ ResultsPagination: () => null }))

import { LiveTvGrid } from './live-tv-grid'
import { LIVE_TV_PLUGIN_ID } from './live-tv-data'

const PLAYLIST_URL = 'http://example.test/playlist.m3u8'

const CHANNELS = [
  {
    name: 'Med reserv',
    logo: 'http://p/a.png',
    logoFallback: 'http://p/b.png',
    group: 'Sport',
    url: 'http://example.test/1.m3u8',
    tvgId: null,
    key: 'Med reserv::http://example.test/1.m3u8',
    number: 1,
    tvgIdResolved: null,
  },
  {
    name: 'Bara reserv',
    logo: null,
    logoFallback: 'http://p/c.png',
    group: 'Sport',
    url: 'http://example.test/2.m3u8',
    tvgId: null,
    key: 'Bara reserv::http://example.test/2.m3u8',
    number: 2,
    tvgIdResolved: null,
  },
  {
    name: 'Ingen logotyp',
    logo: null,
    logoFallback: null,
    group: 'Sport',
    url: 'http://example.test/3.m3u8',
    tvgId: null,
    key: 'Ingen logotyp::http://example.test/3.m3u8',
    number: 3,
    tvgIdResolved: null,
  },
]

afterEach(cleanup)
afterEach(() => {
  vi.restoreAllMocks()
})

beforeEach(() => {
  __resetLogoQueueForTests()
  __resetForTests()
  writePluginJson(LIVE_TV_PLUGIN_ID, 'm3u_urls', [PLAYLIST_URL])
  // happy-dom har en riktig IntersectionObserver som aldrig rapporterar
  // intersection i test — utan den odefinierad hänger kortets logotyp i
  // laddkön för evigt och `src`-attributet sätts aldrig.
  vi.stubGlobal('IntersectionObserver', undefined)
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ items: CHANNELS, total: CHANNELS.length, known: true }),
    })),
  )
  // Preload-nätet simuleras aldrig i happy-dom: tvinga alla nedladdningar
  // att lyckas så förladdningslistans URL:er faktiskt hinner fram till kortet.
  vi.spyOn(sdk, 'preloadPluginImage').mockResolvedValue(true as unknown as void)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('kanalkortets förladdning av reservlogotypen', () => {
  it('kanalkortet skickar med reserven i förladdningslistan', async () => {
    render(<LiveTvGrid />)
    const img = await screen.findByAltText('Med reserv')
    // Bildens `src` sätts i en egen passiv effekt (LiveTvLogoImage) EFTER att
    // elementet redan hunnit in i trädet — vänta in den innan vi läser den.
    await waitFor(() => expect(img.getAttribute('src')).not.toBeNull())
    expect(img.getAttribute('src')).toContain(encodeURIComponent('http://p/a.png'))
  })

  it('kanal utan leverantörslogotyp går direkt på reserven', async () => {
    render(<LiveTvGrid />)
    const img = await screen.findByAltText('Bara reserv')
    await waitFor(() => expect(img.getAttribute('src')).not.toBeNull())
    expect(img.getAttribute('src')).toContain(encodeURIComponent('http://p/c.png'))
  })

  it('kanal utan både och visar ingen förladdad logotyp', async () => {
    render(<LiveTvGrid />)
    // De andra kanalernas bilder hinner fram — det är beviset på att
    // förladdningen kört klart och att den tredje kanalen medvetet uteblir.
    await screen.findByAltText('Med reserv')
    expect(screen.queryByAltText('Ingen logotyp')).toBeNull()
  })
})
