import { afterEach, describe, expect, it, vi } from 'vitest'
import { __resetRecordingsForTests, __seedRecordingsForTests, deleteRecording, formatBytes, getCachedRecordings, listRecordings, recordingFor, recordingStreamUrl, refreshRecordings, scheduleRecording, stopRecording, type Recording, type RecordingList } from './recordings'

function rec(partial: Partial<Recording>): Recording {
  return {
    id: 'r1', title: 'Rapport', channelName: 'SVT1', channelKey: 'SVT1::http://x/1.ts', playUrl: 'http://x/1.ts',
    startAt: 100, stopAt: 200, programmeStart: 100, programmeStop: 200, status: 'scheduled', bytes: 0, createdAt: 0,
    ...partial,
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

afterEach(() => { vi.unstubAllGlobals(); __resetRecordingsForTests() })

describe('inspelningsklienten', () => {
  it('recordingStreamUrl ends with .ts', () => {
    expect(recordingStreamUrl('abc')).toBe('/api/live-tv/record/stream/abc.ts')
  })

  it('recordingFor matches channel and programme', () => {
    const list: RecordingList = { recordings: [rec({ id: 'a' }), rec({ id: 'b', programmeStart: 500 })], folder: null, freeBytes: 0, keepFreeBytes: 0 }
    expect(recordingFor(list, 'SVT1::http://x/1.ts', 100)?.id).toBe('a')
    expect(recordingFor(list, 'SVT1::http://x/1.ts', 500)?.id).toBe('b')
    expect(recordingFor(list, 'TV4::x', 100)).toBeUndefined()
    expect(recordingFor(null, 'SVT1::http://x/1.ts', 100)).toBeUndefined()
  })

  it('recordingFor without programme finds the ongoing recording on the channel', () => {
    const list: RecordingList = { recordings: [rec({ id: 'a' }), rec({ id: 'b', status: 'recording', programmeStart: 500 })], folder: null, freeBytes: 0, keepFreeBytes: 0 }
    expect(recordingFor(list, 'SVT1::http://x/1.ts', null)?.id).toBe('b')
  })

  it('recordingFor ignores done', () => {
    const list: RecordingList = { recordings: [rec({ id: 'a', status: 'done' })], folder: null, freeBytes: 0, keepFreeBytes: 0 }
    expect(recordingFor(list, 'SVT1::http://x/1.ts', 100)).toBeUndefined()
  })

  it('listRecordings calls GET list', async () => {
    const fetchMock = vi.fn(async () => json({ recordings: [rec({})], folder: '/r', freeBytes: 5, keepFreeBytes: 2 }))
    vi.stubGlobal('fetch', fetchMock)
    const list = await listRecordings()
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/live-tv/record/list')
    expect(list.recordings).toHaveLength(1)
    expect(list.folder).toBe('/r')
  })

  it('scheduleRecording posts body', async () => {
    const fetchMock = vi.fn(async () => json(rec({ id: 'new' })))
    vi.stubGlobal('fetch', fetchMock)
    const body = { title: 'Rapport', channelName: 'SVT1', channelKey: 'k', playUrl: 'http://x/1.ts', startAt: 1, stopAt: 2 }
    const out = await scheduleRecording(body)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/live-tv/record/schedule')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual(body)
    expect(out.id).toBe('new')
  })

  it('stopRecording and deleteRecording hit their routes', async () => {
    const fetchMock = vi.fn(async () => json(rec({ id: 'a', status: 'stopped' })))
    vi.stubGlobal('fetch', fetchMock)
    await stopRecording('a')
    await deleteRecording('a')
    // Bakgrundsuppdateringen (GET list) efter varje skrivning räknas inte här.
    const calls = (fetchMock.mock.calls as unknown as [string, RequestInit][]).filter(([url]) => !url.endsWith('/list'))
    expect(calls[0][0]).toBe('/api/live-tv/record/stop')
    expect(JSON.parse(String(calls[0][1].body))).toEqual({ id: 'a' })
    expect(calls[1][0]).toBe('/api/live-tv/record?id=a')
    expect(calls[1][1].method).toBe('DELETE')
  })

  it('scheduleRecording throws on error status', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: 'stopAt is in the past' }, 400)))
    await expect(scheduleRecording({ title: 't', channelName: 'c', channelKey: 'k', playUrl: 'u', startAt: 1, stopAt: 2 })).rejects.toThrow('stopAt is in the past')
  })

  it('formatBytes', () => {
    expect(formatBytes(1_288_490_189, 'en-US')).toBe('1.2 GB')
    expect(formatBytes(356_515_840, 'en-US')).toBe('340 MB')
    expect(formatBytes(0, 'en-US')).toBe('0 MB')
  })

  it('scheduleRecording and stopRecording update the cache at once', async () => {
    __seedRecordingsForTests({ recordings: [], folder: null, freeBytes: 0, keepFreeBytes: 0 })
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/schedule')) return json(rec({ id: 'new', status: 'recording' }))
      if (url.endsWith('/stop')) return json(rec({ id: 'new', status: 'stopped' }))
      // Listan släpar efter: den vet inget om jobbet än.
      return json({ recordings: [], folder: null, freeBytes: 0, keepFreeBytes: 0 })
    }))
    await scheduleRecording({ title: 't', channelName: 'c', channelKey: 'k', playUrl: 'u', startAt: 1, stopAt: 2 })
    expect(getCachedRecordings()?.recordings.find((r) => r.id === 'new')?.status).toBe('recording')
    await stopRecording('new')
    expect(getCachedRecordings()?.recordings.find((r) => r.id === 'new')?.status).toBe('stopped')
  })

  it('refreshRecordings after a write does not hand back the request that started before it', async () => {
    let resolveFirst!: (r: Response) => void
    const first = new Promise<Response>((res) => { resolveFirst = res })
    let calls = 0
    vi.stubGlobal('fetch', vi.fn(() => { calls += 1; return calls === 1 ? first : Promise.resolve(json({ recordings: [rec({ id: 'fresh' })], folder: null, freeBytes: 0, keepFreeBytes: 0 })) }))
    const stale = refreshRecordings()
    const afterWrite = refreshRecordings({ afterWrite: true })
    resolveFirst(json({ recordings: [], folder: null, freeBytes: 0, keepFreeBytes: 0 }))
    await stale
    const list = await afterWrite
    expect(list?.recordings.map((r) => r.id)).toEqual(['fresh'])
    expect(calls).toBe(2)
  })

  it('stopRecording fetches again shortly after when the server still says recording', async () => {
    vi.useFakeTimers()
    __seedRecordingsForTests({ recordings: [rec({ id: 'a', status: 'recording' })], folder: null, freeBytes: 0, keepFreeBytes: 0 })
    let listCalls = 0
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/stop')) return json(rec({ id: 'a', status: 'recording' }))
      listCalls += 1
      return json({ recordings: [rec({ id: 'a', status: listCalls >= 2 ? 'stopped' : 'recording' })], folder: null, freeBytes: 0, keepFreeBytes: 0 })
    }))
    await stopRecording('a')
    await vi.advanceTimersByTimeAsync(10)
    const first = listCalls
    await vi.advanceTimersByTimeAsync(2_500)
    expect(listCalls).toBeGreaterThan(first)
    expect(getCachedRecordings()?.recordings[0]?.status).toBe('stopped')
    vi.useRealTimers()
  })
})
