import { describe, expect, it } from 'vitest'
import { initialPlayerState, playerReducer, type Plan, type PlayerState } from './player-state'

const slot = (ref: string, stop: number) => ({ kind: 'programme', item: { ref }, stop } as never)
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

  it('ett felhopp, sedan felvy utan notis', () => {
    let s = playerReducer(playing(), { type: 'failed', seq: 0, now: 50_000 })
    expect(s.notice).toBe('skipping')
    expect(s.request.seq).toBe(1)
    s = playerReducer(s, { type: 'planned', plan: plan(1, 'b') })
    s = playerReducer(s, { type: 'failed', seq: 1, now: 60_000 })
    expect(s.status).toBe('error')
    expect(s.notice).toBeNull()
    expect(s.onScreen).toBeNull()
  })

  it('lyckad start nollar felhoppet; gamla svar ignoreras', () => {
    let s = playerReducer(playing(), { type: 'failed', seq: 0, now: 50_000 })
    s = playerReducer(s, { type: 'resolved', seq: 0, playable: { url: 'gammal' } })
    expect(s.onScreen?.playable.url).toBe('u1')
    s = playerReducer(s, { type: 'planned', plan: plan(1, 'b') })
    s = playerReducer(s, { type: 'resolved', seq: 1, playable: { url: 'u2' } })
    s = playerReducer(s, { type: 'firstPlay', seq: 1 })
    expect(s.failedOnce).toBe(false)
    expect(s.notice).toBeNull()
  })

  it('kanalbyte nollar felhoppet', () => {
    let s = playerReducer(playing(), { type: 'failed', seq: 0, now: 50_000 })
    s = playerReducer(s, { type: 'goto', channelId: 'c2', mode: 'live' })
    expect(s.failedOnce).toBe(false)
    expect(s.request).toMatchObject({ channelId: 'c2', at: null, seq: 2 })
  })
})
