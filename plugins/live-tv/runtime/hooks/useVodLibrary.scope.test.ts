import { beforeEach, describe, expect, it, vi } from 'vitest'

const lists: Array<{ kind?: string; source: string | null }> = []
vi.mock('../live-tv-data', () => ({
  getLiveTvLists: () => lists,
  onLiveTvListsChanged: () => () => {},
}))

import { resolveVodSource } from './useVodLibrary'

describe('resolveVodSource', () => {
  beforeEach(() => {
    lists.length = 0
  })

  it('en vald källa lämnas orörd', () => {
    lists.push({ kind: 'xtream', source: 'xtream://a/1' })
    expect(resolveVodSource('xtream://b/2')).toBe('xtream://b/2')
  })

  it('"alla" med en enda spellista frågar den listans källa — inte kvarlämnade källor i indexet', () => {
    lists.push({ kind: 'xtream', source: 'xtream://a/1' })
    expect(resolveVodSource(null)).toBe('xtream://a/1')
  })

  it('egna listor och listor utan källa räknas inte', () => {
    lists.push({ kind: 'xtream', source: 'xtream://a/1' }, { kind: 'custom', source: 'custom:x' }, { source: null })
    expect(resolveVodSource(null)).toBe('xtream://a/1')
  })

  it('flera spellistor faller tillbaka på värdens "alla"', () => {
    lists.push({ kind: 'xtream', source: 'xtream://a/1' }, { kind: 'm3u', source: 'http://b/list.m3u' })
    expect(resolveVodSource(null)).toBeNull()
  })

  it('ingen spellista faller tillbaka på värdens "alla"', () => {
    expect(resolveVodSource(null)).toBeNull()
  })
})

describe('uniqueByKey', () => {
  it('behåller första förekomsten av varje nyckel, i ordning', async () => {
    const { uniqueByKey } = await import('./useVodLibrary')
    const item = (key: string, title: string) => ({ key, title }) as never
    const out = uniqueByKey([item('series:1', 'A'), item('series:1', 'A2'), item('movie:2', 'B')])
    expect(out.map((i: { title: string }) => i.title)).toEqual(['A', 'B'])
  })
})
