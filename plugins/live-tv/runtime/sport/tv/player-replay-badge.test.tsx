import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { __resetForTests, __setLangForTests, writePluginJson } from '@/lib/plugin-sdk'
import { seedLiveTvIndex } from '../../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID } from '../../live-tv-data'
import { TvPlayerChrome } from '../../tv/tv-player-chrome'
import type { LiveTvPlayerTvProps, PlayerSportProps } from '../../tv/tv-player-types'
import { HOUR, MIN, fxList, fxMatch, fxSource } from '../__sport-fixture'
import { __resetSpoilerForTests, noteReplays, revealTv, spoilerKey } from '../couch/spoiler'
import { __resetPresenceForTests, markPresence } from '../couch/presence'
import { replayOnChannel } from './player-sport'

afterEach(() => { cleanup(); __setLangForTests('en') })
beforeEach(() => {
  __resetForTests()
  __resetSpoilerForTests()
  __resetPresenceForTests()
  __setLangForTests('sv')
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [fxList])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  seedLiveTvIndex()
})

const now = Date.now()
const here = fxSource('B')
const replay = fxMatch({
  id: 'r', home: 'Arsenal', away: 'Chelsea', league: 'Premier League', rerun: true, status: 'finished', coverage: 'full',
  start: now - 30 * MIN, stop: now + HOUR, sources: [here], fixture: undefined,
  replayOf: { kickoff: now - 86_400_000, score: { home: 3, away: 0 }, fixture: { provider: 'api-sports', id: '77' } },
})
const live = fxMatch({ id: 'l', home: 'AIK', away: 'Hammarby', start: now - 30 * MIN, stop: now + HOUR, sources: [here] })
const channelB = { name: 'B', logo: null, group: 'Sport', url: 'http://x/B', tvgId: null }

function sport(over: Partial<PlayerSportProps> = {}): PlayerSportProps {
  return { matches: [], replays: [replay], overrides: {}, view: 'matchday', onSwitchMatch: vi.fn(), onSwitchSource: vi.fn(), onOpenMultiview: vi.fn(), isKnownChannel: () => true, playlistName: () => 'Xtream', ...over }
}
function tv(over: Partial<LiveTvPlayerTvProps> = {}): LiveTvPlayerTvProps {
  return { channelNumber: 2, quality: null, favourite: false, bannerHideMs: 0, neighbours: [channelB], pinnedKeys: [], nowFor: () => ({ now: null, next: null, later: null }), nowMs: now, locale: 'sv-SE', gateOpen: false, phone: false, fullscreenOnRotate: true, keepAwake: true, onToggleFavourite: vi.fn(), onOpenChannelDetails: vi.fn(), onOpenMultiview: vi.fn(), onOpenGuide: vi.fn(), onAddToMultiview: vi.fn(), onSwitchChannel: vi.fn(), ...over }
}
const chrome = (s: PlayerSportProps) => render(<TvPlayerChrome channel={channelB} tv={tv({ sport: s })} paused={false} onTogglePause={() => {}} onClose={() => {}} />)

describe('spoilerkromen i spelaren (2b)', () => {
  it('replayOnChannel: bara en repris som sänds på kanalen just nu', () => {
    expect(replayOnChannel([live, replay], here.channelKey, now)?.id).toBe('r')
    expect(replayOnChannel([replay], here.channelKey, now + 2 * HOUR)).toBeNull()
    expect(replayOnChannel([replay], 'annan', now)).toBeNull()
  })

  it('dold repris: suddad platshållare och lås, aldrig resultatet; "Visa i matchinfo" utan telefon', () => {
    noteReplays([replay], now)
    chrome(sport())
    const badge = screen.getByTestId('player-replay-badge')
    expect(badge).toHaveAttribute('data-hidden', '1')
    expect(within(badge).getByTestId('player-replay-tag')).toHaveTextContent('Repris')
    expect(document.body).not.toHaveTextContent('3–0')
    expect(screen.getByTestId('player-replay-hidden')).toHaveTextContent('Resultat dolt')
    expect(screen.getByTestId('player-replay-where')).toHaveTextContent('Visa i matchinfo')
    expect(screen.getByTestId('player-replay-overline')).toHaveTextContent(/Premier League · Igår \d\d:\d\d/)
  })

  it('en telefon i sportfliken: "Visa på telefonen"', () => {
    noteReplays([replay], now)
    markPresence('p1', true, now)
    chrome(sport())
    expect(screen.getByTestId('player-replay-where')).toHaveTextContent('Visa på telefonen')
  })

  it('visad repris: "3–0" och ingen telefonbricka', () => {
    noteReplays([replay], now)
    revealTv(spoilerKey(replay)!, Date.now())
    chrome(sport())
    expect(screen.getByTestId('player-replay-badge')).toHaveAttribute('data-hidden', '0')
    expect(screen.getByTestId('player-replay-score')).toHaveTextContent('3–0')
    expect(screen.queryByTestId('player-replay-hidden')).toBeNull()
  })

  it('live-kanal: ingen bricka', () => {
    chrome(sport({ matches: [live], replays: [] }))
    expect(screen.queryByTestId('player-replay-badge')).toBeNull()
    expect(screen.queryByTestId('player-replay-info')).toBeNull()
  })
})
