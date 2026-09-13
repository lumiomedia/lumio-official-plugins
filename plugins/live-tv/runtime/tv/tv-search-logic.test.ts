import { describe, expect, it } from 'vitest'
import { searchChannels, suggestions } from './tv-search-logic'

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

describe('suggestions', () => {
  it('ger unika förslag som börjar på strängen', () => {
    expect(suggestions('s', channels, ['Sports Tonight', 'sports tonight', 'News'])).toEqual(['SKY SPORTS MAIN', 'Sportsnet 360', 'Sports Tonight'])
  })
})
