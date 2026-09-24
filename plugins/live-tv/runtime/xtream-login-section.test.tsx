import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, __resetXtreamAccountCacheForTests, type XtreamLogin } from './live-tv-data'
import { XtreamLoginSection } from './xtream-login-section'

const xtreamLogin: XtreamLogin = {
  id: 'login-1',
  base: 'http://panel.test:8080',
  username: 'jerry',
  password: 'hemlig',
  format: 'ts',
  categoryIds: [],
}

/**
 * Panelens `player_api.php`-rotanrop (kontot). Räknaren bevisar att kortet
 * håller sig till EN hämtning per montering — `fetchXtreamAccount` har en
 * egen 5-minuters-cache (P7), så testet skulle inte upptäcka ett `useEffect`
 * som råkar köra om sig själv.
 */
function stubXtreamAccountFetch(userInfo: Record<string, unknown>): { calls: number } {
  const counter = { calls: 0 }
  const base = globalThis.fetch
  vi.stubGlobal('fetch', ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : String(input), 'http://localhost')
    if (url.pathname === '/player_api.php') {
      counter.calls += 1
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ user_info: userInfo }) } as unknown as Response)
    }
    return base(input as RequestInfo, init)
  }) as typeof fetch)
  return counter
}

// Både direktanropet OCH proxyfallbacket (`fetchXtreamJson`) svarar fel — utan
// den andra faller testet igenom till ett RIKTIGT nätverksanrop mot
// `/api/m3u` (happy-dom löser den relativa vägen mot localhost:3000 och
// väntar in en ECONNREFUSED), vilket gör testet både långsamt och flakigt.
function stubXtreamAccountFailure(): void {
  vi.stubGlobal('fetch', (async (input: RequestInfo | URL) => {
    const url = new URL(typeof input === 'string' ? input : String(input), 'http://localhost')
    if (url.pathname === '/player_api.php' || url.pathname === '/api/m3u') {
      return { ok: false, status: 500 } as unknown as Response
    }
    throw new Error(`unexpected fetch in test: ${url.pathname}`)
  }) as typeof fetch)
}

beforeEach(() => {
  __resetForTests()
  __resetXtreamAccountCacheForTests()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('XtreamLoginSection: kontokortet (spec 4.4 punkt 3)', () => {
  it('renderar status, utgångsdatum och max anslutningar från fetchXtreamAccount', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'xtream_logins', [xtreamLogin])
    const fetchCalls = stubXtreamAccountFetch({ auth: 1, status: 'Active', exp_date: '1800000000', max_connections: '2', allowed_output_formats: ['ts'] })

    render(<XtreamLoginSection />)

    const card = await screen.findByTestId('xtream-account-login-1')
    expect(card).toHaveTextContent('Active')
    expect(card).toHaveTextContent('2 connections')
    expect(card).toHaveTextContent(/expires/)
    expect(fetchCalls.calls).toBe(1)
  })

  it('utan utgångsdatum visas "no expiry date" i stället för ett tomt fält', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'xtream_logins', [xtreamLogin])
    stubXtreamAccountFetch({ auth: 1, status: 'Active', exp_date: null, max_connections: null, allowed_output_formats: [] })

    render(<XtreamLoginSection />)

    const card = await screen.findByTestId('xtream-account-login-1')
    expect(card).toHaveTextContent('no expiry date')
  })

  it('ett fel vid kontohämtningen visas som text, inte en krasch', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'xtream_logins', [xtreamLogin])
    stubXtreamAccountFailure()

    render(<XtreamLoginSection />)

    expect(await screen.findByText('Could not read the account')).toBeInTheDocument()
  })
})

describe('XtreamLoginSection: Ta bort konto', () => {
  it('tar bort listan via xtreamLoginId och tömmer indexets källa även när listans källa inte matchar pseudo-URL:en', async () => {
    const { fireEvent } = await import('@testing-library/react')
    const { getLiveTvLists } = await import('./live-tv-data')
    writePluginJson(LIVE_TV_PLUGIN_ID, 'xtream_logins', [xtreamLogin])
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{
      id: 'l1', name: 'panel.test', createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null,
      kind: 'xtream', source: 'xtream://panel.test:8080/annat-login-id', xtreamLoginId: 'login-1', channelCount: 5, groups: [],
    }])
    const resets: string[] = []
    vi.stubGlobal('fetch', ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(typeof input === 'string' ? input : String(input), 'http://localhost')
      if (url.pathname === '/api/live-tv/reset') {
        resets.push(JSON.parse(String(init?.body ?? '{}')).source)
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true, removed: 5 }) } as unknown as Response)
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ user_info: { auth: 1, status: 'Active' } }) } as unknown as Response)
    }) as typeof fetch)

    render(<XtreamLoginSection />)
    await screen.findByTestId('xtream-account-login-1')
    fireEvent.click(screen.getByText('liveTvXtreamRemove'))

    expect(getLiveTvLists()).toHaveLength(0)
    await vi.waitFor(() => expect(resets).toEqual(['xtream://panel.test:8080/annat-login-id']))
  })
})

describe('XtreamLoginSection på TV: fokus från fälten', () => {
  it('nedåt från ett inloggningsfält landar på Log in & fetch, inte längre ned på sidan', async () => {
    __setTvModeForTests(true)
    try {
      stubXtreamAccountFetch({ auth: 1, status: 'Active' })
      render(<XtreamLoginSection />)
      const fields = screen.getAllByRole('button').filter((el) => el.getAttribute('data-f-down'))
      expect(fields.length).toBeGreaterThanOrEqual(3)
      const target = fields[0].getAttribute('data-f-down') as string
      expect(document.querySelector(target)).toHaveTextContent('liveTvXtreamConnect')
    } finally {
      __setTvModeForTests(false)
    }
  })
})
