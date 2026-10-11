import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { seedLiveTvIndex } from '../../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, channelKey } from '../../live-tv-data'
import type { LiveTvModel } from '../../live-tv-model'
import { TvPlayerChrome } from '../../tv/tv-player-chrome'
import { playerScale } from '../../tv/player-chrome-parts'
import type { LiveTvPlayerTvProps, PlayerSportProps } from '../../tv/tv-player-types'
import { PLAYER_SPORT_DELAY_MS, PlayerMatchesDrawer, matchesForPlayer, multiviewFor, usePlayerSport } from './player-sport'
import { HOUR, MIN, fxList, fxMatch, fxSource, stubSportDays } from '../__sport-fixture'

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [fxList])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  seedLiveTvIndex()
})

const now = Date.now()
const here = fxSource('B')
const onHere = fxMatch({ id: 'here', home: 'FC Barcelona', away: 'Paris SG', start: now - 30 * MIN, stop: now + HOUR, sources: [here] })
const elsewhere = fxMatch({ id: 'else', home: 'Arsenal', away: 'Bayern', start: now - 20 * MIN, stop: now + HOUR, sources: [fxSource('C')] })
const soon = fxMatch({ id: 'soon', home: 'AIK', away: 'Hammarby', start: now + HOUR, sources: [fxSource('A')] })
const ghost = fxMatch({ id: 'ghost', home: 'Örgryte', away: 'GAIS', start: now - 10 * MIN, stop: now + HOUR, sources: [] })
const channelB = { name: 'B', logo: null, group: 'Sport', url: 'http://x/B', tvgId: null }

function sportProps(over: Partial<PlayerSportProps> = {}): PlayerSportProps {
  return { matches: [onHere, elsewhere, soon, ghost], overrides: {}, view: 'matchday', onSwitchMatch: vi.fn(), onOpenMultiview: vi.fn(), isKnownChannel: () => true, ...over }
}
function tv(over: Partial<LiveTvPlayerTvProps> = {}): LiveTvPlayerTvProps {
  return { channelNumber: 2, quality: null, favourite: false, bannerHideMs: 0, neighbours: [channelB], pinnedKeys: [], nowFor: () => ({ now: null, next: null, later: null }), nowMs: now, locale: 'en-GB', gateOpen: false, phone: false, fullscreenOnRotate: true, keepAwake: true, onToggleFavourite: vi.fn(), onOpenChannelDetails: vi.fn(), onOpenMultiview: vi.fn(), onOpenGuide: vi.fn(), onAddToMultiview: vi.fn(), onSwitchChannel: vi.fn(), ...over }
}

describe('rena delar', () => {
  it('multiviewFor väljer layout efter antal', () => {
    expect(multiviewFor(['a', 'b'])).toEqual({ layout: 2, tiles: ['a', 'b'], audioIndex: 0 })
    expect(multiviewFor(['a', 'b', 'c'])).toEqual({ layout: 3, tiles: ['a', 'b', 'c'], audioIndex: 0 })
    expect(multiviewFor(['a'])).toEqual({ layout: 2, tiles: ['a', null], audioIndex: 0 })
    expect(multiviewFor(['a', 'b', 'c', 'd', 'e']).tiles).toEqual(['a', 'b', 'c', 'd'])
  })
  it('matchesForPlayer: på kanalen, live annorstädes, senare — bara med källa', () => {
    const lists = matchesForPlayer([onHere, elsewhere, soon, ghost], here.channelKey, now)
    expect(lists.onChannel.map((m) => m.id)).toEqual(['here'])
    expect(lists.live.map((m) => m.id)).toEqual(['else'])
    expect(lists.later.map((m) => m.id)).toEqual(['soon'])
  })
  it('usePlayerSport hämtar ingenting medan spelaren är stängd', async () => {
    const spy = stubSportDays({})
    const model = { nowMs: now, byKey: new Map() } as unknown as LiveTvModel
    const { result } = renderHook(() => usePlayerSport({ playingKey: null, model, play: vi.fn(), openMultiview: vi.fn() }))
    await act(async () => {})
    expect(result.current).toBeUndefined()
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('usePlayerSport vid kanalstart', () => {
  afterEach(() => vi.useRealTimers())
  it('hämtar först en stund efter att kanalen börjat spela, och börjar om när kanalen byts', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const spy = stubSportDays({})
    const model = { nowMs: now, byKey: new Map() } as unknown as LiveTvModel
    const { rerender } = renderHook(({ key }: { key: string }) => usePlayerSport({ playingKey: key, model, play: vi.fn(), openMultiview: vi.fn() }), { initialProps: { key: 'A' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(PLAYER_SPORT_DELAY_MS - 500) })
    expect(spy).not.toHaveBeenCalled()
    rerender({ key: 'B' })
    await act(async () => { await vi.advanceTimersByTimeAsync(PLAYER_SPORT_DELAY_MS - 500) })
    expect(spy).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(500) })
    expect(spy).toHaveBeenCalledTimes(1)
  })
})

describe('Matcher-lådan', () => {
  it('mäter med spelarens ps() — 1,4× i TV-läget som kromet runt den', () => {
    render(<PlayerMatchesDrawer sport={sportProps()} channel={channelB} nowMs={now} locale="en-GB" onClose={() => {}} ps={playerScale(true)} />)
    const drawer = screen.getByTestId('player-matches-drawer')
    expect(drawer.style.padding).toBe('39px')
    expect(within(drawer).getByText('Matches').style.fontSize).toBe('42px')
    const row = within(drawer).getAllByTestId('pm-row')[0]!
    expect((row.querySelector('[data-crest]') as HTMLElement).style.width).toBe('62px')
  })
  it('sektioner med NU, klick byter match', () => {
    const sport = sportProps()
    render(<PlayerMatchesDrawer sport={sport} channel={channelB} nowMs={now} locale="en-GB" onClose={() => {}} ps={playerScale(false)} />)
    const drawer = screen.getByTestId('player-matches-drawer')
    expect(drawer).toHaveTextContent('On this channel')
    expect(drawer).toHaveTextContent('Live on your channels')
    expect(drawer).toHaveTextContent('Later today on your channels')
    const rows = within(drawer).getAllByTestId('pm-row')
    expect(rows).toHaveLength(3)
    expect(within(rows[0]!).getByTestId('pm-now')).toHaveTextContent('NOW')
    fireEvent.click(rows[1]!)
    expect(sport.onSwitchMatch).toHaveBeenCalledWith(elsewhere)
  })
  it('Välj flera → högst fyra → Öppna i Multiview med valda källor', () => {
    const sport = sportProps()
    render(<PlayerMatchesDrawer sport={sport} channel={channelB} nowMs={now} locale="en-GB" onClose={() => {}} ps={playerScale(false)} />)
    fireEvent.click(screen.getByTestId('pm-pick'))
    const rows = screen.getAllByTestId('pm-row')
    fireEvent.click(rows[0]!)
    fireEvent.click(rows[1]!)
    expect(rows[0]!.getAttribute('data-picked')).toBe('1')
    expect(sport.onSwitchMatch).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('pm-open-multiview'))
    expect(sport.onOpenMultiview).toHaveBeenCalledWith([here.channelKey, 'C::http://x/C'])
  })
})

describe('kromet', () => {
  it('Matcher-knappen och tickern syns när kanalen sänder en match; Bakåt stänger lådan, inte spelaren', () => {
    const onClose = vi.fn()
    render(<TvPlayerChrome channel={channelB} tv={tv({ sport: sportProps() })} paused={false} onTogglePause={() => {}} onClose={onClose} />)
    expect(screen.getByTestId('player-sport-ticker').getAttribute('data-variant')).toBe('ticker')
    fireEvent.click(screen.getByTestId('player-matches'))
    expect(screen.getByTestId('player-matches-drawer')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByTestId('player-matches-drawer')).toBeNull()
    expect(onClose).not.toHaveBeenCalled()
  })
  it('Flöde-läget ger kolumnen; utan sport ingen knapp', () => {
    const { rerender } = render(<TvPlayerChrome channel={channelB} tv={tv({ sport: sportProps({ view: 'feed' }) })} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    expect(screen.getByTestId('player-sport-ticker').getAttribute('data-variant')).toBe('column')
    rerender(<TvPlayerChrome channel={channelB} tv={tv()} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    expect(screen.queryByTestId('player-matches')).toBeNull()
    expect(screen.queryByTestId('player-sport-ticker')).toBeNull()
  })
  it('kolumnens rader är stationer: klick byter till matchens bästa källa, matchen på kanalen spelar redan', () => {
    const sport = sportProps({ view: 'feed' })
    render(<TvPlayerChrome channel={channelB} tv={tv({ sport })} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    const column = screen.getByTestId('player-sport-ticker')
    const rows = within(column).getAllByTestId('pst-item')
    expect(rows).toHaveLength(2)
    for (const r of rows) {
      expect(r.getAttribute('tabindex')).toBe('0')
      expect(r.getAttribute('data-f')).toBe('')
      expect(r.style.pointerEvents).toBe('auto')
    }
    fireEvent.click(rows[1]!)
    expect(sport.onSwitchMatch).toHaveBeenCalledWith(elsewhere)
    fireEvent.click(rows[0]!)
    expect(sport.onSwitchMatch).toHaveBeenCalledTimes(1)
  })
  it('tickerns chip byter också match', () => {
    const sport = sportProps()
    render(<TvPlayerChrome channel={channelB} tv={tv({ sport })} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    const chips = within(screen.getByTestId('player-sport-ticker')).getAllByTestId('pst-item')
    fireEvent.click(chips[1]!)
    expect(sport.onSwitchMatch).toHaveBeenCalledWith(elsewhere)
  })
  it('matchen på kanalen avgör: ingen knapp på en kanal utan pågående match', () => {
    render(<TvPlayerChrome channel={{ ...channelB, name: 'Z', url: 'http://x/Z' }} tv={tv({ sport: sportProps() })} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    expect(screen.queryByTestId('player-matches')).toBeNull()
    expect(channelKey(channelB)).toBe(here.channelKey)
  })
})
