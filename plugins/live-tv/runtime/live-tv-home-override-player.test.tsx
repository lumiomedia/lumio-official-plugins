import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { flushLiveTvIndex, seedLiveTvIndex } from '../src/__test-stubs__/live-tv-index'

// Egen fil: `vi.mock` hissas per fil, och live-tv-home-override.test.tsx har
// redan en stubbe för spelaren som inte visar `tv`.
const gridProps: Array<{ onNavigate?: unknown }> = []
vi.mock('./live-tv-grid', () => ({
  LiveTvGrid: (props: { onNavigate?: unknown }) => {
    gridProps.push(props)
    return <div data-testid="grid" />
  },
}))
vi.mock('./now-next-later-row', () => ({ NowNextLaterRow: () => <div data-testid="nnl" /> }))
vi.mock('./live-tv-player', () => ({
  LiveTvPlayer: ({ tv }: { tv?: { channelNumber: number | null; bannerHideMs: number } }) => (
    <div data-testid="player">{tv ? `krom n=${tv.channelNumber}` : 'inget krom'}</div>
  ),
}))

import { LIVE_TV_PLUGIN_ID, type LiveTvList, type M3uChannel } from './live-tv-data'
import { LiveTvHomeOverride } from './live-tv-home-override'

const SOURCE = 'http://example.test/playlist.m3u'
const ch = (name: string, tvgId: string | null = null): M3uChannel => ({
  name,
  logo: null,
  group: 'Sport',
  url: `http://example.test/${name}.m3u8`,
  tvgId,
})
const CHANNELS = [ch('Ett'), ch('Tva', 'tva.tv'), ch('Tre')]

function list(channels: M3uChannel[]): LiveTvList {
  return {
    id: 'l1',
    name: 'Panel',
    kind: 'm3u',
    source: SOURCE,
    url: SOURCE,
    createdAt: '',
    urlTvg: null,
    epgUrls: [],
    autoEpgDisabled: false,
    fetchedAt: null,
    channels,
  } as LiveTvList
}

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list(CHANNELS)])
  seedLiveTvIndex()
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [
    { ...list([]), channelCount: CHANNELS.length, groups: [{ name: 'Sport', count: CHANNELS.length }] },
  ])
})

describe('startsidans spelare', () => {
  it('får TV-kromet — spelaren ritar inget krom utan tv-props', async () => {
    render(<LiveTvHomeOverride onNavigate={() => {}} onOpenDetails={() => {}} />)
    await flushLiveTvIndex()

    fireEvent.click(screen.getByRole('button', { name: 'play' }))
    expect(await screen.findByTestId('player')).toHaveTextContent(/^krom n=/)
  })

  it('skickar värdens navigering vidare till rutnätet — guiden bor i bläddringssidan', async () => {
    const onNavigate = vi.fn()
    gridProps.length = 0
    render(<LiveTvHomeOverride onNavigate={onNavigate} onOpenDetails={() => {}} />)
    await flushLiveTvIndex()
    expect(gridProps.at(-1)?.onNavigate).toBe(onNavigate)
  })
})
