import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'

// Egen fil (i stället för en `vi.doMock` i tv-shell.test.tsx, som redan har
// en toppnivå-`vi.mock` för samma modul): vitest hissar `vi.mock` till
// filens topp, så ett senare `vi.doMock` i den filen skulle inte ta över.
// Stubben här bryr sig bara om att `tv` faktiskt kommer fram från skalet.
vi.mock('../live-tv-player', () => ({
  LiveTvPlayer: ({ tv }: { tv?: { channelNumber: number | null } }) => (
    <div data-testid="player">{tv ? `n=${tv.channelNumber}` : 'no-tv'}</div>
  ),
}))

import { LiveTvTvShell } from './tv-shell'

const ch = (name: string, group: string) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId: null })
const list: LiveTvList = { id: 'l1', name: 'Xtream', channels: [ch('A', 'Sport'), ch('B', 'Sport'), ch('C', 'News')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
})

describe('LiveTvTvShell + spelarens tv-props', () => {
  it('spelaren får tv-props och kromet ritas', async () => {
    render(<LiveTvTvShell pageId="live-tv-browse" params={{}} onNavigate={() => {}} onOpenDetails={() => {}} />)
    fireEvent.keyDown(window, { key: '1' })
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(await screen.findByTestId('player')).toHaveTextContent('n=1')
  })
})
