// runtime/sport/providers.ts
import { apiSports } from './api-sports'
import { theSportsDb } from './thesportsdb'
import type { ProviderId, SportsProvider } from './provider'
import type { SportKind } from './sport-model'

export const PROVIDER_IDS: ProviderId[] = ['api-sports', 'thesportsdb']

export function providerFor(id: ProviderId): SportsProvider {
  return id === 'thesportsdb' ? theSportsDb : apiSports
}

/** Utan nyckel (`null`) är allt bara EPG. Gränssnittet lovar aldrig resultat där. */
export function coverageFor(id: ProviderId | null, sport: SportKind): 'full' | 'epg' {
  return id ? providerFor(id).coverage(sport) : 'epg'
}
