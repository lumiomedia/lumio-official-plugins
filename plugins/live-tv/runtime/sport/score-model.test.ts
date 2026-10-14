import { beforeEach, describe, expect, it } from 'vitest'
import { __resetPluginStorageForTests } from '@/lib/plugin-sdk'
import { __resetSpoilerForTests, noteReplays, revealTv } from './couch/spoiler'
import { replayScoreText, revealedReplayScore, scoreHidden, scoreText, showsScore } from './score-model'
import type { MatchSource, SportMatch } from './sport-model'
import { setSportSettings } from './sport-store'

const src = (key: string): MatchSource => ({ channelKey: key, name: key, url: 'u', logo: null, group: 'g', tvgId: null, sourceId: 's', quality: null, programmeStart: 0, programmeStop: 10, liveFlag: true })
const T = Date.now()
const match = (o: Partial<SportMatch>): SportMatch => ({ id: 'm', kind: 'football', league: 'L', leagueKey: 'l', home: 'Djurgården', away: 'Hammarby', homeKey: 'dif', awayKey: 'ham', event: null, start: T, stop: T + 7_200_000, status: 'live', rerun: false, round: null, venue: null, sources: [src('k1')], coverage: 'full', fixture: { provider: 'p', id: '1' }, ...o })
const replay = match({ id: 'r', rerun: true, fixture: undefined, replayOf: { kickoff: T - 86_400_000, score: { home: 3, away: 0 }, fixture: { provider: 'api-sports', id: '77' } } })
const original = match({ id: 'o', status: 'finished', fixture: { provider: 'api-sports', id: '77' }, score: { home: 3, away: 0 } })

beforeEach(() => { __resetPluginStorageForTests(); __resetSpoilerForTests() })

describe('score-model med spoilerskydd', () => {
  it('döljer reprisens och originalets resultat när skyddet gäller', () => {
    expect(replayScoreText(replay)).toBe('3–0')
    expect(scoreText(original)).toBe('3–0')
    noteReplays([replay], T)
    expect(scoreHidden(replay)).toBe(true)
    expect(replayScoreText(replay)).toBeNull()
    expect(revealedReplayScore(replay)).toBeNull()
    expect(showsScore(original)).toBe(false)
    expect(scoreText(original)).toBeNull()
  })
  it('visar dem när skyddet är av eller TV:n har visat resultatet', () => {
    noteReplays([replay], T)
    revealTv('api-sports:77', Date.now())
    expect(replayScoreText(replay)).toBe('3–0')
    __resetPluginStorageForTests(); __resetSpoilerForTests(); noteReplays([replay], T)
    expect(scoreText(original)).toBeNull()
    setSportSettings({ spoilerReplays: false })
    expect(scoreText(original)).toBe('3–0')
    expect(revealedReplayScore(replay)).toEqual({ home: 3, away: 0 })
  })
})
