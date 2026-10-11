import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import type { LiveTvModel } from '../live-tv-model'
import type { TvNav } from './tv-shell'
import { TvChannelPicker } from './tv-channel-picker'

/**
 * Lagren får registrera sig EN gång per öppning.
 *
 * `nav` byggs om i skalet så fort något av dess underlag ändras — och
 * minuttickan i `useLiveTvModel` gör det varje minut. Låg `nav` i lagrets
 * beroendelista kördes öppningseffekten om vid varje sådan omritning: den
 * läste om "vem öppnade mig" från det fokus som råkade gälla just då (ett kort
 * INNE i väljaren) och drog tillbaka fokus till `[data-init]`. I praktiken
 * hoppade markören hem var minut, och Back landade i väljaren i stället för
 * hos stationen som öppnade den.
 */
const ch = (name: string) => ({ name, logo: null, group: 'Sport', url: `http://x/${name}`, tvgId: null })
const model = {
  channels: [ch('A'), ch('B'), ch('C')],
  groups: ['Sport'],
  favouriteChannels: [],
  nowFor: () => ({ now: null, next: null, later: null }),
  channelNumber: () => 1,
} as unknown as LiveTvModel

function makeNav(pushLayer: TvNav['pushLayer']): TvNav {
  // Ett NYTT objekt varje gång — exakt som skalets useMemo ger efter en tick.
  return { pushLayer } as unknown as TvNav
}

const settle = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 20)) }) }

afterEach(cleanup)

describe('TvChannelPicker som lager', () => {
  it('fångar öppnaren en gång, överlever omrender och lämnar tillbaka fokus', async () => {
    const opener = document.createElement('button')
    opener.textContent = 'öppna'
    document.body.appendChild(opener)
    opener.focus()

    const layers: Array<() => void> = []
    const pushLayer = vi.fn((close: () => void) => { layers.push(close); return () => {} })
    const onClose = vi.fn()
    const view = render(<TvChannelPicker model={model} nav={makeNav(pushLayer)} title="Välj kanal" onPick={() => {}} onClose={onClose} />)
    await settle()

    // Öppningen tar fokus till startstationen.
    expect(document.activeElement).toBe(screen.getByTestId('picker-row-A'))
    expect(pushLayer).toHaveBeenCalledTimes(1)

    // Användaren pilar ned ett steg, och skalet ritar om med ett nytt nav.
    const second = screen.getByTestId('picker-row-B')
    second.focus()
    view.rerender(<TvChannelPicker model={model} nav={makeNav(pushLayer)} title="Välj kanal" onPick={() => {}} onClose={onClose} />)
    await settle()
    expect(document.activeElement).toBe(second)
    expect(pushLayer).toHaveBeenCalledTimes(1)

    // Back (skalets lager) stänger och lämnar tillbaka fokus till ÖPPNAREN —
    // inte till den rad som råkade vara fokuserad när nav senast byttes.
    act(() => { layers[0]() })
    await settle()
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })
})

describe('TvChannelPicker: "Alla grupper"', () => {
  it('öppnar grupplistan ovanpå väljaren; valet filtrerar och visas som chip', async () => {
    const groups = Array.from({ length: 15 }, (_, i) => `G${String(i + 1).padStart(2, '0')}`)
    const big = {
      ...model,
      channels: groups.map((g, i) => ({ name: `K${i}`, logo: null, group: g, url: `http://x/K${i}`, tvgId: null })),
      groups,
    } as unknown as LiveTvModel
    const layers: Array<() => void> = []
    const pushLayer = vi.fn((close: () => void) => { layers.push(close); return () => { layers.splice(layers.indexOf(close), 1) } })
    render(<TvChannelPicker model={big} nav={makeNav(pushLayer)} title="Välj" onPick={() => {}} onClose={() => {}} />)
    await settle()
    const more = screen.getByText('All groups (15)')
    act(() => { more.click() })
    await settle()
    expect(screen.getByTestId('group-picker')).toBeInTheDocument()
    // Två lager: väljaren och grupplistan överst.
    expect(layers).toHaveLength(2)
    act(() => { screen.getByTestId('group-row-G14').click() })
    await settle()
    expect(screen.queryByTestId('group-picker')).toBeNull()
    expect(screen.getByTestId('channel-picker')).toBeInTheDocument()
    expect(screen.getAllByTestId(/^picker-row-/)).toHaveLength(1)
    const chips = Array.from(document.querySelectorAll('[data-live-tv-chip]')).map((c) => c.textContent)
    expect(chips.slice(0, 2)).toEqual(['All', 'G14'])
  })
})
