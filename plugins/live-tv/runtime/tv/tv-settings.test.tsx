import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, channelKey, getM3uUrls, type LiveTvList } from '../live-tv-data'
import { getLockedChannelKeys } from '../channel-locks'
import { getTvSettings, getGuideMode } from './tv-settings-store'

vi.mock('../hooks/useLiveTvEpgCache', () => ({ useLiveTvEpgCache: vi.fn(() => null) }))
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

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
})

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
  it('Spellistor: en misslyckad hämtning säger till i stället för att vara tyst', async () => {
    // Adressen ska INTE läggas till när hämtningen misslyckas — men tystnaden
    // var värre än felet: skärmen såg exakt likadan ut som innan, och inget
    // sa om adressen var fel, servern nere eller tangentbordet slarvigt.
    const fetchMock = vi.fn(async () => ({ ok: false, json: async () => ({}) }))
    vi.stubGlobal('fetch', fetchMock)
    try {
      mount('playlists')
      fireEvent.click(screen.getByText('Add M3U URL'))
      fireEvent.change(screen.getByTestId('tv-keyboard-input'), { target: { value: 'http://trasig.example/list.m3u' } })
      fireEvent.click(screen.getByText('Done'))
      expect(await screen.findByText('Could not fetch the playlist')).toBeInTheDocument()
      expect(getM3uUrls()).not.toContain('http://trasig.example/list.m3u')
    } finally {
      vi.unstubAllGlobals()
    }
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
    const key = channelKey(list.channels[0])
    writePluginJson(LIVE_TV_PLUGIN_ID, 'locked_channels_v1', [key])
    mount('parental')
    fireEvent.click(screen.getByText('A'))
    expect(screen.getByText('Enter PIN')).toBeInTheDocument()
    expect(getLockedChannelKeys()).toContain(key)
  })
})
