import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../../live-tv-data'
import { SPORT_OVERRIDES_KEY, getFollows, getOverrides } from '../sport-store'
import { SportMatchCenter } from './sport-match-center'
import { MIN, fakeCtx, fxMatch, fxSource } from '../__sport-fixture'

afterEach(cleanup)
beforeEach(() => __resetForTests())
const now = Date.now()
const m = fxMatch({
  id: 'm', home: 'FC Barcelona', away: 'Paris SG', homeKey: 'barcelona', awayKey: 'paris saint germain',
  league: 'Champions League', leagueKey: 'uefa-champions-league', venue: 'Estadi Olímpic', round: 5,
  start: now - 30 * MIN, stop: now + 90 * MIN,
  sources: [fxSource('V Sport Fotboll', { quality: 'FHD' }), fxSource('V Sport Fotboll HD', { quality: 'HD', sourceId: 'src-b' })],
})

describe('Matchcentret', () => {
  it('huvud, källor med BÄST och spellista, ett lager', () => {
    const ctx = fakeCtx({ now })
    render(<SportMatchCenter ctx={ctx} match={m} onClose={() => {}} />)
    const mc = screen.getByTestId('match-center')
    expect(mc).toHaveTextContent('LIVE')
    expect(mc).toHaveTextContent('Champions League · Estadi Olímpic · Round 5')
    const rows = screen.getAllByTestId('mc-source')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('V Sport Fotboll')
    expect(rows[0]).toHaveTextContent('Xtream · —')
    expect(rows[1]).toHaveTextContent('Playlist · —')
    expect(screen.getByTestId('mc-best')).toHaveTextContent('BEST')
    expect(ctx.nav.pushLayer).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/Lineups|Statistics|Events|goal/i)).toBeNull()
  })
  it('vald källa spelas och lådan stängs', () => {
    const ctx = fakeCtx({ now })
    const onClose = vi.fn()
    render(<SportMatchCenter ctx={ctx} match={m} onClose={onClose} />)
    expect(screen.getByTestId('mc-watch')).toHaveTextContent('Watch · FHD')
    fireEvent.click(screen.getAllByTestId('mc-source')[1]!)
    expect(screen.getAllByTestId('mc-source')[1]!.getAttribute('data-selected')).toBe('1')
    fireEvent.click(screen.getByTestId('mc-watch'))
    expect(ctx.watch).toHaveBeenCalledWith(m, m.sources[1])
    expect(onClose).toHaveBeenCalled()
  })
  it('följ hemma och liga, påminn', () => {
    const ctx = fakeCtx({ now })
    render(<SportMatchCenter ctx={ctx} match={m} onClose={() => {}} />)
    fireEvent.click(screen.getByTestId('mc-follow-home'))
    fireEvent.click(screen.getByTestId('mc-follow-league'))
    expect(getFollows()).toEqual([
      { sport: 'football', kind: 'team', key: 'barcelona', name: 'FC Barcelona' },
      { sport: 'football', kind: 'league', key: 'uefa-champions-league', name: 'Champions League' },
    ])
    fireEvent.click(screen.getByTestId('mc-remind'))
    expect(ctx.toggleRemind).toHaveBeenCalledWith(m)
  })
  it('åsidosättningen står först som Ditt val och kan tas bort', () => {
    const override = { key: 'C::http://y/C', name: 'C 4K', url: 'http://y/C', logo: null, group: 'Sport', tvgId: null }
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_OVERRIDES_KEY, { m: override })
    render(<SportMatchCenter ctx={fakeCtx({ now, overrides: { m: override } })} match={m} onClose={() => {}} />)
    const first = screen.getAllByTestId('mc-source')[0]!
    expect(first).toHaveTextContent('C 4K')
    expect(first).toHaveTextContent('Your choice')
    fireEvent.click(screen.getByTestId('mc-clear-override'))
    expect(getOverrides().m).toBeUndefined()
  })
})
