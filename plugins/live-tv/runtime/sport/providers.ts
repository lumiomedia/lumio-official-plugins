// runtime/sport/providers.ts
import { apiSports } from './api-sports'
import { theSportsDb } from './thesportsdb'
import { sportApi } from './sportapi'
import { espn } from './espn'
import type { KeyedProviderId, ProviderId, SportsProvider } from './provider'
import type { SportKind } from './sport-model'
import type { ProviderKeys, SportOrder } from './sport-store'

/** Källorna med nyckel (inställningarnas Nycklar). */
export const PROVIDER_IDS: KeyedProviderId[] = ['sportapi', 'api-sports', 'thesportsdb']
/** Källorna utan nyckel: alltid med, sist i ordningen (reserv när nyckelkällornas kvot är slut, och allt för den utan nyckel). */
export const KEYLESS_IDS: ProviderId[] = ['espn']
const ALL_IDS: ProviderId[] = [...PROVIDER_IDS, ...KEYLESS_IDS]

export const PROVIDER_LABEL: Record<ProviderId, string> = { sportapi: 'sportapi.ai', 'api-sports': 'API-Sports', thesportsdb: 'TheSportsDB', espn: 'ESPN' }

export function providerFor(id: ProviderId): SportsProvider {
  return id === 'thesportsdb' ? theSportsDb : id === 'sportapi' ? sportApi : id === 'espn' ? espn : apiSports
}

export const isKeyless = (id: ProviderId): boolean => KEYLESS_IDS.includes(id)

/** Standardordningen (Jerry 2026-10-11): fotboll först hos sportapi.ai (2 000/dag gratis), annars API-Sports. */
export function defaultOrder(sport: SportKind): ProviderId[] {
  return sport === 'football' ? ['sportapi', 'api-sports', 'thesportsdb', 'espn'] : ['api-sports', 'thesportsdb', 'espn']
}

/**
 * Hela ordningen för sporten, med eller utan nyckel: användarens egen ordning
 * först, sedan standardordningen för det som saknas. Bara källor som täcker sporten.
 */
export function orderFor(order: SportOrder, sport: SportKind): ProviderId[] {
  const covering = ALL_IDS.filter((id) => providerFor(id).coverage(sport) === 'full')
  const out = (order[sport] ?? []).filter((id) => covering.includes(id))
  for (const id of [...defaultOrder(sport), ...covering]) if (covering.includes(id) && !out.includes(id)) out.push(id)
  return out
}

/** Ordningen som faktiskt gäller: källor med nyckel, och de som inte behöver någon. */
export function effectiveOrder(s: { keys: ProviderKeys; order: SportOrder }, sport: SportKind): ProviderId[] {
  return orderFor(s.order, sport).filter((id) => isKeyless(id) || !!s.keys[id as KeyedProviderId])
}

/** Täckning för en källa (`null` = ingen nyckel: allt är bara EPG). */
export function coverageFor(id: ProviderId | null, sport: SportKind): 'full' | 'epg' {
  return id ? providerFor(id).coverage(sport) : 'epg'
}
