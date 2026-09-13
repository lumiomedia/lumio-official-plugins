import { beforeEach, describe, expect, it } from 'vitest'
import { __resetForTests } from '@/lib/plugin-sdk'
import { getTvSettings, setTvSettings, getGuideMode, setGuideMode, getActivePlaylistId, setActivePlaylistId } from './tv-settings-store'

beforeEach(() => __resetForTests())

describe('tv-settings-store', () => {
  it('har standardvärden', () => {
    expect(getTvSettings()).toEqual({ previewEnabled: true, startOnLastChannel: false, numericZap: true, bannerHideMs: 4000 })
    expect(getGuideMode()).toBe('now')
    expect(getActivePlaylistId()).toBeNull()
  })
  it('sparar delvisa ändringar', () => {
    setTvSettings({ previewEnabled: false })
    expect(getTvSettings().previewEnabled).toBe(false)
    expect(getTvSettings().numericZap).toBe(true)
  })
  it('sanerar ogiltiga värden', () => {
    setTvSettings({ bannerHideMs: 999 as unknown as 4000 })
    expect(getTvSettings().bannerHideMs).toBe(4000)
    setGuideMode('tl')
    expect(getGuideMode()).toBe('tl')
    setActivePlaylistId('list-1')
    expect(getActivePlaylistId()).toBe('list-1')
  })
})
