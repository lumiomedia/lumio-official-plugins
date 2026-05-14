import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EpgFetchError, fetchEpg } from './fetcher'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-13T12:30:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('fetchEpg', () => {
  it('throws when called with empty URLs', async () => {
    await expect(fetchEpg([])).rejects.toThrow(/no.*urls/i)
  })

  it('POSTs urls to /api/xmltv and returns parsed entry', async () => {
    const responseBody = {
      index: { A: [{ title: 'P', description: null, start: 1, stop: 2 }] },
      sources: ['https://x/epg.xml'],
      fetchedAt: 1000,
    }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchEpg(['https://x/epg.xml'])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const call = fetchMock.mock.calls[0]
    expect(call[0]).toBe('/api/xmltv')
    const init = call[1]
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ urls: ['https://x/epg.xml'] })
    expect(result).toEqual({ ...responseBody, requestedSources: ['https://x/epg.xml'] })
  })

  it('throws on non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('boom', { status: 502 })))
    await expect(fetchEpg(['https://x/y'])).rejects.toThrow(/502/)
  })

  it('includes source failures from non-OK xmltv responses', async () => {
    const failures = [{ url: 'https://x/y', error: 'HTTP 404' }]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ failures }), { status: 502 })))

    await expect(fetchEpg(['https://x/y'])).rejects.toMatchObject({
      name: 'EpgFetchError',
      status: 502,
      failures,
    } satisfies Partial<EpgFetchError>)
  })

  it('throws when response body lacks index field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ sources: [] }), { status: 200 })))
    await expect(fetchEpg(['https://x/y'])).rejects.toThrow(/invalid response/i)
  })
})
