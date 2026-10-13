import { describe, expect, it } from 'vitest'
import { EPOCH, airMinutesUntil, buildRundown, isOnAir, listing, mulberry32, nextAirStart, programmeAt, type ScheduleItem } from './schedule'

const at = (y: number, mo: number, d: number, h: number, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime()
const item = (ref: string, runtimeMin: number, extra: Partial<ScheduleItem> = {}): ScheduleItem =>
  ({ ref, title: ref, runtimeMin, year: 2000, kind: 'movie', ...extra })

describe('mulberry32 + buildRundown', () => {
  it('är deterministisk för samma seed och oberoende av indataordning', () => {
    const a = [item('a', 10), item('b', 10), item('c', 10), item('d', 10)]
    const r1 = buildRundown(a, 'shuffle', 42).map((i) => i.ref)
    const r2 = buildRundown([...a].reverse(), 'shuffle', 42).map((i) => i.ref)
    expect(r1).toEqual(r2)
    expect(buildRundown(a, 'shuffle', 7).map((i) => i.ref)).not.toEqual(r1)
    expect(mulberry32(1)()).toBe(mulberry32(1)())
  })

  it('chrono sorterar på år, sedan titel', () => {
    const r = buildRundown([item('b', 1, { year: 1990 }), item('a', 1, { year: 1990 }), item('c', 1, { year: 1980 })], 'chrono', 1)
    expect(r.map((i) => i.ref)).toEqual(['c', 'a', 'b'])
  })

  it('episodes håller varje serie i S/E-ordning', () => {
    const eps = [
      item('s1e2', 1, { kind: 'episode', seriesKey: 'S', season: 1, episode: 2 }),
      item('s1e1', 1, { kind: 'episode', seriesKey: 'S', season: 1, episode: 1 }),
      item('t1e1', 1, { kind: 'episode', seriesKey: 'T', season: 1, episode: 1 }),
      item('s2e1', 1, { kind: 'episode', seriesKey: 'S', season: 2, episode: 1 }),
    ]
    const order = buildRundown(eps, 'episodes', 3).map((i) => i.ref).filter((r) => r.startsWith('s'))
    expect(order).toEqual(['s1e1', 's1e2', 's2e1'])
  })

  it('chrono bryter lika år på gemener i titeln, sedan ref, utan locale', () => {
    const r = buildRundown([item('z', 1, { title: 'Zebra' }), item('y', 1, { title: 'apa' }), item('x', 1, { title: 'Apa' }), item('w', 1, { title: 'Ärlig' })], 'chrono', 1)
    expect(r.map((i) => i.ref)).toEqual(['x', 'y', 'z', 'w'])
  })
})

describe('sändningsfönster', () => {
  it('always: sändningsminuter = väggminuter', () => {
    expect(airMinutesUntil('always', EPOCH + 90 * 60_000)).toBe(90)
  })

  it('evenings 18–02 över midnatt', () => {
    expect(isOnAir('evenings', at(2026, 3, 10, 1, 30))).toBe(true)
    expect(isOnAir('evenings', at(2026, 3, 10, 2, 30))).toBe(false)
    expect(isOnAir('evenings', at(2026, 3, 10, 18, 0))).toBe(true)
    expect(nextAirStart('evenings', at(2026, 3, 10, 2, 30))).toBe(at(2026, 3, 10, 18, 0))
  })

  it('late 00–06', () => {
    expect(isOnAir('late', at(2026, 3, 10, 5, 59))).toBe(true)
    expect(isOnAir('late', at(2026, 3, 10, 6, 0))).toBe(false)
    expect(nextAirStart('late', at(2026, 3, 10, 7, 0))).toBe(at(2026, 3, 11, 0, 0))
  })

  it('sändningsklockan står still i vilan', () => {
    const before = airMinutesUntil('evenings', at(2026, 3, 10, 2, 0))
    expect(airMinutesUntil('evenings', at(2026, 3, 10, 12, 0))).toBe(before)
    expect(airMinutesUntil('evenings', at(2026, 3, 10, 18, 30))).toBe(before + 30)
  })
})

describe('programmeAt', () => {
  const rundown = [item('a', 60), item('b', 30), item('c', 90)] // cykel 180 min

  it('hittar pågående program med minsIn/minsLeft/pct', () => {
    const slot = programmeAt(rundown, 'always', EPOCH + 75 * 60_000)
    expect(slot).toMatchObject({ kind: 'programme', index: 1, minsIn: 15, minsLeft: 15, pct: 0.5 })
    if (slot.kind === 'programme') {
      expect(slot.start).toBe(EPOCH + 60 * 60_000)
      expect(slot.stop).toBe(EPOCH + 90 * 60_000)
    }
  })

  it('loopar efter en hel cykel', () => {
    const slot = programmeAt(rundown, 'always', EPOCH + (180 * 5 + 10) * 60_000)
    expect(slot).toMatchObject({ kind: 'programme', index: 0, minsIn: 10 })
  })

  it('vila utanför fönstret med nästa sändning', () => {
    const slot = programmeAt(rundown, 'evenings', at(2026, 3, 10, 12, 0))
    expect(slot).toEqual({ kind: 'rest', start: at(2026, 3, 10, 2, 0), stop: at(2026, 3, 10, 18, 0), nextAir: at(2026, 3, 10, 18, 0) })
  })

  it('tom rundown ger empty', () => {
    expect(programmeAt([], 'always', EPOCH)).toEqual({ kind: 'empty' })
  })

  it('tid före EPOCH kraschar inte', () => {
    expect(programmeAt(rundown, 'always', EPOCH - 10 * 60_000).kind).toBe('programme')
  })
})

describe('listing', () => {
  it('ger sammanhängande block som täcker intervallet', () => {
    const blocks = listing([item('a', 60), item('b', 30)], 'always', EPOCH + 30 * 60_000, EPOCH + 210 * 60_000)
    expect(blocks[0].start).toBeLessThanOrEqual(EPOCH + 30 * 60_000)
    expect(blocks[blocks.length - 1].stop).toBeGreaterThanOrEqual(EPOCH + 210 * 60_000)
    for (let i = 1; i < blocks.length; i += 1) expect(blocks[i].start).toBe(blocks[i - 1].stop)
  })

  it('innehåller vilblock för fönsterkanaler', () => {
    const blocks = listing([item('a', 60)], 'evenings', at(2026, 3, 10, 1, 0), at(2026, 3, 10, 19, 0))
    expect(blocks.some((b) => b.kind === 'rest')).toBe(true)
  })
})

describe('sommartidsdygn', () => {
  // Kontrollerar att tablån är sammanhängande och utan överlapp över omställningsdygn,
  // oavsett vilken TZ testet körs i.
  const days: Array<[number, number, number]> = [[2026, 3, 29], [2026, 10, 25], [2026, 3, 8], [2026, 11, 1]]
  const rundown = [item('a', 50), item('b', 70), item('c', 40), item('d', 95)]
  for (const window of ['evenings', 'late'] as const) {
    for (const [y, mo, d] of days) {
      it(`${window} ${y}-${mo}-${d}: sammanhängande, stop > start, inga överlapp`, () => {
        const blocks = listing(rundown, window, at(y, mo, d - 1, 12), at(y, mo, d + 1, 12))
        expect(blocks.length).toBeGreaterThan(2)
        for (let i = 0; i < blocks.length; i += 1) {
          expect(blocks[i].stop).toBeGreaterThan(blocks[i].start)
          if (i > 0) expect(blocks[i].start).toBe(blocks[i - 1].stop)
        }
        // Programindex går framåt (cykliskt): samma index två block i rad måste vara
        // ett fönsterklippt program, aldrig ett överlappande segment.
        const prog = blocks.filter((b) => b.kind === 'programme')
        for (let i = 1; i < prog.length; i += 1) {
          const prev = prog[i - 1]
          const cur = prog[i]
          if (prev.kind === 'programme' && cur.kind === 'programme' && prev.index === cur.index) {
            expect(cur.minsIn).toBeGreaterThanOrEqual(prev.minsIn + (prev.stop - prev.start) / 60_000 - 1e-6)
          }
        }
      })
    }
  }
})
