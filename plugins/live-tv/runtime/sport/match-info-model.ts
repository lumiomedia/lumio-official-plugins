import type { FixtureEvent, FixtureLineup, FixtureStat, LineupEntry } from './provider'
import type { SportMatch } from './sport-model'
import { statusAt } from './sport-day-model'
import { markerKind, type MarkerKind } from './event-timeline'

/*
  Matchinfons rena delar (Jerrys skisser 2026-10-11): rubrikens antal,
  Händelser & statistik, Laguppställningar och spelarkortet. Ingen React,
  inga anrop — allt läses ur den fixtur matchinfon redan hämtat.
*/

/** "Idag · 10 matcher · 4 live · 6 på dina kanaler". Reprisfria matcher in. */
export function dayHeaderCounts(matches: SportMatch[], now: number): { total: number; live: number; onChannels: number } {
  return {
    total: matches.length,
    live: matches.filter((m) => statusAt(m, now) === 'live').length,
    onChannels: matches.filter((m) => m.sources.length > 0 && !m.resultOnly).length,
  }
}

/** Raden "3 mål · 1 kort" under Händelser & statistik. */
export function eventSummary(events: FixtureEvent[]): { goals: number; cards: number } {
  return { goals: events.filter((e) => e.type === 'goal').length, cards: events.filter((e) => e.type === 'card').length }
}

export interface EventRow {
  index: number
  minute: string
  marker: MarkerKind | null
  player: string | null
  assist: string | null
  event: FixtureEvent
  /** Hemmalagets händelser står till vänster, bortalagets speglat till höger. */
  align: 'start' | 'end'
}

const SHOWN = new Set<FixtureEvent['type']>(['goal', 'card', 'penalty', 'var'])

export function eventRows(events: FixtureEvent[]): EventRow[] {
  const out: EventRow[] = []
  events.forEach((e, index) => {
    if (!SHOWN.has(e.type)) return
    out.push({
      index,
      minute: e.minute != null ? `${e.minute}'${e.extra ? `+${e.extra}` : ''}` : '',
      marker: markerKind(e),
      player: e.player,
      assist: e.assist,
      event: e,
      align: e.side === 'away' ? 'end' : 'start',
    })
  })
  return out
}

export interface StatBar { label: string; home: string; away: string; homeShare: number }

const num = (v: string): number => {
  const n = Number(String(v).replace('%', '').trim())
  return Number.isFinite(n) ? n : 0
}

/** Dubbla staplar: hemmalagets andel av summan. Rader där båda är 0 visas inte. */
export function statBars(stats: FixtureStat[]): StatBar[] {
  return stats
    .map((s) => {
      const h = num(s.home)
      const a = num(s.away)
      return { label: s.label, home: s.home, away: s.away, sum: h + a, h }
    })
    .filter((s) => s.sum > 0)
    .map(({ label, home, away, sum, h }) => ({ label, home, away, homeShare: h / sum }))
}

export type PositionGroup = 'gk' | 'def' | 'mid' | 'att' | 'other'
export const POSITION_ORDER: readonly PositionGroup[] = ['gk', 'def', 'mid', 'att', 'other']

/** API-Sports skickar G/D/M/F, TheSportsDB hela ord ("Goalkeeper", "Centre-Back", "Left Wing"). */
export function positionGroup(pos: string | null): PositionGroup {
  const p = (pos ?? '').trim().toLowerCase()
  if (!p) return 'other'
  if (p === 'g' || /goal|keeper/.test(p)) return 'gk'
  if (p === 'm' || /midfield/.test(p)) return 'mid'
  if (p === 'd' || /back|defen/.test(p)) return 'def'
  if (p === 'f' || /forward|striker|wing|attack/.test(p)) return 'att'
  return 'other'
}

export interface LineupGroup { group: PositionGroup; home: LineupEntry[]; away: LineupEntry[] }

/** Startelvorna per position, hemma och borta sida vid sida. Tomma grupper tas bort. */
export function lineupGroups(lineups: FixtureLineup[]): LineupGroup[] {
  const side = (s: 'home' | 'away') => lineups.find((l) => l.side === s)?.startXI ?? []
  const home = side('home')
  const away = side('away')
  return POSITION_ORDER
    .map((group) => ({ group, home: home.filter((p) => positionGroup(p.pos) === group), away: away.filter((p) => positionGroup(p.pos) === group) }))
    .filter((g) => g.home.length > 0 || g.away.length > 0)
}

/** "M. ter Stegen" → MT, "Pedri" → P (skissens avatarer). */
export function playerInitials(name: string): string {
  const words = name.split(/\s+/).map((w) => w.replace(/[^\p{L}]/gu, '')).filter(Boolean)
  if (words.length === 0) return '?'
  return words.slice(0, 2).map((w) => w.charAt(0)).join('').toUpperCase()
}

/** Spelarkortets siffror ur matchens egna händelser — inga extra anrop. */
export function playerMatchFacts(name: string, events: FixtureEvent[]): { goals: number; assists: number; yellow: number; red: number } {
  const mine = (e: FixtureEvent) => e.player === name
  return {
    goals: events.filter((e) => e.type === 'goal' && mine(e)).length,
    assists: events.filter((e) => e.type === 'goal' && e.assist === name).length,
    yellow: events.filter((e) => e.type === 'card' && mine(e) && markerKind(e) === 'yellow').length,
    red: events.filter((e) => e.type === 'card' && mine(e) && markerKind(e) === 'red').length,
  }
}
