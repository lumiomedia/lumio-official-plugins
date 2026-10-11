import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../../live-tv-data'
import { SPORT_FOLLOWS_KEY, getFollows, getSportSettings, type SportFollow } from '../sport-store'
import { FollowPicker, SportFollows } from './sport-follows'
import { HOUR, MIN, fakeCtx, fxDay, fxMatch } from '../__sport-fixture'

const h = vi.hoisted(() => ({ search: vi.fn() }))
vi.mock('../follow-search', () => ({ searchProviderTeams: h.search }))

afterEach(cleanup)
const now = new Date(2026, 9, 10, 18, 0).getTime()
const ham = fxMatch({ id: 'ham', home: 'AIK', away: 'Hammarby', start: now + 110 * MIN })
const cl = fxMatch({ id: 'cl', league: 'Champions League', leagueKey: 'uefa-champions-league', home: 'FC Barcelona', away: 'Paris SG', homeKey: 'barcelona', start: now - 30 * MIN })
const shl = fxMatch({ id: 'shl', kind: 'hockey', league: 'SHL', leagueKey: 'shl', home: 'Frölunda', away: 'Färjestad', homeKey: 'frolunda', awayKey: 'farjestad', start: now + 24 * HOUR })
const days = [fxDay('d0', [ham, cl]), fxDay('d1', [shl])]
const follows: SportFollow[] = [
  { sport: 'football', kind: 'team', key: 'hammarby', name: 'Hammarby' },
  { sport: 'football', kind: 'league', key: 'uefa-champions-league', name: 'Champions League' },
  { sport: 'hockey', kind: 'team', key: 'frolunda', name: 'Frölunda' },
]
beforeEach(() => {
  __resetForTests()
  writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_FOLLOWS_KEY, follows)
})

describe('Följer', () => {
  it('grupper per sport med nästa match', () => {
    render(<SportFollows ctx={fakeCtx({ now, follows })} days={days} />)
    const football = screen.getByTestId('follow-group-football')
    const cards = within(football).getAllByTestId('follow-card')
    expect(cards[0]).toHaveTextContent(/Hammarby.*Today \d\d:\d\d · vs AIK/)
    expect(cards[1]).toHaveTextContent('LIVE now · FC Barcelona - Paris SG')
    expect(within(screen.getByTestId('follow-group-hockey')).getByTestId('follow-card')).toHaveTextContent(/Tomorrow \d\d:\d\d · vs Färjestad/)
    expect(screen.getByText('3 followed · notice 15 min before')).toBeInTheDocument()
  })
  it('stjärnan avföljer, kortet dämpas men ligger kvar', () => {
    const { rerender } = render(<SportFollows ctx={fakeCtx({ now, follows })} days={days} />)
    fireEvent.click(within(screen.getAllByTestId('follow-card')[0]!).getByTestId('follow-star'))
    expect(getFollows().map((f) => f.key)).toEqual(['uefa-champions-league', 'frolunda'])
    rerender(<SportFollows ctx={fakeCtx({ now, follows: getFollows() })} days={days} />)
    const first = screen.getAllByTestId('follow-card')[0]!
    expect(first).toHaveTextContent('Hammarby')
    expect(first.getAttribute('data-following')).toBe('0')
  })
  it('avsparksnotisen sparas', () => {
    render(<SportFollows ctx={fakeCtx({ now, follows })} days={days} />)
    fireEvent.click(within(screen.getByTestId('follows-alert')).getByText('At kick-off'))
    expect(getSportSettings().alert).toBe('kickoff')
    expect(screen.getByText('Notices only arrive while Lumio is running.')).toBeInTheDocument()
  })
  it('tomt läge och Lägg till', () => {
    const ctx = fakeCtx({ now, follows: [] })
    render(<SportFollows ctx={ctx} days={days} />)
    expect(screen.getByTestId('follows-empty')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('follows-add'))
    expect(ctx.openFollowPicker).toHaveBeenCalled()
  })
})

describe('Följväljaren', () => {
  it('lag och turneringar ur EPG:t, filter per sport, rad växlar följning', () => {
    __resetForTests()
    const ctx = fakeCtx({ now })
    render(<FollowPicker ctx={ctx} days={[null, ...days]} onClose={() => {}} />)
    expect(screen.getByTestId('follow-picker')).toBeInTheDocument()
    expect(screen.getByTestId('follow-row-aik')).toBeInTheDocument()
    expect(screen.getByTestId('follow-row-shl')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('follow-row-aik'))
    expect(getFollows()).toEqual([{ sport: 'football', kind: 'team', key: 'aik', name: 'AIK' }])
    fireEvent.click(screen.getByTestId('follow-chip-hockey'))
    expect(screen.queryByTestId('follow-row-aik')).toBeNull()
    expect(screen.getByTestId('follow-row-frolunda')).toBeInTheDocument()
    expect(ctx.nav.pushLayer).toHaveBeenCalledTimes(1)
  })
  it('sök i källan: skickas med Enter, träffen sparas med providerIds', async () => {
    __resetForTests()
    h.search.mockResolvedValue([{ id: '375', name: 'Malmö FF', crest: 'https://m/375.png', country: 'Sweden' }])
    const ctx = fakeCtx({ now, settings: { view: 'matchday', alert: '15', apiKey: 'k123', provider: 'api-sports' } as never })
    render(<FollowPicker ctx={ctx} days={[null, ...days]} onClose={() => {}} />)
    const input = screen.getByTestId('follow-search') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'malmo' } })
    expect(h.search).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(screen.getByTestId('follow-hit-375')).toBeInTheDocument())
    expect(h.search).toHaveBeenCalledWith('football', 'malmo')
    fireEvent.click(screen.getByTestId('follow-hit-375'))
    expect(getFollows()).toEqual([{ sport: 'football', kind: 'team', key: 'malmo ff', name: 'Malmö FF', providerIds: { 'api-sports': '375' } }])
  })
})
