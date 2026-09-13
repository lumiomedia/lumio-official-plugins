import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
import { LIVE_TV_PLUGIN_ID, getLiveTvLists, getXtreamLogins, type LiveTvList } from './live-tv-data'
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
})
