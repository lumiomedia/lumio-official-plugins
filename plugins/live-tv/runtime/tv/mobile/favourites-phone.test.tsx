import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
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

  it('tomt läge: centrerad tomtext utan fjärrkontrollsord', async () => {
    const { box } = mountPhone({ view: 'favs' }, { pins: [] })
    expect(await screen.findByText('No favourites yet. Add channels from the guide.')).toBeInTheDocument()
    expect(screen.queryByTestId('fav-row')).toBeNull()
    expect(box.textContent).not.toMatch(/OK|hold|håll/i)
  })

  it('inga fjärrkontrollstexter', async () => {
    const { box } = mountPhone({ view: 'favs' }, { pins: twoPins })
    await screen.findAllByTestId('fav-row')
    expect(box.textContent).not.toMatch(/\bOK\b|håll|hold OK/)
  })
})
