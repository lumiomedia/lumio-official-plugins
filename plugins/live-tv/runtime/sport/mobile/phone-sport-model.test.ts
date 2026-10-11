import { describe, expect, it } from 'vitest'
import { HOUR, MIN, fxMatch } from '../__sport-fixture'
import type { SportMatch } from '../sport-model'
import { PHONE_SECTIONS, eveningPlan, leagueAbbr, nextAlert, phonePlatform, phoneResults, phoneTimeline, sectionTarget } from './phone-sport-model'

const DAY = new Date(2026, 9, 11).getTime()
const at = (h: number, m = 0) => DAY + h * HOUR + m * MIN

describe('Live TV-sektionerna (rubrikens ark)', () => {
  it('Kanaler, Guide, Sport, Favoriter, Multivy — i den ordningen, med skalets vyer', () => {
    expect(PHONE_SECTIONS.map((s) => s.key)).toEqual(['hub', 'guide', 'sport', 'favs', 'multi'])
    expect(PHONE_SECTIONS.map((s) => s.label)).toEqual(['tabChannels', 'tabGuide', 'sheetSport', 'tabFavourites', 'sheetMultiview'])
  })
  it('en annan sektion navigerar dit; Sport (där vi står) gör ingenting', () => {
    expect(sectionTarget('guide')).toBe('guide')
    expect(sectionTarget('multi')).toBe('multi')
    expect(sectionTarget('sport')).toBeNull()
    expect(sectionTarget('hub', 'hub')).toBeNull()
  })
})

describe('ligans förkortning i tidslinjen', () => {
  it('flera ord → initialer, ett långt ord → fyra bokstäver, kort namn som det är', () => {
    expect(leagueAbbr('Champions League')).toBe('CL')
    expect(leagueAbbr('Premier League')).toBe('PL')
    expect(leagueAbbr('Allsvenskan')).toBe('ALLS')
    expect(leagueAbbr('SHL')).toBe('SHL')
    expect(leagueAbbr('NHL')).toBe('NHL')
    expect(leagueAbbr('')).toBe('')
  })
})

describe('Matchdagens tidslinje på telefon', () => {
  const m = (over: Partial<SportMatch>) => fxMatch({ start: at(19), stop: at(21), ...over })
  it('bara matcher på användarens kanaler; inga kanaler alls → ingen tidslinje', () => {
    const own = m({ id: 'own' })
    const none = m({ id: 'none', sources: [], resultOnly: true })
    const tl = phoneTimeline([own, none], DAY, at(19, 15))!
    expect(tl.rows.flatMap((r) => r.lanes.flat()).map((x) => x.id)).toEqual(['own'])
    expect(phoneTimeline([none], DAY, at(19, 15))).toBeNull()
  })
  it('överlappande matcher i samma liga får egna banor; etiketten är ligans förkortning', () => {
    const a = m({ id: 'a', league: 'Champions League', leagueKey: 'cl', start: at(18, 45), stop: at(20, 45) })
    const b = m({ id: 'b', league: 'Champions League', leagueKey: 'cl', start: at(21), stop: at(23) })
    const c = m({ id: 'c', league: 'Champions League', leagueKey: 'cl', start: at(20), stop: at(22) })
    const d = m({ id: 'd', league: 'SHL', leagueKey: 'shl', kind: 'hockey', start: at(19), stop: at(21, 30) })
    const tl = phoneTimeline([a, b, c, d], DAY, at(19, 15))!
    expect(tl.rows.map((r) => [r.abbr, r.lanes.map((l) => l.map((x) => x.id))])).toEqual([
      ['CL', [['a', 'b'], ['c']]],
      ['SHL', [['d']]],
    ])
  })
  it('ligorna sorteras: följda först, sedan de med något som pågår, sedan flest matcher', () => {
    const one = (id: string, league: string, start: number, over: Partial<SportMatch> = {}) => m({ id, league, leagueKey: league.toLowerCase(), start, stop: start + 2 * HOUR, ...over })
    const rows = [
      one('a1', 'Bundesliga', at(15)), one('a2', 'Bundesliga', at(16, 30)), one('a3', 'Bundesliga', at(21)),
      one('b1', 'Serie A', at(18, 30)),
      one('c1', 'Allsvenskan', at(21)),
    ]
    const follows = [{ sport: 'football' as const, kind: 'league' as const, key: 'allsvenskan', name: 'Allsvenskan' }]
    const tl = phoneTimeline(rows, DAY, at(19), follows)!
    expect(tl.rows.map((r) => r.label)).toEqual(['Allsvenskan', 'Serie A', 'Bundesliga'])
  })
  it('axeln är minst 8 timmar och nu-linjen ligger i procent av den; utanför axeln ingen linje', () => {
    const tl = phoneTimeline([m({ id: 'a', start: at(19), stop: at(21) })], DAY, at(19, 15))!
    expect(tl.end - tl.start).toBeGreaterThanOrEqual(8 * HOUR)
    expect(tl.nowPct).toBeCloseTo(((at(19, 15) - tl.start) / (tl.end - tl.start)) * 100, 5)
    expect(phoneTimeline([m({ id: 'a' })], DAY, DAY - 2 * HOUR)!.nowPct).toBeNull()
  })
})

describe('Tabeller & resultat: "Bara det jag kan se" och ligaväljaren', () => {
  let n = 0
  const r = (over: Partial<SportMatch> = {}): SportMatch => fxMatch({
    id: `r${++n}`, start: n, stop: n + 1, status: 'finished', score: { home: 1, away: 0 }, coverage: 'full',
    fixture: { provider: 'api-sports', id: `f${n}`, leagueId: '113', season: '2026', country: 'Sweden' }, ...over,
  })
  const shl = (over: Partial<SportMatch> = {}) => r({ kind: 'hockey', league: 'SHL', leagueKey: 'shl', fixture: { provider: 'api-sports', id: `h${n}`, leagueId: '47', season: '2026', country: 'Sweden' }, ...over })
  const watch = r({ id: 'watch' })
  const result = r({ id: 'result', sources: [], resultOnly: true })
  const hockey = shl({ id: 'hockey', home: 'Frölunda', away: 'Luleå', homeKey: 'frolunda', awayKey: 'lulea', sources: [], resultOnly: true })

  it('av: allt med fixtur; på: bara matcher med kanal', () => {
    const off = phoneResults([watch, result, hockey], { watchable: false, scope: 'all' }, [])
    expect(off.groups.flatMap((g) => g.matches.map((x) => x.id))).toEqual(['watch', 'result', 'hockey'])
    const on = phoneResults([watch, result, hockey], { watchable: true, scope: 'all' }, [])
    expect(on.groups.flatMap((g) => g.matches.map((x) => x.id))).toEqual(['watch'])
  })
  it('en liga filtrerar till den ligan; ligalistan räknar alla ligor (med växeln)', () => {
    const res = phoneResults([watch, result, hockey], { watchable: false, scope: 'hockey|47' }, [])
    expect(res.groups.map((g) => g.key)).toEqual(['hockey|47'])
    expect(res.entries.map((e) => [e.key, e.count])).toEqual([['football|113', 2], ['hockey|47', 1]])
    const on = phoneResults([watch, result, hockey], { watchable: true, scope: 'hockey|47' }, [])
    expect(on.groups).toEqual([])
    expect(on.entries.map((e) => e.key)).toEqual(['football|113'])
  })
  it('Mina lag = följda lag och ligor, och kombineras med växeln', () => {
    const follows = [{ sport: 'hockey' as const, kind: 'team' as const, key: 'frolunda', name: 'Frölunda' }]
    const mine = phoneResults([watch, result, hockey], { watchable: false, scope: 'followed' }, follows)
    expect(mine.groups.flatMap((g) => g.matches.map((x) => x.id))).toEqual(['hockey'])
    expect(mine.followedCount).toBe(1)
    expect(phoneResults([watch, result, hockey], { watchable: true, scope: 'followed' }, follows).groups).toEqual([])
  })
})

describe('Kvällsplanen', () => {
  it('bockade matcher räknas; två bockade närmare än 100 min krockar', () => {
    const a = fxMatch({ id: 'a', start: at(19, 30) })
    const b = fxMatch({ id: 'b', start: at(20, 0) })
    const c = fxMatch({ id: 'c', start: at(21, 30) })
    const plan = eveningPlan([a, b, c], (m) => m.id !== 'c')
    expect(plan.chosen).toBe(2)
    expect(plan.rows.map((x) => [x.match.id, x.on, x.clash])).toEqual([['a', true, true], ['b', true, true], ['c', false, false]])
    expect(eveningPlan([a, c], () => true).rows.map((x) => x.clash)).toEqual([false, false])
  })
})

describe('klockan per lag', () => {
  it('Av → 15 min → Avspark → Av', () => {
    expect(nextAlert('off')).toBe('15')
    expect(nextAlert('15')).toBe('kickoff')
    expect(nextAlert('kickoff')).toBe('off')
  })
})

describe('plattform', () => {
  it('Android-appen eller en Android-webbläsare → android, annars ios-stilen', () => {
    expect(phonePlatform('Mozilla/5.0 (Linux; Android 14; SM-G970F)', false)).toBe('android')
    expect(phonePlatform('Mozilla/5.0 (Macintosh)', true)).toBe('android')
    expect(phonePlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', false)).toBe('ios')
    expect(phonePlatform('', false)).toBe('ios')
  })
})
