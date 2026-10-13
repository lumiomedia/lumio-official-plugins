import { describe, expect, it } from 'vitest'
import { isHlsUrl } from './live-tv-player'

describe('isHlsUrl', () => {
  it('skiljer HLS från löpande TS-strömmar', () => {
    expect(isHlsUrl('http://x/live/u/p/1.m3u8')).toBe(true)
    expect(isHlsUrl('http://x/live/u/p/1.M3U8?token=a')).toBe(true)
    expect(isHlsUrl('http://x/live/u/p/1.ts')).toBe(false)
    expect(isHlsUrl('http://x/live/u/p/1')).toBe(false)
    expect(isHlsUrl('http://x/m3u8/live/1.ts')).toBe(false)
  })
})
