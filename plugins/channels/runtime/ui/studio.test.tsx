import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createChannel, emptyDraft, type ChannelDef } from '../model/channel'
import type { PoolItem } from '../data/pool'

const state = vi.hoisted(() => ({
  calls: { library: 0, watchlist: 0, debrid: 0 } as Record<string, number>,
  forced: 0,
  saved: [] as unknown[],
  deleted: [] as string[],
  debridItems: [] as unknown[],
  libraryFails: false,
  debridQueue: [] as Array<{ resolve(v: unknown[]): void }>,
  debridDeferred: false,
}))

const item = (ref: string, over: Partial<PoolItem> = {}): PoolItem => ({
  ref, title: ref, runtimeMin: 60, runtimeKnown: true, year: 1985, kind: 'movie', source: 'library', genres: ['Drama'],
  play: { type: 'library', key: ref, mediaType: 'movie' }, ...over,
})

vi.mock('@/lib/plugin-sdk', () => ({
  waitForStartIdle: () => Promise.resolve(),
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Switch: ({ checked }: { checked: boolean }) => <span data-checked={String(checked)} />,
  TOKENS: {},
  inputStyle: {},
  useLang: () => ({ lang: 'sv' }),
  resolvePluginText: (text: { sv: string }) => text.sv,
  getTvKeyboardPanel: () => null,
  channelListDebridCloud: (o?: { force?: boolean }) => { if (o?.force) state.forced += 1; return Promise.resolve([]) },
}))
vi.mock('../host', () => ({ sourceDeps: {} }))
vi.mock('../data/sources', () => ({
  loadLibraryItems: () => {
    state.calls.library! += 1
    return state.libraryFails ? Promise.reject(new Error('nät')) : Promise.resolve([item('a'), item('b', { genres: ['Action'] })])
  },
  loadWatchlistItems: () => { state.calls.watchlist! += 1; return Promise.resolve([item('c', { source: 'watchlist', tmdbId: 9 })]) },
  loadDebridItems: () => {
    state.calls.debrid! += 1
    if (!state.debridDeferred) return Promise.resolve(state.debridItems)
    return new Promise((resolve) => { state.debridQueue.push({ resolve }) })
  },
}))
vi.mock('../state/store', () => ({
  saveChannel: (def: unknown) => { state.saved.push(def) },
  deleteChannel: (id: string) => { state.deleted.push(id) },
}))

import { ChannelStudio } from './studio'
import { useText } from './use-text'

function Harness({ studio, channels, onDone }: { studio: string; channels: ChannelDef[]; onDone(id?: string): void }) {
  const t = useText()
  return <ChannelStudio studio={studio} channels={channels} isTv={false} isMobile={false} t={t} onDone={onDone} />
}

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)) })
const summary = (c: HTMLElement) => c.querySelector('[data-studio-summary]')!.textContent

beforeEach(() => {
  state.calls = { library: 0, watchlist: 0, debrid: 0 }
  state.forced = 0
  state.saved = []
  state.deleted = []
  state.debridItems = []
  state.libraryFails = false
  state.debridQueue = []
  state.debridDeferred = false
})
afterEach(cleanup)

describe('Kanalstudion', () => {
  it('hämtar bara valda källor, en gång, och förhandsvisningen följer reglerna lokalt', async () => {
    const { container } = render(<Harness studio="new" channels={[]} onDone={() => {}} />)
    expect(summary(container)).toBe('Hämtar titlar…')
    await flush()
    expect(state.calls).toEqual({ library: 1, watchlist: 0, debrid: 0 })
    expect(summary(container)).toContain('≈ 2 titlar')
    fireEvent.click(screen.getByText('Drama'))
    expect(summary(container)).toContain('≈ 1 titlar')
    fireEvent.click(container.querySelector('[data-source="watchlist"]')!)
    await flush()
    fireEvent.click(container.querySelector('[data-source="watchlist"]')!)
    fireEvent.click(container.querySelector('[data-source="watchlist"]')!)
    await flush()
    // Av och på igen hämtar inte på nytt.
    expect(state.calls).toEqual({ library: 1, watchlist: 1, debrid: 0 })
    expect(summary(container)).toContain('≈ 2 titlar')
    expect(container.querySelector('[data-studio-warning]')!.textContent).toContain('Färre än 5 titlar')
  })

  it('namnfel visas först efter sparförsöket; ny kanal sparas med förhandsvisningens frö', async () => {
    const onDone = vi.fn()
    const { container } = render(<Harness studio="new" channels={[]} onDone={onDone} />)
    await flush()
    expect(screen.queryByText('Ge kanalen ett namn')).toBeNull()
    fireEvent.click(screen.getByText('Skapa kanal'))
    expect(screen.getByText('Ge kanalen ett namn')).toBeTruthy()
    expect(state.saved).toHaveLength(0)
    fireEvent.change(container.querySelector('input[data-studio-name]')!, { target: { value: '  Natt ' } })
    fireEvent.click(screen.getByText('Skapa kanal'))
    expect(state.saved).toHaveLength(1)
    const saved = state.saved[0] as ChannelDef
    expect(saved).toMatchObject({ name: 'Natt', number: 1, sources: ['library'] })
    expect(onDone).toHaveBeenCalledWith(saved.id)
  })

  it('redigering behåller id, nummer, färgton och frö; borttagning kräver två klick', async () => {
    const existing: ChannelDef = { ...createChannel({ ...emptyDraft(), name: 'Gammal' }, [], 1, () => 0.4), id: 'k7', number: 7 }
    const onDone = vi.fn()
    const { container } = render(<Harness studio="k7" channels={[existing]} onDone={onDone} />)
    await flush()
    expect((container.querySelector('input[data-studio-name]') as HTMLInputElement).value).toBe('Gammal')
    fireEvent.click(screen.getByText('Kvällar 18–02'))
    fireEvent.click(screen.getByText('Spara'))
    expect(state.saved[0]).toMatchObject({ id: 'k7', number: 7, hue: existing.hue, seed: existing.seed, airWindow: 'evenings' })
    expect(onDone).toHaveBeenLastCalledWith('k7')

    fireEvent.click(screen.getByText('Ta bort kanal'))
    expect(state.deleted).toEqual([])
    fireEvent.click(screen.getByText('Bekräfta borttagning'))
    expect(state.deleted).toEqual(['k7'])
    expect(onDone).toHaveBeenLastCalledWith()
  })

  it('bekräftelsen för borttagning går ut efter 3 s', async () => {
    vi.useFakeTimers()
    try {
      const existing: ChannelDef = { ...createChannel({ ...emptyDraft(), name: 'X' }, []), id: 'k1' }
      render(<Harness studio="k1" channels={[existing]} onDone={() => {}} />)
      fireEvent.click(screen.getByText('Ta bort kanal'))
      expect(screen.getByText('Bekräfta borttagning')).toBeTruthy()
      act(() => { vi.advanceTimersByTime(3000) })
      expect(screen.getByText('Ta bort kanal')).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('Uppdatera tvingar debridlistan bara vid klick och laddar om debridpoolen', async () => {
    const { container } = render(<Harness studio="new" channels={[]} onDone={() => {}} />)
    await flush()
    expect(state.forced).toBe(0)
    state.debridItems = [item('d1', { source: 'debrid' })]
    fireEvent.click(container.querySelector('[data-studio-refresh]')!)
    await flush()
    expect(state.forced).toBe(1)
    expect(state.calls.debrid).toBe(1)
    expect(container.querySelector('[data-source="debrid"]')!.textContent).toBe('Debrid1')
  })

  it('en källa som inte svarar visar "—" och ingen få-titlar-varning', async () => {
    state.libraryFails = true
    const { container } = render(<Harness studio="new" channels={[]} onDone={() => {}} />)
    await flush()
    expect(container.querySelector('[data-source="library"]')!.textContent).toBe('Bibliotek—')
    expect(container.querySelector('[data-studio-warning]')).toBeNull()
  })

  it('en långsam första debridladdning skriver inte över Uppdatera', async () => {
    state.debridDeferred = true
    const existing: ChannelDef = { ...createChannel({ ...emptyDraft(), name: 'D', sources: ['debrid'] }, []), id: 'kd' }
    const { container } = render(<Harness studio="kd" channels={[existing]} onDone={() => {}} />)
    await flush()
    fireEvent.click(container.querySelector('[data-studio-refresh]')!)
    await flush()
    expect(state.debridQueue).toHaveLength(2)
    await act(async () => { state.debridQueue[1]!.resolve([item('ny1', { source: 'debrid' }), item('ny2', { source: 'debrid' })]) })
    await act(async () => { state.debridQueue[0]!.resolve([item('gammal', { source: 'debrid' })]) })
    expect(container.querySelector('[data-source="debrid"]')!.textContent).toBe('Debrid2')
  })

  it('genrechip väljer över stavningar: sparad "Sci-Fi" visas vald som Science Fiction', async () => {
    const existing: ChannelDef = { ...createChannel({ ...emptyDraft(), name: 'S', genres: ['Sci-Fi'] }, []), id: 'ks' }
    render(<Harness studio="ks" channels={[existing]} onDone={() => {}} />)
    await flush()
    const chip = screen.getByText('Sci-fi').closest('button')!
    expect(chip.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(chip)
    fireEvent.click(screen.getByText('Spara'))
    expect((state.saved[0] as ChannelDef).genres).toEqual([])
  })
})
