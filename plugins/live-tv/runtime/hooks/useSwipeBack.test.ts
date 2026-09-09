import { describe, expect, it } from 'vitest'
import { SWIPE_BACK_EDGE_PX, isSwipeBackGesture } from './useSwipeBack'

const base = { startX: 10, startY: 300, endX: 200, endY: 300 }

describe('isSwipeBackGesture', () => {
  it('godkänner ett drag från vänsterkanten åt höger', () => {
    expect(isSwipeBackGesture(base)).toBe(true)
  })

  it('avvisar ett drag som börjar inne på sidan', () => {
    // EPG-tablån scrollar i sidled: ett drag mitt i den ska scrolla tablån,
    // inte navigera bort från sidan.
    expect(isSwipeBackGesture({ ...base, startX: SWIPE_BACK_EDGE_PX + 1, endX: SWIPE_BACK_EDGE_PX + 200 })).toBe(false)
  })

  it('avvisar ett för kort drag', () => {
    expect(isSwipeBackGesture({ ...base, endX: 40 })).toBe(false)
  })

  it('avvisar ett drag åt vänster', () => {
    expect(isSwipeBackGesture({ ...base, startX: 300, endX: 100 })).toBe(false)
  })

  it('avvisar ett drag som mest går uppåt eller nedåt', () => {
    expect(isSwipeBackGesture({ ...base, endY: 500 })).toBe(false)
  })

  it('tillåter en liten avvikelse i höjd — ett tummdrag är aldrig spikrakt', () => {
    expect(isSwipeBackGesture({ ...base, endY: 320 })).toBe(true)
  })
})
