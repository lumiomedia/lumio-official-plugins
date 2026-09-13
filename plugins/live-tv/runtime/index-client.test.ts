import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  queryChannels,
  loadAllChannels,
  lookupChannels,
  searchChannels,
  listGroups,
  startImport,
  importStatus,
  waitForJob,
  refreshEpg,
  epgNow,
  epgSchedule,
  epgSearch,
  indexStatus,
  batchChannels,
  INDEX_CHANGED_EVENT,
  emitIndexChanged,
  onIndexChanged,
  type IndexChannel,
  type ImportStatus,
  type BatchChannel,
} from './index-client'

function channel(key: string, overrides: Partial<IndexChannel> = {}): IndexChannel {
  return {
    key,
    number: 1,
    name: key,
    group: 'Group',
    url: `https://example.test/${key}`,
    tvgId: null,
    tvgIdResolved: null,
    ...overrides,
  }
}

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response
}

function mockFetch() {
  const fn = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('queryChannels', () => {
  it('builds the query string and parses the response', async () => {
    const fetchMock = mockFetch()
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ items: [channel('a')], total: 1, known: true, updatedAt: 123 }),
    )

    const result = await queryChannels({ source: 'src1', group: 'News', q: 'bbc', offset: 0, limit: 50 })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('/api/live-tv/query?source=src1&group=News&q=bbc&offset=0&limit=50')
    expect(result).toEqual({ items: [channel('a')], total: 1, known: true })
  })

  it('omits empty/undefined params', async () => {
    const fetchMock = mockFetch()
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [], total: 0, known: false }))

    await queryChannels({ offset: 0, limit: 50 })

    const [url] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('/api/live-tv/query?offset=0&limit=50')
  })
})

describe('loadAllChannels', () => {
  it('pages with limit 5000 until a short page is returned', async () => {
    const fetchMock = mockFetch()
    const fullPage = Array.from({ length: 5000 }, (_, i) => channel(`c${i}`))
    const shortPage = [channel('last')]
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ items: fullPage, total: 5001, known: true }))
      .mockResolvedValueOnce(jsonResponse({ items: shortPage, total: 5001, known: true }))

    const onPage = vi.fn()
    const items = await loadAllChannels('src1', onPage)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[0][0])).toContain('offset=0&limit=5000')
    expect(String(fetchMock.mock.calls[1][0])).toContain('offset=5000&limit=5000')
    expect(items).toHaveLength(5001)
    expect(onPage).toHaveBeenNthCalledWith(1, 5000, 5001)
    expect(onPage).toHaveBeenNthCalledWith(2, 5001, 5001)
  })

  it('stops after a single page shorter than the limit', async () => {
    const fetchMock = mockFetch()
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [channel('only')], total: 1, known: true }))

    const items = await loadAllChannels(null)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(items).toHaveLength(1)
  })
})

describe('lookupChannels', () => {
  it('chunks keys into batches of 200 and merges results', async () => {
    const fetchMock = mockFetch()
    const keys = Array.from({ length: 250 }, (_, i) => `k${i}`)
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ items: [channel('k0')] }))
      .mockResolvedValueOnce(jsonResponse({ items: [channel('k200')] }))

    const items = await lookupChannels(keys)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const firstBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body))
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body))
    expect(firstBody.keys).toHaveLength(200)
    expect(secondBody.keys).toHaveLength(50)
    expect(items).toEqual([channel('k0'), channel('k200')])
  })

  it('makes no request for an empty key list', async () => {
    const fetchMock = mockFetch()
    const items = await lookupChannels([])
    expect(fetchMock).not.toHaveBeenCalled()
    expect(items).toEqual([])
  })
})

describe('searchChannels / listGroups', () => {
  it('searchChannels passes q and limit', async () => {
    const fetchMock = mockFetch()
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [channel('hit')] }))
    const items = await searchChannels('bbc', 10)
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/live-tv/search?q=bbc&limit=10')
    expect(items).toEqual([channel('hit')])
  })

  it('listGroups omits source when null', async () => {
    const fetchMock = mockFetch()
    fetchMock.mockResolvedValueOnce(jsonResponse({ groups: [{ name: 'News', count: 3 }] }))
    const groups = await listGroups(null)
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/live-tv/groups')
    expect(groups).toEqual([{ name: 'News', count: 3 }])
  })
})

describe('startImport / importStatus', () => {
  it('posts the body and returns the job id', async () => {
    const fetchMock = mockFetch()
    fetchMock.mockResolvedValueOnce(jsonResponse({ job: 'job-1' }))
    const job = await startImport({ source: 'src1', m3u: { url: 'https://x/list.m3u' } })
    expect(job).toBe('job-1')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/live-tv/import')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ source: 'src1', m3u: { url: 'https://x/list.m3u' } })
  })

  it('importStatus reads job status', async () => {
    const fetchMock = mockFetch()
    const status: ImportStatus = { state: 'fetching', received: 10 }
    fetchMock.mockResolvedValueOnce(jsonResponse(status))
    const result = await importStatus('job-1')
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/live-tv/import/status?job=job-1')
    expect(result).toEqual(status)
  })

  it('throws an Error carrying the HTTP status for a non-OK response', async () => {
    const fetchMock = mockFetch()
    fetchMock.mockResolvedValueOnce(jsonResponse(null, false, 404))
    await expect(importStatus('missing')).rejects.toThrow('404')
  })
})

describe('waitForJob', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('polls every pollMs until the job is done', async () => {
    const fetchMock = mockFetch()
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ state: 'fetching', received: 1 }))
      .mockResolvedValueOnce(jsonResponse({ state: 'writing', received: 5 }))
      .mockResolvedValueOnce(jsonResponse({ state: 'done', received: 5, result: { total: 5, groups: [], urlTvg: null, truncated: false } }))

    const onProgress = vi.fn()
    const promise = waitForJob('job-1', onProgress, 500)

    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(500)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(500)
    expect(fetchMock).toHaveBeenCalledTimes(3)

    const result = await promise
    expect(result.state).toBe('done')
    expect(onProgress).toHaveBeenCalledTimes(3)
  })

  it('stops polling on an error status', async () => {
    const fetchMock = mockFetch()
    fetchMock.mockResolvedValueOnce(jsonResponse({ state: 'error', received: 0, error: 'boom' }))

    const result = await waitForJob('job-2', undefined, 500)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ state: 'error', received: 0, error: 'boom' })
  })
})

describe('refreshEpg', () => {
  it('posts listId, urls, sources and force', async () => {
    const fetchMock = mockFetch()
    fetchMock.mockResolvedValueOnce(jsonResponse({ job: 'epg-job' }))
    const job = await refreshEpg('list1', ['https://x/epg.xml'], ['src1'], true)
    expect(job).toBe('epg-job')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/live-tv/epg/refresh')
    expect(JSON.parse(String(init?.body))).toEqual({
      listId: 'list1',
      urls: ['https://x/epg.xml'],
      sources: ['src1'],
      force: true,
    })
  })
})

describe('epgNow', () => {
  it('fills in missing now/next/later as null and defaults fetchedAt', async () => {
    const fetchMock = mockFetch()
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        at: 1000,
        fetchedAt: null,
        items: { k1: { now: { title: 'A', start: 0, stop: 10 } } },
      }),
    )

    const result = await epgNow({ listId: 'list1', source: 'src1', at: 1000 })

    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/live-tv/epg/now?source=src1&listId=list1&at=1000')
    expect(result.fetchedAt).toBeNull()
    expect(result.items.k1).toEqual({ now: { title: 'A', start: 0, stop: 10 }, next: null, later: null })
  })
})

describe('epgSchedule', () => {
  it('chunks 200 keys per call and merges the results', async () => {
    const fetchMock = mockFetch()
    const keys = Array.from({ length: 250 }, (_, i) => `k${i}`)
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ items: { k0: [{ title: 'A', start: 0, stop: 10 }] } }))
      .mockResolvedValueOnce(jsonResponse({ items: { k200: [{ title: 'B', start: 20, stop: 30 }] } }))

    const result = await epgSchedule('list1', keys, 0, 100)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [firstUrl, firstInit] = fetchMock.mock.calls[0]
    expect(String(firstUrl)).toBe('/api/live-tv/epg/schedule')
    expect(firstInit?.method).toBe('POST')
    expect(JSON.parse(String(firstInit?.body)).keys).toHaveLength(200)
    expect(result.k0).toEqual([{ title: 'A', start: 0, stop: 10 }])
    expect(result.k200).toEqual([{ title: 'B', start: 20, stop: 30 }])
  })

  it('skickar nycklarna i kroppen, så komman i kanalnamn överlever', async () => {
    // `channelKey` är `namn::url`; ett namn som "Sport, Live" hade delats mitt
    // itu av en kommaseparerad querysträng och tappat kanalens tablå.
    const fetchMock = mockFetch()
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: {} }))
    const key = 'Sport, Live::https://example.test/a,b'

    await epgSchedule('list1', [key], 0, 100)

    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(String(init?.body))).toEqual({ listId: 'list1', keys: [key], from: 0, to: 100 })
  })
})

describe('epgSearch', () => {
  it('passes q/from/to/limit and returns hits', async () => {
    const fetchMock = mockFetch()
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ items: [{ key: 'k1', programme: { title: 'A', start: 0, stop: 10 } }] }),
    )

    const hits = await epgSearch('list1', 'bbc', 0, 100, 5)

    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/live-tv/epg/search?listId=list1&q=bbc&from=0&to=100&limit=5')
    expect(hits).toEqual([{ key: 'k1', programme: { title: 'A', start: 0, stop: 10 } }])
  })
})

describe('indexStatus', () => {
  it('reads known sources from /api/live-tv/status', async () => {
    const fetchMock = mockFetch()
    fetchMock.mockResolvedValueOnce(jsonResponse({ sources: ['src1', 'src2'] }))
    const result = await indexStatus()
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/live-tv/status')
    expect(result).toEqual({ sources: ['src1', 'src2'] })
  })

  it('defaults to an empty source list', async () => {
    const fetchMock = mockFetch()
    fetchMock.mockResolvedValueOnce(jsonResponse({}))
    const result = await indexStatus()
    expect(result).toEqual({ sources: [] })
  })
})

describe('batchChannels', () => {
  function batchChannel(key: string): BatchChannel {
    return { key, number: 1, name: key, group: 'Group', url: `https://example.test/${key}`, tvgId: null }
  }

  it('sends a single request with replace=true for a list under the chunk size', async () => {
    const fetchMock = mockFetch()
    fetchMock.mockResolvedValueOnce(jsonResponse({}))
    await batchChannels('src1', [batchChannel('a')], true)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/live-tv/batch')
    expect(JSON.parse(String(init?.body))).toEqual({ source: 'src1', replace: true, channels: [batchChannel('a')] })
  })

  it('chunks into batches of 1000 and only replaces on the first chunk', async () => {
    const fetchMock = mockFetch()
    fetchMock.mockResolvedValueOnce(jsonResponse({})).mockResolvedValueOnce(jsonResponse({}))
    const channels = Array.from({ length: 1500 }, (_, i) => batchChannel(`c${i}`))

    await batchChannels('src1', channels, true)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const firstBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body))
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body))
    expect(firstBody.replace).toBe(true)
    expect(firstBody.channels).toHaveLength(1000)
    expect(secondBody.replace).toBe(false)
    expect(secondBody.channels).toHaveLength(500)
  })

  it('still sends one (empty) request for an empty channel list, so replace clears the source', async () => {
    const fetchMock = mockFetch()
    fetchMock.mockResolvedValueOnce(jsonResponse({}))
    await batchChannels('src1', [], true)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body))
    expect(body).toEqual({ source: 'src1', replace: true, channels: [] })
  })
})

describe('index changed event bus', () => {
  it('notifies subscribers and supports unsubscribe', () => {
    const cb = vi.fn()
    const unsubscribe = onIndexChanged(cb)

    emitIndexChanged()
    expect(cb).toHaveBeenCalledTimes(1)

    unsubscribe()
    emitIndexChanged()
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('uses the documented event name', () => {
    expect(INDEX_CHANGED_EVENT).toBe('lumio-live-tv-index-changed')
  })
})
