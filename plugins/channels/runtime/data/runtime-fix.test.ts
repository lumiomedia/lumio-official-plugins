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

describe('seriens längd ur spelade avsnitt', () => {
  const ep = (ref: string, seriesKey: string, runtimeMin = 45, runtimeKnown = false) =>
    ({ ref, title: ref, kind: 'episode', seriesKey, runtimeMin, runtimeKnown } as never)

  it('ett spelat avsnitt ger resten av serien dess längd; kända längder och andra serier rörs inte', () => {
    const out = applyRuntimeFixes([ep('a1', 'at'), ep('a2', 'at'), ep('a3', 'at', 22, true), ep('b1', 'bb')], { a1: 704 }) as Array<{ ref: string; runtimeMin: number; runtimeKnown: boolean }>
    expect(out.map((x) => [x.ref, x.runtimeMin, x.runtimeKnown])).toEqual([
      ['a1', 12, true], ['a2', 12, true], ['a3', 22, true], ['b1', 45, false],
    ])
  })
})
