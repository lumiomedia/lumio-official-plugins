// runtime/sport/team-model.test.ts
import { describe, expect, it } from 'vitest'
import { teamCallsFor } from './team-providers'
import { apiSports } from './api-sports'
import { epgMatchFor, fixturesTtlS, formOf, leagueTargetFromFollow, leagueTargetFromMatch, liveFixture, mainLeagueOf, ordinal, roundFixtures, seasonGuesses, squadGroups, standingsSlice, teamRowIndex, teamTargetFromFollow, teamTargetFromMatch, upcomingFixtures } from './team-model'
import { fxMatch } from './__sport-fixture'
import teamFixtures from './__fixtures__/api-sports/football-fixtures-team.json'
import allsvenskan from './__fixtures__/api-sports/football-standings-allsvenskan.json'
import squads from './__fixtures__/api-sports/football-players-squads.json'
import injuries from './__fixtures__/api-sports/football-injuries.json'

// Dagen efter Hammarby–Djurgården (fixturen 2026-10-11 14:00).
const NOW = Date.UTC(2026, 9, 12, 10)
const feed = teamCallsFor('api-sports').fixtures('football', '363', { season: '2026', tz: 'Europe/Stockholm', ttlS: 1 })!.parse([teamFixtures])
const HAM = { key: 'hammarby' }

describe('formen', () => {
  it('fem senaste, senaste först, ur lagets perspektiv (hemma och borta)', () => {
    const form = formOf(feed.fixtures, HAM, '363')
    expect(form.map((f) => [f.result, f.opponent, f.score, f.home])).toEqual([
      ['L', 'Djurgardens IF', '0–1', true],
      ['W', 'BK Hacken', '0–2', false],
      ['W', 'Gais', '3–1', true],
      ['L', 'Malmo FF', '1–0', false],
      ['D', 'AIK Stockholm', '2–2', true],
    ])
  })
  it('utan id känns laget igen på namnet ("Hammarby" = "Hammarby FF")', () => {
    expect(formOf(feed.fixtures, HAM, null)).toHaveLength(5)
  })
})

describe('nu, nästa och kommande', () => {
  it('kommande över alla turneringar, i tidsordning; ingen pågående', () => {
    expect(liveFixture(feed.fixtures)).toBeNull()
    expect(upcomingFixtures(feed.fixtures, NOW).map((f) => [f.league.name, f.home.name, f.away.name])).toEqual([
      ['Svenska Cupen', 'Orgryte IS', 'Hammarby FF'],
      ['Allsvenskan', 'Hammarby FF', 'IF Elfsborg'],
      ['Allsvenskan', 'Kalmar FF', 'Hammarby FF'],
    ])
  })
  it('serien är den vanligaste ligan, inte cupen', () => {
    expect(mainLeagueOf(feed.fixtures)).toEqual({ id: '113', season: '2026', name: 'Allsvenskan' })
  })
})

describe('TTL: matcherna gäller till nästa match är spelad', () => {
  it('nästa avspark + 2,5 h räknat från hämtningen', () => {
    const next = upcomingFixtures(feed.fixtures, NOW)[0].kickoff
    expect(fixturesTtlS(feed.fixtures, NOW, NOW)).toBe(Math.round((next + 2.5 * 3_600_000 - NOW) / 1000))
  })
  it('golv tio minuter, tak en vecka, ett dygn utan nästa match', () => {
    const past = feed.fixtures.filter((f) => f.status === 'finished')
    expect(fixturesTtlS(past, NOW, NOW)).toBe(86_400)
    const soon = [{ ...feed.fixtures[5], kickoff: NOW - 3 * 3_600_000 }]
    expect(fixturesTtlS(soon, NOW, NOW)).toBe(600)
    const far = [{ ...feed.fixtures[5], kickoff: NOW + 30 * 86_400_000 }]
    expect(fixturesTtlS(far, NOW, NOW)).toBe(7 * 86_400)
  })
})

describe('tabellen runt laget', () => {
  const rows = apiSports.standings('football', '113', '2026').parse([allsvenskan])
  it('två över och två under, laget markerat', () => {
    const i = teamRowIndex(rows, HAM, '363')
    const s = standingsSlice(rows, i)
    expect(s.rows.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5])
    expect(s.teamIndex).toBe(2)
    expect(s.group).toHaveLength(8)
  })
  it('i toppen och botten fylls snittet från andra hållet', () => {
    expect(standingsSlice(rows, 0).rows.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5])
    const last = standingsSlice(rows, 7)
    expect(last.rows.map((r) => r.rank)).toEqual([4, 5, 6, 7, 8])
    expect(last.teamIndex).toBe(4)
  })
  it('utan id hittas raden på namnet; okänt lag ger ingen rad', () => {
    expect(teamRowIndex(rows, { key: 'djurgardens' }, null)).toBe(3)
    expect(standingsSlice(rows, teamRowIndex(rows, { key: 'ifk goteborg' }, null)).rows).toEqual([])
  })
  it('placeringen som ordningstal', () => {
    expect([1, 2, 3, 11, 12, 21, 22].map((n) => ordinal(n, 'sv'))).toEqual(['1:a', '2:a', '3:e', '11:e', '12:e', '21:a', '22:a'])
    expect([1, 2, 3, 4, 11, 13, 21].map((n) => ordinal(n, 'en'))).toEqual(['1st', '2nd', '3rd', '4th', '11th', '13th', '21st'])
  })
})

describe('truppen', () => {
  it('MV, försvar, mittfält, anfall; tröjnummer i ordning, nummerlösa sist', () => {
    const squad = teamCallsFor('api-sports').squad('football', '363', { season: '2026' })!.parse([squads, injuries])
    expect(squadGroups(squad).map((g) => [g.group, g.players.map((p) => p.number)])).toEqual([
      ['gk', [1, 35]], ['def', [2, 4]], ['mid', [8, null]], ['att', [9]],
    ])
  })
})

describe('säsongen när ingen match sagt den', () => {
  it('fotboll: i år från juli, annars förra året först', () => {
    expect(seasonGuesses('football', Date.UTC(2026, 9, 12))).toEqual(['2026', '2025'])
    expect(seasonGuesses('football', Date.UTC(2027, 1, 12))).toEqual(['2026', '2027'])
  })
  it('hockey: startåret; basket: "2026-2027"', () => {
    expect(seasonGuesses('hockey', Date.UTC(2027, 1, 12))).toEqual(['2026'])
    expect(seasonGuesses('basketball', Date.UTC(2026, 9, 12))[0]).toBe('2026-2027')
  })
})

describe('målen för sidan', () => {
  const m = fxMatch({ home: 'Hammarby', away: 'AIK', homeKey: 'hammarby', awayKey: 'aik', homeIds: { 'api-sports': '363' }, awayIds: { 'api-sports': '377' }, fixture: { provider: 'api-sports', id: '9', leagueId: '113', season: '2026' }, homeCrest: 'https://media.api-sports.io/football/teams/363.png' })
  it('ur matchen: lagets id, märke och ligan', () => {
    expect(teamTargetFromMatch(m, 'away')).toEqual({ sport: 'football', name: 'AIK', key: 'aik', crest: null, ids: { 'api-sports': '377' }, league: { provider: 'api-sports', id: '113', season: '2026', name: 'Allsvenskan' } })
    expect(teamTargetFromMatch(fxMatch({ home: null, event: 'F1' }), 'home')).toBeNull()
  })
  it('ur en följd post: postens id vinner, dagens matcher fyller på', () => {
    const t = teamTargetFromFollow({ sport: 'football', kind: 'team', key: 'hammarby', name: 'Hammarby', providerIds: { thesportsdb: '134004' } }, [m])
    expect(t.ids).toEqual({ 'api-sports': '363', thesportsdb: '134004' })
    expect(t.crest).toContain('363.png')
    expect(t.league?.id).toBe('113')
  })
  it('ligor: fx-nyckeln bär källa och id; tablåns nyckel hittar ligan i en kopplad match', () => {
    expect(leagueTargetFromFollow({ sport: 'football', kind: 'league', key: 'fx:sportapi:24', name: 'Premier League' }, []).ref).toEqual({ provider: 'sportapi', id: '24', season: null, name: 'Premier League' })
    expect(leagueTargetFromFollow({ sport: 'football', kind: 'league', key: 'allsvenskan', name: 'Allsvenskan' }, [m]).ref?.id).toBe('113')
    expect(leagueTargetFromFollow({ sport: 'football', kind: 'league', key: 'allsvenskan', name: 'Allsvenskan' }, []).ref).toBeNull()
    expect(leagueTargetFromMatch(m).ref?.provider).toBe('api-sports')
  })
})

describe('tablåns match för en kommande fixtur', () => {
  it('kopplad först, annars lagen och avspark inom tre timmar', () => {
    const f = upcomingFixtures(feed.fixtures, NOW)[1]
    const epg = fxMatch({ home: 'Hammarby', away: 'Elfsborg', homeKey: 'hammarby', awayKey: 'elfsborg', start: f.kickoff + 15 * 60_000 })
    expect(epgMatchFor(f, [epg])?.id).toBe(epg.id)
    expect(epgMatchFor(f, [{ ...epg, start: f.kickoff + 5 * 3_600_000 }])).toBeNull()
    const linked = fxMatch({ home: 'X', away: 'Y', fixture: { provider: 'api-sports', id: f.id } })
    expect(epgMatchFor(f, [epg, linked])?.id).toBe(linked.id)
  })
})

describe('ligans omgång', () => {
  it('numrerade omgångar: omgången närmast idag', () => {
    const r = roundFixtures(feed.fixtures, NOW)
    expect(r.round).toBe(23)
    expect(r.fixtures).toHaveLength(1)
  })
})
