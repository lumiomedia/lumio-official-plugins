import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { __resetForTests, __setDesktopTauriEnvForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, channelKey, getLiveTvLists, getM3uUrls, getXtreamLogins, isChannelInLiveTvList, type LiveTvList, type XtreamLogin } from '../live-tv-data'
import { getLockedChannelKeys } from '../channel-locks'
import { getTvSettings, getGuideMode } from './tv-settings-store'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => <div data-testid="player" /> }))
// completeLogos gör ett riktigt nätverksanrop i produktionskoden — testerna
// ersätter den med en spion, samma mönster som skrivbordets
// `live-tv-settings-section.test.tsx`.
vi.mock('../index-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../index-client')>()
  return { ...actual, completeLogos: vi.fn() }
})
// Föräldrakontrollens PIN-grind (channel-locks.ts) läser PIN-stödet dynamiskt
// från plugin-sdk:t; teststubben saknar de funktionerna helt (ingen PIN-motor
// i test), så utan den här utökningen skulle lockAvailable alltid vara
// false och PinGate-testet nedan aldrig kunna öppna grinden.
vi.mock('@/lib/plugin-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/plugin-sdk')>()
  // Explicit `undefined`-nycklar (inte bara utelämnade) — annars kastar
  // vitests mockade modul på `typeof accentApi.getAccent` i tv-settings.tsx,
  // som annars bara läser ett odefinierat fält.
  return { ...actual, getAccent: undefined, setAccent: undefined, ACCENT_PRESETS: undefined, activeProfileHasPin: () => true, verifyActiveProfilePin: async () => true }
})
import { LiveTvTvShell } from './tv-shell'
import { ListRow } from './settings-tabs'
import { tvText } from './tv-strings'
import { completeLogos } from '../index-client'

const list: LiveTvList = { id: 'l1', name: 'Xtream', channels: [{ name: 'A', logo: null, group: 'Sport', url: 'http://x/A', tvgId: null }], createdAt: '', urlTvg: null, epgUrls: ['http://x/epg.xml'], autoEpgDisabled: false, fetchedAt: '2026-09-12T10:00:00Z' }
const urlList: LiveTvList = { id: 'l2', name: 'iptv.example.com', channels: [], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  seedLiveTvIndex()
})

/**
 * Importjobbets endpoints ovanpå indexstubbens `fetch`: `status`-svaret
 * bestäms av `next()` per poll, resten (query/lookup/epg) går vidare till
 * stubben.
 */
function stubImportFetch(next: () => Record<string, unknown>): void {
  const base = globalThis.fetch
  const json = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => body } as unknown as Response)
  vi.stubGlobal('fetch', ((input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(typeof input === 'string' ? input : String(input), 'http://localhost').pathname
    if (path === '/api/live-tv/import') return json({ job: 'job-1' })
    if (path === '/api/live-tv/import/status') return json(next())
    return base(input as RequestInfo, init)
  }) as typeof fetch)
}

/**
 * Fångar varje `POST /api/live-tv/import` så testet kan se VILKA listor som
 * hämtades om — knappen "Uppdatera alla" skiljer sig från "Uppdatera" bara i
 * antalet jobb den startar.
 */
function stubImportCapture(): string[] {
  const sources: string[] = []
  const base = globalThis.fetch
  const json = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => body } as unknown as Response)
  vi.stubGlobal('fetch', ((input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(typeof input === 'string' ? input : String(input), 'http://localhost').pathname
    if (path === '/api/live-tv/import') {
      const body = JSON.parse(String(init?.body ?? '{}')) as { source?: string }
      if (body.source) sources.push(body.source)
      return json({ job: `job-${sources.length}` })
    }
    if (path === '/api/live-tv/import/status') return json({ state: 'done', received: 1, total: 1, result: { total: 1, groups: [], urlTvg: null, truncated: false } })
    return base(input as RequestInfo, init)
  }) as typeof fetch)
  return sources
}

/** EPG-diagnostiken per adress (indexstubben svarar med en tom `urls`-lista). */
function stubEpgStatusFetch(payload: Record<string, unknown>): void {
  const base = globalThis.fetch
  const json = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => body } as unknown as Response)
  vi.stubGlobal('fetch', ((input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(typeof input === 'string' ? input : String(input), 'http://localhost').pathname
    if (path === '/api/live-tv/epg/status') return json(payload)
    if (path === '/api/live-tv/epg/refresh') return json({ job: 'epg-1' })
    return base(input as RequestInfo, init)
  }) as typeof fetch)
}

const xtreamLogin: XtreamLogin = { id: 'login-1', base: 'http://panel.test:8080', username: 'jerry', password: 'hemlig', format: 'ts', categoryIds: [] }

/** Panelens `player_api.php`: konto på rotanropet, kategorier på get_live_categories. */
function stubXtreamPanel(): string[] {
  const imports: string[] = []
  const base = globalThis.fetch
  const json = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => body } as unknown as Response)
  vi.stubGlobal('fetch', ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : String(input), 'http://localhost')
    if (url.pathname === '/player_api.php') {
      if (url.searchParams.get('action') === 'get_live_categories') {
        return json([{ category_id: '1', category_name: 'Sport' }, { category_id: '2', category_name: 'Film' }])
      }
      return json({ user_info: { auth: 1, status: 'Active', exp_date: '1800000000', max_connections: '2', allowed_output_formats: ['ts'] } })
    }
    if (url.pathname === '/api/live-tv/import') {
      const body = JSON.parse(String(init?.body ?? '{}')) as { source?: string }
      if (body.source) imports.push(body.source)
      return json({ job: 'job-1' })
    }
    if (url.pathname === '/api/live-tv/import/status') return json({ state: 'done', received: 1, total: 1, result: { total: 1, groups: [], urlTvg: null, truncated: false } })
    return base(input as RequestInfo, init)
  }) as typeof fetch)
  return imports
}

const mount = (tab?: string) => render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'settings', ...(tab ? { tab } : {}) }} onNavigate={() => {}} onOpenDetails={() => {}} />)

describe('TvSettingsView', () => {
  it('Utseende: guidens standardvy och beteende-toggles skriver till lagret', () => {
    mount()
    expect(screen.getByTestId('tab-appearance')).toHaveAttribute('data-init')
    expect(screen.queryByText('Accent colour')).toBeNull()
    // Den städade guiden (TV/skrivbord, Task 6): tre lägen i kontrollradens
    // ordning, de gamla fyra finns inte som val här.
    expect(screen.queryByTestId('guide-default-tl')).toBeNull()
    expect(screen.queryByTestId('guide-default-playlists')).toBeNull()
    fireEvent.click(screen.getByTestId('guide-default-timeline'))
    expect(getGuideMode()).toBe('timeline')
    fireEvent.click(screen.getByTestId('guide-default-nownext'))
    expect(getGuideMode()).toBe('nownext')
    fireEvent.click(screen.getByTestId('guide-default-grid'))
    expect(getGuideMode()).toBe('grid')
    fireEvent.click(screen.getByTestId('setting-previewEnabled'))
    expect(getTvSettings().previewEnabled).toBe(false)
    fireEvent.click(screen.getByTestId('setting-bannerHideMs'))
    expect(getTvSettings().bannerHideMs).toBe(6000)
  })
  it('Utseende på LAN/fjärr: de fyra gamla lägena står kvar som standardvy', () => {
    __setTvModeForTests(false)
    __setDesktopTauriEnvForTests(false)
    mount()
    expect(screen.queryByTestId('guide-default-nownext')).toBeNull()
    expect(screen.queryByTestId('guide-default-timeline')).toBeNull()
    fireEvent.click(screen.getByTestId('guide-default-tl'))
    expect(getGuideMode()).toBe('tl')
    // Fjärde läget sedan 0.6.0 (P6): Rutnät ska gå att välja som standardvy.
    fireEvent.click(screen.getByTestId('guide-default-grid'))
    expect(getGuideMode()).toBe('grid')
    fireEvent.click(screen.getByTestId('guide-default-playlists'))
    expect(getGuideMode()).toBe('playlists')
  })
  it('Spellistor: listar listor med kvitto och har Lägg till', () => {
    mount('playlists')
    expect(screen.getByText('Xtream')).toBeInTheDocument()
    expect(screen.getByText(/fetched/)).toBeInTheDocument()
    expect(screen.getByText('Add M3U URL')).toBeInTheDocument()
  })
  it('Spellistor: Remove tar även bort käll-URL:en ur m3u_urls', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [urlList])
    writePluginJson(LIVE_TV_PLUGIN_ID, 'm3u_urls', ['http://iptv.example.com/list.m3u8'])
    mount('playlists')
    expect(getM3uUrls()).toContain('http://iptv.example.com/list.m3u8')
    fireEvent.click(screen.getByText('Remove'))
    expect(getM3uUrls()).not.toContain('http://iptv.example.com/list.m3u8')
  })
  it('Spellistor: Lägg till kör importjobbet, visar dess förlopp och kvittot', async () => {
    // Hämtningen sker i VÄRDEN (Rust-jobbet). Vyn ska visa jobbets egna
    // `received`/`total` medan det pågår — "Hämtar…" utan siffror sa inget
    // om en panel med 17 000 kanaler tog en minut eller hade hängt sig.
    const statuses = [
      { state: 'fetching', received: 12000, total: 17000 },
      { state: 'done', received: 17000, total: 17000, result: { total: 17000, groups: [], urlTvg: null, truncated: false } },
    ]
    stubImportFetch(() => statuses.shift() ?? { state: 'done', received: 17000, total: 17000, result: { total: 17000, groups: [], urlTvg: null, truncated: false } })

    mount('playlists')
    fireEvent.click(screen.getByText('Add M3U URL'))
    fireEvent.change(screen.getByTestId('tv-keyboard-input'), { target: { value: 'http://ny.example/list.m3u' } })
    fireEvent.click(screen.getByText('Done'))

    expect(await screen.findByText('Fetching 12,000 of 17,000…')).toBeInTheDocument()
    await waitFor(() => expect(getM3uUrls()).toContain('http://ny.example/list.m3u'))
    const created = getLiveTvLists().find((entry) => entry.source === 'http://ny.example/list.m3u')!
    expect(created.channelCount).toBe(17000)
    expect(await screen.findByText(/17,000 channels/)).toBeInTheDocument()
  })

  it('Spellistor: en misslyckad förstahämtning tar bort den nyss skapade listan och säger till', async () => {
    // Tystnaden var värre än felet: skärmen såg exakt likadan ut som innan.
    // Och en tom listpost som ligger kvar (spec §5) är en orphan användaren
    // inte kan tolka.
    stubImportFetch(() => ({ state: 'error', received: 0, error: 'HTTP 404' }))

    mount('playlists')
    fireEvent.click(screen.getByText('Add M3U URL'))
    fireEvent.change(screen.getByTestId('tv-keyboard-input'), { target: { value: 'http://trasig.example/list.m3u' } })
    fireEvent.click(screen.getByText('Done'))

    expect(await screen.findByText('The fetch failed: HTTP 404')).toBeInTheDocument()
    expect(getM3uUrls()).not.toContain('http://trasig.example/list.m3u')
    expect(getLiveTvLists().some((entry) => entry.source === 'http://trasig.example/list.m3u')).toBe(false)
  })

  it('Spellistor: en lista som behöver hämtas om visar märket, felet och ligger överst', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list, { ...urlList, kind: 'm3u', source: 'http://iptv.example.com/list.m3u8', url: 'http://iptv.example.com/list.m3u8', channelCount: 0, needsReimport: true, lastImportError: 'HTTP 500' }])
    seedLiveTvIndex()
    mount('playlists')
    expect(screen.getByText('Needs refetching')).toBeInTheDocument()
    expect(screen.getByTestId('list-error-l2')).toHaveTextContent('HTTP 500')
    const rows = screen.getAllByTestId(/^list-row-/)
    expect(rows[0]).toHaveAttribute('data-testid', 'list-row-l2')
  })

  it('Spellistor: en kapad spellista säger att kanaler saknas', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ ...urlList, kind: 'm3u', source: 'http://iptv.example.com/list.m3u8', url: 'http://iptv.example.com/list.m3u8', channelCount: 120000, truncated: true }])
    seedLiveTvIndex()
    mount('playlists')
    expect(screen.getByTestId('list-truncated-l2')).toHaveTextContent('cut off at 64 MiB')
  })

  it('Spellistor: fokus stannar kvar i raden när märket rensas av en lyckad hämtning', async () => {
    // Sorteringen "behöver hämtas om först" räknades om vid varje rendering:
    // i samma ögonblick som flaggan rensades bytte raden plats, React
    // flyttade noden och den fokuserade knappen tappade fokus till body —
    // fjärrkontrollen strandade mitt i det som just lyckades.
    stubImportFetch(() => ({ state: 'done', received: 2, total: 2, result: { total: 2, groups: [], urlTvg: null, truncated: false } }))
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [
      { ...list, id: 'ok1', name: 'Fungerande', kind: 'm3u', source: 'http://ok.example/a.m3u', url: 'http://ok.example/a.m3u', channelCount: 2 },
      { ...urlList, id: 'bad1', name: 'Trasig', kind: 'm3u', source: 'http://bad.example/b.m3u', url: 'http://bad.example/b.m3u', channelCount: 0, needsReimport: true, lastImportError: 'HTTP 500' },
    ])
    seedLiveTvIndex()
    mount('playlists')

    // Den som behöver hämtas om ligger överst vid monteringen.
    expect(screen.getAllByTestId(/^list-row-/)[0]).toHaveAttribute('data-testid', 'list-row-bad1')

    const button = screen.getByTestId('list-refetch-bad1')
    button.focus()
    fireEvent.click(button)

    await waitFor(() => expect(getLiveTvLists().find((entry) => entry.id === 'bad1')?.needsReimport).toBe(false))
    expect(screen.queryByText('Needs refetching')).toBeNull()
    // Ordningen är fryst, så raden ligger kvar — och fokus med den.
    expect(screen.getAllByTestId(/^list-row-/)[0]).toHaveAttribute('data-testid', 'list-row-bad1')
    expect(screen.getByTestId('list-row-bad1').contains(document.activeElement)).toBe(true)
  })

  it('Spellistor: en Xtream-lista utan inloggning ber om ny inloggning med värden ifylld', async () => {
    // Enhetsöverföringen speglar `lists` men INTE `xtream_logins` (lösenord),
    // så listan finns men importen kan inte köras. Raden ska säga det, och
    // "Hämta om" ska öppna inloggningen med panelen redan ifylld.
    const orphan: LiveTvList = { id: 'x1', name: 'panel.test:8080', kind: 'xtream', source: 'xtream://panel.test:8080/login-1', xtreamLoginId: 'login-1', channels: [], channelCount: 0, createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null, needsReimport: true }
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [orphan])
    seedLiveTvIndex()
    mount('playlists')

    expect(screen.getByText('Sign in again to fetch channels')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('list-refetch-x1'))
    expect((await screen.findByTestId('tv-keyboard-input')).getAttribute('value')).toBe('http://panel.test:8080')
  })

  it('Spellistor: Xtream-guiden går vidare från server till användarnamn fast värden också stänger panelen', async () => {
    /*
      REGRESSION. Värdens tangentbordspanel anropar `onDone(value)` OCH
      `onClose()` på SAMMA tryck (components/tv/tv-settings-rows.tsx — både
      Klar-tangenten och Enter i systemtangentbordet). Pluginets prompt
      stängde då blint, och stängde därmed det steg som `onDone` just öppnat:
      guiden server → användarnamn → lösenord kom aldrig förbi steg ett på en
      riktig TV. Teststubben ropade bara `onDone`, så felet var osynligt här
      tills stubben gjordes trogen.
    */
    mount('playlists')
    fireEvent.click(screen.getByText('Add Xtream login'))
    expect(await screen.findByText('Xtream server — http://host:8080')).toBeInTheDocument()
    fireEvent.change(screen.getByTestId('tv-keyboard-input'), { target: { value: 'http://panel.test:8080' } })
    fireEvent.click(screen.getByText('Done'))
    expect(await screen.findByText('Xtream username')).toBeInTheDocument()
    // Steg två ska öppnas TOMT. Panelen ligger på samma plats i trädet, så
    // utan en ny `key` återanvände React komponenten och dess `useState`
    // behöll serveradressen — användarnamnet blev "http://panel.test:8080jerry".
    expect(screen.getByTestId('tv-keyboard-input')).toHaveValue('')
    fireEvent.change(screen.getByTestId('tv-keyboard-input'), { target: { value: 'jerry' } })
    fireEvent.click(screen.getByText('Done'))
    expect(await screen.findByText('Xtream password')).toBeInTheDocument()
    expect(screen.getByTestId('tv-keyboard-input')).toHaveValue('')
  })

  it('EPG-källor: listar URL:er', async () => {
    mount('epg')
    // Två förekomster sedan 0.6.0: adressraden (lägg till/ta bort) och
    // diagnostikraden under den (spec 4.4 punkt 2).
    expect(await screen.findAllByText('http://x/epg.xml')).toHaveLength(2)
  })
  it('Föräldrakontroll: tom text när inget är låst', () => {
    mount('parental')
    expect(screen.getByText('No locked channels')).toBeInTheDocument()
  })
  it('Föräldrakontroll: Unlock går via PinGate när PIN finns, kanalen förblir låst tills grinden godkänns', () => {
    const key = channelKey((list.channels ?? [])[0])
    writePluginJson(LIVE_TV_PLUGIN_ID, 'locked_channels_v1', [key])
    mount('parental')
    fireEvent.click(screen.getByText('A'))
    expect(screen.getByText('Enter PIN')).toBeInTheDocument()
    expect(getLockedChannelKeys()).toContain(key)
  })
})

describe('TvSettingsView: snabbknapparna (spec 4.4)', () => {
  it('Spellistor kan skapa en egen lista och bocka i kanaler', async () => {
    mount('playlists')
    fireEvent.click(screen.getByText('Create list'))
    fireEvent.change(screen.getByTestId('tv-keyboard-input'), { target: { value: 'Mina kanaler' } })
    fireEvent.click(screen.getByText('Done'))

    const created = await waitFor(() => {
      const entry = getLiveTvLists().find((item) => item.name === 'Mina kanaler')
      expect(entry).toBeTruthy()
      return entry!
    })
    expect(created.kind).toBe('custom')

    fireEvent.click(await screen.findByTestId(`list-channels-${created.id}`))
    const picker = await screen.findByTestId('list-picker')
    fireEvent.click(within(picker).getByTestId('picker-row-A'))
    expect(isChannelInLiveTvList(created.id, (list.channels ?? [])[0])).toBe(true)
    // Bocken är hela återkopplingen på TV: raden stängs inte som i
    // enkelvalsväljaren, man bockar vidare i samma panel.
    expect(within(picker).getByTestId('picker-check-A')).toBeInTheDocument()
    fireEvent.click(within(picker).getByTestId('picker-row-A'))
    expect(isChannelInLiveTvList(created.id, (list.channels ?? [])[0])).toBe(false)
  })

  it('EPG-fliken visar hämtad tid och fel per adress', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ ...list, epgUrls: ['http://x/epg.xml', 'http://y/epg.xml'] }])
    seedLiveTvIndex()
    stubEpgStatusFetch({
      listId: 'global',
      fetchedAt: Date.parse('2026-09-14T09:41:00Z'),
      failedAt: null,
      channels: 3,
      programmes: 812,
      urls: [
        { url: 'http://x/epg.xml', channels: 3, programmes: 812, fetchedAt: Date.parse('2026-09-14T09:41:00Z') },
        { url: 'http://y/epg.xml', channels: 0, programmes: 0, fetchedAt: 0, error: 'HTTP 500' },
      ],
    })
    mount('epg')
    expect(await screen.findByText(/812 programmes/)).toBeInTheDocument()
    expect(screen.getByText('HTTP 500')).toBeInTheDocument()
    expect(screen.getByTestId('epg-refresh')).toBeInTheDocument()
  })

  it('Xtream-fliken visar kontokortet', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'xtream_logins', [xtreamLogin])
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ ...list, id: 'x1', name: 'panel.test:8080', kind: 'xtream', source: 'xtream://panel.test:8080/login-1', xtreamLoginId: 'login-1' }])
    seedLiveTvIndex()
    stubXtreamPanel()
    mount('playlists')
    const card = await screen.findByTestId('xtream-account-login-1')
    expect(card).toHaveTextContent('Active')
    expect(card).toHaveTextContent('2')
  })

  it('500-taket ger ett kvitto i stället för ett tyst avslag', async () => {
    const full = Array.from({ length: 500 }, (_, i) => ({ name: `C${i}`, logo: null, group: 'Fyllnad', url: `http://x/C${i}`, tvgId: null }))
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list, { ...list, id: 'c1', name: 'Mina kanaler', kind: 'custom', source: 'custom:c1', channels: full, channelCount: 500 }])
    seedLiveTvIndex()
    mount('playlists')
    fireEvent.click(screen.getByTestId('list-channels-c1'))
    const picker = await screen.findByTestId('list-picker')
    fireEvent.click(within(picker).getByTestId('picker-row-A'))
    expect(await screen.findByText('The list is full')).toBeInTheDocument()
    expect(isChannelInLiveTvList('c1', (list.channels ?? [])[0])).toBe(false)
  })

  it('kategorival skrivs till login.categoryIds', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'xtream_logins', [xtreamLogin])
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ ...list, id: 'x1', name: 'panel.test:8080', kind: 'xtream', source: 'xtream://panel.test:8080/login-1', xtreamLoginId: 'login-1' }])
    seedLiveTvIndex()
    stubXtreamPanel()
    mount('playlists')
    fireEvent.click(await screen.findByTestId('xtream-categories-login-1'))
    const picker = await screen.findByTestId('list-picker')
    fireEvent.click(within(picker).getByTestId('picker-row-Sport'))
    await waitFor(() => expect(getXtreamLogins()[0].categoryIds).toEqual(['1']))
  })

  it('ett kategoribock startar ingen import – den sker när panelen stängs', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'xtream_logins', [xtreamLogin])
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ ...list, id: 'x1', name: 'panel.test:8080', kind: 'xtream', source: 'xtream://panel.test:8080/login-1', xtreamLoginId: 'login-1' }])
    seedLiveTvIndex()
    const imports = stubXtreamPanel()
    mount('playlists')
    fireEvent.click(await screen.findByTestId('xtream-categories-login-1'))
    const picker = await screen.findByTestId('list-picker')
    fireEvent.click(within(picker).getByTestId('picker-row-Sport'))
    await waitFor(() => expect(getXtreamLogins()[0].categoryIds).toEqual(['1']))
    // Varje bock får INTE starta ett importjobb — man bockar i fem kategorier
    // i rad. Omhämtningen körs en gång, när väljaren stängs.
    expect(imports).toEqual([])
  })

  it('Uppdatera per lista kör importList för just den listan', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [
      { ...list, id: 'a1', name: 'A-listan', kind: 'm3u', source: 'http://a.example/a.m3u', url: 'http://a.example/a.m3u' },
      { ...list, id: 'b1', name: 'B-listan', kind: 'm3u', source: 'http://b.example/b.m3u', url: 'http://b.example/b.m3u' },
    ])
    seedLiveTvIndex()
    const sources = stubImportCapture()
    mount('playlists')
    fireEvent.click(screen.getByTestId('list-refetch-b1'))
    await waitFor(() => expect(sources).toEqual(['http://b.example/b.m3u']))
  })

  it('Uppdatera alla kör importList för varje lista', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [
      { ...list, id: 'a1', name: 'A-listan', kind: 'm3u', source: 'http://a.example/a.m3u', url: 'http://a.example/a.m3u' },
      { ...list, id: 'b1', name: 'B-listan', kind: 'm3u', source: 'http://b.example/b.m3u', url: 'http://b.example/b.m3u' },
    ])
    seedLiveTvIndex()
    const sources = stubImportCapture()
    mount('playlists')
    fireEvent.click(screen.getByTestId('lists-refetch-all'))
    await waitFor(() => expect([...sources].sort()).toEqual(['http://a.example/a.m3u', 'http://b.example/b.m3u']))
  })

  it('utanför TV-läget används ett riktigt fält i stället för panelen', async () => {
    __setTvModeForTests(false)
    mount('playlists')
    fireEvent.click(screen.getByText('Add M3U URL'))
    expect(await screen.findByTestId('text-prompt-dialog')).toBeInTheDocument()
    expect(screen.queryByTestId('tv-keyboard-panel')).toBeNull()
    const input = screen.getByTestId('text-prompt-input') as HTMLInputElement
    // Adressfält: ingen autoversalisering, ingen rättstavning.
    expect(input.type).toBe('url')
  })
})

describe('ListRow — logotypreserv i TV-läget (P6)', () => {
  // `tt` byggs direkt mot `tvText('en', ...)` i stället för `useTvText()`:
  // ListRow renderas här helt fristående (ingen skalkontext runt), och 'en'
  // är ändå det enda testmiljön någonsin visar — teststubbens `useLang()`
  // ligger fast på 'en' (se plugin-sdk-stubben).
  const baseProps = {
    tt: (key: Parameters<typeof tvText>[1], vars?: Record<string, string | number>) => tvText('en', key, vars),
    locale: 'en-GB',
    busy: null,
    needsLogin: false,
    onRefetch: () => {},
    onRemove: () => {},
    onEditChannels: () => {},
  }

  afterEach(() => {
    vi.mocked(completeLogos).mockReset()
  })

  it('raden har en logotypswitch som går att nå med fjärren', () => {
    render(<ListRow list={{ id: 'a', name: 'A', createdAt: '', urlTvg: null, epgUrls: [], source: 'http://lista', kind: 'm3u' }} {...baseProps} />)
    expect(screen.getByTestId('list-logo-fallback-a')).toBeInTheDocument()
  })

  it('kompletterar från TV och visar kvittot', async () => {
    vi.mocked(completeLogos).mockResolvedValue({ matched: 3, total: 9 })
    render(<ListRow list={{ id: 'a', name: 'A', createdAt: '', urlTvg: null, epgUrls: [], source: 'http://lista', kind: 'm3u' }} {...baseProps} />)
    fireEvent.click(screen.getByTestId('list-logo-complete-a'))
    // Briefens assertion är skriven mot den svenska texten ("3 av 9"), men
    // teststubbens useLang() ligger fast på 'en' (se ovan) — samma fälla som
    // redan dokumenterats i `live-tv-settings-section.test.tsx` för
    // skrivbordets motsvarande test. Den engelska texten ("3 of 9") är vad
    // som faktiskt renderas här, så testet skrivs mot den i stället.
    expect(await screen.findByText(/3 of 9/)).toBeInTheDocument()
  })

  it('switchen ser inte längre ut som Komplettera-knappen — läget står i en växel, inte i etiketten', () => {
    // Före den här ändringen var switchen en `Action`-pill vars EGEN etikett
    // bar läget ("Logos: on"/"Logos: off") — exakt samma sorts pill som
    // Komplettera bredvid. Jerrys ord efter test: den ska inte se ut som en
    // och samma kontroll. Etiketten är nu bara "Logos"; själva läget syns i
    // en riktig `Toggle`.
    render(<ListRow list={{ id: 'a', name: 'A', createdAt: '', urlTvg: null, epgUrls: [], source: 'http://lista', kind: 'm3u' }} {...baseProps} />)
    const toggle = screen.getByTestId('list-logo-fallback-a')
    expect(toggle).toHaveTextContent('Logos')
    expect(toggle).not.toHaveTextContent('Logos: on')
    expect(toggle).not.toHaveTextContent('Logos: off')
  })

  it('switchen är spärrad för en egen lista — den gör ingenting där (P1-fynd 2)', () => {
    // Egna listors kanaler renderas via tvillingar som bär URSPRUNGSLISTANS
    // switch-tillstånd; den egna listans egen switch filtrerar ingenting.
    // Komplettera-knappen är redan spärrad för `kind: 'custom'` ovanför.
    render(
      <ListRow
        list={{ id: 'c', name: 'Mina kanaler', createdAt: '', urlTvg: null, epgUrls: [], source: 'custom:c', kind: 'custom', channels: [] }}
        {...baseProps}
      />,
    )
    expect(screen.getByTestId('list-logo-fallback-c')).toHaveAttribute('aria-disabled', 'true')
  })
})
