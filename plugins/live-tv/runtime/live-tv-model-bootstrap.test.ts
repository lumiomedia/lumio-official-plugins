import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from './live-tv-data'
import type { IndexChannel } from './index-client'
import type { NowNextLater } from './epg/types'

/**
 * Starten (migrering + enhetsöverföring) och EPG-tickern.
 *
 * Egen fil och inte `live-tv-model.test.ts`: här mockas `storage-v2-migration`
 * för att kunna HÅLLA KVAR migreringen och se vad som händer under tiden, och
 * `epgStatus` får falla — två saker som inte ska gälla för modellfilens övriga
 * tester.
 */
vi.mock('./index-client', () => ({
  INDEX_CHANGED_EVENT: 'lumio-live-tv-index-changed',
  emitIndexChanged: vi.fn(),
  onIndexChanged: vi.fn((cb: () => void) => {
    const handler = () => cb()
    window.addEventListener('lumio-live-tv-index-changed', handler)
    return () => window.removeEventListener('lumio-live-tv-index-changed', handler)
  }),
  loadAllChannels: vi.fn(async () => [] as IndexChannel[]),
  lookupChannels: vi.fn(async () => [] as IndexChannel[]),
  queryChannels: vi.fn(async () => ({ items: [], total: 0, known: true })),
  searchChannels: vi.fn(async () => []),
  listGroups: vi.fn(async () => []),
  indexStatus: vi.fn(async () => ({ sourceIds: ['s1'], sources: [{ id: 's1', channels: 1, updatedAt: 0 }] })),
  batchChannels: vi.fn(async () => {}),
  resetSource: vi.fn(async () => {}),
  startImport: vi.fn(async () => 'job'),
  importStatus: vi.fn(async () => ({ state: 'done', received: 0 })),
  waitForJob: vi.fn(async () => ({ state: 'done', received: 0 })),
  refreshEpg: vi.fn(async () => 'epg-job'),
  epgStatus: vi.fn(async () => ({ listId: 'probe', fetchedAt: null, failedAt: null, channels: 0, programmes: 0, urls: [] })),
  epgNow: vi.fn(async () => ({ at: Date.now(), fetchedAt: Date.now(), items: {} as Record<string, NowNextLater> })),
  epgSchedule: vi.fn(async () => ({})),
  epgSearch: vi.fn(async () => []),
}))

vi.mock('./storage-v2-migration', () => ({
  migrateStorageV2: vi.fn(async () => ({ migrated: 0 })),
  isStorageV2Migrated: vi.fn(() => true),
}))

import { epgNow, epgStatus, indexStatus, loadAllChannels } from './index-client'
import { migrateStorageV2 } from './storage-v2-migration'
import { __resetLiveTvModelForTests, useLiveTvModel } from './live-tv-model'
import { __resetNowSnapshotForTests } from './epg/now-snapshot'
import { __resetChannelResolverForTests } from './channel-resolver'
import { __resetScheduleCacheForTests } from './epg/schedule-cache'

const lists: LiveTvList[] = [
  { id: 'l1', name: 'Panel', kind: 'm3u', source: 's1', url: 's1', createdAt: '', urlTvg: 'http://epg/1.xml', epgUrls: [], autoEpgDisabled: false, fetchedAt: null, channelCount: 0, groups: [] },
]

const channel = (name: string): IndexChannel => ({
  name,
  logo: null,
  group: 'Sport',
  url: `http://x/${name}`,
  tvgId: null,
  key: `${name}::http://x/${name}`,
  number: 1,
  tvgIdResolved: null,
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

beforeEach(() => {
  __resetForTests()
  __resetLiveTvModelForTests()
  __resetNowSnapshotForTests()
  __resetChannelResolverForTests()
  __resetScheduleCacheForTests()
  vi.clearAllMocks()
  __setTvModeForTests(false)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', lists)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  vi.mocked(loadAllChannels).mockResolvedValue([channel('A')])
  vi.mocked(migrateStorageV2).mockResolvedValue({ migrated: 0 })
  vi.mocked(epgStatus).mockResolvedValue({ listId: 'probe', fetchedAt: null, failedAt: null, channels: 0, programmes: 0, urls: [] })
})

describe('starten grindar EPG-hämtningen', () => {
  it('frågar inte efter tablån förrän migreringen är klar', async () => {
    // En uppgraderad (eller nyss ihopparad) enhet har INGA kanaler i indexet
    // förrän migreringen/importerna landat. Frågar tablån före det svarar
    // appen tomt, och tomheten cachas som sanning.
    let release: () => void = () => {}
    vi.mocked(migrateStorageV2).mockImplementation(
      () => new Promise((resolve) => {
        release = () => resolve({ migrated: 1 })
      }),
    )

    renderHook(() => useLiveTvModel())
    await act(async () => {
      for (let i = 0; i < 8; i += 1) await Promise.resolve()
    })
    expect(epgNow).not.toHaveBeenCalled()

    await act(async () => {
      release()
      for (let i = 0; i < 8; i += 1) await Promise.resolve()
    })
    await waitFor(() => expect(epgNow).toHaveBeenCalled())
  })
})

describe('appversionsgrinden', () => {
  it('hoppar över migrering och importer när appen saknar v2-endpointerna', async () => {
    // 0.1.595 har /batch och /query men varken /import eller /epg/*:
    // migreringen skulle flytta kanalerna ur lists och lämna dem oåtkomliga.
    vi.mocked(epgStatus).mockRejectedValue(new Error('/api/live-tv/epg/status returned 404'))

    const { result } = renderHook(() => useLiveTvModel())

    await waitFor(() => expect(result.current.appTooOld).toBe(true))
    expect(migrateStorageV2).not.toHaveBeenCalled()
    expect(indexStatus).not.toHaveBeenCalled()
  })

  it('är falskt mot en app som svarar', async () => {
    const { result } = renderHook(() => useLiveTvModel())
    await waitFor(() => expect(result.current.channelsLoading).toBe(false))
    expect(result.current.appTooOld).toBe(false)
    expect(migrateStorageV2).toHaveBeenCalled()
  })
})

describe('minuttickerns omhämtning av /epg/now', () => {
  const snapshotWith = (nowStopMs: number, nextStartMs: number) => ({
    at: Date.now(),
    fetchedAt: Date.now(),
    items: {
      'A::http://x/A': {
        now: { title: 'Nu', start: Date.now() - 1000, stop: nowStopMs },
        next: { title: 'Sen', start: nextStartMs, stop: nextStartMs + 3_600_000 },
        later: null,
      },
    } as Record<string, NowNextLater>,
  })

  it('hämtar INTE om när inget program passerat en gräns', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const start = Date.now()
    vi.mocked(epgNow).mockResolvedValue(snapshotWith(start + 4 * 3_600_000, start + 4 * 3_600_000))

    const { result } = renderHook(() => useLiveTvModel())
    await waitFor(() => expect(result.current.hasEpg).toBe(true))
    expect(epgNow).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(60_000)
      for (let i = 0; i < 8; i += 1) await Promise.resolve()
    })

    expect(epgNow).toHaveBeenCalledTimes(1)
  })

  it('hämtar om när ett program tagit slut', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const start = Date.now()
    // "Nu" slutar inom tickens minut: efter tickan är snapshotet inaktuellt.
    vi.mocked(epgNow).mockResolvedValue(snapshotWith(start + 30_000, start + 30_000))

    const { result } = renderHook(() => useLiveTvModel())
    await waitFor(() => expect(result.current.hasEpg).toBe(true))
    expect(epgNow).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(60_000)
      for (let i = 0; i < 8; i += 1) await Promise.resolve()
    })

    await waitFor(() => expect(vi.mocked(epgNow).mock.calls.length).toBeGreaterThan(1))
  })
})
