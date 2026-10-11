// runtime/sport/providers.ts
import { apiSports } from './api-sports'
import { theSportsDb } from './thesportsdb'
import { sportApi } from './sportapi'
import type { ProviderId, SportsProvider } from './provider'
import type { SportKind } from './sport-model'
import type { ProviderKeys, SportOrder } from './sport-store'

export const PROVIDER_IDS: ProviderId[] = ['sportapi', 'api-sports', 'thesportsdb']

export const PROVIDER_LABEL: Record<ProviderId, string> = { sportapi: 'sportapi.ai', 'api-sports': 'API-Sports', thesportsdb: 'TheSportsDB' }

export function providerFor(id: ProviderId): SportsProvider {
  return id === 'thesportsdb' ? theSportsDb : id === 'sportapi' ? sportApi : apiSports
}

/** Standardordningen (Jerry 2026-10-11): fotboll först hos sportapi.ai (2 000/dag gratis), annars API-Sports. */
export function defaultOrder(sport: SportKind): ProviderId[] {
  return sport === 'football' ? ['sportapi', 'api-sports', 'thesportsdb'] : ['api-sports', 'thesportsdb']
}

/**
 * Hela ordningen för sporten, med eller utan nyckel: användarens egen ordning
 * först, sedan standardordningen för det som saknas. Bara källor som täcker sporten.
 */
export function orderFor(order: SportOrder, sport: SportKind): ProviderId[] {
  const covering = PROVIDER_IDS.filter((id) => providerFor(id).coverage(sport) === 'full')
  const out = (order[sport] ?? []).filter((id) => covering.includes(id))
  for (const id of [...defaultOrder(sport), ...covering]) if (covering.includes(id) && !out.includes(id)) out.push(id)
  return out
}

/** Ordningen som faktiskt gäller: bara källor med nyckel. */
export function effectiveOrder(s: { keys: ProviderKeys; order: SportOrder }, sport: SportKind): ProviderId[] {
  return orderFor(s.order, sport).filter((id) => !!s.keys[id])
}

/** Täckning för en källa (`null` = ingen nyckel: allt är bara EPG). */
export function coverageFor(id: ProviderId | null, sport: SportKind): 'full' | 'epg' {
  return id ? providerFor(id).coverage(sport) : 'epg'
}
