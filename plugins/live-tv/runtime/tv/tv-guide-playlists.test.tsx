import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { flushLiveTvIndex, seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, computeGroups, type LiveTvList } from '../live-tv-data'
import type { EpgCacheEntry } from '../epg/types'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => <div data-testid="player" /> }))
import { LiveTvTvShell } from './tv-shell'
import { getReminders } from '../reminders'

const now = Date.now()
const ch = (name: string, group: string, tvgId: string | null = null) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId })
const lists: LiveTvList[] = [
  { id: 'l1', name: 'Xtream', channels: [ch('A', 'Sport', 'a.tv'), ch('B', 'News')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null },
  { id: 'l2', name: 'Nordic', channels: [ch('C', 'Kids')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null },
]
const cache: EpgCacheEntry = { index: { 'a.tv': [{ title: 'Now A', start: now - 60_000, stop: now + 60_000 }, { title: 'Next A', start: now + 60_000, stop: now + 120_000 }] }, fetchedAt: now, sources: [] }

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', lists)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_guide_mode_v1', 'playlists')
  seedLiveTvIndex({ cache: cache })
})

/** Nu/Härnäst kommer ur appens nu-snapshot: låt det landa före avläsning. */
const mount = async () => {
  const rendered = render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'guide' }} onNavigate={() => {}} onOpenDetails={() => {}} />)
  await flushLiveTvIndex()
  return rendered
}

describe('TvGuidePlaylists', () => {
  it('ritar en icke-aktiv listas kanaler ur INDEXET, inte ur inbäddade channels', async () => {
    // Efter v2-migreringen bär listorna bara metadata. Vyn byggde tidigare
    // sina rader med `flattenChannels([list])` och hade därför stått tom i
    // skarp drift — testerna seedade inbäddade kanaler och dolde det.
    const withSources: LiveTvList[] = [
      { ...lists[0], kind: 'm3u', source: 'http://a.tld/list.m3u', url: 'http://a.tld/list.m3u' } as LiveTvList,
      { ...lists[1], kind: 'm3u', source: 'http://b.tld/list.m3u', url: 'http://b.tld/list.m3u' } as LiveTvList,
    ]
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', withSources)
    seedLiveTvIndex({ cache })
    // Kanalerna finns nu BARA i indexet; lagringen har listmetadata.
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', withSources.map((list) => ({
      ...list,
      channels: [],
      channelCount: (list.channels ?? []).length,
      groups: computeGroups(list.channels ?? []),
    })))

    await mount()
    // Vänsterkolumnen ritas ur metadata: namn, antal och grupper.
    const left = screen.getByTestId('playlists-column')
    expect(left).toHaveTextContent('Nordic')
    expect(left).toHaveTextContent('Kids')

    fireEvent.click(screen.getByTestId('pl-list-l2'))
    await flushLiveTvIndex()
    const rows = screen.getAllByTestId('pl-row')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('C')
  })
  it('listar spellistor med grupper och Favoriter sist', async () => {
    await mount()
    const left = screen.getByTestId('playlists-column')
    expect(left).toHaveTextContent('Xtream')
    expect(left).toHaveTextContent('Sport')
    expect(left).toHaveTextContent('Nordic')
    expect(left).toHaveTextContent('Favourites')
  })
  it('val av grupp filtrerar mitten och fokus uppdaterar högerkolumnen', async () => {
    await mount()
    fireEvent.click(screen.getByTestId('pl-group-l1-News'))
    const rows = screen.getAllByTestId('pl-row')
    expect(rows).toHaveLength(1)
    fireEvent.focus(rows[0])
    expect(screen.getByTestId('pl-detail')).toHaveTextContent('B')
  })
  it('mittenkolumnen sidindelar en stor spellista i stället för att rita allt', async () => {
    // Kolumnen ritade tidigare HELA listan: varje rad kostar ett
    // `model.nowFor`-uppslag och en ChannelCell, så en spellista med
    // tiotusentals kanaler låste TV-boxen i sekunder vid varje listbyte.
    // Samma steg (40) och samma "Visa fler"-station som tv-guide.tsx.
    const big: LiveTvList = { id: 'l3', name: 'Stor', channels: Array.from({ length: 300 }, (_, i) => ch(`K${i}`, 'Alla')), createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [big])
    seedLiveTvIndex({ cache })
    await mount()
    fireEvent.click(screen.getByTestId('pl-list-l3'))
    expect(screen.getAllByTestId('pl-row')).toHaveLength(40)
    fireEvent.click(screen.getByText('Show more'))
    expect(screen.getAllByTestId('pl-row')).toHaveLength(80)
  })
  it('OK på Sen-kortet sätter påminnelse', async () => {
    await mount()
    fireEvent.focus(screen.getAllByTestId('pl-row')[0])
    fireEvent.click(screen.getByTestId('pl-next-card'))
    expect(getReminders(now).length).toBe(1)
  })
})
