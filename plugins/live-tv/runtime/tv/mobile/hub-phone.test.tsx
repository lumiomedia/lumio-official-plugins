import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { mountPhone } from './__phone-mount'
import { getActivePlaylistId } from '../tv-settings-store'

// Spelaren behöver inte finnas för att hubben ska ritas.
vi.mock('../../live-tv-player', () => ({ LiveTvPlayer: () => null }))

describe('Hubben på telefon', () => {
  it('ett spotlight-kort, sökfält, flik-rad, ingen klocka och ingen ikonrad', async () => {
    mountPhone({ view: 'hub' })
    expect(await screen.findByTestId('hub-spotlight')).toBeInTheDocument()
    expect(screen.getAllByTestId('hub-spotlight')).toHaveLength(1)
    expect(screen.getByTestId('hub-search')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-tab-bar')).toBeInTheDocument()
    expect(screen.queryByTestId('hub-clock')).toBeNull()
    expect(screen.queryByTestId('tv-rail')).toBeNull()
  })
  it('spotlighten är ETT kort (spotlight[0]), inte ett rutnät', async () => {
    mountPhone({ view: 'hub' })
    const card = await screen.findByTestId('hub-spotlight')
    expect(card.style.display).not.toBe('grid')
    expect(card).toHaveAttribute('data-f')
    // Favoriten A är spotlight (favourite före recent/onNow), och kortet bär kanalnamnet.
    expect(card).toHaveTextContent('A')
  })
  it('sökfältet går till sökvyn', async () => {
    const { onNavigate } = mountPhone({ view: 'hub' })
    fireEvent.click(await screen.findByTestId('hub-search'))
    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'search' } })
  })
  it('Alla kanaler i två kolumner med chips; Visa fler laddar nästa steg', async () => {
    mountPhone({ view: 'hub' })
    const grid = await screen.findByTestId('all-channels')
    expect(grid.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))')
    expect(grid.querySelectorAll('[data-f]')).toHaveLength(3)
    expect(screen.getByTestId('chip-Sport')).toBeInTheDocument()
    // Tre kanaler ryms i första steget: ingen Visa fler.
    expect(screen.queryByTestId('show-more')).toBeNull()
    fireEvent.click(screen.getByTestId('chip-News'))
    expect(grid.querySelectorAll('[data-f]')).toHaveLength(1)
  })
  it('Visa fler visar nästa steg när listan är längre än ett steg', async () => {
    const big = { id: 'l2', name: 'Big', channels: Array.from({ length: 40 }, (_, i) => ({ name: `K${i}`, logo: null, group: 'Grp', url: `http://x/K${i}`, tvgId: null })), createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }
    mountPhone({ view: 'hub' }, { lists: [big], pins: [] })
    const grid = await screen.findByTestId('all-channels')
    expect(grid.querySelectorAll('[data-f]')).toHaveLength(36)
    const more = screen.getByTestId('show-more')
    expect(more).toHaveStyle({ minHeight: '44px' })
    fireEvent.click(more)
    expect(grid.querySelectorAll('[data-f]')).toHaveLength(40)
    expect(screen.queryByTestId('show-more')).toBeNull()
  })
  it('favoritbandet sidoscrollar med snap och öppnar kanalen', async () => {
    const { onNavigate } = mountPhone({ view: 'hub' })
    const row = await screen.findByTestId('hub-favourites')
    expect(row.style.scrollSnapType).toBe('x mandatory')
    const cards = row.querySelectorAll('[data-f]')
    expect(cards).toHaveLength(1)
    fireEvent.click(cards[0])
    expect(onNavigate).toHaveBeenCalledWith(expect.objectContaining({ params: expect.objectContaining({ view: 'channel' }) }))
  })
  it('spellistpillen öppnar ett ark och valet byter aktiv lista', async () => {
    mountPhone({ view: 'hub' })
    const pill = await screen.findByTestId('playlist-pill')
    expect(pill).toHaveTextContent('All playlists')
    fireEvent.click(pill)
    const sheet = await screen.findByRole('dialog')
    expect(within(sheet).getByText('All playlists')).toBeInTheDocument()
    fireEvent.click(within(sheet).getByText('Xtream'))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    // Valet skrivs till lagringen. Pillens text följer INTE med utanför
    // TV-läget: modellen (`live-tv-model.ts`) grindar `activeList` med
    // `useTvMode()` — en känd begränsning som ligger utanför hubben.
    expect(getActivePlaylistId()).toBe('l1')
  })
  it('arkets sista post går till spellistinställningarna', async () => {
    const { onNavigate } = mountPhone({ view: 'hub' })
    fireEvent.click(await screen.findByTestId('playlist-pill'))
    const sheet = await screen.findByRole('dialog')
    fireEvent.click(within(sheet).getByText('+ Add playlist…'))
    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'settings', tab: 'playlists' } })
  })
  it('renderar inga fjärrkontrollstexter', async () => {
    const { box } = mountPhone({ view: 'hub' })
    await screen.findByTestId('hub-spotlight')
    expect(box.textContent).not.toMatch(/\bOK\b|håll|hold OK/)
  })
  it('tomt läge: centrerad rubrik, brödtext och 48 px-knapp till inställningarna', async () => {
    const { onNavigate } = mountPhone({ view: 'hub' }, { lists: [], pins: [] })
    const button = await screen.findByText('Open settings')
    expect(button).toHaveStyle({ minHeight: '48px' })
    expect(screen.getByText('No channels yet')).toBeInTheDocument()
    fireEvent.click(button)
    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'settings' } })
  })
})
