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
})
