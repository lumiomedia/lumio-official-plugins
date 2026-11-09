import { afterEach, describe, expect, it, vi } from 'vitest'
import { __resetForTests } from '@/lib/plugin-sdk'
import { LIVE_EDGE_SLACK_S, LIVE_EDGE_SLACK_S_HLS, TIMESHIFT_MINUTES, formatBehind, pushTimeshiftSettings, resumeAction, timeshiftModel } from './timeshift'
import { getTvSettings, setTvSettings } from './tv/tv-settings-store'

afterEach(() => { vi.unstubAllGlobals(); __resetForTests() })

describe('timeshiftModel', () => {
  it('no range → unavailable', () => {
    expect(timeshiftModel({ range: null, timePos: 100 })).toEqual({ available: false, behindMs: 0, fraction: 1, atLive: true })
  })

  it('at the live edge within the slack → atLive', () => {
    const m = timeshiftModel({ range: { start: 0, end: 600 }, timePos: 600 - LIVE_EDGE_SLACK_S + 1 })
    expect(m.available).toBe(true)
    expect(m.atLive).toBe(true)
    expect(m.behindMs).toBe(0)
    expect(m.fraction).toBe(1)
  })

  it('four minutes behind → behindMs and fraction', () => {
    const m = timeshiftModel({ range: { start: 100, end: 700 }, timePos: 460 })
    expect(m.atLive).toBe(false)
    expect(m.behindMs).toBe(240_000)
    expect(m.fraction).toBeCloseTo(0.6, 5)
  })

  it('clamps when behind the buffer start', () => {
    const m = timeshiftModel({ range: { start: 500, end: 700 }, timePos: 300 })
    expect(m.fraction).toBe(0)
    expect(m.behindMs).toBe(400_000)
    expect(m.atLive).toBe(false)
  })
})

describe('resumeAction', () => {
  it('play after pause reloads the channel without a buffer and resumes in place with one, per engine', () => {
    expect(resumeAction({ engine: 'mpv', timeshiftAvailable: false })).toBe('reload')
    expect(resumeAction({ engine: 'mpv', timeshiftAvailable: true })).toBe('unpause')
    // Android (media3): samma regel — bufferten är sessionen i appen.
    expect(resumeAction({ engine: 'droid', timeshiftAvailable: false })).toBe('reload')
    expect(resumeAction({ engine: 'droid', timeshiftAvailable: true })).toBe('unpause')
    // <video> sköter sin egen buffert.
    expect(resumeAction({ engine: 'html', timeshiftAvailable: false })).toBe('unpause')
  })
  it('the HLS live edge needs more slack than mpv (ExoPlayer sits a few seconds behind the list end)', () => {
    expect(LIVE_EDGE_SLACK_S_HLS).toBe(8)
    expect(LIVE_EDGE_SLACK_S_HLS).toBeGreaterThan(LIVE_EDGE_SLACK_S)
  })
})

describe('formatBehind', () => {
  it('formats minutes and hours', () => {
    expect(formatBehind(272_000)).toBe('−4:32')
    expect(formatBehind(3_725_000)).toBe('−1:02:05')
    expect(formatBehind(5_000)).toBe('−0:05')
  })
})

describe('settings', () => {
  it('store defaults and sanitizing', () => {
    expect(TIMESHIFT_MINUTES).toEqual([15, 30, 60])
    expect(getTvSettings().timeshiftEnabled).toBe(true)
    expect(getTvSettings().timeshiftMinutes).toBe(30)
    setTvSettings({ timeshiftMinutes: 45 as unknown as 30 })
    expect(getTvSettings().timeshiftMinutes).toBe(30)
    setTvSettings({ timeshiftMinutes: 60 })
    expect(getTvSettings().timeshiftMinutes).toBe(60)
  })

  it('pushTimeshiftSettings posts body', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await pushTimeshiftSettings({ enabled: false, minutes: 15 })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/live-tv/timeshift/settings')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ enabled: false, minutes: 15 })
  })
})
