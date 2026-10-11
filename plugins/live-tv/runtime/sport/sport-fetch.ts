'use client'

import type { ProviderId, ProviderRequest } from './provider'

/**
 * Den enda klienten mot appens lokala genomkoppling. FÅR BARA IMPORTERAS AV
 * `budget.ts` (testet "kvothanteraren äger varje anrop" fäller allt annat).
 * Nyckeln går i en header till den egna värden och hamnar aldrig i en URL.
 */
export type FetchMode = 'cache-first' | 'cache-only'
export type FetchError = 'unauthorized' | 'exhausted' | 'rate-limited' | 'network' | 'upstream' | 'not-allowed'

export interface SportQuota {
  bucket: string
  limit: number | null
  remaining: number | null
  minuteLimit: number | null
  minuteRemaining: number | null
  blockedUntil: number | null
  reason: 'exhausted' | 'rate-limited' | null
  plan: string | null
}

export interface SportFetchResponse {
  data: unknown
  cached: boolean
  fresh: boolean
  fetchedAt: number | null
  quota: SportQuota | null
  error: FetchError | null
}

export const SPORT_KEY_HEADER = 'x-lumio-sport-key'

const FAILED = (error: FetchError): SportFetchResponse => ({ data: null, cached: false, fresh: false, fetchedAt: null, quota: null, error })

export function sportFetchUrl(provider: ProviderId, req: ProviderRequest, mode: FetchMode): string {
  const params = new URLSearchParams({ provider, sport: req.sport, path: req.path, ttl: String(req.ttlS), mode })
  if (req.finalAfter != null) params.set('finalAfter', String(req.finalAfter))
  return `/api/live-tv/sport/fetch?${params.toString()}`
}

export async function sportFetch(args: { provider: ProviderId; key: string; req: ProviderRequest; mode: FetchMode }): Promise<SportFetchResponse> {
  let res: Response
  try {
    res = await fetch(sportFetchUrl(args.provider, args.req, args.mode), { headers: { [SPORT_KEY_HEADER]: args.key }, cache: 'no-store' })
  } catch {
    return FAILED('network')
  }
  if (res.status === 400 || res.status === 403) return FAILED('not-allowed')
  if (!res.ok) return FAILED('network')
  let body: Partial<SportFetchResponse>
  try {
    body = (await res.json()) as Partial<SportFetchResponse>
  } catch {
    return FAILED('network')
  }
  return {
    data: body.data ?? null,
    cached: body.cached === true,
    fresh: body.fresh === true,
    fetchedAt: typeof body.fetchedAt === 'number' ? body.fetchedAt : null,
    quota: body.quota ?? null,
    error: (body.error as FetchError | null | undefined) ?? null,
  }
}

/** Värdens kvotbok för nyckeln (lokalt, kostar ingen kvot). Utan nyckel: alla källans hinkar (felsökning). */
export async function sportQuota(provider: ProviderId, key?: string): Promise<SportQuota[]> {
  try {
    const res = await fetch(`/api/live-tv/sport/quota?provider=${provider}`, { cache: 'no-store', ...(key ? { headers: { [SPORT_KEY_HEADER]: key } } : {}) })
    if (!res.ok) return []
    const body = (await res.json()) as { buckets?: SportQuota[] }
    return Array.isArray(body.buckets) ? body.buckets : []
  } catch {
    return []
  }
}
