import { describe, expect, it } from 'vitest'
import { homeCardModel, homeChannels } from './home-row-logic'
import { createChannel, emptyDraft } from '../model/channel'
import { EPOCH } from '../model/schedule'
import type { PoolItem } from '../data/pool'

const make = (number: number, showOnHome = true) => ({ ...createChannel({ ...emptyDraft(), name: `K${number}`, showOnHome }, [], 1, () => 0.1), id: `k${number}`, number })
const it1 = (ref: string, runtimeMin: number): PoolItem => ({ ref, title: ref, runtimeMin, runtimeKnown: true, year: 2000, kind: 'movie', source: 'library', genres: [], play: { type: 'library', key: ref, mediaType: 'movie' } })

describe('hemraden', () => {
  it('visar bara showOnHome-kanaler i nummerordning', () => {
    expect(homeChannels([make(3), make(1), make(2, false)]).map((c) => c.number)).toEqual([1, 3])
    expect(homeChannels([make(3), make(1)], 1).map((c) => c.number)).toEqual([1])
  })

  it('kortmodell för sändande kanal', () => {
    const m = homeCardModel(make(1), [it1('a', 60), it1('b', 30)], EPOCH + 20 * 60_000)
    expect(m).toMatchObject({ title: 'a', minsLeft: 40, resting: false, nextTitle: 'b' })
    expect(m.pct).toBeCloseTo(1 / 3)
  })

  it('vilande kanal och tom pool', () => {
    const resting = { ...make(2), airWindow: 'late' as const }
    expect(homeCardModel(resting, [it1('a', 60)], new Date(2026, 2, 10, 12, 0).getTime())).toMatchObject({ minsLeft: null, resting: true })
    expect(homeCardModel(make(4), [], EPOCH).title).toBeNull()
  })

  it('serieavsnitt visar serietiteln och backdrop följer med', () => {
    const ep: PoolItem = { ...it1('e', 45), kind: 'episode', title: 'Pilot', seriesTitle: 'Serien', backdropUrl: 'http://x/b.jpg' }
    expect(homeCardModel(make(1), [ep], EPOCH)).toMatchObject({ title: 'Serien', backdropUrl: 'http://x/b.jpg', nextTitle: null })
  })
})
