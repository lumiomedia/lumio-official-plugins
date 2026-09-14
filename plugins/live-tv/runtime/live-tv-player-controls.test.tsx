import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests } from '@/lib/plugin-sdk'
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
    nowFor: () => ({ now: null, next: null, later: null }),
    nowMs: now,
    locale: 'en-GB',
    gateOpen: false,
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
