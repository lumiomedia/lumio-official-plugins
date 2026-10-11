import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { TV_SCENE_BOX_ATTR, TV_SCENE_NARROW_ATTR, TV_SCENE_PHONE_ATTR, __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID } from '../live-tv-data'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => null }))

import { LiveTvTvShell } from './tv-shell'

let box: HTMLElement | null = null
afterEach(() => { cleanup(); box?.remove(); box = null })
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(false)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  seedLiveTvIndex()
})

function mount(view: string, phone = false) {
  const onNavigate = vi.fn()
  box = document.createElement('div')
  box.setAttribute(TV_SCENE_BOX_ATTR, '1')
  if (phone) { box.setAttribute(TV_SCENE_NARROW_ATTR, '1'); box.setAttribute(TV_SCENE_PHONE_ATTR, '1') }
  document.body.appendChild(box)
  render(<LiveTvTvShell pageId="live-tv-browse" params={{ view }} onNavigate={onNavigate} onOpenDetails={() => {}} />, { container: box })
  return onNavigate
}

describe('omklick på aktiv räls-post', () => {
  it('räls: Guide medan Guide är aktiv navigerar inte (värden skulle stänga sidan)', () => {
    const onNavigate = mount('guide')
    fireEvent.click(screen.getByTestId('rail-guide'))
    expect(onNavigate).not.toHaveBeenCalled()
  })
  it('räls: en annan post navigerar fortfarande', () => {
    const onNavigate = mount('guide')
    fireEvent.click(screen.getByTestId('rail-favs'))
    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'favs' } })
  })
  it('telefon: aktiv flik navigerar inte', () => {
    const onNavigate = mount('guide', true)
    const bar = screen.getByTestId('mobile-tab-bar')
    const tab = bar.querySelector('[aria-current], [data-current]') as HTMLElement
    fireEvent.click(tab)
    expect(onNavigate).not.toHaveBeenCalled()
  })
})
