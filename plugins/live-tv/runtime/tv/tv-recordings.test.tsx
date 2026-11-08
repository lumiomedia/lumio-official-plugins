import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests } from '@/lib/plugin-sdk'
import { TvRecordings } from './tv-recordings'
import { TvRail, railKeyForView } from './tv-rail'
import { tabForView } from './mobile/mobile-tab-bar'
import { __resetRecordingsForTests, __seedRecordingsForTests, type Recording, type RecordingList } from '../recordings'
import { getTvSettings } from './tv-settings-store'
import type { LiveTvModel } from '../live-tv-model'
import type { TvNav } from './tv-shell'

const NOW = Date.now()
const H = 3_600_000
function rec(partial: Partial<Recording>): Recording {
  return { id: 'r', title: 'Rapport', channelName: 'SVT1', channelKey: 'SVT1::http://x/1.ts', playUrl: 'http://x/1.ts', startAt: NOW - H, stopAt: NOW, status: 'done', bytes: 1_288_490_189, createdAt: 0, ...partial }
}
const list: RecordingList = {
  recordings: [
    rec({ id: 'done1', title: 'Klar', status: 'done' }),
    rec({ id: 'live1', title: 'Pågår', status: 'recording', startedAt: NOW - 600_000, stopAt: NOW + H }),
    rec({ id: 'sched1', title: 'Planerad', status: 'scheduled', startAt: NOW + H, stopAt: NOW + 2 * H, programmeStart: NOW + H }),
    rec({ id: 'fail1', title: 'Fel', status: 'disk_full' }),
  ],
  folder: '/r', freeBytes: 5e9, keepFreeBytes: 2e9,
}
function nav() {
  return { go: vi.fn(), play: vi.fn(), playStream: vi.fn(), openMenu: vi.fn(), channelMenu: vi.fn(), toast: vi.fn(), pushLayer: vi.fn(() => () => {}), playerOpen: false, params: {}, view: 'recordings' } as unknown as TvNav & { playStream: ReturnType<typeof vi.fn>; openMenu: ReturnType<typeof vi.fn> }
}
const model = { nowMs: NOW } as unknown as LiveTvModel
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })

beforeEach(() => {
  __resetForTests()
  __resetRecordingsForTests()
  __setTvModeForTests(false)
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => json(String(input).endsWith('/list') ? list : {})))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('TvRecordings', () => {
  it('groups recordings into sections in order', () => {
    __seedRecordingsForTests(list)
    render(<TvRecordings model={model} nav={nav()} params={{}} settings={getTvSettings()} phone={false} />)
    const headings = screen.getAllByTestId('rec-section').map((el) => el.getAttribute('data-section'))
    expect(headings).toEqual(['active', 'scheduled', 'done', 'failed'])
    expect(screen.getByTestId('rec-card-done1')).toHaveTextContent('1.2 GB')
    expect(screen.getByTestId('rec-card-fail1')).toHaveTextContent('disk full')
  })

  it('omits empty sections and shows the empty state without recordings', () => {
    __seedRecordingsForTests({ ...list, recordings: [] })
    render(<TvRecordings model={model} nav={nav()} params={{}} settings={getTvSettings()} phone={false} />)
    expect(screen.queryAllByTestId('rec-section')).toHaveLength(0)
    expect(screen.getByText('No recordings yet')).toBeInTheDocument()
  })

  it('ok on a finished recording plays the stream url', () => {
    __seedRecordingsForTests(list)
    const n = nav()
    render(<TvRecordings model={model} nav={n} params={{}} settings={getTvSettings()} phone={false} />)
    fireEvent.click(screen.getByTestId('rec-card-done1'))
    expect(n.playStream).toHaveBeenCalledTimes(1)
    const req = n.playStream.mock.calls[0]![0] as { url: string; title: string }
    expect(req.url).toMatch(/^https?:\/\/.+\/api\/live-tv\/record\/stream\/done1\.ts$/)
    expect(req.title).toBe('Klar')
  })

  it('hold on a scheduled recording offers cancel, on a finished one delete with confirmation', () => {
    __seedRecordingsForTests(list)
    const n = nav()
    render(<TvRecordings model={model} nav={n} params={{}} settings={getTvSettings()} phone={false} />)
    fireEvent.contextMenu(screen.getByTestId('rec-card-sched1'))
    let menu = n.openMenu.mock.calls.at(-1)![0] as { actions: { label: string; run: () => void }[] }
    expect(menu.actions.map((a) => a.label)).toContain('Cancel recording')
    fireEvent.contextMenu(screen.getByTestId('rec-card-done1'))
    menu = n.openMenu.mock.calls.at(-1)![0] as { actions: { label: string; run: () => void }[] }
    expect(menu.actions.map((a) => a.label)).toEqual(['Play', 'Delete'])
    vi.useFakeTimers()
    menu.actions[1]!.run()
    // Bekräftelsen kommer ett steg efter att värdens meny stängt sig.
    expect(n.openMenu.mock.calls).toHaveLength(2)
    vi.advanceTimersByTime(100)
    vi.useRealTimers()
    const confirm = n.openMenu.mock.calls.at(-1)![0] as { title: string; actions: { label: string }[] }
    expect(confirm.title).toBe('Delete the recording and its file?')
  })

  it('rail shows recordings only when enabled, and the view maps to its own rail item', () => {
    expect(railKeyForView('recordings')).toBe('recordings')
    expect(tabForView('recordings')).toBe('more')
    const { rerender } = render(<TvRail active={null} onSelect={() => {}} isTv={false} narrow={false} labels showRecordings={false} />)
    expect(screen.queryByText('Recordings')).toBeNull()
    rerender(<TvRail active={null} onSelect={() => {}} isTv={false} narrow={false} labels showRecordings />)
    expect(screen.getByText('Recordings')).toBeInTheDocument()
  })
})
