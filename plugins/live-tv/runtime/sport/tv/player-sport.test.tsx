import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { seedLiveTvIndex } from '../../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, channelKey } from '../../live-tv-data'
import type { LiveTvModel } from '../../live-tv-model'
import { TvPlayerChrome } from '../../tv/tv-player-chrome'
import { playerScale } from '../../tv/player-chrome-parts'
import type { LiveTvPlayerTvProps, PlayerSportProps } from '../../tv/tv-player-types'
import { PLAYER_SPORT_DELAY_MS, PlayerMatchesDrawer, currentMatchSources, matchesForPlayer, multiviewFor, usePlayerSport } from './player-sport'
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
  return { matches: [onHere, elsewhere, soon, ghost], overrides: {}, view: 'matchday', onSwitchMatch: vi.fn(), onSwitchSource: vi.fn(), onOpenMultiview: vi.fn(), isKnownChannel: () => true, playlistName: (id) => (id === 'src-a' ? 'Xtream' : 'Other'), ...over }
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
    expect(within(drawer).getByText('Matches').style.fontSize).toBe('36px')
    const row = within(drawer).getAllByTestId('pm-row')[0]!
    expect((row.querySelector('[data-crest]') as HTMLElement).style.width).toBe('50px')
  })
  it('spelarens glasyta, inte en egen panel', () => {
    render(<PlayerMatchesDrawer sport={sportProps()} channel={channelB} nowMs={now} locale="en-GB" onClose={() => {}} ps={playerScale(false)} />)
    const drawer = screen.getByTestId('player-matches-drawer')
    expect(drawer.style.background).toBe('rgba(0, 0, 0, 0.88)')
    expect(drawer.style.backdropFilter).toBe('blur(20px)')
  })
  it('grupperad på tid som Guiden: Pågår nu (kanalens match överst), sedan avsparkstiden; ingen kanal = ingen rad', () => {
    const sport = sportProps()
    render(<PlayerMatchesDrawer sport={sport} channel={channelB} nowMs={now} locale="en-GB" onClose={() => {}} ps={playerScale(false)} />)
    const groups = screen.getAllByTestId('pm-group')
    expect(groups).toHaveLength(2)
    expect(groups[0]).toHaveTextContent('In play now')
    expect(within(groups[0]!).getAllByTestId('pm-row').map((r) => r.getAttribute('aria-label'))).toEqual(['FC Barcelona - Paris SG', 'Arsenal - Bayern'])
    expect(groups[1]!.firstElementChild!.textContent).toMatch(/^\d\d:\d\d$/)
    expect(within(groups[1]!).getByTestId('pm-row')).toHaveTextContent('AIK - Hammarby')
    expect(screen.getByTestId('player-matches-drawer')).not.toHaveTextContent('Örgryte')
    const rows = screen.getAllByTestId('pm-row')
    expect(within(rows[0]!).getByTestId('pm-now').getAttribute('aria-label')).toBe('Playing')
    expect(within(rows[1]!).queryByTestId('pm-now')).toBeNull()
    fireEvent.click(rows[1]!)
    expect(sport.onSwitchMatch).toHaveBeenCalledWith(elsewhere)
  })
  it('lagmärkena står bredvid varandra och kanalen är underrad', () => {
    render(<PlayerMatchesDrawer sport={sportProps()} channel={channelB} nowMs={now} locale="en-GB" onClose={() => {}} ps={playerScale(false)} />)
    const row = screen.getAllByTestId('pm-row')[1]!
    const crests = row.querySelectorAll<HTMLElement>('[data-crest]')
    expect(crests).toHaveLength(2)
    expect((crests[1]!.parentElement as HTMLElement).style.marginLeft).toBe('')
    expect(row).toHaveTextContent('C · Allsvenskan')
  })
  it('Multiview-ikonen per rad: markera, högst fyra, öppna med valda källor', () => {
    const sport = sportProps()
    render(<PlayerMatchesDrawer sport={sport} channel={channelB} nowMs={now} locale="en-GB" onClose={() => {}} ps={playerScale(false)} />)
    expect(screen.queryByTestId('pm-open-multiview')).toBeNull()
    const icons = screen.getAllByTestId('pm-mv')
    expect(icons[0]!.getAttribute('aria-label')).toBe('Add FC Barcelona - Paris SG to Multiview')
    fireEvent.click(icons[0]!)
    fireEvent.click(icons[1]!)
    expect(icons[0]!.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getAllByTestId('pm-row')[0]!.getAttribute('data-picked')).toBe('1')
    expect(sport.onSwitchMatch).not.toHaveBeenCalled()
    expect(screen.getByTestId('pm-open-multiview')).toHaveTextContent('Open in Multiview (2)')
    fireEvent.click(screen.getByTestId('pm-open-multiview'))
    expect(sport.onOpenMultiview).toHaveBeenCalledWith([here.channelKey, 'C::http://x/C'])
    fireEvent.click(icons[1]!)
    expect(icons[1]!.getAttribute('aria-pressed')).toBe('false')
  })
})

describe('telefonens Matcher-ark', () => {
  it('samma tidsgrupper, tryck byter match, Multiview-ikonerna ger Öppna i Multiview', () => {
    const sport = sportProps()
    render(<TvPlayerChrome channel={channelB} tv={tv({ sport, phone: true })} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    fireEvent.click(screen.getByTestId('phone-matches'))
    const sheet = screen.getByTestId('phone-matches-sheet')
    const groups = within(sheet).getAllByTestId('phone-matches-group')
    expect(groups.map((g) => g.firstElementChild!.textContent)).toEqual(['In play now', expect.stringMatching(/^\d\d:\d\d$/)])
    expect(sheet.querySelectorAll('[data-sheet-item]')).toHaveLength(0)
    const icons = within(sheet).getAllByTestId('phone-match-mv')
    fireEvent.click(icons[0]!)
    fireEvent.click(icons[2]!)
    const open = sheet.querySelectorAll('[data-sheet-item]')
    expect(open).toHaveLength(1)
    expect(open[0]).toHaveTextContent('Open in Multiview (2)')
    fireEvent.click(open[0]!)
    expect(sport.onOpenMultiview).toHaveBeenCalledWith([here.channelKey, 'A::http://x/A'])
  })
  it('tryck på en rad byter till matchens kanal och stänger arket', () => {
    const sport = sportProps()
    render(<TvPlayerChrome channel={channelB} tv={tv({ sport, phone: true })} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    fireEvent.click(screen.getByTestId('phone-matches'))
    fireEvent.click(within(screen.getByTestId('phone-matches-sheet')).getAllByTestId('phone-match-row')[1]!)
    expect(sport.onSwitchMatch).toHaveBeenCalledWith(elsewhere)
    expect(screen.queryByTestId('phone-matches-sheet')).toBeNull()
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

describe('källorna för matchen som spelar', () => {
  const srcB = fxSource('B', { quality: 'FHD' })
  const srcD = fxSource('D', { quality: 'HD', sourceId: 'src-b' })
  const multi = fxMatch({ id: 'multi', home: 'Djurgården', away: 'AIK', start: now - 10 * MIN, stop: now + HOUR, sources: [srcD, srcB] })
  const props = (over: Partial<PlayerSportProps> = {}) => sportProps({ matches: [multi, elsewhere], ...over })

  it('currentMatchSources: rankade källor för matchen på kanalen, bara när den har fler än en', () => {
    expect(currentMatchSources(props(), here.channelKey, now)?.sources.map((s) => s.name)).toEqual(['D', 'B'])
    expect(currentMatchSources(sportProps(), here.channelKey, now)).toBeNull()
    expect(currentMatchSources(props(), 'Z::http://x/Z', now)).toBeNull()
  })
  it('kromet: källväljaren i bannern, den som spelar markerad, val byter kanal', () => {
    const sport = props()
    render(<TvPlayerChrome channel={channelB} tv={tv({ sport })} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    const bar = screen.getByTestId('player-sources')
    const chips = within(bar).getAllByTestId('player-source')
    expect(chips.map((c) => c.getAttribute('data-current'))).toEqual(['0', '1'])
    expect(chips[0]).toHaveTextContent('D')
    expect(chips[0]).toHaveTextContent('Other')
    expect(chips[0]).toHaveTextContent('HD')
    expect(chips[0]!.getAttribute('tabindex')).toBe('0')
    fireEvent.click(chips[1]!)
    expect(sport.onSwitchSource).not.toHaveBeenCalled()
    fireEvent.click(chips[0]!)
    expect(sport.onSwitchSource).toHaveBeenCalledWith(srcD)
  })
  it('kromet: ingen källväljare när matchen bara har en källa', () => {
    render(<TvPlayerChrome channel={channelB} tv={tv({ sport: sportProps() })} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    expect(screen.queryByTestId('player-sources')).toBeNull()
  })
  it('Matcher-lådan visar källorna för matchen som spelar', () => {
    const sport = props()
    render(<PlayerMatchesDrawer sport={sport} channel={channelB} nowMs={now} locale="en-GB" onClose={() => {}} ps={playerScale(false)} />)
    const chips = within(screen.getByTestId('player-matches-drawer')).getAllByTestId('player-source')
    expect(chips).toHaveLength(2)
    fireEvent.click(chips[0]!)
    expect(sport.onSwitchSource).toHaveBeenCalledWith(srcD)
  })
  it('telefonen: knappen öppnar ett ark med källorna, den som spelar bockad', () => {
    const sport = props()
    render(<TvPlayerChrome channel={channelB} tv={tv({ sport, phone: true })} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    fireEvent.click(screen.getByTestId('phone-sources'))
    const sheet = screen.getByTestId('phone-sources-sheet')
    const items = sheet.querySelectorAll('[data-sheet-item]')
    expect(items).toHaveLength(2)
    expect(items[1]).toHaveTextContent('✓')
    expect(items[0]).toHaveTextContent('D · Other · HD')
    fireEvent.click(items[0]!)
    expect(sport.onSwitchSource).toHaveBeenCalledWith(srcD)
  })
  it('usePlayerSport: källbyte går genom play (PIN-grinden), spellistans namn ur modellen', async () => {
    stubSportDays({})
    const play = vi.fn()
    const model = { nowMs: now, byKey: new Map(), lists: [{ ...fxList, source: 'src-b', name: 'Min lista' }] } as unknown as LiveTvModel
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      const { result } = renderHook(() => usePlayerSport({ playingKey: srcB.channelKey, model, play, openMultiview: vi.fn() }))
      await act(async () => { await vi.advanceTimersByTimeAsync(PLAYER_SPORT_DELAY_MS) })
      await act(async () => {})
      expect(result.current).toBeDefined()
      expect(result.current!.playlistName('src-b')).toBe('Min lista')
      result.current!.onSwitchSource(srcD)
      expect(play).toHaveBeenCalledWith({ channel: { name: 'D', url: 'http://x/D', logo: null, group: 'Sport', tvgId: null } })
    } finally {
      vi.useRealTimers()
    }
  })
})
