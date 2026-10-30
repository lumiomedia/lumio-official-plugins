import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { LogoPlate, ProgrammeArtBox } from './v2-ui'

afterEach(cleanup)
const ch = { name: 'Sky Sports Main', logo: null, logoFallback: null }

describe('v2-ui', () => {
  it('logoplattan visar initialer och nummerbricka', () => {
    render(<LogoPlate channel={ch} width={100} height={58} number={7} />)
    expect(screen.getByTestId('logo-plate')).toHaveTextContent('SS')
    expect(screen.getByTestId('logo-plate-number')).toHaveTextContent('7')
  })
  it('logon fyller mer av plattan (Jerry 2026-10-30: "gör logorna större") men rör aldrig kanten', () => {
    render(<LogoPlate channel={{ ...ch, logo: 'http://x/logo.png' }} width={300} height={150} />)
    const box = screen.getByTestId('logo-plate-box')
    expect(box.style.width).toBe('90%')
    expect(box.style.height).toBe('84%')
  })
  it('utan nummer ingen bricka', () => {
    render(<LogoPlate channel={ch} width={100} height={58} />)
    expect(screen.queryByTestId('logo-plate-number')).toBeNull()
  })
  it('programbildsrutan: platta utan bild, img med bild', () => {
    const { unmount } = render(<ProgrammeArtBox url={null} channel={ch} plate={[180, 90]} height={236} radius={16} />)
    expect(screen.getByTestId('logo-plate')).toBeInTheDocument()
    expect(screen.queryByTestId('programme-art-img')).toBeNull()
    unmount()
    render(<ProgrammeArtBox url="http://x/b.jpg" channel={ch} plate={[180, 90]} height={236} radius={16} />)
    expect(screen.getByTestId('programme-art-img')).toHaveAttribute('src', 'http://x/b.jpg')
  })
})
