import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { __resetForTests } from '@/lib/plugin-sdk'
import { useChannelRecording } from './use-channel-recording'
import { setTvSettings } from './tv/tv-settings-store'
import { __resetRecordingsForTests, type Recording } from './recordings'

const channel = { name: 'SVT1', logo: null, group: 'SE', url: 'http://x/1.ts', tvgId: 'svt1' }
const programme = { title: 'Rapport', start: 1_000_000, stop: 2_000_000 }
const NOW = 1_500_000

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
}

function stub(recordings: Recording[]) {
  const calls: { url: string; init?: RequestInit }[] = []
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    calls.push({ url, init })
    if (url.endsWith('/list')) return json({ recordings, folder: '/r', freeBytes: 1, keepFreeBytes: 0 })
    if (url.endsWith('/schedule')) return json({ ...(recordings[0] ?? {}), id: 'new', status: 'recording' })
    if (url.endsWith('/stop')) return json({ ...(recordings[0] ?? {}), status: 'stopped' })
    return json({})
  }))
  return calls
}

beforeEach(() => { __resetForTests(); __resetRecordingsForTests() })
afterEach(() => vi.unstubAllGlobals())

describe('useChannelRecording', () => {
  it('start schedules from now with the programme end plus margin', async () => {
    const calls = stub([])
    setTvSettings({ recordEndLateMin: 5 })
    const { result } = renderHook(() => useChannelRecording(channel, programme, NOW))
    await waitFor(() => expect(result.current.enabled).toBe(true))
    expect(result.current.active).toBeUndefined()
    await act(() => result.current.toggle())
    const post = calls.find((c) => c.url.endsWith('/schedule'))!
    const body = JSON.parse(String(post.init?.body))
    expect(body.startAt).toBe(NOW)
    expect(body.stopAt).toBe(2_000_000 + 5 * 60_000)
    expect(body.channelKey).toBe('SVT1::http://x/1.ts')
    expect(body.title).toBe('Rapport')
  })

  it('stop stops the active recording on the channel', async () => {
    const active: Recording = { id: 'a', title: 'Rapport', channelName: 'SVT1', channelKey: 'SVT1::http://x/1.ts', playUrl: 'http://x/1.ts', startAt: 1, stopAt: 2, status: 'recording', bytes: 0, createdAt: 0 }
    const calls = stub([active])
    const { result } = renderHook(() => useChannelRecording(channel, programme, NOW))
    await waitFor(() => expect(result.current.active?.id).toBe('a'))
    await act(() => result.current.toggle())
    const post = calls.find((c) => c.url.endsWith('/stop'))!
    expect(JSON.parse(String(post.init?.body))).toEqual({ id: 'a' })
  })

  it('is disabled when recording is turned off in settings', async () => {
    stub([])
    setTvSettings({ recordingEnabled: false })
    const { result } = renderHook(() => useChannelRecording(channel, programme, NOW))
    expect(result.current.enabled).toBe(false)
  })

  it('ignores presses while a toggle is still being handled', async () => {
    const calls: { url: string }[] = []
    let release!: () => void
    const gate = new Promise<void>((res) => { release = res })
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      calls.push({ url })
      if (url.endsWith('/schedule')) { await gate; return json({ id: 'new', status: 'recording', title: 't', channelName: 'c', channelKey: 'SVT1::http://x/1.ts', playUrl: 'u', startAt: 1, stopAt: 2, bytes: 0, createdAt: 0 }) }
      return json({ recordings: [], folder: null, freeBytes: 0, keepFreeBytes: 0 })
    }))
    const { result } = renderHook(() => useChannelRecording(channel, programme, NOW))
    await waitFor(() => expect(result.current.enabled).toBe(true))
    const p1 = result.current.toggle()
    const p2 = result.current.toggle()
    release()
    await act(async () => { await Promise.all([p1, p2]) })
    expect(calls.filter((c) => c.url.endsWith('/schedule'))).toHaveLength(1)
  })
})
