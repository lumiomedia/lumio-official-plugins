import { beforeEach, describe, expect, it } from 'vitest'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../live-tv-data'
import { FALLBACK_AFTER_OPTIONS, nextFallbackAfter, TV_SETTINGS_KEY, getTvSettings, setTvSettings, getGuideMode, setGuideMode, getActivePlaylistId, setActivePlaylistId } from './tv-settings-store'

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
      railLabels: true,
      startView: 'home',
      streamFallback: true,
      streamFallbackAfterS: 5,
    })
    expect(getGuideMode()).toBe('now')
    expect(getActivePlaylistId()).toBeNull()
  })
  it('startvyn: Hem som standard, sparas, ogiltig blir Hem', () => {
    setTvSettings({ startView: 'sport' })
    expect(getTvSettings().startView).toBe('sport')
    writePluginJson(LIVE_TV_PLUGIN_ID, TV_SETTINGS_KEY, { startView: 'multi' })
    expect(getTvSettings().startView).toBe('home')
  })
  it('strömbytet: på och 5 s som standard, sparas, ogiltigt faller tillbaka', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, TV_SETTINGS_KEY, { numericZap: false })
    expect(getTvSettings().streamFallback).toBe(true)
    expect(getTvSettings().streamFallbackAfterS).toBe(5)
    setTvSettings({ streamFallback: false, streamFallbackAfterS: 0 })
    expect(getTvSettings().streamFallback).toBe(false)
    expect(getTvSettings().streamFallbackAfterS).toBe(0)
    setTvSettings({ streamFallbackAfterS: 15 })
    expect(getTvSettings().streamFallbackAfterS).toBe(15)
    writePluginJson(LIVE_TV_PLUGIN_ID, TV_SETTINGS_KEY, { streamFallback: 'nej', streamFallbackAfterS: 7 })
    expect(getTvSettings().streamFallback).toBe(true)
    expect(getTvSettings().streamFallbackAfterS).toBe(5)
  })
  it('nextFallbackAfter går runt Aldrig → 3 → 5 → 10 → 15 → Aldrig', () => {
    expect(FALLBACK_AFTER_OPTIONS).toEqual([0, 3, 5, 10, 15])
    expect(nextFallbackAfter(5)).toBe(10)
    expect(nextFallbackAfter(15)).toBe(0)
    expect(nextFallbackAfter(0)).toBe(3)
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
