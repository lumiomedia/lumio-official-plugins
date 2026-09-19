import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { TV_SCENE_PHONE_ATTR } from '@/lib/plugin-sdk'
import { channelKey, getPinnedLiveTvKeys } from '../../live-tv-data'
import { mountPhone, phoneChannel } from './__phone-mount'

// Spelaren (runtime/live-tv-player, två steg upp) mockas till en markör så
// att "tryck på rad spelar" kan läsas av.
vi.mock('../../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))

const twoPins = [channelKey(phoneChannel('A', 'Sport')), channelKey(phoneChannel('B', 'Sport'))]

describe('Favoriter på telefon', () => {
  it('visar favoriterna numrerade i sparad ordning', async () => {
    mountPhone({ view: 'favs' }, { pins: twoPins })
    const rows = await screen.findAllByTestId('fav-row')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('1')
    expect(rows[0]).toHaveTextContent('A')
    expect(rows[1]).toHaveTextContent('2')
    expect(rows[1]).toHaveTextContent('B')
    expect(screen.queryAllByTestId('fav-handle')).toHaveLength(0)
  })

  it('Edit visar drag-handtag på varje rad och Klar/Done döljer dem igen', async () => {
    mountPhone({ view: 'favs' }, { pins: twoPins })
    fireEvent.click(await screen.findByText('Edit'))
    expect(screen.getAllByTestId('fav-handle')).toHaveLength(2)
    fireEvent.click(screen.getByText('Done'))
    expect(screen.queryAllByTestId('fav-handle')).toHaveLength(0)
  })

  it('tryck på rad spelar (ej i redigeringsläge)', async () => {
    mountPhone({ view: 'favs' }, { pins: twoPins })
    fireEvent.click((await screen.findAllByTestId('fav-row'))[0])
    expect(await screen.findByTestId('player')).toHaveTextContent('A')
  })

  it('tryck på rad spelar inte i redigeringsläge', async () => {
    mountPhone({ view: 'favs' }, { pins: twoPins })
    fireEvent.click(await screen.findByText('Edit'))
    fireEvent.click(screen.getAllByTestId('fav-row')[0])
    expect(screen.queryByTestId('player')).toBeNull()
  })

  it('+ Add from the guide navigerar till guiden med group all', async () => {
    const { onNavigate } = mountPhone({ view: 'favs' }, { pins: twoPins })
    fireEvent.click(await screen.findByText('+ Add from the guide'))
    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'guide', group: 'all' } })
  })

  it('drag om-ordnar och skriver pinnedKeys', async () => {
    mountPhone({ view: 'favs' }, { pins: twoPins })
    fireEvent.click(await screen.findByText('Edit'))
    const handle = screen.getAllByTestId('fav-handle')[0]
    fireEvent.pointerDown(handle, { clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(window, { clientY: 200 })
    fireEvent.pointerUp(window)
    expect(getPinnedLiveTvKeys()).toEqual([twoPins[1], twoPins[0]])
  })

  // Slutgranskningen: en fäst nyckel utan upplöst kanal (spellistan borta) får
  // inte förskjuta draget — flytten går mot nyckelindex, inte radindex.
  it('drag med oupplöst fäst nyckel flyttar rätt nyckel', async () => {
    const ghost = 'ghost::http://x/ghost'
    mountPhone({ view: 'favs' }, { pins: [twoPins[0], ghost, twoPins[1]] })
    fireEvent.click(await screen.findByText('Edit'))
    expect(screen.getAllByTestId('fav-row')).toHaveLength(2)
    const handle = screen.getAllByTestId('fav-handle')[0]
    fireEvent.pointerDown(handle, { clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(window, { clientY: 200 })
    fireEvent.pointerUp(window)
    expect(getPinnedLiveTvKeys()).toEqual([ghost, twoPins[1], twoPins[0]])
  })

  it('tomt läge: centrerad tomtext utan fjärrkontrollsord', async () => {
    const { box } = mountPhone({ view: 'favs' }, { pins: [] })
    expect(await screen.findByText('No favourites yet. Add channels from the guide.')).toBeInTheDocument()
    expect(screen.queryByTestId('fav-row')).toBeNull()
    // Bara SYNLIG text. `box.textContent` svepte tidigare med den injicerade
    // <style>-taggen, och /OK/i träffar inne i ord som "fokus" — vilken svensk
    // CSS-kommentar som helst kunde alltså fälla testet utan att något i
    // gränssnittet ändrats.
    const visible = [...box.querySelectorAll('*')]
      .filter((el) => el.tagName !== 'STYLE' && el.tagName !== 'SCRIPT')
      .map((el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' '))
      .join(' ')
    expect(visible).not.toMatch(/\bOK\b|\bhold\b|\bhåll\b/i)
  })

  it('inga fjärrkontrollstexter', async () => {
    const { box } = mountPhone({ view: 'favs' }, { pins: twoPins })
    await screen.findAllByTestId('fav-row')
    expect(box.textContent).not.toMatch(/\bOK\b|håll|hold OK/)
  })

  // Slutgranskningen: `phone` kan slå om vid körning (rotation). Telefon- och
  // skrivbordsgrenen är två komponenter, så bytet får inte ge "rendered more
  // hooks" — skrivbordets kort ska bara dyka upp.
  it('phone-flaggan slår om vid körning utan hook-krasch (telefon → skrivbord)', async () => {
    const { box } = mountPhone({ view: 'favs' }, { pins: twoPins })
    await screen.findAllByTestId('fav-row')
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => { act(() => { box.removeAttribute(TV_SCENE_PHONE_ATTR) }) }).not.toThrow()
    await waitFor(() => expect(screen.getAllByTestId('fav-card')).toHaveLength(2))
    expect(screen.queryByTestId('fav-row')).toBeNull()
    expect(errors.mock.calls.some((c) => String(c[0]).includes('hooks'))).toBe(false)
    errors.mockRestore()
  })
})
