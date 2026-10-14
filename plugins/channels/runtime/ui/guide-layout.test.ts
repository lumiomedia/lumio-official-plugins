import { describe, expect, it } from 'vitest'
import { blockBox, formatClock, guideWindow, nowLinePct } from './guide-layout'

const at = (h: number, m: number) => new Date(2026, 9, 14, h, m).getTime()

describe('tablålayouten', () => {
  it('fönstret börjar på föregående halvtimme och är 210 min', () => {
    const w = guideWindow(at(21, 47))
    expect(w.from).toBe(at(21, 30))
    expect(w.to).toBe(at(25, 0))
    expect(w.ticks.map(formatClock)).toEqual(['21:30', '22:00', '22:30', '23:00', '23:30', '00:00', '00:30'])
  })

  it('block klipps till fönstret', () => {
    const w = guideWindow(at(21, 47))
    expect(blockBox({ start: at(21, 0), stop: at(22, 0) }, w)).toEqual({ leftPct: 0, widthPct: (30 / 210) * 100 })
    expect(blockBox({ start: at(19, 0), stop: at(20, 0) }, w)).toBeNull()
  })

  it('nu-linjen', () => {
    const w = guideWindow(at(21, 47))
    expect(nowLinePct(at(21, 47), w)).toBeCloseTo((17 / 210) * 100)
  })
})
