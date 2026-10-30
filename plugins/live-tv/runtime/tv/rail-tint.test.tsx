import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { __resetRailTintForTests, railTone, setRailTint } from './rail-tint'
import { TvRail } from './tv-rail'
import { V2 } from './v2-tokens'

/**
 * Rälsen tar färg av bilden bakom sporten (Jerry 2026-10-30): sportvyn
 * publicerar bakgrundsbildens ton, rälsen tonar sig efter den så länge den finns.
 */
afterEach(() => { cleanup(); __resetRailTintForTests() })

describe('rälsens ton', () => {
  it('railTone mörkar ljusa toner till luminans 64 och lämnar mörka', () => {
    expect(railTone([20, 20, 20])).toEqual([20, 20, 20])
    const [r, g, b] = railTone([200, 200, 200])
    expect(Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)).toBe(64)
  })
  it('utan ton: rälsens vanliga yta; med ton: en gradient i tonen, tillbaka när tonen släpps', () => {
    render(<TvRail active="sport" onSelect={() => {}} isTv={false} narrow={false} labels />)
    const rail = screen.getByTestId('tv-rail')
    expect(rail.getAttribute('data-bg')).toBe(V2.railSurface)
    act(() => { setRailTint([90, 70, 60]) })
    expect(rail.getAttribute('data-bg')).toContain('linear-gradient(')
    expect(rail.getAttribute('data-bg')).toContain('rgba(')
    act(() => { setRailTint(null) })
    expect(rail.getAttribute('data-bg')).toBe(V2.railSurface)
  })
})
