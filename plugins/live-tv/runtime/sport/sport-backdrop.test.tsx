import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SportBackdropLayer } from './sport-backdrop'
import { setSportSettings } from './sport-store'
import { localDayKey } from './sport-epg'
import { fxMatch, mountSport } from './__sport-fixture'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => null }))

afterEach(() => { cleanup() })

describe('SportBackdropLayer', () => {
  it('bild med mörk gradient från vänster; en trasig bild rapporteras', () => {
    const onBroken = vi.fn()
    const url = 'https://media.api-sports.io/football/venues/1460.png'
    render(<SportBackdropLayer choice={{ kind: 'image', url, from: 'venue' }} phone={false} onBroken={onBroken} />)
    const layer = screen.getByTestId('sport-backdrop')
    expect(layer.getAttribute('data-backdrop')).toBe('venue')
    expect(layer.getAttribute('aria-hidden')).toBe('true')
    const img = layer.querySelector('img')!
    expect(img.getAttribute('src')).toBe('/api/live-tv/sport/image?src=' + encodeURIComponent(url))
    expect(layer.querySelector('[data-scrim]')?.getAttribute('style')).toContain('linear-gradient(90deg')
    fireEvent.error(img)
    expect(onBroken).toHaveBeenCalledWith(url)
  })
  it('Av ritar ingenting', () => {
    const { container } = render(<SportBackdropLayer choice={{ kind: 'none' }} phone={false} onBroken={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })
})

describe('Sport-vyn', () => {
  const today = localDayKey(Date.now())
  it('TV och telefon: gradient bakom innehållet utan nyckel, borta när Av väljs', async () => {
    mountSport({}, { days: { [today]: [fxMatch({ id: 'a', start: Date.now() + 3_600_000 })] } })
    expect((await screen.findByTestId('sport-backdrop')).getAttribute('data-backdrop')).toBe('gradient')
    act(() => { setSportSettings({ backdrop: 'off' }) })
    expect(screen.queryByTestId('sport-backdrop')).toBeNull()
    cleanup()
    setSportSettings({ backdrop: 'auto' })
    mountSport({}, { phone: true, days: { [today]: [fxMatch({ id: 'b', start: Date.now() + 3_600_000 })] } })
    expect((await screen.findByTestId('sport-backdrop')).getAttribute('data-backdrop')).toBe('gradient')
  })
})
