export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; retryAfter: number | null; error: string }

/** Token från enhetsflödet vinner alltid över API-nyckeln. */
export type ApiAuth = { accessToken: string } | { apikey: string }

export interface MdblistApi {
  call<T>(method: 'GET' | 'POST', path: string, opts?: { query?: Record<string, string | number>; body?: unknown }): Promise<ApiResult<T>>
  getAllPages(path: string, query?: Record<string, string | number>): Promise<ApiResult<Record<string, unknown[]>>>
  pausedUntil(): number
  /** Synkront: finns det något att autentisera med alls? */
  hasAuth(): boolean
}

const PROXY = '/api/plugins/mdblist/call'
const DEFAULT_PAUSE_S = 60
const MAX_PAGES = 50

type Pagination = { next_cursor?: string | null; has_more?: boolean; offset?: number; limit?: number }

export function createMdblistApi(deps: {
  fetchImpl: typeof fetch
  getAuth: () => Promise<ApiAuth | null>
  hasAuth?: () => boolean
  now: () => number
  log: (message: string) => void
  /** Anropas med pausens slut när MDBList svarat 429 — statusen visar pausen. */
  onPause?: (until: number) => void
}): MdblistApi {
  let pausedUntil = 0

  async function call<T>(
    method: 'GET' | 'POST',
    path: string,
    opts?: { query?: Record<string, string | number>; body?: unknown },
  ): Promise<ApiResult<T>> {
    const now = deps.now()
    if (now < pausedUntil) {
      return { ok: false, status: 429, retryAfter: Math.ceil((pausedUntil - now) / 1000), error: 'paused' }
    }
    const auth = await deps.getAuth()
    if (!auth) return { ok: false, status: 0, retryAfter: null, error: 'not connected' }
    const payload: Record<string, unknown> = { ...auth, method, path }
    if (opts?.query) payload.query = opts.query
    if (opts?.body !== undefined) payload.body = opts.body
    try {
      const response = await deps.fetchImpl(PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = (await response.json().catch(() => null)) as { data?: T; error?: string; retryAfter?: number | null } | null
      if (response.ok) return { ok: true, data: (json?.data ?? null) as T }
      const retryAfter = typeof json?.retryAfter === 'number' ? json.retryAfter : null
      if (response.status === 429) {
        pausedUntil = deps.now() + (retryAfter ?? DEFAULT_PAUSE_S) * 1000
        deps.onPause?.(pausedUntil)
        deps.log(`429 på ${method} ${path} — pausar MDBList i ${retryAfter ?? DEFAULT_PAUSE_S} s`)
      } else {
        deps.log(`${method} ${path}: HTTP ${response.status} ${json?.error ?? ''}`.trim())
      }
      return { ok: false, status: response.status, retryAfter, error: json?.error ?? `HTTP ${response.status}` }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      deps.log(`${method} ${path}: nätverksfel — ${message}`)
      return { ok: false, status: 0, retryAfter: null, error: message }
    }
  }

  /**
   * Alla sidor av ett listsvar, ihopslagna per nyckel. MDBList paginerar med
   * `offset`/`has_more` (uppmätt 2026-10-05); `next_cursor` stöds också,
   * eftersom MDBList:s egna klienter läser det på /sync-endpoints.
   */
  async function getAllPages(path: string, query: Record<string, string | number> = {}) {
    const merged: Record<string, unknown[]> = {}
    let next: Record<string, string | number> = {}
    let complete = false
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const result: ApiResult<unknown> = await call<unknown>('GET', path, { query: { ...query, ...next } })
      if (!result.ok) return result
      const data = result.data
      if (Array.isArray(data)) {
        ;(merged.items ??= []).push(...data)
        complete = true
        break
      }
      if (!data || typeof data !== 'object') { complete = true; break }
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        if (key === 'pagination' || !Array.isArray(value)) continue
        ;(merged[key] ??= []).push(...value)
      }
      const pagination = (data as { pagination?: Pagination }).pagination
      if (pagination?.next_cursor) {
        next = { cursor: pagination.next_cursor }
      } else if (pagination?.has_more) {
        const limit = pagination.limit ?? Number(query.limit ?? 0)
        if (!limit) { complete = true; break }
        next = { offset: (pagination.offset ?? 0) + limit }
      } else {
        complete = true
        break
      }
    }
    // En trunkerad lista hade sett ut som "borttaget på MDBList" för watchlist-mergen.
    if (!complete) {
      deps.log(`${path}: fler än ${MAX_PAGES} sidor — avbryter hellre än returnerar en halv lista`)
      return { ok: false as const, status: 0, retryAfter: null, error: 'too many pages' }
    }
    return { ok: true as const, data: merged }
  }

  return {
    call,
    getAllPages,
    pausedUntil: () => pausedUntil,
    hasAuth: deps.hasAuth ?? (() => true),
  }
}
