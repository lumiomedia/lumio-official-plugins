import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { TV_SCENE_BOX_ATTR, TV_SCENE_NARROW_ATTR, __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'

// `@heroui/react` finns inte i pluginets testträd; startsideöverstyrningen
// (som index.ts registrerar) drar in rutnätet som drar in pagineringen.
vi.mock('../results-pagination', () => ({ ResultsPagination: () => null }))
// Spelaren behöver inte finnas för att skalet ska ritas.
vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => null }))

import { LiveTvBrowsePage, LiveTvPlugin } from '../index'
import { RAIL_ITEM_NARROW, RAIL_ITEM_WIDE, RAIL_W_DESKTOP, RAIL_W_NARROW, RAIL_W_TV } from './tv-shell'

const ch = (name: string, group: string) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId: null })
const list: LiveTvList = { id: 'l1', name: 'Xtream', channels: [ch('A', 'Sport'), ch('B', 'News')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(false)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  seedLiveTvIndex()
})

function mount(options?: { box?: 'wide' | 'narrow' }) {
  const onNavigate = vi.fn()
  const page = <LiveTvBrowsePage pageId="live-tv-browse" params={{}} onNavigate={onNavigate} onOpenDetails={() => {}} />
  if (!options?.box) return { onNavigate, box: null, ...render(page) }
  const box = document.createElement('div')
  box.setAttribute(TV_SCENE_BOX_ATTR, '1')
  if (options.box === 'narrow') box.setAttribute(TV_SCENE_NARROW_ATTR, '1')
  document.body.appendChild(box)
  return { onNavigate, box, ...render(page, { container: box }) }
}

const railWidth = () => (document.querySelector('[data-live-tv-tv-root] nav') as HTMLElement).style.width
const itemSize = () => (screen.getByTestId('rail-hub') as HTMLElement).style.width

describe('Live TV-skalet utanför TV-läget', () => {
  it('skalet renderas utanför TV-läge', () => {
    // Grenen i index.ts är borta: samma träd ritas på TV, skrivbord och telefon.
    mount()
    expect(document.querySelector('[data-live-tv-tv-root]')).not.toBeNull()
    expect(screen.getAllByTestId(/rail-/).length).toBeGreaterThan(0)
  })

  it('bläddringssidan ber värden om scenlådan', () => {
    // Pluginet lindar INTE sig självt (koordinatorbeslut 2026-09-14): flaggan
    // på sidbidraget är hela begäran, värden lägger lådan utanför sidan.
    const pages: Array<Record<string, unknown>> = []
    const ctx = {
      registerBootstrap: () => {},
      registerSettingsSection: () => {},
      registerHomeOverride: () => {},
      registerBrowsePage: (page: Record<string, unknown>) => { pages.push(page) },
    }
    LiveTvPlugin.register(ctx as never)
    expect(pages).toHaveLength(1)
    expect(pages[0].tvSceneBox).toBe(true)
  })

  it('saknad scenlåda ritar ändå skalet', () => {
    // Äldre värd utan låda: oskalat, men aldrig en krasch och aldrig en tom sida.
    mount()
    expect(document.querySelector('[data-live-tv-tv-root]')).not.toBeNull()
    expect(railWidth()).toBe(`${RAIL_W_DESKTOP}px`)
  })

  it('ikonraden är smalare utanför TV-läget', () => {
    mount({ box: 'wide' })
    expect(railWidth()).toBe(`${RAIL_W_DESKTOP}px`)
    expect(RAIL_W_DESKTOP).toBeLessThan(RAIL_W_TV)
    expect(itemSize()).toBe(`${RAIL_ITEM_WIDE}px`)
  })

  it('ikonraden har TV-bredden i TV-läge', () => {
    // TV-designen är godkänd: "vad ser annorlunda ut på TV?" — ingenting.
    __setTvModeForTests(true)
    mount()
    expect(railWidth()).toBe(`${RAIL_W_TV}px`)
    expect(itemSize()).toBe(`${RAIL_ITEM_WIDE}px`)
    expect(document.querySelector('[data-live-tv-rail-badge]')).not.toBeNull()
  })

  it('ikonraden komprimeras på en smal yta', async () => {
    mount({ box: 'narrow' })
    await waitFor(() => expect(railWidth()).toBe(`${RAIL_W_NARROW}px`))
    expect(itemSize()).toBe(`${RAIL_ITEM_NARROW}px`)
    // Inga etiketter: märket överst är bort, posterna bär bara sin ikon.
    expect(document.querySelector('[data-live-tv-rail-badge]')).toBeNull()
    expect(screen.getByTestId('rail-hub').textContent).toBe('')
    // Raden DÖLJS inte — en telefon utan rad har ingen navigering alls.
    expect(screen.getAllByTestId(/rail-/).length).toBeGreaterThan(0)
  })
})
