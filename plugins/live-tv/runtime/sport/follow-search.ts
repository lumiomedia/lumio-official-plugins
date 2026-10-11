'use client'

import { currentBudget } from './budget'
import type { TeamHit } from './provider'
import type { SportKind } from './sport-model'

/**
 * Följer: "Lägg till lag eller turneringar" söker i källan (A) först när
 * användaren SKICKAR frågan, alltså inte per tangenttryck. Det kostar ett
 * anrop av typen `search`, och det skyddas av reserven.
 */
export async function searchProviderTeams(sport: SportKind, q: string): Promise<TeamHit[]> {
  const budget = currentBudget()
  if (!budget || q.trim().length < 3 || budget.provider.coverage(sport) !== 'full') return []
  const res = await budget.searchTeams(sport, q)
  return res.data ?? []
}
