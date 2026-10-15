// Sommartidstestet behöver svensk tidszon (vintertid börjar 2026-10-25 03:00 → 02:00).
process.env.TZ = 'Europe/Stockholm'

import { describe, expect, it } from 'vitest'
import { createChannel, emptyDraft, type ChannelDef } from './channel'
import { buildRundown, listing, programmeAt, withLock, type ScheduleItem } from './schedule'
import { extendLock, lockHorizon, lockSignature, LOCK_RENEW_MS, LOCK_SPAN_MS, parseLock, type ScheduleLock } from './lock'

const H = 3600_000
const item = (ref: string, runtimeMin: number): ScheduleItem => ({ ref, title: ref, runtimeMin, year: 2000, kind: 'movie' })
const channel = (over: Partial<ChannelDef> = {}): ChannelDef => ({ ...createChannel({ ...emptyDraft(), name: 'A' }, [], 1, () => 0.1), ...over })
const pool = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((r, i) => item(r, 37 + i * 11))

function lockFor(ch: ChannelDef, rundown: ScheduleItem[], now: number, prev: ScheduleLock | null = null): ScheduleLock | null {
  return extendLock(prev, lockSignature(ch), (t) => programmeAt(rundown, ch.airWindow, t), now)
}
const view = (rundown: ScheduleItem[], ch: ChannelDef, from: number, to: number) =>
  listing(rundown, ch.airWindow, from, to).map((s) => (s.kind === 'programme' ? `${s.item.ref}@${s.start}-${s.stop}` : `vila@${s.start}-${s.stop}`))

describe('tablålås', () => {
  const now = new Date(2026, 9, 14, 21, 47).getTime()

  it('låser sex timmar framåt med programmens verkliga start', () => {
    const ch = channel()
    const base = buildRundown(pool, ch.order, ch.seed)
    const lock = lockFor(ch, base, now)!
    expect(lockHorizon(lock)! - now).toBeGreaterThanOrEqual(LOCK_SPAN_MS)
    const first = programmeAt(base, ch.airWindow, now)
    expect(lock.slots[0]!.s).toBe(first.kind === 'programme' ? first.start : NaN)
    // Sammanhängande.
    for (let i = 1; i < lock.slots.length; i += 1) expect(lock.slots[i]!.s).toBe(lock.slots[i - 1]!.e)
  })

  it('en ändrad pool flyttar ingenting inom låset; först efter horisonten gäller den nya', () => {
    const ch = channel()
    const before = buildRundown(pool, ch.order, ch.seed)
    const lock = lockFor(ch, before, now)!
    // Ny källa svarade och en fillängd rättades: helt annan räknad tablå.
    const changedPool = [...pool.map((x) => (x.ref === 'c' ? { ...x, runtimeMin: 200 } : x)), item('h', 95), item('i', 61)]
    const after = withLock(buildRundown(changedPool, ch.order, ch.seed), lock)
    const horizon = lockHorizon(lock)!
    expect(view(after, ch, now, horizon)).toEqual(view(before, ch, now, horizon))
    // Efter horisonten: nya tablån, klippt vid horisonten (inget överlapp).
    const next = programmeAt(after, ch.airWindow, horizon + 1)
    expect(next.kind === 'programme' && next.start).toBe(horizon)
    // Spelarens filposition följer låset (minuter in i det låsta programmet).
    const mid = programmeAt(after, ch.airWindow, now + 2 * H)
    const ref = programmeAt(before, ch.airWindow, now + 2 * H)
    expect(mid.kind === 'programme' && ref.kind === 'programme' && Math.abs(mid.minsIn - ref.minsIn) < 1e-9).toBe(true)
  })

  it('ändrade regler (signaturen) släpper låset', () => {
    const ch = channel()
    const base = buildRundown(pool, ch.order, ch.seed)
    const lock = lockFor(ch, base, now)!
    const edited = channel({ order: 'chrono' })
    const fresh = lockFor(edited, buildRundown(pool, 'chrono', ch.seed), now, lock)!
    expect(fresh.sig).toBe(lockSignature(edited))
    expect(fresh.sig).not.toBe(lock.sig)
    const chrono = buildRundown(pool, 'chrono', ch.seed)
    expect(view(withLock(chrono, fresh), edited, now, now + 5 * H)).toEqual(view(chrono, edited, now, now + 5 * H))
  })

  it('förlängs rullande: orört med gott om tid kvar, påfyllt till sex timmar när under tre återstår', () => {
    const ch = channel()
    const base = buildRundown(pool, ch.order, ch.seed)
    const lock = lockFor(ch, base, now)!
    expect(lockFor(ch, base, now + H, lock)).toBe(lock)
    const later = lockHorizon(lock)! - LOCK_RENEW_MS + 60_000
    const longer = lockFor(ch, base, later, lock)!
    expect(lockHorizon(longer)! - later).toBeGreaterThanOrEqual(LOCK_SPAN_MS)
    // De redan låsta (och inte passerade) programmen står kvar orörda.
    const kept = lock.slots.filter((x) => x.e > later - H)
    expect(longer.slots.slice(0, kept.length)).toEqual(kept)
    // Påfyllningen börjar exakt vid förra horisonten.
    expect(longer.slots[kept.length]!.s).toBe(lockHorizon(lock))
    // Ett passerat lås ersätts av ett nytt från nu.
    const stale = lockFor(ch, base, lockHorizon(lock)! + 2 * H, lock)!
    expect(stale.slots[0]!.e).toBeGreaterThan(lockHorizon(lock)! + 2 * H)
  })

  it('sommartid: låset över vintertidsbytet är sammanhängande och tablån följer det', () => {
    const ch = channel({ airWindow: 'late' })
    const base = buildRundown(pool, ch.order, ch.seed)
    const start = new Date(2026, 9, 24, 23, 30).getTime()
    const lock = lockFor(ch, base, start)!
    expect(lockHorizon(lock)! - start).toBeGreaterThanOrEqual(LOCK_SPAN_MS)
    for (let i = 1; i < lock.slots.length; i += 1) expect(lock.slots[i]!.s).toBe(lock.slots[i - 1]!.e)
    const locked = withLock(buildRundown([...pool, item('x', 50)], ch.order, ch.seed), lock)
    // Var tionde minut genom den dubbla timmen: samma som när låset lades.
    for (let t = start; t < start + 6 * H; t += 10 * 60_000) {
      const a = programmeAt(locked, ch.airWindow, t)
      const b = programmeAt(base, ch.airWindow, t)
      expect(a.kind).toBe(b.kind)
      if (a.kind === 'programme' && b.kind === 'programme') expect(a.item.ref).toBe(b.item.ref)
    }
    // Vila (fönsterkanal) ligger också i låset.
    expect(lock.slots.some((x) => x.r === '')).toBe(true)
  })

  it('en låst titel som försvunnit ur poolen faller tillbaka på den räknade tablån', () => {
    const ch = channel()
    const base = buildRundown(pool, ch.order, ch.seed)
    const lock = lockFor(ch, base, now)!
    const gone = lock.slots[0]!.r
    const without = buildRundown(pool.filter((x) => x.ref !== gone), ch.order, ch.seed)
    const slot = programmeAt(withLock(without, lock), ch.airWindow, now)
    expect(slot.kind === 'programme' && slot.item.ref).not.toBe(gone)
  })

  it('lagrad form tål skräp', () => {
    expect(parseLock(null)).toBeNull()
    expect(parseLock({ sig: 'x', slots: [{ r: 'a', s: 1, e: 'nej', o: 0 }] })).toBeNull()
    expect(parseLock({ sig: 'x', slots: [{ r: 'a', s: 1, e: 2, o: 0 }] })).toEqual({ sig: 'x', slots: [{ r: 'a', s: 1, e: 2, o: 0 }] })
  })
})

describe('tablålås: tablån är alltid sammanhängande', () => {
  const contiguous = (rundown: ScheduleItem[], ch: ChannelDef, from: number, to: number) => {
    const slots = listing(rundown, ch.airWindow, from, to)
    for (let i = 1; i < slots.length; i += 1) {
      if (slots[i]!.start !== slots[i - 1]!.stop) return `${i}: ${slots[i - 1]!.start}-${slots[i - 1]!.stop} → ${slots[i]!.start}-${slots[i]!.stop}`
    }
    return 'ok'
  }

  it('repro: tablåfönstret börjar före låset och poolen har ändrats — inget överlapp vid låsets start', () => {
    const ch = channel()
    const before = buildRundown(pool, ch.order, ch.seed)
    const now = new Date(2026, 9, 15, 13, 21).getTime()
    const lock = lockFor(ch, before, now)!
    const changed = withLock(buildRundown([...pool, item('lotr', 178), item('q', 41)], ch.order, ch.seed), lock)
    // Tablån visar från föregående halvtimme, ofta före låsets första program.
    expect(contiguous(changed, ch, now - 90 * 60_000, now + 4 * H)).toBe('ok')
  })

  it('egenskap: slumpade pooler, lås, poolbyten, förlängningar och fönster ger alltid en sammanhängande tablå', () => {
    let seed = 7
    const rand = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 2 ** 32 }
    const windows = ['always', 'evenings', 'late'] as const
    for (let round = 0; round < 150; round += 1) {
      const ch = channel({ airWindow: windows[Math.floor(rand() * 3)]!, order: rand() < 0.5 ? 'shuffle' : 'chrono', seed: Math.floor(rand() * 1e6) })
      const mk = (n: number, tag: string) => Array.from({ length: n }, (_, i) => item(`${tag}${i}`, 5 + Math.floor(rand() * 180)))
      const first = mk(1 + Math.floor(rand() * 12), 'a')
      const t0 = new Date(2026, 9, 20 + Math.floor(rand() * 10), Math.floor(rand() * 24), Math.floor(rand() * 60)).getTime()
      let lock = lockFor(ch, buildRundown(first, ch.order, ch.seed), t0)
      // Poolbyte: titlar försvinner, nya kommer, längder rättas.
      const second = [...first.filter(() => rand() < 0.7).map((x) => (rand() < 0.3 ? { ...x, runtimeMin: x.runtimeMin + 30 } : x)), ...mk(Math.floor(rand() * 5), 'b')]
      if (second.length === 0) second.push(item('solo', 60))
      const base2 = buildRundown(second, ch.order, ch.seed)
      // Rullande förlängning senare mot den nya poolen.
      const t1 = t0 + Math.floor(rand() * 5 * H)
      lock = lockFor(ch, base2, t1, lock)
      const locked = withLock(base2, lock)
      const from = t1 - Math.floor(rand() * 3 * H)
      const result = contiguous(locked, ch, from, from + 8 * H)
      expect(result, `runda ${round} (${ch.airWindow})`).toBe('ok')
    }
  })
})
