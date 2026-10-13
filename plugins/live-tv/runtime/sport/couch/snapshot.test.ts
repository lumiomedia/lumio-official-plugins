import { describe, expect, it } from 'vitest'
import type { SportMatch, MatchSource } from '../sport-model'
import { buildCouchSport, teamShort, zapTarget } from './snapshot'

const src = (key: string): MatchSource => ({ channelKey: key, name: key.toUpperCase(), url: 'u', logo: null, group: 'g', tvgId: null, sourceId: 's', quality: null, programmeStart: 0, programmeStop: 10, liveFlag: true })
const match = (o: Partial<SportMatch>): SportMatch => ({
  id: 'm', kind: 'football', league: 'Allsvenskan', leagueKey: 'se1', home: 'Djurgården', away: 'Hammarby', homeKey: 'dif', awayKey: 'ham',
  event: null, start: 0, stop: 7_200_000, status: 'live', rerun: false, round: 24, venue: null, sources: [src('k1')],
  coverage: 'full', fixture: { provider: 'api-sports', id: '1' }, minute: 67, score: { home: 2, away: 1 }, ...o,
})
const base = { playing: null, marks: { sportPage: false, multiview: false }, audioChannel: null, follows: [], overrides: {}, hasKey: true, updatedAt: 5, now: 1_000 }

describe('buildCouchSport', () => {
  it('ingen kontext när TV:n inte visar sport', () => {
    const s = buildCouchSport({ ...base, matches: [match({})] })
    expect(s.context).toBeNull()
    expect(s.focus).toBeNull()
  })
  it('kanal med pågående match ger kontext, fokus och ställning', () => {
    const s = buildCouchSport({ ...base, matches: [match({})], playing: 'k1' })
    expect(s.context).toBe('channel')
    expect(s.focus).toMatchObject({ id: 'm', score: [2, 1], minute: "67'", onTv: true, status: 'live' })
    expect(s.focus?.home).toEqual({ name: 'Djurgården', short: 'DJU', crest: null })
  })
  it('byte av kanal byter fokus; okänd kanal ger ingen kanalkontext', () => {
    const ms = [match({}), match({ id: 'n', sources: [src('k2')] })]
    expect(buildCouchSport({ ...base, matches: ms, playing: 'k2' }).focus?.id).toBe('n')
    expect(buildCouchSport({ ...base, matches: ms, playing: 'k9' }).context).toBeNull()
  })
  it('kanal utan match men Sport-sidan monterad ger sport-page utan fokus', () => {
    const s = buildCouchSport({ ...base, matches: [match({})], playing: 'k9', marks: { sportPage: true, multiview: false } })
    expect(s.context).toBe('sport-page')
    expect(s.focus).toBeNull()
  })
  it('utan nyckel skickas ingen ställning eller minut och inga segment', () => {
    const f = buildCouchSport({ ...base, hasKey: false, matches: [match({})], playing: 'k1' }).focus!
    expect(f.score).toBeUndefined(); expect(f.minute).toBeUndefined()
    expect(f.hasDetail).toEqual({ events: false, stats: false, lineup: false })
  })
  it('repris: status replay, aldrig ställning, aldrig i Pågår nu', () => {
    const r = match({ rerun: true, replayOf: { kickoff: 0, score: { home: 3, away: 0 }, fixture: { provider: 'a', id: '1' } } })
    const s = buildCouchSport({ ...base, matches: [r], playing: 'k1' })
    expect(s.context).toBe('channel')
    expect(s.focus).toMatchObject({ status: 'replay' })
    expect(s.focus?.score).toBeUndefined()
    expect(s.focus?.hasDetail).toEqual({ events: false, stats: false, lineup: false })
    expect(s.now).toEqual([])
  })
  it('Multiview: fokus följer ljudrutan', () => {
    const ms = [match({}), match({ id: 'n', sources: [src('k2')] })]
    const s = buildCouchSport({ ...base, matches: ms, marks: { sportPage: false, multiview: true }, audioChannel: 'k2' })
    expect(s.context).toBe('multiview'); expect(s.focus?.id).toBe('n')
  })
  it('Pågår nu: följda först, max 40; Kommer snart inom 3 h', () => {
    const live = Array.from({ length: 45 }, (_, i) => match({ id: `l${i}`, start: i, sources: [src(`c${i}`)] }))
    const followed = match({ id: 'f', homeKey: 'aik', start: 99 })
    const soon = match({ id: 's', status: 'upcoming', start: 1_000 + 3_600_000, stop: 1_000 + 7_200_000 })
    const far = match({ id: 'x', status: 'upcoming', start: 1_000 + 4 * 3_600_000, stop: 1_000 + 5 * 3_600_000 })
    const s = buildCouchSport({ ...base, matches: [...live, followed, soon, far], follows: [{ sport: 'football', kind: 'team', key: 'aik', name: 'AIK' }], marks: { sportPage: true, multiview: false } })
    expect(s.now).toHaveLength(40); expect(s.now[0].id).toBe('f'); expect(s.now[0].followed).toBe(true)
    expect(s.soon.map((x) => x.id)).toEqual(['s'])
  })
  it('focusIndex räknar live-matcher med kanal i samma liga', () => {
    const ms = [match({ id: 'a', start: 0, sources: [src('a')] }), match({ id: 'b', start: 1, sources: [src('b')] }), match({ id: 'c', leagueKey: 'x', sources: [src('c')] })]
    expect(buildCouchSport({ ...base, matches: ms, playing: 'b' }).focusIndex).toEqual({ i: 2, n: 2 })
  })
})

describe('zapTarget', () => {
  it('går runt i ligan och hoppar över fokus', () => {
    const ms = [match({ id: 'a', start: 0, sources: [src('a')] }), match({ id: 'b', start: 1, sources: [src('b')] })]
    expect(zapTarget(ms, 'b', 1, 1_000)?.id).toBe('a')
    expect(zapTarget(ms, 'a', -1, 1_000)?.id).toBe('b')
    expect(zapTarget([ms[0]], 'a', 1, 1_000)).toBeNull()
  })
})

describe('teamShort', () => {
  it('tre versaler ur namnet', () => {
    expect(teamShort('Djurgården')).toBe('DJU'); expect(teamShort('IFK Göteborg')).toBe('IFK'); expect(teamShort('AC')).toBe('AC')
  })
})
