import { describe, expect, it } from 'vitest'
import { dayHeaderCounts, eventRows, eventSummary, lineupGroups, playerInitials, playerMatchFacts, positionGroup, statBars } from './match-info-model'
import type { FixtureEvent, FixtureLineup } from './provider'
import { fxMatch, fxSource } from './__sport-fixture'

const ev = (over: Partial<FixtureEvent>): FixtureEvent => ({ minute: 10, extra: null, side: 'home', type: 'goal', detail: 'Normal Goal', player: 'X', assist: null, ...over })

describe('dayHeaderCounts', () => {
  it('matcher, live och på dina kanaler (reprisfria; bara-resultat räknas inte som kanal)', () => {
    const now = Date.now()
    const live = fxMatch({ id: 'a', start: now - 600_000, stop: now + 600_000 })
    const later = fxMatch({ id: 'b', start: now + 3_600_000, sources: [] })
    const result = fxMatch({ id: 'c', start: now + 3_600_000, resultOnly: true, sources: [fxSource('X')] })
    expect(dayHeaderCounts([live, later, result], now)).toEqual({ total: 3, live: 1, onChannels: 1 })
  })
})

describe('eventSummary', () => {
  it('räknar mål och kort (missad straff är inget mål)', () => {
    const events = [ev({}), ev({ type: 'card', detail: 'Yellow Card' }), ev({ side: 'away' }), ev({ type: 'goal' }), ev({ type: 'sub' }), ev({ type: 'card', detail: 'Red Card' })]
    expect(eventSummary(events)).toEqual({ goals: 3, cards: 2 })
  })
})

describe('eventRows', () => {
  it('bara mål, kort, straffar och VAR; hemma vänster, borta höger (speglad); minut med tillägg', () => {
    const rows = eventRows([
      ev({ minute: 17, player: 'R. Lewandowski', assist: 'F. de Jong' }),
      ev({ minute: 24, type: 'card', detail: 'Yellow Card', player: 'P. Cubarsí' }),
      ev({ minute: 60, type: 'sub', player: 'Y' }),
      ev({ minute: 45, extra: 2, side: 'away', player: 'O. Dembélé', assist: 'Vitinha' }),
    ])
    expect(rows.map((r) => [r.minute, r.marker, r.player, r.assist, r.align])).toEqual([
      ["17'", 'goal', 'R. Lewandowski', 'F. de Jong', 'start'],
      ["24'", 'yellow', 'P. Cubarsí', null, 'start'],
      ["45'+2", 'goal', 'O. Dembélé', 'Vitinha', 'end'],
    ])
  })
  it('händelse utan sida står till vänster', () => {
    expect(eventRows([ev({ side: null })])[0]!.align).toBe('start')
  })
})

describe('statBars', () => {
  it('andelar ur tal och procent; okända värden blir 0; bara rader med något värde', () => {
    const bars = statBars([
      { label: 'Ball Possession', home: '52%', away: '48%' },
      { label: 'Total Shots', home: '16', away: '12' },
      { label: 'Fouls', home: '0', away: '0' },
      { label: 'Odd', home: 'x', away: '3' },
    ])
    expect(bars.map((b) => [b.label, b.home, b.away, Math.round(b.homeShare * 100)])).toEqual([
      ['Ball Possession', '52%', '48%', 52],
      ['Total Shots', '16', '12', 57],
      ['Odd', 'x', '3', 0],
    ])
  })
})

describe('positionGroup', () => {
  it('API-Sports bokstäver och TheSportsDB-ord', () => {
    expect(['G', 'D', 'M', 'F', 'Goalkeeper', 'Centre-Back', 'Defensive Midfield', 'Left Wing', 'Striker', null, 'Coach'].map(positionGroup))
      .toEqual(['gk', 'def', 'mid', 'att', 'gk', 'def', 'mid', 'att', 'att', 'other', 'other'])
  })
})

describe('lineupGroups', () => {
  it('startelvor per position, hemma och borta sida vid sida, tomma grupper bort', () => {
    const lineups: FixtureLineup[] = [
      { side: 'home', formation: '4-3-3', subs: [], startXI: [{ number: 1, name: 'M. ter Stegen', pos: 'G' }, { number: 2, name: 'J. Koundé', pos: 'D' }, { number: 9, name: 'R. Lewandowski', pos: 'F' }] },
      { side: 'away', formation: '4-3-3', subs: [], startXI: [{ number: 1, name: 'G. Donnarumma', pos: 'G' }, { number: 8, name: 'Vitinha', pos: 'M' }] },
    ]
    const groups = lineupGroups(lineups)
    expect(groups.map((g) => [g.group, g.home.map((p) => p.name), g.away.map((p) => p.name)])).toEqual([
      ['gk', ['M. ter Stegen'], ['G. Donnarumma']],
      ['def', ['J. Koundé'], []],
      ['mid', [], ['Vitinha']],
      ['att', ['R. Lewandowski'], []],
    ])
  })
  it('inga uppställningar → tom lista', () => {
    expect(lineupGroups([])).toEqual([])
  })
})

describe('playerInitials', () => {
  it('de två första ordens bokstäver (skissens MT, FD)', () => {
    expect(['M. ter Stegen', 'Pedri', 'A. Hakimi', 'Marquinhos', 'F. de Jong', ''].map(playerInitials)).toEqual(['MT', 'P', 'AH', 'M', 'FD', '?'])
  })
})

describe('playerMatchFacts', () => {
  it('mål, assist och kort i den här matchen', () => {
    const events = [ev({ player: 'L. Yamal', assist: 'Pedri' }), ev({ player: 'Pedri', type: 'card', detail: 'Yellow Card' }), ev({ player: 'Pedri' })]
    expect(playerMatchFacts('Pedri', events)).toEqual({ goals: 1, assists: 1, yellow: 1, red: 0 })
  })
})
