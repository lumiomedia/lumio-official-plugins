import { describe, expect, it } from 'vitest'
import { buildTimeshiftUrl, catchUpAcross, catchUpForChannel, channelSupportsCatchUp } from './catch-up'
import { channelKey } from './live-tv-data'
import type { EpgProgramme } from './epg/types'

const archive = { days: 2, streamId: 42, base: 'http://panel.test:8080', username: 'u ser', password: 'p@ss' }
const channel = { name: 'C More Sport', url: 'http://panel.test:8080/live/u%20ser/p%40ss/42.m3u8', group: 'Sport', logo: null, tvgId: 'cmore.se', archive }
const NOW = new Date(2026, 8, 2, 19, 42).getTime()
const H = 3_600_000

/**
 * Färdig tablå, som `useSchedules` lämnar den: repriserna räknas inte längre
 * ut ur en EPG-cache i webviewn (namnmatchningen bor i appen sedan v2).
 */
const schedule: EpgProgramme[] = [
  { title: 'För gammal', start: NOW - 3 * 24 * H, stop: NOW - 3 * 24 * H + H },
  { title: 'Gårdagens match', start: NOW - 20 * H, stop: NOW - 18 * H },
  { title: 'Förmiddag', start: NOW - 8 * H, stop: NOW - 7 * H },
  { title: 'Pågår', start: NOW - H, stop: NOW + H },
]

describe('catch-up', () => {
  it('only Xtream channels with an archive support catch-up', () => {
    expect(channelSupportsCatchUp(channel)).toBe(true)
    expect(channelSupportsCatchUp({ ...channel, archive: undefined })).toBe(false)
    expect(channelSupportsCatchUp({ ...channel, archive: { ...archive, days: 0 } })).toBe(false)
  })

  it('builds the timeshift url with local start stamp and duration in minutes', () => {
    const start = new Date(2026, 8, 2, 18, 0).getTime()
    expect(buildTimeshiftUrl(channel, start, 2 * H)).toBe(
      'http://panel.test:8080/timeshift/u%20ser/p%40ss/120/2026-09-02:18-00/42.ts',
    )
  })

  it('lists finished programmes inside the archive window, newest first', () => {
    const items = catchUpForChannel(channel, schedule, NOW)
    expect(items.map((item) => item.programme.title)).toEqual(['Förmiddag', 'Gårdagens match'])
    expect(items[0].expiresAt).toBe(NOW - 8 * H + 2 * 24 * H)
  })

  it('catchUpAcross slår upp varje kanals tablå på dess kanalnyckel', () => {
    const other = { ...channel, name: 'Utan arkiv', url: 'http://panel.test:8080/live/u/p/9.m3u8', archive: undefined }
    const items = catchUpAcross([channel, other], { [channelKey(channel)]: schedule }, NOW)
    expect(items.map((item) => item.programme.title)).toEqual(['Förmiddag', 'Gårdagens match'])
    expect(items.every((item) => item.channel.name === 'C More Sport')).toBe(true)
  })
})
