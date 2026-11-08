import { afterEach, describe, expect, it, vi } from 'vitest'
import { diffRecordings, startRecordingWatch } from './recordings-notify'
import { __resetRecordingsForTests, type Recording } from './recordings'

function rec(partial: Partial<Recording>): Recording {
  return { id: 'a', title: 'Rapport', channelName: 'SVT1', channelKey: 'k', playUrl: 'u', startAt: 1, stopAt: 2, status: 'scheduled', bytes: 0, createdAt: 0, ...partial }
}

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); __resetRecordingsForTests() })

describe('diffRecordings', () => {
  it('reports started', () => {
    const events = diffRecordings([rec({ status: 'scheduled' })], [rec({ status: 'recording' })])
    expect(events.map((e) => e.kind)).toEqual(['started'])
  })

  it('reports finished and failed', () => {
    const prev = [rec({ id: 'a', status: 'recording' }), rec({ id: 'b', status: 'recording' }), rec({ id: 'c', status: 'recording' })]
    const next = [rec({ id: 'a', status: 'done' }), rec({ id: 'b', status: 'disk_full' }), rec({ id: 'c', status: 'stopped' })]
    expect(diffRecordings(prev, next).map((e) => `${e.recording.id}:${e.kind}`)).toEqual(['a:finished', 'b:failed', 'c:finished'])
  })

  it('ignores the first snapshot, unchanged jobs and new scheduled jobs', () => {
    expect(diffRecordings(null, [rec({ status: 'recording' })])).toEqual([])
    expect(diffRecordings([rec({ status: 'recording' })], [rec({ status: 'recording' })])).toEqual([])
    expect(diffRecordings([], [rec({ id: 'n', status: 'scheduled' })])).toEqual([])
    // Ett jobb som dyker upp redan pågående (planerat på en annan enhet) räknas som startat.
    expect(diffRecordings([], [rec({ id: 'n', status: 'recording' })]).map((e) => e.kind)).toEqual(['started'])
  })
})

describe('startRecordingWatch', () => {
  it('polls the list and emits events on transitions', async () => {
    vi.useFakeTimers()
    let status: Recording['status'] = 'scheduled'
    const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
    vi.stubGlobal('fetch', vi.fn(async () => json({ recordings: [rec({ status })], folder: null, freeBytes: 0, keepFreeBytes: 0 })))
    const events: string[] = []
    const stop = startRecordingWatch((e) => events.push(e.kind))
    await vi.advanceTimersByTimeAsync(10)
    status = 'recording'
    await vi.advanceTimersByTimeAsync(30_000)
    status = 'done'
    await vi.advanceTimersByTimeAsync(30_000)
    stop()
    expect(events).toEqual(['started', 'finished'])
  })
})
