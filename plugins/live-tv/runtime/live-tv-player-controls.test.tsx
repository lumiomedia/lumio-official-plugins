import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests } from '@/lib/plugin-sdk'
import { setTvSettings } from './tv/tv-settings-store'
import { __resetRecordingsForTests, type Recording } from './recordings'
import { LiveTvPlayer } from './live-tv-player'
import type { LiveTvPlayerTvProps } from './tv/tv-player-types'

/**
 * P13: `muted`/`volumeLevel` fanns som tillstånd men skrevs bara imperativt
 * ur klickhandlarna — och `muted` nådde aldrig `<video>` alls. Vid kanalbyte
 * monteras elementet om (`key={channel.url}`), så bara ett deklarativt band
 * mellan tillstånd och element överlever.
 */

const ch = (name: string) => ({ name, logo: null, group: 'Sport', url: `http://x/${name}.m3u8`, tvgId: null })
const channels = [ch('A'), ch('B')]
const now = Date.now()

function tv(overrides: Partial<LiveTvPlayerTvProps> = {}): LiveTvPlayerTvProps {
  return {
    channelNumber: 2,
    quality: '4K',
    favourite: false,
    bannerHideMs: 0,
    neighbours: channels,
    pinnedKeys: [],
    nowFor: () => ({ now: null, next: null, later: null }),
    nowMs: now,
    locale: 'en-GB',
    gateOpen: false,
    phone: false,
    fullscreenOnRotate: true,
    keepAwake: true,
    onToggleFavourite: vi.fn(),
    onOpenChannelDetails: vi.fn(),
    onOpenMultiview: vi.fn(),
    onOpenGuide: vi.fn(),
    onAddToMultiview: vi.fn(),
    onSwitchChannel: vi.fn(),
    ...overrides,
  }
}

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __resetRecordingsForTests()
  __setTvModeForTests(false)
})

describe('LiveTvPlayer: ljud och bild', () => {
  it('muted speglas på video-elementet', () => {
    render(<LiveTvPlayer channel={channels[1]} onClose={() => {}} tv={tv()} />)
    const video = document.querySelector('video') as HTMLVideoElement
    expect(video).not.toBeNull()
    expect(video.muted).toBe(false)
    fireEvent.click(screen.getByLabelText('Mute'))
    expect((document.querySelector('video') as HTMLVideoElement).muted).toBe(true)
  })

  it('volymen skrivs på elementet när reglaget flyttas', () => {
    render(<LiveTvPlayer channel={channels[1]} onClose={() => {}} tv={tv()} />)
    const slider = screen.getByLabelText('Volume')
    slider.focus()
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    expect((document.querySelector('video') as HTMLVideoElement).volume).toBeCloseTo(0.9, 5)
    expect(screen.getByLabelText('Volume')).toHaveAttribute('aria-valuenow', '90')
  })

  it('bildförhållandet växlar objectFit på elementet', () => {
    render(<LiveTvPlayer channel={channels[1]} onClose={() => {}} tv={tv()} />)
    const video = document.querySelector('video') as HTMLVideoElement
    expect(video.style.objectFit).toBe('contain')
    fireEvent.click(screen.getByLabelText('Aspect ratio'))
    expect((document.querySelector('video') as HTMLVideoElement).style.objectFit).toBe('cover')
  })
})

describe('LiveTvPlayer: inspelning', () => {
  const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
  const recOn = (channel: { name: string; url: string }): Recording => ({ id: 'a', title: 'Live', channelName: channel.name, channelKey: `${channel.name}::${channel.url}`, playUrl: channel.url, startAt: 1, stopAt: 2, status: 'recording', bytes: 0, createdAt: 0 })
  function stubFetch(recordings: Recording[]) {
    const calls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      calls.push(`${init?.method ?? 'GET'} ${url}`)
      if (url.endsWith('/list')) return json({ recordings, folder: '/r', freeBytes: 1, keepFreeBytes: 0 })
      return json({})
    }))
    return calls
  }
  afterEach(() => vi.unstubAllGlobals())

  it('record station schedules a recording of the channel', async () => {
    const calls = stubFetch([])
    render(<LiveTvPlayer channel={channels[1]} onClose={() => {}} tv={tv()} />)
    fireEvent.click(screen.getByLabelText('Record'))
    await waitFor(() => expect(calls.some((c) => c === 'POST /api/live-tv/record/schedule')).toBe(true))
  })

  it('record station hidden when recording is disabled', () => {
    stubFetch([])
    setTvSettings({ recordingEnabled: false })
    render(<LiveTvPlayer channel={channels[1]} onClose={() => {}} tv={tv()} />)
    expect(screen.queryByLabelText('Record')).toBeNull()
    expect(screen.queryByLabelText('Stop recording')).toBeNull()
  })

  it('rec badge shows while the channel is being recorded', async () => {
    stubFetch([recOn(channels[1])])
    render(<LiveTvPlayer channel={channels[1]} onClose={() => {}} tv={tv()} />)
    expect(await screen.findByLabelText('Stop recording', {}, { timeout: 3000 })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('rec-badge')).toHaveTextContent('Recording')
  })
})
