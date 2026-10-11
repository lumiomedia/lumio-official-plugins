import type { TvStringKey } from '../tv/tv-strings'
import type { SportKind, SportMatch } from './sport-model'

/*
  Resultatens rena delar. De bodde i sport/tv/sport-results.tsx (Task 18), men
  telefonträdet får inte importera ur sport/tv/* (importcykelregeln), så TV och
  telefon delar dem härifrån.
*/

type TT = (k: TvStringKey, v?: Record<string, string | number>) => string
export type ResultsFilter = 'all' | 'live' | 'mine'
export interface ResultGroup { key: string; sport: SportKind; league: string; leagueId: string; season: string; round: number | null; matches: SportMatch[] }

// Matcher med fixtur bär källans status i `status` (live omfattar paus), så klockan behövs inte här.
const isLive = (m: SportMatch) => m.status === 'live'
const isMine = (m: SportMatch) => m.sources.length > 0 && !m.resultOnly

export function groupResults(matches: SportMatch[], filter: ResultsFilter): { groups: ResultGroup[]; liveCount: number; mineCount: number } {
  const eligible = matches.filter((m) => m.coverage === 'full' && m.fixture?.leagueId)
  const shown = eligible.filter((m) => (filter === 'live' ? isLive(m) : filter === 'mine' ? isMine(m) : true))
  const groups = new Map<string, ResultGroup>()
  for (const m of shown) {
    const key = `${m.kind}|${m.fixture!.leagueId}`
    const g = groups.get(key) ?? { key, sport: m.kind, league: m.league, leagueId: m.fixture!.leagueId!, season: m.fixture!.season ?? '', round: m.round ?? null, matches: [] }
    g.matches.push(m)
    groups.set(key, g)
  }
  for (const g of groups.values()) g.matches.sort((a, b) => a.start - b.start)
  return { groups: [...groups.values()], liveCount: eligible.filter(isLive).length, mineCount: eligible.filter(isMine).length }
}

export function formLetters(form: string | null, tt: TT): Array<{ letter: string; kind: 'W' | 'D' | 'L' }> {
  const map = { W: tt('sportFormW'), D: tt('sportFormD'), L: tt('sportFormL') }
  return (form ?? '').toUpperCase().split('').filter((c): c is 'W' | 'D' | 'L' => c === 'W' || c === 'D' || c === 'L').map((kind) => ({ kind, letter: map[kind] }))
}

export const FORM_COLOR: Record<'W' | 'D' | 'L', string> = { W: '#3cd6a3', D: 'rgba(243,244,248,0.45)', L: '#e0776a' }
