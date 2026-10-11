import { qualityFromName } from '../live-tv-model'
import { SPORT_KINDS, matchTitle, type MatchSource, type MatchStatus, type SportDay, type SportFilter, type SportKind, type SportMatch } from './sport-model'
import { sportsCompatible, teamKeysMatch, type SportFollow, type SportOverrides } from './sport-store'

/*
  Allt vyerna räknar ut, som rena funktioner. Ingen React, ingen lagring —
  vyerna skickar in klockan, följda och åsidosättningar.
*/

const HOUR = 3_600_000
const MIN = 60_000

export function statusAt(m: SportMatch, now: number): MatchStatus {
  // Fas 2: en match med källfixtur litar på källans status (live efter EPG-slut, avslutad före).
  if (m.phase === 'postponed') return 'upcoming'
  if (m.fixture && m.status !== 'upcoming') return m.status
  if (m.status === 'finished' || now >= m.stop) return 'finished'
  if (now >= m.start) return 'live'
  return 'upcoming'
}

export function visibleMatches(day: SportDay | null, filter: SportFilter): SportMatch[] {
  if (!day) return []
  return day.matches
    .filter((m) => !m.rerun && (filter === 'all' || m.kind === filter))
    .sort((a, b) => a.start - b.start || matchTitle(a).localeCompare(matchTitle(b)))
}

export function sportCounts(day: SportDay | null): Record<SportKind, number> {
  const out = Object.fromEntries(SPORT_KINDS.map((k) => [k, 0])) as Record<SportKind, number>
  for (const m of day?.matches ?? []) if (!m.rerun) out[m.kind] += 1
  return out
}

export function splitSections(matches: SportMatch[], now: number): { live: SportMatch[]; later: SportMatch[]; finished: SportMatch[] } {
  return {
    live: matches.filter((m) => statusAt(m, now) === 'live'),
    later: matches.filter((m) => statusAt(m, now) === 'upcoming'),
    finished: matches.filter((m) => statusAt(m, now) === 'finished'),
  }
}

export function headerSummary(matches: SportMatch[], now: number): { total: number; live: number } {
  return { total: matches.length, live: matches.filter((m) => statusAt(m, now) === 'live').length }
}

export function matchesFollow(m: SportMatch, f: SportFollow): boolean {
  if (!sportsCompatible(f.sport, m.kind)) return false
  if (f.kind === 'league') return m.leagueKey !== '' && m.leagueKey === f.key
  return teamKeysMatch(f.key, m.homeKey) || teamKeysMatch(f.key, m.awayKey)
}

export function followState(m: SportMatch, follows: SportFollow[]): { home: boolean; away: boolean; league: boolean; any: boolean } {
  const team = (key: string | null) => follows.some((f) => f.kind === 'team' && sportsCompatible(f.sport, m.kind) && teamKeysMatch(f.key, key))
  const home = team(m.homeKey)
  const away = team(m.awayKey)
  const league = m.leagueKey !== '' && follows.some((f) => f.kind === 'league' && f.key === m.leagueKey)
  return { home, away, league, any: home || away || league }
}

export function rankedSources(m: SportMatch, overrides: SportOverrides): MatchSource[] {
  const o = overrides[m.id]
  if (!o) return m.sources
  const own = m.sources.find((s) => s.channelKey === o.key)
  const chosen: MatchSource = own ?? {
    channelKey: o.key, name: o.name, url: o.url, logo: o.logo, group: o.group, tvgId: o.tvgId,
    sourceId: '', quality: qualityFromName(o.name), programmeStart: m.start, programmeStop: m.stop, liveFlag: false,
  }
  return [chosen, ...m.sources.filter((s) => s.channelKey !== o.key)]
}

export function featuredMatch(matches: SportMatch[], follows: SportFollow[], now: number): SportMatch | null {
  const score = (m: SportMatch) => (followState(m, follows).any ? 1000 : 0) + m.sources.length
  const best = (list: SportMatch[]) => [...list].sort((a, b) => score(b) - score(a) || a.start - b.start)[0] ?? null
  const live = matches.filter((m) => statusAt(m, now) === 'live')
  const upcoming = matches.filter((m) => statusAt(m, now) === 'upcoming')
  return best(live) ?? best(upcoming.filter((m) => followState(m, follows).any)) ?? upcoming[0] ?? matches[matches.length - 1] ?? null
}

export function nextOnYourChannels(matches: SportMatch[], now: number, excludeId: string | null, limit = 3): SportMatch[] {
  return matches
    .filter((m) => m.id !== excludeId && m.sources.length > 0 && statusAt(m, now) === 'upcoming')
    .sort((a, b) => a.start - b.start)
    .slice(0, limit)
}

export function timelineAxis(matches: SportMatch[], dayFrom: number): { start: number; end: number; hours: number[] } {
  const dayTo = dayFrom + 24 * HOUR
  let start = dayFrom + 15 * HOUR
  let end = dayFrom + 23 * HOUR
  if (matches.length > 0) {
    start = Math.max(dayFrom, Math.floor(Math.min(...matches.map((m) => m.start)) / HOUR) * HOUR)
    end = Math.min(dayTo, Math.ceil(Math.max(...matches.map((m) => m.stop)) / HOUR) * HOUR)
    if (end - start < 8 * HOUR) {
      end = Math.min(dayTo, start + 8 * HOUR)
      start = Math.max(dayFrom, end - 8 * HOUR)
    }
  }
  const hours: number[] = []
  for (let t = start; t < end; t += HOUR) hours.push(t)
  return { start, end, hours }
}

export interface TimelineRow {
  key: string
  label: string
  kind: SportKind
  lanes: SportMatch[][]
}

export function timelineRows(matches: SportMatch[]): TimelineRow[] {
  const rows = new Map<string, TimelineRow>()
  for (const m of [...matches].sort((a, b) => a.start - b.start)) {
    const key = m.leagueKey || `kind:${m.kind}`
    const row = rows.get(key) ?? { key, label: m.league, kind: m.kind, lanes: [] }
    rows.set(key, row)
    const lane = row.lanes.find((l) => (l[l.length - 1]?.stop ?? 0) <= m.start)
    if (lane) lane.push(m)
    else row.lanes.push([m])
  }
  return [...rows.values()]
}

const MERGE_GAP_MS = 5 * MIN

/** Angränsande block med samma titel (<= 5 min mellan) blir ett — F1-raden fylls annars av småbitar. */
export function mergeLane(lane: SportMatch[]): SportMatch[] {
  const out: SportMatch[] = []
  for (const m of lane) {
    const prev = out[out.length - 1]
    if (prev && matchTitle(prev) === matchTitle(m) && m.start - prev.stop <= MERGE_GAP_MS) out[out.length - 1] = { ...prev, stop: Math.max(prev.stop, m.stop) }
    else out.push(m)
  }
  return out
}

/** Under ~6 % av axeln finns inte plats för en läsbar titel — då visas bara färgstapeln. */
export function blockShowsLabel(durationMs: number, axisSpanMs: number, minShare = 0.06): boolean {
  return axisSpanMs > 0 && durationMs / axisSpanMs >= minShare
}

export function clashes(matches: SportMatch[], minutes = 100): Set<string> {
  const sorted = [...matches].sort((a, b) => a.start - b.start)
  const out = new Set<string>()
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length && sorted[j]!.start - sorted[i]!.start < minutes * MIN; j += 1) {
      out.add(sorted[i]!.id)
      out.add(sorted[j]!.id)
    }
  }
  return out
}

export interface FollowCandidate {
  sport: SportKind
  kind: 'team' | 'league'
  key: string
  name: string
  count: number
}

export function followCandidates(days: (SportDay | null)[]): FollowCandidate[] {
  const out = new Map<string, FollowCandidate>()
  const add = (c: Omit<FollowCandidate, 'count'>) => {
    const id = `${c.kind}:${c.key}`
    const hit = out.get(id)
    if (hit) hit.count += 1
    else out.set(id, { ...c, count: 1 })
  }
  for (const day of days) {
    for (const m of day?.matches ?? []) {
      if (m.rerun) continue
      if (m.leagueKey) add({ sport: m.kind, kind: 'league', key: m.leagueKey, name: m.league })
      if (m.home && m.homeKey) add({ sport: m.kind, kind: 'team', key: m.homeKey, name: m.home })
      if (m.away && m.awayKey) add({ sport: m.kind, kind: 'team', key: m.awayKey, name: m.away })
    }
  }
  return [...out.values()].sort((a, b) =>
    SPORT_KINDS.indexOf(a.sport) - SPORT_KINDS.indexOf(b.sport) || (a.kind === b.kind ? 0 : a.kind === 'league' ? -1 : 1) || a.name.localeCompare(b.name))
}

export function nextMatchFor(f: SportFollow, days: (SportDay | null)[], now: number): SportMatch | null {
  return days
    .flatMap((d) => d?.matches ?? [])
    .filter((m) => !m.rerun && statusAt(m, now) !== 'finished' && matchesFollow(m, f))
    .sort((a, b) => a.start - b.start)[0] ?? null
}

export function teamRing(f: SportFollow, matches: SportMatch[], now: number): 'live' | 'today' | 'none' {
  const mine = matches.filter((m) => !m.rerun && matchesFollow(m, f))
  if (mine.some((m) => statusAt(m, now) === 'live')) return 'live'
  if (mine.some((m) => statusAt(m, now) === 'upcoming')) return 'today'
  return 'none'
}

export function pickMultiviewKeys(matches: SportMatch[], overrides: SportOverrides, isKnown: (key: string) => boolean, max = 4): string[] {
  const out: string[] = []
  for (const m of matches) {
    const ranked = rankedSources(m, overrides)
    const chosen = ranked.find((s) => isKnown(s.channelKey)) ?? ranked[0]
    if (chosen && !out.includes(chosen.channelKey)) out.push(chosen.channelKey)
    if (out.length >= max) break
  }
  return out
}

const LEAGUE_COLORS: Record<string, string> = {
  allsvenskan: '#3b82f6', superettan: '#60a5fa', 'premier-league': '#a855f7', 'efl-championship': '#c084fc',
  'uefa-champions-league': '#2563eb', 'uefa-europa-league': '#f97316', 'uefa-nations-league': '#0ea5e9',
  'serie-a': '#22c55e', bundesliga: '#e11d48', 'la-liga': '#f59e0b', 'ligue-1': '#14b8a6',
  shl: '#ef4444', hockeyallsvenskan: '#fb923c', nhl: '#94a3b8', f1: '#dc2626', motogp: '#f43f5e', atp: '#84cc16',
}

function hue(key: string): number {
  let h = 0
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) % 360
  return h
}

export function leagueColor(key: string): string {
  return LEAGUE_COLORS[key] ?? `hsl(${hue(key)} 70% 60%)`
}

export function crestColor(key: string): string {
  return `hsl(${hue(key)} 55% 42%)`
}

/**
  Spelarens matchlåda, grupperad på tid som Guiden: "Pågår nu" (kanalens egen
  match överst) och sedan en grupp per avsparkstid. Bara matcher med kanal —
  de utan finns i Resultat. `start: null` = pågår nu.
*/
export function playerMatchGroups(matches: SportMatch[], currentKey: string, now: number): { start: number | null; matches: SportMatch[] }[] {
  const withSource = matches.filter((m) => m.sources.length > 0)
  const onHere = (m: SportMatch) => (m.sources.some((s) => s.channelKey === currentKey) ? 0 : 1)
  const live = withSource.filter((m) => statusAt(m, now) === 'live').sort((a, b) => onHere(a) - onHere(b) || a.start - b.start || matchTitle(a).localeCompare(matchTitle(b)))
  const upcoming = withSource.filter((m) => statusAt(m, now) === 'upcoming').sort((a, b) => a.start - b.start || matchTitle(a).localeCompare(matchTitle(b)))
  const groups: { start: number | null; matches: SportMatch[] }[] = live.length > 0 ? [{ start: null, matches: live }] : []
  for (const m of upcoming) {
    const last = groups[groups.length - 1]
    if (last && last.start === m.start) last.matches.push(m)
    else groups.push({ start: m.start, matches: [m] })
  }
  return groups
}

/**
  Matchdagens remsa: EN tidsordnad rad i stället för sektionerna Live nu /
  Senare / Avslutade. Det som startat (avslutat eller pågående) först, sedan
  nu-markören (`nowIndex` = platsen före det första kommande) och det som
  kommer. `focusIndex` är matchen remsan ska rullas fram till: första
  pågående, annars första kommande.
*/
export function matchdayStrip(matches: SportMatch[], now: number): { items: SportMatch[]; nowIndex: number; focusIndex: number } {
  const byStart = (a: SportMatch, b: SportMatch) => a.start - b.start || matchTitle(a).localeCompare(matchTitle(b))
  const started = matches.filter((m) => statusAt(m, now) !== 'upcoming').sort(byStart)
  const upcoming = matches.filter((m) => statusAt(m, now) === 'upcoming').sort(byStart)
  const items = [...started, ...upcoming]
  const firstLive = items.findIndex((m) => statusAt(m, now) === 'live')
  const focusIndex = firstLive >= 0 ? firstLive : Math.min(started.length, Math.max(items.length - 1, 0))
  return { items, nowIndex: started.length, focusIndex }
}
