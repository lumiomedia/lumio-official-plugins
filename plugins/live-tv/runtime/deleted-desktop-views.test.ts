/// <reference types="vite/client" />
import { describe, expect, it, vi } from 'vitest'

// Pagineringen kommer från värdens @heroui/react, som inte finns i testträdet.
vi.mock('./results-pagination', () => ({ ResultsPagination: () => null }))

/**
 * DE ERSATTA SKRIVBORDSVYERNA ÄR BORTA.
 *
 * `index.ts` grenade förut på `useTvMode()`: TV fick `tv/`-trädet, skrivbordet
 * och telefonen fick hubben, EPG-sidan, kanalsidan och guideoverlayen. Grenen
 * och vyerna är raderade — en kvarglömd import hade fällt pluginbygget först i
 * app-trädet (P11), långt efter att sviten sagt grönt.
 */
const DELETED = [
  'live-tv-hub',
  'live-tv-epg-page',
  'live-tv-channel-page',
  'live-tv-guide',
  'player-extras',
  'player-now-overlay',
  'player-schedule-overlay',
  'useBackToHub',
  'useIsMobileLayout',
]

// Rå källtext för hela runtime-trädet. `import.meta.glob` är vitest/vite:s egen
// väg — den behöver varken node:fs eller @types/node.
const sources = import.meta.glob('./**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

describe('de raderade skrivbordsvyerna', () => {
  it('finns inte kvar som filer', () => {
    const left = Object.keys(sources).filter((path) => DELETED.some((name) => path.endsWith(`/${name}.ts`) || path.endsWith(`/${name}.tsx`)))
    expect(left).toEqual([])
  })

  it('importeras inte längre någonstans', () => {
    const offenders: string[] = []
    for (const [path, src] of Object.entries(sources)) {
      if (path.endsWith('/deleted-desktop-views.test.ts')) continue
      for (const name of DELETED) {
        if (new RegExp(`from '[^']*/${name}'|import\\('[^']*/${name}'\\)`).test(src)) offenders.push(`${path} → ${name}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('pluginets ingång går att ladda utan dem', async () => {
    const mod = await import('./index')
    expect(mod.LiveTvPlugin.id).toBe('com.lumio.live-tv')
  })
})
