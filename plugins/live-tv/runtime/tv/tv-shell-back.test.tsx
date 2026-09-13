import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/**
 * Back medan spelaren fortfarande LADDAS.
 *
 * Skalet står tillbaka från Back så snart spelaren äger skärmen — men
 * `active` sätts direkt medan `<Player>` hämtas med en dynamisk import. I den
 * luckan (långsam disk, kall runtime) fanns ingen Back-lyssnare alls: trycket
 * föll igenom till värdsidan bakom, och användaren kastades ut ur Live TV
 * mitt i att en kanal startade. Grinden är `active && Player`, inte `active`.
 *
 * Mocken nedan låter importen hänga tills testet släpper den, vilket är exakt
 * det tillståndet.
 */
const loading = vi.hoisted(() => {
  let release: () => void = () => {}
  const pending = new Promise<void>((resolve) => { release = resolve })
  return { pending, release: () => release() }
})

vi.mock('../hooks/useLiveTvEpgCache', () => ({ useLiveTvEpgCache: vi.fn(() => null) }))
vi.mock('../live-tv-player', async () => {
  await loading.pending
  return { LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }
})

import { __resetForTests, __setTvModeForTests, BROWSE_BACK_EVENT, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import { LiveTvTvShell } from './tv-shell'

const ch = (name: string) => ({ name, logo: null, group: 'Sport', url: `http://x/${name}`, tvgId: null })
const list: LiveTvList = { id: 'l1', name: 'Xtream', channels: [ch('A'), ch('B')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
})

describe('LiveTvTvShell: Back medan spelaren laddas', () => {
  it('avbryter uppspelningen i stället för att lämna Live TV', async () => {
    render(<LiveTvTvShell pageId="live-tv-browse" params={{}} onNavigate={() => {}} onOpenDetails={() => {}} />)
    const leftLiveTv = vi.fn()
    window.addEventListener(BROWSE_BACK_EVENT, leftLiveTv)

    vi.useFakeTimers()
    fireEvent.keyDown(window, { key: '1' })
    act(() => { vi.advanceTimersByTime(1500) })
    vi.useRealTimers()
    // `active` är satt, men modulen hänger: ingen spelare i DOM:en.
    await act(async () => { await Promise.resolve() })
    expect(screen.queryByTestId('player')).toBeNull()

    fireEvent.keyDown(window, { key: 'Backspace' })
    // Trycket stannade i pluginet och nollställde uppspelningen …
    expect(leftLiveTv).not.toHaveBeenCalled()

    // … så när modulen till slut landar startar ingen spelare.
    loading.release()
    await act(async () => { await new Promise((r) => setTimeout(r, 20)) })
    expect(screen.queryByTestId('player')).toBeNull()

    // Och nu, utan uppspelning, tar nästa Back användaren ut ur Live TV.
    fireEvent.keyDown(window, { key: 'Backspace' })
    await waitFor(() => expect(leftLiveTv).toHaveBeenCalledTimes(1))
    window.removeEventListener(BROWSE_BACK_EVENT, leftLiveTv)
  })
})
