import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, fireEvent } from '@testing-library/react'
import { TvRail, railKeyForView } from './tv-rail'

describe('TvRail', () => {
  afterEach(cleanup)
  it('ritar dagens poster i dagens ordning, aktiv post markerad', () => {
    const { getByTestId } = render(<TvRail active="guide" onSelect={() => {}} isTv={false} narrow={false} labels />)
    const keys = Array.from(getByTestId('tv-rail').querySelectorAll('[data-testid^="rail-"]')).map((n) => n.getAttribute('data-testid'))
    expect(keys).toEqual(['rail-back', 'rail-search', 'rail-home', 'rail-hub', 'rail-guide', 'rail-library', 'rail-multi', 'rail-favs', 'rail-settings'])
    expect(getByTestId('rail-guide').hasAttribute('data-current')).toBe(true)
    expect(getByTestId('rail-favs').hasAttribute('data-current')).toBe(false)
  })
  it('Kanaler är dagens hubb och heter Kanaler på svenska', () => {
    const { getByTestId } = render(<TvRail active="hub" onSelect={() => {}} isTv={false} narrow={false} labels />)
    expect(getByTestId('rail-hub').getAttribute('aria-label')).toMatch(/Channels|Kanaler/)
    expect(getByTestId('rail-home').getAttribute('aria-label')).toMatch(/Home|Hem/)
  })
  it('Kanaler och Guide har olika ikoner', () => {
    const { getByTestId } = render(<TvRail active={null} onSelect={() => {}} isTv={false} narrow={false} labels />)
    expect(getByTestId('rail-hub').querySelector('svg')!.innerHTML).not.toBe(getByTestId('rail-guide').querySelector('svg')!.innerHTML)
  })
  it('klick skickar nyckeln', () => {
    const onSelect = vi.fn()
    const { getByTestId } = render(<TvRail active={null} onSelect={onSelect} isTv={false} narrow={false} labels />)
    fireEvent.click(getByTestId('rail-favs'))
    expect(onSelect).toHaveBeenCalledWith('favs')
    fireEvent.click(getByTestId('rail-back'))
    expect(onSelect).toHaveBeenCalledWith('back')
  })
  it('railKeyForView: kanalvyn lyser upp Guide, övriga som förut', () => {
    expect(railKeyForView('channel')).toBe('guide')
    expect(railKeyForView('hub')).toBe('hub')
    expect(railKeyForView('settings')).toBe('settings')
    expect(railKeyForView('title')).toBeNull()
  })
})
