import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ budget: null as any }))
vi.mock('./budget', () => ({ currentBudget: () => h.budget }))

import { __resetFollowSearchForTests, matchesQuery, searchFollowTargets } from './follow-search'

function fakeBudget(coverage: 'full' | 'epg' = 'full', withLeagues = true) {
  return {
    provider: { id: 'api-sports', coverage: () => coverage },
    searchTeams: vi.fn(async () => ({ ok: true, data: [{ id: '489', name: 'AC Milan', crest: null, country: 'Italy' }, { id: '489', name: 'AC Milan', crest: null, country: 'Italy' }] })),
    searchLeagues: vi.fn(() => (withLeagues ? Promise.resolve({ ok: true, data: [{ id: '135', name: 'Serie A', crest: null, country: 'Italy' }] }) : null)),
  }
}

beforeEach(() => { __resetFollowSearchForTests(); h.budget = null })

describe('searchFollowTargets', () => {
  it('lag + turneringar via budgeten, dubbletter bort, sport på varje träff', async () => {
    h.budget = fakeBudget()
    const res = await searchFollowTargets('football', 'Milan')
    expect(res).toEqual([
      { kind: 'team', sport: 'football', id: '489', name: 'AC Milan', crest: null, country: 'Italy' },
      { kind: 'league', sport: 'football', id: '135', name: 'Serie A', crest: null, country: 'Italy' },
    ])
    expect(h.budget.searchTeams).toHaveBeenCalledWith('football', 'Milan')
    expect(h.budget.searchLeagues).toHaveBeenCalledWith('football', 'Milan')
  })
  it('cachas per fråga (accentokänsligt): samma fråga kostar inget nytt anrop', async () => {
    h.budget = fakeBudget()
    await searchFollowTargets('football', 'Malmö')
    await searchFollowTargets('football', ' malmo ')
    expect(h.budget.searchTeams).toHaveBeenCalledTimes(1)
  })
  it('under 3 tecken, utan nyckel eller utan täckning: inget anrop', async () => {
    expect(await searchFollowTargets('football', 'Milan')).toEqual([])
    h.budget = fakeBudget()
    expect(await searchFollowTargets('football', 'Mi')).toEqual([])
    h.budget = fakeBudget('epg')
    expect(await searchFollowTargets('football', 'Milan')).toEqual([])
    expect(h.budget.searchTeams).not.toHaveBeenCalled()
  })
  it('källa utan ligasökning: bara lag', async () => {
    h.budget = fakeBudget('full', false)
    expect((await searchFollowTargets('football', 'Milan')).map((x) => x.kind)).toEqual(['team'])
  })
})

describe('matchesQuery', () => {
  it('accentokänslig delsträng i namn eller nyckel', () => {
    expect(matchesQuery({ name: 'Frölunda', key: 'frolunda' }, 'frol')).toBe(true)
    expect(matchesQuery({ name: 'Malmö FF', key: 'malmo ff' }, 'MALMÖ')).toBe(true)
    expect(matchesQuery({ name: 'AIK', key: 'aik' }, 'milan')).toBe(false)
    expect(matchesQuery({ name: 'AIK', key: 'aik' }, '  ')).toBe(true)
  })
})
