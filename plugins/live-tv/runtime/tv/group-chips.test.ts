import { describe, expect, it } from 'vitest'
import { MAX_GROUP_CHIPS, MORE_GROUPS, buildGroupChips, filterGroupNames, groupCounts, planGroupChips } from './group-chips'

const many = (n: number) => Array.from({ length: n }, (_, i) => `Grupp ${i + 1}`)
const labels = { all: 'Alla', favourites: 'Favoriter', more: (n: number) => `Alla grupper (${n})` }

describe('planGroupChips', () => {
  it('visar alla grupper och ingen "fler"-chip när de ryms', () => {
    const plan = planGroupChips(many(5), null)
    expect(plan.chips).toEqual(many(5))
    expect(plan.more).toBe(false)
    expect(plan.extra).toBeNull()
    expect(plan.total).toBe(5)
  })

  it('exakt taket ger ingen "fler"-chip', () => {
    const plan = planGroupChips(many(MAX_GROUP_CHIPS), null)
    expect(plan.chips).toHaveLength(MAX_GROUP_CHIPS)
    expect(plan.more).toBe(false)
  })

  it('kapar vid taket och flaggar fler när det finns fler grupper', () => {
    const plan = planGroupChips(many(300), null)
    expect(plan.chips).toEqual(many(12))
    expect(plan.more).toBe(true)
    expect(plan.total).toBe(300)
  })

  it('en vald grupp bortom taket blir extra-chip', () => {
    expect(planGroupChips(many(300), 'Grupp 200').extra).toBe('Grupp 200')
  })

  it('en vald grupp bland chippen är ingen extra', () => {
    expect(planGroupChips(many(300), 'Grupp 3').extra).toBeNull()
  })

  it('favoriter, Alla och okända grupper blir ingen extra', () => {
    expect(planGroupChips(many(300), '__favs').extra).toBeNull()
    expect(planGroupChips(many(300), 'Finns inte').extra).toBeNull()
  })

  it('respekterar ett eget tak', () => {
    const plan = planGroupChips(many(10), null, 4)
    expect(plan.chips).toEqual(many(4))
    expect(plan.more).toBe(true)
  })
})

describe('filterGroupNames', () => {
  const groups = ['Sverige | Sport', 'UK Sports', 'Nyheter', 'ÅÄÖ Kanaler']

  it('tom fråga ger alla grupper', () => {
    expect(filterGroupNames(groups, '')).toEqual(groups)
    expect(filterGroupNames(groups, '   ')).toEqual(groups)
  })

  it('filtrerar på delsträng utan hänsyn till skiftläge', () => {
    expect(filterGroupNames(groups, 'SPORT')).toEqual(['Sverige | Sport', 'UK Sports'])
    expect(filterGroupNames(groups, 'åäö')).toEqual(['ÅÄÖ Kanaler'])
  })

  it('trimmar frågan', () => {
    expect(filterGroupNames(groups, '  nyh ')).toEqual(['Nyheter'])
  })

  it('ingen träff ger tom lista', () => {
    expect(filterGroupNames(groups, 'xyz')).toEqual([])
  })
})

describe('buildGroupChips', () => {
  it('Alla först, favoriter om det finns, sedan grupperna', () => {
    const chips = buildGroupChips({ groups: many(3), selected: null, hasFavourites: true, labels })
    expect(chips.map((c) => c.id)).toEqual(['all', 'favs', 'Grupp 1', 'Grupp 2', 'Grupp 3'])
    expect(chips[0].key).toBeNull()
    expect(chips[1].key).toBe('__favs')
  })

  it('utan favoriter ingen favoritchip', () => {
    const chips = buildGroupChips({ groups: many(2), selected: null, hasFavourites: false, labels })
    expect(chips.map((c) => c.id)).toEqual(['all', 'Grupp 1', 'Grupp 2'])
  })

  it('"Alla grupper (N)" sist när grupperna inte ryms', () => {
    const chips = buildGroupChips({ groups: many(300), selected: null, hasFavourites: false, labels })
    expect(chips).toHaveLength(1 + 12 + 1)
    const last = chips[chips.length - 1]
    expect(last.key).toBe(MORE_GROUPS)
    expect(last.label).toBe('Alla grupper (300)')
    expect(last.id).toBe('more-groups')
  })

  it('en vald grupp bortom taket ritas direkt efter Alla/Favoriter', () => {
    const chips = buildGroupChips({ groups: many(300), selected: 'Grupp 250', hasFavourites: true, labels })
    expect(chips.map((c) => c.id).slice(0, 3)).toEqual(['all', 'favs', 'Grupp 250'])
    expect(chips[2].key).toBe('Grupp 250')
    expect(chips.filter((c) => c.key === 'Grupp 250')).toHaveLength(1)
  })
})

describe('groupCounts', () => {
  it('räknar kanaler per grupp', () => {
    const counts = groupCounts([{ group: 'A' }, { group: 'B' }, { group: 'A' }])
    expect(counts.get('A')).toBe(2)
    expect(counts.get('B')).toBe(1)
    expect(counts.get('C')).toBeUndefined()
  })
})
