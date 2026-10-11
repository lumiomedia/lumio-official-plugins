import { describe, expect, it } from 'vitest'
import { HOUR, MIN, fxMatch, fxSource } from '../__sport-fixture'
import type { SportFollow } from '../sport-store'
import {
  leagueChoices,
  leaguesOf,
  leagueRow,
  liveNowRow,
  myTeamsRow,
  resolveLeague,
  resultsRow,
  sportRowTarget,
  tonightEnd,
  tonightRow,
  zapRow,
} from './rows-model'

const now = new Date(2026, 9, 11, 18, 0).getTime()
const aik: SportFollow = { sport: 'football', kind: 'team', key: 'aik', name: 'AIK' }
const shl: SportFollow = { sport: 'hockey', kind: 'league', key: 'shl', name: 'SHL' }

const liveA = fxMatch({ id: 'liveA', home: 'GAIS', away: 'Sirius', start: now - 30 * MIN, stop: now + 90 * MIN })
const liveFollowed = fxMatch({ id: 'liveAik', home: 'AIK', away: 'Malmö', start: now - 20 * MIN, stop: now + 100 * MIN })
const liveMany = fxMatch({ id: 'liveMany', home: 'IFK', away: 'BK', start: now - 10 * MIN, stop: now + 100 * MIN, sources: [fxSource('A'), fxSource('B'), fxSource('C')] })
const liveHockey = fxMatch({ id: 'liveHockey', kind: 'hockey', league: 'SHL', leagueKey: 'shl', home: 'Frölunda', away: 'Luleå', start: now - 10 * MIN, stop: now + 2 * HOUR })
const liveNoChannel = fxMatch({ id: 'liveNoChannel', home: 'Örgryte', away: 'Brage', start: now - 10 * MIN, stop: now + 2 * HOUR, sources: [] })
const rerun = fxMatch({ id: 'rerun', home: 'Kalmar', away: 'Norrköping', start: now - 10 * MIN, stop: now + 2 * HOUR, rerun: true })
const later = fxMatch({ id: 'later', home: 'Djurgården', away: 'Häcken', start: now + 2 * HOUR })
const laterAik = fxMatch({ id: 'laterAik', home: 'Hammarby', away: 'AIK', start: now + 3 * 24 * HOUR })
const farAik = fxMatch({ id: 'farAik', home: 'AIK', away: 'Elfsborg', start: now + 8 * 24 * HOUR })
const tomorrowNoon = fxMatch({ id: 'tomorrowNoon', home: 'Öster', away: 'Halmstad', start: now + 18 * HOUR })
const shlLater = fxMatch({ id: 'shlLater', kind: 'hockey', league: 'SHL', leagueKey: 'shl', home: 'HV71', away: 'Skellefteå', start: now + 26 * HOUR })
const finishedAik = fxMatch({
  id: 'finishedAik', home: 'AIK', away: 'Mjällby', start: now - 26 * HOUR, stop: now - 24 * HOUR, status: 'finished',
  coverage: 'full', fixture: { provider: 'api-sports', id: '1' }, score: { home: 2, away: 1 },
})
const finishedAikOld = fxMatch({
  id: 'finishedAikOld', home: 'Värnamo', away: 'AIK', start: now - 50 * HOUR, stop: now - 48 * HOUR, status: 'finished',
  coverage: 'full', fixture: { provider: 'api-sports', id: '2' }, score: { home: 0, away: 0 },
})
const finishedNoScore = fxMatch({ id: 'finishedNoScore', home: 'AIK', away: 'IFK', start: now - 5 * HOUR, stop: now - 3 * HOUR })
const shlFinished = fxMatch({
  id: 'shlFinished', kind: 'hockey', league: 'SHL', leagueKey: 'shl', home: 'Brynäs', away: 'Färjestad', start: now - 4 * HOUR, stop: now - 2 * HOUR,
  status: 'finished', coverage: 'full', fixture: { provider: 'api-sports', id: '3' }, score: { home: 3, away: 2 },
})

const all = [liveA, liveFollowed, liveMany, liveHockey, liveNoChannel, rerun, later, laterAik, farAik, tomorrowNoon, shlLater, finishedAik, finishedAikOld, finishedNoScore, shlFinished]
const ids = (list: { id: string }[]) => list.map((m) => m.id)

describe('Live nu', () => {
  it('pågående matcher på dina kanaler, följda först och sedan flest källor (sportens mått)', () => {
    expect(ids(liveNowRow(all, [aik], {}, now, 'all'))).toEqual(['liveAik', 'liveMany', 'liveA', 'liveHockey'])
  })
  it('en vald sport', () => {
    expect(ids(liveNowRow(all, [], {}, now, 'hockey'))).toEqual(['liveHockey'])
  })
  it('en vald kanal (åsidosättning) gör en match utan kanal tittbar', () => {
    const overrides = { liveNoChannel: { key: 'k', name: 'Egen', url: 'http://x/egen', logo: null, group: '', tvgId: null } }
    expect(ids(liveNowRow(all, [], overrides, now, 'all'))).toContain('liveNoChannel')
  })
  it('samma match från två dagar räknas en gång', () => {
    expect(ids(liveNowRow([liveA, { ...liveA }], [], {}, now, 'all'))).toEqual(['liveA'])
  })
})

describe('Mina lag', () => {
  it('live och kommande sju dagar för följda lag och ligor, live först, sedan i tidsordning', () => {
    expect(ids(myTeamsRow(all, [aik, shl], now))).toEqual(['liveAik', 'liveHockey', 'shlLater', 'laterAik'])
  })
  it('inga följda = inget', () => {
    expect(myTeamsRow(all, [], now)).toEqual([])
  })
})

describe('I kväll', () => {
  it('kvällen tar slut kl. 03 natten till, högst tolv timmar fram', () => {
    expect(tonightEnd(now)).toBe(new Date(2026, 9, 12, 3, 0).getTime())
    const late = new Date(2026, 9, 11, 23, 30).getTime()
    expect(tonightEnd(late)).toBe(new Date(2026, 9, 12, 3, 0).getTime())
    const morning = new Date(2026, 9, 11, 9, 0).getTime()
    expect(tonightEnd(morning)).toBe(morning + 12 * HOUR)
  })
  it('kommande matcher med kanal som startar i kväll, i tidsordning', () => {
    expect(ids(tonightRow(all, {}, now, 'all'))).toEqual(['later'])
    expect(tonightRow(all, {}, now, 'hockey')).toEqual([])
  })
})

describe('Zappa live', () => {
  it('samma frö = samma ordning, och bara pågående med kanal', () => {
    const a = ids(zapRow(all, {}, now, 'all', 42))
    expect(a).toEqual(ids(zapRow(all, {}, now, 'all', 42)))
    expect([...a].sort()).toEqual(['liveA', 'liveAik', 'liveHockey', 'liveMany'])
  })
  it('ett annat frö blandar om', () => {
    const seen = new Set<string>()
    for (let seed = 1; seed < 30; seed += 1) seen.add(ids(zapRow(all, {}, now, 'all', seed)).join(','))
    expect(seen.size).toBeGreaterThan(1)
  })
})

describe('Liga', () => {
  it('live först, sedan kommande, sedan senaste resultaten', () => {
    expect(ids(leagueRow(all, 'shl', now))).toEqual(['liveHockey', 'shlLater', 'shlFinished'])
  })
  it('utan liga = inget', () => {
    expect(leagueRow(all, null, now)).toEqual([])
  })
  it('valet: det sparade, annars första följda ligan', () => {
    expect(resolveLeague('allsvenskan', [shl])).toBe('allsvenskan')
    expect(resolveLeague(null, [aik, shl])).toBe('shl')
    expect(resolveLeague(null, [aik])).toBeNull()
  })
  it('ligorna att välja: följda först, sedan de som syns i datan, utan dubbletter', () => {
    expect(leagueChoices([shl], leaguesOf(all))).toEqual([{ key: 'shl', name: 'SHL' }, { key: 'allsvenskan', name: 'Allsvenskan' }])
  })
})

describe('Resultat för mina lag', () => {
  it('bara avslutade med ställning från källan, följda lag, senaste först', () => {
    expect(ids(resultsRow(all, [aik, shl], now))).toEqual(['finishedAik', 'finishedAikOld'])
  })
})

describe('klick på ett kort', () => {
  it('öppnar Sport-sidan och spelar matchens bästa kanal (åsidosättningen först)', () => {
    expect(sportRowTarget(liveA, {})).toEqual({
      pageId: 'live-tv-sport',
      params: { view: 'sport', autoplay: '1', url: 'http://x/TV4 Fotboll FHD SE', name: 'TV4 Fotboll FHD SE', logo: '', group: 'Sport', tvgId: '' },
    })
    const overrides = { liveA: { key: 'k', name: 'Egen', url: 'http://x/egen', logo: null, group: 'G', tvgId: null } }
    expect(sportRowTarget(liveA, overrides).params?.url).toBe('http://x/egen')
  })
  it('utan kanal: bara Sport-sidan', () => {
    expect(sportRowTarget(liveNoChannel, {})).toEqual({ pageId: 'live-tv-sport', params: { view: 'sport' } })
  })
})
