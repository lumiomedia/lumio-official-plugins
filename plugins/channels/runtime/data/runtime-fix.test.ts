import { describe, expect, it } from 'vitest'
import { applyRuntimeFixes, noteDuration } from './runtime-fix'
import type { PoolItem } from './pool'

const item = (ref: string, runtimeMin: number): PoolItem => ({
  ref, title: ref, runtimeMin, runtimeKnown: false, year: null, kind: 'episode', source: 'library', genres: [],
  play: { type: 'library', key: ref, mediaType: 'tv' },
})

describe('verkliga fillängder', () => {
  it('minns rimliga längder, ignorerar brus och samma värde', () => {
    const a = noteDuration({}, 's11e14', 1354.2)
    expect(a).toEqual({ s11e14: 1354 })
    expect(noteDuration(a!, 's11e14', 1360)).toBeNull()
    expect(noteDuration({}, 'x', 12)).toBeNull()
    expect(noteDuration({}, 'x', Number.NaN)).toBeNull()
  })

  it('nästa poolbygge får verklig längd i minuter (uppåt)', () => {
    const out = applyRuntimeFixes([item('s11e14', 25), item('annan', 22)], { s11e14: 1354 })
    expect(out[0]).toMatchObject({ runtimeMin: 23, runtimeKnown: true })
    expect(out[1]!.runtimeMin).toBe(22)
  })
})
