import { describe, expect, it } from 'vitest'
import { blockGeometry, nowLinePct, scheduleWindow, timeTicks } from './tv-schedule-window'

const H = 3_600_000
const M = 60_000
// 2026-09-12 15:05 lokal tid
const now = new Date(2026, 8, 12, 15, 5).getTime()

describe('scheduleWindow', () => {
  it('börjar på föregående hela halvtimme minus 30 min och är 2 h', () => {
    const win = scheduleWindow(now)
    expect(new Date(win.start).getHours()).toBe(14)
    expect(new Date(win.start).getMinutes()).toBe(30)
    expect(win.end - win.start).toBe(2 * H)
  })
  it('ger fyra tidsetiketter', () => {
    const win = scheduleWindow(now)
    expect(timeTicks(win)).toEqual([win.start, win.start + 30 * M, win.start + 60 * M, win.start + 90 * M])
  })
})

describe('blockGeometry', () => {
  const win = scheduleWindow(now)
  it('placerar ett block i procent och klipper mot kanterna', () => {
    const g = blockGeometry({ start: win.start - 30 * M, stop: win.start + 30 * M }, win)
    expect(g).toEqual({ leftPct: 0, widthPct: 25 })
  })
  it('utanför fönstret ger null', () => {
    expect(blockGeometry({ start: win.end, stop: win.end + H }, win)).toBeNull()
  })
  it('nu-linjen ligger mellan 0 och 100', () => {
    const pct = nowLinePct(now, win)
    expect(pct).toBeGreaterThan(25)
    expect(pct).toBeLessThan(30)
  })
})
