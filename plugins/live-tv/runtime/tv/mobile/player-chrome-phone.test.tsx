import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { channelKey } from '../../live-tv-data'
import type { LiveTvPlayerControls, LiveTvPlayerTvProps } from '../tv-player-types'
import { TvPlayerChromePhone } from './player-chrome-phone'

const now = Date.now()
const ch = (name: string) => ({ name, logo: null, group: 'Sport', url: `http://x/${name}`, tvgId: null })
const channels = [ch('A'), ch('B'), ch('C')]
const nowFor = (c: { name: string }) => (c.name === 'B'
  ? { now: { title: 'GameDay — a very long programme title that needs two lines', start: now - 60_000, stop: now + 60_000 }, next: { title: 'Football', start: now + 60_000, stop: now + 120_000 }, later: null }
  : { now: null, next: null, later: null })

function tv(overrides: Partial<LiveTvPlayerTvProps> = {}): LiveTvPlayerTvProps {
  return { channelNumber: 2, quality: 'HD', favourite: false, bannerHideMs: 0, neighbours: channels, pinnedKeys: [], nowFor, nowMs: now, locale: 'en-GB', gateOpen: false, phone: true, fullscreenOnRotate: true, keepAwake: true, onToggleFavourite: vi.fn(), onOpenChannelDetails: vi.fn(), onOpenMultiview: vi.fn(), onOpenGuide: vi.fn(), onAddToMultiview: vi.fn(), onSwitchChannel: vi.fn(), ...overrides }
}
function controls(overrides: Partial<LiveTvPlayerControls> = {}): LiveTvPlayerControls {
  return { muted: false, volume: 0.5, fullscreen: false, aspectLabel: 'Auto', onToggleMute: vi.fn(), onVolume: vi.fn(), onToggleFullscreen: vi.fn(), onCycleAspect: vi.fn(), ...overrides }
}
function mount(props: { tv?: LiveTvPlayerTvProps; controls?: LiveTvPlayerControls; landscape?: boolean; onClose?: () => void; onTogglePause?: () => void } = {}) {
  return render(
    <TvPlayerChromePhone
      channel={channels[1]}
      tv={props.tv ?? tv()}
      controls={props.controls ?? controls()}
      paused={false}
      onTogglePause={props.onTogglePause ?? vi.fn()}
      onClose={props.onClose ?? vi.fn()}
      landscape={props.landscape ?? false}
    />,
  )
}

afterEach(() => { cleanup(); vi.useRealTimers() })

describe('TvPlayerChromePhone · porträtt', () => {
  it('ritar överlägget, infokolumnen och zap-listan under videon', () => {
    mount()
    expect(screen.getByTestId('phone-overlay')).toBeInTheDocument()
    expect(screen.queryByTestId('phone-landscape')).toBeNull()
    expect(screen.getByTestId('phone-info')).toBeInTheDocument()
    expect(screen.getAllByTestId('mobile-channel-row')).toHaveLength(3)
    expect(screen.getByText('Channel details')).toBeInTheDocument()
    expect(screen.getByText('Audio & subs')).toBeInTheDocument()
    expect(screen.getByText('Channels')).toBeInTheDocument()
    expect(screen.getByText('2 · B')).toBeInTheDocument()
  })
  it('titeln får två rader (clamp2), inte ellips', () => {
    mount()
    const title = screen.getByTestId('phone-title')
    expect(title.style.WebkitLineClamp).toBe('2')
    expect(title).toHaveTextContent('GameDay')
  })
  it('zap-rad byter kanal och favoriter ligger först', () => {
    const t = tv({ pinnedKeys: [channelKey(channels[2])] })
    mount({ tv: t })
    const rows = screen.getAllByTestId('mobile-channel-row')
    expect(rows[0]).toHaveTextContent('C')
    fireEvent.click(rows[2])
    expect(t.onSwitchChannel).toHaveBeenCalledWith(channels[1])
  })
  it('knapprutnätet: Auto är aria-disabled, Channel info och Guide ropar skalet', () => {
    const t = tv({ quality: null })
    mount({ tv: t })
    const auto = screen.getByText('Auto')
    expect(auto.closest('[aria-disabled]')).not.toBeNull()
    fireEvent.click(screen.getByText('Channel details'))
    expect(t.onOpenChannelDetails).toHaveBeenCalled()
    fireEvent.click(screen.getByText('Guide (now / next)'))
    expect(t.onOpenGuide).toHaveBeenCalled()
  })
  it('Audio & subs öppnar ett ark med bildförhållande och ljud av; Escape stänger arket, inte spelaren', () => {
    const c = controls()
    const onClose = vi.fn()
    mount({ controls: c, onClose })
    fireEvent.click(screen.getByText('Audio & subs'))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Aspect ratio: Auto')
    expect(dialog).toHaveTextContent('Mute')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Audio & subs'))
    fireEvent.click(screen.getByText('Mute'))
    expect(c.onToggleMute).toHaveBeenCalled()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
  it('överläggets knappar: Back, ljud av, helskärm, hjärta', () => {
    const c = controls()
    const t = tv()
    const onClose = vi.fn()
    mount({ controls: c, tv: t, onClose })
    fireEvent.click(screen.getByLabelText('Back'))
    expect(onClose).toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText('Mute'))
    expect(c.onToggleMute).toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText('Fullscreen'))
    expect(c.onToggleFullscreen).toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText('Add to favourites'))
    expect(t.onToggleFavourite).toHaveBeenCalled()
  })
  it('överlägget döljs efter bannerHideMs och kommer tillbaka på tryck i videon', () => {
    vi.useFakeTimers()
    mount({ tv: tv({ bannerHideMs: 4000 }) })
    const overlay = screen.getByTestId('phone-overlay')
    expect(overlay.style.opacity).toBe('1')
    act(() => { vi.advanceTimersByTime(4100) })
    expect(overlay.style.opacity).toBe('0')
    fireEvent.pointerDown(screen.getByTestId('phone-stage-tap'))
    expect(overlay.style.opacity).toBe('1')
  })
  it('ingen mini-guide, ingen klocka', () => {
    mount()
    expect(screen.queryByTestId('mini-card')).toBeNull()
    expect(screen.queryByTestId('banner')).toBeNull()
  })
})

describe('TvPlayerChromePhone · liggande', () => {
  it('bannern: infoblock flex 1/minWidth 0, kontroller 0 0 auto, förloppet på egen rad under', () => {
    mount({ landscape: true })
    const root = screen.getByTestId('phone-landscape')
    expect(root).toBeInTheDocument()
    expect(screen.queryByTestId('phone-overlay')).toBeNull()
    expect(screen.queryByTestId('phone-info')).toBeNull()
    const info = screen.getByTestId('phone-landscape-info')
    expect(info.style.flex).toBe('1 1 0%')
    expect(info.style.minWidth).toBe('0px')
    const ctl = screen.getByTestId('phone-landscape-controls')
    expect(ctl.style.flex).toBe('0 0 auto')
    const row = info.parentElement as HTMLElement
    expect(row).toBe(ctl.parentElement)
    const progress = screen.getByTestId('phone-landscape-progress')
    expect(row.nextElementSibling).toBe(progress)
  })
  it('kontrollerna: Auto-pill visar kvalitet, Guide öppnar guiden, ··· öppnar ark utan Guide-post', () => {
    const t = tv({ quality: 'HD' })
    mount({ landscape: true, tv: t })
    expect(screen.getByText('HD')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Guide (now / next)'))
    expect(t.onOpenGuide).toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText('More'))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Multiview')
    expect(dialog).toHaveTextContent('Channel details')
    expect(dialog).toHaveTextContent('Add to favourites')
    expect(dialog).not.toHaveTextContent('Guide (now / next)')
    fireEvent.click(screen.getByText('Multiview'))
    expect(t.onOpenMultiview).toHaveBeenCalled()
  })
  it('toppraden: Back stänger, nr · namn och LIVE + kvalitet', () => {
    const onClose = vi.fn()
    mount({ landscape: true, onClose })
    expect(screen.getByText('2 · B')).toBeInTheDocument()
    expect(screen.getByText('LIVE')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Back'))
    expect(onClose).toHaveBeenCalled()
  })
})
