import { describe, expect, it } from 'vitest'
import {
  clashes, crestColor, featuredMatch, followCandidates, followState, headerSummary, leagueColor, nextMatchFor,
  nextOnYourChannels, pickMultiviewKeys, rankedSources, splitSections, sportCounts, statusAt, teamRing,
  timelineAxis, timelineRows, visibleMatches,
} from './sport-day-model'
import { HOUR, MIN, fxDay, fxMatch, fxSource } from './__sport-fixture'

const now = new Date(2026, 9, 10, 19, 0).getTime()
const dayFrom = new Date(2026, 9, 10, 0, 0).getTime()
const live = fxMatch({ id: 'live', home: 'GAIS', away: 'Sirius', start: now - 30 * MIN, stop: now + 90 * MIN })
const later = fxMatch({ id: 'later', home: 'AIK', away: 'Hammarby', start: now + HOUR })
const done = fxMatch({ id: 'done', home: 'Malmö', away: 'Göteborg', start: now - 4 * HOUR, stop: now - 2 * HOUR })
const rerun = fxMatch({ id: 'rerun', home: 'GAIS', away: 'Sirius', start: now + 3 * HOUR, rerun: true })
const shl = fxMatch({ id: 'shl', kind: 'hockey', league: 'SHL', leagueKey: 'shl', home: 'HV71', away: 'Brynäs', start: now + 30 * MIN })

describe('status och urval', () => {
  it('status på klockan, men serverns SLUT står kvar', () => {
    expect(statusAt(live, now)).toBe('live')
    expect(statusAt(later, now)).toBe('upcoming')
    expect(statusAt(done, now)).toBe('finished')
    expect(statusAt({ ...later, status: 'finished' }, now)).toBe('finished')
  })
  it('repriser syns aldrig och filtret håller sig till sporten', () => {
    const day = fxDay('2026-10-10', [later, rerun, live, shl])
    expect(visibleMatches(day, 'all').map((m) => m.id)).toEqual(['live', 'shl', 'later'])
    expect(visibleMatches(day, 'hockey').map((m) => m.id)).toEqual(['shl'])
    expect(visibleMatches(null, 'all')).toEqual([])
    expect(sportCounts(day)).toMatchObject({ football: 2, hockey: 1, tennis: 0 })
  })
  it('sektioner och sammanfattning', () => {
    const s = splitSections([live, later, done], now)
    expect([s.live.map((m) => m.id), s.later.map((m) => m.id), s.finished.map((m) => m.id)]).toEqual([['live'], ['later'], ['done']])
    expect(headerSummary([live, later, done], now)).toEqual({ total: 3, live: 1 })
  })
})

describe('följda och källor', () => {
  const follows = [{ sport: 'football' as const, kind: 'team' as const, key: 'hammarby', name: 'Hammarby' }]
  it('followState och hero: följd live före följd senare före annan', () => {
    expect(followState(later, follows)).toEqual({ home: false, away: true, league: false, any: true })
    expect(featuredMatch([later, live, done], follows, now)?.id).toBe('live')
    expect(featuredMatch([later, done], follows, now)?.id).toBe('later')
    expect(featuredMatch([], follows, now)).toBeNull()
    expect(nextOnYourChannels([live, later, shl, done], now, 'later').map((m) => m.id)).toEqual(['shl'])
  })
  it('åsidosättningen går först, även en kanal utanför matchens källor', () => {
    const m = fxMatch({ id: 'x', sources: [fxSource('A', { quality: 'FHD' }), fxSource('B')] })
    expect(rankedSources(m, {}).map((s) => s.name)).toEqual(['A', 'B'])
    expect(rankedSources(m, { x: { key: 'B::http://x/B', name: 'B', url: 'http://x/B', logo: null, group: 'Sport', tvgId: null } }).map((s) => s.name)).toEqual(['B', 'A'])
    const foreign = rankedSources(m, { x: { key: 'C::http://y/C', name: 'C 4K', url: 'http://y/C', logo: null, group: 'Sport', tvgId: null } })
    expect(foreign.map((s) => s.name)).toEqual(['C 4K', 'A', 'B'])
    expect(foreign[0]!.quality).toBe('4K')
  })
  it('Multiview väljer en källa ur den aktiva spellistan när den finns', () => {
    const a = fxMatch({ id: 'a', sources: [fxSource('Annan lista FHD', { quality: 'FHD' }), fxSource('Min kanal')] })
    const b = fxMatch({ id: 'b', sources: [fxSource('Bara här')] })
    const c = fxMatch({ id: 'c', sources: [] })
    const known = new Set(['Min kanal::http://x/Min kanal'])
    expect(pickMultiviewKeys([a, b, c], {}, (k) => known.has(k))).toEqual(['Min kanal::http://x/Min kanal', 'Bara här::http://x/Bara här'])
    expect(pickMultiviewKeys([a, a, b], {}, () => true, 1)).toEqual(['Annan lista FHD::http://x/Annan lista FHD'])
  })
})

describe('tidslinje, krockar och följkandidater', () => {
  it('axeln täcker matcherna, minst åtta timmar, inom dygnet', () => {
    const axis = timelineAxis([live, later], dayFrom)
    expect(axis.start).toBeLessThanOrEqual(live.start)
    expect(axis.end).toBeGreaterThanOrEqual(later.stop)
    expect(axis.end - axis.start).toBeGreaterThanOrEqual(8 * HOUR)
    expect(axis.end).toBeLessThanOrEqual(dayFrom + 24 * HOUR)
    expect(axis.hours[0]).toBe(axis.start)
    expect(timelineAxis([], dayFrom)).toMatchObject({ start: dayFrom + 15 * HOUR, end: dayFrom + 23 * HOUR })
  })
  it('överlappande matcher i samma liga hamnar på olika banor', () => {
    const overlap = fxMatch({ id: 'overlap', home: 'Mjällby', away: 'Degerfors', start: live.start + 15 * MIN })
    const after = fxMatch({ id: 'after', home: 'Häcken', away: 'Örgryte', start: live.stop })
    const rows = timelineRows([live, overlap, after, shl])
    const allsv = rows.find((r) => r.key === 'allsvenskan')!
    expect(allsv.lanes.map((lane) => lane.map((m) => m.id))).toEqual([['live', 'after'], ['overlap']])
    expect(rows.find((r) => r.key === 'shl')!.label).toBe('SHL')
  })
  it('krock under 100 minuter', () => {
    const a = fxMatch({ id: 'a', start: now })
    const b = fxMatch({ id: 'b', start: now + 90 * MIN })
    const c = fxMatch({ id: 'c', start: now + 5 * HOUR })
    expect([...clashes([c, a, b])].sort()).toEqual(['a', 'b'])
  })
  it('kandidater: lag och ligor ur dygnen, utan dubbletter och utan repriser', () => {
    const cands = followCandidates([fxDay('d1', [live, rerun, shl]), null, fxDay('d2', [later])])
    expect(cands.filter((c) => c.kind === 'league').map((c) => c.key)).toEqual(['allsvenskan', 'shl'])
    expect(cands.find((c) => c.key === 'gais')).toMatchObject({ kind: 'team', count: 1, sport: 'football' })
  })
  it('nästa match och ringen för ett följt lag', () => {
    const f = { sport: 'football' as const, kind: 'team' as const, key: 'gais', name: 'GAIS' }
    expect(nextMatchFor(f, [fxDay('d', [done, live, later])], now)?.id).toBe('live')
    expect(teamRing(f, [live, later], now)).toBe('live')
    expect(teamRing({ ...f, key: 'aik' }, [live, later], now)).toBe('today')
    expect(teamRing({ ...f, key: 'malmo' }, [live, later], now)).toBe('none')
  })
  it('färger är stabila', () => {
    expect(leagueColor('allsvenskan')).toBe(leagueColor('allsvenskan'))
    expect(leagueColor('okand-liga')).toMatch(/^hsl\(/)
    expect(crestColor('gais')).toBe(crestColor('gais'))
  })
})

describe('statusAt med källfixtur (fas 2)', () => {
  it('källans status gäller även när EPG-klockan säger något annat', () => {
    const start = Date.now() - 3 * HOUR
    const m = fxMatch({ start, stop: start + 2 * HOUR, status: 'live', fixture: { provider: 'api-sports', id: '1' } })
    expect(statusAt(m, Date.now())).toBe('live')
    expect(statusAt({ ...m, status: 'finished' }, start)).toBe('finished')
  })
  it('uppskjuten är upcoming även efter EPG-slut; okänd källstatus faller tillbaka på klockan', () => {
    const start = Date.now() - 3 * HOUR
    const m = fxMatch({ start, stop: start + 2 * HOUR, status: 'upcoming', phase: 'postponed', fixture: { provider: 'api-sports', id: '1' } })
    expect(statusAt(m, Date.now())).toBe('upcoming')
    expect(statusAt({ ...m, phase: undefined }, Date.now())).toBe('finished')
  })
})
