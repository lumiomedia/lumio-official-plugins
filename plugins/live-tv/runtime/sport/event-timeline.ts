import type { FixtureEvent } from './provider'
import type { SportKind } from './sport-model'

/*
  Matchcentrets lilla tidslinje: en vågrät linje över matchens speltid med
  markörer för mål och kort (hockey: utvisningar), hemmalaget ovanför och
  bortalaget under. Ren funktion — vyn ritar bara procenten.
*/

export type MarkerKind = 'goal' | 'yellow' | 'red' | 'penalty'
export interface TimelineMarker { kind: MarkerKind; side: 'home' | 'away' | null; minute: number; at: number; index: number }
export interface EventTimeline { length: number; periods: number[]; markers: TimelineMarker[]; now: number | null }

/** Ordinarie speltid och periodgränser per sport. */
const REGULATION: Partial<Record<SportKind, { length: number; periods: number[] }>> = {
  football: { length: 90, periods: [45] },
  hockey: { length: 60, periods: [20, 40] },
  handball: { length: 60, periods: [30] },
  basketball: { length: 48, periods: [12, 24, 36] },
}

export function markerKind(e: FixtureEvent): MarkerKind | null {
  if (e.type === 'goal') return 'goal'
  if (e.type === 'penalty') return 'penalty'
  if (e.type === 'card') return /red/i.test(e.detail) ? 'red' : 'yellow'
  return null
}

export function eventTimeline(events: FixtureEvent[], kind: SportKind, liveMinute: number | null = null): EventTimeline {
  const base = REGULATION[kind] ?? { length: 90, periods: [] }
  const last = Math.max(0, ...events.map((e) => e.minute ?? 0))
  let length = base.length
  let periods = base.periods
  // Förlängning: fotboll 2 × 15, hockey 5 min sudden death. Tilläggstid (90+4) växer inte linjen.
  if (last > base.length) {
    if (kind === 'football') { length = 120; periods = [...base.periods, 90, 105] }
    else if (kind === 'hockey') { length = 65; periods = [...base.periods, 60] }
    else length = last
  }
  const pct = (minute: number) => (Math.min(Math.max(minute, 0), length) / length) * 100
  const markers: TimelineMarker[] = []
  events.forEach((e, index) => {
    const k = markerKind(e)
    if (!k || e.minute == null) return
    markers.push({ kind: k, side: e.side, minute: e.minute, at: pct(e.minute), index })
  })
  return { length, periods, markers, now: liveMinute == null ? null : pct(liveMinute) }
}
