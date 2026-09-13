import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from './live-tv-data'

// Diagnostiken kommer från APPEN sedan v2 (pluginets egen XMLTV-cache är
// borta), så sektionen mockas mot indexklienten i stället för mot en
// cachehook.
vi.mock('./index-client', () => ({
  epgStatus: vi.fn(),
  refreshEpg: vi.fn(),
  waitForJob: vi.fn(),
}))

import { epgStatus, refreshEpg, waitForJob } from './index-client'
import { EpgSourcesSection, EpgStatusCard } from './epg-sources-section'

const emptyStatus = { listId: 'global', fetchedAt: null, failedAt: null, channels: 0, programmes: 0, urls: [] }

beforeEach(() => {
  __resetForTests()
  vi.mocked(epgStatus).mockResolvedValue(emptyStatus)
  vi.mocked(refreshEpg).mockResolvedValue('job-1')
  vi.mocked(waitForJob).mockResolvedValue({ state: 'done', received: 0 })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('EpgSourcesSection', () => {
  it('shows the auto-discovered url with an Auto pill', () => {
    render(
      <EpgSourcesSection
        autoUrl="https://example.com/guide.xml"
        manualUrls={[]}
        onChangeManual={() => {}}
      />,
    )
    expect(screen.getByText('https://example.com/guide.xml')).toBeInTheDocument()
    expect(screen.getByText('Auto')).toBeInTheDocument()
  })

  it('lists every manual url with a remove button', () => {
    render(
      <EpgSourcesSection
        autoUrl={null}
        manualUrls={['https://a.example/epg.xml', 'https://b.example/epg.xml']}
        onChangeManual={() => {}}
      />,
    )
    expect(screen.getByText('https://a.example/epg.xml')).toBeInTheDocument()
    expect(screen.getByText('https://b.example/epg.xml')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /remove/i })).toHaveLength(2)
  })

  it('calls onChangeManual with appended url when Add is clicked', () => {
    const handle = vi.fn()
    render(
      <EpgSourcesSection
        autoUrl={null}
        manualUrls={['https://existing.example/epg.xml']}
        onChangeManual={handle}
      />,
    )
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'https://new.example/epg.xml' } })
    fireEvent.click(screen.getByRole('button', { name: /add/i }))
    expect(handle).toHaveBeenCalledWith([
      'https://existing.example/epg.xml',
      'https://new.example/epg.xml',
    ])
  })

  it('calls onChangeManual without the removed url when Remove is clicked', () => {
    const handle = vi.fn()
    render(
      <EpgSourcesSection
        autoUrl={null}
        manualUrls={['https://a.example/epg.xml', 'https://b.example/epg.xml']}
        onChangeManual={handle}
      />,
    )
    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    fireEvent.click(removeButtons[0])
    expect(handle).toHaveBeenCalledWith(['https://b.example/epg.xml'])
  })

  it('shows the empty-state nudge when both lists are empty', () => {
    render(
      <EpgSourcesSection autoUrl={null} manualUrls={[]} onChangeManual={() => {}} />,
    )
    expect(screen.getByText(/no epg sources yet/i)).toBeInTheDocument()
  })

  it('does not fetch any diagnostics itself — the status card owns that', () => {
    render(
      <EpgSourcesSection autoUrl={null} manualUrls={['https://a.example/epg.xml']} onChangeManual={() => {}} />,
    )
    expect(epgStatus).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /refetch epg/i })).toBeNull()
  })
})

describe('EpgStatusCard', () => {
  function seedList(epgUrls: string[]): void {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{
      id: 'l1', name: 'Panel', kind: 'm3u', source: 'http://panel/list.m3u', url: 'http://panel/list.m3u',
      createdAt: '', urlTvg: null, epgUrls, autoEpgDisabled: false, fetchedAt: null,
    } as LiveTvList])
  }

  it('renders the app\'s per-url diagnostics instead of a plugin-side cache', async () => {
    seedList(['https://a.example/epg.xml', 'https://b.example/epg.xml'])
    vi.mocked(epgStatus).mockResolvedValue({
      listId: 'global',
      fetchedAt: Date.now(),
      failedAt: null,
      channels: 3,
      programmes: 812,
      urls: [
        { url: 'https://a.example/epg.xml', channels: 3, programmes: 812, fetchedAt: Date.now() },
        { url: 'https://b.example/epg.xml', channels: 0, programmes: 0, error: 'HTTP 404', fetchedAt: Date.now() },
      ],
    })

    render(<EpgStatusCard />)

    expect(await screen.findByText('HTTP 404')).toBeInTheDocument()
    expect(vi.mocked(epgStatus).mock.calls[0][0]).toBe('global')
    expect(screen.getByText('3 channels · 812 programmes', { exact: false })).toBeInTheDocument()
    expect(screen.getByText(/Guide fetched .* · 812 programmes/)).toBeInTheDocument()
  })

  it('reads the status ONCE for the whole page, not once per playlist', async () => {
    // Butiken är global: renderad per listkort blev det N läsningar av samma
    // sak och N knappar som alla gjorde samma globala omhämtning.
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [
      { id: 'l1', name: 'A', kind: 'm3u', source: 'http://a/list.m3u', url: 'http://a/list.m3u', createdAt: '', urlTvg: null, epgUrls: ['https://a.example/epg.xml'], autoEpgDisabled: false, fetchedAt: null },
      { id: 'l2', name: 'B', kind: 'm3u', source: 'http://b/list.m3u', url: 'http://b/list.m3u', createdAt: '', urlTvg: null, epgUrls: ['https://b.example/epg.xml'], autoEpgDisabled: false, fetchedAt: null },
    ] as LiveTvList[])

    render(<EpgStatusCard />)

    await waitFor(() => expect(epgStatus).toHaveBeenCalledTimes(1))
    expect(screen.getAllByRole('button', { name: /refetch epg/i })).toHaveLength(1)
    expect(screen.getByText('https://a.example/epg.xml')).toBeInTheDocument()
    expect(screen.getByText('https://b.example/epg.xml')).toBeInTheDocument()
  })

  it('refetches the EPG through the app and re-reads the status', async () => {
    seedList(['https://a.example/epg.xml'])

    render(<EpgStatusCard />)
    fireEvent.click(await screen.findByRole('button', { name: /refetch epg/i }))

    await waitFor(() => expect(refreshEpg).toHaveBeenCalledTimes(1))
    expect(vi.mocked(refreshEpg).mock.calls[0]).toEqual(['global', ['https://a.example/epg.xml'], ['http://panel/list.m3u'], true])
    expect(waitForJob).toHaveBeenCalledWith('job-1')
    await waitFor(() => expect(epgStatus).toHaveBeenCalledTimes(2))
  })

  it('renders nothing when no playlist has an EPG url', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [])
    const { container } = render(<EpgStatusCard />)
    expect(container).toBeEmptyDOMElement()
    expect(epgStatus).not.toHaveBeenCalled()
  })
})

// Renderingen ovan bevisar behaviouren; det här beviset är att den kommer ur
// den DELADE hooken (P7), inte en egen useState/useEffect-kopia — annars kan
// skrivbordet och TV-inställningarna glida isär utan att något test slår till.
// `vi.spyOn` på modulnamnrymden (i stället för `vi.mock` på filnivå) håller
// bytet till EN test, så resten av filens tester rör den riktiga hooken precis
// som förut.
import * as useEpgStatusModule from './hooks/useEpgStatus'

describe('EpgStatusCard hämtar via den delade hooken', () => {
  it('läser status/urls/refreshing ur useEpgStatus och anropar dess refresh()', () => {
    const refresh = vi.fn().mockResolvedValue(undefined)
    const spy = vi.spyOn(useEpgStatusModule, 'useEpgStatus').mockReturnValue({
      status: {
        listId: 'global', fetchedAt: Date.now(), failedAt: null, channels: 1, programmes: 2,
        urls: [{ url: 'https://a.example/epg.xml', channels: 1, programmes: 2, fetchedAt: Date.now() }],
      },
      urls: ['https://a.example/epg.xml'],
      refreshing: false,
      refresh,
      reload: vi.fn(),
    })

    render(<EpgStatusCard />)
    expect(screen.getByText('https://a.example/epg.xml')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /refetch epg/i }))
    expect(refresh).toHaveBeenCalledTimes(1)
    // Ren rendering: komponenten pratar aldrig direkt med index-clienten.
    expect(epgStatus).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('visar ingenting när hooken svarar utan urls', () => {
    const spy = vi.spyOn(useEpgStatusModule, 'useEpgStatus').mockReturnValue({
      status: null, urls: [], refreshing: false, refresh: vi.fn(), reload: vi.fn(),
    })
    const { container } = render(<EpgStatusCard />)
    expect(container).toBeEmptyDOMElement()
    spy.mockRestore()
  })
})
