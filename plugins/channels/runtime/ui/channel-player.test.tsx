import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createChannel, emptyDraft, type ChannelDef } from '../model/channel'
import type { PoolItem } from '../data/pool'

const state = vi.hoisted(() => ({
  rundowns: {} as Record<string, unknown[]>,
  resolve: null as unknown as ReturnType<typeof vi.fn>,
  remember: null as unknown as ReturnType<typeof vi.fn>,
  forget: null as unknown as ReturnType<typeof vi.fn>,
  props: null as null | Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
}))

vi.mock('@/lib/plugin-sdk', () => ({
  waitForStartIdle: () => Promise.resolve(),
  useTvMode: () => false,
  useLang: () => ({ lang: 'sv' }),
  resolvePluginText: (text: { sv: string }) => text.sv,
  VideoPlayerModal: (props: { url: string; onFirstPlay(): void; overlayContent?: unknown }) => {
    state.props = props
    return (
      <div data-testid="host-player">
        <button type="button" data-testid="first-play" data-url={props.url} onClick={props.onFirstPlay}>spela</button>
        <div className="vp-controls" data-testid="host-controls" style={{ opacity: 1 }} />
        {props.overlayContent as never}
      </div>
    )
  },
}))
vi.mock('../host', () => ({
  readZapMemory: () => ({ lastChannelId: null, previousChannelId: null }),
  writeZapMemory: () => {},
  resolver: { resolve: (item: PoolItem) => state.resolve(item), forget: (ref: string) => state.forget(ref) },
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
  state.forget = vi.fn()
  state.props = null
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

describe('kanalspelaren: värdspelaren', () => {
  it('går aldrig i helskärm av sig själv', async () => {
    state.rundowns = { k1: [stream('s1')] }
    render(<ChannelPlayer channels={channels} initialChannelId="k1" mode="live" onClose={() => {}} />)
    await screen.findByTestId('first-play')
    expect(state.props?.autoFullscreen).toBeUndefined()
  })

  it('källan tar slut direkt efter start (fil kortare än liveläget) → felhoppet, inte pausad i slutet', async () => {
    state.rundowns = { k1: [stream('s1')] }
    render(<ChannelPlayer channels={channels} initialChannelId="k1" mode="live" onClose={() => {}} />)
    await screen.findByTestId('first-play')
    const start = Number(state.props?.initialTime ?? 0)
    await act(async () => { state.props?.onTimeUpdate(start + 1, start + 1) })
    expect(state.forget).toHaveBeenCalledWith('s1')
  })

  it('mitt i filen händer ingenting', async () => {
    state.rundowns = { k1: [stream('s1')] }
    render(<ChannelPlayer channels={channels} initialChannelId="k1" mode="live" onClose={() => {}} />)
    await screen.findByTestId('first-play')
    const start = Number(state.props?.initialTime ?? 0)
    await act(async () => { state.props?.onTimeUpdate(start + 5, start + 3600) })
    expect(state.forget).not.toHaveBeenCalled()
  })

  it('OSD:n tonar med värdens kontrollrad', async () => {
    state.rundowns = { k1: [stream('s1')] }
    render(<ChannelPlayer channels={channels} initialChannelId="k1" mode="live" onClose={() => {}} />)
    const host = await screen.findByTestId('host-controls')
    await flush()
    const bar = () => document.querySelector('[data-channels-osd-bar]') as HTMLElement
    await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
    expect(bar().style.opacity).toBe('1')
    await act(async () => {
      host.style.opacity = '0'
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(bar().style.opacity).toBe('0')
    await act(async () => {
      host.style.opacity = '1'
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(bar().style.opacity).toBe('1')
  })
})
