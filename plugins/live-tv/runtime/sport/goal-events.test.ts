import { describe, expect, it, vi } from 'vitest'
import { diffGoals, emitGoals, onGoal } from './goal-events'
import type { Fixture } from './provider'

const fx = (score: { home: number; away: number } | null, lastGoal: Fixture['lastGoal'] = null): Fixture => ({
  provider: 'api-sports', id: '1', sport: 'football', league: { id: '113', name: 'Allsvenskan', season: '2026', round: 27, country: null },
  kickoff: 0, status: 'live', statusShort: '2H', minute: 67, home: { id: 'h', name: 'Malmo FF', crest: null }, away: { id: 'a', name: 'AIK', crest: null },
  score, venue: null, lastGoal,
})

describe('diffGoals', () => {
  it('first_observation_is_not_a_goal', () => {
    expect(diffGoals(new Map(), [fx({ home: 2, away: 1 })], 5)).toEqual([])
  })
  it('score_decrease_is_not_a_goal (VAR)', () => {
    expect(diffGoals(new Map([['1', { home: 2, away: 1 }]]), [fx({ home: 1, away: 1 })], 5)).toEqual([])
  })
  it('ett mål per sida som ökat, med målskytt om källan skickar den', () => {
    const events = diffGoals(new Map([['1', { home: 1, away: 1 }]]), [fx({ home: 2, away: 1 }, { side: 'home', player: 'S. Larsson', minute: 67 })], 5)
    expect(events).toEqual([{ fixtureId: '1', provider: 'api-sports', sport: 'football', side: 'home', score: { home: 2, away: 1 }, scorer: 'S. Larsson', minute: 67, at: 5, home: 'Malmo FF', away: 'AIK' }])
  })
  it('målskytten följer inte med till fel sida', () => {
    const [e] = diffGoals(new Map([['1', { home: 1, away: 1 }]]), [fx({ home: 1, away: 2 }, { side: 'home', player: 'X', minute: 50 })], 5)
    expect([e.side, e.scorer, e.minute]).toEqual(['away', null, 67])
  })
  it('ingen ställning → inget', () => {
    expect(diffGoals(new Map([['1', { home: 0, away: 0 }]]), [fx(null)], 5)).toEqual([])
  })
})

describe('målbussen', () => {
  it('levererar till prenumeranter och släpper dem', () => {
    const cb = vi.fn()
    const off = onGoal(cb)
    const [e] = diffGoals(new Map([['1', { home: 0, away: 0 }]]), [fx({ home: 1, away: 0 })], 5)
    emitGoals([e])
    off()
    emitGoals([e])
    expect(cb).toHaveBeenCalledTimes(1)
  })
})
