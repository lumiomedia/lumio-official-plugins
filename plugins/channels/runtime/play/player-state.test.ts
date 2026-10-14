import { describe, expect, it } from 'vitest'
import { initialPlayerState, playerReducer, triedFor, type Plan, type PlayerState } from './player-state'

const slot = (ref: string, stop: number) => ({ kind: 'programme', item: { ref }, start: 0, stop } as never)
const plan = (seq: number, ref = 'a', stop = 100_000): Plan => ({ seq, slot: slot(ref, stop), initialTime: 0, deadline: stop, mode: 'live' })
const playing = (): PlayerState => {
  let s = initialPlayerState('c1', 'live')
  s = playerReducer(s, { type: 'planned', plan: plan(0) })
  return playerReducer(s, { type: 'resolved', seq: 0, playable: { url: 'u1' } })
}

describe('spelarens tillstånd', () => {
  it('det visade ligger kvar medan nästa slås upp', () => {
    let s = playerReducer(playing(), { type: 'advance', seq: 0, now: 100_500 })
    s = playerReducer(s, { type: 'planned', plan: plan(1, 'b', 200_000) })
    expect(s.status).toBe('resolving')
    expect(s.onScreen?.playable.url).toBe('u1')
    s = playerReducer(s, { type: 'resolved', seq: 1, playable: { url: 'u2' } })
    expect(s.onScreen?.playable.url).toBe('u2')
    expect(s.status).toBe('playing')
  })

  it('dubbelt programbyte samma tick blir ett', () => {
    let s = playerReducer(playing(), { type: 'advance', seq: 0, now: 100_500 })
    s = playerReducer(s, { type: 'advance', seq: 0, now: 100_500 })
    expect(s.request.seq).toBe(1)
  })

  it('före gränsen: nästa program vid gränsen; efter: live från nu', () => {
    expect(playerReducer(playing(), { type: 'advance', seq: 0, now: 50_000 }).request.at).toBe(101_000)
    expect(playerReducer(playing(), { type: 'advance', seq: 0, now: 100_000 }).request.at).toBeNull()
  })

  it('en fallerad version: nästa version av SAMMA program live, inget hopp till nästa program', () => {
    const s = playerReducer(playing(), { type: 'failed', seq: 0, now: 50_000, url: 'u1' })
    expect(s.status).toBe('resolving')
    expect(s.request).toMatchObject({ seq: 1, at: null, mode: 'live' })
    expect(s.tried?.urls).toEqual(['u1'])
    expect(triedFor(s, plan(1).slot)).toEqual(['u1'])
    // Ett annat program har inga provade adresser.
    expect(triedFor(s, plan(1, 'b').slot)).toEqual([])
  })

  it('högst tre versioner, sedan Ingen signal till programgränsen', () => {
    let s = playing()
    s = playerReducer(s, { type: 'failed', seq: 0, now: 50_000, url: 'u1' })
    s = playerReducer(s, { type: 'planned', plan: plan(1) })
    s = playerReducer(s, { type: 'resolved', seq: 1, playable: { url: 'u2' } })
    s = playerReducer(s, { type: 'failed', seq: 1, now: 51_000, url: 'u2' })
    s = playerReducer(s, { type: 'planned', plan: plan(2) })
    s = playerReducer(s, { type: 'resolved', seq: 2, playable: { url: 'u3' } })
    s = playerReducer(s, { type: 'failed', seq: 2, now: 52_000, url: 'u3' })
    expect(s.status).toBe('nosignal')
    expect(s.onScreen).toBeNull()
    expect(s.noSignal?.retryAt).toBe(100_000)
    expect(s.request.seq).toBe(2)
  })

  it('ingen (fler) version att hitta: Ingen signal direkt', () => {
    let s = initialPlayerState('c1', 'live')
    s = playerReducer(s, { type: 'planned', plan: plan(0) })
    s = playerReducer(s, { type: 'failed', seq: 0, now: 10_000 })
    expect(s.status).toBe('nosignal')
    expect(s.noSignal?.slot.item.ref).toBe('a')
  })

  it('gamla svar ignoreras; kanalbyte och programbyte nollar försöken', () => {
    let s = playerReducer(playing(), { type: 'failed', seq: 0, now: 50_000, url: 'u1' })
    s = playerReducer(s, { type: 'resolved', seq: 0, playable: { url: 'gammal' } })
    expect(s.onScreen?.playable.url).toBe('u1')
    const switched = playerReducer(s, { type: 'goto', channelId: 'c2', mode: 'live' })
    expect(switched.tried).toBeNull()
    expect(switched.request).toMatchObject({ channelId: 'c2', at: null, seq: 2 })
    const advanced = playerReducer(playing(), { type: 'advance', seq: 0, now: 100_500 })
    expect(advanced.tried).toBeNull()
  })
})
