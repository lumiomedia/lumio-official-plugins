import { beforeEach, describe, expect, it } from 'vitest'
import {
  __resetGroupOrderForTests,
  collectGroups,
  nextGroupOrder,
  orderedGroups,
  rawGroupOrderFor,
  recordRawGroupOrder,
  sanitizeGroupOrder,
  sortGroups,
  withRawOrder,
} from './group-order'
import { applyCuration, curatedGroupCounts } from './list-curation'

const c = (group: string) => ({ group })
const names = (groups: { name: string }[]) => groups.map((g) => g.name)

beforeEach(() => __resetGroupOrderForTests())

describe('sortGroups', () => {
  const groups = [
    { name: 'Sport', count: 5, firstIndex: 2 },
    { name: 'news', count: 2, firstIndex: 0 },
    { name: 'Kids', count: 5, firstIndex: 7 },
    { name: 'Movies', count: 1, firstIndex: 1 },
  ]

  it('playlist: första förekomsten i kanallistan', () => {
    expect(names(sortGroups(groups, 'playlist'))).toEqual(['news', 'Movies', 'Sport', 'Kids'])
  })
  it('name: A–Ö utan hänsyn till skiftläge, siffror som tal', () => {
    expect(names(sortGroups(groups, 'name'))).toEqual(['Kids', 'Movies', 'news', 'Sport'])
    const numbered = [
      { name: 'Channel 10', count: 1, firstIndex: 0 },
      { name: 'Channel 2', count: 1, firstIndex: 1 },
      { name: 'Channel 1', count: 1, firstIndex: 2 },
    ]
    expect(names(sortGroups(numbered, 'name'))).toEqual(['Channel 1', 'Channel 2', 'Channel 10'])
  })
  it('count: det gamla beteendet — flest först, lika antal i namnordning', () => {
    expect(names(sortGroups(groups, 'count'))).toEqual(['Kids', 'Sport', 'news', 'Movies'])
  })
  it('playlist: grupper utan känd plats hamnar sist, i namnordning', () => {
    const mixed = [{ name: 'Zeta', count: 1 }, { name: 'Beta', count: 9, firstIndex: 4 }, { name: 'Alpha', count: 1 }]
    expect(names(sortGroups(mixed, 'playlist'))).toEqual(['Beta', 'Alpha', 'Zeta'])
  })
  it('lämnar indata orörd', () => {
    const copy = [...groups]
    sortGroups(groups, 'name')
    expect(groups).toEqual(copy)
  })
})

describe('collectGroups / orderedGroups', () => {
  it('räknar varje delgrupp i ett semikolonfält och minns första förekomsten', () => {
    const channels = [c('News'), c('Sport;HD'), c('HD'), c(''), c('Sport'), c(' News ')]
    expect(collectGroups(channels)).toEqual([
      { name: 'News', count: 2, firstIndex: 0 },
      { name: 'Sport', count: 2, firstIndex: 1 },
      { name: 'HD', count: 2, firstIndex: 2 },
    ])
    expect(orderedGroups(channels, 'playlist')).toEqual([
      { name: 'News', count: 2 },
      { name: 'Sport', count: 2 },
      { name: 'HD', count: 2 },
    ])
    expect(names(orderedGroups(channels, 'name'))).toEqual(['HD', 'News', 'Sport'])
  })
  it('Alla spellistor: kanalerna ligger spellista för spellista, så spellistans ordning vinner', () => {
    // Spellista 1: Sport, Kids. Spellista 2: News, Sport (Sport redan sedd).
    const all = [c('Sport'), c('Kids'), c('Kids'), c('News'), c('News'), c('News'), c('Sport')]
    expect(names(orderedGroups(all, 'playlist'))).toEqual(['Sport', 'Kids', 'News'])
    expect(names(orderedGroups(all, 'count'))).toEqual(['News', 'Kids', 'Sport'])
  })
  it('ihopslagna grupper (kuraterade kanaler) står på sin första förekomst', () => {
    const raw = [c('UK News'), c('Sport UK'), c('Sports UK;HD'), c('Kids')]
    const curated = applyCuration(raw, { hidden: [], merges: [{ name: 'UK Sport', groups: ['Sport UK', 'Sports UK'] }] })
    expect(orderedGroups(curated, 'playlist')).toEqual([
      { name: 'UK News', count: 1 },
      { name: 'UK Sport', count: 2 },
      { name: 'HD', count: 1 },
      { name: 'Kids', count: 1 },
    ])
  })
})

describe('kvitton utan kanaler (kurateringen, Spellistor-trädet)', () => {
  it('curatedGroupCounts följer läget och lägger en merge på tidigaste medlemmens plats', () => {
    // Kvittot är i bokstavsordning (Rust BTreeMap); spellistan har en annan.
    recordRawGroupOrder('s1', [c('Zeta'), c('Beta'), c('Alpha;Zeta'), c('Gamma'), c('Beta')])
    const receipt = [
      { name: 'Alpha', count: 1 },
      { name: 'Beta', count: 2 },
      { name: 'Gamma', count: 1 },
      { name: 'Zeta', count: 2 },
    ]
    const curation = { hidden: ['Gamma'], merges: [{ name: 'Merged', groups: ['Alpha', 'Beta'] }] }
    const order = rawGroupOrderFor('s1')
    expect(curatedGroupCounts(receipt, curation, 'playlist', order)).toEqual([
      { name: 'Zeta', count: 2 },
      { name: 'Merged', count: 3 },
    ])
    expect(curatedGroupCounts(receipt, curation, 'name', order)).toEqual([
      { name: 'Merged', count: 3 },
      { name: 'Zeta', count: 2 },
    ])
    expect(curatedGroupCounts(receipt, curation, 'count', order)).toEqual([
      { name: 'Merged', count: 3 },
      { name: 'Zeta', count: 2 },
    ])
    // Standard utan läge = det gamla beteendet.
    expect(names(curatedGroupCounts(receipt, undefined))).toEqual(['Beta', 'Zeta', 'Alpha', 'Gamma'])
  })
  it('okänd källa: spellisteläget faller tillbaka till namnordning', () => {
    const receipt = [{ name: 'b', count: 1 }, { name: 'A', count: 5 }]
    expect(rawGroupOrderFor('nope')).toBeUndefined()
    expect(names(sortGroups(withRawOrder(receipt, rawGroupOrderFor('nope')), 'playlist'))).toEqual(['A', 'b'])
  })
})

describe('inställningsvärdet', () => {
  it('ogiltigt blir spellistans ordning, och nextGroupOrder går runt', () => {
    expect(sanitizeGroupOrder('name')).toBe('name')
    expect(sanitizeGroupOrder('size')).toBe('playlist')
    expect(sanitizeGroupOrder(undefined)).toBe('playlist')
    expect(nextGroupOrder('playlist')).toBe('name')
    expect(nextGroupOrder('name')).toBe('count')
    expect(nextGroupOrder('count')).toBe('playlist')
  })
})
