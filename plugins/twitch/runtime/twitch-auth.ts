'use client'

import { isPluginDesktopHost, launchPluginProgram, type PluginText } from '@/lib/plugin-sdk'
import { getTwitchClientId } from './twitch-app-credentials'
import { helixUrl } from './twitch-client'
import {
  clearTwitchSession,
  getTwitchSession,
  isTwitchSessionValid,
  setTwitchSession,
  type TwitchSession,
} from './twitch-storage'

interface DeviceStartResponse {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

interface DevicePollResult {
  ok: boolean
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
  /** HTTP status code echoed by the backend; informational only — control flow keys off `error`. */
  status?: number
  error?: string
}

interface TwitchHelixUser {
  id: string
  login: string
  display_name: string
}

/**
 * Login failure that carries its own localized copy. This module is not a
 * component, so it cannot call `useLang()`; the settings UI resolves `text`
 * with `resolvePluginText()` — the same {en, sv} convention the rest of this
 * plugin uses for its strings.
 */
export class TwitchAuthError extends Error {
  readonly text: PluginText

  constructor(text: PluginText) {
    super(typeof text === 'string' ? text : text.en ?? 'Twitch login failed.')
    this.name = 'TwitchAuthError'
    this.text = text
  }
}

const DEFAULT_POLL_INTERVAL_SECONDS = 5
const DEFAULT_DEVICE_CODE_TTL_SECONDS = 1800
const SLOW_DOWN_STEP_MS = 5_000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getDesktopOpenCommand(url: string): { program: string; args: string[] } {
  const platform = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : ''
  if (platform.includes('windows')) {
    return { program: 'cmd', args: ['/c', 'start', '', url] }
  }
  if (platform.includes('linux')) {
    return { program: 'xdg-open', args: [url] }
  }
  return { program: 'open', args: [url] }
}

export async function openTwitchVerificationUrl(url: string): Promise<void> {
  if (isPluginDesktopHost()) {
    const command = getDesktopOpenCommand(url)
    await launchPluginProgram(command.program, command.args)
    return
  }
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

// General external-URL opener (same desktop/web handling as the verification
// link). Used to open a channel's Twitch page — e.g. to follow it, since the
// Helix API no longer exposes follow/unfollow endpoints.
export async function openTwitchUrl(url: string): Promise<void> {
  return openTwitchVerificationUrl(url)
}

/**
 * Twitchs OAuth-endpoints, anropade DIREKT från webviewn.
 *
 * Tidigare gick de via appens Rust-proxy (`/api/plugins/twitch/device/*`), som
 * bar Lumios egna nycklar. Den vägen kunde aldrig fungera på Android —
 * `android_bootstrap.rs` satte client_id till None — och den lade dessutom
 * alla användare i samma kvothink. Twitch skickar
 * `access-control-allow-origin: *` på båda endpoints, så webviewn får ringa
 * själv (verifierat med preflight 2026-09-25).
 */
export const DEVICE_URL = 'https://id.twitch.tv/oauth2/device'
export const TOKEN_URL = 'https://id.twitch.tv/oauth2/token'
const SCOPES = 'user:read:follows'

function requireClientId(): string {
  const clientId = getTwitchClientId()
  if (!clientId) {
    throw new TwitchAuthError({
      en: 'Register your own Twitch application first, then paste its Client ID above.',
      sv: 'Registrera din egen Twitch-applikation först och klistra in dess Client ID ovan.',
    })
  }
  return clientId
}

export async function requestDeviceCode(): Promise<DeviceStartResponse> {
  const clientId = requireClientId()
  const body = new URLSearchParams({ client_id: clientId, scopes: SCOPES })
  const response = await fetch(`${DEVICE_URL}?${body.toString()}`, { method: 'POST' })
  const payload = (await response.json().catch(() => ({}))) as Partial<DeviceStartResponse> & { message?: string }

  if (!response.ok || !payload.device_code || !payload.user_code || !payload.verification_uri) {
    if (payload.message) throw new Error(payload.message)
    throw new TwitchAuthError({
      en: 'Could not start Twitch login. Check that the Client ID is correct.',
      sv: 'Kunde inte starta Twitch-inloggningen. Kontrollera att Client ID stämmer.',
    })
  }

  return {
    device_code: payload.device_code,
    user_code: payload.user_code,
    verification_uri: payload.verification_uri,
    expires_in: payload.expires_in ?? DEFAULT_DEVICE_CODE_TTL_SECONDS,
    interval: payload.interval ?? DEFAULT_POLL_INTERVAL_SECONDS,
  }
}

/**
 * Växlar en enhetskod mot tokens.
 *
 * `authorization_pending` är INTE ett fel — det är svaret så länge användaren
 * inte hunnit godkänna på twitch.tv, och loopen ska fortsätta fråga. Läses det
 * som ett fel avbryts inloggningen i samma sekund den startar.
 */
export async function exchangeDeviceCode(deviceCode: string): Promise<DevicePollResult> {
  const clientId = requireClientId()
  const body = new URLSearchParams({
    client_id: clientId,
    scopes: SCOPES,
    device_code: deviceCode,
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
  })
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const payload = (await response.json().catch(() => ({}))) as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    message?: string
    status?: number
  }

  if (response.ok && payload.access_token && payload.refresh_token) {
    return {
      ok: true,
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
    }
  }

  return { ok: false, status: payload.status ?? response.status, error: payload.message }
}

async function resolveTwitchAccount(accessToken: string): Promise<TwitchHelixUser> {
  const response = await fetch(helixUrl('users'), {
    headers: { 'x-twitch-user-token': accessToken },
  })
  if (!response.ok) {
    throw new TwitchAuthError({
      en: `Could not resolve Twitch account (${response.status}).`,
      sv: `Kunde inte hämta Twitch-kontot (${response.status}).`,
    })
  }
  const payload = (await response.json().catch(() => ({}))) as { data?: TwitchHelixUser[] }
  const user = payload.data?.[0]
  if (!user?.id || !user.login) {
    throw new TwitchAuthError({
      en: 'Could not resolve Twitch account.',
      sv: 'Kunde inte hämta Twitch-kontot.',
    })
  }
  return user
}

/**
 * Starts the Twitch device-code login flow.
 * `onCode` is invoked once the device code is available so the caller can
 * present the user code + verification URL. Resolves once the user has
 * completed the flow on twitch.tv and the local session has been stored.
 */
export async function connectTwitch(onCode: (userCode: string, verificationUri: string) => void): Promise<void> {
  const start = await requestDeviceCode()
  onCode(start.user_code, start.verification_uri)

  const deadline = Date.now() + start.expires_in * 1000
  let intervalMs = Math.max(1, start.interval) * 1000

  while (Date.now() < deadline) {
    await sleep(intervalMs)

    const poll = await exchangeDeviceCode(start.device_code)
    if (poll.ok && poll.accessToken && poll.refreshToken && typeof poll.expiresAt === 'number') {
      const user = await resolveTwitchAccount(poll.accessToken)
      setTwitchSession({
        accessToken: poll.accessToken,
        refreshToken: poll.refreshToken,
        expiresAt: poll.expiresAt,
        userId: user.id,
        login: user.login,
        displayName: user.display_name,
      })
      return
    }

    if (poll.error === 'authorization_pending') {
      continue
    }
    if (poll.error === 'slow_down') {
      intervalMs += SLOW_DOWN_STEP_MS
      continue
    }
    if (poll.error) throw new Error(poll.error)
    throw new TwitchAuthError({
      en: 'Twitch device login failed.',
      sv: 'Twitch-inloggningen med enhetskod misslyckades.',
    })
  }

  throw new TwitchAuthError({
    en: 'Twitch login timed out. Try connecting again.',
    sv: 'Twitch-inloggningen tog för lång tid. Försök ansluta igen.',
  })
}

export function disconnectTwitch(): void {
  clearTwitchSession()
}

/**
 * Exchanges the stored refresh token for a fresh access token and persists
 * the rotated session. Returns the updated session, or null if there is
 * nothing to refresh or Twitch rejected the token. Only a definitive 4xx
 * rejection clears the stored session — network/server hiccups keep it so a
 * later attempt can still succeed.
 */
export async function refreshTwitchSession(): Promise<TwitchSession | null> {
  const session = getTwitchSession()
  if (!session?.refreshToken) return null

  const clientId = getTwitchClientId()
  if (!clientId) return null
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: session.refreshToken,
  })
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  }).catch(() => null)
  if (!response) return null
  const payload = (await response.json().catch(() => ({}))) as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    status?: number
  }

  if (response.ok && payload.access_token) {
    const next: TwitchSession = {
      ...session,
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token || session.refreshToken,
      expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
    }
    setTwitchSession(next)
    return next
  }

  if (response.status >= 400 && response.status < 500) {
    // Refresh token revoked/expired — the account genuinely needs a new
    // device-flow login, so stop advertising a session that cannot work.
    clearTwitchSession()
  }
  return null
}

let inflightSessionRefresh: Promise<TwitchSession | null> | null = null

/**
 * Returns a usable session: the stored one when still valid, otherwise a
 * silent refresh via the stored refresh token (deduped across concurrent
 * callers). This is what makes a once-connected account auto-reconnect on
 * app start and whenever a Twitch surface is opened.
 */
export async function ensureFreshTwitchSession(): Promise<TwitchSession | null> {
  const session = getTwitchSession()
  if (!session) return null
  if (isTwitchSessionValid(session)) return session
  if (!inflightSessionRefresh) {
    inflightSessionRefresh = refreshTwitchSession().finally(() => {
      inflightSessionRefresh = null
    })
  }
  return inflightSessionRefresh
}
