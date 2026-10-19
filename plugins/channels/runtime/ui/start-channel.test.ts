import { describe, expect, it } from 'vitest'
import { createChannel, emptyDraft, type AirWindow, type ChannelDef } from '../model/channel'
import { pickStartChannel } from './start-channel'

const ch = (n: number, airWindow: AirWindow): ChannelDef => ({ ...createChannel({ ...emptyDraft(), name: `K${n}`, airWindow }, [], 1, () => 0.1), id: `k${n}`, number: n })
const item = { ref: 'a', title: 'a', runtimeMin: 100_000, year: null, kind: 'movie' as const }
const morning = new Date(2026, 9, 14, 10, 0).getTime()

describe('startkanalen', () => {
  const sorted = [ch(1, 'evenings'), ch(2, 'always'), ch(3, 'always')]
  const known = () => [item]

  it('vilande kanal 1 hoppas över: lägsta som sänder', () => {
    expect(pickStartChannel(sorted, null, morning, known)?.id).toBe('k2')
  })

  it('senast sedda vinner om den sänder, annars inte', () => {
    expect(pickStartChannel(sorted, 'k3', morning, known)?.id).toBe('k3')
    expect(pickStartChannel(sorted, 'k1', morning, known)?.id).toBe('k2')
  })

  it('tom tablå räknas inte som sändning; okänd tablå går på sändningstiden', () => {
    expect(pickStartChannel(sorted, null, morning, (c) => (c.id === 'k2' ? [] : null))?.id).toBe('k3')
  })

  it('ingen sänder: lägsta numret', () => {
    const night = [ch(1, 'evenings'), ch(2, 'late')]
    expect(pickStartChannel(night, 'k2', morning, known)?.id).toBe('k1')
  })
})
