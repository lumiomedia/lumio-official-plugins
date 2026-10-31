import { afterEach, describe, expect, it, vi } from 'vitest'
import { cachedDateTimeFormat } from './intl-cache'
import { formatClock } from './live-tv-ui'

describe('cachedDateTimeFormat', () => {
  afterEach(() => vi.restoreAllMocks())

  it('formats exactly like toLocaleTimeString/toLocaleDateString', () => {
    const ms = Date.UTC(2026, 9, 31, 17, 5)
    for (const locale of ['sv-SE', 'en-GB', 'en-US']) {
      expect(cachedDateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(ms))
        .toBe(new Date(ms).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }))
      expect(cachedDateTimeFormat(locale, { weekday: 'short' }).format(ms))
        .toBe(new Date(ms).toLocaleDateString(locale, { weekday: 'short' }))
    }
  })

  it('builds one formatter per locale + options, not one per call', () => {
    const spy = vi.spyOn(Intl, 'DateTimeFormat')
    for (let i = 0; i < 50; i++) cachedDateTimeFormat('da-DK', { hour: '2-digit', minute: '2-digit' }).format(i * 60_000)
    cachedDateTimeFormat('da-DK', { weekday: 'long' }).format(0)
    expect(spy).toHaveBeenCalledTimes(2)
  })
})

describe('formatClock', () => {
  afterEach(() => vi.restoreAllMocks())

  it('matches toLocaleTimeString with hour + minute', () => {
    const ms = Date.UTC(2026, 9, 31, 8, 7)
    expect(formatClock(ms, 'sv-SE')).toBe(new Date(ms).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }))
  })

  it('reuses its formatter (the guide calls it twice per block on every focus move)', () => {
    formatClock(0, 'nb-NO')
    const spy = vi.spyOn(Intl, 'DateTimeFormat')
    const toLocale = vi.spyOn(Date.prototype, 'toLocaleTimeString')
    for (let i = 0; i < 100; i++) formatClock(i * 60_000, 'nb-NO')
    expect(spy).not.toHaveBeenCalled()
    expect(toLocale).not.toHaveBeenCalled()
  })
})
