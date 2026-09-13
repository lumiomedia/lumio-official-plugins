import { describe, expect, it } from 'vitest'
import { searchChannels, searchProgrammes, suggestions } from './tv-search-logic'

const ch = (name: string, group = 'Sport') => ({ name, group, url: `http://x/${name}`, tvgId: null })
const channels = [ch('SKY SPORTS MAIN'), ch('ESPN UHD'), ch('Sportsnet 360')]

describe('searchChannels', () => {
  it('matchar delsträng oavsett skiftläge, prefixträff först', () => {
    expect(searchChannels('sport', channels).map((c) => c.name)).toEqual(['Sportsnet 360', 'SKY SPORTS MAIN'])
  })
  it('tom sökning ger tom lista', () => {
    expect(searchChannels('  ', channels)).toEqual([])
  })
})

describe('searchProgrammes', () => {
  it('hittar dagens program på titel', () => {
    const day = { start: 0, end: 86_400_000 }
    const scheduleFor = (c: { name: string }, _fromMs: number, _toMs: number) => (c.name === 'ESPN UHD' ? [{ title: 'College GameDay', start: 1000, stop: 2000 }] : [])
    const hits = searchProgrammes('game', channels, scheduleFor, day)
    expect(hits).toHaveLength(1)
    expect(hits[0].channel.name).toBe('ESPN UHD')
  })
})

describe('suggestions', () => {
  it('ger unika förslag som börjar på strängen', () => {
    expect(suggestions('s', channels, ['Sports Tonight', 'sports tonight', 'News'])).toEqual(['SKY SPORTS MAIN', 'Sportsnet 360', 'Sports Tonight'])
  })
})
