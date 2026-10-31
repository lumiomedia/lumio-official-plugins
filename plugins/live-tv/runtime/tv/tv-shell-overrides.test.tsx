import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => <div data-testid="player" /> }))

import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, channelKey, type LiveTvList } from '../live-tv-data'
import { getChannelOverrides, setChannelName } from '../channel-overrides'
import { LiveTvTvShell } from './tv-shell'

const ch = (name: string) => ({ name, logo: null, group: 'Sport', url: `http://x/${name}`, tvgId: null })
const list: LiveTvList = { id: 'l1', name: 'X', channels: [ch('A'), ch('B')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [channelKey(ch('A')), channelKey(ch('B'))])
  seedLiveTvIndex()
})

const mount = (params: Record<string, string>) =>
  render(<LiveTvTvShell {...({ pageId: 'live-tv-browse', params, onNavigate: () => {}, onOpenDetails: () => {} } as unknown as ComponentProps<typeof LiveTvTvShell>)} />)

const holdFirstCard = () => {
  vi.useFakeTimers()
  const card = screen.getAllByTestId('fav-card')[0]
  fireEvent.keyDown(card, { key: 'Enter' })
  act(() => { vi.advanceTimersByTime(700) })
  fireEvent.keyUp(card, { key: 'Enter' })
  vi.useRealTimers()
}

describe('dölj och byt namn i kanalens hållmeny', () => {
  it('Dölj kanal tar bort den ur favoriterna och sparar den som dold', async () => {
    mount({ view: 'favs' })
    await waitFor(() => expect(screen.getAllByTestId('fav-card')).toHaveLength(2))
    holdFirstCard()
    fireEvent.click(await screen.findByText('Hide channel'))
    expect(getChannelOverrides().hidden).toEqual([channelKey(ch('A'))])
    await waitFor(() => expect(screen.getAllByTestId('fav-card')).toHaveLength(1))
    expect(screen.getByTestId('shell-toast')).toHaveTextContent('A is hidden')
  })

  it('en dold favorit hämtas inte som extra och syns varken i favoriterna eller historiken', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'channel_overrides_v1', { hidden: [channelKey(ch('B'))], names: {} })
    mount({ view: 'favs' })
    await waitFor(() => expect(screen.getAllByTestId('fav-card')).toHaveLength(1))
    await new Promise((r) => setTimeout(r, 150))
    expect(screen.getAllByTestId('fav-card')).toHaveLength(1)
  })

  it('ett eget namn visas, och nyckeln (favoriten) följer med', async () => {
    setChannelName(channelKey(ch('B')), 'Bee Sport')
    mount({ view: 'favs' })
    await waitFor(() => expect(screen.getAllByTestId('fav-card')).toHaveLength(2))
    expect(screen.getAllByTestId('fav-card')[1]).toHaveTextContent('Bee Sport')
  })

  it('Inställningar → Innehåll visar dolda kanaler; Visa tar tillbaka dem', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'channel_overrides_v1', { hidden: [channelKey(ch('A'))], names: {} })
    mount({ view: 'settings', tab: 'content' })
    const row = await screen.findByTestId(`hidden-channel-${channelKey(ch('A'))}`)
    expect(row).toHaveTextContent('A')
    fireEvent.click(row)
    expect(getChannelOverrides().hidden).toEqual([])
  })
})
