import { describe, expect, it } from 'vitest'
import { eventTimeline } from './event-timeline'
import type { FixtureEvent } from './provider'

const ev = (over: Partial<FixtureEvent>): FixtureEvent => ({ minute: 10, extra: null, side: 'home', type: 'goal', detail: '', player: 'X', assist: null, ...over })

describe('händelsernas tidslinje', () => {
  it('fotboll: 0–90 med halvtid vid 45, mål och kort som markörer, byten och VAR utan markör', () => {
    const t = eventTimeline([
      ev({ minute: 9 }),
      ev({ minute: 45, extra: 2, type: 'card', detail: 'Yellow Card', side: 'away' }),
      ev({ minute: 60, type: 'sub' }),
      ev({ minute: 72, type: 'var' }),
      ev({ minute: 81, type: 'card', detail: 'Red Card' }),
    ], 'football')
    expect(t.length).toBe(90)
    expect(t.periods).toEqual([45])
    expect(t.markers.map((m) => [m.kind, m.side, m.at])).toEqual([
      ['goal', 'home', 10],
      ['yellow', 'away', 50],
      ['red', 'home', 90],
    ])
    expect(t.markers.map((m) => m.index)).toEqual([0, 1, 4])
    expect(t.now).toBeNull()
  })
  it('fotboll med förlängning växer till 120; tilläggstid i slutet stannar vid kanten', () => {
    expect(eventTimeline([ev({ minute: 105 })], 'football')).toMatchObject({ length: 120, periods: [45, 90, 105] })
    expect(eventTimeline([ev({ minute: 90, extra: 4 })], 'football').markers[0]!.at).toBe(100)
  })
  it('hockey: tre perioder (0–60, streck vid 20 och 40), utvisningar som kort', () => {
    const t = eventTimeline([ev({ minute: 5 }), ev({ minute: 28, type: 'penalty', side: 'away' }), ev({ minute: 57 })], 'hockey')
    expect(t.length).toBe(60)
    expect(t.periods).toEqual([20, 40])
    expect(t.markers.map((m) => [m.kind, Math.round(m.at)])).toEqual([['goal', 8], ['penalty', 47], ['goal', 95]])
  })
  it('hockey med sudden death: 65 minuter', () => {
    expect(eventTimeline([ev({ minute: 63 })], 'hockey').length).toBe(65)
  })
  it('pågående match: nu-markör på minuten, aldrig utanför linjen', () => {
    expect(eventTimeline([], 'football', 45).now).toBe(50)
    expect(eventTimeline([], 'football', 97).now).toBe(100)
    expect(eventTimeline([], 'hockey', 30).now).toBe(50)
  })
  it('händelse utan minut ritas inte', () => {
    expect(eventTimeline([ev({ minute: null })], 'football').markers).toEqual([])
  })
})
