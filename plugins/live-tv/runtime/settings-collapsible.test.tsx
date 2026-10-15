import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
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

import { LIVE_TV_PLUGIN_ID, __resetXtreamAccountCacheForTests, type LiveTvList, type XtreamLogin } from './live-tv-data'
import { LiveTvSettingsSection } from './live-tv-settings-section'
import { PlaylistCard } from './playlist-card'
import { ToastHost } from './settings-ui'

/**
 * Hopfällbara inställningar (Jerry 2026-10-15, skärmbild från en ~360 px
 * Android-telefon): spellistekortets knapprad gick utanför rutan, och sidan
 * hade för många inställningar i för många block.
 *
 * - Varje block är en hopfällbar sektion med en rad sammanfattning.
 * - Telefon (< 640 px): dragspel, en sektion i taget. Skrivbord: flera.
 * - Öppna sektioner minns för sessionen.
 * - Spellistekortet är hopfällbart; knappraden radbryts och på telefon
 *   ligger sekundärhandlingarna i en ⋯-meny.
 */
function list(overrides: Partial<LiveTvList> & { id: string; name: string }): LiveTvList {
  return { createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null, ...overrides } as LiveTvList
}
const login: XtreamLogin = { id: 'login-1', base: 'http://tv.kkz.test:8080', username: 'u', password: 'p', format: 'ts', categoryIds: [] }
const xtream = list({ id: 'x1', name: 'tv.kkz.test:8080', kind: 'xtream', source: 'xtream://tv.kkz.test:8080/login-1', xtreamLoginId: 'login-1', channelCount: 1919, groups: [], urlTvg: 'http://tv.kkz.test:8080/xmltv.php' })
const m3u = list({ id: 'l1', name: 'panel.test', kind: 'm3u', source: 'http://panel.test/list.m3u', url: 'http://panel.test/list.m3u', channelCount: 81, groups: [] })

function setNarrow(narrow: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches: narrow && query.includes('max-width: 639px'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList)
}

beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(false)
  __resetXtreamAccountCacheForTests()
  window.sessionStorage.clear()
  writePluginJson(LIVE_TV_PLUGIN_ID, 'xtream_logins', [login])
  vi.stubGlobal('fetch', ((input: RequestInfo | URL) => {
    const raw = typeof input === 'string' ? input : String(input)
    if (raw.includes('player_api.php')) return Promise.resolve({ ok: true, status: 200, json: async () => ({ user_info: { auth: 1, status: 'Active' } }) } as unknown as Response)
    return Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as unknown as Response)
  }) as typeof fetch)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

const header = (id: string) => within(screen.getByTestId(`lt-section-${id}`)).getAllByRole('button')[0]

describe('sektionerna', () => {
  it('rubrik + sammanfattning; Spellistor öppen från början, resten stängda', () => {
    setNarrow(false)
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [xtream])
    render(<LiveTvSettingsSection />)
    expect(header('playlists')).toHaveAttribute('aria-expanded', 'true')
    expect(header('playlists')).toHaveTextContent('Playlists')
    expect(header('playlists')).toHaveTextContent('1 list · 1,919 channels')
    expect(header('guide')).toHaveAttribute('aria-expanded', 'false')
    expect(header('guide')).toHaveTextContent('1 source')
    expect(header('behaviour')).toHaveAttribute('aria-expanded', 'false')
    expect(header('behaviour')).toHaveTextContent('Start view: Home')
    expect(screen.getByTestId('playlist-card-x1')).toBeInTheDocument()
    expect(screen.queryByTestId('lt-start-view')).toBeNull()
    fireEvent.click(header('behaviour'))
    expect(screen.getByTestId('lt-start-view')).toBeInTheDocument()
  })

  it('öppen sektion: chevronen pekar uppåt och innehållet ligger i samma ruta som rubriken', () => {
    setNarrow(false)
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [xtream])
    render(<LiveTvSettingsSection />)
    const open = screen.getByTestId('lt-section-playlists')
    expect(open.querySelector('[data-lt-chevron]')).toHaveAttribute('data-lt-chevron', 'up')
    expect(screen.getByTestId('lt-section-behaviour').querySelector('[data-lt-chevron]')).toHaveAttribute('data-lt-chevron', 'down')
    // Kortet ligger INNE i sektionens ruta, inte under den.
    const body = screen.getByTestId('lt-section-playlists-body')
    expect(open.contains(body)).toBe(true)
    expect(body.contains(screen.getByTestId('playlist-card-x1'))).toBe(true)
    expect(open.style.background).not.toBe('')
    // Spellistekortet: samma chevron.
    expect(screen.getByTestId('playlist-card-toggle-x1').querySelector('[data-lt-chevron]')).toHaveAttribute('data-lt-chevron', 'up')
    fireEvent.click(screen.getByTestId('playlist-card-toggle-x1'))
    expect(screen.getByTestId('playlist-card-toggle-x1').querySelector('[data-lt-chevron]')).toHaveAttribute('data-lt-chevron', 'down')
  })

  it('utan spellistor står Spellistor också öppen', () => {
    setNarrow(false)
    render(<LiveTvSettingsSection />)
    expect(header('playlists')).toHaveAttribute('aria-expanded', 'true')
    expect(header('playlists')).toHaveTextContent('No playlists yet')
    // Tablån har inget att visa utan källor.
    expect(screen.queryByTestId('lt-section-guide')).toBeNull()
  })

  it('telefon: dragspel — att öppna en sektion stänger den förra', () => {
    setNarrow(true)
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [m3u])
    render(<LiveTvSettingsSection />)
    expect(header('playlists')).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(header('behaviour'))
    expect(header('behaviour')).toHaveAttribute('aria-expanded', 'true')
    expect(header('playlists')).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('playlist-card-l1')).toBeNull()
    expect(screen.getByTestId('lt-start-view')).toBeInTheDocument()
  })

  it('skrivbord: flera sektioner får vara öppna samtidigt', () => {
    setNarrow(false)
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [m3u])
    render(<LiveTvSettingsSection />)
    fireEvent.click(header('behaviour'))
    expect(header('playlists')).toHaveAttribute('aria-expanded', 'true')
    expect(header('behaviour')).toHaveAttribute('aria-expanded', 'true')
  })

  it('öppna sektioner minns för sessionen', () => {
    setNarrow(true)
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [m3u])
    render(<LiveTvSettingsSection />)
    fireEvent.click(header('sport'))
    cleanup()
    render(<LiveTvSettingsSection />)
    expect(header('sport')).toHaveAttribute('aria-expanded', 'true')
    expect(header('playlists')).toHaveAttribute('aria-expanded', 'false')
  })

  it('trasig sessionslagring fäller inte sidan', () => {
    setNarrow(false)
    window.sessionStorage.setItem('lumio.liveTv.settingsOpen', '{inte json')
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [m3u])
    render(<LiveTvSettingsSection />)
    expect(header('playlists')).toHaveAttribute('aria-expanded', 'true')
    expect(header('sport')).toHaveAttribute('aria-expanded', 'false')
  })

  it('att fälla ihop Spellistor minns också — standardvalet tar inte tillbaka den', () => {
    setNarrow(false)
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [m3u])
    render(<LiveTvSettingsSection />)
    fireEvent.click(header('playlists'))
    cleanup()
    render(<LiveTvSettingsSection />)
    expect(header('playlists')).toHaveAttribute('aria-expanded', 'false')
  })
})

function mountCard(entry: LiveTvList, props: Partial<Parameters<typeof PlaylistCard>[0]> = {}) {
  const spies = { onCategories: vi.fn(), onUpdate: vi.fn(), onRemove: vi.fn(), onRelogin: vi.fn() }
  render(<ToastHost><PlaylistCard list={entry} busy={false} {...spies} {...props} /></ToastHost>)
  return spies
}

describe('spellistekortet', () => {
  it('hopfällt: rubriken visar värd, typ, kanaler och status — inga knappar', () => {
    setNarrow(false)
    mountCard({ ...m3u, lastImportError: 'HTTP 502' }, { defaultOpen: false })
    const toggle = screen.getByTestId('playlist-card-toggle-l1')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveTextContent('panel.test')
    expect(toggle).toHaveTextContent(/M3U · 81 channels/)
    expect(screen.getByTestId('playlist-status-l1')).toHaveTextContent('HTTP 502')
    expect(screen.queryByRole('button', { name: 'Refetch' })).toBeNull()
    fireEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Refetch' })).toBeInTheDocument()
    expect(screen.getByTestId('epg-sources-l1')).toBeInTheDocument()
  })

  it('knappraden radbryts och krymper — den kan aldrig trycka ut kortet', () => {
    setNarrow(false)
    mountCard(xtream)
    const row = screen.getByTestId('playlist-actions-x1')
    expect(row.style.flexWrap).toBe('wrap')
    expect(row.style.maxWidth).toBe('100%')
    expect(row.style.flex).not.toBe('none')
    // Skrivbord: alla fyra som knappar.
    expect(within(row).getAllByRole('button').map((b) => b.textContent)).toEqual(['Categories', 'Server categories · all', 'Update channels', 'Remove'])
    for (const button of within(row).getAllByRole('button')) expect(button.style.maxWidth).toBe('100%')
  })

  it('telefon: två primära knappar, resten i ⋯-menyn', () => {
    setNarrow(true)
    const spies = mountCard(xtream)
    const row = screen.getByTestId('playlist-actions-x1')
    expect(row.style.flexWrap).toBe('wrap')
    expect(within(row).getByRole('button', { name: 'Categories' })).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: 'Update channels' })).toBeInTheDocument()
    expect(within(row).queryByRole('button', { name: /^Server categories/ })).toBeNull()
    expect(within(row).queryByRole('button', { name: 'Remove' })).toBeNull()
    fireEvent.click(screen.getByTestId('playlist-more-x1'))
    const menu = screen.getByTestId('playlist-more-x1-menu')
    expect(within(menu).getAllByRole('menuitem').map((b) => b.textContent)).toEqual(['Server categories · all', 'Remove'])
    // Rutan förankras i högerkanten och får inte bli bredare än skärmen.
    expect(menu.style.right).toBe('0px')
    expect(menu.style.maxWidth).toBe('calc(100vw - 32px)')
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Remove' }))
    expect(screen.queryByTestId('playlist-more-x1-menu')).toBeNull()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }))
    expect(spies.onRemove).toHaveBeenCalledTimes(1)
  })

  it('telefon: Server categories nås via menyn', () => {
    setNarrow(true)
    mountCard(xtream)
    fireEvent.click(screen.getByTestId('playlist-more-x1'))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Server categories · all' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Server categories · tv.kkz.test:8080')
  })
})
