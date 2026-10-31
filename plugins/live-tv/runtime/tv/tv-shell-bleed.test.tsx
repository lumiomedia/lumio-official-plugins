import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { flushLiveTvIndex, seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => <div data-testid="player" /> }))
import { LiveTvTvShell } from './tv-shell'

/**
 * Helskärm på TV (Jerry 2026-10-31): värdens sidlåda lämnar ett svart band
 * upptill (~36 px) och nertill (~16 px), så Live TV:s bakgrund och rälsen inte
 * nådde skärmkanterna. På TV märks värdens sidlåda (`[data-tv-browse-page]`)
 * medan skalet visas, och en regel lägger den över hela skärmen.
 */
const list: LiveTvList = {
  id: 'l1', name: 'X', channels: [{ name: 'A', logo: null, group: 'G', url: 'http://x/a', tvgId: null }],
  createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null,
}
afterEach(() => { cleanup() })
beforeEach(() => {
  __resetForTests()
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  seedLiveTvIndex({ cache: { index: {}, fetchedAt: Date.now(), sources: [] } })
})
const mount = async () => {
  const props = { pageId: 'live-tv-browse', params: {}, onNavigate: () => {}, onOpenDetails: () => {} } as unknown as ComponentProps<typeof LiveTvTvShell>
  const out = render(<div data-tv-browse-page="" data-testid="host-page"><LiveTvTvShell {...props} /></div>)
  await flushLiveTvIndex()
  return out
}
const bleedRule = () => [...document.querySelectorAll('style')].map((s) => s.textContent ?? '').join('\n').split('}').find((r) => r.includes('[data-lt-bleed="1"]'))

describe('Live TV fyller skärmen på TV', () => {
  it('TV: värdens sidlåda märks och läggs över hela skärmen; märket tas bort när skalet lämnas', async () => {
    __setTvModeForTests(true)
    const out = await mount()
    const page = out.getByTestId('host-page')
    expect(page).toHaveAttribute('data-lt-bleed', '1')
    expect(bleedRule()).toMatch(/position: fixed !important/)
    expect(bleedRule()).toMatch(/inset: 0/)
    out.unmount()
    expect(page.hasAttribute('data-lt-bleed')).toBe(false)
  })
  it('skrivbord: ingenting ändras', async () => {
    __setTvModeForTests(false)
    const out = await mount()
    expect(out.getByTestId('host-page').hasAttribute('data-lt-bleed')).toBe(false)
    expect(bleedRule()).toBeUndefined()
  })
})
