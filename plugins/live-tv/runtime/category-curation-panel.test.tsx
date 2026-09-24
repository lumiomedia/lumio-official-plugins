import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { CategoryCurationPanel } from './category-curation-panel'
import { LIVE_TV_PLUGIN_ID, getLiveTvLists, type LiveTvList } from './live-tv-data'

const SOURCE = 'http://x/p.m3u'
const list: LiveTvList = {
  id: 'l1', name: 'Lista', createdAt: '2026-01-01', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null,
  kind: 'm3u', source: SOURCE, url: SOURCE,
  groups: [{ name: 'Sport', count: 5 }, { name: 'News', count: 3 }, { name: 'Kids', count: 1 }],
}

beforeEach(() => {
  __resetForTests()
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ groups: list.groups }) })))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('CategoryCurationPanel', () => {
  it('Spara skriver dolda grupper och curationSeen', async () => {
    const onClose = vi.fn()
    render(<CategoryCurationPanel list={list} mode="settings" onClose={onClose} />)
    fireEvent.click(await screen.findByLabelText('News'))
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    const stored = getLiveTvLists()[0]
    expect(stored.curation).toEqual({ hidden: ['News'], merges: [] })
    expect(stored.curationSeen).toBe(true)
  })
  it('Hoppa över skriver bara curationSeen', async () => {
    const onClose = vi.fn()
    render(<CategoryCurationPanel list={list} mode="after-import" onClose={onClose} />)
    fireEvent.click(await screen.findByRole('button', { name: /^skip$/i }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(getLiveTvLists()[0].curationSeen).toBe(true)
    expect(getLiveTvLists()[0].curation).toBeUndefined()
  })
  it('Slå ihop kräver två markerade och ett namn som inte krockar', async () => {
    render(<CategoryCurationPanel list={list} mode="settings" onClose={() => {}} />)
    await screen.findByLabelText('News')
    fireEvent.click(screen.getByTestId('mark-Sport'))
    expect(screen.queryByRole('button', { name: /^merge$/i })).toBeNull()
    fireEvent.click(screen.getByTestId('mark-News'))
    fireEvent.change(screen.getByLabelText(/name of the merged category/i), { target: { value: 'Kids' } })
    fireEvent.click(screen.getByRole('button', { name: /^merge$/i }))
    expect(screen.getByText(/already a visible category/i)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/name of the merged category/i), { target: { value: 'Mix' } })
    fireEvent.click(screen.getByRole('button', { name: /^merge$/i }))
    expect(screen.getByText('Mix')).toBeInTheDocument()
    expect(screen.getByText(/contains sport, news/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(getLiveTvLists()[0].curation?.merges).toEqual([{ name: 'Mix', groups: ['Sport', 'News'] }]))
  })
  it('rullar in sig i vyn när den öppnas efter en import', async () => {
    const scroll = vi.fn()
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = scroll
    try {
      render(<CategoryCurationPanel list={list} mode="after-import" onClose={() => {}} />)
      await screen.findByLabelText('News')
      expect(scroll).toHaveBeenCalled()
    } finally {
      // Prototypen delas av hela körningen — utan återställning smittade den
      // andra testfiler (TvPlayerChrome föll i hela sviten men inte isolerat).
      Element.prototype.scrollIntoView = original
    }
  })
  it('en merge med en grupp leverantören tagit bort visas med de grupper som finns', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ ...list, curation: { hidden: [], merges: [{ name: 'Mix', groups: ['Sport', 'Gone'] }] } }])
    render(<CategoryCurationPanel list={getLiveTvLists()[0]} mode="settings" onClose={() => {}} />)
    expect(await screen.findByText('Mix')).toBeInTheDocument()
    expect(screen.queryByText('Gone')).toBeNull()
  })
})
