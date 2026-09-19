import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { mountPhone } from './__phone-mount'
import { TV_SCENE_PHONE_ATTR } from '@/lib/plugin-sdk'

// Spelaren (runtime/live-tv-player, två steg upp) mockas till en markör —
// sök öppnar kanaldetalj/spelare via `nav.openChannel`, inte direkt play.
vi.mock('../../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))

const settle = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 0)) }) }

describe('Sök på telefon', () => {
  beforeEach(() => vi.useRealTimers())
  afterEach(() => vi.useRealTimers())

  it('systemtangentbord: <input> 16px, ingen TV-tangentbordspanel', async () => {
    mountPhone({ view: 'search' })
    const input = await screen.findByTestId('search-input')
    expect(input.tagName).toBe('INPUT')
    expect((input as HTMLInputElement).style.fontSize).toBe('16px')
    expect(screen.queryByTestId('tv-keyboard-panel')).toBeNull()
  })

  it('tomt läge (ingen fråga) visar centrerad hint', async () => {
    mountPhone({ view: 'search' })
    expect(await screen.findByText("Search channels and today's programmes")).toBeInTheDocument()
  })

  it('skriva en bokstav visar kanalträff som mobile-channel-row', async () => {
    mountPhone({ view: 'search' })
    const input = await screen.findByTestId('search-input')
    fireEvent.change(input, { target: { value: 'A' } })
    await settle()
    const rows = screen.getAllByTestId('mobile-channel-row')
    expect(rows.some((row) => row.textContent?.includes('A'))).toBe(true)
  })

  it('Cancel ropar skalets back (till hub)', async () => {
    const { onNavigate } = mountPhone({ view: 'search' })
    fireEvent.click(await screen.findByText('Cancel'))
    expect(onNavigate).toHaveBeenCalledWith(expect.objectContaining({ params: expect.objectContaining({ view: 'hub' }) }))
  })

  it('inga fjärrkontrollstexter', async () => {
    const { box } = mountPhone({ view: 'search' })
    await screen.findByTestId('search-input')
    expect(box.textContent).not.toMatch(/\bOK\b|håll|hold OK/)
  })

  // Slutgranskningen: `phone` kan slå om vid körning (rotation). Telefon- och
  // skrivbordsgrenen är två komponenter, så bytet får inte ge "rendered more
  // hooks" — skrivbordsvyn ska bara dyka upp.
  it('phone-flaggan slår om vid körning utan hook-krasch (telefon → skrivbord)', async () => {
    const { box } = mountPhone({ view: 'search' })
    await screen.findByTestId('search-phone')
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => { act(() => { box.removeAttribute(TV_SCENE_PHONE_ATTR) }) }).not.toThrow()
    await waitFor(() => expect(screen.getByTestId('search-view-root')).toBeInTheDocument())
    expect(screen.queryByTestId('search-phone')).toBeNull()
    expect(errors.mock.calls.some((c) => String(c[0]).includes('hooks'))).toBe(false)
    errors.mockRestore()
  })
})
