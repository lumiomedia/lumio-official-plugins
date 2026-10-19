import { describe, expect, it } from 'vitest'
import { canonGenre, genresMatch } from './genres'
import { filterPool, poolSignature, type PoolItem } from './pool'
import { createChannel, emptyDraft } from '../model/channel'

const p = (ref: string, genres: string[]): PoolItem => ({
  ref, title: ref, runtimeMin: 60, runtimeKnown: true, year: 1985, kind: 'movie', source: 'library', genres,
  play: { type: 'library', key: ref, mediaType: 'movie' },
})
const rules = { kind: 'any', era: 'any', length: 'any' } as const

describe('genrer mellan källor', () => {
  it('kanoniserar stavningar och delar sammansatta genrer', () => {
    expect(canonGenre(' Sci-Fi ')).toEqual(['science fiction'])
    expect(canonGenre('Science-Fiction')).toEqual(['science fiction'])
    expect(canonGenre('Action & Adventure')).toEqual(['action', 'adventure'])
    expect(canonGenre('Sci-Fi & Fantasy')).toEqual(['science fiction', 'fantasy'])
    expect(canonGenre('War & Politics')).toEqual(['war', 'politics'])
    expect(canonGenre('Comedy/Drama')).toEqual(['comedy', 'drama'])
  })

  it('TV:s "Action & Adventure" matchar chipet Action och "Sci-Fi" matchar Science Fiction', () => {
    expect(genresMatch(['Action & Adventure'], ['Action'])).toBe(true)
    expect(filterPool([p('a', ['Action & Adventure']), p('b', ['Drama'])], { ...rules, genres: ['Action'] }).map((i) => i.ref)).toEqual(['a'])
    expect(filterPool([p('c', ['Sci-Fi']), p('d', ['Sci-Fi & Fantasy'])], { ...rules, genres: ['Science Fiction'] }).map((i) => i.ref)).toEqual(['c', 'd'])
  })

  it('signaturen är stabil mellan stavningsvarianter', () => {
    const ch = createChannel({ ...emptyDraft(), name: 'A', genres: ['Sci-Fi', 'Action'] }, [], 1, () => 0.1)
    const alt = { ...ch, genres: ['action', 'Science Fiction'] }
    expect(poolSignature(ch, {})).toBe(poolSignature(alt, {}))
  })
})
