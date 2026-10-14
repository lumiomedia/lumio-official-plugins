import { beforeEach, describe, expect, it } from 'vitest'
import { __resetPollDemandForTests, hasPollDemand } from '../live-poller'
import { __resetPresenceForTests, hasCouchPresence, hasPhonePresence, markPresence, PRESENCE_TTL_MS, sweepPresence } from './presence'

beforeEach(() => { __resetPresenceForTests(); __resetPollDemandForTests() })

describe('närvaro', () => {
  it('värdens Tippa-pollning håller efterfrågan men är ingen telefon', () => {
    markPresence('tip:m1', true, 0)
    expect(hasCouchPresence()).toBe(true)
    expect(hasPollDemand()).toBe(true)
    expect(hasPhonePresence()).toBe(false)
    markPresence('p1', true, 0)
    expect(hasPhonePresence()).toBe(true)
  })
  it('en telefon ger efterfrågan, av släpper den', () => {
    markPresence('p1', true, 0)
    expect(hasCouchPresence()).toBe(true)
    expect(hasPollDemand()).toBe(true)
    markPresence('p1', false, 10)
    expect(hasCouchPresence()).toBe(false)
    expect(hasPollDemand()).toBe(false)
  })
  it('två telefoner ger EN efterfrågan; den första som går släpper inte', () => {
    markPresence('p1', true, 0); markPresence('p2', true, 0)
    markPresence('p1', false, 1)
    expect(hasPollDemand()).toBe(true)
    markPresence('p2', false, 2)
    expect(hasPollDemand()).toBe(false)
  })
  it('en tyst telefon släpps efter TTL', () => {
    markPresence('p1', true, 0)
    sweepPresence(PRESENCE_TTL_MS - 1)
    expect(hasCouchPresence()).toBe(true)
    sweepPresence(PRESENCE_TTL_MS + 1)
    expect(hasCouchPresence()).toBe(false)
    expect(hasPollDemand()).toBe(false)
  })
  it('förnyelse flyttar fram utgången', () => {
    markPresence('p1', true, 0)
    markPresence('p1', true, 50_000)
    sweepPresence(PRESENCE_TTL_MS + 1)
    expect(hasCouchPresence()).toBe(true)
  })
  it('av för en okänd telefon är ofarligt', () => {
    markPresence('x', false, 0)
    expect(hasPollDemand()).toBe(false)
  })
})
