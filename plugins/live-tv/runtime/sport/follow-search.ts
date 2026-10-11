'use client'

import { currentBudget } from './budget'
import { foldTeamKey } from './merge'
import type { TeamHit } from './provider'
import type { SportKind } from './sport-model'

/** En träff i källan: lag eller turnering, med sporten den söktes i. */
export interface FollowHit extends TeamHit { kind: 'team' | 'league'; sport: SportKind }

export const MIN_PROVIDER_QUERY = 3
export const PROVIDER_SEARCH_DEBOUNCE_MS = 400

/** Lokal filtrering: accentokänslig delsträng i namnet eller nyckeln. Tom fråga släpper igenom allt. */
export function matchesQuery(c: { name: string; key: string }, q: string): boolean {
  const needle = foldTeamKey(q)
  if (!needle) return true
  return foldTeamKey(c.name).includes(needle) || foldTeamKey(c.key).includes(needle)
}

// Samma fråga i samma källa ska aldrig kosta två anrop under sessionen (budgetens diskcache tar resten).
const cache = new Map<string, Promise<FollowHit[]>>()
export function __resetFollowSearchForTests(): void { cache.clear() }

/**
 * Följer: "Lägg till lag eller turneringar" frågar källan efter lag och
 * turneringar. Väljaren anropar detta först efter en paus i skrivandet
 * (PROVIDER_SEARCH_DEBOUNCE_MS), aldrig per tangenttryck, och bara med minst
 * tre tecken. Varje anrop går genom budgeten som `search` och skyddas av reserven.
 */
export function searchFollowTargets(sport: SportKind, q: string): Promise<FollowHit[]> {
  const budget = currentBudget()
  const query = q.trim()
  if (!budget || query.length < MIN_PROVIDER_QUERY || budget.provider.coverage(sport) !== 'full') return Promise.resolve([])
  const id = `${budget.provider.id}|${sport}|${foldTeamKey(query)}`
  const hit = cache.get(id)
  if (hit) return hit
  const run = (async () => {
    const [teams, leagues] = await Promise.all([budget.searchTeams(sport, query), budget.searchLeagues(sport, query)])
    const out: FollowHit[] = []
    const seen = new Set<string>()
    const add = (kind: FollowHit['kind'], list: TeamHit[] | null | undefined) => {
      for (const t of list ?? []) {
        const k = `${kind}:${t.id}`
        if (!t.id || !t.name || seen.has(k)) continue
        seen.add(k)
        out.push({ kind, sport, ...t })
      }
    }
    add('team', teams.data)
    add('league', leagues?.data)
    return out
  })()
  cache.set(id, run)
  // Ett misslyckat anrop (nät, kvot) ska få försökas igen vid nästa sökning.
  run.then((res) => { if (res.length === 0) cache.delete(id) }, () => cache.delete(id))
  return run
}

/** Bara lag (telefonens sökruta). */
export async function searchProviderTeams(sport: SportKind, q: string): Promise<TeamHit[]> {
  const res = await searchFollowTargets(sport, q)
  return res.filter((x) => x.kind === 'team').map(({ kind: _k, sport: _s, ...t }) => t)
}
