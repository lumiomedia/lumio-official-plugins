import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StreamFallbackPrompt } from './stream-fallback-prompt'

const target = { name: 'V Sport Fotboll HD SE', url: 'b', logo: null, group: 'g', tvgId: null }
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('StreamFallbackPrompt', () => {
  it('byter av sig själv efter nedräkningen', () => {
    vi.useFakeTimers()
    const onSwitch = vi.fn()
    render(<StreamFallbackPrompt target={target} onSwitch={onSwitch} onStay={vi.fn()} />)
    expect(screen.getByText(/V Sport Fotboll HD SE/)).toBeTruthy()
    for (let i = 0; i < 4; i++) act(() => { vi.advanceTimersByTime(1_000) })
    expect(onSwitch).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1_000) })
    expect(onSwitch).toHaveBeenCalledOnce()
  })
  it('valda sekunder styr nedräkningen (3 s)', () => {
    vi.useFakeTimers()
    const onSwitch = vi.fn()
    render(<StreamFallbackPrompt target={target} seconds={3} onSwitch={onSwitch} onStay={vi.fn()} />)
    expect(screen.getByText(/in 3 s|om 3 s/)).toBeTruthy()
    for (let i = 0; i < 2; i++) act(() => { vi.advanceTimersByTime(1_000) })
    expect(onSwitch).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1_000) })
    expect(onSwitch).toHaveBeenCalledOnce()
  })
  it('Aldrig (0): ingen nedräkning, frågan visas och bara Byt nu byter', () => {
    vi.useFakeTimers()
    const onSwitch = vi.fn()
    render(<StreamFallbackPrompt target={target} seconds={0} onSwitch={onSwitch} onStay={vi.fn()} />)
    expect(screen.getByText(/^(Switch to|Byt till) V Sport Fotboll HD SE\?$/)).toBeTruthy()
    expect(screen.queryByText(/ s$/)).toBeNull()
    act(() => { vi.advanceTimersByTime(60_000) })
    expect(onSwitch).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText(/Byt nu|Switch now/))
    expect(onSwitch).toHaveBeenCalledOnce()
  })
  it('Stanna kvar avbryter', () => {
    const onStay = vi.fn()
    render(<StreamFallbackPrompt target={target} onSwitch={vi.fn()} onStay={onStay} />)
    fireEvent.click(screen.getByText(/Stanna kvar|Stay/))
    expect(onStay).toHaveBeenCalledOnce()
  })
})
