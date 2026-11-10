import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTimeshiftSession, deleteTimeshiftSession, droidTimeshiftRange, startTimeshiftHeartbeat, timeshiftSessionStatus } from './timeshift-session'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
let calls: Array<{ url: string; method: string; body: unknown }> = []
let reply: (url: string) => Response = () => json({})
beforeEach(() => {
  calls = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : null })
    return reply(String(url))
  }))
})
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe('timeshift session client', () => {
  it('creates a session and returns its urls', async () => {
    reply = () => json({ id: 'ab12', liveUrl: '/api/live-tv/timeshift/ab12/live.ts', playlistUrl: '/api/live-tv/timeshift/ab12/index.m3u8' })
    const s = await createTimeshiftSession('http://p/live/1.ts', 30)
    expect(s).toEqual({ id: 'ab12', liveUrl: '/api/live-tv/timeshift/ab12/live.ts', playlistUrl: '/api/live-tv/timeshift/ab12/index.m3u8' })
    expect(calls[0]).toEqual({ url: '/api/live-tv/timeshift/session', method: 'POST', body: { url: 'http://p/live/1.ts', minutes: 30 } })
  })
  it('returns null on 507, 503 and network errors', async () => {
    reply = () => json({ error: 'disk' }, 507)
    expect(await createTimeshiftSession('http://p/live/1.ts', 30)).toBeNull()
    reply = () => json({ error: 'ffmpeg' }, 503)
    expect(await createTimeshiftSession('http://p/live/1.ts', 30)).toBeNull()
    reply = () => { throw new Error('offline') }
    expect(await createTimeshiftSession('http://p/live/1.ts', 30)).toBeNull()
  })
  it('deletes by id and reads status', async () => {
    reply = (url) => (url.endsWith('/status') ? json({ ready: true, bytes: 10, segments: 1, seconds: 2 }) : new Response(null, { status: 204 }))
    await deleteTimeshiftSession('ab12')
    expect(calls[0]).toMatchObject({ url: '/api/live-tv/timeshift/session?id=ab12', method: 'DELETE' })
    expect(await timeshiftSessionStatus('ab12')).toEqual({ ready: true, bytes: 10, segments: 1, seconds: 2 })
    reply = () => json({}, 404)
    expect(await timeshiftSessionStatus('ab12')).toBeNull()
  })
  it('the heartbeat polls every 2 s until the buffer has length, then every 15 s, and stops', async () => {
    vi.useFakeTimers()
    let seconds = 0
    reply = () => json({ ready: seconds > 0, bytes: 0, segments: 0, seconds })
    const seen: number[] = []
    const stop = startTimeshiftHeartbeat('ab12', (s) => { if (s) seen.push(s.seconds) })
    expect(calls).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(2_000)
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('/api/live-tv/timeshift/ab12/status')
    await vi.advanceTimersByTimeAsync(2_000)
    expect(calls).toHaveLength(2)
    seconds = 6
    await vi.advanceTimersByTimeAsync(2_000)
    expect(calls).toHaveLength(3)
    // Bufferten har längd: nu kvartsminuten.
    await vi.advanceTimersByTimeAsync(14_000)
    expect(calls).toHaveLength(3)
    await vi.advanceTimersByTimeAsync(1_000)
    expect(calls).toHaveLength(4)
    stop()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(calls).toHaveLength(4)
    expect(seen).toEqual([0, 0, 6, 6])
  })
  it('the heartbeat stops polling when the app says the session is gone', async () => {
    vi.useFakeTimers()
    reply = () => json({}, 404)
    const seen: Array<number | null> = []
    const stop = startTimeshiftHeartbeat('ab12', (s) => seen.push(s ? s.seconds : null))
    await vi.advanceTimersByTimeAsync(2_000)
    expect(seen).toEqual([null])
    await vi.advanceTimersByTimeAsync(30_000)
    expect(calls).toHaveLength(1)
    stop()
  })
})

describe('droidTimeshiftRange', () => {
  it('on the playlist the live window is the range', () => {
    expect(droidTimeshiftRange({ onPlaylist: true, isLive: true, duration: 600, bufferSeconds: 0 })).toEqual({ start: 0, end: 600 })
    expect(droidTimeshiftRange({ onPlaylist: true, isLive: false, duration: 600, bufferSeconds: 0 })).toBeNull()
    expect(droidTimeshiftRange({ onPlaylist: true, isLive: true, duration: 0, bufferSeconds: 0 })).toBeNull()
  })
  it('on the relay the buffer length is the range (at the live edge)', () => {
    expect(droidTimeshiftRange({ onPlaylist: false, isLive: false, duration: 0, bufferSeconds: 42 })).toEqual({ start: 0, end: 42 })
    expect(droidTimeshiftRange({ onPlaylist: false, isLive: false, duration: 0, bufferSeconds: 0 })).toBeNull()
  })
})
