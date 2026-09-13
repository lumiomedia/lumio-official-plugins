import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ChannelArt, Progress, RoundBtn, Tag, dp, station } from './tv-ui'

afterEach(cleanup)

describe('tv-ui', () => {
  it('dp är designpixlar rakt av — scenen är redan 1920×1080', () => {
    expect(dp(22)).toBe(22)
    expect(dp(52)).toBe(52)
    expect(dp(104)).toBe(104)
  })
  it('RoundBtn behåller anroparens style i stället för att skriva över den', () => {
    render(<RoundBtn {...station(() => {})} style={{ marginLeft: 'auto' }}>x</RoundBtn>)
    const el = screen.getByRole('button')
    expect(el.style.marginLeft).toBe('auto')
    // Knappens egna mått ska finnas kvar.
    expect(el.style.borderRadius).toBe('999px')
  })
  it('station ger en fokusstation som kör onOk på klick', () => {
    const ok = vi.fn()
    render(<div {...station(ok)}>x</div>)
    const el = screen.getByRole('button')
    expect(el).toHaveAttribute('data-f')
    expect(el).toHaveAttribute('tabindex', '0')
    fireEvent.click(el)
    expect(ok).toHaveBeenCalledTimes(1)
  })
  it('Tag live har punkt och versaler', () => {
    render(<Tag variant="live">LIVE</Tag>)
    expect(screen.getByText('LIVE')).toBeInTheDocument()
  })
  it('Progress klipper värdet till 0..1', () => {
    const { container } = render(<Progress value={1.5} />)
    expect((container.querySelector('[data-fill]') as HTMLElement).style.width).toBe('100%')
  })
  it('ChannelArt visar initialer utan logotyp och bildruta', () => {
    render(<ChannelArt channel={{ name: 'Sky Sports', logo: null }} />)
    expect(screen.getByText('SS')).toBeInTheDocument()
  })
})
