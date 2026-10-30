import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

vi.mock('../sport/backdrop', () => ({ useImageTone: vi.fn() }))
import { useImageTone } from '../sport/backdrop'
import { NEUTRAL_TINT, useTint } from './tint'

afterEach(() => vi.mocked(useImageTone).mockReset())

describe('useTint', () => {
  it('neutral utan bild, avstängd eller utan läsbar bild', () => {
    vi.mocked(useImageTone).mockReturnValue(null)
    expect(renderHook(() => useTint(null, true)).result.current).toBe(NEUTRAL_TINT)
    expect(renderHook(() => useTint('http://x/a.png', true)).result.current).toBe(NEUTRAL_TINT)
    expect(NEUTRAL_TINT).toBe('#2b3142')
  })
  it('avstängd frågar inte efter tonen', () => {
    vi.mocked(useImageTone).mockReturnValue([10, 20, 30])
    expect(renderHook(() => useTint('http://x/a.png', false)).result.current).toBe(NEUTRAL_TINT)
    expect(vi.mocked(useImageTone)).toHaveBeenCalledWith('http://x/a.png', false)
  })
  it('bildens ton blir hex', () => {
    vi.mocked(useImageTone).mockReturnValue([47, 74, 58])
    expect(renderHook(() => useTint('http://x/a.png', true)).result.current).toBe('#2f4a3a')
  })
})
