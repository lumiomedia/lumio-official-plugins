import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { CategoryCurationPanel } from './category-curation-panel'
import { LIVE_TV_PLUGIN_ID, getLiveTvLists, type LiveTvList } from './live-tv-data'

const SOURCE = 'http://x/p.m3u'
const list: LiveTvList = {
  id: 'l1', name: 'Lista', createdAt: '2026-01-01', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null,
  kind: 'm3u', source: SOURCE, url: SOURCE,
  groups: [{ name: 'Sport', count: 5 }, { name: 'News', count: 3 }],
}

beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ groups: list.groups }) })))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); __setTvModeForTests(false) })

describe('CategoryCurationPanel på TV (appens inställningar i TV-läge)', () => {
  it('varje grupprad, markering och knapp är en station', async () => {
    render(<CategoryCurationPanel list={list} mode="settings" onClose={() => {}} />)
    await screen.findByRole('button', { name: /^Sport/ })
    const stations = document.querySelectorAll('[data-f]')
    // 2 grupprader + 2 markera + sök + Visa alla + Dölj alla + Avbryt + Spara
    expect(stations.length).toBeGreaterThanOrEqual(9)
    expect(screen.getByRole('button', { name: /^save$/i })).toHaveAttribute('data-f')
  })
  it('slå ihop via tangentbordspanelen och spara', async () => {
    render(<CategoryCurationPanel list={list} mode="settings" onClose={() => {}} />)
    await screen.findByRole('button', { name: /^Sport/ })
    fireEvent.click(screen.getByTestId('mark-Sport'))
    fireEvent.click(screen.getByTestId('mark-News'))
    fireEvent.click(screen.getByLabelText(/name of the merged category/i))
    fireEvent.change(screen.getByTestId('tv-keyboard-input'), { target: { value: 'Mix' } })
    fireEvent.click(screen.getByText('Done'))
    fireEvent.click(screen.getByRole('button', { name: /^merge$/i }))
    expect(await screen.findByText('Mix')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(getLiveTvLists()[0].curation?.merges).toEqual([{ name: 'Mix', groups: ['Sport', 'News'] }]))
  })
})
