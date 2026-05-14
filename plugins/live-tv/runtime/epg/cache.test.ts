import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ensureFresh, readCache, __resetForTests } from './cache'
import * as sdk from '@/lib/plugin-sdk'
import { EpgFetchError } from './fetcher'
import * as fetcherModule from './fetcher'
import type { EpgCacheEntry } from './types'

const SIX_HOURS = 6 * 60 * 60 * 1000

const sampleCache: EpgCacheEntry = {
  index: { A: [{ title: 'X', start: 0, stop: 1 }] },
  fetchedAt: 0,
  sources: ['u'],
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-13T12:00:00Z'))
  __resetForTests()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('cache', () => {
  it('returns null when no cache and no urls', async () => {
    vi.spyOn(sdk, 'readPluginJson').mockReturnValue(null)
    expect(await ensureFresh('L1', [])).toBeNull()
  })

  it('returns existing cache immediately when fresh', async () => {
    const fresh = { ...sampleCache, fetchedAt: Date.now() - 60_000 }
    vi.spyOn(sdk, 'readPluginJson').mockReturnValue(fresh)
    const fetchSpy = vi.spyOn(fetcherModule, 'fetchEpg')
    expect(await ensureFresh('L1', ['u'])).toEqual(fresh)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('refreshes immediately when urls changed even if cache is fresh', async () => {
    const fresh = { ...sampleCache, fetchedAt: Date.now() - 60_000, requestedSources: ['u'] }
    vi.spyOn(sdk, 'readPluginJson').mockReturnValue(fresh)
    const next: EpgCacheEntry = { ...sampleCache, fetchedAt: Date.now(), sources: ['v'], requestedSources: ['v'] }
    const fetchSpy = vi.spyOn(fetcherModule, 'fetchEpg').mockResolvedValue(next)
    vi.spyOn(sdk, 'writePluginJson').mockImplementation(() => {})

    expect(await ensureFresh('L1', ['v'])).toEqual(fresh)
    await vi.runAllTimersAsync()
    expect(fetchSpy).toHaveBeenCalledWith(['v'])
  })

  it('kicks background refresh on stale, returns stale immediately, writes fresh after', async () => {
    const stale = { ...sampleCache, fetchedAt: Date.now() - SIX_HOURS - 1 }
    vi.spyOn(sdk, 'readPluginJson').mockReturnValue(stale)
    const fresh: EpgCacheEntry = { ...sampleCache, fetchedAt: Date.now() }
    const fetchSpy = vi.spyOn(fetcherModule, 'fetchEpg').mockResolvedValue(fresh)
    const writeSpy = vi.spyOn(sdk, 'writePluginJson').mockImplementation(() => {})

    const immediate = await ensureFresh('L1', ['u'])
    expect(immediate).toEqual(stale)
    await vi.runAllTimersAsync()
    expect(fetchSpy).toHaveBeenCalledWith(['u'])
    expect(writeSpy).toHaveBeenCalled()
  })

  it('debounces concurrent ensureFresh calls', async () => {
    vi.spyOn(sdk, 'readPluginJson').mockReturnValue(null)
    const fetchSpy = vi.spyOn(fetcherModule, 'fetchEpg').mockResolvedValue(sampleCache)
    vi.spyOn(sdk, 'writePluginJson').mockImplementation(() => {})

    await Promise.all([
      ensureFresh('L1', ['u']),
      ensureFresh('L1', ['u']),
      ensureFresh('L1', ['u']),
    ])
    await vi.runAllTimersAsync()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('keeps existing cache on fetch failure and schedules retry', async () => {
    const stale = { ...sampleCache, fetchedAt: Date.now() - SIX_HOURS - 1 }
    vi.spyOn(sdk, 'readPluginJson').mockReturnValue(stale)
    vi.spyOn(fetcherModule, 'fetchEpg').mockRejectedValue(new Error('down'))
    const writeSpy = vi.spyOn(sdk, 'writePluginJson').mockImplementation(() => {})

    const immediate = await ensureFresh('L1', ['u'])
    await vi.runAllTimersAsync()
    expect(immediate).toEqual(stale)
    expect(writeSpy).not.toHaveBeenCalled()
  })

  it('writes failed source diagnostics for xmltv 502 responses', async () => {
    vi.spyOn(sdk, 'readPluginJson').mockReturnValue(null)
    const failure = { url: 'https://bad.example/epg.xml', error: 'HTTP 404' }
    vi.spyOn(fetcherModule, 'fetchEpg').mockRejectedValue(
      new EpgFetchError('/api/xmltv returned 502', 502, [failure]),
    )
    const writeSpy = vi.spyOn(sdk, 'writePluginJson').mockImplementation(() => {})

    await ensureFresh('L1', ['https://bad.example/epg.xml'])
    await vi.runAllTimersAsync()
    expect(writeSpy).toHaveBeenCalledWith('com.lumio.live-tv', 'epg_cache:L1', expect.objectContaining({
      index: {},
      sources: [],
      requestedSources: ['https://bad.example/epg.xml'],
      failures: [failure],
    }))
  })
})
