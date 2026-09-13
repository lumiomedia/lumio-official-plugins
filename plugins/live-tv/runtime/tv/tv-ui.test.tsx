import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ChannelArt, Progress, Tag, dp, station } from './tv-ui'

afterEach(cleanup)

describe('tv-ui', () => {
  it('dp delar med 1,54 och rundar', () => {
    expect(dp(22)).toBe(14)
    expect(dp(52)).toBe(34)
    expect(dp(104)).toBe(68)
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
