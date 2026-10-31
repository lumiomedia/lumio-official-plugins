import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { TvRail } from './tv-rail'

/**
 * TV-lägets räls (Jerry 2026-10-31, provat live på Mi Boxen): samma bredd,
 * större text och ikoner, ingen L-bricka — platsen går till posterna.
 */
afterEach(cleanup)

describe('rälsen i TV-läget', () => {
  it('ingen L-bricka, 20 px etiketter, 34 px ikoner, 92 px höga poster', () => {
    render(<TvRail active="hub" onSelect={() => {}} isTv narrow={false} labels />)
    const rail = screen.getByTestId('tv-rail')
    expect(rail.querySelector('[data-live-tv-rail-badge]')).toBeNull()
    expect((rail.querySelector('[data-live-tv-rail-label]') as HTMLElement).style.fontSize).toBe('20px')
    expect(rail.querySelector('[data-testid=rail-hub] svg')!.getAttribute('width')).toBe('34')
    expect(screen.getByTestId('rail-hub').style.height).toBe('92px')
  })
  it('skrivbordet oförändrat: bricka, 15 px etiketter, 84 px poster', () => {
    render(<TvRail active="hub" onSelect={() => {}} isTv={false} narrow={false} labels />)
    const rail = screen.getByTestId('tv-rail')
    expect(rail.querySelector('[data-live-tv-rail-badge]')).not.toBeNull()
    expect((rail.querySelector('[data-live-tv-rail-label]') as HTMLElement).style.fontSize).toBe('15px')
    expect(screen.getByTestId('rail-hub').style.height).toBe('84px')
  })
})
