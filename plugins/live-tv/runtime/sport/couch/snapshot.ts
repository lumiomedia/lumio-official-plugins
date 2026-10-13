import type { CouchSport, CouchSportGoal, CouchSportMatch, CouchSportMultiview } from '@/lib/plugin-sdk'
import type { MultiviewState } from '../../tv/tv-multiview-store'
import type { SportMatch } from '../sport-model'
import type { SportFollow, SportOverrides } from '../sport-store'
import { followState, rankedSources, statusAt } from '../sport-day-model'
import { showsScore } from '../score-model'

/** Soffläge Sport: telefonens bild ur resultatcachen. Lätt; detaljer hämtas med frågan sport-match. */
export const NOW_MAX = 40
export const SOON_MAX = 10
export const SOON_WINDOW_MS = 3 * 3_600_000

export type SnapshotInput = {
  matches: SportMatch[]
  playing: string | null
  marks: { sportPage: boolean; multiview: boolean }
  /** Multiview-rutan som har ljudet. */
  audioChannel: string | null
  follows: SportFollow[]
  overrides: SportOverrides
  hasKey: boolean
  updatedAt: number | null
  now: number
  /** Multiview-rutorna, bara medan Multiview visas (`marks.multiview`). */
  multiview: MultiviewState | null
  /** Öppna mål ur målregistret (goals.ts). */
  goals: CouchSportGoal[]
}

export function teamShort(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? ''
  return first.slice(0, 3).toUpperCase()
}

const team = (name: string | null, crest: string | null | undefined) => (name ? { name, short: teamShort(name), crest: crest ?? null } : null)
const onChannel = (m: SportMatch, key: string | null) => !!key && m.sources.some((s) => s.channelKey === key)
// En repris "visas" medan den sänds; en riktig match räknas som på TV:n bara när den pågår.
const airing = (m: SportMatch, now: number) => (m.rerun ? m.start <= now && now < m.stop : statusAt(m, now) === 'live')
const liveWithChannel = (m: SportMatch, now: number) => !m.rerun && statusAt(m, now) === 'live' && m.sources.length > 0
const byStart = (a: SportMatch, b: SportMatch) => a.start - b.start || (a.home ?? a.event ?? '').localeCompare(b.home ?? b.event ?? '')

export function toCouchMatch(m: SportMatch, i: Pick<SnapshotInput, 'follows' | 'overrides' | 'hasKey' | 'now'> & { tvKey: string | null }): CouchSportMatch {
  const best = rankedSources(m, i.overrides)[0] ?? null
  // showsScore är redan falskt för repriser: fas 1 skickar aldrig ett reprisresultat.
  const scored = i.hasKey && showsScore(m)
  const detail = i.hasKey && m.coverage === 'full' && !!m.fixture && !m.rerun
  return {
    id: m.id, sport: m.kind, league: m.league, round: m.round,
    home: team(m.home, m.homeCrest), away: team(m.away, m.awayCrest), event: m.event,
    status: m.rerun ? 'replay' : m.phase === 'ht' ? 'ht' : statusAt(m, i.now),
    ...(scored && m.score ? { score: [m.score.home, m.score.away] as [number, number] } : {}),
    ...(scored && m.minute != null ? { minute: `${m.minute}'` } : {}),
    start: m.start, end: m.stop,
    channel: best ? { key: best.channelKey, name: best.name, best: m.sources.length > 1 } : null,
    followed: followState(m, i.follows).any,
    onTv: onChannel(m, i.tvKey),
    hasDetail: { events: detail, stats: detail && m.kind !== 'motorsport', lineup: detail && m.kind === 'football' },
  }
}

function leagueLive(matches: SportMatch[], leagueKey: string, now: number): SportMatch[] {
  return matches.filter((m) => m.leagueKey === leagueKey && liveWithChannel(m, now)).sort(byStart)
}

/** Nästa/föregående live-match med kanal i fokusmatchens liga (svep på ställningskortet). */
export function zapTarget(matches: SportMatch[], focusId: string, dir: -1 | 1, now: number): SportMatch | null {
  const focus = matches.find((m) => m.id === focusId)
  if (!focus) return null
  const list = leagueLive(matches, focus.leagueKey, now)
  const at = list.findIndex((m) => m.id === focusId)
  if (at < 0 || list.length < 2) return null
  return list[(at + dir + list.length) % list.length]
}

/** Kanalnyckeln är `kanal::källa`; utan matchkälla visas delen före `::`. */
const keyName = (key: string) => key.split('::')[0] || key

function toCouchMultiview(i: SnapshotInput, mv: MultiviewState, tvKey: string | null): CouchSportMultiview {
  return {
    layout: mv.layout,
    audioIndex: mv.audioIndex,
    tiles: mv.tiles.map((key) => {
      if (!key) return null
      const m = i.matches.find((x) => onChannel(x, key) && airing(x, i.now)) ?? null
      // Källans namn även när matchen på kanalen inte sänds nu (dagens matcher bär kanalens namn).
      const source = (m ? [m] : i.matches).flatMap((x) => x.sources).find((s) => s.channelKey === key)
      return { match: m ? toCouchMatch(m, { ...i, tvKey }) : null, channelName: source?.name ?? keyName(key) }
    }),
  }
}

export function buildCouchSport(i: SnapshotInput): CouchSport {
  const tvKey = i.marks.multiview ? i.audioChannel : i.playing
  const focusMatch = tvKey ? i.matches.find((m) => onChannel(m, tvKey) && airing(m, i.now)) ?? null : null
  const context = i.marks.multiview ? 'multiview' : focusMatch ? 'channel' : i.marks.sportPage ? 'sport-page' : null
  const conv = (m: SportMatch) => toCouchMatch(m, { ...i, tvKey })
  const followed = (m: SportMatch) => Number(followState(m, i.follows).any)
  const live = i.matches.filter((m) => liveWithChannel(m, i.now)).sort((a, b) => followed(b) - followed(a) || byStart(a, b))
  const soon = i.matches
    .filter((m) => !m.rerun && statusAt(m, i.now) === 'upcoming' && m.sources.length > 0 && m.start - i.now <= SOON_WINDOW_MS)
    .sort(byStart)
  let focusIndex: CouchSport['focusIndex'] = null
  if (focusMatch) {
    const list = leagueLive(i.matches, focusMatch.leagueKey, i.now)
    const at = list.findIndex((m) => m.id === focusMatch.id)
    if (at >= 0) focusIndex = { i: at + 1, n: list.length }
  }
  return {
    context, hasKey: i.hasKey,
    focus: context && focusMatch ? conv(focusMatch) : null,
    focusIndex: context ? focusIndex : null,
    now: live.slice(0, NOW_MAX).map(conv), soon: soon.slice(0, SOON_MAX).map(conv), updatedAt: i.updatedAt,
    multiview: i.marks.multiview && i.multiview ? toCouchMultiview(i, i.multiview, tvKey) : null,
    goals: i.goals,
  }
}
