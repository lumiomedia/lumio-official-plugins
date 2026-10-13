import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CouchSportGoal } from '@/lib/plugin-sdk'
import type { GoalEvent } from '../goal-events'
import type { MatchSource, SportMatch } from '../sport-model'
import type { SportSettings } from '../sport-store'
import { __resetGoalsForTests, addGoal, dismissGoal, goalFromEvent, GOAL_TTL_MS, GOALS_MAX, onGoalsChanged, openGoals, shouldCard } from './goals'

const src = (key: string): MatchSource => ({ channelKey: key, name: key.toUpperCase(), url: `http://${key}`, logo: null, group: 'g', tvgId: null, sourceId: 's', quality: null, programmeStart: 0, programmeStop: 10, liveFlag: true })
const match = (o: Partial<SportMatch> = {}): SportMatch => ({
  id: 'm', kind: 'football', league: 'Allsvenskan', leagueKey: 'se1', home: 'Djurgården', away: 'Malmö FF', homeKey: 'dif', awayKey: 'mff',
  event: null, start: 0, stop: 7_200_000, status: 'live', rerun: false, round: 24, venue: null, sources: [src('k1')],
  coverage: 'full', fixture: { provider: 'api-sports', id: '1' }, ...o,
})
const settings = { goalAlerts: true, goalAlertMatches: {} } as unknown as SportSettings
const follows = [{ sport: 'football' as const, kind: 'team' as const, key: 'mff', name: 'Malmö FF' }]
const ctx = { playing: null, audioChannel: null, settings, follows }
const goal = (goalId: string, at = 0): CouchSportGoal => ({ goalId, matchId: 'm', team: { name: 'Malmö FF', short: 'MAL', crest: null }, opponent: 'Djurgården', score: [2, 1], minute: "67'", league: 'Allsvenskan', channel: 'K1', at })
const event: GoalEvent = { fixtureId: '1', provider: 'api-sports', sport: 'football', side: 'away', score: { home: 1, away: 2 }, scorer: 'Berg', minute: 67, at: 500, home: 'Djurgården', away: 'Malmö FF' }

beforeEach(() => { __resetGoalsForTests() })

describe('shouldCard', () => {
  it('följt lag i en match som inte visas ger kort', () => {
    expect(shouldCard(match(), ctx)).toBe(true)
  })
  it('matchen på kanalen som spelar ger inget kort', () => {
    expect(shouldCard(match(), { ...ctx, playing: 'k1' })).toBe(false)
  })
  it('matchen i Multiviews ljudruta ger inget kort', () => {
    expect(shouldCard(match(), { ...ctx, audioChannel: 'k1' })).toBe(false)
  })
  it('en repris ger inget kort', () => {
    expect(shouldCard(match({ rerun: true }), ctx)).toBe(false)
  })
  it('ett ej följt lag utan notis för matchen ger inget kort', () => {
    expect(shouldCard(match(), { ...ctx, follows: [] })).toBe(false)
  })
})

describe('goalFromEvent', () => {
  it('laget som gjorde mål, motståndaren och bästa källan; ställningen från lagets håll', () => {
    const g = goalFromEvent(event, match(), {})
    expect(g).toMatchObject({ matchId: 'm', team: { name: 'Malmö FF', short: 'MAL' }, opponent: 'Djurgården', score: [2, 1], minute: "67'", league: 'Allsvenskan', channel: 'K1', at: 500 })
    expect(g.goalId).toBe(goalFromEvent(event, match(), {}).goalId)
    expect(goalFromEvent(event, match({ sources: [] }), {}).channel).toBeNull()
  })
})

describe('registret', () => {
  it('dismissGoal tar bort målet och meddelar lyssnarna', () => {
    const cb = vi.fn()
    onGoalsChanged(cb)
    addGoal(goal('a'), 0)
    dismissGoal('a')
    expect(openGoals(0)).toEqual([])
    expect(cb).toHaveBeenCalledTimes(2)
    dismissGoal('a')
    expect(cb).toHaveBeenCalledTimes(2)
  })
  it('ett mål går ut efter GOAL_TTL_MS', () => {
    addGoal(goal('a', 0), 0)
    expect(openGoals(GOAL_TTL_MS - 1)).toHaveLength(1)
    expect(openGoals(GOAL_TTL_MS + 1)).toEqual([])
  })
  it('högst 5 mål, de nyaste först; samma id läggs inte till två gånger', () => {
    for (let i = 0; i < 7; i++) addGoal(goal(`g${i}`, i), i)
    addGoal(goal('g6', 6), 6)
    expect(openGoals(10).map((g) => g.goalId)).toEqual(['g6', 'g5', 'g4', 'g3', 'g2'])
    expect(GOALS_MAX).toBe(5)
  })
})
