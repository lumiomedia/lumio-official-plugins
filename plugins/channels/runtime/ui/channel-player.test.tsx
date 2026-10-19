import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createChannel, emptyDraft, type ChannelDef } from '../model/channel'
import type { PoolItem } from '../data/pool'

const state = vi.hoisted(() => ({
  rundowns: {} as Record<string, unknown[]>,
  cached: {} as Record<string, unknown[]>,
  fixes: {} as Record<string, number>,
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
  resolver: { resolve: (item: PoolItem, exclude?: string[], opts?: unknown) => state.resolve(item, exclude, opts), forget: (ref: string) => state.forget(ref), peek: () => false },
  rememberPlayedStream: (token: string | undefined) => state.remember(token),
  readRuntimeFixes: () => state.fixes,
  writeRuntimeFixes: (next: Record<string, number>) => { state.fixes = next },
}))
vi.mock('../state/store', async () => {
  const { buildRundown } = await import('../model/schedule')
  return {
  // Sparad pool → rundown (låset testas i store/lock-testerna).
  readCachedRundown: (c: { id: string; order: 'shuffle' | 'chrono' | 'episodes'; seed: number }) => {
    const pool = state.cached[c.id] as never[] | undefined
    return pool ? buildRundown(pool, c.order, c.seed) : null
  },
  useChannelPool: (channel: { id: string } | null) => ({ pool: [], rundown: (channel && state.rundowns[channel.id]) ?? [], loading: false }),
  useChannelClock: () => Date.now(),
  readCachedPool: (id: string) => state.cached[id] ?? null,
  }
})

import { ChannelPlayer } from './channel-player'
import { programmeAt } from '../model/schedule'

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
  state.cached = {}
  state.fixes = {}
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
    // Trasig, mycket kort version (2 min av ett 600-minutersprogram): nästa version.
    await act(async () => { state.props?.onTimeUpdate(120, 120) })
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
    fireEvent.click(screen.getByTestId('first-play'))
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

const resolvedRefs = () => state.resolve.mock.calls.map(([i]) => (i as PoolItem).ref)
const button = (name: RegExp) => screen.getAllByRole('button').find((b) => name.test(b.textContent ?? ''))!

describe('kanalspelaren: tablån i spelaren', () => {
  it('TABLÅ öppnar tablån som lager ovanpå videon; en rad byter kanal live och stänger lagret', async () => {
    state.rundowns = { k1: [stream('s1')], k2: [library('l2')], k3: [stream('s3')], k4: [stream('s4')] }
    const onClose = vi.fn()
    render(<ChannelPlayer channels={channels} initialChannelId="k1" mode="live" onClose={onClose} />)
    fireEvent.click(await screen.findByTestId('first-play'))
    fireEvent.click(button(/TABLÅ/))
    // Spelaren ligger kvar under lagret.
    expect(screen.getByTestId('host-player')).toBeTruthy()
    const overlay = document.querySelector('[data-channels-guide-overlay]')!
    expect(overlay).toBeTruthy()
    // Aktuell kanal markerad.
    expect(overlay.querySelector('[data-channel-row="k1"]')!.getAttribute('aria-pressed')).toBe('true')
    // Vanliga OSD:n göms medan lagret är öppet.
    expect(document.querySelector('[data-channels-osd]')).toBeNull()
    await act(async () => { fireEvent.click(overlay.querySelector('[data-channel-row="k2"]')!) })
    await flush()
    expect(document.querySelector('[data-channels-guide-overlay]')).toBeNull()
    expect(resolvedRefs()).toEqual(['s1', 'l2'])
    expect(onClose).not.toHaveBeenCalled()
  })

  it('Esc stänger lagret, inte spelaren', async () => {
    state.rundowns = { k1: [stream('s1')] }
    const onClose = vi.fn()
    render(<ChannelPlayer channels={channels} initialChannelId="k1" mode="live" onClose={onClose} />)
    fireEvent.click(await screen.findByTestId('first-play'))
    fireEvent.click(button(/TABLÅ/))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(document.querySelector('[data-channels-guide-overlay]')).toBeNull()
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('kanalspelaren: zappläget', () => {
  it('ZAPP byter till zapplagret: egen OSD, värdens kontroller dolda, brus vid byte trots ommonterad värdspelare', async () => {
    state.rundowns = { k1: [library('l1')], k2: [library('l2')], k3: [library('l3')], k4: [library('l4')] }
    render(<ChannelPlayer channels={channels} initialChannelId="k1" mode="live" onClose={() => {}} />)
    fireEvent.click(await screen.findByTestId('first-play'))
    fireEvent.click(button(/ZAPP/))
    expect(document.querySelector('[data-channels-zap]')).toBeTruthy()
    expect(document.querySelector('[data-channels-osd]')).toBeNull()
    expect(document.querySelector('[data-zap-brand]')!.textContent).toBe('LUMIO TV')
    expect(document.querySelector('[data-zap-number]')!.textContent).toBe('1')
    // Värdens topprad och seekrad döljs bara medan zappläget är på.
    expect(Array.from(document.querySelectorAll('style')).some((el) => (el.textContent ?? '').includes('.vp-controls'))).toBe(true)
    await act(async () => { fireEvent.click(button(/CH ▲/)) })
    await flush()
    // Ny ström = ny värdspelare; bruset ägs av spelaren och syns ändå.
    expect(screen.getByTestId('first-play').getAttribute('data-url')).toBe('http://l2')
    expect(document.querySelector('[data-zap-noise-layer]')).toBeTruthy()
    // Under inställningskortet: ingen krom, bara bruset.
    expect(document.querySelector('[data-zap-osd]')).toBeNull()
    fireEvent.click(screen.getByTestId('first-play'))
    fireEvent.click(button(/AVSLUTA ZAPP/))
    expect(document.querySelector('[data-channels-zap]')).toBeNull()
    expect(Array.from(document.querySelectorAll('style')).some((el) => (el.textContent ?? '').includes('.vp-controls'))).toBe(false)
  })
})

describe('kanalspelaren: inställningskortet', () => {
  it('syns direkt vid bytet och ligger kvar tills den nya strömmen visat första bild', async () => {
    state.rundowns = { k1: [library('l1')], k2: [library('l2')], k3: [library('l3')], k4: [library('l4')] }
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    render(<ChannelPlayer channels={channels} initialChannelId="k1" mode="live" onClose={() => {}} />)
    const card = () => document.querySelector('[data-channels-tuning]') as HTMLElement
    await screen.findByTestId('first-play')
    expect(card().getAttribute('data-visible')).toBe('1')
    fireEvent.click(screen.getByTestId('first-play'))
    expect(card().getAttribute('data-visible')).toBe('0')
    expect(info.mock.calls.some(([m]) => /^\[channels\] switch 1 resolve=\d+ms firstFrame=\d+ms \(pool=\d+ resolveStart=\d+ type=library mount=\d+ hostFirstPlay=\d+\)$/.test(String(m)))).toBe(true)
    expect(document.querySelector('[data-channels-osd]')).toBeTruthy()
    fireEvent.keyDown(window, { key: 'PageUp' })
    // Samma bildruta som trycket, ingen krom under kortet, och den gamla
    // kanalens spelare är borta direkt (dess ljud hördes under uppslaget).
    expect(card().getAttribute('data-visible')).toBe('1')
    expect(document.querySelector('[data-channels-osd]')).toBeNull()
    expect(screen.queryByTestId('first-play')).toBeNull()
    await flush()
    expect(screen.getByTestId('first-play').getAttribute('data-url')).toBe('http://l2')
    // Ny värdspelare utan bild än: kortet täcker den tomma rutan, värdens kontroller dolda.
    expect(card().getAttribute('data-visible')).toBe('1')
    expect(Array.from(document.querySelectorAll('style')).some((el) => (el.textContent ?? '').includes('.vp-controls'))).toBe(true)
    expect(card().textContent).toContain('l2')
    fireEvent.click(screen.getByTestId('first-play'))
    expect(card().getAttribute('data-visible')).toBe('0')
    info.mockRestore()
  })
})

describe('kanalspelaren: kanallistan', () => {
  it('ny rundown för kanalen (fler källor svarade) byter inte det som spelas', async () => {
    state.rundowns = { k1: [stream('s1')] }
    const { rerender } = render(<ChannelPlayer channels={channels} initialChannelId="k1" mode="live" onClose={() => {}} />)
    fireEvent.click(await screen.findByTestId('first-play'))
    state.rundowns = { k1: [stream('annan'), stream('s1')] }
    rerender(<ChannelPlayer channels={[...channels]} initialChannelId="k1" mode="live" onClose={() => {}} />)
    await flush()
    state.rundowns = { k1: [stream('helt-ny')] }
    rerender(<ChannelPlayer channels={[...channels]} initialChannelId="k1" mode="live" onClose={() => {}} />)
    await flush()
    expect(resolvedRefs()).toEqual(['s1'])
    expect(screen.getByTestId('first-play').getAttribute('data-url')).toBe('http://s1')
  })

  it('val i listan landar live (inte från början) på den valda kanalen', async () => {
    state.rundowns = { k1: [library('l1')], k2: [library('l2')], k3: [library('l3')], k4: [library('l4')] }
    render(<ChannelPlayer channels={channels} initialChannelId="k1" mode="live" startInZap onClose={() => {}} />)
    fireEvent.click(await screen.findByTestId('first-play'))
    fireEvent.click(button(/KANALLISTA/))
    const row = Array.from(document.querySelectorAll('[data-zap-list] [role="option"]')).find((el) => /K3/.test(el.textContent ?? ''))!
    await act(async () => { fireEvent.click(row) })
    await flush()
    expect(screen.getByTestId('first-play').getAttribute('data-url')).toBe('http://l3')
    expect(Number(state.props?.initialTime)).toBeGreaterThan(0)
    expect(document.querySelector('[data-zap-list]')).toBeNull()
  })

  it('källan slut efter en stund men före gränsen: inget nästa program från början', async () => {
    state.rundowns = { k1: [library('l1'), library('l2')] }
    render(<ChannelPlayer channels={channels} initialChannelId="k1" mode="live" onClose={() => {}} />)
    fireEvent.click(await screen.findByTestId('first-play'))
    const start = Number(state.props?.initialTime ?? 0)
    await act(async () => { state.props?.onTimeUpdate(start + 120, start + 120) })
    await flush()
    // Bara det första uppslaget: nästa program startas inte i förväg.
    expect(resolvedRefs()).toHaveLength(1)
    expect(document.querySelector('[data-channels-between]')).toBeTruthy()
  })
})

describe('kanalspelaren: grannförladdning', () => {
  it('efter stabil bild förladdas CH ▲▼ — bibliotek ja, strömsök aldrig', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false, toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    state.rundowns = { k1: [library('l1')] }
    state.cached = { k2: [library('n2')], k4: [stream('n4')] }
    render(<ChannelPlayer channels={channels} initialChannelId="k1" mode="live" onClose={() => {}} />)
    await flush()
    await flush()
    fireEvent.click(screen.getByTestId('first-play'))
    expect(resolvedRefs()).toEqual(['l1'])
    await act(async () => { vi.advanceTimersByTime(3100) })
    expect(resolvedRefs()).toEqual(['l1', 'n2'])
  })
})

describe('kanalspelaren: svart ruta mellan kort och bild', () => {
  it('värdens sena onFirstPlay (5 s-reserven) släpper inte kortet förrän positionen är vid liveläget', async () => {
    state.rundowns = { k1: [library('l1')] }
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    const realNow = performance.now.bind(performance)
    let offset = 0
    const spy = vi.spyOn(performance, 'now').mockImplementation(() => realNow() + offset)
    render(<ChannelPlayer channels={channels} initialChannelId="k1" mode="live" onClose={() => {}} />)
    await screen.findByTestId('first-play')
    const card = () => document.querySelector('[data-channels-tuning]') as HTMLElement
    const start = Number(state.props?.initialTime ?? 0)
    expect(start).toBeGreaterThan(60)
    offset = 5200
    fireEvent.click(screen.getByTestId('first-play'))
    expect(card().getAttribute('data-visible')).toBe('1')
    // mpv söker fortfarande: positionen 0.
    await act(async () => { state.props?.onTimeUpdate(0, 3600) })
    expect(card().getAttribute('data-visible')).toBe('1')
    await act(async () => { state.props?.onTimeUpdate(start + 0.5, start + 3600) })
    expect(card().getAttribute('data-visible')).toBe('0')
    spy.mockRestore()
    info.mockRestore()
  })
})

describe('kanalspelaren: Ingen signal bara vid verkligt fel', () => {
  it('värdens laddfel medan strömmen visat framsteg (bildrutevaktens timeout) ger ingen Ingen signal', async () => {
    state.rundowns = { k1: [library('l1')] }
    render(<ChannelPlayer channels={channels} initialChannelId="k1" mode="live" onClose={() => {}} />)
    await screen.findByTestId('first-play')
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    await act(async () => { state.props?.onStartProgress('audio') })
    let handled = false
    await act(async () => { handled = state.props?.onLoadFailed() })
    expect(handled).toBe(true)
    expect(state.forget).not.toHaveBeenCalled()
    expect(document.querySelector('[data-channels-nosignal]')).toBeNull()
    expect(screen.getByTestId('first-play').getAttribute('data-url')).toBe('http://l1')
    // Spelar: kortet släpps.
    expect((document.querySelector('[data-channels-tuning]') as HTMLElement).getAttribute('data-visible')).toBe('0')
    info.mockRestore()
  })

  it('laddfel utan något framsteg är ett verkligt fel', async () => {
    state.rundowns = { k1: [library('l1')] }
    render(<ChannelPlayer channels={channels} initialChannelId="k1" mode="live" onClose={() => {}} />)
    await screen.findByTestId('first-play')
    await act(async () => { state.props?.onLoadFailed() })
    expect(state.forget).toHaveBeenCalledWith('l1')
  })

  it('en stängning: med värdspelaren monterad bara värdens Stäng (onClose till sidan), utan den vår ×', async () => {
    state.rundowns = { k1: [library('l1')] }
    const onClose = vi.fn()
    render(<ChannelPlayer channels={channels} initialChannelId="k1" mode="live" startInZap={false} onClose={onClose} />)
    fireEvent.click(await screen.findByTestId('first-play'))
    expect(document.querySelector('[data-channels-close]')).toBeNull()
    expect(Array.from(document.querySelectorAll('style')).some((el) => (el.textContent ?? '').includes('.vp-topbar > div:last-child'))).toBe(false)
    // Värdens Stäng anropar spelarens onClose, som går rakt till sidan.
    state.props?.onClose()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('utan värdspelare (tom kanal) finns vår × och den stänger', async () => {
    state.rundowns = { k1: [] }
    const onClose = vi.fn()
    render(<ChannelPlayer channels={channels} initialChannelId="k1" mode="live" onClose={onClose} />)
    await flush()
    const close = document.querySelector<HTMLButtonElement>('[data-channels-close]')!
    expect(close).toBeTruthy()
    fireEvent.click(close)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('kanalspelaren: tablån längre än filen', () => {
  it('liveläget efter filens slut: Programmet är slut, inga andra versioner, ingen Ingen signal; längden minns', async () => {
    const ep = { ...library('s11e14'), runtimeMin: 25 }
    state.rundowns = { k1: [ep] }
    // Klockan i programmets sista femtedel, så filen (start − 5 s) är ≥ 80 % av tablåns längd.
    vi.useFakeTimers({ toFake: ['Date'] })
    let t = Date.now()
    while (true) {
      const slot = programmeAt([ep], channels[0]!.airWindow, t)
      if (slot.kind === 'programme' && slot.minsIn >= 22 && slot.minsIn < 24) break
      t += 30_000
    }
    vi.setSystemTime(t)
    render(<ChannelPlayer channels={channels} initialChannelId="k1" mode="live" onClose={() => {}} />)
    fireEvent.click(await screen.findByTestId('first-play'))
    const start = Number(state.props?.initialTime ?? 0)
    // Filen är kortare än starten (som S11E14: 1354 s mot start 1359 s).
    const duration = Math.max(61, start - 5)
    await act(async () => { state.props?.onTimeUpdate(duration, duration) })
    await flush()
    expect(state.forget).not.toHaveBeenCalled()
    expect(state.resolve).toHaveBeenCalledTimes(1)
    expect(document.querySelector('[data-channels-nosignal]')).toBeNull()
    expect(document.querySelector('[data-channels-between]')).toBeTruthy()
    expect(state.fixes.s11e14).toBe(Math.round(duration))
  })
})

describe('kanalspelaren: filen mycket kortare än platsen (South Park S08E03 på en 100-minutersplats)', () => {
  const setup = () => {
    const ep = { ...library('sp'), runtimeMin: 100, runtimeKnown: false }
    state.rundowns = { k1: [ep] }
    vi.useFakeTimers({ toFake: ['Date'] })
    let t = Date.now()
    while (true) {
      const slot = programmeAt([ep], channels[0]!.airWindow, t)
      if (slot.kind === 'programme' && slot.minsIn >= 94 && slot.minsIn < 96) break
      t += 30_000
    }
    vi.setSystemTime(t)
  }

  it('längden före första bilden: samma fil öppnas aldrig igen; ingen annan version = Programmet är slut', async () => {
    setup()
    state.resolve = vi.fn(async (item: PoolItem, exclude?: string[]) => (exclude && exclude.length > 0 ? null : { url: `http://${item.ref}` }))
    render(<ChannelPlayer channels={channels} initialChannelId="k1" mode="live" onClose={() => {}} />)
    await screen.findByTestId('first-play')
    expect(Number(state.props?.initialTime)).toBeGreaterThan(5600)
    await act(async () => { state.props?.onDurationKnown(1331) })
    await flush()
    // Andra uppslaget förbi den provade adressen, inget tredje.
    expect(state.resolve).toHaveBeenCalledTimes(2)
    expect(state.resolve.mock.calls[1]![1]).toEqual(['http://sp'])
    expect(screen.queryByTestId('host-player')).toBeNull()
    expect(document.querySelector('[data-channels-nosignal]')).toBeNull()
    expect(document.querySelector('[data-channels-between]')).toBeTruthy()
    expect(state.fixes.sp).toBe(1331)
  })

  it('en annan version provas en gång; även den för kort = slut, ingen tredje', async () => {
    setup()
    state.resolve = vi.fn(async (_item: PoolItem, exclude?: string[]) => ({ url: exclude && exclude.length > 0 ? 'http://sp-2' : 'http://sp-1' }))
    render(<ChannelPlayer channels={channels} initialChannelId="k1" mode="live" onClose={() => {}} />)
    await screen.findByTestId('first-play')
    await act(async () => { state.props?.onDurationKnown(1331) })
    await flush()
    expect((await screen.findByTestId('first-play')).getAttribute('data-url')).toBe('http://sp-2')
    await act(async () => { state.props?.onDurationKnown(1290) })
    await flush()
    expect(state.resolve).toHaveBeenCalledTimes(2)
    expect(screen.queryByTestId('host-player')).toBeNull()
    expect(document.querySelector('[data-channels-between]')).toBeTruthy()
    expect(document.querySelector('[data-channels-nosignal]')).toBeNull()
  })

  it('längd som räcker (start före filens slut): spelar vidare', async () => {
    setup()
    render(<ChannelPlayer channels={channels} initialChannelId="k1" mode="live" onClose={() => {}} />)
    await screen.findByTestId('first-play')
    await act(async () => { state.props?.onDurationKnown(6100) })
    await flush()
    expect(state.resolve).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('host-player')).toBeTruthy()
  })
})

describe('kanalspelaren: IPTV-VOD', () => {
  it('kanal utan VOD som källa slår upp biblioteket med allowCatalog: false; med VOD sant', async () => {
    state.rundowns = { k1: [library('l1')], k2: [library('l2')] }
    const withVod = channels.map((c) => (c.id === 'k2' ? { ...c, sources: [...c.sources, 'vod' as const] } : c))
    render(<ChannelPlayer channels={withVod} initialChannelId="k1" mode="live" onClose={() => {}} />)
    await screen.findByTestId('first-play')
    expect(state.resolve.mock.calls[0]![2]).toEqual({ allowCatalog: false })
    fireEvent.keyDown(window, { key: 'PageUp' })
    await flush()
    expect(state.resolve.mock.calls.at(-1)![2]).toEqual({ allowCatalog: true })
  })
})

describe('kanalspelaren: fjärrens sifferknappar', () => {
  it('siffror byter kanal även utanför zappläget, och numret syns medan det matas in', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false, toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    state.rundowns = { k1: [library('l1')], k2: [library('l2')], k3: [library('l3')], k4: [library('l4')] }
    render(<ChannelPlayer channels={channels} initialChannelId="k1" mode="live" onClose={() => {}} />)
    await flush()
    fireEvent.click(screen.getByTestId('first-play'))
    fireEvent.keyDown(window, { key: '3' })
    await flush()
    expect(document.querySelector('[data-channels-digits]')?.textContent).toBe('3')
    await act(async () => { vi.advanceTimersByTime(1600) })
    await flush()
    await act(async () => { vi.advanceTimersByTime(1000) })
    await flush()
    expect(state.resolve.mock.calls.map(([i]) => (i as PoolItem).ref)).toContain('l3')
    expect(document.querySelector('[data-channels-digits]')).toBeNull()
  })
})
