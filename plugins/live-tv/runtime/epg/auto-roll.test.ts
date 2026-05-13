import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { scheduleNextBoundary } from './auto-roll'
import type { NowNextLater } from './types'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-13T12:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('scheduleNextBoundary', () => {
  it('fires at NOW.stop when NOW exists', () => {
    const now = Date.now()
    const data: NowNextLater = {
      now: { title: 'a', start: now - 1000, stop: now + 5000 },
      next: null, later: null,
    }
    const cb = vi.fn()
    scheduleNextBoundary(data, cb)
    vi.advanceTimersByTime(4999)
    expect(cb).not.toHaveBeenCalled()
    vi.advanceTimersByTime(2)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('fires at NEXT.start when NOW is null', () => {
    const now = Date.now()
    const data: NowNextLater = {
      now: null,
      next: { title: 'b', start: now + 3000, stop: now + 6000 },
      later: null,
    }
    const cb = vi.fn()
    scheduleNextBoundary(data, cb)
    vi.advanceTimersByTime(3001)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('no-op cleanup when no boundary', () => {
    const cleanup = scheduleNextBoundary({ now: null, next: null, later: null }, vi.fn())
    expect(typeof cleanup).toBe('function')
    expect(() => cleanup()).not.toThrow()
  })

  it('cleanup cancels timer', () => {
    const now = Date.now()
    const data: NowNextLater = {
      now: { title: 'a', start: now - 1000, stop: now + 5000 },
      next: null, later: null,
    }
    const cb = vi.fn()
    const cleanup = scheduleNextBoundary(data, cb)
    cleanup()
    vi.advanceTimersByTime(10_000)
    expect(cb).not.toHaveBeenCalled()
  })
})
