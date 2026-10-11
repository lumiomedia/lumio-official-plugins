import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { mountPhone, phoneChannel } from './__phone-mount'
import { GROUP_SHEET_STEP } from './group-sheet-phone'

vi.mock('../../live-tv-player', () => ({ LiveTvPlayer: () => null }))

const pad = (n: number) => String(n).padStart(3, '0')
const listWith = (count: number) => ({
  id: 'l1', name: 'Big', createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null,
  channels: Array.from({ length: count }, (_, i) => phoneChannel(`K${pad(i + 1)}`, `G${pad(i + 1)}`)),
})

describe('"Alla grupper" på telefon', () => {
  it('hubben: chip sist, ark med sök, val filtrerar och syns som chip', async () => {
    mountPhone({ view: 'hub' }, { lists: [listWith(20)], pins: [] })
    const more = await screen.findByTestId('chip-more-groups')
    expect(more).toHaveTextContent('All groups (20)')
    expect(screen.queryByTestId('chip-G015')).toBeNull()
    fireEvent.click(more)
    const sheet = screen.getByTestId('group-sheet')
    fireEvent.change(within(sheet).getByTestId('group-search-input'), { target: { value: 'g015' } })
    const items = sheet.querySelectorAll('[data-sheet-item]')
    expect(items).toHaveLength(1)
    fireEvent.click(items[0])
    expect(screen.queryByTestId('group-sheet')).toBeNull()
    expect(screen.getByTestId('chip-G015')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('all-channels').querySelectorAll('[data-f]')).toHaveLength(1)
  })

  it('arket ritar raderna i steg med Visa fler', async () => {
    mountPhone({ view: 'hub' }, { lists: [listWith(150)], pins: [] })
    fireEvent.click(await screen.findByTestId('chip-more-groups'))
    const sheet = screen.getByTestId('group-sheet')
    expect(sheet.querySelectorAll('[data-sheet-item]')).toHaveLength(GROUP_SHEET_STEP)
    fireEvent.click(within(sheet).getByTestId('group-show-more'))
    expect(sheet.querySelectorAll('[data-sheet-item]')).toHaveLength(GROUP_SHEET_STEP * 2)
  })

  it('guiden på telefon har samma chip', async () => {
    mountPhone({ view: 'guide' }, { lists: [listWith(20)], pins: [] })
    const row = await screen.findByTestId('guide-groups')
    expect(within(row).getByTestId('chip-more-groups')).toHaveTextContent('All groups (20)')
  })
})
