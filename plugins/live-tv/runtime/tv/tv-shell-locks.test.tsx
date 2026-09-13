import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/**
 * Föräldrakontrollen i skalet.
 *
 * PIN-grinden är den ENDA kontroll som finns för låsta kanaler, och den hade
 * två hål:
 *
 *  1. Kanalbyte INIFRÅN spelaren (ChannelUp/Down, mini-guiden) satte `active`
 *     rakt av. En låst kanal spelades alltså utan grind så länge man startade
 *     på en olåst och bytte sig fram.
 *  2. Glasmenyns Lås/Lås upp växlade låset direkt. Två knapptryck räckte för
 *     att låsa upp vad som helst — hela föräldrakontrollen var verkningslös.
 *
 * PIN-bron finns bara i appar från 0.1.57 och läses dynamiskt ur SDK:n;
 * teststubben bär den och `__setProfilePinForTests` sätter profilens PIN.
 */
vi.mock('../hooks/useLiveTvEpgCache', () => ({ useLiveTvEpgCache: vi.fn(() => null) }))
vi.mock('../live-tv-player', () => ({
  LiveTvPlayer: ({ channel, tv }: { channel: { name: string }; tv?: { neighbours: Array<{ name: string }>; onSwitchChannel: (c: { name: string }) => void } }) => (
    <div data-testid="player">
      {channel.name}
      <button type="button" data-testid="switch-to-locked" onClick={() => tv?.onSwitchChannel(tv.neighbours[1])}>byt</button>
    </div>
  ),
}))

import { __resetForTests, __setProfilePinForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, channelKey, type LiveTvList } from '../live-tv-data'
import { LOCKED_CHANNELS_KEY, getLockedChannelKeys } from '../channel-locks'
import { LiveTvTvShell } from './tv-shell'

const ch = (name: string) => ({ name, logo: null, group: 'Sport', url: `http://x/${name}`, tvgId: null })
const list: LiveTvList = { id: 'l1', name: 'Xtream', channels: [ch('A'), ch('B')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  __setProfilePinForTests('1234')
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [channelKey(ch('A'))])
})

const mount = (params: Record<string, string>) => render(<LiveTvTvShell pageId="live-tv-browse" params={params} onNavigate={() => {}} onOpenDetails={() => {}} />)

// Sessionsupplåsningen i channel-locks.ts är modulglobal. Testerna nedan
// slutför ALDRIG en uppspelningsgrind, just för att den inte ska smitta.
describe('PIN-grinden i TV-skalet', () => {
  it('glasmenyns Lås kräver PIN — och den PIN:en öppnar inte uppspelningen', async () => {
    vi.useFakeTimers()
    mount({ view: 'favs' })
    const card = screen.getAllByTestId('fav-card')[0]
    fireEvent.keyDown(card, { key: 'Enter' })
    act(() => { vi.advanceTimersByTime(700) })
    fireEvent.keyUp(card, { key: 'Enter' })
    vi.useRealTimers()

    fireEvent.click(await screen.findByText('Lock with PIN'))
    // Låset växlas INTE av ett menyval — grinden kommer först.
    expect(getLockedChannelKeys()).toEqual([])
    const gate = await screen.findByRole('dialog')
    const input = gate.querySelector('input')!
    fireEvent.change(input, { target: { value: '1234' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(getLockedChannelKeys()).toEqual([channelKey(ch('A'))]))

    // Att ha bevisat sin PIN för att LÅSA ska inte öppna uppspelningen resten
    // av sessionen: nästa försök att spela den låsta kanalen möter grinden.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    fireEvent.click(screen.getAllByTestId('fav-card')[0])
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('kanalbyte inifrån spelaren möter grinden, och spelaren blir kvar', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, LOCKED_CHANNELS_KEY, [channelKey(ch('B'))])
    vi.useFakeTimers()
    mount({})
    fireEvent.keyDown(window, { key: '1' })
    act(() => { vi.advanceTimersByTime(1500) })
    vi.useRealTimers()
    expect(await screen.findByTestId('player')).toHaveTextContent('A')

    fireEvent.click(screen.getByTestId('switch-to-locked'))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    // Spelaren blinkar inte bort medan grinden är uppe, och den LÅSTA kanalen
    // har inte börjat spela.
    expect(screen.getByTestId('player')).toHaveTextContent('A')
  })

  // Grinden öppnas ovanpå spelaren utan att röra `active` — Back måste ändå
  // kunna avbryta den. Skalets gamla Back-lyssnare stod helt tillbaka så
  // fort spelaren var monterad (`active && Player`), så Backspace föll
  // igenom till kromet och stängde SPELAREN i stället för att avbryta
  // grinden.
  it('Backspace avbryter grinden medan spelaren är monterad, och spelaren stängs inte', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, LOCKED_CHANNELS_KEY, [channelKey(ch('B'))])
    vi.useFakeTimers()
    mount({})
    fireEvent.keyDown(window, { key: '1' })
    act(() => { vi.advanceTimersByTime(1500) })
    vi.useRealTimers()
    expect(await screen.findByTestId('player')).toHaveTextContent('A')

    fireEvent.click(screen.getByTestId('switch-to-locked'))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Backspace' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    // Spelaren lever kvar (fortfarande på A) — bara grinden stängdes.
    expect(screen.getByTestId('player')).toHaveTextContent('A')
  })
})
