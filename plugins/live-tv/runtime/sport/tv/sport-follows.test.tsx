import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../../live-tv-data'
import { SPORT_FOLLOWS_KEY, getFollows, getSportSettings, type SportFollow } from '../sport-store'
import { FollowPicker, SportFollows } from './sport-follows'
import { followNext } from '../sport-ctx'
import { HOUR, MIN, fakeCtx, fxDay, fxMatch } from '../__sport-fixture'

const h = vi.hoisted(() => ({ search: vi.fn() }))
vi.mock('../follow-search', async (orig) => ({ ...(await orig<typeof import('../follow-search')>()), searchFollowTargets: h.search }))

afterEach(cleanup)
const now = new Date(2026, 9, 10, 18, 0).getTime()
const ham = fxMatch({ id: 'ham', home: 'AIK', away: 'Hammarby', awayCrest: 'https://c/hammarby.png', start: now + 110 * MIN })
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

describe('followNext', () => {
  it('delar nästa match i när (stort) och vad (motståndare eller matchtitel)', () => {
    const ctx = fakeCtx({ now })
    expect(followNext(ctx, follows[0]!, ham)).toEqual({ when: expect.stringMatching(/^Today \d\d:\d\d$/), what: 'vs AIK', live: false })
    expect(followNext(ctx, follows[1]!, cl)).toEqual({ when: 'LIVE now', what: 'FC Barcelona - Paris SG', live: true })
    expect(followNext(ctx, follows[2]!, shl)).toEqual({ when: expect.stringMatching(/^Tomorrow \d\d:\d\d$/), what: 'vs Färjestad', live: false })
    expect(followNext(ctx, follows[0]!, null)).toBeNull()
  })
})

describe('Mina lag', () => {
  it('liggande rader per sport: märket till vänster, nästa match som huvudinfo, hjärta till höger', () => {
    render(<SportFollows ctx={fakeCtx({ now, follows })} days={days} />)
    const football = screen.getByTestId('follow-group-football')
    const rows = within(football).getAllByTestId('follow-row')
    expect(rows[0]).toHaveTextContent('Hammarby')
    expect(rows[0]).toHaveTextContent('Football')
    expect(within(rows[0]!).getByTestId('follow-next')).toHaveTextContent(/Today \d\d:\d\d\s*vs AIK/)
    // Lagets riktiga märke när någon match har det, annars initialcirkeln.
    expect(rows[0]!.querySelector('img[data-crest]')).not.toBeNull()
    expect(rows[1]!.querySelector('[data-crest]')).not.toBeNull()
    const live = within(rows[1]!).getByTestId('follow-next')
    expect(live).toHaveTextContent(/LIVE now\s*FC Barcelona - Paris SG/)
    expect(live.getAttribute('data-live')).toBe('1')
    expect(within(screen.getByTestId('follow-group-hockey')).getByTestId('follow-next')).toHaveTextContent(/Tomorrow \d\d:\d\d\s*vs Färjestad/)
    const heart = within(rows[0]!).getByTestId('follow-heart')
    expect(heart.getAttribute('aria-pressed')).toBe('true')
    expect(heart.getAttribute('aria-label')).toBe('Remove Hammarby from favourites')
    expect(heart.querySelector('svg path')?.getAttribute('d')).toMatch(/^M12 21s/) // Live TV:s favorithjärta
    expect(screen.getByText('3 favourites · reminder 15 min before')).toBeInTheDocument()
  })
  it('hjärtat tar bort favoriten, raden dämpas men ligger kvar', () => {
    const { rerender } = render(<SportFollows ctx={fakeCtx({ now, follows })} days={days} />)
    fireEvent.click(within(screen.getAllByTestId('follow-row')[0]!).getByTestId('follow-heart'))
    expect(getFollows().map((f) => f.key)).toEqual(['uefa-champions-league', 'frolunda'])
    rerender(<SportFollows ctx={fakeCtx({ now, follows: getFollows() })} days={days} />)
    const first = screen.getAllByTestId('follow-row')[0]!
    expect(first).toHaveTextContent('Hammarby')
    expect(first.getAttribute('data-following')).toBe('0')
    expect(within(first).getByTestId('follow-heart').getAttribute('aria-label')).toBe('Add Hammarby to favourites')
  })
  it('påminnelsen sparas', () => {
    render(<SportFollows ctx={fakeCtx({ now, follows })} days={days} />)
    fireEvent.click(within(screen.getByTestId('follows-alert')).getByText('At kick-off'))
    expect(getSportSettings().alert).toBe('kickoff')
    expect(screen.getByText('Reminders only show while Lumio is running.')).toBeInTheDocument()
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
    const { rerender } = render(<FollowPicker ctx={ctx} days={[null, ...days]} onClose={() => {}} />)
    expect(screen.getByTestId('follow-picker')).toBeInTheDocument()
    expect(screen.getByTestId('follow-row-aik')).toBeInTheDocument()
    expect(screen.getByTestId('follow-row-shl')).toBeInTheDocument()
    expect(within(screen.getByTestId('follow-row-aik')).getByTestId('follow-row-heart').getAttribute('data-on')).toBe('0')
    fireEvent.click(screen.getByTestId('follow-row-aik'))
    expect(getFollows()).toEqual([{ sport: 'football', kind: 'team', key: 'aik', name: 'AIK' }])
    rerender(<FollowPicker ctx={ctx} days={[null, ...days]} onClose={() => {}} />)
    expect(within(screen.getByTestId('follow-row-aik')).getByTestId('follow-row-heart').getAttribute('data-on')).toBe('1')
    fireEvent.click(screen.getByTestId('follow-chip-hockey'))
    expect(screen.queryByTestId('follow-row-aik')).toBeNull()
    expect(screen.getByTestId('follow-row-frolunda')).toBeInTheDocument()
    expect(ctx.nav.pushLayer).toHaveBeenCalledTimes(1)
  })
  it('skrivandet filtrerar listan direkt, accentokänsligt', () => {
    __resetForTests()
    render(<FollowPicker ctx={fakeCtx({ now })} days={[null, ...days]} onClose={() => {}} />)
    const input = screen.getByTestId('follow-search') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'frol' } })
    expect(screen.getByTestId('follow-row-frolunda')).toBeInTheDocument()
    expect(screen.queryByTestId('follow-row-aik')).toBeNull()
    expect(screen.queryByTestId('follow-row-allsvenskan')).toBeNull()
    fireEvent.change(input, { target: { value: 'Milan' } })
    expect(screen.queryByTestId('follow-row-aik')).toBeNull()
    expect(screen.queryByTestId('follow-row-shl')).toBeNull()
  })
  it('sökfältet finns även utan nyckel (lokal filtrering), men källan frågas inte', () => {
    vi.useFakeTimers()
    try {
      __resetForTests()
      h.search.mockReset()
      render(<FollowPicker ctx={fakeCtx({ now })} days={[null, ...days]} onClose={() => {}} />)
      fireEvent.change(screen.getByTestId('follow-search'), { target: { value: 'Milan' } })
      act(() => { vi.advanceTimersByTime(1000) })
      expect(h.search).not.toHaveBeenCalled()
    } finally { vi.useRealTimers() }
  })
  it('sök i källan: en gång efter 400 ms paus, minst 3 tecken; träffen sparas med providerIds', async () => {
    vi.useFakeTimers()
    try {
      __resetForTests()
      h.search.mockReset()
      h.search.mockResolvedValue([
        { kind: 'team', sport: 'football', id: '489', name: 'AC Milan', crest: 'https://m/489.png', country: 'Italy' },
        { kind: 'league', sport: 'football', id: '135', name: 'Serie A', crest: null, country: 'Italy' },
      ])
      const ctx = fakeCtx({ now, settings: { view: 'matchday', alert: '15', apiKey: 'k123', provider: 'api-sports' } as never })
      render(<FollowPicker ctx={ctx} days={[null, ...days]} onClose={() => {}} />)
      const input = screen.getByTestId('follow-search') as HTMLInputElement
      fireEvent.change(input, { target: { value: 'Mi' } })
      act(() => { vi.advanceTimersByTime(1000) })
      expect(h.search).not.toHaveBeenCalled()
      for (const v of ['Mil', 'Mila', 'Milan']) {
        fireEvent.change(input, { target: { value: v } })
        act(() => { vi.advanceTimersByTime(100) })
      }
      expect(h.search).not.toHaveBeenCalled()
      await act(async () => { vi.advanceTimersByTime(400) })
      expect(h.search).toHaveBeenCalledTimes(1)
      expect(h.search).toHaveBeenCalledWith('football', 'Milan')
      const hit = screen.getByTestId('follow-hit-team-489')
      expect(hit).toHaveTextContent('AC Milan')
      expect(hit).toHaveTextContent('Football · Italy')
      fireEvent.click(hit)
      fireEvent.click(screen.getByTestId('follow-hit-league-135'))
      expect(getFollows()).toEqual([
        { sport: 'football', kind: 'team', key: 'ac milan', name: 'AC Milan', providerIds: { 'api-sports': '489' } },
        { sport: 'football', kind: 'league', key: 'fx:api-sports:135', name: 'Serie A', providerIds: { 'api-sports': '135' } },
      ])
    } finally { vi.useRealTimers() }
  })
  it('källträffar som redan finns i listan visas inte två gånger', async () => {
    vi.useFakeTimers()
    try {
      __resetForTests()
      h.search.mockReset()
      h.search.mockResolvedValue([{ kind: 'team', sport: 'hockey', id: '7', name: 'Frölunda', crest: null, country: 'Sweden' }])
      const ctx = fakeCtx({ now, settings: { view: 'matchday', alert: '15', apiKey: 'k123', provider: 'api-sports' } as never })
      render(<FollowPicker ctx={ctx} days={[null, ...days]} onClose={() => {}} />)
      fireEvent.click(screen.getByTestId('follow-chip-hockey'))
      fireEvent.change(screen.getByTestId('follow-search'), { target: { value: 'Frolunda' } })
      await act(async () => { vi.advanceTimersByTime(400) })
      expect(h.search).toHaveBeenCalledWith('hockey', 'Frolunda')
      expect(screen.getByTestId('follow-row-frolunda')).toBeInTheDocument()
      expect(screen.queryByTestId('follow-hit-team-7')).toBeNull()
    } finally { vi.useRealTimers() }
  })
})
