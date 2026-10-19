import { describe, expect, it } from 'vitest'
import { channelByNumber, createDigitBuffer } from './zap-logic'
import { createChannel, emptyDraft } from '../model/channel'

describe('zapplogiken', () => {
  it('sifferval väntar 1,5 s eller tre siffror', () => {
    const buf = createDigitBuffer(1500)
    expect(buf.push(1, 0)).toEqual({ pending: '1', commit: null })
    expect(buf.push(2, 500)).toEqual({ pending: '12', commit: null })
    expect(buf.flush(1900)).toBeNull()
    expect(buf.flush(2001)).toBe(12)
    expect(buf.flush(5000)).toBeNull()
    buf.push(1, 6000); buf.push(0, 6100)
    expect(buf.push(4, 6200)).toEqual({ pending: '104', commit: 104 })
  })

  it('hittar kanal på nummer', () => {
    const a = { ...createChannel({ ...emptyDraft(), name: 'A' }, [], 1, () => 0.1), number: 7 }
    expect(channelByNumber([a], 7)?.id).toBe(a.id)
    expect(channelByNumber([a], 8)).toBeNull()
  })
})
