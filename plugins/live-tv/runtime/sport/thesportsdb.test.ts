// runtime/sport/thesportsdb.test.ts
import { describe, expect, it } from 'vitest'
import { theSportsDb } from './thesportsdb'
import { coverageFor, providerFor } from './providers'
import day from './__fixtures__/thesportsdb/eventsday-soccer.json'
import live from './__fixtures__/thesportsdb/livescore-soccer.json'
import lookup from './__fixtures__/thesportsdb/lookup-event.json'
import timeline from './__fixtures__/thesportsdb/event-timeline.json'
import stats from './__fixtures__/thesportsdb/event-stats.json'
import lineup from './__fixtures__/thesportsdb/event-lineup.json'
import table from './__fixtures__/thesportsdb/lookuptable.json'
import search from './__fixtures__/thesportsdb/searchteams.json'
import allSports from './__fixtures__/thesportsdb/all-sports.json'

const DAY = { today: '2026-10-10', tz: 'Europe/Stockholm', dayEndMs: Date.UTC(2026, 9, 10, 22) }

describe('thesportsdb: förfrågningar', () => {
  it('en gemensam hink, 120 s golv, tennis bara EPG', () => {
    expect(theSportsDb.bucket('football')).toBe('all')
    expect(theSportsDb.bucket('hockey')).toBe('all')
    expect(theSportsDb.liveFloorMs).toBe(120_000)
    expect(theSportsDb.coverage('tennis')).toBe('epg')
    expect(theSportsDb.coverage('hockey')).toBe('full')
    expect(theSportsDb.quotaProbe('football')).toBeNull()
  })
  it('dag, live, matchcenter (fyra delar), tabell, sök, nyckelkontroll', () => {
    expect(theSportsDb.day('hockey', '2026-10-10', DAY).requests).toEqual([{ sport: 'hockey', path: '/v1/eventsday.php?d=2026-10-10&s=Ice%20Hockey', ttlS: 900 }])
    expect(theSportsDb.live('football', DAY).requests).toEqual([{ sport: 'football', path: '/v2/livescore/soccer', ttlS: 10 }])
    expect(theSportsDb.fixture('football', '2100001', { finished: true }).requests.map((r) => r.path)).toEqual([
      '/v2/lookup/event/2100001', '/v2/lookup/event_timeline/2100001', '/v2/lookup/event_stats/2100001', '/v2/lookup/event_lineup/2100001',
    ])
    expect(theSportsDb.standings('football', '4347', '2026').requests).toEqual([{ sport: 'football', path: '/v1/lookuptable.php?l=4347&s=2026', ttlS: 86400 }])
    expect(theSportsDb.searchTeams('football', 'malmo').requests).toEqual([{ sport: 'football', path: '/v1/searchteams.php?t=malmo', ttlS: 604800 }])
    expect(theSportsDb.validateKey().requests).toEqual([{ sport: 'football', path: '/v2/all/sports', ttlS: 0 }])
  })
})

describe('thesportsdb: tolkning', () => {
  it('dagsprogram med UTC-tider, ställning som tal och märken', () => {
    const [a, b] = theSportsDb.day('football', '2026-10-10', DAY).parse([day])
    expect(a).toMatchObject({ provider: 'thesportsdb', id: '2100001', kickoff: Date.UTC(2026, 9, 10, 17), status: 'live', minute: 67, score: { home: 2, away: 1 },
      league: { id: '4347', name: 'Swedish Allsvenskan', season: '2026', round: 27 }, home: { id: '134001', name: 'Malmo FF', crest: 'https://r2.thesportsdb.com/images/media/team/badge/malmo.png' }, venue: 'Eleda Stadion' })
    expect(b).toMatchObject({ status: 'scheduled', score: null, home: { crest: null } })
    expect(theSportsDb.day('football', '2026-10-10', DAY).parse([{ events: null }])).toEqual([])
  })
  it('livescore', () => {
    const [f] = theSportsDb.live('football', DAY).parse([live])
    expect(f).toMatchObject({ id: '2100001', status: 'live', minute: 71, score: { home: 3, away: 1 }, kickoff: Date.UTC(2026, 9, 10, 17) })
  })
  it('matchcenter av fyra delar; en saknad del ger tom rad, inte fel', () => {
    const d = theSportsDb.fixture('football', '2100001', { finished: false }).parse([lookup, timeline, stats, lineup])!
    expect(d.events.map((e) => [e.minute, e.type, e.side, e.player])).toEqual([[12, 'goal', 'home', 'Isaac Kiese Thelin'], [29, 'card', 'away', 'Marcus Danielson'], [60, 'sub', 'home', 'Oscar Berg']])
    expect(d.stats).toEqual([{ label: 'Ball Possession', home: '58', away: '42' }, { label: 'Total Shots', home: '14', away: '7' }])
    expect(d.lineups).toMatchObject([
      { side: 'home', formation: '4-3-3', startXI: [{ number: 1, name: 'Johan Dahlin', pos: 'Goalkeeper' }, { number: 9, name: 'Isaac Kiese Thelin', pos: 'Forward' }], subs: [{ number: 20, name: 'Oscar Berg', pos: 'Midfielder' }] },
      { side: 'away', formation: '4-4-2', startXI: [{ number: 35, name: 'Jacob Widell Zetterström', pos: 'Goalkeeper' }], subs: [] },
    ])
    const partial = theSportsDb.fixture('football', '2100001', { finished: false }).parse([lookup, null, null, null])!
    expect(partial.events).toEqual([])
    expect(theSportsDb.fixture('football', '1', { finished: false }).parse([null, null, null, null])).toBeNull()
  })
  it('tabell, sök filtrerat på sport, nyckelkontroll', () => {
    expect(theSportsDb.standings('football', '4347', '2026').parse([table])[1]).toEqual({ rank: 2, team: { id: '134001', name: 'Malmo FF', crest: 'https://r2.thesportsdb.com/images/media/team/badge/malmo.png' }, played: 26, points: 55, goalDiff: 30, form: 'WLWWD', group: null })
    expect(theSportsDb.searchTeams('football', 'malmo').parse([search]).map((t) => t.name)).toEqual(['Malmo FF'])
    expect(theSportsDb.validateKey().parse([allSports])).toEqual({ ok: true, plan: 'Premium', used: null, limit: null })
    expect(theSportsDb.validateKey().parse([null]).ok).toBe(false)
  })
})

describe('providers', () => {
  it('registret och täckningen utan nyckel', () => {
    expect(providerFor('thesportsdb')).toBe(theSportsDb)
    expect(providerFor('api-sports').id).toBe('api-sports')
    expect(coverageFor(null, 'football')).toBe('epg')
    expect(coverageFor('api-sports', 'tennis')).toBe('epg')
    expect(coverageFor('api-sports', 'hockey')).toBe('full')
  })
})
