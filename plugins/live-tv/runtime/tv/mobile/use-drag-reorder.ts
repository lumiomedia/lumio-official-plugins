import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

/**
 * Flyttar en post i en lista utan att muppera originalet — samma semantik
 * som `movePinnedLiveTvChannel`, fast för en godtycklig `to`-position i
 * stället för ±1.
 */
export function reorder<T>(items: readonly T[], from: number, to: number): T[] {
  const next = items.slice()
  if (from === to) return next
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export interface UseDragReorderOptions {
  count: number
  rowHeight: number
  onCommit: (from: number, to: number) => void
}

export interface UseDragReorderResult {
  dragging: number | null
  /** Aktuell förskjutning (rå pixel-delta) för raden som dras. */
  offsetY: number
  handleProps: (index: number) => { onPointerDown: (e: ReactPointerEvent) => void }
}

/**
 * Ren pointer-baserad dra-omordning — ingen extern lib, ingen layoutläsning
 * (happy-dom saknar `getBoundingClientRect`). Målraden räknas ut enbart från
 * pekarens `clientY`-delta och den kända radhöjden.
 */
export function useDragReorder({ count, rowHeight, onCommit }: UseDragReorderOptions): UseDragReorderResult {
  const [dragging, setDragging] = useState<number | null>(null)
  const [offsetY, setOffsetY] = useState(0)
  const fromRef = useRef<number | null>(null)
  const toRef = useRef<number | null>(null)
  const startYRef = useRef(0)

  useEffect(() => {
    if (dragging === null) return
    const onMove = (e: PointerEvent) => {
      const dy = e.clientY - startYRef.current
      setOffsetY(dy)
      if (fromRef.current === null) return
      toRef.current = clamp(Math.round(fromRef.current + dy / rowHeight), 0, count - 1)
    }
    const finish = () => {
      const from = fromRef.current
      const to = toRef.current
      fromRef.current = null
      toRef.current = null
      setDragging(null)
      setOffsetY(0)
      if (from !== null && to !== null && to !== from) onCommit(from, to)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
    }
  }, [dragging, rowHeight, count, onCommit])

  const handleProps = useCallback(
    (index: number) => ({
      onPointerDown: (e: ReactPointerEvent) => {
        const el = e.currentTarget as { setPointerCapture?: (id: number) => void }
        if (typeof el.setPointerCapture === 'function') el.setPointerCapture(e.pointerId)
        fromRef.current = index
        toRef.current = index
        startYRef.current = e.clientY
        setOffsetY(0)
        setDragging(index)
      },
    }),
    [],
  )

  return { dragging, offsetY, handleProps }
}
