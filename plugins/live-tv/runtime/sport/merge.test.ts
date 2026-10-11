import { describe, expect, it } from 'vitest'
import { fixtureMatchKey, mergeLinked, relevantMatches } from './merge'
import type { Fixture } from './provider'
import type { SportMatch } from './sport-model'
import type { OverrideChannel } from './sport-store'
import { fxMatch, fxSource } from './__sport-fixture'

const KO = Date.UTC(2026, 9, 10, 17)
const src = (key: string) => fxSource(key)
const tv4: OverrideChannel = { key: 'tv4', name: 'TV4', url: 'http://x/tv4', logo: null, group: 'Sport', tvgId: null }

const epgMatch = (over: Partial<SportMatch> = {}): SportMatch => fxMatch({
  id: 'm1', home: 'Malmö FF', away: 'Djurgården', homeKey: 'malmo', awayKey: 'djurgarden',
  start: KO, stop: KO + 7_200_000, status: 'live', sources: [src('cmore1')], ...over,
})

const fixture = (over: Partial<Fixture> = {}): Fixture => ({
  provider: 'api-sports', id: '1180001', sport: 'football',
  league: { id: '113', name: 'Allsvenskan', season: '2026', round: 27, country: 'Sweden' },
  kickoff: KO, status: 'live', statusShort: '2H', minute: 67,
  home: { id: '375', name: 'Malmo FF', crest: 'https://m/375.png' }, away: { id: '377', name: 'Djurgardens IF', crest: 'https://m/377.png' },
  score: { home: 2, away: 1 }, venue: 'Eleda Stadion', lastGoal: null, ...over,
})

const coverage = (s: string) => (s === 'tennis' ? 'epg' : 'full') as 'full' | 'epg'
const base = { overrides: {}, coverage }

describe('mergeLinked', () => {
  it('kopplad fixtur ger ställning, minut, märken och källans id:n; EPG:ns källor behålls', () => {
    const [m] = mergeLinked({ ...base, epg: [epgMatch()], fixtures: [fixture()], links: { '1180001': { matchId: 'm1', swapped: false } } })
    expect(m).toMatchObject({
      id: 'm1', status: 'live', minute: 67, score: { home: 2, away: 1 }, round: 27, venue: 'Eleda Stadion',
      fixture: { provider: 'api-sports', id: '1180001', leagueId: '113', season: '2026' }, coverage: 'full',
      home: 'Malmo FF', homeKey: 'malmo', homeCrest: 'https://m/375.png', homeIds: { 'api-sports': '375' },
      away: 'Djurgardens IF', awayKey: 'djurgarden', awayCrest: 'https://m/377.png', awayIds: { 'api-sports': '377' },
      sources: [src('cmore1')],
    })
    expect(m.resultOnly).toBeFalsy()
  })

  it('ligans land från källan följer med i fixturen (Hoppa till skiljer dubblettnamn med det)', () => {
    const [linked] = mergeLinked({ ...base, epg: [epgMatch()], fixtures: [fixture()], links: { '1180001': { matchId: 'm1', swapped: false } } })
    expect(linked.fixture?.country).toBe('Sweden')
    const [only] = mergeLinked({ ...base, epg: [], fixtures: [fixture({ league: { id: '39', name: 'Premier League', season: '2026', round: 8, country: 'England' } })], links: {} })
    expect(only.fixture?.country).toBe('England')
  })

  it('omvänd ordning i EPG: källans ordning gäller, EPG-nycklarna följer rätt lag', () => {
    const [m] = mergeLinked({ ...base, epg: [epgMatch({ home: 'Djurgården', homeKey: 'djurgarden', away: 'Malmö FF', awayKey: 'malmo' })], fixtures: [fixture()], links: { '1180001': { matchId: 'm1', swapped: true } } })
    expect([m.home, m.homeKey, m.away, m.awayKey]).toEqual(['Malmo FF', 'malmo', 'Djurgardens IF', 'djurgarden'])
  })

  it('källans status översätts: paus är live med phase, uppskjuten är upcoming med phase', () => {
    const link = { '1180001': { matchId: 'm1', swapped: false } }
    const [ht] = mergeLinked({ ...base, epg: [epgMatch()], fixtures: [fixture({ status: 'ht', minute: 45 })], links: link })
    expect(ht).toMatchObject({ status: 'live', phase: 'ht' })
    const [pst] = mergeLinked({ ...base, epg: [epgMatch()], fixtures: [fixture({ status: 'postponed', minute: null, score: null })], links: link })
    expect(pst).toMatchObject({ status: 'upcoming', phase: 'postponed' })
    expect(pst.score).toBeUndefined()
    const [done] = mergeLinked({ ...base, epg: [epgMatch()], fixtures: [fixture({ status: 'finished' })], links: link })
    expect(done).toMatchObject({ status: 'finished' })
    expect(done.phase).toBeUndefined()
  })

  it('fixtur utan koppling blir "Bara resultat"; override till en kanal gör den tittbar', () => {
    const f = fixture({ id: '9', home: { id: '1', name: 'Hammarby', crest: null }, away: { id: '2', name: 'AIK', crest: null } })
    const [, only] = mergeLinked({ ...base, epg: [epgMatch()], fixtures: [f], links: { '9': null } })
    expect(only).toMatchObject({ id: fixtureMatchKey(f), kind: 'football', resultOnly: true, sources: [], coverage: 'full', score: { home: 2, away: 1 }, start: KO, home: 'Hammarby', homeKey: 'hammarby' })
    const [, picked] = mergeLinked({ ...base, epg: [epgMatch()], fixtures: [f], links: { '9': null }, overrides: { [fixtureMatchKey(f)]: tv4 } })
    expect(picked).toMatchObject({ resultOnly: false, sources: [expect.objectContaining({ channelKey: 'tv4', url: 'http://x/tv4' })] })
  })

  it('EPG-match utan fixtur: ingen gissad ställning', () => {
    const [m] = mergeLinked({ ...base, epg: [epgMatch()], fixtures: [], links: {} })
    expect(m.score).toBeUndefined()
    expect(m.fixture).toBeUndefined()
  })

  it('tennis: alltid bara EPG, även om något skulle länkas', () => {
    const t = epgMatch({ id: 't1', kind: 'tennis' })
    const [m] = mergeLinked({ ...base, epg: [t], fixtures: [fixture({ sport: 'tennis', id: 'x' })], links: { x: { matchId: 't1', swapped: false } } })
    expect(m).toMatchObject({ coverage: 'epg' })
    expect(m.score).toBeUndefined()
  })

  it('två fixturer mot samma EPG-match: den andra blir "Bara resultat"', () => {
    const out = mergeLinked({ ...base, epg: [epgMatch()], fixtures: [fixture(), fixture({ id: '2' })], links: { '1180001': { matchId: 'm1', swapped: false }, '2': { matchId: 'm1', swapped: false } } })
    expect(out.map((m) => [m.id, !!m.resultOnly])).toEqual([['m1', false], ['fx:api-sports:2', true]])
  })
})

describe('relevantMatches (Bara resultat bara för det användaren bryr sig om)', () => {
  it('okopplade fixturer stannar bara om laget eller ligan följs eller en kanal valts', () => {
    const all = mergeLinked({
      ...base,
      overrides: { [fixtureMatchKey({ provider: 'api-sports', id: '3' })]: tv4 },
      epg: [epgMatch()],
      fixtures: [
        fixture({ id: '1', home: { id: '1', name: 'Boca Juniors', crest: null }, away: { id: '2', name: 'River Plate', crest: null }, league: { id: '128', name: 'Liga Profesional', season: '2026', round: null, country: 'Argentina' } }),
        fixture({ id: '2', home: { id: '3', name: 'IFK Göteborg', crest: null }, away: { id: '4', name: 'AIK', crest: null } }),
        fixture({ id: '3', home: { id: '5', name: 'Wrexham', crest: null }, away: { id: '6', name: 'Stoke', crest: null }, league: { id: '40', name: 'Championship', season: '2026', round: null, country: 'England' } }),
        fixture({ id: '4', home: { id: '7', name: 'Real Madrid', crest: null }, away: { id: '8', name: 'Getafe', crest: null }, league: { id: '140', name: 'La Liga', season: '2026', round: null, country: 'Spain' } }),
      ],
      links: {},
    })
    expect(all.filter((m) => m.resultOnly)).toHaveLength(3)
    const kept = relevantMatches(all, [
      { sport: 'football', kind: 'team', key: 'ifk goteborg', name: 'IFK Göteborg' },
      { sport: 'football', kind: 'league', key: 'fx:api-sports:140', name: 'La Liga' },
    ])
    expect(kept.map((m) => m.id)).toEqual(['m1', 'fx:api-sports:2', 'fx:api-sports:3', 'fx:api-sports:4'])
  })
})
