'use client'

import type { FetchMode, SportFetchResponse } from './sport-fetch'
import type { ProviderId, ProviderRequest } from './provider'

/**
 * Hämtning från webbvyn för källor utan nyckel (ESPN). FÅR BARA IMPORTERAS
 * AV `budget.ts`, precis som `sport-fetch` — kvothanteraren äger varje anrop
 * även här (testet i sport-direct.test.ts fäller allt annat).
 *
 * Värdens genomkoppling känner bara nyckelkällorna, och ESPN tillåter anrop
 * från vilken sida som helst. Cachen ligger i minnet: diskcachen och den
 * delade boken finns bara i värden, och ESPN har ingen kvot att dela.
 * Sökvägen måste vara en av ESPN:s läsvägar; allt annat blir `not-allowed`.
 */

const BASES: Partial<Record<ProviderId, { base: string; allow: RegExp }>> = {
  espn: { base: 'https://site.api.espn.com/apis/', allow: /^(site\/v2|v2)\/sports\/(soccer|hockey|basketball)\/[a-z0-9._]+\/(scoreboard|summary|standings)(\?[A-Za-z0-9=&%._-]*)?$/ },
}

const MAX_ENTRIES = 300
interface Entry { data: unknown; at: number }
const cache = new Map<string, Entry>()
const inflight = new Map<string, Promise<SportFetchResponse>>()

export function __resetSportDirectForTests(): void { cache.clear(); inflight.clear() }

const result = (data: unknown, cached: boolean, fresh: boolean, fetchedAt: number | null, error: SportFetchResponse['error']): SportFetchResponse =>
  ({ data, cached, fresh, fetchedAt, quota: null, error })

function remember(key: string, data: unknown, at: number): void {
  cache.delete(key)
  cache.set(key, { data, at })
  while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value as string)
}

/** Färsk: inom TTL, för evigt (−1), eller sparad efter att dagen blivit slutgiltig (`finalAfter`). */
function isFresh(e: Entry, req: ProviderRequest, now: number): boolean {
  if (req.ttlS < 0) return true
  if (req.finalAfter != null && e.at >= req.finalAfter) return true
  return req.ttlS > 0 && now - e.at < req.ttlS * 1000
}

export async function sportDirect(
  args: { provider: ProviderId; req: ProviderRequest; mode: FetchMode },
  deps: { fetch?: typeof fetch; now?: () => number } = {},
): Promise<SportFetchResponse> {
  const now = deps.now ?? Date.now
  const source = BASES[args.provider]
  if (!source || !source.allow.test(args.req.path)) return result(null, false, false, null, 'not-allowed')
  const url = source.base + args.req.path
  const hit = cache.get(url)
  if (args.mode === 'cache-only') return hit ? result(hit.data, true, isFresh(hit, args.req, now()), hit.at, null) : result(null, true, false, null, null)
  if (hit && isFresh(hit, args.req, now())) return result(hit.data, true, true, hit.at, null)
  const running = inflight.get(url)
  if (running) return running
  const run = (async () => {
    try {
      const res = await (deps.fetch ?? fetch)(url, { headers: { Accept: 'application/json' } })
      if (res.status === 429) return result(hit?.data ?? null, !!hit, false, hit?.at ?? null, 'rate-limited')
      if (!res.ok) return result(hit?.data ?? null, !!hit, false, hit?.at ?? null, res.status >= 500 ? 'upstream' : 'network')
      const data = (await res.json()) as unknown
      const at = now()
      remember(url, data, at)
      return result(data, false, true, at, null)
    } catch {
      return result(hit?.data ?? null, !!hit, false, hit?.at ?? null, 'network')
    } finally {
      inflight.delete(url)
    }
  })()
  inflight.set(url, run)
  return run
}
