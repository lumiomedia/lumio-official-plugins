import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createChannel, emptyDraft, type ChannelDef } from '../model/channel'

const state = vi.hoisted(() => ({
  channels: [] as unknown[],
  opened: [] as unknown[],
  deleted: [] as string[],
  cached: {} as Record<string, unknown[]>,
}))

vi.mock('@/lib/plugin-sdk', () => ({
  waitForStartIdle: () => Promise.resolve(),
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Section: ({ title, action, children }: { title: ReactNode; action?: ReactNode; children: ReactNode }) => <section><h3>{title}</h3>{action}{children}</section>,
  PillBtn: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => <button type="button" onClick={onClick}>{children}</button>,
  TOKENS: {},
  useLang: () => ({ lang: 'sv' }),
  resolvePluginText: (text: { sv: string }) => text.sv,
  requestOpenBrowsePage: (r: unknown) => { state.opened.push(r) },
}))
vi.mock('../host', () => ({ readChannels: () => state.channels, onChannelsChanged: () => () => {}, sourceCacheSetting: () => null }))
vi.mock('../state/store', () => ({
  useChannels: () => state.channels,
  deleteChannel: (id: string) => { state.deleted.push(id) },
  readCachedPool: (id: string) => state.cached[id] ?? null,
}))

import { buildChannelRows, ChannelsSettingsSection, channelsSettingsSection } from './settings-section'

const channel = (n: number, name: string): ChannelDef => ({ ...createChannel({ ...emptyDraft(), name }, []), id: `k${n}`, number: n })

beforeEach(() => {
  state.channels = [channel(2, 'Andra'), channel(1, 'Första')]
  state.opened = []
  state.deleted = []
  state.cached = { k1: [{}, {}, {}] }
})
afterEach(cleanup)

describe('inställningssektionen', () => {
  it('TV-raderna: en navigeringsrad per kanal i nummerordning och "Ny kanal"', () => {
    const actions = { edit: vi.fn(), remove: vi.fn(), create: vi.fn() }
    const rows = buildChannelRows(state.channels as ChannelDef[], actions)
    expect(rows.map((r) => r.t)).toEqual(['eyebrow', 'action', 'action', 'action'])
    const first = rows[1] as { label: { sv: string }; rows: Array<{ label: { sv: string }; danger?: boolean; confirm?: { title: { sv: string } }; run(): void }> }
    expect(first.label.sv).toBe('1 · Första')
    first.rows[0]!.run()
    expect(actions.edit).toHaveBeenCalledWith('k1')
    expect(first.rows[1]!.danger).toBe(true)
    expect(first.rows[1]!.confirm!.title.sv).toBe('Ta bort Första?')
    first.rows[1]!.run()
    expect(actions.remove).toHaveBeenCalledWith('k1')
    ;(rows[3] as { run(): void }).run()
    expect(actions.create).toHaveBeenCalled()
    expect(buildChannelRows([], actions).map((r) => r.t)).toEqual(['eyebrow', 'note', 'action'])
  })

  it('kontributionens rader läser aktuella kanaler och öppnar studion', () => {
    const rows = channelsSettingsSection.rows!()
    ;((rows[1] as { rows: Array<{ run(): void }> }).rows[0]!).run()
    expect(state.opened).toEqual([{ pageId: 'channels', params: { studio: 'k1' } }])
  })

  it('skrivbordet: lista, Redigera, Ny kanal och tvåstegs borttagning', () => {
    const { container } = render(<ChannelsSettingsSection />)
    expect([...container.querySelectorAll('[data-channel-name]')].map((e) => e.textContent)).toEqual(['Första', 'Andra'])
    expect(container.textContent).toContain('≈ 3 titlar')
    fireEvent.click(screen.getAllByText('Redigera')[1]!)
    fireEvent.click(screen.getByText('+ Ny kanal'))
    expect(state.opened).toEqual([{ pageId: 'channels', params: { studio: 'k2' } }, { pageId: 'channels', params: { studio: 'new' } }])
    fireEvent.click(screen.getAllByText('Ta bort')[0]!)
    expect(state.deleted).toEqual([])
    fireEvent.click(screen.getByText('Bekräfta'))
    expect(state.deleted).toEqual(['k1'])
  })
})
