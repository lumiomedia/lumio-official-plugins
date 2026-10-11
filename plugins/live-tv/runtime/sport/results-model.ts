import type { TvStringKey } from '../tv/tv-strings'
import type { SportKind, SportMatch } from './sport-model'
import type { SportFollow } from './sport-store'
import { followState } from './sport-day-model'

/*
  Resultatens rena delar. De bodde i sport/tv/sport-results.tsx (Task 18), men
  telefonträdet får inte importera ur sport/tv/* (importcykelregeln), så TV och
  telefon delar dem härifrån.
*/

type TT = (k: TvStringKey, v?: Record<string, string | number>) => string
/** `followed` = Mina lag: följda lag och ligor (förvalt när något följs). */
export type ResultsFilter = 'all' | 'live' | 'mine' | 'followed'
export interface ResultGroup { key: string; sport: SportKind; league: string; leagueId: string; season: string; round: number | null; country: string | null; matches: SportMatch[] }

// Matcher med fixtur bär källans status i `status` (live omfattar paus), så klockan behövs inte här.
const isLive = (m: SportMatch) => m.status === 'live'
const isMine = (m: SportMatch) => m.sources.length > 0 && !m.resultOnly

export function groupResults(matches: SportMatch[], filter: ResultsFilter, follows: SportFollow[] = []): { groups: ResultGroup[]; liveCount: number; mineCount: number; followedCount: number } {
  const eligible = matches.filter((m) => m.coverage === 'full' && m.fixture?.leagueId)
  const isFollowed = (m: SportMatch) => followState(m, follows).any
  const shown = eligible.filter((m) => (filter === 'live' ? isLive(m) : filter === 'mine' ? isMine(m) : filter === 'followed' ? isFollowed(m) : true))
  const groups = new Map<string, ResultGroup>()
  for (const m of shown) {
    const key = `${m.kind}|${m.fixture!.leagueId}`
    const g = groups.get(key) ?? { key, sport: m.kind, league: m.league, leagueId: m.fixture!.leagueId!, season: m.fixture!.season ?? '', round: m.round ?? null, country: m.fixture!.country ?? null, matches: [] }
    g.matches.push(m)
    groups.set(key, g)
  }
  for (const g of groups.values()) g.matches.sort((a, b) => a.start - b.start)
  return { groups: [...groups.values()], liveCount: eligible.filter(isLive).length, mineCount: eligible.filter(isMine).length, followedCount: eligible.filter(isFollowed).length }
}

/** Mina lag förvalt så fort användaren följer något. */
export function defaultResultsFilter(follows: SportFollow[]): ResultsFilter {
  return follows.length > 0 ? 'followed' : 'all'
}

/** Ett ligaval (Dina ligor / Fler ligor) FILTRERAR till den ligan; `null` = alla ligor. */
export function onlyLeague(groups: ResultGroup[], key: string | null): ResultGroup[] {
  return key ? groups.filter((g) => g.key === key) : groups
}

export function formLetters(form: string | null, tt: TT): Array<{ letter: string; kind: 'W' | 'D' | 'L' }> {
  const map = { W: tt('sportFormW'), D: tt('sportFormD'), L: tt('sportFormL') }
  return (form ?? '').toUpperCase().split('').filter((c): c is 'W' | 'D' | 'L' => c === 'W' || c === 'D' || c === 'L').map((kind) => ({ kind, letter: map[kind] }))
}

export const FORM_COLOR: Record<'W' | 'D' | 'L', string> = { W: '#3cd6a3', D: 'rgba(243,244,248,0.45)', L: '#e0776a' }
