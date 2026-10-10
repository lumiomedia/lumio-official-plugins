import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { localDayKey, shiftDay } from '../sport-epg'
import { getOverrides, getSportSettings } from '../sport-store'
import { HOUR, MIN, fxMatch, mountSport } from '../__sport-fixture'

vi.mock('../../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))

const now = Date.now()
const today = localDayKey(now)
const live = fxMatch({ id: 'live', home: 'GAIS', away: 'Sirius', start: now - 30 * MIN, stop: now + 90 * MIN })
const later = fxMatch({ id: 'later', home: 'AIK', away: 'Hammarby', start: now + 2 * HOUR })
const shl = fxMatch({ id: 'shl', kind: 'hockey', league: 'SHL', leagueKey: 'shl', home: 'HV71', away: 'Brynäs', start: now + 3 * HOUR })

describe('Sportskalet', () => {
  it('rubrik med sammanfattning, hero, exakt en data-init', async () => {
    mountSport({}, { days: { [today]: [live, later] } })
    expect(await screen.findByTestId('sport-hero')).toHaveTextContent('GAIS')
    expect(screen.getByTestId('sport-summary')).toHaveTextContent('Today · 2 matches · 1 live')
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
  })
  it('Visa som Flöde sparas i sportinställningarna', async () => {
    mountSport({}, { days: { [today]: [live, later] } })
    await screen.findByTestId('sport-hero')
    fireEvent.click(screen.getByText('Feed'))
    expect(getSportSettings().view).toBe('feed')
    expect(await screen.findByTestId('feed-teams')).toBeInTheDocument()
  })
  it('dagbrickan Imorgon hämtar morgondagen', async () => {
    const { fetchSpy } = mountSport({}, { days: { [today]: [live] } })
    await screen.findByTestId('sport-hero')
    fireEvent.click(screen.getByTestId('sport-day-1'))
    expect(await screen.findByTestId('sport-empty')).toBeInTheDocument()
    expect(screen.getByTestId('sport-summary')).toHaveTextContent('Tomorrow · 0 matches · 0 live')
    const days = fetchSpy.mock.calls.map((call) => new URL(String(call[0]), 'http://localhost').searchParams.get('day'))
    expect(days).toContain(shiftDay(today, 1))
  })
  it('sportknappar bara för sporter med matcher; Alla sporter visar antal och filtrerar', async () => {
    mountSport({}, { days: { [today]: [live, later, shl] } })
    await screen.findByTestId('sport-hero')
    expect(screen.getByTestId('sport-chip-football')).toBeInTheDocument()
    expect(screen.getByTestId('sport-chip-hockey')).toBeInTheDocument()
    expect(screen.queryByTestId('sport-chip-tennis')).toBeNull()
    fireEvent.click(screen.getByTestId('sport-all'))
    const panel = await screen.findByTestId('choice-panel')
    expect(within(panel).getByTestId('choice-row-Football')).toHaveTextContent('2')
    fireEvent.click(within(panel).getByTestId('choice-row-Ice hockey'))
    await waitFor(() => expect(screen.getByTestId('sport-summary')).toHaveTextContent('Today · 1 matches · 0 live'))
  })
  it('en äldre app utan endpointen får ett besked, inte en evig laddning', async () => {
    mountSport({}, { days: 'missing' })
    expect(await screen.findByTestId('sport-missing')).toHaveTextContent('Sport needs a newer version of Lumio.')
  })
  it('Titta i hero spelar bästa källan', async () => {
    mountSport({}, { days: { [today]: [live] } })
    fireEvent.click(await screen.findByTestId('sport-hero-watch'))
    expect(await screen.findByTestId('player')).toHaveTextContent('TV4 Fotboll FHD SE')
  })
  it('kortet öppnar matchcentret; Välj annan kanal sparar åsidosättningen; Bakåt stänger lager för lager', async () => {
    const { onNavigate } = mountSport({}, { days: { [today]: [live, later] } })
    await screen.findByTestId('sport-hero')
    fireEvent.click(within(screen.getByTestId('sport-section-later')).getByTestId('sport-card'))
    expect(await screen.findByTestId('match-center')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('mc-pick-channel'))
    fireEvent.click(await screen.findByTestId('picker-row-A'))
    expect(getOverrides().later?.name).toBe('A')
    await waitFor(() => expect(screen.queryByTestId('channel-picker')).toBeNull())
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByTestId('match-center')).toBeNull())
    expect(onNavigate).not.toHaveBeenCalled()
  })
  it('rälsens Sport-post navigerar till sportvyn', async () => {
    const { onNavigate } = mountSport({ view: 'hub' }, { days: {} })
    fireEvent.click(screen.getByTestId('rail-sport'))
    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'sport' } })
  })
})
