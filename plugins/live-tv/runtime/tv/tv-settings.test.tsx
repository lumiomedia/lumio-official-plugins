import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, channelKey, getLiveTvLists, getM3uUrls, type LiveTvList } from '../live-tv-data'
import { getLockedChannelKeys } from '../channel-locks'
import { getTvSettings, getGuideMode } from './tv-settings-store'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => <div data-testid="player" /> }))
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

const mount = (tab?: string) => render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'settings', ...(tab ? { tab } : {}) }} onNavigate={() => {}} onOpenDetails={() => {}} />)

describe('TvSettingsView', () => {
  it('Utseende: guidens standardvy och beteende-toggles skriver till lagret', () => {
    mount()
    expect(screen.getByTestId('tab-appearance')).toHaveAttribute('data-init')
    expect(screen.queryByText('Accent colour')).toBeNull()
    fireEvent.click(screen.getByTestId('guide-default-tl'))
    expect(getGuideMode()).toBe('tl')
    fireEvent.click(screen.getByTestId('setting-previewEnabled'))
    expect(getTvSettings().previewEnabled).toBe(false)
    fireEvent.click(screen.getByTestId('setting-bannerHideMs'))
    expect(getTvSettings().bannerHideMs).toBe(6000)
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

  it('EPG-källor: listar URL:er', () => {
    mount('epg')
    expect(screen.getByText('http://x/epg.xml')).toBeInTheDocument()
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
