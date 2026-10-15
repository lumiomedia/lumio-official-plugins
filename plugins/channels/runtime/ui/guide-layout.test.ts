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

describe('fast fokusband', () => {
  it('bandets index är fokusraden, låst till listan', async () => {
    const { bandIndex } = await import('./guide-layout')
    expect(bandIndex(0, 10)).toBe(0)
    expect(bandIndex(4, 10)).toBe(4)
    expect(bandIndex(9, 10)).toBe(9)
    expect(bandIndex(12, 10)).toBe(9)
    expect(bandIndex(-1, 10)).toBe(0)
    expect(bandIndex(3, 0)).toBe(0)
  })

  it('spåret flyttas exakt en radhöjd per steg (CSS-längd, TV-enheter funkar)', async () => {
    const { bandTransform } = await import('./guide-layout')
    expect(bandTransform(0, '54px')).toBe('translateY(0px)')
    expect(bandTransform(3, '54px')).toBe('translateY(calc(-3 * 54px))')
    expect(bandTransform(2, 'calc(72 * var(--tv-u, 1px))')).toBe('translateY(calc(-2 * calc(72 * var(--tv-u, 1px))))')
  })

  it('skrivbordets tangentbord ställer raden på bandplatsen, låst till maxrullningen', async () => {
    const { slotScrollTop } = await import('./guide-layout')
    expect(slotScrollTop(0, 54, 500)).toBe(0)
    expect(slotScrollTop(5, 54, 500)).toBe(270)
    expect(slotScrollTop(12, 54, 500)).toBe(500)
    expect(slotScrollTop(3, 54, -10)).toBe(0)
  })
})
