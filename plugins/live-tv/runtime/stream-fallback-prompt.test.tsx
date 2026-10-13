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
  it('Stanna kvar avbryter', () => {
    const onStay = vi.fn()
    render(<StreamFallbackPrompt target={target} onSwitch={vi.fn()} onStay={onStay} />)
    fireEvent.click(screen.getByText(/Stanna kvar|Stay/))
    expect(onStay).toHaveBeenCalledOnce()
  })
})
