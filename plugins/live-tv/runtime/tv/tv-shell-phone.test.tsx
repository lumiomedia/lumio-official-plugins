import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { BROWSE_BACK_EVENT, TV_SCENE_BOX_ATTR, TV_SCENE_NARROW_ATTR, TV_SCENE_PHONE_ATTR, __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'

// Spelaren behöver inte finnas för att skalet ska ritas.
vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => null }))

import { LiveTvTvShell } from './tv-shell'

const ch = (name: string, group: string) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId: null })
const list: LiveTvList = { id: 'l1', name: 'Xtream', channels: [ch('A', 'Sport'), ch('B', 'News')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }

// Lådan som `render(page, { container })` skriver in i — måste bort i
// `afterEach`. En kvarglömd, tömd låda från ett tidigare test stör inte
// `screen`-frågor (som bara ser aktuellt innehåll), men `document.querySelector`
// gjorde det i ett tidigare uppdrag — se rapporten/fällan i M-P1.
let currentBox: HTMLElement | null = null

afterEach(() => {
  cleanup()
  currentBox?.remove()
  currentBox = null
})

beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(false)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  seedLiveTvIndex()
})

/** `phone: true` märker lådan precis som värdens `applyTvSceneBox` gör på en telefon. */
function mount(options?: { phone?: boolean }) {
  const onNavigate = vi.fn()
  const page = <LiveTvTvShell pageId="live-tv-browse" params={{}} onNavigate={onNavigate} onOpenDetails={() => {}} />
  const box = document.createElement('div')
  box.setAttribute(TV_SCENE_BOX_ATTR, '1')
  if (options?.phone) {
    box.setAttribute(TV_SCENE_NARROW_ATTR, '1')
    box.setAttribute(TV_SCENE_PHONE_ATTR, '1')
  }
  document.body.appendChild(box)
  currentBox = box
  return { onNavigate, box, ...render(page, { container: box }) }
}

describe('Live TV-skalet på telefon: ikonraden som en låda', () => {
  it('visar ingen fast ikonrad på telefon', () => {
    mount({ phone: true })
    expect(screen.queryByTestId('tv-rail')).toBeNull()
    expect(screen.getByTestId('tv-rail-open')).toBeInTheDocument()
  })

  it('öppnar lådan och stänger den när en post väljs', async () => {
    mount({ phone: true })
    fireEvent.click(screen.getByTestId('tv-rail-open'))
    const drawer = await screen.findByTestId('tv-rail')
    fireEvent.click(within(drawer).getAllByRole('button')[1])
    await waitFor(() => expect(screen.queryByTestId('tv-rail')).toBeNull())
  })

  it('Bakåt stänger lådan före vyn', async () => {
    mount({ phone: true })
    const leftLiveTv = vi.fn()
    window.addEventListener(BROWSE_BACK_EVENT, leftLiveTv)
    fireEvent.click(screen.getByTestId('tv-rail-open'))
    await screen.findByTestId('tv-rail')
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByTestId('tv-rail')).toBeNull())
    expect(leftLiveTv).not.toHaveBeenCalled()
    window.removeEventListener(BROWSE_BACK_EVENT, leftLiveTv)
  })

  it('tryck utanför stänger lådan', async () => {
    mount({ phone: true })
    fireEvent.click(screen.getByTestId('tv-rail-open'))
    await screen.findByTestId('tv-rail')
    fireEvent.pointerDown(document.body)
    await waitFor(() => expect(screen.queryByTestId('tv-rail')).toBeNull())
  })

  it('behåller den fasta raden på skrivbordet', () => {
    mount()
    expect(screen.getByTestId('tv-rail')).toBeInTheDocument()
    expect(screen.queryByTestId('tv-rail-open')).toBeNull()
  })
})
