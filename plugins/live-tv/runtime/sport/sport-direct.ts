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

/** Hela svar ligger i minnet: taket håller en svag TV-box nere på några megabyte. */
const MAX_ENTRIES = 120
/** `final`: skriven för en avslutad match (TTL −1) och gäller för alltid. */
interface Entry { data: unknown; at: number; final: boolean }
const cache = new Map<string, Entry>()
const inflight = new Map<string, Promise<SportFetchResponse>>()

export function __resetSportDirectForTests(): void { cache.clear(); inflight.clear() }

const result = (data: unknown, cached: boolean, fresh: boolean, fetchedAt: number | null, error: SportFetchResponse['error']): SportFetchResponse =>
  ({ data, cached, fresh, fetchedAt, quota: null, error })

function remember(key: string, data: unknown, at: number, final: boolean): void {
  cache.delete(key)
  cache.set(key, { data, at, final })
  while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value as string)
}

/**
 * Färsk: inom TTL, sparad som slutgiltig, eller sparad efter att dagen blivit
 * slutgiltig (`finalAfter`). En post skriven medan matchen pågick blir inte
 * slutgiltig bara för att någon nu frågar med TTL −1: den hämtas en gång till.
 */
function isFresh(e: Entry, req: ProviderRequest, now: number): boolean {
  if (req.ttlS < 0) return e.final
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
  let release = (): void => {}
  const gate = new Promise<void>((resolve) => { release = resolve })
  const run = (async () => {
    await gate // posten i `inflight` finns innan något kan avsluta den
    try {
      const res = await (deps.fetch ?? fetch)(url, { headers: { Accept: 'application/json' } })
      if (res.status === 429) return result(hit?.data ?? null, !!hit, false, hit?.at ?? null, 'rate-limited')
      // En liga ESPN inte har (400/404) är tom, inte ett nätfel: annars föll hela dagen på en enda slugg.
      if (res.status === 400 || res.status === 404) {
        const at = now()
        remember(url, {}, at, false)
        return result({}, false, true, at, null)
      }
      if (!res.ok) return result(hit?.data ?? null, !!hit, false, hit?.at ?? null, res.status >= 500 ? 'upstream' : 'network')
      const data = (await res.json()) as unknown
      const at = now()
      remember(url, data, at, args.req.ttlS < 0)
      return result(data, false, true, at, null)
    } catch {
      return result(hit?.data ?? null, !!hit, false, hit?.at ?? null, 'network')
    } finally {
      inflight.delete(url)
    }
  })()
  inflight.set(url, run)
  release()
  return run
}
