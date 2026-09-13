import { describe, expect, it } from 'vitest'
import { pickSpotlight } from './tv-spotlight'

const ch = (name: string) => ({ name, group: '', url: `http://x/${name}`, tvgId: null })
const now = { title: 'X', start: 0, stop: 1 }
const empty = { now: null, next: null, later: null }

describe('pickSpotlight', () => {
  it('favorit som sänder live först, sedan favoriter, senast sedda, sändande kanaler', () => {
    const favs = [ch('F1'), ch('F2')]
    const recent = [ch('R1')]
    const all = [ch('A'), ch('B')]
    const nowFor = (c: { name: string }) => (c.name === 'F2' || c.name === 'B' ? { now, next: null, later: null } : empty)
    const picks = pickSpotlight({ favourites: favs, recent, channels: all, nowFor, count: 3 })
    expect(picks.map((p) => [p.channel.name, p.reason])).toEqual([['F2', 'favouriteLive'], ['F1', 'favourite'], ['R1', 'recent']])
  })
  it('dubbletter tas bort och antalet begränsas', () => {
    const a = ch('A')
    const picks = pickSpotlight({ favourites: [a], recent: [a], channels: [a, ch('B')], nowFor: () => ({ now, next: null, later: null }), count: 2 })
    expect(picks.map((p) => p.channel.name)).toEqual(['A', 'B'])
  })
})
