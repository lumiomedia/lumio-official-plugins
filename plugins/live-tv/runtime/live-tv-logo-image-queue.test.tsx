import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

// I appen (Tauri) laddas EN logotyp åt gången — det är där en läckt köplats
// stoppar alla logotyper för resten av sessionen.
vi.mock('@/lib/plugin-sdk', () => ({ isTauriEnv: true }))

import { LiveTvLogoImage, __resetLogoQueueForTests } from './live-tv-logo-image'

vi.stubGlobal('IntersectionObserver', undefined)

beforeEach(() => {
  __resetLogoQueueForTests()
})

afterEach(cleanup)

it('lämnar tillbaka köplatsen när kortet försvinner mitt i laddningen', () => {
  const first = render(<LiveTvLogoImage src="http://p/a.png" alt="A" />)
  expect(screen.getByAltText('A')).toHaveAttribute('src', 'http://p/a.png')
  first.unmount() // ingen load/error — bilden hann aldrig landa

  render(<LiveTvLogoImage src="http://p/b.png" alt="B" />)
  expect(screen.getByAltText('B')).toHaveAttribute('src', 'http://p/b.png')
})

it('lämnar tillbaka köplatsen när kortet byter kanal mitt i laddningen', () => {
  const { rerender } = render(<LiveTvLogoImage src="http://p/a.png" alt="A" />)
  rerender(<LiveTvLogoImage src="http://p/c.png" alt="A" />)
  expect(screen.getByAltText('A')).toHaveAttribute('src', 'http://p/c.png')
})

it('ett köat kort som försvinner tar ingen plats när det blir dess tur', () => {
  render(<LiveTvLogoImage src="http://p/a.png" alt="A" />)
  const queued = render(<LiveTvLogoImage src="http://p/b.png" alt="B" />)
  expect(screen.getByAltText('B')).not.toHaveAttribute('src')
  queued.unmount()
  render(<LiveTvLogoImage src="http://p/c.png" alt="C" />)

  fireEvent.load(screen.getByAltText('A'))
  expect(screen.getByAltText('C')).toHaveAttribute('src', 'http://p/c.png')
})

it('en bild ur cachen räknar inte ned en plats den aldrig tog', () => {
  const warm = render(<LiveTvLogoImage src="http://p/a.png" alt="A" />)
  fireEvent.load(screen.getByAltText('A'))
  warm.unmount()

  render(<LiveTvLogoImage src="http://p/b.png" alt="B" />) // tar platsen
  render(<LiveTvLogoImage src="http://p/a.png" alt="A2" />) // cacheträff, utan plats
  fireEvent.load(screen.getByAltText('A2'))
  render(<LiveTvLogoImage src="http://p/c.png" alt="C" />)
  // B laddar fortfarande — C måste vänta, annars kör två samtidigt.
  expect(screen.getByAltText('C')).not.toHaveAttribute('src')
})
