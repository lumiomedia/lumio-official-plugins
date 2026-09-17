import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __setTvModeForTests } from '@/lib/plugin-sdk'
import { TvPlayerChrome } from './tv-player-chrome'
import type { LiveTvPlayerControls, LiveTvPlayerTvProps } from './tv-player-types'

/**
 * P13: när det gamla skrivbordskromet raderades försvann den ENDA vägen till
 * ljud av, volym, webbläsarhelskärm och bildförhållande — funktionerna låg
 * kvar i `live-tv-player.tsx` utan någon knapp som kallade dem. Kontrollerna
 * hör hemma i TV-kromet, men BARA utanför TV-läget: på TV äger fjärren ljudet
 * och bilden, och handoffens spelarskärm (§9) har "inga knapprader".
 */

const now = Date.now()
const ch = (name: string) => ({ name, logo: null, group: 'Sport', url: `http://x/${name}`, tvgId: null })
const channels = [ch('A'), ch('B'), ch('C')]
const nowFor = () => ({ now: null, next: null, later: null })

function tv(overrides: Partial<LiveTvPlayerTvProps> = {}): LiveTvPlayerTvProps {
  return { channelNumber: 2, quality: '4K', favourite: false, bannerHideMs: 0, neighbours: channels, pinnedKeys: [], nowFor, nowMs: now, locale: 'en-GB', gateOpen: false, phone: false, fullscreenOnRotate: true, keepAwake: true, onToggleFavourite: vi.fn(), onOpenChannelDetails: vi.fn(), onOpenMultiview: vi.fn(), onOpenGuide: vi.fn(), onAddToMultiview: vi.fn(), onSwitchChannel: vi.fn(), ...overrides }
}

function controls(overrides: Partial<LiveTvPlayerControls> = {}): LiveTvPlayerControls {
  return { muted: false, volume: 0.5, fullscreen: false, aspectLabel: 'Auto', onToggleMute: vi.fn(), onVolume: vi.fn(), onToggleFullscreen: vi.fn(), onCycleAspect: vi.fn(), ...overrides }
}

afterEach(cleanup)
beforeEach(() => __setTvModeForTests(false))

describe('TvPlayerChrome: pekarkontroller', () => {
  it('utanför TV-läget finns ljud av, volym, fullskärm och bildförhållande', () => {
    const c = controls()
    render(<TvPlayerChrome channel={channels[1]} tv={tv()} controls={c} paused={false} onTogglePause={() => {}} onClose={() => {}} />)

    fireEvent.click(screen.getByLabelText('Mute'))
    expect(c.onToggleMute).toHaveBeenCalled()

    const slider = screen.getByLabelText('Volume')
    expect(slider).toHaveAttribute('role', 'slider')
    expect(slider).toHaveAttribute('aria-valuenow', '50')

    fireEvent.click(screen.getByLabelText('Fullscreen'))
    expect(c.onToggleFullscreen).toHaveBeenCalled()

    const aspect = screen.getByLabelText('Aspect ratio')
    expect(aspect).toHaveTextContent('Auto')
    fireEvent.click(aspect)
    expect(c.onCycleAspect).toHaveBeenCalled()

    // Fjärren på skrivbordet ska nå dem: varje kontroll är en station, och
    // kromet har fortfarande exakt EN data-init (⋯-knappen).
    for (const label of ['Mute', 'Volume', 'Fullscreen', 'Aspect ratio']) {
      expect(screen.getByLabelText(label)).toHaveAttribute('data-f')
    }
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
    expect(screen.getByLabelText('More')).toHaveAttribute('data-init')
  })

  it('i TV-läge visas inte pekarkontrollerna', () => {
    __setTvModeForTests(true)
    render(<TvPlayerChrome channel={channels[1]} tv={tv()} controls={controls()} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    expect(screen.queryByLabelText('Mute')).toBeNull()
    expect(screen.queryByLabelText('Volume')).toBeNull()
    expect(screen.queryByLabelText('Fullscreen')).toBeNull()
    expect(screen.queryByLabelText('Aspect ratio')).toBeNull()
  })

  it('volymreglaget svarar på pilarna', () => {
    const c = controls({ volume: 0.5 })
    render(<TvPlayerChrome channel={channels[1]} tv={tv()} controls={c} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    const slider = screen.getByLabelText('Volume')
    slider.focus()
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(c.onVolume).toHaveBeenLastCalledWith(0.6)
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    expect(c.onVolume).toHaveBeenLastCalledWith(0.4)
  })

  it('speglar avstängt ljud och aktiv fullskärm i etiketterna', () => {
    render(<TvPlayerChrome channel={channels[1]} tv={tv()} controls={controls({ muted: true, fullscreen: true })} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    expect(screen.getByLabelText('Unmute')).toBeInTheDocument()
    expect(screen.getByLabelText('Exit fullscreen')).toBeInTheDocument()
  })
})
