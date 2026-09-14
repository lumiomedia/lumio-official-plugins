import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { __resetLogoQueueForTests } from './live-tv-logo-image'
import { ChannelBadge } from './live-tv-ui'

// happy-dom har en riktig IntersectionObserver som aldrig rapporterar
// intersection i test — utan den odefinierad hänger badgets logotyp i
// laddkön för evigt och `src`-attributet sätts aldrig.
vi.stubGlobal('IntersectionObserver', undefined)

// Laddkön är modulglobal (se live-tv-logo-image.tsx) — utan nollställning tar
// återanvända URL:er cache-genvägen i stället för att gå genom kön.
beforeEach(() => {
  __resetLogoQueueForTests()
})

afterEach(cleanup)

describe('ChannelBadge', () => {
  it('kanalkortet skickar med reserven', () => {
    const { container } = render(
      <ChannelBadge channel={{ name: 'K', logo: 'http://p/a.png', logoFallback: 'http://p/b.png' }} />,
    )
    const img = container.querySelector('img') as HTMLImageElement
    fireEvent.load(img) // släpp förbi laddkön
    fireEvent.error(img)
    expect(img.getAttribute('src')).toContain(encodeURIComponent('http://p/b.png'))
  })

  it('kanal utan leverantörslogotyp går direkt på reserven', () => {
    const { container } = render(
      <ChannelBadge channel={{ name: 'K', logo: null, logoFallback: 'http://p/b.png' }} />,
    )
    const img = container.querySelector('img') as HTMLImageElement
    expect(img.getAttribute('src')).toContain(encodeURIComponent('http://p/b.png'))
  })

  it('kanal utan både och visar initialerna', () => {
    const { container, getByText } = render(
      <ChannelBadge channel={{ name: 'Kanal Ett', logo: null, logoFallback: null }} />,
    )
    expect(container.querySelector('img')).toBeNull()
    expect(getByText('KE')).toBeInTheDocument()
  })
})
