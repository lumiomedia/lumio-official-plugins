import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, renderHook } from '@testing-library/react'
import { reorder, useDragReorder } from './use-drag-reorder'

describe('reorder', () => {
  it('flyttar en post från from till to', () => {
    expect(reorder(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
  })
  it('ger samma innehåll när from === to', () => {
    const x = ['a', 'b', 'c']
    expect(reorder(x, 1, 1)).toEqual(x)
  })
})

describe('useDragReorder', () => {
  it('drar index 0 till index 2 och committar', () => {
    const onCommit = vi.fn()
    const rowHeight = 74
    const { result } = renderHook(() => useDragReorder({ count: 3, rowHeight, onCommit }))

    const startY = 100
    act(() => {
      result.current.handleProps(0).onPointerDown({
        clientY: startY,
        pointerId: 1,
        currentTarget: {},
      } as unknown as React.PointerEvent)
    })
    expect(result.current.dragging).toBe(0)

    act(() => {
      fireEvent.pointerMove(window, { clientY: startY + 2.2 * rowHeight })
    })
    act(() => {
      fireEvent.pointerUp(window)
    })

    expect(onCommit).toHaveBeenCalledWith(0, 2)
    expect(result.current.dragging).toBeNull()
  })

  it('committar inte när to === from', () => {
    const onCommit = vi.fn()
    const rowHeight = 74
    const { result } = renderHook(() => useDragReorder({ count: 3, rowHeight, onCommit }))

    act(() => {
      result.current.handleProps(1).onPointerDown({
        clientY: 0,
        pointerId: 1,
        currentTarget: {},
      } as unknown as React.PointerEvent)
    })
    act(() => {
      fireEvent.pointerMove(window, { clientY: 5 })
    })
    act(() => {
      fireEvent.pointerUp(window)
    })

    expect(onCommit).not.toHaveBeenCalled()
  })
})
