import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { localDayKey } from '../sport-epg'
import { getFollows, getSportSettings } from '../sport-store'
import { HOUR, MIN, fxMatch, mountSport } from '../__sport-fixture'
import { mountPhone } from '../../tv/mobile/__phone-mount'

vi.mock('../../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))

const now = Date.now()
const today = localDayKey(now)
const live = fxMatch({ id: 'live', home: 'GAIS', away: 'Sirius', start: now - 30 * MIN, stop: now + 90 * MIN })
const later = fxMatch({ id: 'later', home: 'AIK', away: 'Hammarby', start: now + 2 * HOUR })
const REMOTE_WORDS = /\bOK\b|håll OK|hold OK|◂|▸/

describe('Sport på telefon', () => {
  it('listor per status utan fjärrkontrollsord; tryck öppnar arket och Titta spelar', async () => {
    const { box } = mountSport({}, { phone: true, days: { [today]: [live, later] } })
    const rows = await screen.findAllByTestId('sport-phone-row')
    expect(rows).toHaveLength(2)
    expect(box.textContent).not.toMatch(REMOTE_WORDS)
    fireEvent.click(rows[0]!)
    const sheet = await screen.findByTestId('sport-phone-sheet')
    fireEvent.click(within(sheet).getByText('Watch on TV4 Fotboll FHD SE · FHD'))
    expect(await screen.findByTestId('player')).toHaveTextContent('TV4 Fotboll FHD SE')
  })
  it('arket följer hemmalaget', async () => {
    mountSport({}, { phone: true, days: { [today]: [later] } })
    fireEvent.click(await screen.findByTestId('sport-phone-row'))
    fireEvent.click(within(await screen.findByTestId('sport-phone-sheet')).getByText('Add AIK to favourites'))
    expect(getFollows()).toEqual([{ sport: 'football', kind: 'team', key: 'aik', name: 'AIK' }])
  })
  it('Mina lag: nästa match, påminnelse och Lägg till', async () => {
    mountSport({}, { phone: true, days: { [today]: [later] }, follows: [{ sport: 'football', kind: 'team', key: 'hammarby', name: 'Hammarby' }] })
    fireEvent.click(await screen.findByText('My teams'))
    await waitFor(() => expect(screen.getByTestId('sport-phone-follow')).toHaveTextContent(/Hammarby.*Today \d\d:\d\d · vs AIK/))
    fireEvent.click(within(screen.getByTestId('sport-phone-alert')).getByText('Off'))
    expect(getSportSettings().alert).toBe('off')
    fireEvent.click(screen.getByTestId('sport-phone-add'))
    const sheet = await screen.findByTestId('sport-phone-follow-sheet')
    fireEvent.click(within(sheet).getByText(/^AIK · Football$/))
    await waitFor(() => expect(getFollows().map((f) => f.key)).toContain('aik'))
  })
  it('Resultat är ett tredje segment och visar nyckelkortet utan nyckel', async () => {
    mountSport({}, { phone: true, days: { [today]: [later] } })
    fireEvent.click(await screen.findByText('Results'))
    expect(await screen.findByTestId('sport-key-card-tab')).toBeTruthy()
    expect(screen.getByTestId('sport-phone-days')).toBeTruthy() // dagchipsen gäller även Resultat
  })
  it('Mer-arket har Sport', async () => {
    const { onNavigate } = mountPhone({ view: 'hub' })
    fireEvent.click(screen.getByTestId('tab-more'))
    fireEvent.click(within(await screen.findByRole('dialog')).getByText('Sport'))
    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'sport' } })
  })
})
