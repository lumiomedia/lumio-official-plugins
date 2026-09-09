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
    expect(typeof window.__LumioLiveTvEpg?.useChannelSchedule).toBe('function')
  })

  /*
   * Versionen jämförs mot manifestet, inte mot en inskriven sträng.
   *
   * Assertionen var `toBe('0.3.29')`. Den gjorde motsatsen till sitt jobb: när
   * pluginet släpptes vidare stod literalerna i runtime/index.ts still, och
   * testet höll dem där — pluginet rapporterade 0.3.29 till appen ända fram
   * till 0.3.45. Versionsdrift mellan manifest och kod är just det som fick
   * publicerad och bundlad Live TV att glida ifrån varandra, så den jämförelsen
   * hör hemma i en grind.
   */
  it('bryggan och plugin-objektet rapporterar manifestets version', async () => {
    const mod = await import('./index')
    const manifest = (await import('../plugin.json')).default as { version: string }
    expect(mod.LiveTvPlugin.version).toBe(manifest.version)
    expect(window.__LumioLiveTvEpg?.version).toBe(manifest.version)
  })

  it('dispatches lumio-live-tv-bridge-ready when the bridge is attached', async () => {
    const handler = vi.fn()
    window.addEventListener('lumio-live-tv-bridge-ready', handler)
    await import('./index')
    expect(handler).toHaveBeenCalledTimes(1)
    window.removeEventListener('lumio-live-tv-bridge-ready', handler)
  })
})
