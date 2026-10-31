import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { __emitTvFocusEdgeForTests, __resetForTests } from '@/lib/plugin-sdk'
import { TvRail } from './tv-rail'
import { setTvSettings } from './tv-settings-store'

beforeEach(() => __resetForTests())
afterEach(cleanup)

const mount = () => render(<TvRail active="guide" isTv narrow={false} labels onSelect={() => {}} />)

describe('dold sidomeny (Jerry 2026-10-31)', () => {
  it('av som standard: rälsen ligger i flödet som förut', () => {
    mount()
    expect(screen.getByTestId('tv-rail').hasAttribute('data-tv-rail-overlay')).toBe(false)
  })

  it('på: ingen bredd i flödet, stängd och inert tills vänster vid kanten fäller fram den med fokus på aktuell post', async () => {
    setTvSettings({ railHidden: true })
    mount()
    const rail = screen.getByTestId('tv-rail')
    expect(rail.getAttribute('data-tv-rail-overlay')).toBe('closed')
    expect(rail.hasAttribute('inert')).toBe(true)
    expect((rail.parentElement as HTMLElement).style.width).toBe('0px')
    let meta: { claimed: boolean } = { claimed: false }
    act(() => { meta = __emitTvFocusEdgeForTests('left') })
    expect(meta.claimed).toBe(true)
    expect(rail.getAttribute('data-tv-rail-overlay')).toBe('open')
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('rail-guide')))
  })

  it('andra kanter rörs inte', () => {
    setTvSettings({ railHidden: true })
    mount()
    let meta: { claimed: boolean } = { claimed: false }
    act(() => { meta = __emitTvFocusEdgeForTests('up') })
    expect(meta.claimed).toBe(false)
  })
})

describe('dold sidomeny fälls in', () => {
  it('fokus utanför rälsen fäller in den igen', async () => {
    setTvSettings({ railHidden: true })
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    mount()
    act(() => { __emitTvFocusEdgeForTests('left') })
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('rail-guide')))
    act(() => { outside.focus() })
    expect(screen.getByTestId('tv-rail').getAttribute('data-tv-rail-overlay')).toBe('closed')
    outside.remove()
  })
})

describe('dold sidomeny i appens scen (Hem)', () => {
  it('◂ från en station som pekar mot appens sidomeny fäller fram rälsen', async () => {
    setTvSettings({ railHidden: true })
    const hero = document.createElement('button')
    hero.setAttribute('data-f-left', '[data-col="side"] [data-current]')
    document.body.appendChild(hero)
    mount()
    hero.focus()
    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })
    act(() => { hero.dispatchEvent(event) })
    expect(event.defaultPrevented).toBe(true)
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('rail-guide')))
    hero.remove()
  })
})
