import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => null }))

import { LiveTvTvShell } from './tv-shell'
import { GROUP_PANEL_STEP } from './tv-group-picker'

const pad = (n: number) => String(n).padStart(3, '0')
const ch = (name: string, group: string) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId: null })
/** En kanal per grupp, `count` grupper: G001 … */
const listWith = (count: number): LiveTvList => ({
  id: 'l1', name: 'Big', createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null,
  channels: Array.from({ length: count }, (_, i) => ch(`K${pad(i + 1)}`, `G${pad(i + 1)}`)),
})

function mount(groups: number) {
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [listWith(groups)])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  seedLiveTvIndex()
  render(<LiveTvTvShell pageId="live-tv-browse" params={{}} onNavigate={() => {}} onOpenDetails={() => {}} />)
}

afterEach(cleanup)
beforeEach(() => { __resetForTests() })

describe('"Alla grupper" i hubben (skrivbord)', () => {
  beforeEach(() => __setTvModeForTests(false))

  it('ingen "Alla grupper"-chip när grupperna ryms', () => {
    mount(12)
    expect(screen.getByTestId('chip-G012')).toBeInTheDocument()
    expect(screen.queryByTestId('chip-more-groups')).toBeNull()
  })

  it('fler än tolv grupper: tolv chips och "All groups (N)" sist', () => {
    mount(20)
    const row = screen.getAllByTestId('all-channels-filter-row')[0]
    const chips = within(row).getAllByRole('button')
    expect(chips[chips.length - 1]).toHaveAttribute('data-testid', 'chip-more-groups')
    expect(chips[chips.length - 1]).toHaveTextContent('All groups (20)')
    expect(screen.getByTestId('chip-G012')).toBeInTheDocument()
    expect(screen.queryByTestId('chip-G013')).toBeNull()
  })

  it('listan söker, ett val filtrerar och stänger, och gruppen syns som vald chip', () => {
    mount(20)
    fireEvent.click(screen.getByTestId('chip-more-groups'))
    const panel = screen.getByTestId('group-picker')
    expect(within(panel).getAllByTestId(/^group-row-/)).toHaveLength(20)
    fireEvent.change(within(panel).getByTestId('group-search-input'), { target: { value: 'g01' } })
    // G010–G019: delsträng, utan hänsyn till skiftläge.
    expect(within(panel).getAllByTestId(/^group-row-/)).toHaveLength(10)
    fireEvent.change(within(panel).getByTestId('group-search-input'), { target: { value: 'G017' } })
    fireEvent.click(within(panel).getByTestId('group-row-G017'))
    expect(screen.queryByTestId('group-picker')).toBeNull()
    expect(screen.getByTestId('all-channels').querySelectorAll('[data-f]')).toHaveLength(1)
    // Extra chip direkt efter Alla (inga favoriter här), ritad som vald.
    const chip = screen.getByTestId('chip-G017')
    expect(chip.previousElementSibling).toHaveAttribute('data-testid', 'chip-all')
    expect(chip.style.fontWeight).toBe('600')
  })

  it('ingen träff visar "No results"', () => {
    mount(20)
    fireEvent.click(screen.getByTestId('chip-more-groups'))
    fireEvent.change(screen.getByTestId('group-search-input'), { target: { value: 'zzz' } })
    expect(screen.getByTestId('group-search-empty')).toHaveTextContent('No results')
  })
})

describe('"Alla grupper" på TV', () => {
  beforeEach(() => __setTvModeForTests(true))

  it('ritar raderna i steg och lägger på nästa steg när fokus närmar sig slutet', () => {
    mount(100)
    fireEvent.click(screen.getByTestId('chip-more-groups'))
    const panel = screen.getByTestId('group-picker')
    let rows = within(panel).getAllByTestId(/^group-row-/)
    expect(rows).toHaveLength(GROUP_PANEL_STEP)
    expect(rows[0]).toHaveAttribute('data-init')
    act(() => { rows[GROUP_PANEL_STEP - 1].focus() })
    rows = within(panel).getAllByTestId(/^group-row-/)
    expect(rows).toHaveLength(GROUP_PANEL_STEP * 2)
  })

  it('sökstationen öppnar värdens tangentbord och filtrerar på svaret', () => {
    mount(20)
    fireEvent.click(screen.getByTestId('chip-more-groups'))
    fireEvent.click(screen.getByTestId('group-search'))
    fireEvent.change(screen.getByTestId('tv-keyboard-input'), { target: { value: 'G02' } })
    fireEvent.click(within(screen.getByTestId('tv-keyboard-panel')).getByText('Done'))
    expect(screen.getByTestId('group-search')).toHaveTextContent('G02')
    const rows = within(screen.getByTestId('group-picker')).getAllByTestId(/^group-row-/)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveAttribute('data-testid', 'group-row-G020')
  })
})
