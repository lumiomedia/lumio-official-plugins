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

// completeLogos gör ett riktigt nätverksanrop i produktionskoden — testerna
// ersätter den med en spion så kvittot/felet går att styra per test.
vi.mock('./index-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./index-client')>()
  return { ...actual, completeLogos: vi.fn() }
})

import * as liveTvData from './live-tv-data'
import { LIVE_TV_PLUGIN_ID, getLiveTvLists, getXtreamLogins, isLogoFallbackEnabled, type LiveTvList } from './live-tv-data'
import { completeLogos } from './index-client'
import { resetM3uFetchProgressForTests } from './m3u-fetch-progress'
import { LiveTvSettingsSection } from './live-tv-settings-section'

function list(overrides: Partial<LiveTvList> & { id: string; name: string }): LiveTvList {
  return { createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null, ...overrides } as LiveTvList
}

/**
 * Importjobbets endpoints. `status` styrs per poll av `next()`; allt annat
 * (EPG-diagnostiken som EPG-sektionen läser) svarar tomt.
 */
function stubFetch(next: () => Record<string, unknown>): void {
  const json = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => body } as unknown as Response)
  vi.stubGlobal('fetch', ((input: RequestInfo | URL) => {
    const path = new URL(typeof input === 'string' ? input : String(input), 'http://localhost').pathname
    if (path === '/api/live-tv/import') return json({ job: 'job-1' })
    if (path === '/api/live-tv/import/status') return json(next())
    return json({})
  }) as typeof fetch)
}

beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(false)
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
    fireEvent.click(screen.getByText('m3uFetchList'))

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
    fireEvent.change(screen.getByPlaceholderText('liveTvXtreamUsername'), { target: { value: 'u' } })
    fireEvent.change(screen.getByPlaceholderText('liveTvXtreamPassword'), { target: { value: 'p' } })
    fireEvent.click(screen.getByText('liveTvXtreamConnect'))

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
    expect(screen.getByPlaceholderText(/liveTvXtreamServer/)).toHaveValue('http://panel.test:8080')
  })

  it('visar switchen påslagen för en lista utan fältet', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list({ id: 'a', name: 'A', kind: 'm3u', source: 'http://lista' })])
    render(<LiveTvSettingsSection />)
    expect(within(screen.getByTestId('logo-fallback-toggle-a')).getByRole('checkbox')).toBeChecked()
  })

  it('sparar när switchen slås av', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list({ id: 'a', name: 'A', kind: 'm3u', source: 'http://lista' })])
    render(<LiveTvSettingsSection />)
    fireEvent.click(within(screen.getByTestId('logo-fallback-toggle-a')).getByRole('checkbox'))
    expect(isLogoFallbackEnabled(getLiveTvLists()[0])).toBe(false)
  })

  it('kompletterar och visar kvittot', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list({ id: 'a', name: 'A', kind: 'm3u', source: 'http://lista' })])
    vi.mocked(completeLogos).mockResolvedValue({ matched: 12, total: 40 })
    render(<LiveTvSettingsSection />)
    fireEvent.click(within(screen.getByTestId('logo-complete-a')).getByRole('button'))
    // Testmiljöns useLang() ligger fast på 'en' (se plugin-sdk-stubben) — filens
    // övriga tester (t.ex. "Fetching 12,000 of 17,000…") verifierar mot samma
    // engelska text av samma skäl. Briefens "12 av 40" är den svenska varianten
    // i tabellen (verifierad separat via hub-strings), men det är den engelska
    // som faktiskt renderas här.
    expect(await screen.findByText(/12 of 40/)).toBeInTheDocument()
  })

  it('knappen är avstängd när switchen är av', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list({ id: 'a', name: 'A', kind: 'm3u', source: 'http://lista', logoFallbackEnabled: false })])
    render(<LiveTvSettingsSection />)
    expect(within(screen.getByTestId('logo-complete-a')).getByRole('button')).toBeDisabled()
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
    expect(within(screen.getByTestId('logo-fallback-toggle-c')).getByRole('checkbox')).toBeDisabled()
  })
})
