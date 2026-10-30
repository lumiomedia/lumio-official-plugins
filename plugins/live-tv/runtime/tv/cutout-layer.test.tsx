import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { __resetSurfaceCutouts, registerSurfaceCutout } from './surface-cutouts'
import { CutoutLayer } from './cutout-layer'

/**
 * v2-bakgrunderna (guiden, Kanaler) är ogenomskinliga. mpv ritar sina
 * förhandsytor UNDER webbvyn, så utan hål täckte de videon — förhandsrutan
 * visade bara reservbilden (Jerry 2026-10-30).
 */
afterEach(() => { cleanup(); __resetSurfaceCutouts() })

describe('CutoutLayer', () => {
  it('utan levande ytor: ingen klippning', () => {
    render(<CutoutLayer testId="layer" background="#161a23" />)
    expect(screen.getByTestId('layer').style.clipPath).toBe('')
    expect(screen.getByTestId('layer').style.background).toContain('#161a23')
  })
  it('med en levande yta: hål i bakgrunden', () => {
    render(<CutoutLayer testId="layer" background="#161a23" />)
    act(() => { registerSurfaceCutout(Symbol('s'), { left: 100, top: 50, width: 336, height: 189, radius: 14 }) })
    const clip = screen.getByTestId('layer').style.clipPath
    expect(clip).toContain('path(')
    expect(clip).toContain('M114 50')
  })
})
