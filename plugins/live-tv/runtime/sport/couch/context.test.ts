import { beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetCouchMarksForTests, acquireCouchMark, couchMarks, onCouchMarksChanged } from './context'
import { onPlayingChannelChanged, setPlayingChannel } from '../goal-alerts'

beforeEach(() => { __resetCouchMarksForTests(); setPlayingChannel(null) })

describe('kontext', () => {
  it('räknar markeringar och meddelar ändringar', () => {
    const cb = vi.fn()
    onCouchMarksChanged(cb)
    const a = acquireCouchMark('sport-page')
    const b = acquireCouchMark('sport-page')
    a()
    a()
    expect(couchMarks().sportPage).toBe(true)
    b()
    expect(couchMarks()).toEqual({ sportPage: false, multiview: false })
    expect(cb).toHaveBeenCalledTimes(4)
  })
  it('spelande kanal meddelas bara vid ändring', () => {
    const cb = vi.fn()
    const off = onPlayingChannelChanged(cb)
    setPlayingChannel('k1'); setPlayingChannel('k1'); setPlayingChannel(null)
    expect(cb.mock.calls).toEqual([['k1'], [null]])
    off()
  })
})
