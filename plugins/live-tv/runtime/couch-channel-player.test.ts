import { describe, expect, it, vi } from 'vitest'
import { channelSnapshot, runChannelCommand } from './couch-channel-player'

describe('kanalen som Soffläge-spelare', () => {
  it('bilden är en direktsändning utan spolning', () => {
    expect(channelSnapshot({ name: 'TV4 Sport Live 1', paused: false, volume01: 0.42, muted: false })).toMatchObject({
      kind: 'channel', title: 'TV4 Sport Live 1', channelName: 'TV4 Sport Live 1', playing: true, volume: 42, isLive: true, canSeek: false,
      pos: 0, dur: 0, audio: [], subs: [], streams: [], tmdbId: null,
    })
    expect(channelSnapshot({ name: 'x', paused: false, volume01: 0.5, muted: true }).volume).toBe(0)
    expect(channelSnapshot({ name: 'x', paused: true, volume01: 0.5, muted: false }).playing).toBe(false)
  })
  it('kör paus och volym; ignorerar resten', () => {
    const h = { togglePause: vi.fn(), setVolume01: vi.fn() }
    runChannelCommand({ id: 'a', type: 'toggle-play' }, h)
    runChannelCommand({ id: 'b', type: 'volume', value: 30 }, h)
    runChannelCommand({ id: 'c', type: 'seek-rel', by: 10 }, h)
    runChannelCommand({ id: 'd', type: 'volume', value: 250 }, h)
    runChannelCommand({ id: 'e', type: 'volume', value: 'x' }, h)
    expect(h.togglePause).toHaveBeenCalledOnce()
    expect(h.setVolume01.mock.calls).toEqual([[0.3], [1]])
  })
})
