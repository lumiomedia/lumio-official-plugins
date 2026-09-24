import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { TvCurationPicker } from './tv-curation-picker'
import { LIVE_TV_PLUGIN_ID, getLiveTvLists, type LiveTvList } from '../live-tv-data'

const SOURCE = 'http://x/p.m3u'
const list: LiveTvList = {
  id: 'l1', name: 'Lista', createdAt: '2026-01-01', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null,
  kind: 'm3u', source: SOURCE, url: SOURCE,
  groups: [{ name: 'Sport', count: 5 }, { name: 'News', count: 3 }],
}
const nav = { pushLayer: () => () => {} } as never
const keyboard = { available: true, node: null, ask: (_t: string, _v: string, cb: (value: string) => void) => cb('Mix') } as never

beforeEach(() => {
  __resetForTests()
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ groups: list.groups }) })))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('TvCurationPicker', () => {
  it('OK på en grupprad döljer den, Spara skriver', async () => {
    const onClose = vi.fn()
    render(<TvCurationPicker nav={nav} list={list} mode="settings" keyboard={keyboard} onClose={onClose} />)
    fireEvent.click(await screen.findByTestId('curation-row-News'))
    fireEvent.click(screen.getByTestId('curation-save'))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(getLiveTvLists()[0].curation).toEqual({ hidden: ['News'], merges: [] })
  })
  it('Slå ihop-läge: markera två, Klar frågar efter namn och skapar mergen', async () => {
    render(<TvCurationPicker nav={nav} list={list} mode="settings" keyboard={keyboard} onClose={() => {}} />)
    fireEvent.click(await screen.findByTestId('curation-merge-mode'))
    fireEvent.click(screen.getByTestId('curation-row-Sport'))
    fireEvent.click(screen.getByTestId('curation-row-News'))
    fireEvent.click(screen.getByTestId('curation-merge-done'))
    expect(await screen.findByText('Mix')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('curation-save'))
    await waitFor(() => expect(getLiveTvLists()[0].curation?.merges).toEqual([{ name: 'Mix', groups: ['Sport', 'News'] }]))
  })
  it('Hoppa över skriver bara curationSeen', async () => {
    const onClose = vi.fn()
    render(<TvCurationPicker nav={nav} list={list} mode="after-import" keyboard={keyboard} onClose={onClose} />)
    fireEvent.click(await screen.findByTestId('curation-skip'))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(getLiveTvLists()[0].curationSeen).toBe(true)
    expect(getLiveTvLists()[0].curation).toBeUndefined()
  })
})
