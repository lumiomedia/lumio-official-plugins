import { vi } from 'vitest'
import { fxDay } from '../__sport-fixture'
import type { Fixture } from '../provider'
import type { SportMatch } from '../sport-model'

/*
  Testhjälp för hemraderna. Importeras BARA av tester. Värdens tre lokala
  sportanrop stubbas och räknas: `/sport/day` (EPG), `/sport/fetch` (källan
  via kvothanteraren — läget loggas, så att testerna kan kräva `cache-only`)
  och `/sport/link`.
*/

export interface Calls { day: string[]; fetchModes: string[]; link: number }

export function stubHost(days: Record<string, SportMatch[]>, links: Record<string, unknown> = {}): Calls {
  const calls: Calls = { day: [], fetchModes: [], link: 0 }
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://localhost')
    if (url.pathname === '/api/live-tv/sport/day') {
      const day = url.searchParams.get('day') ?? ''
      calls.day.push(day)
      return { ok: true, status: 200, json: async () => fxDay(day, days[day] ?? []) } as unknown as Response
    }
    // Genomkopplingen mot källan (sport-fetch.ts äger adressen; testet där fäller alla andra som skriver ut den).
    if (url.pathname.endsWith('/sport/fetch')) {
      calls.fetchModes.push(url.searchParams.get('mode') ?? '')
      return { ok: true, status: 200, json: async () => ({ data: null, cached: false, fresh: false, fetchedAt: null, quota: null, error: null }) } as unknown as Response
    }
    if (url.pathname === '/api/live-tv/sport/link') {
      calls.link += 1
      return { ok: true, status: 200, json: async () => ({ links }) } as unknown as Response
    }
    return { ok: false, status: 404, json: async () => ({}) } as unknown as Response
  }) as unknown as typeof fetch
  return calls
}

/** En källfixtur (API-Sports) för en EPG-match. */
export function fxFixture(over: Partial<Fixture> & Pick<Fixture, 'id' | 'kickoff'>): Fixture {
  return {
    provider: 'api-sports', sport: 'football',
    league: { id: '113', name: 'Allsvenskan', season: '2026', round: 1, country: 'Sweden' },
    status: 'live', statusShort: '2H', minute: 67,
    home: { id: '1', name: 'GAIS', crest: null }, away: { id: '2', name: 'Sirius', crest: null },
    score: { home: 2, away: 1 }, venue: null, lastGoal: null,
    ...over,
  }
}
