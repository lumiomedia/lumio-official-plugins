import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import { getTvSettings, getGuideMode } from './tv-settings-store'

vi.mock('../hooks/useLiveTvEpgCache', () => ({ useLiveTvEpgCache: vi.fn(() => null) }))
vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => <div data-testid="player" /> }))
import { LiveTvTvShell } from './tv-shell'

const list: LiveTvList = { id: 'l1', name: 'Xtream', channels: [{ name: 'A', logo: null, group: 'Sport', url: 'http://x/A', tvgId: null }], createdAt: '', urlTvg: null, epgUrls: ['http://x/epg.xml'], autoEpgDisabled: false, fetchedAt: '2026-09-12T10:00:00Z' }

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
  it('EPG-källor: listar URL:er', () => {
    mount('epg')
    expect(screen.getByText('http://x/epg.xml')).toBeInTheDocument()
  })
  it('Föräldrakontroll: tom text när inget är låst', () => {
    mount('parental')
    expect(screen.getByText('No locked channels')).toBeInTheDocument()
  })
})
