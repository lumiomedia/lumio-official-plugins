import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

vi.mock('@/lib/plugin-sdk', () => ({ isTauriEnv: false }))

import { LiveTvLogoImage, __resetLogoQueueForTests } from './live-tv-logo-image'

// happy-dom har en riktig IntersectionObserver som aldrig rapporterar
// intersection i test — utan den odefinierad hänger komponenten i
// laddkön för evigt och `shouldLoad` blir aldrig sant.
vi.stubGlobal('IntersectionObserver', undefined)

// `loadedLogoSrcs`/`pendingLogoLoads`/`activeLogoLoads` är modulglobala och
// överlever mellan tester (bara React städas av `cleanup`). Utan nollställning
// tar återanvända URL:er cache-genvägen i stället för att gå genom kön, och en
// läckt räknare från ett tidigare test kan dölja en dubbelnedräkning.
beforeEach(() => {
  __resetLogoQueueForTests()
})

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

it('mättad kö: bytet till reserven släpper INTE en plats — bara reservens egen slutgiltiga lösning gör det', () => {
  // MAX_CONCURRENT_LOGO_LOADS är 8 i icke-Tauri (isTauriEnv: false ovan). Fyll
  // exakt den kapaciteten plus en väntande — den väntande är beviset på att
  // kön antingen står still eller rör sig vid rätt tillfälle.
  const total = 9
  const channels = Array.from({ length: total }, (_, i) => ({
    src: `http://q/primar-${i}.png`,
    fallbackSrc: `http://q/reserv-${i}.png`,
  }))

  render(
    <>
      {channels.map((c) => (
        <LiveTvLogoImage key={c.src} src={c.src} fallbackSrc={c.fallbackSrc} alt={c.src} />
      ))}
    </>,
  )

  const waitingAlt = channels[8].src
  const firstAlt = channels[0].src

  // De första 8 fick en köplats direkt; den 9:e väntar fortfarande.
  expect(screen.getByAltText(waitingAlt)).not.toHaveAttribute('src')

  // Den första bildens leverantör fallerar och byter till reserven. Ingen
  // plats får släppas här — annars skulle den väntande bilden starta för
  // tidigt (det vore den dubbelnedräkning/tidiga-läckan uppdraget varnar för).
  fireEvent.error(screen.getByAltText(firstAlt))
  expect(screen.getByAltText(firstAlt)).toHaveAttribute('src', expect.stringContaining('reserv-0.png'))
  expect(screen.getByAltText(waitingAlt)).not.toHaveAttribute('src')

  // Reserven fallerar också — nu är bilden slutgiltigt klar, platsen släpps,
  // och den väntande bilden i kön får äntligen sin källa.
  fireEvent.error(screen.getByAltText(firstAlt))
  expect(screen.getByAltText(waitingAlt)).toHaveAttribute('src', expect.stringContaining('primar-8.png'))
})

it('kanalbyte (rerender) nollställer steget — nästa kanal ärver inte reservläget', () => {
  const { rerender } = render(
    <LiveTvLogoImage src="http://p/a-primar.png" fallbackSrc="http://p/a-reserv.png" alt="Kanal" />,
  )

  // Kanal A: leverantören fallerar, komponenten står nu på reserven.
  fireEvent.error(screen.getByAltText('Kanal'))
  expect(screen.getByAltText('Kanal')).toHaveAttribute('src', expect.stringContaining('a-reserv.png'))

  // Kanalbyte till B (samma komponentinstans, ny src/fallbackSrc — så här
  // återanvänds `LiveTvLogoImage` i listorna/rutnätet).
  rerender(<LiveTvLogoImage src="http://p/b-primar.png" fallbackSrc="http://p/b-reserv.png" alt="Kanal" />)

  // B ska börja om på sin egen primärkälla, inte ärva A:s reservläge.
  expect(screen.getByAltText('Kanal')).toHaveAttribute('src', expect.stringContaining('b-primar.png'))
})
