import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => null }))
vi.mock('../vod-home', async (orig) => ({ ...(await orig<object>()), hasVodIndex: vi.fn() }))

import { LiveTvTvShell } from './tv-shell'
import { hasVodIndex, markVodHomeRedirect, vodHomeTarget } from '../vod-home'

const ch = (name: string, group: string) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId: null })
const list: LiveTvList = { id: 'l1', name: 'Xtream', channels: [ch('A', 'Sport'), ch('B', 'News')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  seedLiveTvIndex()
  markVodHomeRedirect(-Infinity) // nollställ spärren mellan testerna
  vi.mocked(hasVodIndex).mockReset()
})

function mount(params?: Record<string, string>) {
  const onNavigate = vi.fn()
  render(<LiveTvTvShell pageId="live-tv-browse" params={params as Record<string, string>} onNavigate={onNavigate} onOpenDetails={() => {}} />)
  return { onNavigate }
}

describe('Live TV öppnar i Hem', () => {
  it('utan params och med index: går vidare till VOD-hemmet', async () => {
    vi.mocked(hasVodIndex).mockResolvedValue(true)
    const { onNavigate } = mount(undefined)
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(vodHomeTarget()))
  })
  it('utan index: ingen navigering, Kanaler står kvar', async () => {
    vi.mocked(hasVodIndex).mockResolvedValue(false)
    const { onNavigate } = mount(undefined)
    await waitFor(() => expect(hasVodIndex).toHaveBeenCalled())
    expect(onNavigate).not.toHaveBeenCalled()
    expect(screen.getByTestId('rail-hub')).toHaveAttribute('data-current')
  })
  it('med view-param: aldrig omdirigering', async () => {
    vi.mocked(hasVodIndex).mockResolvedValue(true)
    const { onNavigate } = mount({ view: 'guide' })
    await new Promise((r) => setTimeout(r, 20))
    expect(onNavigate).not.toHaveBeenCalled()
  })
  it('spärren: andra öppningen inom 10 s studsar inte', async () => {
    vi.mocked(hasVodIndex).mockResolvedValue(true)
    const first = mount(undefined)
    await waitFor(() => expect(first.onNavigate).toHaveBeenCalled())
    cleanup()
    const second = mount(undefined)
    await new Promise((r) => setTimeout(r, 20))
    expect(second.onNavigate).not.toHaveBeenCalled()
  })
})
