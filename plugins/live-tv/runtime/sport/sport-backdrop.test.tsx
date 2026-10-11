import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SportBackdropLayer } from './sport-backdrop'
import { sportCardStyle } from './surface'
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
    const scrim = layer.querySelector('[data-scrim]')?.getAttribute('style') ?? ''
    // Hela bilden mörkas (~50 %), mer till vänster och upptill där texten står.
    expect(scrim).toContain('linear-gradient(90deg')
    expect(scrim).toContain('linear-gradient(180deg')
    expect(scrim).toContain('#00000080')
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
  const stageVar = (name: string) => screen.getByTestId('sport-stage').style.getPropertyValue(name)
  it('standard utan eget val: Standard-bilden, och korten får svart 85 % (utan oskärpa på TV:n)', async () => {
    mountSport({}, { days: { [today]: [fxMatch({ id: 'a', start: Date.now() + 3_600_000 })] } })
    const layer = await screen.findByTestId('sport-backdrop')
    expect(layer.getAttribute('data-backdrop')).toBe('standard')
    expect(layer.querySelector('img')!.getAttribute('src')).toMatch(/^\/sport-backgrounds\/[a-z]+\.webp$/)
    expect(stageVar('--sport-card-bg')).toBe('rgba(0, 0, 0, 0.85)')
    expect(stageVar('--sport-card-blur')).toBe('none')
    // (happy-dom släpper `background: var(...)` ur style-attributet; korten läser variabeln via sportCardStyle.)
    expect(sportCardStyle.background).toBe('var(--sport-card-bg, rgba(252,252,255,0.07))')
    expect(sportCardStyle.backdropFilter).toBe('var(--sport-card-blur, none)')
  })
  it('Av: ingen bild, och korten behåller sina vanliga färger', async () => {
    mountSport({}, { days: { [today]: [fxMatch({ id: 'a', start: Date.now() + 3_600_000 })] } })
    await screen.findByTestId('sport-backdrop')
    act(() => { setSportSettings({ backdrops: { all: 'off', sports: {} } }) })
    expect(screen.queryByTestId('sport-backdrop')).toBeNull()
    expect(stageVar('--sport-card-bg')).toBe('')
  })
  it('telefonen: Standard-bilden med oskärpa bakom korten; eget kortval följer med', async () => {
    mountSport({}, { phone: true, days: { [today]: [fxMatch({ id: 'b', start: Date.now() + 3_600_000 })] } })
    expect((await screen.findByTestId('sport-backdrop')).getAttribute('data-backdrop')).toBe('standard')
    expect(stageVar('--sport-card-bg')).toBe('rgba(0, 0, 0, 0.85)')
    act(() => { setSportSettings({ cards: { opacity: 60, tone: 'gray' } }) })
    expect(stageVar('--sport-card-bg')).toBe('rgba(28, 29, 34, 0.6)')
    expect(stageVar('--sport-card-blur')).toBe('blur(14px)')
  })
})
