import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, pipRegistrations } from '@/lib/plugin-sdk'
import { LiveTvPlayer } from './live-tv-player'
import type { LiveTvPlayerTvProps } from './tv/tv-player-types'

/**
 * Bild-i-bild på telefon: Live TV registrerar kanalbyte som PiP-fönstrets
 * föregående/nästa, och X i fönstret stänger spelaren som Tillbaka.
 * Utanför telefonen registreras inget — TV och skrivbord har ingen PiP.
 */

const ch = (name: string) => ({ name, logo: null, group: 'Sport', url: `http://x/${name}.m3u8`, tvgId: null })
const channels = [ch('A'), ch('B'), ch('C')]
const now = Date.now()

function tv(overrides: Partial<LiveTvPlayerTvProps> = {}): LiveTvPlayerTvProps {
  return {
    channelNumber: 2,
    quality: null,
    favourite: false,
    bannerHideMs: 0,
    neighbours: channels,
    pinnedKeys: [],
    nowFor: () => ({ now: null, next: null, later: null }),
    nowMs: now,
    locale: 'sv-SE',
    gateOpen: false,
    phone: true,
    fullscreenOnRotate: false,
    keepAwake: false,
    onToggleFavourite: vi.fn(),
    onOpenChannelDetails: vi.fn(),
    onOpenMultiview: vi.fn(),
    onOpenGuide: vi.fn(),
    onAddToMultiview: vi.fn(),
    onSwitchChannel: vi.fn(),
    ...overrides,
  }
}

afterEach(() => { cleanup(); pipRegistrations.length = 0 })
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(false)
})

describe('LiveTvPlayer: bild-i-bild', () => {
  it('registrerar kanalknappar på telefon', () => {
    const onSwitchChannel = vi.fn()
    render(<LiveTvPlayer channel={channels[1]} onClose={() => {}} tv={tv({ onSwitchChannel })} />)
    expect(pipRegistrations).toHaveLength(1)
    expect(pipRegistrations[0].prevNextKind).toBe('channel')
    pipRegistrations[0].onNext()
    expect(onSwitchChannel).toHaveBeenLastCalledWith(channels[2])
    pipRegistrations[0].onPrev()
    expect(onSwitchChannel).toHaveBeenLastCalledWith(channels[0])
  })

  it('nästa från sista kanalen går runt till första', () => {
    const onSwitchChannel = vi.fn()
    render(<LiveTvPlayer channel={channels[2]} onClose={() => {}} tv={tv({ onSwitchChannel })} />)
    pipRegistrations[0].onNext()
    expect(onSwitchChannel).toHaveBeenLastCalledWith(channels[0])
  })

  it('X i PiP-fönstret stänger spelaren', async () => {
    const onClose = vi.fn()
    render(<LiveTvPlayer channel={channels[0]} onClose={onClose} tv={tv()} />)
    pipRegistrations[0].onClosed()
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('registrerar inte utanför telefon', () => {
    render(<LiveTvPlayer channel={channels[0]} onClose={() => {}} tv={tv({ phone: false })} />)
    expect(pipRegistrations).toHaveLength(0)
  })

  it('registrerar inte i TV-läget', () => {
    __setTvModeForTests(true)
    render(<LiveTvPlayer channel={channels[0]} onClose={() => {}} tv={tv()} />)
    expect(pipRegistrations).toHaveLength(0)
  })
})
