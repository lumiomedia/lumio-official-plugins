import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import { getMultiviewState } from './tv-multiview-store'

/**
 * MULTIVY INIFRÅN SPELAREN — FÖRST NÄR SPELAREN ÄR BORTA.
 *
 * Sports "Välj flera → Multiview" (och kromets Multiview-knapp) stängde
 * spelaren och bytte vy i SAMMA rendering. Multivyns nativa ytor skapades och
 * mättes då i samma commit som spelaren revs: `mpv-playing` släpptes (hela
 * #root gick från display:none till synligt), mpv_close var på väg och scenen
 * lade om sig. Uppmätt hos Jerry 2026-10-11: ljud men ingen bild i alla tre
 * rutorna — och bild direkt när han lämnade multivyn och gick in igen, dvs.
 * samma vy monterad UTAN en spelare som rivs samtidigt. Vybytet väntar därför
 * tills spelaren är avmonterad och sidan målats en gång utan den.
 */

vi.mock('../live-tv-player', () => ({
  LiveTvPlayer: ({ tv }: { tv?: { onOpenMultiview: () => void; sport?: { onOpenMultiview: (keys: string[]) => void } } }) => (
    <div data-testid="player">
      <button data-testid="chrome-multi" onClick={() => tv?.onOpenMultiview()}>multi</button>
      <button data-testid="sport-multi" onClick={() => tv?.sport?.onOpenMultiview(['k1', 'k2', 'k3'])}>sport</button>
    </div>
  ),
}))

// Sportdelen kräver dagens matcher; här räcker det att skalets egen
// `openMultiview` når kromet — den ÄR "Välj flera"-knappens väg.
vi.mock('../sport/tv/player-sport', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('../sport/tv/player-sport')
  return {
    ...actual,
    usePlayerSport: (args: { playingKey: string | null; openMultiview: (keys: string[]) => void }) =>
      (args.playingKey === null ? undefined : { onOpenMultiview: args.openMultiview, matches: [], overrides: {}, view: 'all' }),
  }
})

import { LiveTvTvShell } from './tv-shell'

const ch = (name: string, group: string) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId: null })
const list: LiveTvList = { id: 'l1', name: 'Xtream', channels: [ch('A', 'Sport'), ch('B', 'Sport'), ch('C', 'News')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  seedLiveTvIndex()
})

async function openPlayer() {
  // Varje anrop till onNavigate antecknar om spelaren fortfarande stod i DOM:en.
  const calls: Array<{ view: string | undefined; playerMounted: boolean }> = []
  const onNavigate = vi.fn((target: { params?: Record<string, string> }) => {
    calls.push({ view: target.params?.view, playerMounted: document.querySelector('[data-testid="player"]') !== null })
  })
  render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'hub' }} onNavigate={onNavigate} onOpenDetails={() => {}} />)
  fireEvent.keyDown(window, { key: '1' })
  fireEvent.keyDown(window, { key: 'Enter' })
  await screen.findByTestId('player')
  return { calls }
}

describe('multivy inifrån spelaren', () => {
  it('Välj flera: spelaren stängs först, vybytet till multi kommer efter att den är avmonterad', async () => {
    const { calls } = await openPlayer()
    act(() => { fireEvent.click(screen.getByTestId('sport-multi')) })
    // Spelaren är borta direkt, men vybytet har inte skett i samma rendering.
    expect(screen.queryByTestId('player')).toBeNull()
    expect(calls.filter((c) => c.view === 'multi')).toEqual([])
    expect(getMultiviewState().tiles).toEqual(['k1', 'k2', 'k3'])
    await waitFor(() => expect(calls.filter((c) => c.view === 'multi')).toHaveLength(1))
    expect(calls.find((c) => c.view === 'multi')?.playerMounted).toBe(false)
  })

  it('kromets Multiview-knapp går samma väg', async () => {
    const { calls } = await openPlayer()
    act(() => { fireEvent.click(screen.getByTestId('chrome-multi')) })
    expect(screen.queryByTestId('player')).toBeNull()
    expect(calls.filter((c) => c.view === 'multi')).toEqual([])
    await waitFor(() => expect(calls.filter((c) => c.view === 'multi')).toHaveLength(1))
    expect(calls.find((c) => c.view === 'multi')?.playerMounted).toBe(false)
  })

  it('en kanal som startas under väntan avbryter vybytet', async () => {
    const { calls } = await openPlayer()
    act(() => { fireEvent.click(screen.getByTestId('chrome-multi')) })
    // Ny uppspelning innan bildrutorna gått: multivyn ska inte dyka upp ovanpå.
    fireEvent.keyDown(window, { key: '2' })
    fireEvent.keyDown(window, { key: 'Enter' })
    await screen.findByTestId('player')
    await new Promise((resolve) => setTimeout(resolve, 80))
    expect(calls.filter((c) => c.view === 'multi')).toEqual([])
  })
})
