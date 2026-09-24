import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'

// Hem-övertagandet och profilbytet är app-API:er som teststubben inte har —
// sektionen importerar dem på modulnivå, så de måste finnas för att den ska
// gå att montera alls.
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
import { LIVE_TV_PLUGIN_ID, getLiveTvLists, getXtreamLogins, isLogoFallbackEnabled, type LiveTvList, type XtreamLogin } from './live-tv-data'
import { resetM3uFetchProgressForTests } from './m3u-fetch-progress'
import { LiveTvSettingsSection } from './live-tv-settings-section'

function list(overrides: Partial<LiveTvList> & { id: string; name: string }): LiveTvList {
  return { createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null, ...overrides } as LiveTvList
}

/**
 * Importjobbets endpoints. `status` styrs per poll av `next()`; allt annat
 * (EPG-diagnostiken som EPG-sektionen läser) svarar tomt.
 */
const calls: { path: string; body: Record<string, unknown> }[] = []
function stubFetch(next: () => Record<string, unknown>): void {
  const json = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => body } as unknown as Response)
  vi.stubGlobal('fetch', ((input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : String(input)
    const path = new URL(raw, 'http://localhost').pathname
    calls.push({ path, body: init?.body ? JSON.parse(String(init.body)) : {} })
    if (raw.includes('player_api.php')) return json({ user_info: { auth: 1, status: 'Active' } })
    if (path === '/api/live-tv/import') return json({ job: 'job-1' })
    if (path === '/api/live-tv/import/status') return json(next())
    return json({})
  }) as typeof fetch)
}

beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(false)
  calls.length = 0
  resetM3uFetchProgressForTests()
  stubFetch(() => ({ state: 'done', received: 0, total: 0, result: { total: 0, groups: [], urlTvg: null, truncated: false } }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('LiveTvSettingsSection', () => {
  it('visar importjobbets egen räknare, inte bara "Hämtar lista 1 av 1…"', async () => {
    // En enda adress kan vara 17 000 kanaler: köräknaren står still i en
    // minut medan jobbet arbetar, och utan jobbets `received/total` ser det
    // ut som att hämtningen hängt sig.
    const statuses = [
      { state: 'fetching', received: 12000, total: 17000 },
      { state: 'done', received: 17000, total: 17000, result: { total: 17000, groups: [], urlTvg: null, truncated: false } },
    ]
    stubFetch(() => statuses.shift() ?? { state: 'done', received: 17000, total: 17000, result: { total: 17000, groups: [], urlTvg: null, truncated: false } })
    writePluginJson(LIVE_TV_PLUGIN_ID, 'm3u_urls_draft', ['http://panel.test/list.m3u'])

    render(<LiveTvSettingsSection />)
    fireEvent.click(screen.getByRole('button', { name: 'Fetch list' }))

    expect(await screen.findByText('Fetching 12,000 of 17,000…')).toBeInTheDocument()
    await waitFor(() => expect(getLiveTvLists()[0]?.channelCount).toBe(17000))
  })

  it('visar "behöver hämtas om" och senaste felet, och Hämta om kör importjobbet', async () => {
    const importSpy = vi
      .spyOn(liveTvData, 'importList')
      .mockResolvedValue({ state: 'done', received: 4, total: 4, result: { total: 4, groups: [], urlTvg: null, truncated: false } })
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list({
      id: 'l1',
      name: 'panel.test',
      kind: 'm3u',
      source: 'http://panel.test/list.m3u',
      url: 'http://panel.test/list.m3u',
      channelCount: 0,
      needsReimport: true,
      lastImportError: 'HTTP 500',
    })])

    render(<LiveTvSettingsSection />)
    expect(screen.getByText('Needs refetching')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('HTTP 500')

    fireEvent.click(screen.getByText('Refetch'))
    await waitFor(() => expect(importSpy).toHaveBeenCalledTimes(1))
    // Flaggorna rensas när omhämtningen gick igenom — annars satt märket
    // kvar för alltid.
    await waitFor(() => expect(getLiveTvLists()[0].needsReimport).toBe(false))
    expect(getLiveTvLists()[0].lastImportError).toBeUndefined()
  })

  it('ominloggningen rensar "behöver hämtas om" och återanvänder listans login-id', async () => {
    // Ominloggningen ÄR fixen på "behöver hämtas om". Utan att utfallet
    // bokförs stod märket och det gamla felet kvar på kortet tills appen
    // startades om — trots att kanalerna just hämtats.
    const json = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => body } as unknown as Response)
    vi.stubGlobal('fetch', ((input: RequestInfo | URL) => {
      const raw = typeof input === 'string' ? input : String(input)
      if (raw.includes('player_api.php')) {
        return json({ user_info: { auth: 1, status: 'Active', allowed_output_formats: ['ts'] } })
      }
      const path = new URL(raw, 'http://localhost').pathname
      if (path === '/api/live-tv/import') return json({ job: 'job-1' })
      if (path === '/api/live-tv/import/status') {
        return json({ state: 'done', received: 5, total: 5, result: { total: 5, groups: [], urlTvg: null, truncated: false } })
      }
      return json({})
    }) as typeof fetch)

    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list({
      id: 'x1',
      name: 'panel.test:8080',
      kind: 'xtream',
      source: 'xtream://panel.test:8080/login-1',
      xtreamLoginId: 'login-1',
      channelCount: 0,
      needsReimport: true,
      lastImportError: 'boom',
    })])

    render(<LiveTvSettingsSection />)
    fireEvent.click(screen.getByText('Sign in again'))
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'u' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'p' } })
    fireEvent.click(screen.getByRole('button', { name: 'Log in & fetch' }))

    await waitFor(() => expect(getLiveTvLists()[0].needsReimport).toBe(false))
    expect(getLiveTvLists()[0].lastImportError).toBeUndefined()
    expect(getLiveTvLists()).toHaveLength(1)
    // Samma login-id → samma pseudo-URL → listan LAGAS i stället för att en
    // andra, tom lista skapas bredvid den trasiga.
    expect(getXtreamLogins().map((login) => login.id)).toEqual(['login-1'])
  })

  it('en kapad spellista säger att kanaler saknas', () => {
    // Jobbet svarade `done` — utan raden ser en halv lista ut som en hel.
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list({
      id: 'm1', name: 'stor.test', kind: 'm3u', source: 'http://stor.test/list.m3u', url: 'http://stor.test/list.m3u', channelCount: 120000, truncated: true,
    })])

    render(<LiveTvSettingsSection />)
    expect(screen.getByTestId('list-truncated-m1')).toHaveTextContent('cut off at 64 MiB')
  })

  it('en överförd Xtream-lista utan inloggning ber om ny inloggning med panelen ifylld', () => {
    // `lists` speglas mellan enheter, `xtream_logins` gör det inte — listan
    // finns men importen kan inte köras förrän någon loggat in igen.
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list({
      id: 'x1',
      name: 'panel.test:8080',
      kind: 'xtream',
      source: 'xtream://panel.test:8080/login-1',
      xtreamLoginId: 'login-1',
      channelCount: 0,
      needsReimport: true,
    })])

    render(<LiveTvSettingsSection />)
    expect(screen.getByText('Sign in again to fetch channels')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Sign in again'))
    expect(screen.getByPlaceholderText('http://host:8080')).toHaveValue('http://panel.test:8080')
  })

  it('visar switchen påslagen för en lista utan fältet', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list({ id: 'a', name: 'A', kind: 'm3u', source: 'http://lista' })])
    render(<LiveTvSettingsSection />)
    expect(screen.getByTestId('logo-fallback-toggle-a')).toHaveAttribute('aria-checked', 'true')
  })

  it('sparar när switchen slås av', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list({ id: 'a', name: 'A', kind: 'm3u', source: 'http://lista' })])
    render(<LiveTvSettingsSection />)
    fireEvent.click(screen.getByTestId('logo-fallback-toggle-a'))
    expect(isLogoFallbackEnabled(getLiveTvLists()[0])).toBe(false)
  })

  it('switchen bär en egen ledtext — den är inställningen, Komplettera är handlingen', () => {
    // Jerrys ord efter test: "bara en checkbox, finns en complete-knapp men
    // borde vara en separat inställning". En ledtext på switchen (som
    // `hideHero`-switchen redan har högre upp i filen) och en avdelare framför
    // knapp-raden är hur filen redan skiljer inställning från handling —
    // innan den här ändringen fanns ingen ledtext här alls.
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list({ id: 'a', name: 'A', kind: 'm3u', source: 'http://lista' })])
    render(<LiveTvSettingsSection />)
    expect(within(screen.getByTestId('logo-fallback-toggle-a')).getByText(/iptv-org logo registry/)).toBeInTheDocument()
  })

  it('switchen är verkningslös för en egen lista och ska spärras', () => {
    // Egna listors kanaler renderas via `customChannelsByList` → `withIndexTwins`,
    // som bär tvillingens switch-tillstånd från URSPRUNGSLISTAN — den egna
    // listans switch gör ingenting. Komplettera-knappen är redan spärrad här;
    // switchen ska vara det av samma skäl (P1-fynd 2).
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list({ id: 'c', name: 'Mina kanaler', kind: 'custom', source: 'custom:c', channels: [] })])
    render(<LiveTvSettingsSection />)
    expect(screen.getByTestId('logo-fallback-toggle-c')).toBeDisabled()
  })
})

describe('sidan enligt handoffen §3', () => {
  it('blocken kommer i ordningen växlar → Playlists → M3U → Xtream login → Programme guide status', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list({ id: 'l1', name: 'panel.test', kind: 'm3u', source: 'http://panel.test/list.m3u', url: 'http://panel.test/list.m3u', urlTvg: 'http://panel.test/epg.xml', channelCount: 4 })])
    render(<LiveTvSettingsSection />)
    const order = [
      screen.getByRole('switch', { name: 'Use as home page' }),
      screen.getByRole('switch', { name: 'Hide the movie hero on the Live TV page' }),
      screen.getByText('Playlists'),
      screen.getByTestId('playlist-card-l1'),
      screen.getByText('M3U Playlist URLs'),
      screen.getByRole('button', { name: 'Fetch list' }),
      screen.getByText('Xtream login', { selector: 'h3' }),
      screen.getByRole('button', { name: 'Log in & fetch' }),
      screen.getByText('Programme guide status'),
    ]
    for (let i = 1; i < order.length; i++) {
      // eslint-disable-next-line no-bitwise
      expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING, `${i}`).toBeTruthy()
    }
    expect(screen.getByText('Each playlist keeps its own categories and EPG sources.')).toBeInTheDocument()
    expect(screen.getByText('The guide is fetched once for every playlist together.')).toBeInTheDocument()
  })
  it('Remove på en M3U-lista: bekräftelse → listan, adressen och indexets källa försvinner, toast', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'm3u_urls', ['http://panel.test/list.m3u'])
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list({ id: 'l1', name: 'panel.test', kind: 'm3u', source: 'http://panel.test/list.m3u', url: 'http://panel.test/list.m3u', channelCount: 4 })])
    render(<LiveTvSettingsSection />)
    fireEvent.click(within(screen.getByTestId('playlist-card-l1')).getByRole('button', { name: 'Remove' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Channels, categories and EPG sources from this playlist are removed from Live TV.')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }))
    expect(getLiveTvLists()).toHaveLength(0)
    expect(liveTvData.getM3uUrls()).toEqual([])
    await waitFor(() => expect(calls.some((c) => c.path === '/api/live-tv/reset' && c.body.source === 'http://panel.test/list.m3u')).toBe(true))
    expect(screen.getByRole('status')).toHaveTextContent('panel.test removed')
  })
  it('Remove på en Xtream-lista tar bort listan via inloggningen och tömmer indexets källa', async () => {
    const login: XtreamLogin = { id: 'login-1', base: 'http://panel.test:8080', username: 'jerry', password: 'x', format: 'ts', categoryIds: [] }
    writePluginJson(LIVE_TV_PLUGIN_ID, 'xtream_logins', [login])
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list({ id: 'x1', name: 'panel.test:8080', kind: 'xtream', source: 'xtream://panel.test:8080/annat-login-id', xtreamLoginId: 'login-1', channelCount: 5, groups: [] })])
    render(<LiveTvSettingsSection />)
    fireEvent.click(within(screen.getByTestId('playlist-card-x1')).getByRole('button', { name: 'Remove' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }))
    expect(getLiveTvLists()).toHaveLength(0)
    expect(getXtreamLogins()).toHaveLength(0)
    await waitFor(() => expect(calls.some((c) => c.path === '/api/live-tv/reset' && c.body.source === 'xtream://panel.test:8080/annat-login-id')).toBe(true))
  })
  it('Xtream-inloggning med tomma fält säger att panelen inte kan nås, utan nätanrop', () => {
    render(<LiveTvSettingsSection />)
    fireEvent.click(screen.getByRole('button', { name: 'Log in & fetch' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Could not reach the panel. Check the server URL.')
    expect(calls.filter((c) => c.path === '/player_api.php')).toHaveLength(0)
  })
})

describe('kategoripanelen efter import', () => {
  function m3uList(extra: Partial<LiveTvList> = {}): LiveTvList {
    return list({ id: 'l1', name: 'panel.test', kind: 'm3u', source: 'http://panel.test/list.m3u', url: 'http://panel.test/list.m3u', channelCount: 4, groups: [{ name: 'Sport', count: 4 }], ...extra })
  }
  it('öppnas efter en NY källas första import, inte igen efter Hoppa över, och inte vid omhämtning', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'm3u_urls_draft', ['http://panel.test/list.m3u'])
    render(<LiveTvSettingsSection />)
    fireEvent.click(screen.getByRole('button', { name: 'Fetch list' }))
    expect(await screen.findByRole('button', { name: /^skip$/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^skip$/i }))
    await waitFor(() => expect(getLiveTvLists()[0].curationSeen).toBe(true))
    // Samma adress igen (knappen heter nu "klar" efter första körningen): listan finns, ingen panel.
    fireEvent.click(screen.getByRole('button', { name: 'Fetch list' }))
    await waitFor(() => expect(getLiveTvLists()).toHaveLength(1))
    expect(screen.queryByRole('button', { name: /^skip$/i })).toBeNull()
  })
  it('öppnas inte vid omhämtning av en lista som fanns före funktionen', async () => {
    vi.spyOn(liveTvData, 'importList').mockResolvedValue({ state: 'done', received: 4, total: 4, result: { total: 4, groups: [{ name: 'Sport', count: 4 }], urlTvg: null, truncated: false } })
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [m3uList()])
    render(<LiveTvSettingsSection />)
    fireEvent.click(screen.getByText('Refetch'))
    await waitFor(() => expect(liveTvData.importList).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('button', { name: /^skip$/i })).toBeNull()
  })
  it('öppnas inte efter en import som misslyckas', async () => {
    vi.spyOn(liveTvData, 'importList').mockResolvedValue({ state: 'error', received: 0, total: null, error: 'HTTP 500' })
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [m3uList()])
    render(<LiveTvSettingsSection />)
    fireEvent.click(screen.getByText('Refetch'))
    await waitFor(() => expect(liveTvData.importList).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('button', { name: /^skip$/i })).toBeNull()
  })
  it('knappen Kategorier på kortet öppnar panelen i inställningsläge', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [m3uList({ curationSeen: true })])
    render(<LiveTvSettingsSection />)
    fireEvent.click(screen.getByRole('button', { name: /^categories$/i }))
    expect(await screen.findByRole('button', { name: /^cancel$/i })).toBeInTheDocument()
  })
})
