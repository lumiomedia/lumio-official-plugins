import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetToastsForTests, hasToasts, ToastCenter } from '../toast-center'
import { __resetGoalsForTests, dismissGoal, openGoals } from './couch/goals'
import { emitGoals, type GoalEvent } from './goal-events'
import { setPlayingChannel } from './goal-alerts'
import type { SportMatch } from './sport-model'
import { SportGoalMount } from './sport-goal-mount'

const h = vi.hoisted(() => ({ merged: [] as unknown[] }))
vi.mock('./results-controller', async (orig) => ({ ...(await orig<typeof import('./results-controller')>()), currentResults: () => ({ merged: () => h.merged }) }))
vi.mock('./sport-store', async (orig) => ({
  ...(await orig<typeof import('./sport-store')>()),
  getSportSettings: () => ({ goalAlerts: true, goalAlertMatches: {} }),
  getFollows: () => [{ sport: 'football', kind: 'team', key: 'mff', name: 'Malmö FF' }],
  getOverrides: () => ({}),
}))
vi.mock('../reminders', () => ({ tryNativeNotification: () => {} }))

const match: SportMatch = {
  id: 'm', kind: 'football', league: 'Allsvenskan', leagueKey: 'se1', home: 'Djurgården', away: 'Malmö FF', homeKey: 'dif', awayKey: 'mff',
  event: null, start: 0, stop: 7_200_000, status: 'live', rerun: false, round: 24, venue: null,
  sources: [{ channelKey: 'k1', name: 'K1', url: 'u', logo: null, group: 'g', tvgId: null, sourceId: 's', quality: null, programmeStart: 0, programmeStop: 10, liveFlag: true }],
  coverage: 'full', fixture: { provider: 'api-sports', id: '1' },
}
const event: GoalEvent = { fixtureId: '1', provider: 'api-sports', sport: 'football', side: 'away', score: { home: 1, away: 2 }, scorer: null, minute: 67, at: 0, home: 'Djurgården', away: 'Malmö FF' }

beforeEach(() => { h.merged = [match]; __resetGoalsForTests(); __resetToastsForTests(); setPlayingChannel(null) })
afterEach(() => { cleanup() })

describe('SportGoalMount', () => {
  it('ett mål för ett följt lag ger toast och öppet mål; en telefons Stäng tar bort toasten', () => {
    render(<><SportGoalMount /><ToastCenter /></>)
    act(() => { emitGoals([event]) })
    expect(openGoals(Date.now())).toHaveLength(1)
    expect(hasToasts()).toBe(true)
    act(() => { dismissGoal(openGoals(Date.now())[0].goalId) })
    expect(hasToasts()).toBe(false)
  })
  it('matchen som spelar ger varken toast eller mål', () => {
    render(<><SportGoalMount /><ToastCenter /></>)
    setPlayingChannel('k1')
    act(() => { emitGoals([event]) })
    expect(openGoals(Date.now())).toEqual([])
    expect(hasToasts()).toBe(false)
  })
})
