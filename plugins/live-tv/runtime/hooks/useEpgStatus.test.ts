import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, cleanup, act } from '@testing-library/react'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'

vi.mock('../index-client', () => ({
  epgStatus: vi.fn(),
  refreshEpg: vi.fn(async () => 'job-1'),
  waitForJob: vi.fn(async () => ({ state: 'done', received: 0 })),
}))

import { epgStatus, refreshEpg, waitForJob } from '../index-client'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import { useEpgStatus } from './useEpgStatus'

const list: LiveTvList = {
  id: 'l1',
  name: 'Panel',
  kind: 'm3u',
  source: 'http://panel/list.m3u',
  channels: [],
  createdAt: '',
  urlTvg: null,
  epgUrls: ['http://panel/epg.xml'],
  autoEpgDisabled: false,
  fetchedAt: null,
}

const status = {
  listId: 'global',
  fetchedAt: 1_700_000_000_000,
  failedAt: null,
  channels: 3,
  programmes: 812,
  urls: [{ url: 'http://panel/epg.xml', channels: 3, programmes: 812, fetchedAt: 1_700_000_000_000 }],
}

beforeEach(() => {
  __resetForTests()
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  vi.mocked(epgStatus).mockReset()
  vi.mocked(epgStatus).mockResolvedValue(status)
  vi.mocked(refreshEpg).mockClear()
  vi.mocked(waitForJob).mockClear()
})
afterEach(cleanup)

describe('useEpgStatus', () => {
  it('läser global status en gång', async () => {
    const { result } = renderHook(() => useEpgStatus())
    await waitFor(() => expect(result.current.status).not.toBeNull())
    expect(epgStatus).toHaveBeenCalledTimes(1)
    // Butiken är GLOBAL — ett lager för alla list-id.
    expect(epgStatus).toHaveBeenCalledWith('global')
    expect(result.current.urls).toEqual(['http://panel/epg.xml'])
  })

  it('refresh kör refreshEpg + waitForJob och läser om', async () => {
    const { result } = renderHook(() => useEpgStatus())
    await waitFor(() => expect(result.current.status).not.toBeNull())
    await act(async () => { await result.current.refresh() })
    expect(refreshEpg).toHaveBeenCalledWith('global', ['http://panel/epg.xml'], ['http://panel/list.m3u'], true)
    expect(waitForJob).toHaveBeenCalledWith('job-1')
    expect(epgStatus).toHaveBeenCalledTimes(2)
    expect(result.current.refreshing).toBe(false)
  })

  it('ett fel lämnar hooken i null utan att kasta', async () => {
    vi.mocked(epgStatus).mockRejectedValue(new Error('404'))
    const { result } = renderHook(() => useEpgStatus())
    await waitFor(() => expect(epgStatus).toHaveBeenCalled())
    expect(result.current.status).toBeNull()
    // Även en trasig omhämtning ska svälja felet: resten av inställningarna
    // fungerar utan siffror på en äldre app.
    vi.mocked(refreshEpg).mockRejectedValueOnce(new Error('no endpoint'))
    await act(async () => { await result.current.refresh() })
    expect(result.current.refreshing).toBe(false)
  })

  it('prenumererar på liständringar', async () => {
    const { result } = renderHook(() => useEpgStatus())
    await waitFor(() => expect(result.current.status).not.toBeNull())
    act(() => {
      writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ ...list, epgUrls: ['http://panel/epg.xml', 'http://annan/epg.xml'] }])
    })
    await waitFor(() => expect(result.current.urls).toEqual(['http://panel/epg.xml', 'http://annan/epg.xml']))
  })

  it('ett andra tryck startar ingen andra hämtning', async () => {
    // Vakten sitter i en ref: `refresh` är memoiserad och läser annars ett
    // inaktuellt `refreshing` ur sin stängning.
    let release: (() => void) | null = null
    vi.mocked(waitForJob).mockImplementationOnce(() => new Promise((resolve) => { release = () => resolve({ state: 'done', received: 0 } as never) }))
    const { result } = renderHook(() => useEpgStatus())
    await waitFor(() => expect(result.current.status).not.toBeNull())
    let first: Promise<void> | null = null
    act(() => { first = result.current.refresh() })
    await waitFor(() => expect(result.current.refreshing).toBe(true))
    await act(async () => { await result.current.refresh() })
    expect(refreshEpg).toHaveBeenCalledTimes(1)
    await act(async () => { release?.(); await first })
    expect(result.current.refreshing).toBe(false)
  })
})
