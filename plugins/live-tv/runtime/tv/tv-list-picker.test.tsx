import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { TvNav } from './tv-shell'
import { TvChoicePanel, type ChoiceOption } from './tv-list-picker'
import { gp } from './guide-view-shared'

/**
 * ENVALSPANELEN bakom kontrollradens käll- och kategoriväljare (spec §2).
 * Samma lagermönster som `TvListPicker`: `data-panel-root`, `nav.pushLayer`
 * som enda Bakåt-väg, fokus tillbaka till öppnaren — men ett val STÄNGER.
 */
const options: ChoiceOption[] = [
  { key: null, label: 'All playlists', count: 12 },
  { key: 'l1', label: 'Xtream', count: 8 },
  { key: 'l2', label: 'M3U', count: 4 },
]

function makeNav(pushLayer: TvNav['pushLayer']): TvNav {
  return { pushLayer } as unknown as TvNav
}

const settle = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 20)) }) }

afterEach(cleanup)

describe('TvChoicePanel', () => {
  it('öppnas med data-init på det valda alternativet och bock på samma rad', async () => {
    const pushLayer = vi.fn(() => () => {})
    render(<TvChoicePanel nav={makeNav(pushLayer)} title="Playlist" options={options} value="l2" onPick={() => {}} onClose={() => {}} />)
    await settle()
    const row = screen.getByTestId('choice-row-M3U')
    expect(row).toHaveAttribute('data-init')
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
    expect(screen.getByTestId('picker-check-M3U')).toBeInTheDocument()
    expect(screen.queryByTestId('picker-check-Xtream')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(row)
    // Panelen är ett lager med egen fokusram, som listväljaren.
    const root = screen.getByTestId('choice-panel')
    expect(root).toHaveAttribute('data-panel-root')
    expect(root).toHaveAttribute('data-live-tv-layer')
    // Rader 56 px i handoffen, skalade till scenens skala; antal visas.
    expect(row.style.height).toBe(`${gp(56)}px`)
    expect(row).toHaveTextContent('4')
  })

  it('utan träff på value tar första raden data-init', async () => {
    render(<TvChoicePanel nav={makeNav(() => () => {})} title="Playlist" options={options} value="okänd" onPick={() => {}} onClose={() => {}} />)
    await settle()
    expect(screen.getByTestId('choice-row-All playlists')).toHaveAttribute('data-init')
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
  })

  it('ett val ropar onPick(key) och onClose', async () => {
    const onPick = vi.fn()
    const onClose = vi.fn()
    render(<TvChoicePanel nav={makeNav(() => () => {})} title="Playlist" options={options} value={null} onPick={onPick} onClose={onClose} />)
    await settle()
    fireEvent.click(screen.getByTestId('choice-row-Xtream'))
    expect(onPick).toHaveBeenCalledWith('l1')
    expect(onClose).toHaveBeenCalledTimes(1)
    // "Alla" har nyckeln null — den ska nå onPick oförändrad.
    fireEvent.click(screen.getByTestId('choice-row-All playlists'))
    expect(onPick).toHaveBeenLastCalledWith(null)
  })

  it('Bakåt via pushLayer stänger och lämnar tillbaka fokus till öppnaren', async () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    const layers: Array<() => void> = []
    const pushLayer = vi.fn((close: () => void) => { layers.push(close); return () => {} })
    const onClose = vi.fn()
    render(<TvChoicePanel nav={makeNav(pushLayer)} title="Playlist" options={options} value={null} onPick={() => {}} onClose={onClose} />)
    await settle()
    expect(pushLayer).toHaveBeenCalledTimes(1)
    expect(document.activeElement).not.toBe(opener)
    act(() => { layers[0]() })
    expect(onClose).toHaveBeenCalledTimes(1)
    await settle()
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

  it('ett val stänger via panelens egen close och lämnar tillbaka fokus till öppnaren', async () => {
    // Fjärrfallet: OK på en rad rev förut panelen med fokus kvar på raden →
    // body, och fjärren dog. Valet ska gå samma väg som Bakåt.
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    const onClose = vi.fn()
    const onPick = vi.fn()
    render(<TvChoicePanel nav={makeNav(() => () => {})} title="Playlist" options={options} value={null} onPick={onPick} onClose={onClose} />)
    await settle()
    expect(document.activeElement).not.toBe(opener)
    fireEvent.click(screen.getByTestId('choice-row-Xtream'))
    expect(onPick).toHaveBeenCalledWith('l1')
    expect(onClose).toHaveBeenCalledTimes(1)
    await settle()
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })
})
