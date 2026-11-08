import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests } from '@/lib/plugin-sdk'
import { PlayerControlRow, PlayerTopBar, playerScale } from './player-chrome-parts'
import type { LiveTvPlayerControls, LiveTvPlayerTvProps } from './tv-player-types'

const channel = { name: 'SVT1', logo: null, group: 'SE', url: 'http://x/1.ts', tvgId: 'svt1' }
const now = Date.now()
function tv(): LiveTvPlayerTvProps {
  return {
    channelNumber: 1, quality: null, favourite: false, bannerHideMs: 0, neighbours: [channel], pinnedKeys: [],
    nowFor: () => ({ now: null, next: null, later: null }), nowMs: now, locale: 'en-GB', gateOpen: false, phone: false,
    fullscreenOnRotate: true, keepAwake: true, onToggleFavourite: vi.fn(), onOpenChannelDetails: vi.fn(), onOpenMultiview: vi.fn(),
    onOpenGuide: vi.fn(), onAddToMultiview: vi.fn(), onSwitchChannel: vi.fn(),
  }
}
function controls(timeshift?: LiveTvPlayerControls['timeshift']): LiveTvPlayerControls {
  return { muted: false, volume: 1, fullscreen: false, aspectLabel: 'Auto', timePos: 460, onToggleMute: vi.fn(), onVolume: vi.fn(), onToggleFullscreen: vi.fn(), onCycleAspect: vi.fn(), timeshift }
}
const ps = playerScale(false)
const row = (c: LiveTvPlayerControls) => render(
  <PlayerControlRow channel={channel} tv={tv()} info={{ now: null, next: null, later: null }} ps={ps} isTv={false} paused={false} onTogglePause={() => {}} controls={c} guideOpen={false} onToggleGuide={() => {}} dotsRef={{ current: null }} onOpenMenu={() => {}} volumeRef={{ current: null }} />,
)

beforeEach(() => { __resetForTests(); __setTvModeForTests(false) })
afterEach(cleanup)

describe('timeshift i kontrollraden', () => {
  it('control row without timeshift renders as before', () => {
    row(controls())
    expect(screen.queryByTestId('timeshift-bar')).toBeNull()
    expect(screen.queryByLabelText('Go live')).toBeNull()
  })

  it('timeshift bar shows behind label and go live, and the buttons act', () => {
    const ts = { range: { start: 100, end: 700 }, timePos: 460, onSeek: vi.fn(), onJump: vi.fn(), onGoLive: vi.fn() }
    row(controls(ts))
    const bar = screen.getByTestId('timeshift-bar')
    expect(screen.getByTestId('timeshift-label')).toHaveTextContent('−4:00')
    fireEvent.click(screen.getByLabelText('Go live'))
    expect(ts.onGoLive).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByLabelText('Back 30 s'))
    expect(ts.onJump).toHaveBeenLastCalledWith(-30)
    fireEvent.click(screen.getByLabelText('Forward 30 s'))
    expect(ts.onJump).toHaveBeenLastCalledWith(30)
    fireEvent.keyDown(bar, { key: 'ArrowLeft' })
    expect(ts.onJump).toHaveBeenLastCalledWith(-30)
  })

  it('at the live edge the label says LIVE and Go live is hidden', () => {
    const ts = { range: { start: 100, end: 700 }, timePos: 699, onSeek: vi.fn(), onJump: vi.fn(), onGoLive: vi.fn() }
    row(controls(ts))
    expect(screen.getByTestId('timeshift-label')).toHaveTextContent('LIVE')
    expect(screen.queryByLabelText('Go live')).toBeNull()
  })

  it('the top bar shows how far behind live we are', () => {
    render(<PlayerTopBar channel={channel} tv={tv()} info={{ now: null, next: null, later: null }} ps={ps} visible onClose={() => {}} onKeep={() => {}} onRelease={() => {}} behindMs={272_000} />)
    expect(screen.getByTestId('top-bar')).toHaveTextContent('−4:32')
  })
})
