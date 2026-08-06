'use client'

import { isPluginDesktopHost, launchPluginProgram, type PluginText } from '@/lib/plugin-sdk'
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

async function startTwitchDeviceFlow(): Promise<DeviceStartResponse> {
  const response = await fetch('/api/plugins/twitch/device/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  const payload = (await response.json().catch(() => ({}))) as Partial<DeviceStartResponse> & { error?: string }

  if (!response.ok || !payload.device_code || !payload.user_code || !payload.verification_uri) {
    if (payload.error) throw new Error(payload.error)
    throw new TwitchAuthError({
      en: 'Could not start Twitch login.',
      sv: 'Kunde inte starta Twitch-inloggningen.',
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

async function pollTwitchDevice(deviceCode: string): Promise<DevicePollResult> {
  const response = await fetch('/api/plugins/twitch/device/poll', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceCode }),
  })
  const payload = (await response.json().catch(() => ({}))) as Partial<DevicePollResult>

  if (payload.ok && payload.accessToken && payload.refreshToken && typeof payload.expiresAt === 'number') {
    return {
      ok: true,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      expiresAt: payload.expiresAt,
    }
  }

  return { ok: false, status: payload.status, error: payload.error }
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
  const start = await startTwitchDeviceFlow()
  onCode(start.user_code, start.verification_uri)

  const deadline = Date.now() + start.expires_in * 1000
  let intervalMs = Math.max(1, start.interval) * 1000

  while (Date.now() < deadline) {
    await sleep(intervalMs)

    const poll = await pollTwitchDevice(start.device_code)
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

  const response = await fetch('/api/plugins/twitch/device/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  }).catch(() => null)
  if (!response) return null
  const payload = (await response.json().catch(() => ({}))) as Partial<DevicePollResult>

  if (payload.ok && payload.accessToken && typeof payload.expiresAt === 'number') {
    const next: TwitchSession = {
      ...session,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken || session.refreshToken,
      expiresAt: payload.expiresAt,
    }
    setTwitchSession(next)
    return next
  }

  if (typeof payload.status === 'number' && payload.status >= 400 && payload.status < 500) {
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
