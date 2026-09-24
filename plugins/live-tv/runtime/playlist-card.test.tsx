import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import * as liveTvData from './live-tv-data'
import { LIVE_TV_PLUGIN_ID, __resetXtreamAccountCacheForTests, getLiveTvLists, isLogoFallbackEnabled, type LiveTvList, type XtreamLogin } from './live-tv-data'
import { ToastHost } from './settings-ui'
import { PlaylistCard } from './playlist-card'

function list(overrides: Partial<LiveTvList> & { id: string; name: string }): LiveTvList {
  return { createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null, ...overrides } as LiveTvList
}
const today = new Date(); today.setHours(12, 46, 0, 0)
const m3u = list({ id: 'l1', name: 'panel.test', kind: 'm3u', source: 'http://panel.test/list.m3u', url: 'http://panel.test/list.m3u', channelCount: 2037, fetchedAt: today.toISOString(), groups: [{ name: 'Sport', count: 5 }, { name: 'News', count: 3 }], curation: { hidden: ['News'], merges: [] } })
const login: XtreamLogin = { id: 'login-1', base: 'http://tv.kkz.test:8080', username: 'u', password: 'p', format: 'ts', categoryIds: [] }
const xtream = list({ id: 'x1', name: 'tv.kkz.test:8080', kind: 'xtream', source: 'xtream://tv.kkz.test:8080/login-1', xtreamLoginId: 'login-1', channelCount: 2037, fetchedAt: today.toISOString(), urlTvg: 'http://tv.kkz.test:8080/xmltv.php?username=u', groups: [] })

function mount(entry: LiveTvList, props: Partial<Parameters<typeof PlaylistCard>[0]> = {}) {
  const spies = { onCategories: vi.fn(), onUpdate: vi.fn(), onRemove: vi.fn(), onRelogin: vi.fn() }
  render(<ToastHost><PlaylistCard list={entry} busy={false} {...spies} {...props} /></ToastHost>)
  return spies
}

beforeEach(() => {
  __resetForTests()
  __resetXtreamAccountCacheForTests()
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [m3u, xtream])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'xtream_logins', [login])
  vi.stubGlobal('fetch', ((input: RequestInfo | URL) => {
    const raw = typeof input === 'string' ? input : String(input)
    if (raw.includes('get_live_categories')) return Promise.resolve({ ok: true, status: 200, json: async () => ([{ category_id: '1', category_name: 'Sport' }, { category_id: '2', category_name: 'News' }, { category_id: '3', category_name: 'Kids' }]) } as unknown as Response)
    if (raw.includes('player_api.php')) return Promise.resolve({ ok: true, status: 200, json: async () => ({ user_info: { auth: 1, status: 'Active', exp_date: '1800000000', max_connections: '2' } }) } as unknown as Response)
    if (raw.includes('/api/live-tv/logo-fallback')) return Promise.resolve({ ok: true, status: 200, json: async () => ({ matched: 12, total: 40 }) } as unknown as Response)
    return Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as unknown as Response)
  }) as typeof fetch)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('PlaylistCard: ingen funktionalitet bort (Jerry 2026-09-24)', () => {
  it('Xtream: Server categories öppnar väljaren; Apply & fetch sparar valet på kontot och hämtar om', async () => {
    const spies = mount(xtream)
    const btn = screen.getByRole('button', { name: /^Server categories/ })
    expect(btn).toHaveTextContent('Server categories · all')
    fireEvent.click(btn)
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Server categories · tv.kkz.test:8080')).toBeInTheDocument()
    expect(within(dialog).getByText('Choose which of the panel\u2019s categories are fetched. Unticked categories never enter Live TV.')).toBeInTheDocument()
    expect(await within(dialog).findByRole('checkbox', { name: 'Sport' })).toBeInTheDocument()
    expect(within(dialog).getByRole('checkbox', { name: 'All categories' })).toHaveAttribute('aria-checked', 'true')
    // Tomt val = alla: varje kategori visas som vald, och att bocka av två ur "alla" ger "alla utom de två".
    expect(within(dialog).getByRole('checkbox', { name: 'Sport' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Sport' }))
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Kids' }))
    expect(within(dialog).getByRole('checkbox', { name: 'Sport' })).toHaveAttribute('aria-checked', 'false')
    expect(within(dialog).getByRole('checkbox', { name: 'All categories' })).toHaveAttribute('aria-checked', 'false')
    fireEvent.change(within(dialog).getByPlaceholderText('Search categories'), { target: { value: 'kid' } })
    expect(within(dialog).queryByRole('checkbox', { name: 'Sport' })).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply & fetch' }))
    expect(liveTvData.getXtreamLogins()[0].categoryIds).toEqual(['2'])
    expect(spies.onUpdate).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: /^Server categories/ })).toHaveTextContent('Server categories · 1 of 3')
  })
  it('M3U-listor har inget serverval', () => {
    mount(m3u)
    expect(screen.queryByRole('button', { name: /^Server categories/ })).toBeNull()
  })
  it('Complete logos kör kompletteringen och visar kvittot; avstängd när reserven är av', async () => {
    mount(m3u)
    fireEvent.click(screen.getByRole('button', { name: 'Complete logos' }))
    expect(await screen.findByText('12 of 40 completed')).toBeInTheDocument()
    cleanup()
    mount(list({ ...m3u, logoFallbackEnabled: false }))
    expect(screen.getByRole('button', { name: 'Complete logos' })).toBeDisabled()
  })
})

describe('PlaylistCard (handoff §3.1)', () => {
  it('värd, meta "M3U · 2,037 channels · fetched 12:46" och knapparna Categories · Refetch · Remove', () => {
    mount(m3u)
    expect(screen.getByText('panel.test')).toBeInTheDocument()
    expect(screen.getByText(/^M3U · 2,037 channels · fetched \d{2}:\d{2}$/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Categories' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refetch' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument()
  })
  it('sammanfattningsraden räknar originalkategorier, dolda och ihopslagna och öppnar kategorierna', () => {
    const spies = mount(m3u)
    const row = screen.getByRole('button', { name: /2 categories · 1 hidden · 0 merged/ })
    fireEvent.click(row)
    expect(spies.onCategories).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Categories' }))
    expect(spies.onCategories).toHaveBeenCalledTimes(2)
  })
  it('Xtream: "Update channels", och kontostatus från panelen på statusraden', async () => {
    mount(xtream)
    expect(screen.getByRole('button', { name: 'Update channels' })).toBeInTheDocument()
    expect(screen.getByText(/^Xtream · 2,037 channels/)).toBeInTheDocument()
    expect(await screen.findByText(/^Active · expires .* · 2 connections$/)).toBeInTheDocument()
  })
  it('utan utgångsdatum visas "no expiry date"; ett kontofel visas som text', async () => {
    vi.stubGlobal('fetch', ((input: RequestInfo | URL) => {
      const raw = typeof input === 'string' ? input : String(input)
      if (raw.includes('player_api.php')) return Promise.resolve({ ok: true, status: 200, json: async () => ({ user_info: { auth: 1, status: 'Active', exp_date: null, max_connections: null } }) } as unknown as Response)
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as unknown as Response)
    }) as typeof fetch)
    mount(xtream)
    expect(await screen.findByText('Active · no expiry date')).toBeInTheDocument()
    cleanup()
    __resetXtreamAccountCacheForTests()
    vi.stubGlobal('fetch', (async (input: RequestInfo | URL) => {
      const url = new URL(typeof input === 'string' ? input : String(input), 'http://localhost')
      if (url.pathname === '/player_api.php' || url.pathname === '/api/m3u') return { ok: false, status: 500 } as unknown as Response
      return { ok: true, status: 200, json: async () => ({}) } as unknown as Response
    }) as typeof fetch)
    mount(xtream)
    expect(await screen.findByText('Could not read the account')).toBeInTheDocument()
  })
  it('upptagen: meta och knapp säger Fetching…', () => {
    mount(m3u, { busy: true })
    expect(screen.getByText('Fetching…', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fetching…' })).toBeDisabled()
  })
  it('EPG: AUTO-brickan på den härledda källan, Remove stänger av den', () => {
    mount(xtream)
    expect(screen.getByText('AUTO')).toBeInTheDocument()
    expect(screen.getByText('http://tv.kkz.test:8080/xmltv.php?username=u')).toBeInTheDocument()
    const epg = screen.getByTestId('epg-sources-x1')
    fireEvent.click(within(epg).getByRole('button', { name: 'Remove' }))
    expect(getLiveTvLists().find((l) => l.id === 'x1')?.autoEpgDisabled).toBe(true)
  })
  it('Add med tomt fält toastar "Paste an XMLTV URL first" och lägger inte till något', () => {
    mount(m3u)
    expect(screen.getByText('No EPG source for this playlist yet.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByRole('status')).toHaveTextContent('Paste an XMLTV URL first')
    expect(getLiveTvLists().find((l) => l.id === 'l1')?.epgUrls).toEqual([])
  })
  it('Add med en adress sparar den och toastar', () => {
    mount(m3u)
    fireEvent.change(screen.getByPlaceholderText(/XMLTV URL/), { target: { value: 'https://a.example/epg.xml' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(getLiveTvLists().find((l) => l.id === 'l1')?.epgUrls).toEqual(['https://a.example/epg.xml'])
    expect(screen.getByRole('status')).toHaveTextContent('EPG source added')
  })
  it('Remove öppnar bekräftelsen med exakt text; bekräftat kör onRemove', () => {
    const spies = mount(m3u)
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Remove panel.test?')).toBeInTheDocument()
    expect(within(dialog).getByText('Channels, categories and EPG sources from this playlist are removed from Live TV.')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(spies.onRemove).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }))
    expect(spies.onRemove).toHaveBeenCalledTimes(1)
  })
  it('logotypvalet sparas på listan', () => {
    mount(m3u)
    const box = screen.getByRole('checkbox', { name: /Fill in missing logos from iptv-org/ })
    expect(box).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(box)
    expect(isLogoFallbackEnabled(getLiveTvLists().find((l) => l.id === 'l1')!)).toBe(false)
  })
  it('en Xtream-lista utan inloggning visar "Sign in again" i stället för Update channels', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'xtream_logins', [])
    const spies = mount(xtream)
    expect(screen.getByText('Sign in again to fetch channels')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in again' }))
    expect(spies.onRelogin).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Update channels' })).toBeNull()
  })
  it('behöver hämtas om + senaste felet visas som status', () => {
    mount(list({ ...m3u, needsReimport: true, lastImportError: 'HTTP 500' }))
    expect(screen.getByText('Needs refetching')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('HTTP 500')
  })
})
