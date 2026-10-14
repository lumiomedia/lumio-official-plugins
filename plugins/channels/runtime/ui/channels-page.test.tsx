import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createChannel, emptyDraft, type ChannelDef } from '../model/channel'
import type { PoolItem } from '../data/pool'

const state = vi.hoisted(() => ({
  tv: false,
  ready: true,
  channels: [] as unknown[],
  rundowns: {} as Record<string, unknown[]>,
  now: 0,
  saved: [] as unknown[],
  back: 0,
}))

vi.mock('@/lib/plugin-sdk', () => ({
  useTvMode: () => state.tv,
  useLang: () => ({ lang: 'sv' }),
  resolvePluginText: (text: { sv: string }) => text.sv,
  requestBrowseBack: () => { state.back += 1 },
}))
vi.mock('../host', () => ({
  hostReady: () => state.ready,
  readZapMemory: () => ({ lastChannelId: null, previousChannelId: null }),
}))
vi.mock('../state/store', () => ({
  useChannels: () => state.channels,
  useChannelPool: (channel: { id: string } | null) => ({ pool: [], rundown: (channel && state.rundowns[channel.id]) ?? [], loading: false }),
  useChannelClock: () => state.now,
  saveChannel: (def: unknown) => { state.saved.push(def) },
}))
vi.mock('./channel-player', () => ({
  ChannelPlayer: ({ initialChannelId, mode, startInZap, onClose }: { initialChannelId: string; mode: string; startInZap?: boolean; onClose(): void }) => (
    <button type="button" data-testid="player" onClick={onClose}>{`${initialChannelId}|${mode}|${startInZap ? 'zap' : ''}`}</button>
  ),
}))

import { ChannelsPage } from './channels-page'
import { ChannelsPlugin } from '../index'

const at = (h: number, m: number) => new Date(2026, 9, 14, h, m).getTime()
const item = (ref: string, runtimeMin: number): PoolItem => ({
  ref, title: ref, runtimeMin, runtimeKnown: true, year: 1984, kind: 'movie', source: 'library', genres: [],
  play: { type: 'library', key: ref, mediaType: 'movie' },
})
const channel = (n: number, name: string): ChannelDef => ({ ...createChannel({ ...emptyDraft(), name }, [], 1, () => 0.1), id: `k${n}`, number: n })
const page = (params?: Record<string, string>) => render(<ChannelsPage pageId="channels" params={params} onNavigate={() => {}} onOpenDetails={() => {}} />)

beforeEach(() => {
  state.tv = false
  state.ready = true
  state.channels = [channel(2, 'Andra'), channel(1, 'Första')]
  // Lång enda titel: sänds alltid, oavsett epok.
  state.rundowns = { k1: [item('Terminator', 100_000)], k2: [item('Aliens', 100_000)] }
  state.now = at(21, 47)
  state.saved = []
  state.back = 0
})
afterEach(cleanup)

describe('Kanaler-sidan', () => {
  it('registrerar sida och menyval med samma id', () => {
    const pages: Array<Record<string, unknown>> = []
    const items: Array<Record<string, unknown>> = []
    ChannelsPlugin.register({
      registerBrowsePage: (p: Record<string, unknown>) => { pages.push(p) },
      registerMainMenuItem: (i: Record<string, unknown>) => { items.push(i) },
    } as never)
    expect(pages).toMatchObject([{ id: 'channels', hideHero: true }])
    expect(items).toMatchObject([{ id: 'channels', target: { pageId: 'channels' }, defaultEnabled: true }])
  })

  it('väljer första kanalen efter nummer, och klick på rad byter heron', () => {
    const { container } = page()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Terminator')
    expect(container.textContent).toContain('KANAL 1 · Första')
    expect(container.querySelectorAll('[data-channel-row]').length).toBe(2)
    fireEvent.click(container.querySelector('[data-channel-row="k2"]')!)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Aliens')
  })

  it('tidsaxeln börjar på föregående halvtimme', () => {
    const { container } = page()
    expect(container.querySelector('[data-channels-guide]')!.textContent).toContain('21:3022:0022:30')
  })

  it('play i parametrarna öppnar spelaren direkt; stäng visar sidan', () => {
    page({ channelId: 'k2', play: 'live' })
    expect(screen.getByTestId('player').textContent).toBe('k2|live|')
    fireEvent.click(screen.getByTestId('player'))
    expect(screen.queryByTestId('player')).toBeNull()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Aliens')
  })

  it('zap=1 startar spelaren i zappläget', () => {
    page({ zap: '1' })
    expect(screen.getByTestId('player').textContent).toBe('k1|live|zap')
  })

  it('Titta live öppnar spelaren; äldre värd visar banner och inaktiverar knappen', () => {
    page()
    fireEvent.click(screen.getByText('▶ Titta live'))
    expect(screen.getByTestId('player').textContent).toBe('k1|live|')
    cleanup()
    state.ready = false
    page({ play: 'live' })
    expect(screen.queryByTestId('player')).toBeNull()
    expect(screen.getByRole('status').textContent).toContain('0.1.625')
    expect((screen.getByText('▶ Titta live') as HTMLButtonElement).disabled).toBe(true)
  })

  it('tomvyn sparar ett förslag och "Skapa egen" öppnar studion', () => {
    state.channels = []
    page()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Skapa din första kanal')
    fireEvent.click(screen.getByText('Kvällsfilm'))
    expect(state.saved).toMatchObject([{ name: 'Kvällsfilm', kind: 'movie', airWindow: 'evenings', number: 1 }])
    fireEvent.click(screen.getByText('Skapa egen'))
    expect(screen.getByText('Kanalstudio kommer')).toBeTruthy()
  })

  it('studio i parametrarna visar studions plats', () => {
    page({ studio: 'k1' })
    expect(screen.getByText('Kanalstudio kommer')).toBeTruthy()
    fireEvent.click(screen.getByText('‹ Tillbaka'))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Terminator')
  })

  it('TV: fokus väljer rad, OK spelar, ◀▶ rullar tidsaxeln men inte före nu', () => {
    state.tv = true
    const { container } = page()
    const guide = () => container.querySelector('[data-channels-guide]')!.textContent!
    const row2 = container.querySelector<HTMLElement>('[data-channel-row="k2"]')!
    fireEvent.focus(row2)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Aliens')
    const left = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })
    row2.dispatchEvent(left)
    expect(left.defaultPrevented).toBe(false)
    fireEvent.keyDown(row2, { key: 'ArrowRight' })
    expect(guide()).toContain('22:0022:30')
    expect(guide()).not.toContain('21:30')
    fireEvent.keyDown(row2, { key: 'ArrowLeft' })
    expect(guide()).toContain('21:3022:00')
    fireEvent.keyDown(row2, { key: 'Enter' })
    expect(screen.getByTestId('player').textContent).toBe('k2|live|')
  })

  it('‹ HEM går tillbaka', () => {
    page()
    fireEvent.click(screen.getByText('‹ HEM'))
    expect(state.back).toBe(1)
  })
})
