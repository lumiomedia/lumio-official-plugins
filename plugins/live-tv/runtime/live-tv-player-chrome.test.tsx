import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests } from '@/lib/plugin-sdk'
import { LiveTvPlayer } from './live-tv-player'
import type { LiveTvPlayerTvProps } from './tv/tv-player-types'

/**
 * ETT KROM PÅ ALLA YTOR.
 *
 * Spelaren hade två krom: TV-kromet när `useTvMode()` OCH `tv` var sanna, och
 * en skrivbordsgren i `else`. Grenen är raderad, så villkoret måste vara enbart
 * `tv` — annars ritar spelaren INGET krom utanför TV-läget.
 */

const ch = (name: string) => ({ name, logo: null, group: 'Sport', url: `http://x/${name}.m3u8`, tvgId: null })
const channels = [ch('A'), ch('B'), ch('C')]
const now = Date.now()

function tv(overrides: Partial<LiveTvPlayerTvProps> = {}): LiveTvPlayerTvProps {
  return {
    channelNumber: 2,
    quality: '4K',
    favourite: false,
    bannerHideMs: 0,
    neighbours: channels,
    pinnedKeys: [],
    nowFor: () => ({ now: { title: 'GameDay', start: now - 60_000, stop: now + 60_000 }, next: null, later: null }),
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
  __setTvModeForTests(false)
})

describe('LiveTvPlayer: kromet', () => {
  it('ritar TV-kromet även utanför TV-läget när skalet gett tv-props', () => {
    render(<LiveTvPlayer channel={channels[1]} onClose={() => {}} tv={tv()} />)
    expect(screen.getByText('GameDay')).toBeInTheDocument()
    expect(screen.getByText('2 · B')).toBeInTheDocument()
  })

  it('ritar det i TV-läget också — samma krom, samma villkor', () => {
    __setTvModeForTests(true)
    render(<LiveTvPlayer channel={channels[1]} onClose={() => {}} tv={tv()} />)
    expect(screen.getByText('GameDay')).toBeInTheDocument()
  })
})
