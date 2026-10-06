export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; retryAfter: number | null; error: string }

export interface SimklApi {
  /** Mot api.simkl.com. `auth` (standard sant) lägger på Bearer — aldrig på cachade katalog-anrop. */
  call<T>(method: 'GET' | 'POST', path: string, opts?: { query?: Record<string, string | number>; body?: unknown; auth?: boolean }): Promise<ApiResult<T>>
  /** SIMKL:s CDN (data.simkl.in): inga parametrar, ingen header, ingen kvot. */
  cdn<T>(path: string): Promise<ApiResult<T>>
  pausedUntil(): number
  hasAuth(): boolean
  /** Senaste `X-RateLimit-Remaining` (dagens kvot), eller null om okänt. */
  remaining(): number | null
}

const API = 'https://api.simkl.com'
const CDN = 'https://data.simkl.in'
const APP_NAME = 'lumio'
/** SIMKL tillåter 1 POST/s och 10 GET/s; vi håller oss under. */
const POST_INTERVAL_MS = 1_000
const GET_INTERVAL_MS = 200
const DEFAULT_PAUSE_S = 60

/// SIMKL skickar CORS `*`, så pluginet anropar API:t direkt — ingen proxy.
/// Takten, 429-pausen och kvoten (500 anrop/dygn på gratis, delat mellan
/// användarens appar) hålls här, gemensamt för scrobble, brygga, synk och listor.
export function createSimklApi(deps: {
  fetchImpl: typeof fetch
  getToken: () => Promise<string | null>
  hasToken: () => boolean
  clientId: string
  appVersion: string
  now: () => number
  sleep?: (ms: number) => Promise<void>
  log: (message: string) => void
  onPause?: (until: number) => void
}): SimklApi {
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  let pausedUntil = 0
  let fatal: string | null = null
  let remaining: number | null = null
  let nextPost = 0
  let nextGet = 0

  async function pace(method: 'GET' | 'POST') {
    const now = deps.now()
    const next = method === 'POST' ? nextPost : nextGet
    const slot = Math.max(next, now)
    if (method === 'POST') nextPost = slot + POST_INTERVAL_MS
    else nextGet = slot + GET_INTERVAL_MS
    if (slot > now) await sleep(slot - now)
  }

  async function read<T>(response: Response): Promise<T | null> {
    const text = await response.text().catch(() => '')
    if (!text.trim()) return null
    try { return JSON.parse(text) as T } catch { return null }
  }

  async function call<T>(
    method: 'GET' | 'POST',
    path: string,
    opts?: { query?: Record<string, string | number>; body?: unknown; auth?: boolean },
  ): Promise<ApiResult<T>> {
    if (fatal) return { ok: false, status: 412, retryAfter: null, error: fatal }
    const now = deps.now()
    if (now < pausedUntil) return { ok: false, status: 429, retryAfter: Math.ceil((pausedUntil - now) / 1000), error: 'paused' }
    const useAuth = opts?.auth !== false
    const token = useAuth ? await deps.getToken() : null
    if (useAuth && !token) return { ok: false, status: 0, retryAfter: null, error: 'not connected' }

    const url = new URL(API + path)
    url.searchParams.set('client_id', deps.clientId)
    url.searchParams.set('app-name', APP_NAME)
    url.searchParams.set('app-version', deps.appVersion)
    for (const [key, value] of Object.entries(opts?.query ?? {})) url.searchParams.set(key, String(value))
    const headers: Record<string, string> = {}
    if (token) headers.Authorization = `Bearer ${token}`
    if (method === 'POST') headers['Content-Type'] = 'application/json'

    await pace(method)
    try {
      const response = await deps.fetchImpl(url.toString(), {
        method,
        headers,
        body: method === 'POST' ? JSON.stringify(opts?.body ?? {}) : undefined,
      })
      const left = Number(response.headers.get('X-RateLimit-Remaining'))
      if (response.headers.get('X-RateLimit-Remaining') != null && Number.isFinite(left)) remaining = left
      const data = await read<T & { error?: string }>(response)
      if (response.ok) return { ok: true, data: data as T }
      const error = (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') ? data.error : `HTTP ${response.status}`
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get('Retry-After')) || DEFAULT_PAUSE_S
        pausedUntil = deps.now() + retryAfter * 1000
        deps.onPause?.(pausedUntil)
        deps.log(`429 på ${method} ${path} — pausar SIMKL i ${retryAfter} s`)
        return { ok: false, status: 429, retryAfter, error }
      }
      if (response.status === 412) {
        fatal = `fel app-id hos SIMKL (${error})`
        deps.log(`412 på ${path}: ${fatal} — inga fler SIMKL-anrop den här sessionen`)
        return { ok: false, status: 412, retryAfter: null, error: fatal }
      }
      deps.log(`${method} ${path}: HTTP ${response.status} ${error}`)
      return { ok: false, status: response.status, retryAfter: null, error }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      deps.log(`${method} ${path}: nätverksfel — ${message}`)
      return { ok: false, status: 0, retryAfter: null, error: message }
    }
  }

  async function cdn<T>(path: string): Promise<ApiResult<T>> {
    try {
      const response = await deps.fetchImpl(CDN + path)
      if (!response.ok) return { ok: false, status: response.status, retryAfter: null, error: `HTTP ${response.status}` }
      return { ok: true, data: (await read<T>(response)) as T }
    } catch (err) {
      return { ok: false, status: 0, retryAfter: null, error: err instanceof Error ? err.message : String(err) }
    }
  }

  return {
    call,
    cdn,
    pausedUntil: () => pausedUntil,
    hasAuth: () => deps.hasToken(),
    remaining: () => remaining,
  }
}
