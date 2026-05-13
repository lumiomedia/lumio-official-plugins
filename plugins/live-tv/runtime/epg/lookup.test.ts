import { describe, it, expect } from 'vitest'
import { computeNowNextLater } from './lookup'
import type { EpgCacheEntry, EpgProgramme } from './types'

const programmes = (n: number): EpgProgramme[] =>
  Array.from({ length: n }, (_, i) => ({
    title: `P${i}`,
    start: i * 60_000,
    stop: (i + 1) * 60_000,
  }))

const cache = (channel: string, list: EpgProgramme[]): EpgCacheEntry => ({
  index: { [channel]: list },
  fetchedAt: 0,
  sources: [],
})

describe('computeNowNextLater', () => {
  it('returns all-null when cache is null', () => {
    expect(computeNowNextLater(null, 'X', 0)).toEqual({ now: null, next: null, later: null })
  })

  it('returns all-null when tvgId is null', () => {
    expect(computeNowNextLater(cache('A', programmes(3)), null, 0)).toEqual({ now: null, next: null, later: null })
  })

  it('returns all-null when tvgId missing in index', () => {
    expect(computeNowNextLater(cache('A', programmes(3)), 'B', 0)).toEqual({ now: null, next: null, later: null })
  })

  it('finds NOW/NEXT/LATER at mid-list time', () => {
    const c = cache('A', programmes(5))
    const result = computeNowNextLater(c, 'A', 90_000)
    expect(result.now?.title).toBe('P1')
    expect(result.next?.title).toBe('P2')
    expect(result.later?.title).toBe('P3')
  })

  it('returns now=null, next=first when time before first programme', () => {
    const c = cache('A', programmes(3))
    const result = computeNowNextLater(c, 'A', -1)
    expect(result.now).toBeNull()
    expect(result.next?.title).toBe('P0')
    expect(result.later?.title).toBe('P1')
  })

  it('returns trailing nulls when at end of list', () => {
    const c = cache('A', programmes(3))
    const result = computeNowNextLater(c, 'A', 150_000)
    expect(result.now?.title).toBe('P2')
    expect(result.next).toBeNull()
    expect(result.later).toBeNull()
  })

  it('handles exact boundary time (start of programme)', () => {
    const c = cache('A', programmes(3))
    const result = computeNowNextLater(c, 'A', 60_000)
    expect(result.now?.title).toBe('P1')
  })

  it('handles gap between programmes (now=null, next set)', () => {
    const list: EpgProgramme[] = [
      { title: 'A', start: 0, stop: 1000 },
      { title: 'B', start: 5000, stop: 6000 },
    ]
    const c = cache('A', list)
    const result = computeNowNextLater(c, 'A', 3000)
    expect(result.now).toBeNull()
    expect(result.next?.title).toBe('B')
  })
})
