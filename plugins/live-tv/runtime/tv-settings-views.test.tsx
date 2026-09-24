import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'

vi.mock('@/lib/plugin-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/plugin-sdk')>()
  return {
    ...actual,
    getHomeOverridePluginId: () => null,
    onHomeOverridePluginChanged: () => () => {},
    onProfileChanged: () => () => {},
    tryEnableHomeOverridePlugin: () => ({ ok: true }),
    disableHomeOverridePlugin: () => {},
  }
})

import * as liveTvData from './live-tv-data'
import { LIVE_TV_PLUGIN_ID, getLiveTvLists, type LiveTvList } from './live-tv-data'
import { resetM3uFetchProgressForTests } from './m3u-fetch-progress'
import { LiveTvSettingsSection } from './live-tv-settings-section'

function list(overrides: Partial<LiveTvList> & { id: string; name: string }): LiveTvList {
  return { createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null, ...overrides } as LiveTvList
}
const today = new Date(); today.setHours(12, 46, 0, 0)
const m3u = list({ id: 'l1', name: 'panel.test', kind: 'm3u', source: 'http://panel.test/list.m3u', url: 'http://panel.test/list.m3u', channelCount: 2037, fetchedAt: today.toISOString(), groups: [{ name: 'Sport', count: 5 }, { name: 'News', count: 3 }, { name: 'Kids', count: 1 }], curation: { hidden: ['Kids'], merges: [] } })

const calls: { path: string; body: Record<string, unknown> }[] = []
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  resetM3uFetchProgressForTests()
  calls.length = 0
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [m3u])
  const json = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => body } as unknown as Response)
  vi.stubGlobal('fetch', ((input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : String(input)
    const path = new URL(raw, 'http://localhost').pathname
    calls.push({ path, body: init?.body ? JSON.parse(String(init.body)) : {} })
    if (path === '/api/live-tv/groups') return json({ groups: m3u.groups })
    return json({})
  }) as typeof fetch)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); __setTvModeForTests(false) })

const row = (name: RegExp | string) => screen.getByRole('button', { name })
const panel = (testId: string) => screen.getByTestId(testId)

describe('TV-sidan (handoff §4.2)', () => {
  it('sidan är rader: två växlar, PLAYLISTS-raden med meta och sammanfattning, M3U/Xtream-raderna — allt stationer', () => {
    render(<LiveTvSettingsSection />)
    expect(screen.getByRole('switch', { name: 'Use as home page' })).toHaveAttribute('data-f')
    expect(screen.getByRole('switch', { name: 'Hide the movie hero on the Live TV page' })).toBeInTheDocument()
    expect(screen.getByText('Playlists')).toBeInTheDocument()
    const pl = row(/^panel\.test/)
    expect(pl).toHaveAttribute('data-f')
    expect(pl).toHaveTextContent(/M3U · 2,037 channels · fetched \d{2}:\d{2}/)
    expect(pl).toHaveTextContent('3 categories · 1 hidden')
    expect(pl).not.toHaveTextContent('merged')
    expect(row(/^M3U URLs/)).toHaveTextContent('Not set')
    expect(row(/^Fetch list/)).toHaveTextContent('Fetch')
    expect(row(/^Server URL/)).toBeInTheDocument()
    expect(row(/^Username/)).toBeInTheDocument()
    expect(row(/^Password/)).toBeInTheDocument()
    expect(row(/^Log in & fetch/)).toHaveTextContent('Log in')
    // Skrivbordets kort och dialoger finns inte på TV:n.
    expect(screen.queryByTestId('playlist-card-l1')).toBeNull()
  })
  it('en textrad öppnar tangentbordet och Klar skriver värdet in i raden', () => {
    render(<LiveTvSettingsSection />)
    fireEvent.click(row(/^Server URL/))
    expect(screen.getByTestId('tv-keyboard-panel')).toHaveTextContent('Server URL')
    fireEvent.change(screen.getByTestId('tv-keyboard-input'), { target: { value: 'http://panel.test:8080' } })
    fireEvent.click(screen.getByText('Done'))
    expect(row(/^Server URL/)).toHaveTextContent('http://panel.test:8080')
    fireEvent.click(row(/^Password/))
    fireEvent.change(screen.getByTestId('tv-keyboard-input'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByText('Done'))
    expect(row(/^Password/)).not.toHaveTextContent('secret')
  })
  it('OK på spellistan öppnar L:list med handoffens rader; Complete stänger', () => {
    render(<LiveTvSettingsSection />)
    fireEvent.click(row(/^panel\.test/))
    const p = panel('tv-playlist-panel')
    expect(within(p).getByText('panel.test', { selector: '[data-tv-title]' })).toBeInTheDocument()
    expect(within(p).getByText('M3U · 2,037 channels')).toBeInTheDocument()
    expect(within(p).getByText('Status')).toBeInTheDocument()
    expect(within(p).getByText('Channels')).toBeInTheDocument()
    expect(within(p).getByRole('button', { name: /^Categories/ })).toHaveTextContent('3 categories · 1 hidden · 0 merged')
    expect(within(p).getByRole('button', { name: /^Refetch/ })).toHaveTextContent('Fetches the channel list again')
    expect(within(p).getByText('EPG sources')).toBeInTheDocument()
    expect(within(p).getByText('No EPG source for this playlist yet.')).toBeInTheDocument()
    expect(within(p).getByRole('button', { name: /^Add XMLTV URL/ })).toBeInTheDocument()
    expect(within(p).getByRole('switch', { name: /Fill in missing logos/ })).toHaveAttribute('aria-checked', 'true')
    expect(within(p).getByText('Playlist')).toBeInTheDocument()
    expect(within(p).getByRole('button', { name: /^Remove playlist/ })).toBeInTheDocument()
    fireEvent.click(within(p).getByRole('button', { name: 'Complete' }))
    expect(screen.queryByTestId('tv-playlist-panel')).toBeNull()
  })
  it('Bakåt stänger bara den översta vyn och lämnar fokus på raden man kom ifrån', async () => {
    vi.useFakeTimers()
    try {
      render(<LiveTvSettingsSection />)
      const pl = row(/^panel\.test/)
      pl.focus()
      fireEvent.click(pl)
      const cats = within(panel('tv-playlist-panel')).getByRole('button', { name: /^Categories/ })
      cats.focus()
      fireEvent.click(cats)
      expect(panel('tv-categories-panel')).toBeInTheDocument()
      fireEvent.keyDown(window, { key: 'Escape' })
      expect(screen.queryByTestId('tv-categories-panel')).toBeNull()
      expect(panel('tv-playlist-panel')).toBeInTheDocument()
      act(() => { vi.advanceTimersByTime(20) })
      expect(document.activeElement).toBe(within(panel('tv-playlist-panel')).getByRole('button', { name: /^Categories/ }))
      fireEvent.keyDown(window, { key: 'Backspace' })
      expect(screen.queryByTestId('tv-playlist-panel')).toBeNull()
      act(() => { vi.advanceTimersByTime(20) })
      expect(document.activeElement).toBe(row(/^panel\.test/))
    } finally {
      vi.useRealTimers()
    }
  })
  it('Add XMLTV URL: tomt → toast; adress → sparas med toast', () => {
    render(<LiveTvSettingsSection />)
    fireEvent.click(row(/^panel\.test/))
    fireEvent.click(within(panel('tv-playlist-panel')).getByRole('button', { name: /^Add XMLTV URL/ }))
    fireEvent.click(screen.getByText('Done'))
    expect(screen.getByRole('status')).toHaveTextContent('Paste an XMLTV URL first')
    fireEvent.click(within(panel('tv-playlist-panel')).getByRole('button', { name: /^Add XMLTV URL/ }))
    fireEvent.change(screen.getByTestId('tv-keyboard-input'), { target: { value: 'https://a.example/epg.xml' } })
    fireEvent.click(screen.getByText('Done'))
    expect(getLiveTvLists()[0].epgUrls).toEqual(['https://a.example/epg.xml'])
    expect(within(panel('tv-playlist-panel')).getByRole('button', { name: /^https:\/\/a\.example\/epg\.xml/ })).toHaveTextContent('Added by hand')
  })
  it('Remove playlist → bekräftelsevy → Remove tar bort listan och stänger allt', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'm3u_urls', ['http://panel.test/list.m3u'])
    render(<LiveTvSettingsSection />)
    fireEvent.click(row(/^panel\.test/))
    fireEvent.click(within(panel('tv-playlist-panel')).getByRole('button', { name: /^Remove playlist/ }))
    const c = panel('tv-confirm-panel')
    expect(within(c).getByText('Remove panel.test?')).toBeInTheDocument()
    expect(within(c).getByText('Channels, categories and EPG sources from this playlist are removed from Live TV.')).toBeInTheDocument()
    fireEvent.click(within(c).getByRole('button', { name: 'Remove' }))
    expect(getLiveTvLists()).toHaveLength(0)
    expect(screen.queryByTestId('tv-playlist-panel')).toBeNull()
    await waitFor(() => expect(calls.some((x) => x.path === '/api/live-tv/reset')).toBe(true))
  })
  it('L:cats: växla, markera, namnge via tangentbordet, MERGED-rader, Split med bevarat dolt läge, Save', async () => {
    render(<LiveTvSettingsSection />)
    fireEvent.click(row(/^panel\.test/))
    fireEvent.click(within(panel('tv-playlist-panel')).getByRole('button', { name: /^Categories/ }))
    const c = panel('tv-categories-panel')
    await within(c).findByRole('switch', { name: /^Sport/ })
    expect(within(c).getByText('Categories · panel.test')).toBeInTheDocument()
    expect(within(c).getByText('3 categories · 1 hidden · 0 merged')).toBeInTheDocument()
    expect(within(c).getByRole('switch', { name: /^Kids/ })).toHaveAttribute('aria-checked', 'false')
    expect(within(c).getByText('To merge categories: press Merge categories, mark two or more rows, then give the merged category a name. It shows as one row in Live TV.')).toBeInTheDocument()
    fireEvent.click(within(c).getByRole('button', { name: 'Merge categories' }))
    expect(within(c).getByText('Mark the categories to merge')).toBeInTheDocument()
    fireEvent.click(within(c).getByRole('button', { name: 'Mark two or more' }))
    expect(screen.getByRole('status')).toHaveTextContent('Mark at least two categories')
    fireEvent.click(within(c).getByRole('button', { name: /^Sport/ }))
    fireEvent.click(within(c).getByRole('button', { name: /^Kids/ }))
    expect(within(c).getByRole('button', { name: /^Sport/ })).toHaveTextContent('Marked')
    fireEvent.click(within(c).getByRole('button', { name: 'Merge 2 categories' }))
    const kbd = screen.getByTestId('tv-keyboard-panel')
    expect(kbd).toHaveTextContent('Name the merged category')
    expect(screen.getByTestId('tv-keyboard-hint')).toHaveTextContent('Sport · Kids')
    expect(within(kbd).getByRole('button', { name: 'Use “Sport”' })).toBeInTheDocument()
    fireEvent.change(screen.getByTestId('tv-keyboard-input'), { target: { value: 'Mix' } })
    fireEvent.click(within(kbd).getByRole('button', { name: 'Merge' }))
    expect(screen.queryByTestId('tv-keyboard-panel')).toBeNull()
    expect(within(c).getByText('Merged')).toBeInTheDocument()
    expect(within(c).getByRole('button', { name: /^Mix/ })).toHaveTextContent('Sport · Kids · 6 channels')
    expect(within(c).getByRole('button', { name: /^Split Mix/ })).toHaveTextContent('The categories return as separate rows')
    expect(within(c).queryByRole('switch', { name: /^Sport/ })).toBeNull()
    fireEvent.click(within(c).getByRole('button', { name: /^Mix/ }))
    expect(screen.getByTestId('tv-keyboard-panel')).toHaveTextContent('Rename merged category')
    fireEvent.change(screen.getByTestId('tv-keyboard-input'), { target: { value: 'Nordic' } })
    fireEvent.click(within(screen.getByTestId('tv-keyboard-panel')).getByRole('button', { name: 'Save name' }))
    expect(within(c).getByRole('button', { name: /^Nordic/ })).toBeInTheDocument()
    fireEvent.click(within(c).getByRole('button', { name: /^Split Nordic/ }))
    expect(within(c).getByRole('switch', { name: /^Kids/ })).toHaveAttribute('aria-checked', 'false')
    expect(within(c).getByRole('switch', { name: /^Sport/ })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(within(c).getByRole('switch', { name: /^News/ }))
    fireEvent.click(within(c).getByRole('button', { name: 'Save' }))
    expect(screen.queryByTestId('tv-categories-panel')).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('Categories saved')
    await waitFor(() => expect(getLiveTvLists()[0].curation).toEqual({ hidden: ['Kids', 'News'], merges: [] }))
  })
  it('Fetch list på TV kör samma import som skrivbordet', async () => {
    const importSpy = vi.spyOn(liveTvData, 'importList').mockResolvedValue({ state: 'done', received: 4, total: 4, result: { total: 4, groups: [], urlTvg: null, truncated: false } })
    writePluginJson(LIVE_TV_PLUGIN_ID, 'm3u_urls_draft', ['http://other.test/list.m3u'])
    render(<LiveTvSettingsSection />)
    expect(row(/^M3U URLs/)).toHaveTextContent('http://other.test/list.m3u')
    fireEvent.click(row(/^Fetch list/))
    await waitFor(() => expect(importSpy).toHaveBeenCalledTimes(1))
  })
})
