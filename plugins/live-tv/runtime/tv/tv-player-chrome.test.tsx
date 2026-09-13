import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { TvPlayerChrome } from './tv-player-chrome'
import type { LiveTvPlayerTvProps } from './tv-player-types'

const now = Date.now()
const ch = (name: string) => ({ name, logo: null, group: 'Sport', url: `http://x/${name}`, tvgId: null })
const channels = [ch('A'), ch('B'), ch('C')]
const nowFor = (c: { name: string }) => (c.name === 'B' ? { now: { title: 'GameDay', start: now - 60_000, stop: now + 60_000 }, next: { title: 'Football', start: now + 60_000, stop: now + 120_000 }, later: null } : { now: null, next: null, later: null })

function tv(overrides: Partial<LiveTvPlayerTvProps> = {}): LiveTvPlayerTvProps {
  return { channelNumber: 2, quality: '4K', favourite: false, bannerHideMs: 4000, neighbours: channels, nowFor, nowMs: now, locale: 'en-GB', onToggleFavourite: vi.fn(), onOpenChannelDetails: vi.fn(), onOpenMultiview: vi.fn(), onOpenGuide: vi.fn(), onAddToMultiview: vi.fn(), onSwitchChannel: vi.fn(), ...overrides }
}

afterEach(cleanup)

describe('TvPlayerChrome', () => {
  it('visar banner med titel, tid och Sen, och ⋯ är data-init', () => {
    render(<TvPlayerChrome channel={channels[1]} tv={tv()} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    expect(screen.getByText('GameDay')).toBeInTheDocument()
    expect(screen.getByText(/Football/)).toBeInTheDocument()
    expect(screen.getByLabelText('More')).toHaveAttribute('data-init')
    expect(screen.getByText('2 · B')).toBeInTheDocument()
  })
  it('bannern döljs efter tiden och ▲ visar den igen', () => {
    vi.useFakeTimers()
    render(<TvPlayerChrome channel={channels[1]} tv={tv()} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    act(() => { vi.advanceTimersByTime(4100) })
    expect(screen.getByTestId('banner').style.opacity).toBe('0')
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    expect(screen.getByTestId('banner').style.opacity).toBe('1')
    vi.useRealTimers()
  })
  it('▾ öppnar mini-guiden och OK på ett kort byter kanal', () => {
    const props = tv()
    render(<TvPlayerChrome channel={channels[1]} tv={props} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    const cards = screen.getAllByTestId('mini-card')
    expect(cards).toHaveLength(3)
    fireEvent.click(cards[2])
    expect(props.onSwitchChannel).toHaveBeenCalledWith(channels[2])
  })
  it('ChannelUp/Down byter till grannkanal', () => {
    const props = tv()
    render(<TvPlayerChrome channel={channels[1]} tv={props} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    fireEvent.keyDown(window, { key: 'ChannelUp' })
    expect(props.onSwitchChannel).toHaveBeenLastCalledWith(channels[2])
    fireEvent.keyDown(window, { key: 'PageDown' })
    expect(props.onSwitchChannel).toHaveBeenLastCalledWith(channels[0])
  })
  it('⋯ öppnar glasmenyn med rätt poster', () => {
    render(<TvPlayerChrome channel={channels[1]} tv={tv()} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    fireEvent.click(screen.getByLabelText('More'))
    const menu = screen.getByTestId('tv-glass-menu')
    expect(menu).toHaveTextContent('Guide (now / next)')
    expect(menu).toHaveTextContent('Multiview')
    expect(menu).toHaveTextContent('Add to favourites')
    expect(menu).toHaveTextContent('Channel details')
    expect(menu).toHaveTextContent('Pause')
    expect(menu).not.toHaveTextContent(/Record|Spela in/)
  })
})
