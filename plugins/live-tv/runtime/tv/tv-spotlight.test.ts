import { describe, expect, it, vi } from 'vitest'
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
  it('slutar leta så snart urvalet är fullt', () => {
    // Slingorna gick förut till slutet även när urvalet var fullt, och två av
    // dem slår upp EPG per kanal. Hubben ber om en handfull kort ur en
    // spellista som kan ha tiotusentals kanaler — varje minuttick kostade en
    // full genomsökning för fyra kort.
    const channels = Array.from({ length: 5000 }, (_, i) => ch(`K${i}`))
    const nowFor = vi.fn(() => ({ now, next: null, later: null }))
    const picks = pickSpotlight({ favourites: [], recent: [], channels, nowFor, count: 4 })
    expect(picks).toHaveLength(4)
    expect(nowFor.mock.calls.length).toBeLessThanOrEqual(5)
  })
})

describe('pickSpotlight med seed (Jerry 2026-09-17: slumpade favoriter)', () => {
  const ch = (name: string) => ({ name, logo: null, group: 'Sport', url: `http://x/${name}`, tvgId: null })
  const favs = ['A', 'B', 'C', 'D', 'E', 'F'].map(ch)
  const live = { now: { title: 'x', start: 0, stop: 1 }, next: null, later: null }
  it('samma seed ger samma ordning, olika seed ger (nästan säkert) en annan', () => {
    const a = pickSpotlight({ favourites: favs, recent: [], channels: [], nowFor: () => live, count: 3, seed: 7 })
    const b = pickSpotlight({ favourites: favs, recent: [], channels: [], nowFor: () => live, count: 3, seed: 7 })
    expect(a.map((p) => p.channel.name)).toEqual(b.map((p) => p.channel.name))
    const orders = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => pickSpotlight({ favourites: favs, recent: [], channels: [], nowFor: () => live, count: 3, seed }).map((p) => p.channel.name).join()))
    expect(orders.size).toBeGreaterThan(1)
  })
  it('utan seed: dagens ordning (de första favoriterna)', () => {
    const out = pickSpotlight({ favourites: favs, recent: [], channels: [], nowFor: () => live, count: 3 })
    expect(out.map((p) => p.channel.name)).toEqual(['A', 'B', 'C'])
  })
  it('favoriter med pågående program går först även när de blandas', () => {
    const nowFor = (c: { name: string }) => (c.name === 'F' ? live : { now: null, next: null, later: null })
    for (const seed of [1, 2, 3]) {
      const out = pickSpotlight({ favourites: favs, recent: [], channels: [], nowFor, count: 3, seed })
      expect(out[0]?.channel.name).toBe('F')
      expect(out[0]?.reason).toBe('favouriteLive')
    }
  })
})
