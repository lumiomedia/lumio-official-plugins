import { describe, expect, it } from 'vitest'
import { goalAlertWanted, goalBody, goalTitle, matchForGoal } from './goal-alerts'
import { tvText } from '../tv/tv-strings'
import type { GoalEvent } from './goal-events'
import type { SportSettings } from './sport-store'
import { fxMatch } from './__sport-fixture'

const tt = (k: Parameters<typeof tvText>[1], v?: Record<string, string | number>) => tvText('sv', k, v)
const e: GoalEvent = { fixtureId: '1', provider: 'api-sports', sport: 'football', side: 'home', score: { home: 3, away: 1 }, scorer: 'S. Larsson', minute: 67, at: 0, home: 'Malmo FF', away: 'AIK' }
const match = fxMatch({ id: 'm1', home: 'Malmo FF', away: 'AIK', homeKey: 'malmo', awayKey: 'aik', leagueKey: 'a', fixture: { provider: 'api-sports', id: '1' } })
const settings = (over: Partial<SportSettings> = {}) => ({ apiKey: 'k', view: 'matchday', alert: 'off', goalAlerts: true, provider: 'api-sports', keyPlan: null, keyCardDismissed: false, goalAlertMatches: {}, ...over }) as SportSettings

describe('goal-alerts', () => {
  it('hittar matchen via källa och fixtur-id', () => {
    expect(matchForGoal(e, [match])).toBe(match)
    expect(matchForGoal({ ...e, fixtureId: '2' }, [match])).toBeNull()
  })
  it('notis kräver målnotis på OCH följd match eller "Notis vid mål" för matchen', () => {
    expect(goalAlertWanted(match, settings(), [{ sport: 'football', kind: 'team', key: 'malmo', name: 'Malmö FF' }])).toBe(true)
    expect(goalAlertWanted(match, settings(), [])).toBe(false)
    expect(goalAlertWanted(match, settings({ goalAlertMatches: { m1: 10_000 } }), [], 5_000)).toBe(true)
    expect(goalAlertWanted(match, settings({ goalAlerts: false, goalAlertMatches: { m1: 10_000 } }), [], 5_000)).toBe(false)
    expect(goalAlertWanted(null, settings(), [])).toBe(false)
  })
  it('texterna', () => {
    expect(goalTitle(e, tt)).toBe('MÅL! Malmo FF 3–1 AIK')
    expect(goalBody(e)).toBe("S. Larsson 67'")
    expect(goalBody({ ...e, scorer: null })).toBe("67'")
  })
})
