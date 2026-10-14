import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createChannel, emptyDraft, type ChannelDef } from '../model/channel'
import type { PoolItem } from '../data/pool'

const state = vi.hoisted(() => ({
  rundowns: {} as Record<string, unknown[]>,
  resolve: null as unknown as ReturnType<typeof vi.fn>,
  remember: null as unknown as ReturnType<typeof vi.fn>,
}))

vi.mock('@/lib/plugin-sdk', () => ({
  waitForStartIdle: () => Promise.resolve(),
  useTvMode: () => false,
  useLang: () => ({ lang: 'sv' }),
  resolvePluginText: (text: { sv: string }) => text.sv,
  VideoPlayerModal: ({ url, onFirstPlay }: { url: string; onFirstPlay(): void }) => (
    <button type="button" data-testid="first-play" data-url={url} onClick={onFirstPlay}>spela</button>
  ),
}))
vi.mock('../host', () => ({
  readZapMemory: () => ({ lastChannelId: null, previousChannelId: null }),
  writeZapMemory: () => {},
  resolver: { resolve: (item: PoolItem) => state.resolve(item), forget: () => {} },
  rememberPlayedStream: (token: string | undefined) => state.remember(token),
}))
vi.mock('../state/store', () => ({
  useChannelPool: (channel: { id: string } | null) => ({ pool: [], rundown: (channel && state.rundowns[channel.id]) ?? [], loading: false }),
  useChannelClock: () => Date.now(),
  readCachedPool: () => null,
}))

import { ChannelPlayer } from './channel-player'

const stream = (ref: string): PoolItem => ({
  ref, title: ref, runtimeMin: 600, runtimeKnown: true, year: 1984, kind: 'movie', source: 'watchlist', genres: [],
  imdbId: 'tt1', play: { type: 'stream', imdbId: 'tt1', mediaType: 'movie' },
})
const library = (ref: string): PoolItem => ({
  ref, title: ref, runtimeMin: 600, runtimeKnown: true, year: 1984, kind: 'movie', source: 'library', genres: [],
  play: { type: 'library', key: ref, mediaType: 'movie' },
})
const channel = (n: number): ChannelDef => ({ ...createChannel({ ...emptyDraft(), name: `K${n}` }, [], 1, () => 0.1), id: `k${n}`, number: n })
const channels = [channel(1), channel(2), channel(3), channel(4)]

beforeEach(() => {
  state.resolve = vi.fn(async (item: PoolItem) => ({ url: `http://${item.ref}`, rememberToken: `tok-${item.ref}` }))
  state.remember = vi.fn()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve() }) }

describe('kanalspelaren: ihågkomst vid första bild', () => {
  it('strömsök minns valet först vid onFirstPlay', async () => {
    state.rundowns = { k1: [stream('s1')] }
    render(<ChannelPlayer channels={channels} initialChannelId="k1" mode="live" onClose={() => {}} />)
    const button = await screen.findByTestId('first-play')
    expect(state.remember).not.toHaveBeenCalled()
    fireEvent.click(button)
    expect(state.remember).toHaveBeenCalledWith('tok-s1')
  })

  it('biblioteksposter minns ingenting', async () => {
    state.rundowns = { k1: [library('l1')] }
    render(<ChannelPlayer channels={channels} initialChannelId="k1" mode="live" onClose={() => {}} />)
    fireEvent.click(await screen.findByTestId('first-play'))
    expect(state.remember).not.toHaveBeenCalled()
  })
})

describe('kanalspelaren: zappfördröjning', () => {
  it('snabb zappning slår bara upp kanalen man stannar på', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false, toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    state.rundowns = { k1: [stream('s1')], k2: [stream('s2')], k3: [stream('s3')], k4: [stream('s4')] }
    render(<ChannelPlayer channels={channels} initialChannelId="k1" mode="live" onClose={() => {}} />)
    await flush()
    // Första kanalen väntar inte.
    expect(state.resolve.mock.calls.map(([i]) => (i as PoolItem).ref)).toEqual(['s1'])
    for (let i = 0; i < 3; i += 1) {
      fireEvent.keyDown(window, { key: 'PageUp' })
      await flush()
      await act(async () => { vi.advanceTimersByTime(100) })
    }
    await act(async () => { vi.advanceTimersByTime(400) })
    await flush()
    expect(state.resolve.mock.calls.map(([i]) => (i as PoolItem).ref)).toEqual(['s1', 's4'])
  })
})
