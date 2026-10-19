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

  it('"Sedan" följer tablån: ett program som klipps vid fönstrets slut fortsätter nästa sändning', () => {
    const late = { ...make(6), airWindow: 'late' as const }
    // a är mycket längre än fönstret (00–06): det klipps vid 06 och fortsätter nästa natt.
    // rundownens nästa index (b) är alltså fel svar på "sedan".
    const rundown = [it1('a', 10_000), it1('b', 10)]
    const t = new Date(2026, 2, 10, 3, 0).getTime()
    const m = homeCardModel(late, rundown, t)
    expect(m.title).toBe('a')
    expect(m.nextTitle).toBe('a')
  })

  it('"Sedan" för ett program som slutar inom fönstret är nästa i tablån', () => {
    const rundown = [it1('a', 60), it1('b', 30), it1('c', 30)]
    expect(homeCardModel(make(7), rundown, EPOCH + 70 * 60_000)).toMatchObject({ title: 'b', nextTitle: 'c' })
  })
})
