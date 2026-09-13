import { describe, expect, it } from 'vitest'
import {
  CHANNEL_COL_PX,
  HOUR_PX,
  MIN_BLOCK_PX,
  PX_PER_MIN,
  ROW_MIN_H_PX,
  TITLE_ONLY_PX,
  epgBlockBox,
  epgRowBoxes,
  hourMarks,
  nowLinePx,
} from './epg-grid-geometry'

const M = 60_000
const H = 3_600_000
const windowStart = 0
const windowEnd = 12 * H

describe('epgBlockBox', () => {
  it('ett program på 30 minuter blir 120 px och shape "full"', () => {
    const box = epgBlockBox({ start: H, stop: H + 30 * M }, windowStart, windowEnd)
    expect(box?.width).toBe(120)
    expect(box?.shape).toBe('full')
  })

  it('ett program under MIN_BLOCK_PX blir shape "marker" och paddingX 0', () => {
    // 3 min * 4 px/min = 12 px, under MIN_BLOCK_PX (18).
    const box = epgBlockBox({ start: H, stop: H + 3 * M }, windowStart, windowEnd)
    expect(box?.width).toBeLessThan(MIN_BLOCK_PX)
    expect(box?.shape).toBe('marker')
    expect(box?.paddingX).toBe(0)
  })

  it('ett program mellan MIN_BLOCK_PX och TITLE_ONLY_PX blir shape "title"', () => {
    // 10 min * 4 px/min = 40 px, mellan 18 och 72.
    const box = epgBlockBox({ start: H, stop: H + 10 * M }, windowStart, windowEnd)
    expect(box?.width).toBeGreaterThanOrEqual(MIN_BLOCK_PX)
    expect(box?.width).toBeLessThan(TITLE_ONLY_PX)
    expect(box?.shape).toBe('title')
  })

  it('paddingX är aldrig bredare än en tredjedel av blocket (egenskapstest 1–240 px)', () => {
    for (let width = 1; width <= 240; width++) {
      const minutes = width / PX_PER_MIN
      const box = epgBlockBox({ start: 0, stop: minutes * M }, 0, windowEnd)
      expect(box).not.toBeNull()
      expect(box!.paddingX).toBeLessThanOrEqual(box!.width / 3 + 1e-9)
    }
  })

  it('ett program som börjar före fönstret klipps och markeras clippedStart', () => {
    const box = epgBlockBox({ start: -30 * M, stop: 30 * M }, windowStart, windowEnd)
    expect(box?.clippedStart).toBe(true)
    expect(box?.clippedEnd).toBe(false)
    expect(box?.left).toBe(0)
  })

  it('ett program som slutar efter fönstret klipps och markeras clippedEnd', () => {
    const box = epgBlockBox({ start: windowEnd - 30 * M, stop: windowEnd + 30 * M }, windowStart, windowEnd)
    expect(box?.clippedEnd).toBe(true)
    expect(box?.clippedStart).toBe(false)
  })

  it('ett program helt utanför fönstret ger null', () => {
    expect(epgBlockBox({ start: windowEnd + H, stop: windowEnd + 2 * H }, windowStart, windowEnd)).toBeNull()
    expect(epgBlockBox({ start: -2 * H, stop: -H }, windowStart, windowEnd)).toBeNull()
  })
})

describe('epgRowBoxes', () => {
  it('blocken i en rad överlappar aldrig (regression: första programmet 1 minut långt)', () => {
    const programmes = [
      { start: H, stop: H + M },
      { start: H + M, stop: H + 30 * M },
    ]
    const boxes = epgRowBoxes(programmes, windowStart, windowEnd)
    expect(boxes).toHaveLength(2)
    expect(boxes[1].left).toBeGreaterThanOrEqual(boxes[0].left + boxes[0].width)
  })

  it('sorterar defensivt efter starttid', () => {
    const programmes = [
      { start: H + 30 * M, stop: H + 60 * M },
      { start: H, stop: H + 30 * M },
    ]
    const boxes = epgRowBoxes(programmes, windowStart, windowEnd)
    expect(boxes[0].left).toBeLessThan(boxes[1].left)
  })
})

describe('nowLinePx och hourMarks', () => {
  it('matchar 240 px per timme', () => {
    expect(nowLinePx(windowStart + H, windowStart)).toBe(HOUR_PX)
    expect(nowLinePx(windowStart + 2 * H, windowStart)).toBe(2 * HOUR_PX)
  })

  it('ger en markering per hel timme i fönstret', () => {
    const marks = hourMarks(windowStart, windowStart + 3 * H)
    expect(marks).toEqual([windowStart, windowStart + H, windowStart + 2 * H])
  })
})

it('konstanterna matchar tablåns nuvarande mått', () => {
  expect(CHANNEL_COL_PX).toBe(160)
  expect(ROW_MIN_H_PX).toBe(56)
})
