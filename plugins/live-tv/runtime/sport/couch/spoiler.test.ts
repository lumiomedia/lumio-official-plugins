import { beforeEach, describe, expect, it } from 'vitest'
import { __resetPluginStorageForTests } from '@/lib/plugin-sdk'
import type { MatchSource, SportMatch } from '../sport-model'
import { getSportSettings } from '../sport-store'
import { __resetSpoilerForTests, hiddenForPhone, hiddenOnTv, noteReplays, onSpoilerChanged, REVEAL_TV_MS, revealPhone, revealTv, SPOILER_KEEP_MS, spoilerKey } from './spoiler'

const src = (key: string): MatchSource => ({ channelKey: key, name: key, url: 'u', logo: null, group: 'g', tvgId: null, sourceId: 's', quality: null, programmeStart: 0, programmeStop: 10, liveFlag: true })
const match = (o: Partial<SportMatch>): SportMatch => ({ id: 'm', kind: 'football', league: 'L', leagueKey: 'l', home: 'Djurgården', away: 'Hammarby', homeKey: 'dif', awayKey: 'ham', event: null, start: 0, stop: 7_200_000, status: 'live', rerun: false, round: null, venue: null, sources: [src('k1')], coverage: 'full', fixture: { provider: 'p', id: '1' }, ...o })
const replay = match({ id: 'r', rerun: true, fixture: undefined, replayOf: { kickoff: -86_400_000, score: { home: 3, away: 0 }, fixture: { provider: 'api-sports', id: '77' } } })
const original = match({ id: 'o', status: 'finished', fixture: { provider: 'api-sports', id: '77' }, score: { home: 3, away: 0 } })
const ON = { spoilerReplays: true }
const OFF = { spoilerReplays: false }

beforeEach(() => { __resetPluginStorageForTests(); __resetSpoilerForTests() })

describe('spoilerskydd', () => {
  it('är på som standard', () => { expect(getSportSettings().spoilerReplays).toBe(true) })
  it('nyckeln är originalets fixtur; reprisen och originalet döljs tillsammans', () => {
    expect(spoilerKey(replay)).toBe('api-sports:77')
    expect(spoilerKey(original)).toBe('api-sports:77')
    expect(hiddenOnTv(original, 0, ON)).toBe(false)
    noteReplays([replay], 0)
    expect(hiddenOnTv(replay, 0, ON)).toBe(true)
    expect(hiddenOnTv(original, 0, ON)).toBe(true)
    expect(hiddenOnTv(replay, 0, OFF)).toBe(false)
  })
  it('Visa resultat på en telefon gäller bara den telefonen', () => {
    noteReplays([replay], 0)
    revealPhone('api-sports:77', 'p1')
    expect(hiddenForPhone(replay, 'p1', 0, ON)).toBe(false)
    expect(hiddenForPhone(replay, 'p2', 0, ON)).toBe(true)
    expect(hiddenForPhone(replay, null, 0, ON)).toBe(true)
    expect(hiddenOnTv(replay, 0, ON)).toBe(true)
  })
  it('visat på TV:n gäller alla i 24 h', () => {
    noteReplays([replay], 0)
    revealTv('api-sports:77', 10)
    expect(hiddenOnTv(replay, 11, ON)).toBe(false)
    expect(hiddenForPhone(replay, 'p2', 11, ON)).toBe(false)
    expect(hiddenOnTv(replay, 10 + REVEAL_TV_MS, ON)).toBe(true)
  })
  it('skyddet släpper 24 h efter reprisens slut', () => {
    noteReplays([replay], 0)
    expect(hiddenOnTv(replay, replay.stop + SPOILER_KEEP_MS - 1, ON)).toBe(true)
    expect(hiddenOnTv(replay, replay.stop + SPOILER_KEEP_MS, ON)).toBe(false)
  })
  it('en repris utan känt original skyddas på sitt eget id', () => {
    const bare = match({ id: 'b', rerun: true, fixture: undefined })
    expect(spoilerKey(bare)).toBe('match:b')
    noteReplays([bare], 0)
    expect(hiddenOnTv(bare, 0, ON)).toBe(true)
  })
  it('lyssnarna meddelas bara när en ny nyckel kommer till', () => {
    let n = 0
    const off = onSpoilerChanged(() => { n++ })
    noteReplays([replay], 0)
    noteReplays([replay], 0)
    expect(n).toBe(1)
    revealPhone('api-sports:77', 'p1')
    revealTv('api-sports:77', 0)
    expect(n).toBe(3)
    off()
  })
  it('en vanlig match utan fixtur har ingen nyckel', () => {
    expect(spoilerKey(match({ fixture: undefined }))).toBeNull()
  })
})
