import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

vi.mock('@/lib/plugin-sdk', () => ({ isTauriEnv: false }))

import { LiveTvLogoImage } from './live-tv-logo-image'

// happy-dom har en riktig IntersectionObserver som aldrig rapporterar
// intersection i test — utan den odefinierad hänger komponenten i
// laddkön för evigt och `shouldLoad` blir aldrig sant.
vi.stubGlobal('IntersectionObserver', undefined)

afterEach(cleanup)

it('byter till reserven när leverantörens bild fallerar', () => {
  render(<LiveTvLogoImage src="http://p/primar.png" fallbackSrc="http://p/reserv.png" alt="K" />)
  const img = screen.getByAltText('K')
  fireEvent.load(img) // släpp förbi laddkön
  fireEvent.error(img)
  expect(screen.getByAltText('K')).toHaveAttribute('src', expect.stringContaining('reserv.png'))
})

it('ger upp först när även reserven fallerar', () => {
  render(<LiveTvLogoImage src="http://p/primar.png" fallbackSrc="http://p/reserv.png" alt="K" />)
  fireEvent.error(screen.getByAltText('K'))
  fireEvent.error(screen.getByAltText('K'))
  expect(screen.queryByAltText('K')).toBeNull()
})

it('anropar onError bara när alla källor är slut', () => {
  const onError = vi.fn()
  render(<LiveTvLogoImage src="http://p/primar.png" fallbackSrc="http://p/reserv.png" alt="K" onError={onError} />)
  fireEvent.error(screen.getByAltText('K'))
  expect(onError).not.toHaveBeenCalled()
  fireEvent.error(screen.getByAltText('K'))
  expect(onError).toHaveBeenCalledTimes(1)
})

it('ger upp direkt utan reserv', () => {
  const onError = vi.fn()
  render(<LiveTvLogoImage src="http://p/primar.png" alt="K" onError={onError} />)
  fireEvent.error(screen.getByAltText('K'))
  expect(onError).toHaveBeenCalledTimes(1)
  expect(screen.queryByAltText('K')).toBeNull()
})
