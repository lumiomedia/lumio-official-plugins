import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
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
  it('plattan är helvit med rundade hörn (Jerry 2026-10-30)', () => {
    render(<LogoPlate channel={{ ...ch, logo: 'http://x/logo.png' }} width={100} height={58} radius={8} />)
    const plate = screen.getByTestId('logo-plate')
    expect(plate.style.background).toMatch(/^(#ffffff|rgb\(255, 255, 255\))$/)
    expect(plate.style.borderRadius).toBe('8px')
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

  it('bar logga (Jerry 2026-10-30): ingen platta, ingen skugga — bilden själv fyller ytan med rundade hörn', () => {
    render(<LogoPlate bare channel={{ ...ch, logo: 'http://x/logo.png' }} width={228} height={138} radius={10} />)
    const plate = screen.getByTestId('logo-plate')
    expect(plate.getAttribute('data-bare')).toBe('1')
    expect(plate.style.background).toBe('')
    expect(plate.style.boxShadow).toBe('')
    const box = screen.getByTestId('logo-plate-box')
    expect(box.style.width).toBe('100%')
    expect(box.style.height).toBe('100%')
    const img = box.querySelector('img') as HTMLImageElement
    expect(img.className).toContain('lumio-v2-logo-bare')
    expect(box.style.getPropertyValue('--logo-r')).toBe('10px')
    // En bred logga (2:1) fyller bredden; rutan följer bildens form så hörnen rundar själva bilden.
    Object.defineProperty(img, 'naturalWidth', { configurable: true, value: 400 })
    Object.defineProperty(img, 'naturalHeight', { configurable: true, value: 200 })
    act(() => { img.dispatchEvent(new Event('load')) })
    expect(box.style.getPropertyValue('--logo-w')).toBe('228px')
    expect(box.style.getPropertyValue('--logo-h')).toBe('114px')
    // En hög logga (1:2) fyller höjden.
    Object.defineProperty(img, 'naturalWidth', { configurable: true, value: 100 })
    Object.defineProperty(img, 'naturalHeight', { configurable: true, value: 200 })
    act(() => { img.dispatchEvent(new Event('load')) })
    expect(box.style.getPropertyValue('--logo-w')).toBe('69px')
    expect(box.style.getPropertyValue('--logo-h')).toBe('138px')
  })
  it('bar logga utan bild: initialerna ljusa på det mörka kortet', () => {
    render(<LogoPlate bare channel={ch} width={228} height={138} />)
    const plate = screen.getByTestId('logo-plate')
    expect(plate).toHaveTextContent('SS')
    const initials = plate.querySelector('span[aria-hidden="true"]') as HTMLElement
    expect(initials.style.color).not.toBe('#3a3f4c')
    expect(initials.style.color).toMatch(/243, 244, 248|#f3f4f8/)
  })
})
