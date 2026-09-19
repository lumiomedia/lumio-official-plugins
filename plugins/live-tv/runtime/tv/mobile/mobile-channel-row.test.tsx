import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MobileChannelRow } from './mobile-channel-row'

afterEach(cleanup)
const channel = { name: 'EN| Development Channel International HD', logo: null, group: 'Sport', url: 'http://x/a', tvgId: null }
const nowMs = Date.UTC(2026, 8, 16, 12, 0)
const now = { now: { title: 'Grand Prix qualifying', start: nowMs - 30 * 60_000, stop: nowMs + 30 * 60_000 }, next: { title: 'News', start: nowMs + 30 * 60_000, stop: nowMs + 60 * 60_000 }, later: null }

describe('MobileChannelRow', () => {
  it('lägger hela kanalnamnet i DOM och klipper bara med CSS', () => {
    render(<MobileChannelRow channel={channel} number={12} now={now} nowMs={nowMs} locale="en-GB" noProgrammeLabel="No programme information" onPress={vi.fn()} />)
    const name = screen.getByText('EN| Development Channel International HD')
    expect(name.style.textOverflow).toBe('ellipsis')
    expect(name.style.minWidth).toBe('0px')
    const stack = name.parentElement as HTMLElement
    expect(stack.style.flex).toContain('1')
    expect(stack.style.minWidth).toBe('0px')
  })
  it('visar nr, nu-titel, minuter kvar och Next', () => {
    render(<MobileChannelRow channel={channel} number={12} now={now} nowMs={nowMs} locale="en-GB" noProgrammeLabel="No programme information" onPress={vi.fn()} />)
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('Grand Prix qualifying')).toBeInTheDocument()
    expect(screen.getByText('30 min')).toBeInTheDocument()
    expect(screen.getByText(/Next/)).toHaveTextContent('News')
  })
  it('utan tablå: platshållare + grupp · kvalitet', () => {
    render(<MobileChannelRow channel={{ ...channel, name: 'Foo 4K' }} number={null} now={{ now: null, next: null, later: null }} nowMs={nowMs} locale="en-GB" noProgrammeLabel="No programme information" onPress={vi.fn()} />)
    expect(screen.getByText('No programme information')).toBeInTheDocument()
    expect(screen.getByText('Sport · 4K')).toBeInTheDocument()
  })
  it('tryck = onPress, håll = onLongPress med elementet', () => {
    vi.useFakeTimers()
    const onPress = vi.fn(); const onLongPress = vi.fn()
    render(<MobileChannelRow channel={channel} number={1} now={now} nowMs={nowMs} locale="en-GB" noProgrammeLabel="x" onPress={onPress} onLongPress={onLongPress} />)
    const row = screen.getByTestId('mobile-channel-row')
    fireEvent.click(row)
    expect(onPress).toHaveBeenCalledTimes(1)
    fireEvent.pointerDown(row, { pointerType: 'touch', button: 0 })
    vi.advanceTimersByTime(700)
    expect(onLongPress).toHaveBeenCalledWith(row)
    vi.useRealTimers()
  })
  it('raden är minst 44 px (minHeight, inte height) och hjärtat syns när pinned', () => {
    render(<MobileChannelRow channel={channel} number={1} now={now} nowMs={nowMs} locale="en-GB" noProgrammeLabel="x" onPress={vi.fn()} pinned />)
    const row = screen.getByTestId('mobile-channel-row')
    expect(parseFloat(row.style.minHeight)).toBeGreaterThanOrEqual(44)
    expect(row.style.height).toBe('')
    expect(row.querySelector('[data-pinned]')).not.toBeNull()
  })
})
