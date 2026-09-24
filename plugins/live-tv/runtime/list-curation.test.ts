import { describe, expect, it, beforeEach } from 'vitest'
import { __resetForTests, readPluginJson, writePluginJson } from '@/lib/plugin-sdk'
import { applyCuration, curatedGroupCounts, mergeNameConflict, normalizeCuration, renameMerge } from './list-curation'
import { LIVE_TV_PLUGIN_ID, getLiveTvLists, markListCurationSeen, updateLiveTvListCuration, type LiveTvList } from './live-tv-data'

const ch = (name: string, group: string) => ({ name, group, url: `http://x/${name}`, tvgId: null, logo: null })

describe('applyCuration', () => {
  it('är identitet utan regler', () => {
    const items = [ch('a', 'Sport'), ch('b', 'News')]
    expect(applyCuration(items, undefined)).toEqual(items)
  })
  it('filtrerar bort dolda grupper', () => {
    const out = applyCuration([ch('a', 'Sport'), ch('b', 'News')], { hidden: ['News'], merges: [] })
    expect(out.map((c) => c.name)).toEqual(['a'])
  })
  it('skriver om grupper i en merge till merge-namnet', () => {
    const out = applyCuration([ch('a', 'UK Sport'), ch('b', 'Sports UK')], { hidden: [], merges: [{ name: 'Sport', groups: ['UK Sport', 'Sports UK'] }] })
    expect(out.map((c) => c.group)).toEqual(['Sport', 'Sport'])
  })
  it('behåller en multigrupp-kanal när bara en delgrupp döljs', () => {
    const out = applyCuration([ch('a', 'Sport;HD')], { hidden: ['HD'], merges: [] })
    expect(out[0].group).toBe('Sport')
  })
  it('tar bort en multigrupp-kanal när alla delgrupper är dolda', () => {
    expect(applyCuration([ch('a', 'Sport;HD')], { hidden: ['HD', 'Sport'], merges: [] })).toEqual([])
  })
  it('ger dubblettfritt gruppfält när två delgrupper landar i samma merge', () => {
    const out = applyCuration([ch('a', 'UK Sport;Sports UK')], { hidden: [], merges: [{ name: 'Sport', groups: ['UK Sport', 'Sports UK'] }] })
    expect(out[0].group).toBe('Sport')
  })
  it('en dold medlem i en merge visas under mergens namn (dolt läge vilar)', () => {
    const out = applyCuration([ch('a', 'UK Sport')], { hidden: ['UK Sport'], merges: [{ name: 'Sport', groups: ['UK Sport'] }] })
    expect(out.map((c) => c.group)).toEqual(['Sport'])
  })
  it('split återställer dolt läge: utan mergen filtreras medlemmen igen', () => {
    const out = applyCuration([ch('a', 'UK Sport'), ch('b', 'News')], { hidden: ['UK Sport'], merges: [] })
    expect(out.map((c) => c.name)).toEqual(['b'])
  })
  it('lämnar kanaler utan grupp orörda', () => {
    const out = applyCuration([ch('a', '')], { hidden: ['X'], merges: [] })
    expect(out).toHaveLength(1)
  })
})

describe('normalizeCuration', () => {
  it('ger undefined för tom kuratering', () => {
    expect(normalizeCuration({ hidden: [], merges: [] })).toBeUndefined()
    expect(normalizeCuration(undefined)).toBeUndefined()
  })
  it('behåller hidden för en grupp som också ingår i en merge (vilande läge), och kastar tomma namn', () => {
    const out = normalizeCuration({ hidden: ['A', 'A', ''], merges: [{ name: ' Sport ', groups: ['A', 'B', 'B'] }, { name: '', groups: ['C'] }] })
    expect(out).toEqual({ hidden: ['A'], merges: [{ name: 'Sport', groups: ['A', 'B'] }] })
  })
  it('låter en grupp ingå i högst en merge (första vinner)', () => {
    const out = normalizeCuration({ hidden: [], merges: [{ name: 'X', groups: ['A'] }, { name: 'Y', groups: ['A', 'B'] }] })
    expect(out).toEqual({ hidden: [], merges: [{ name: 'X', groups: ['A'] }, { name: 'Y', groups: ['B'] }] })
  })
})

describe('curatedGroupCounts', () => {
  const groups = [{ name: 'A', count: 5 }, { name: 'B', count: 3 }, { name: 'C', count: 10 }]
  it('utan regler: sorterat efter antal fallande', () => {
    expect(curatedGroupCounts(groups, undefined).map((g) => g.name)).toEqual(['C', 'A', 'B'])
  })
  it('döljer och summerar merges', () => {
    const out = curatedGroupCounts(groups, { hidden: ['C'], merges: [{ name: 'AB', groups: ['A', 'B'] }] })
    expect(out).toEqual([{ name: 'AB', count: 8 }])
  })
  it('en dold medlem räknas in i mergen', () => {
    const out = curatedGroupCounts(groups, { hidden: ['A'], merges: [{ name: 'AB', groups: ['A', 'B'] }] })
    expect(out.find((g) => g.name === 'AB')?.count).toBe(8)
    expect(out.find((g) => g.name === 'A')).toBeUndefined()
  })
  it('en merge vars grupper saknas i källan visas inte, men en delvis känd merge visas med känt antal', () => {
    const out = curatedGroupCounts(groups, { hidden: [], merges: [{ name: 'Gone', groups: ['Z'] }, { name: 'Part', groups: ['A', 'Z'] }] })
    expect(out.map((g) => g.name)).toEqual(['C', 'Part', 'B'])
    expect(out.find((g) => g.name === 'Part')?.count).toBe(5)
  })
})

describe('mergeNameConflict', () => {
  const groups = [{ name: 'Sport' }, { name: 'News' }]
  it('tomt namn', () => expect(mergeNameConflict('  ', groups, { hidden: [], merges: [] })).toBe('empty'))
  it('kollision med synlig originalgrupp', () => expect(mergeNameConflict('Sport', groups, { hidden: [], merges: [] })).toBe('visible-group'))
  it('tillåtet när originalgruppen är dold', () => expect(mergeNameConflict('Sport', groups, { hidden: ['Sport'], merges: [] })).toBeNull())
  it('tillåtet att döpa mergen efter en av sina egna medlemmar', () => expect(mergeNameConflict('Sport', groups, { hidden: [], merges: [] }, ['Sport', 'News'])).toBeNull())
  it('kollision med befintlig merge', () => expect(mergeNameConflict('Mix', groups, { hidden: [], merges: [{ name: 'Mix', groups: ['News'] }] })).toBe('duplicate'))
})

describe('renameMerge', () => {
  const cur = { hidden: [], merges: [{ name: 'Sport', groups: ['A', 'B'] }, { name: 'News', groups: ['C'] }] }
  it('byter namn på mergen med givet index och trimmar', () => {
    expect(renameMerge(cur, 0, ' Sports ').merges[0].name).toBe('Sports')
  })
  it('tomt namn lämnar kurateringen oförändrad', () => {
    expect(renameMerge(cur, 0, '   ')).toEqual(cur)
  })
  it('krock med en annan merge lämnar kurateringen oförändrad', () => {
    expect(renameMerge(cur, 0, 'News')).toEqual(cur)
  })
  it('returnerar en kopia, inte samma objekt', () => {
    const out = renameMerge(cur, 1, 'World')
    expect(out).not.toBe(cur)
    expect(cur.merges[1].name).toBe('News')
    expect(out.merges[1].name).toBe('World')
  })
})

describe('lagring', () => {
  const list: LiveTvList = { id: 'l1', name: 'Lista', createdAt: '2026-01-01', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null, kind: 'm3u', source: 'http://x/p.m3u', url: 'http://x/p.m3u' }
  beforeEach(() => { __resetForTests(); writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list]) })
  it('updateLiveTvListCuration skriver normaliserat och sätter curationSeen', () => {
    updateLiveTvListCuration('l1', { hidden: ['X', 'X'], merges: [] })
    const stored = getLiveTvLists().find((l) => l.id === 'l1')!
    expect(stored.curation).toEqual({ hidden: ['X'], merges: [] })
    expect(stored.curationSeen).toBe(true)
  })
  it('tom kuratering sparas som frånvarande fält', () => {
    updateLiveTvListCuration('l1', { hidden: [], merges: [] })
    const raw = readPluginJson<LiveTvList[]>(LIVE_TV_PLUGIN_ID, 'lists', [])
    expect('curation' in raw[0]).toBe(false)
  })
  it('markListCurationSeen rör inte reglerna', () => {
    updateLiveTvListCuration('l1', { hidden: ['X'], merges: [] })
    markListCurationSeen('l1')
    expect(getLiveTvLists()[0].curation).toEqual({ hidden: ['X'], merges: [] })
  })
})
