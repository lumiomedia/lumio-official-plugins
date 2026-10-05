/// Anslutning med enhetskod (OAuth Device Code), som Trakt: MDBList ger en
/// kod, användaren godkänner på mdblist.com (QR-koden har koden ifylld), och
/// vi pollar tills token kommer. Token gäller i 30 dagar och förnyas när
/// mindre än ett dygn återstår. Se specen, "Anslutning".

export type OauthEndpoint = 'device-authorization' | 'token' | 'revoke_token'
export type OauthReply = { status: number; data: Record<string, unknown> }

export interface OauthToken {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export type DevicePhase = 'idle' | 'waiting' | 'checking' | 'done' | 'expired' | 'denied' | 'error'

export interface DeviceState {
  phase: DevicePhase
  userCode?: string
  verificationUri?: string
  verificationUriComplete?: string
  expiresAt?: number
  error?: string
}

const DEVICE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code'
const REFRESH_MARGIN_MS = 24 * 60 * 60_000
const DEFAULT_INTERVAL_S = 5
const DEFAULT_EXPIRES_S = 300
const DEFAULT_TOKEN_LIFETIME_S = 30 * 24 * 60 * 60

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null)
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)

export function createDeviceAuth(deps: {
  oauth(endpoint: OauthEndpoint, form: Record<string, string>): Promise<OauthReply>
  readToken(): OauthToken | null
  writeToken(token: OauthToken | null): void
  now(): number
  schedule(fn: () => void, ms: number): unknown
  cancel(handle: unknown): void
  clientId: string
  log(message: string): void
  /** Körs när en ny token sparats — värden frågar `GET /user` och visar namnet. */
  onConnected?(): Promise<void> | void
}) {
  let state: DeviceState = { phase: 'idle' }
  let timer: unknown = null
  let generation = 0
  let refreshing: Promise<string | null> | null = null
  const listeners = new Set<() => void>()

  const set = (next: DeviceState) => {
    state = next
    for (const listener of listeners) listener()
  }

  const tokenFrom = (data: Record<string, unknown>, previousRefresh?: string): OauthToken | null => {
    const accessToken = str(data.access_token)
    if (!accessToken) return null
    return {
      accessToken,
      refreshToken: str(data.refresh_token) ?? previousRefresh ?? '',
      expiresAt: deps.now() + num(data.expires_in, DEFAULT_TOKEN_LIFETIME_S) * 1000,
    }
  }

  function stopTimer() {
    if (timer != null) deps.cancel(timer)
    timer = null
  }

  async function poll(run: number, deviceCode: string, intervalS: number, expiresAt: number) {
    timer = null
    if (run !== generation) return
    if (deps.now() >= expiresAt) {
      deps.log('enhetskod: gick ut utan godkännande')
      set({ ...state, phase: 'expired' })
      return
    }
    const reply = await deps.oauth('token', { grant_type: DEVICE_GRANT, device_code: deviceCode, client_id: deps.clientId })
    if (run !== generation) return
    const token = tokenFrom(reply.data)
    if (token) {
      deps.writeToken(token)
      deps.log('enhetskod: godkänd, token sparad')
      set({ ...state, phase: 'checking' })
      try {
        await deps.onConnected?.()
      } finally {
        if (run === generation) set({ phase: 'done' })
      }
      return
    }
    const error = str(reply.data.error)
    if (error === 'expired_token') { set({ ...state, phase: 'expired' }); return }
    if (error === 'access_denied') { set({ ...state, phase: 'denied' }); return }
    // authorization_pending, slow_down eller ett nätverksfel: fortsätt polla.
    const nextInterval = error === 'slow_down' ? intervalS + 5 : intervalS
    timer = deps.schedule(() => { void poll(run, deviceCode, nextInterval, expiresAt) }, nextInterval * 1000)
  }

  async function start(): Promise<void> {
    stopTimer()
    generation += 1
    const run = generation
    set({ phase: 'waiting' })
    const reply = await deps.oauth('device-authorization', { client_id: deps.clientId, scope: 'write' })
    if (run !== generation) return
    const deviceCode = str(reply.data.device_code)
    const userCode = str(reply.data.user_code)
    if (!deviceCode || !userCode) {
      const error = str(reply.data.error_description) ?? str(reply.data.error) ?? `HTTP ${reply.status}`
      deps.log(`enhetskod: kunde inte starta — ${error}`)
      set({ phase: 'error', error })
      return
    }
    const verificationUri = str(reply.data.verification_uri) ?? 'https://mdblist.com/oauth/device/'
    const intervalS = num(reply.data.interval, DEFAULT_INTERVAL_S)
    const expiresAt = deps.now() + num(reply.data.expires_in, DEFAULT_EXPIRES_S) * 1000
    set({
      phase: 'waiting',
      userCode,
      verificationUri,
      verificationUriComplete: str(reply.data.verification_uri_complete) ?? `${verificationUri}?user_code=${encodeURIComponent(userCode)}`,
      expiresAt,
    })
    timer = deps.schedule(() => { void poll(run, deviceCode, intervalS, expiresAt) }, intervalS * 1000)
  }

  function cancel(): void {
    stopTimer()
    generation += 1
    set({ phase: 'idle' })
  }

  async function refresh(token: OauthToken): Promise<string | null> {
    const reply = await deps.oauth('token', { grant_type: 'refresh_token', refresh_token: token.refreshToken, client_id: deps.clientId })
    const next = tokenFrom(reply.data, token.refreshToken)
    if (next) {
      deps.writeToken(next)
      deps.log('token förnyad')
      return next.accessToken
    }
    if (str(reply.data.error) === 'invalid_grant') {
      deps.log('token: förnyelsen avvisades (invalid_grant) — kopplar från')
      deps.writeToken(null)
      return null
    }
    // Nätverksfel eller annat: den gamla token gäller tills den faktiskt går ut.
    deps.log(`token: förnyelsen misslyckades (HTTP ${reply.status}) — försöker igen senare`)
    return deps.now() < token.expiresAt ? token.accessToken : null
  }

  async function getAccessToken(): Promise<string | null> {
    const token = deps.readToken()
    if (!token) return null
    if (token.expiresAt - deps.now() > REFRESH_MARGIN_MS) return token.accessToken
    // En förnyelse i taget: refresh-token roteras, och två samtidiga hade
    // ogiltigförklarat varandra.
    refreshing ??= refresh(token).finally(() => { refreshing = null })
    return refreshing
  }

  async function disconnect(): Promise<void> {
    const token = deps.readToken()
    if (token) {
      await deps.oauth('revoke_token', { token: token.accessToken, client_id: deps.clientId }).catch(() => null)
    }
    deps.writeToken(null)
    cancel()
  }

  return {
    start,
    cancel,
    disconnect,
    getAccessToken,
    hasToken: () => deps.readToken() != null,
    state: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
}

export type DeviceAuth = ReturnType<typeof createDeviceAuth>
