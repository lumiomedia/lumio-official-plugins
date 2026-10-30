import { useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { TvHoldAffordance, holdButtonSpot } from './tv-hold-affordance'

/**
 * Hörnet för "…"-knappen (Jerry 2026-10-30: "favoriter och menyn krockar"):
 * standard övre höger, men en station kan välja hörn med `data-hold-corner`.
 */
const rect = { left: 100, top: 50, right: 540, bottom: 298 }

describe('holdButtonSpot', () => {
  it('standard: övre högra hörnet, 6 px in', () => {
    expect(holdButtonSpot(rect, 'tr')).toEqual({ left: 540 - 36 - 6, top: 56 })
  })
  it('nere till höger, och de vänstra hörnen', () => {
    expect(holdButtonSpot(rect, 'br')).toEqual({ left: 498, top: 298 - 36 - 6 })
    expect(holdButtonSpot(rect, 'tl')).toEqual({ left: 106, top: 56 })
    expect(holdButtonSpot(rect, 'bl')).toEqual({ left: 106, top: 256 })
  })
})

function Harness({ corner }: { corner?: string }) {
  const ref = useRef<HTMLDivElement | null>(null)
  return (
    <div ref={ref} data-testid="root">
      <div data-hold="" data-testid="station" {...(corner ? { 'data-hold-corner': corner } : {})}>card</div>
      <TvHoldAffordance rootRef={ref} enabled />
    </div>
  )
}

const box = (r: { left: number; top: number; right: number; bottom: number }) => () => ({ ...r, x: r.left, y: r.top, width: r.right - r.left, height: r.bottom - r.top, toJSON: () => r }) as DOMRect

describe('TvHoldAffordance', () => {
  let original: typeof window.matchMedia
  beforeEach(() => {
    original = window.matchMedia
    window.matchMedia = ((query: string) => ({ matches: true, media: query, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia
  })
  afterEach(() => { cleanup(); window.matchMedia = original })

  const hover = (corner?: string) => {
    render(<Harness corner={corner} />)
    screen.getByTestId('root').getBoundingClientRect = box({ left: 0, top: 0, right: 1920, bottom: 1080 })
    screen.getByTestId('station').getBoundingClientRect = box(rect)
    fireEvent.pointerOver(screen.getByTestId('station'))
    return screen.getByTestId('hold-affordance')
  }

  it('utan attribut: övre högra hörnet', () => {
    const button = hover()
    expect(button.style.left).toBe('498px')
    expect(button.style.top).toBe('56px')
  })
  it('data-hold-corner="br": nere till höger', () => {
    const button = hover('br')
    expect(button.style.left).toBe('498px')
    expect(button.style.top).toBe('256px')
  })
})
