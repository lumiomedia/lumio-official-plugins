import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'

// En äldre värd utan tangentbordspanel i SDK:n: raderna som behöver den får
// inte vara stationer som tyst gör ingenting (granskningsfynd 2026-09-24).
vi.mock('@/lib/plugin-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/plugin-sdk')>()
  return {
    ...actual,
    getTvKeyboardPanel: () => null,
    getHomeOverridePluginId: () => null,
    onHomeOverridePluginChanged: () => () => {},
    onProfileChanged: () => () => {},
    tryEnableHomeOverridePlugin: () => ({ ok: true }),
    disableHomeOverridePlugin: () => {},
  }
})

import { LIVE_TV_PLUGIN_ID, type LiveTvList } from './live-tv-data'
import { LiveTvSettingsSection } from './live-tv-settings-section'

const list: LiveTvList = { id: 'l1', name: 'panel.test', createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null, kind: 'm3u', source: 'http://panel.test/list.m3u', url: 'http://panel.test/list.m3u', channelCount: 3, groups: [{ name: 'Sport', count: 2 }, { name: 'News', count: 1 }] }

beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  vi.stubGlobal('fetch', (() => Promise.resolve({ ok: true, status: 200, json: async () => ({ groups: list.groups }) } as unknown as Response)) as typeof fetch)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); __setTvModeForTests(false) })

describe('TV-sidan utan tangentbordspanel i värden', () => {
  it('textraderna är avstängda med en förklaring i stället för att tyst göra ingenting', () => {
    render(<LiveTvSettingsSection />)
    const server = screen.getByRole('button', { name: /^Server URL/ })
    expect(server).toHaveAttribute('aria-disabled', 'true')
    expect(server).toHaveTextContent('Text entry needs a newer Lumio')
    expect(screen.getByRole('button', { name: /^M3U URLs/ })).toHaveAttribute('aria-disabled', 'true')
  })
  it('Add XMLTV URL är avstängd, och Merge N categories toastar i stället för att lämna en tom vy', async () => {
    render(<LiveTvSettingsSection />)
    fireEvent.click(screen.getByRole('button', { name: /^panel\.test/ }))
    const p = screen.getByTestId('tv-playlist-panel')
    expect(within(p).getByRole('button', { name: /^Add XMLTV URL/ })).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(within(p).getByRole('button', { name: /^Categories/ }))
    const c = screen.getByTestId('tv-categories-panel')
    await within(c).findByRole('switch', { name: /^Sport/ })
    fireEvent.click(within(c).getByRole('button', { name: 'Merge categories' }))
    fireEvent.click(within(c).getByRole('button', { name: /^Sport/ }))
    fireEvent.click(within(c).getByRole('button', { name: /^News/ }))
    fireEvent.click(within(c).getByRole('button', { name: 'Merge 2 categories' }))
    expect(screen.getByRole('status')).toHaveTextContent('Text entry needs a newer Lumio')
    expect(screen.getByTestId('tv-categories-panel')).toBeInTheDocument()
    expect(screen.queryByTestId('tv-keyboard-panel')).toBeNull()
  })
})
