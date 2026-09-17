import { describe, expect, it } from 'vitest'
import {
  CHANNEL_COL_PX,
  GRID_WINDOW_MS,
  HOUR_PX,
  MIN_BLOCK_PX,
  PCT_PER_MIN_GRID,
  PHONE_CHANNEL_COL_PX,
  PHONE_PX_PER_MIN,
  PHONE_ROW_H_PX,
  PX_PER_MIN,
  ROW_MIN_H_PX,
  TITLE_ONLY_PX,
  epgBlockBox,
  epgRowBoxes,
  guideWindowStart,
  hourMarks,
  mergeShortBlocks,
  nowLinePx,
  timelineWindow,
  type EpgRowEntry,
} from './epg-grid-geometry'
import { startOfLocalDay } from '../live-tv-model'

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

  it('noll eller negativ varaktighet ger null (dras bort, ritas aldrig)', () => {
    expect(epgBlockBox({ start: H, stop: H }, windowStart, windowEnd)).toBeNull()
    expect(epgBlockBox({ start: H, stop: H - M }, windowStart, windowEnd)).toBeNull()
  })
})

describe('epgRowBoxes', () => {
  const boxesOf = (programmes: { start: number; stop: number }[]) =>
    epgRowBoxes(programmes, windowStart, windowEnd).map((entry) => entry.box)

  it('blocken i en rad överlappar aldrig (regression: första programmet 1 minut långt)', () => {
    const boxes = boxesOf([
      { start: H, stop: H + M },
      { start: H + M, stop: H + 30 * M },
    ])
    expect(boxes).toHaveLength(2)
    expect(boxes[1].left).toBeGreaterThanOrEqual(boxes[0].left + boxes[0].width)
  })

  it('sorterar defensivt efter starttid', () => {
    const boxes = boxesOf([
      { start: H + 30 * M, stop: H + 60 * M },
      { start: H, stop: H + 30 * M },
    ])
    expect(boxes[0].left).toBeLessThan(boxes[1].left)
  })

  it('två program som överlappar 10 min ger inga överlappande boxar (klipper föregåendes högerkant)', () => {
    const boxes = boxesOf([
      { start: H, stop: H + 30 * M }, // 0–30
      { start: H + 20 * M, stop: H + 50 * M }, // 20–50, 10 min överlapp
    ])
    expect(boxes).toHaveLength(2)
    // Första klipps till H–(H+20min) (20 min = 80 px), andra behåller sin fulla (H+20)–(H+50).
    expect(boxes[0].width).toBeCloseTo(80)
    expect(boxes[1].left).toBeCloseTo(boxes[0].left + 80)
    expect(boxes[1].width).toBeCloseTo(120)
    expect(boxes[1].left).toBeGreaterThanOrEqual(boxes[0].left + boxes[0].width)
  })

  it('ett program helt inuti ett annat tas bort (inget eget utrymme att rita det i)', () => {
    const boxes = boxesOf([
      { start: H, stop: H + 60 * M }, // 0–60, "ytterprogrammet"
      { start: H + 10 * M, stop: H + 20 * M }, // 10–20, helt täckt av det förra
    ])
    expect(boxes).toHaveLength(1)
    expect(boxes[0].width).toBeCloseTo(240) // hela 60-minutersprogrammet, orört
  })

  it('noll/negativ varaktighet i en rad tas bort, grannarna påverkas inte', () => {
    const boxes = boxesOf([
      { start: H, stop: H + 30 * M },
      { start: H + 30 * M, stop: H + 30 * M }, // nollvaraktighet
      { start: H + 40 * M, stop: H + 20 * M }, // negativ varaktighet
      { start: H + 50 * M, stop: H + 80 * M },
    ])
    expect(boxes).toHaveLength(2)
  })
})

describe('epgRowBoxes — parningen box ↔ program', () => {
  /**
   * Parningen kan INTE härledas i efterhand, och de här tre fallen är varför:
   * `left` är inte unikt (identiska starttider), och listan är varken lika
   * lång som eller i samma ordning som indatan. En vy som gissar sätter fel
   * titel, fel tid, fel OK-mål och fel påminnelse på ett block.
   */
  const named = (title: string, startMin: number, stopMin: number) => ({ title, start: H + startMin * M, stop: H + stopMin * M })

  it('två program med IDENTISK start paras rätt (boxen bär det program som faktiskt ritas)', () => {
    // A 00–01 och B 00–02: A klipps till nollbredd av B och faller bort, kvar
    // är B — och boxen måste bära B:s titel, inte A:s.
    const entries = epgRowBoxes([named('A', 0, 1), named('B', 0, 2)], windowStart, windowEnd)
    expect(entries).toHaveLength(1)
    expect(entries[0].programme.title).toBe('B')
    expect(entries[0].box.width).toBeCloseTo(2 * PX_PER_MIN)
  })

  it('identisk start i omvänd ordning ger det längre programmet', () => {
    const entries = epgRowBoxes([named('B', 0, 2), named('A', 0, 1)], windowStart, windowEnd)
    expect(entries).toHaveLength(1)
    expect(entries[0].programme.title).toBe('B')
  })

  it('ett helt inneslutet program svaljs och de kvarvarande boxarna bär rätt program', () => {
    const entries = epgRowBoxes([named('Ytter', 0, 60), named('Inner', 10, 20), named('Efter', 60, 90)], windowStart, windowEnd)
    expect(entries.map((entry) => entry.programme.title)).toEqual(['Ytter', 'Efter'])
  })

  it('osorterad indata paras rätt (programmet följer med sorteringen)', () => {
    const entries = epgRowBoxes([named('Sen', 30, 60), named('Först', 0, 30)], windowStart, windowEnd)
    expect(entries.map((entry) => entry.programme.title)).toEqual(['Först', 'Sen'])
  })

  it('programmet är samma objektreferens som kom in', () => {
    const programme = named('Referens', 0, 30)
    const entries = epgRowBoxes([programme], windowStart, windowEnd)
    expect(entries[0].programme).toBe(programme)
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

  it('kontrakt: hourMarks är INTE klockjusterat — ett fönster som inte börjar på hel timme ger markeringar på samma minut som windowStart', () => {
    const offsetStart = H + 15 * M // t.ex. xx:15
    const marks = hourMarks(offsetStart, offsetStart + 3 * H)
    expect(marks).toEqual([offsetStart, offsetStart + H, offsetStart + 2 * H])
    expect(marks.every((mark) => (mark - offsetStart) % H === 0)).toBe(true)
  })
})

it('konstanterna matchar tablåns nuvarande mått', () => {
  expect(CHANNEL_COL_PX).toBe(160)
  expect(ROW_MIN_H_PX).toBe(56)
})

describe('px/min som parameter (telefonens tablå)', () => {
  it('PHONE_PX_PER_MIN: 90 minuter ryms i ~260 px', () => {
    expect(90 * PHONE_PX_PER_MIN).toBeCloseTo(260)
  })

  it('epgBlockBox med PHONE_PX_PER_MIN: ett 90-minutersprogram blir ~260 px och left följer samma skala', () => {
    const box = epgBlockBox({ start: H, stop: H + 90 * M }, windowStart, windowEnd, PHONE_PX_PER_MIN)
    expect(box?.width).toBeCloseTo(260)
    expect(box?.left).toBeCloseTo(60 * PHONE_PX_PER_MIN)
  })

  it('epgRowBoxes med PHONE_PX_PER_MIN: bredder i telefonskalan, paret oförändrat', () => {
    const entries = epgRowBoxes([{ start: H, stop: H + 30 * M }, { start: H + 30 * M, stop: H + 60 * M }], windowStart, windowEnd, PHONE_PX_PER_MIN)
    expect(entries).toHaveLength(2)
    expect(entries[0].box.width).toBeCloseTo(30 * PHONE_PX_PER_MIN)
    expect(entries[1].box.left).toBeCloseTo(entries[0].box.left + entries[0].box.width)
  })

  it('nowLinePx med PHONE_PX_PER_MIN: 45 minuter in ger ~130 px', () => {
    expect(nowLinePx(windowStart + 45 * M, windowStart, PHONE_PX_PER_MIN)).toBeCloseTo(130)
  })

  it('utan parametern är skalan oförändrad (PX_PER_MIN, 240 px/timme)', () => {
    expect(epgBlockBox({ start: H, stop: H + 30 * M }, windowStart, windowEnd)?.width).toBe(30 * PX_PER_MIN)
    expect(nowLinePx(windowStart + H, windowStart)).toBe(HOUR_PX)
    expect(epgRowBoxes([{ start: H, stop: H + 60 * M }], windowStart, windowEnd)[0].box.width).toBeCloseTo(240)
  })

  it('telefonens konstanter matchar handoffen §3', () => {
    expect(PHONE_CHANNEL_COL_PX).toBe(112)
    expect(PHONE_ROW_H_PX).toBe(64)
  })
})

describe('guideWindowStart', () => {
  const at = (h: number, min: number) => new Date(2026, 0, 1, h, min, 0, 0).getTime()

  it('08:44 rundas ned till 08:30', () => {
    expect(guideWindowStart(at(8, 44))).toBe(at(8, 30))
  })

  it('00:05 rundas ned till 00:00', () => {
    expect(guideWindowStart(at(0, 5))).toBe(at(0, 0))
  })

  it('23:50 rundas ned till 23:30', () => {
    expect(guideWindowStart(at(23, 50))).toBe(at(23, 30))
  })
})

describe('PCT_PER_MIN_GRID + epgBlockBox — procentblock i Grid (fönster 3 h)', () => {
  const at = (h: number, min: number) => new Date(2026, 0, 1, h, min, 0, 0).getTime()
  const gridWindowStart = at(8, 30)
  const gridWindowEnd = gridWindowStart + GRID_WINDOW_MS

  it('GRID_WINDOW_MS är 3 timmar', () => {
    expect(GRID_WINDOW_MS).toBe(3 * 3_600_000)
  })

  it('30/60/90-minutersblock blir ~16.67/33.33/50 % av spårbredden', () => {
    const box30 = epgBlockBox({ start: gridWindowStart, stop: gridWindowStart + 30 * 60_000 }, gridWindowStart, gridWindowEnd, PCT_PER_MIN_GRID)
    const box60 = epgBlockBox({ start: gridWindowStart, stop: gridWindowStart + 60 * 60_000 }, gridWindowStart, gridWindowEnd, PCT_PER_MIN_GRID)
    const box90 = epgBlockBox({ start: gridWindowStart, stop: gridWindowStart + 90 * 60_000 }, gridWindowStart, gridWindowEnd, PCT_PER_MIN_GRID)
    expect(box30?.width).toBeCloseTo(16.666, 2)
    expect(box60?.width).toBeCloseTo(33.333, 2)
    expect(box90?.width).toBeCloseTo(50, 2)
  })

  it('block 07:30–09:00 i fönster 08:30–11:30 klipps till vänsterkanten med kvarvarande bredd', () => {
    const box = epgBlockBox({ start: at(7, 30), stop: at(9, 0) }, gridWindowStart, gridWindowEnd, PCT_PER_MIN_GRID)
    expect(box?.left).toBe(0)
    expect(box?.width).toBeCloseTo(16.666, 2)
    expect(box?.clippedStart).toBe(true)
  })
})

describe('timelineWindow', () => {
  const now = new Date(2026, 0, 1, 14, 44, 0, 0).getTime()

  it("'2h': halvtimmesfönstrets start minus 30 min, 2 timmar långt", () => {
    const win = timelineWindow(now, '2h')
    expect(win.start).toBe(guideWindowStart(now) - 30 * 60_000)
    expect(win.end - win.start).toBe(2 * 3_600_000)
    expect(win.pctPerMin).toBeCloseTo(100 / 120)
  })

  it("'6h': halvtimmesfönstrets start minus 1 timme, 6 timmar långt", () => {
    const win = timelineWindow(now, '6h')
    expect(win.start).toBe(guideWindowStart(now) - 3_600_000)
    expect(win.end - win.start).toBe(6 * 3_600_000)
    expect(win.pctPerMin).toBeCloseTo(100 / 360)
  })

  it("'day': dagens 06:00 till 24:00, pctPerMin = 100/1080", () => {
    const win = timelineWindow(now, 'day')
    expect(win.start).toBe(startOfLocalDay(now) + 6 * 3_600_000)
    expect(win.end - win.start).toBe(18 * 3_600_000)
    expect(win.pctPerMin).toBeCloseTo(100 / 1080)
  })
})

describe('mergeShortBlocks', () => {
  type P = { title: string; start: number; stop: number }
  const entry = (title: string, left: number, width: number): EpgRowEntry<P> => ({
    box: { left, width, shape: width < 18 ? 'marker' : 'title', paddingX: Math.min(8, width / 3), clippedStart: false, clippedEnd: false },
    programme: { title, start: left, stop: left + width },
  })

  it('två angränsande smala block slås ihop till ett med mergedTitle "A · B"', () => {
    const merged = mergeShortBlocks([entry('A', 0, 5), entry('B', 5, 5)], 10)
    expect(merged).toHaveLength(1)
    expect(merged[0].mergedTitle).toBe('A · B')
    expect(merged[0].box.left).toBe(0)
    expect(merged[0].box.width).toBe(10)
  })

  it('ett brett block rörs inte och får ingen mergedTitle', () => {
    const merged = mergeShortBlocks([entry('Bred', 0, 50)], 10)
    expect(merged).toHaveLength(1)
    expect(merged[0].mergedTitle).toBeUndefined()
  })

  it('ett ensamt smalt block utan smal granne rörs inte', () => {
    const merged = mergeShortBlocks([entry('Ensam', 0, 5), entry('Bred', 5, 50)], 10)
    expect(merged).toHaveLength(2)
    expect(merged[0].mergedTitle).toBeUndefined()
  })
})
