import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// The plugin entry imports live-tv-settings-section / live-tv-home-override /
// live-tv-grid which pull in @heroui/react (a Moviefinder-only dep). These
// modules aren't needed to verify the global bridge, so we stub them.
vi.mock('./live-tv-settings-section', () => ({ LiveTvSettingsSection: () => null }))
vi.mock('./live-tv-home-override', () => ({ LiveTvHomeOverride: () => null }))
vi.mock('./live-tv-grid', () => ({ LiveTvGrid: () => null }))

describe('window.__LumioLiveTvEpg bridge', () => {
  beforeEach(() => {
    delete (window as unknown as { __LumioLiveTvEpg?: unknown }).__LumioLiveTvEpg
    // Force re-evaluation of the module each test
    vi.resetModules()
  })

  afterEach(() => {
    delete (window as unknown as { __LumioLiveTvEpg?: unknown }).__LumioLiveTvEpg
  })

  it('exposes hooks on window after module load', async () => {
    await import('./index')
    expect(window.__LumioLiveTvEpg).toBeDefined()
    expect(typeof window.__LumioLiveTvEpg?.useEpgNowNextLater).toBe('function')
    expect(typeof window.__LumioLiveTvEpg?.useEpgLoadStatus).toBe('function')
    expect(window.__LumioLiveTvEpg?.version).toBe('0.3.26')
    expect(typeof window.__LumioLiveTvEpg?.useChannelSchedule).toBe('function')
  })

  it('dispatches lumio-live-tv-bridge-ready when the bridge is attached', async () => {
    const handler = vi.fn()
    window.addEventListener('lumio-live-tv-bridge-ready', handler)
    await import('./index')
    expect(handler).toHaveBeenCalledTimes(1)
    window.removeEventListener('lumio-live-tv-bridge-ready', handler)
  })
})
