// runtime/sport/day-plan.test.ts
import { describe, expect, it } from 'vitest'
import { localDates, planDay, plannedPerBucket, planKey } from './day-plan'
import { apiSports } from './api-sports'
import { theSportsDb } from './thesportsdb'

const base = { today: '2026-10-10', yesterday: '2026-10-09', tomorrow: '2026-10-11' }

describe('planDay', () => {
  it('idag först, sedan igår/imorgon, sedan tabeller; tennis aldrig', () => {
    const plan = planDay({ ...base, sports: ['football', 'tennis', 'hockey'], leagues: [{ sport: 'football', leagueId: '113', season: '2026' }], done: new Set() }, apiSports)
    expect(plan.map(planKey)).toEqual([
      'day|football|2026-10-10', 'day|hockey|2026-10-10',
      'day|football|2026-10-09', 'day|football|2026-10-11', 'day|hockey|2026-10-09', 'day|hockey|2026-10-11',
      'standings|football|113|2026',
    ])
  })
  it('det som hämtats i dag planeras inte igen (utom idag)', () => {
    const done = new Set(['day|football|2026-10-09', 'day|football|2026-10-11', 'standings|football|113|2026', 'day|football|2026-10-10'])
    const plan = planDay({ ...base, sports: ['football'], leagues: [{ sport: 'football', leagueId: '113', season: '2026' }], done }, apiSports)
    expect(plan.map(planKey)).toEqual(['day|football|2026-10-10'])
  })
  it('dubbletter av ligor slås ihop', () => {
    const l = { sport: 'hockey' as const, leagueId: '47', season: '2026' }
    expect(planDay({ ...base, sports: [], leagues: [l, l], done: new Set() }, apiSports).map(planKey)).toEqual(['standings|hockey|47|2026'])
  })
})

describe('plannedPerBucket', () => {
  it('API-Sports räknar per sport, TheSportsDB i en hink', () => {
    const plan = planDay({ ...base, sports: ['football', 'hockey'], leagues: [], done: new Set() }, apiSports)
    expect(Object.fromEntries(plannedPerBucket(plan, apiSports))).toEqual({ football: 3, hockey: 3 })
    expect(Object.fromEntries(plannedPerBucket(plan, theSportsDb))).toEqual({ all: 6 })
  })
})

describe('localDates', () => {
  it('Stockholm kl 01:30 lokal tid är fortfarande 2026-10-10', () => {
    const d = localDates(Date.UTC(2026, 9, 9, 23, 30), 'Europe/Stockholm')
    expect([d.yesterday, d.today, d.tomorrow]).toEqual(['2026-10-09', '2026-10-10', '2026-10-11'])
    expect(d.dayEndMs('2026-10-10')).toBe(Date.UTC(2026, 9, 10, 22))
  })
})
