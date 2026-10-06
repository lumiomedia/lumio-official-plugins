/// Anslutning med enhetskod (OAuth 2.0 Device Code, RFC 8628) — delad av
/// tracker-pluginen (MDBList, SIMKL). Tjänsten ger en kod, användaren godkänner
/// på tjänstens sida (QR-koden har koden ifylld), och vi pollar tills token
/// kommer. Token förnyas när mindre än ett dygn återstår. Hur anropen når
/// tjänsten (proxy eller direkt) är pluginets sak: `transport`.

export type OauthReply = { status: number; data: Record<string, unknown> }

/** Tjänstens tre OAuth-anrop, som formulär. */
export interface OauthTransport {
  device(form: Record<string, string>): Promise<OauthReply>
  token(form: Record<string, string>): Promise<OauthReply>
  revoke(form: Record<string, string>): Promise<OauthReply>
}

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
const REFRESH_BACKOFF_MS = 5 * 60_000
const DEFAULT_INTERVAL_S = 5
const DEFAULT_EXPIRES_S = 300
const DEFAULT_TOKEN_LIFETIME_S = 30 * 24 * 60 * 60

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null)
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)

export function createDeviceAuth(deps: {
  transport: OauthTransport
  /** Begärd behörighet (MDBList: `write`, SIMKL: `media:read media:write`). */
  scope: string
  /**
   * Godtas token? Returnerar ett felmeddelande om inte — t.ex. när tjänsten
   * gav lägre behörighet än begärt. Fasen blir då `error`, inget sparas.
   */
  acceptToken?(data: Record<string, unknown>): string | null
  readToken(): OauthToken | null
  writeToken(token: OauthToken | null): void
  now(): number
  schedule(fn: () => void, ms: number): unknown
  cancel(handle: unknown): void
  clientId: string
  log(message: string): void
  /** Körs när en ny token sparats — värden frågar `GET /user` och visar namnet. */
  onConnected?(): Promise<void> | void
  /** Aktiv profil. Ett svar som landar efter ett profilbyte skrivs aldrig. */
  scopeId?(): string | null
}) {
  const scopeNow = () => deps.scopeId?.() ?? ''
  let state: DeviceState = { phase: 'idle' }
  let timer: unknown = null
  let generation = 0
  let refreshing: Promise<string | null> | null = null
  /** Ökas vid frånkoppling: en förnyelse som startade före får inte skriva efter. */
  let authEpoch = 0
  let lastRefreshFailAt = -Infinity
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

  async function poll(run: number, deviceCode: string, intervalS: number, expiresAt: number, scope: string) {
    timer = null
    if (run !== generation) return
    if (scopeNow() !== scope) { cancel(); return }
    if (deps.now() >= expiresAt) {
      deps.log('enhetskod: gick ut utan godkännande')
      set({ ...state, phase: 'expired' })
      return
    }
    const reply = await deps.transport.token({ grant_type: DEVICE_GRANT, device_code: deviceCode, client_id: deps.clientId })
    if (run !== generation) return
    if (scopeNow() !== scope) { cancel(); return }
    const token = tokenFrom(reply.data)
    const rejected = token ? deps.acceptToken?.(reply.data) ?? null : null
    if (token && rejected) {
      deps.log(`enhetskod: token avvisad — ${rejected}`)
      set({ phase: 'error', error: rejected })
      return
    }
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
    timer = deps.schedule(() => { void poll(run, deviceCode, nextInterval, expiresAt, scope) }, nextInterval * 1000)
  }

  async function start(): Promise<void> {
    stopTimer()
    generation += 1
    const run = generation
    set({ phase: 'waiting' })
    const reply = await deps.transport.device({ client_id: deps.clientId, scope: deps.scope })
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
    const scope = scopeNow()
    timer = deps.schedule(() => { void poll(run, deviceCode, intervalS, expiresAt, scope) }, intervalS * 1000)
  }

  function cancel(): void {
    stopTimer()
    generation += 1
    set({ phase: 'idle' })
  }

  async function refresh(token: OauthToken): Promise<string | null> {
    const scope = scopeNow()
    const epoch = authEpoch
    const reply = await deps.transport.token({ grant_type: 'refresh_token', refresh_token: token.refreshToken, client_id: deps.clientId })
    // Frånkopplad eller annan profil under tiden: svaret hör inte hit längre.
    if (epoch !== authEpoch || scopeNow() !== scope) return null
    const next = tokenFrom(reply.data, token.refreshToken)
    if (next) {
      deps.writeToken(next)
      deps.log('token förnyad')
      return next.accessToken
    }
    if (str(reply.data.error) === 'invalid_grant') {
      // Token synkas mellan enheter: har en annan enhet hunnit förnya är
      // refresh-token roterad här också. Använd den i stället för att koppla
      // från — en radering hade synkats tillbaka och kopplat från båda.
      const stored = deps.readToken()
      if (stored && stored.refreshToken !== token.refreshToken) {
        deps.log('token: förnyad på en annan enhet — använder den')
        return stored.accessToken
      }
      deps.log('token: förnyelsen avvisades (invalid_grant) — kopplar från')
      deps.writeToken(null)
      return null
    }
    // Nätverksfel eller annat: den gamla token gäller tills den faktiskt går
    // ut, och nästa försök väntar fem minuter — inte en förnyelse per anrop.
    lastRefreshFailAt = deps.now()
    deps.log(`token: förnyelsen misslyckades (HTTP ${reply.status}) — nytt försök om 5 min`)
    return deps.now() < token.expiresAt ? token.accessToken : null
  }

  async function getAccessToken(): Promise<string | null> {
    const token = deps.readToken()
    if (!token) return null
    if (token.expiresAt - deps.now() > REFRESH_MARGIN_MS) return token.accessToken
    if (deps.now() - lastRefreshFailAt < REFRESH_BACKOFF_MS) {
      return deps.now() < token.expiresAt ? token.accessToken : null
    }
    // En förnyelse i taget: refresh-token roteras, och två samtidiga hade
    // ogiltigförklarat varandra.
    refreshing ??= refresh(token).finally(() => { refreshing = null })
    return refreshing
  }

  /** Servern sa 401 fast klockan säger att token gäller: förnya nu (en gång per backoff). */
  async function forceRefresh(): Promise<string | null> {
    const token = deps.readToken()
    if (!token || deps.now() - lastRefreshFailAt < REFRESH_BACKOFF_MS) return null
    refreshing ??= refresh(token).finally(() => { refreshing = null })
    return refreshing
  }

  async function disconnect(): Promise<void> {
    authEpoch += 1
    const token = deps.readToken()
    if (token) {
      await deps.transport.revoke({ token: token.accessToken, client_id: deps.clientId }).catch(() => null)
    }
    deps.writeToken(null)
    cancel()
  }

  return {
    start,
    cancel,
    disconnect,
    getAccessToken,
    forceRefresh,
    hasToken: () => deps.readToken() != null,
    state: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
}

export type DeviceAuth = ReturnType<typeof createDeviceAuth>
