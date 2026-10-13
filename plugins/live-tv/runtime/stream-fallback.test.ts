import { describe, expect, it } from 'vitest'
import type { M3uChannel } from './live-tv-data'
import { fallbackCandidates, initialStall, stallStep, GRACE_MS, LONG_STALL_MS, STALL_WINDOW_MS } from './stream-fallback'

const ch = (name: string, url = name): M3uChannel => ({ name, url, logo: null, group: 'g', tvgId: null })

describe('stallStep', () => {
  const started = stallStep(initialStall, { type: 'start', at: 0 }).state
  it('buffring under starten räknas inte', () => {
    let s = stallStep(started, { type: 'cache', paused: true, at: 1_000 }).state
    const r = stallStep(s, { type: 'tick', at: 1_000 + LONG_STALL_MS + 1 })
    expect(r.trigger).toBe(false)
    s = r.state
    expect(stallStep(s, { type: 'cache', paused: false, at: GRACE_MS - 1 }).trigger).toBe(false)
  })
  it('en ström som fastnar redan i starten byts när startfönstret plus ett långt stopp gått', () => {
    const s = stallStep(started, { type: 'cache', paused: true, at: 2_000 }).state
    expect(stallStep(s, { type: 'tick', at: GRACE_MS + LONG_STALL_MS - 1 }).trigger).toBe(false)
    expect(stallStep(s, { type: 'tick', at: GRACE_MS + LONG_STALL_MS }).trigger).toBe(true)
  })
  it('ett långt stopp efter starten utlöser', () => {
    const s = stallStep(started, { type: 'cache', paused: true, at: GRACE_MS + 1 }).state
    expect(stallStep(s, { type: 'tick', at: GRACE_MS + LONG_STALL_MS }).trigger).toBe(false)
    expect(stallStep(s, { type: 'tick', at: GRACE_MS + 1 + LONG_STALL_MS }).trigger).toBe(true)
  })
  it('tre korta stopp inom fönstret utlöser; utspridda gör det inte', () => {
    let s = started
    const stall = (at: number) => { s = stallStep(s, { type: 'cache', paused: true, at }).state; const r = stallStep(s, { type: 'cache', paused: false, at: at + 1_000 }); s = r.state; return r.trigger }
    const t0 = GRACE_MS + 1
    expect(stall(t0)).toBe(false)
    expect(stall(t0 + 10_000)).toBe(false)
    expect(stall(t0 + 20_000)).toBe(true)
    s = started
    expect(stall(t0)).toBe(false)
    expect(stall(t0 + STALL_WINDOW_MS)).toBe(false)
    expect(stall(t0 + 2 * STALL_WINDOW_MS)).toBe(false)
  })
  it('utlöser en gång tills nästa start', () => {
    let s = stallStep(started, { type: 'cache', paused: true, at: GRACE_MS + 1 }).state
    const r = stallStep(s, { type: 'tick', at: GRACE_MS + 1 + LONG_STALL_MS })
    expect(r.trigger).toBe(true)
    s = r.state
    expect(stallStep(s, { type: 'tick', at: GRACE_MS + 2 * LONG_STALL_MS + 5 }).trigger).toBe(false)
    s = stallStep(s, { type: 'start', at: 100_000 }).state
    s = stallStep(s, { type: 'cache', paused: true, at: 100_000 + GRACE_MS + 1 }).state
    expect(stallStep(s, { type: 'tick', at: 100_000 + GRACE_MS + 1 + LONG_STALL_MS }).trigger).toBe(true)
  })
})

describe('fallbackCandidates', () => {
  const current = ch('V Sport Fotboll FHD SE', 'a')
  const list = [
    current,
    ch('V Sport Fotboll HD SE', 'b'),
    ch('V Sport Fotboll SD', 'c'),
    ch('SE: V Sport Fotboll 4K', 'd'),
    ch('V Sport Golf HD', 'e'),
    ch('V Sport Fotboll FHD SE', 'f'),
  ]
  it('sportens källor först, sedan varianter: samma kvalitet, lägre, högre', () => {
    const sport = [ch('TV4 Sport Live 1', 's1'), current]
    const out = fallbackCandidates(current, { sportSources: sport, channels: list, tried: new Set() })
    expect(out.map((c) => c.url)).toEqual(['s1', 'f', 'b', 'c', 'd'])
  })
  it('hoppar över provade och dubbletter', () => {
    const tried = new Set(['TV4 Sport Live 1::s1', 'V Sport Fotboll FHD SE::f'])
    const out = fallbackCandidates(current, { sportSources: [ch('TV4 Sport Live 1', 's1'), ch('V Sport Fotboll HD SE', 'b')], channels: list, tried })
    expect(out.map((c) => c.url)).toEqual(['b', 'c', 'd'])
  })
  it('för korta namn ger inga varianter', () => {
    expect(fallbackCandidates(ch('TV', 'x'), { sportSources: [], channels: [ch('TV HD', 'y')], tried: new Set() })).toEqual([])
  })
})
