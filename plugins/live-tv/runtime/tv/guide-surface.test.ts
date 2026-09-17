import { beforeEach, describe, expect, it } from 'vitest'
import { __resetForTests, __setDesktopTauriEnvForTests, __setTvModeForTests } from '@/lib/plugin-sdk'
import { desktopGuideMode, isDesktopTauri, useNewGuideSurface } from './guide-surface'
import type { GuideMode } from './tv-settings-store'

beforeEach(() => __resetForTests())

describe('isDesktopTauri', () => {
  it('läser stubbens flagga defensivt', () => {
    expect(isDesktopTauri()).toBe(false)
    __setDesktopTauriEnvForTests(true)
    expect(isDesktopTauri()).toBe(true)
  })
})

describe('desktopGuideMode', () => {
  const cases: [GuideMode, 'grid' | 'nownext' | 'timeline'][] = [
    ['now', 'nownext'],
    ['tl', 'nownext'],
    ['playlists', 'grid'],
    ['grid', 'grid'],
    ['nownext', 'nownext'],
    ['timeline', 'timeline'],
  ]
  for (const [stored, expected] of cases) {
    it(`${stored} → ${expected}`, () => {
      expect(desktopGuideMode(stored)).toBe(expected)
    })
  }
})

/**
 * `useNewGuideSurface` är själva ytgrinden (spec "Beslut"): TV-läget OCH
 * skrivbordsappen (Tauri, inte telefon) delar den nya guiden — LAN/fjärr och
 * telefonen behåller den gamla.
 */
describe('useNewGuideSurface', () => {
  it('TV-läge är alltid den nya ytan, oavsett Tauri-flaggan', () => {
    __setTvModeForTests(true)
    expect(useNewGuideSurface(false)).toBe(true)
    __setDesktopTauriEnvForTests(false)
    expect(useNewGuideSurface(false)).toBe(true)
  })
  it('skrivbordsappen (Tauri, ej telefon) är den nya ytan', () => {
    __setTvModeForTests(false)
    __setDesktopTauriEnvForTests(true)
    expect(useNewGuideSurface(false)).toBe(true)
  })
  it('telefonen i skrivbordsappen behåller den gamla ytan', () => {
    __setTvModeForTests(false)
    __setDesktopTauriEnvForTests(true)
    expect(useNewGuideSurface(true)).toBe(false)
  })
  it('LAN/fjärr utan Tauri behåller den gamla ytan', () => {
    __setTvModeForTests(false)
    __setDesktopTauriEnvForTests(false)
    expect(useNewGuideSurface(false)).toBe(false)
  })
})
