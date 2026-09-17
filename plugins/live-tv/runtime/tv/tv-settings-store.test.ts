import { beforeEach, describe, expect, it } from 'vitest'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../live-tv-data'
import { TV_SETTINGS_KEY, getTvSettings, setTvSettings, getGuideMode, setGuideMode, getActivePlaylistId, setActivePlaylistId } from './tv-settings-store'

beforeEach(() => __resetForTests())

describe('tv-settings-store', () => {
  it('har standardvärden', () => {
    expect(getTvSettings()).toEqual({
      previewEnabled: true,
      startOnLastChannel: false,
      numericZap: true,
      bannerHideMs: 4000,
      keepAwake: true,
      fullscreenOnRotate: true,
      guideCategory: null,
      timelineZoom: 'day',
      nowNextDetails: true,
    })
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
  it('telefonens spelarval (fas 3): keepAwake/fullscreenOnRotate, default true, sanerade', () => {
    expect(getTvSettings().keepAwake).toBe(true)
    expect(getTvSettings().fullscreenOnRotate).toBe(true)
    setTvSettings({ keepAwake: false })
    expect(getTvSettings().keepAwake).toBe(false)
    setTvSettings({ fullscreenOnRotate: false })
    expect(getTvSettings().fullscreenOnRotate).toBe(false)
    // Ett okänt värde skrivet förbi `setTvSettings` faller tillbaka på default.
    writePluginJson(LIVE_TV_PLUGIN_ID, TV_SETTINGS_KEY, { keepAwake: 'x', fullscreenOnRotate: 0 })
    expect(getTvSettings().keepAwake).toBe(true)
    expect(getTvSettings().fullscreenOnRotate).toBe(true)
  })
  it('den städade guiden (skrivbord/TV): guideCategory/timelineZoom/nowNextDetails, defaults och sanering', () => {
    expect(getTvSettings().guideCategory).toBeNull()
    expect(getTvSettings().timelineZoom).toBe('day')
    expect(getTvSettings().nowNextDetails).toBe(true)
    setTvSettings({ guideCategory: 'Sport', timelineZoom: '2h', nowNextDetails: false })
    expect(getTvSettings().guideCategory).toBe('Sport')
    expect(getTvSettings().timelineZoom).toBe('2h')
    expect(getTvSettings().nowNextDetails).toBe(false)
    // Ogiltiga värden faller tillbaka till default, precis som övriga fält.
    writePluginJson(LIVE_TV_PLUGIN_ID, TV_SETTINGS_KEY, { guideCategory: '', timelineZoom: 'week', nowNextDetails: 'x' })
    expect(getTvSettings().guideCategory).toBeNull()
    expect(getTvSettings().timelineZoom).toBe('day')
    expect(getTvSettings().nowNextDetails).toBe(true)
  })
})
