'use client'

import { fetchMyYouTubeChannel } from './youtube-client'
import {
  canAttemptYouTubeReconnect,
  getYouTubeAutoReconnectEnabled,
  getYouTubeSession,
  markYouTubeReconnectAttempt,
  setYouTubeAutoReconnectEnabled,
  setYouTubeSession,
} from './youtube-storage'
import {
  fetchDesktopApiJson,
  isPluginDesktopHost,
  launchPluginProgram,
} from '@/lib/plugin-sdk'
import type { YouTubeSession } from './youtube-types'

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient(config: {
            client_id: string
            scope: string
            callback: (response: { access_token?: string; expires_in?: number; scope?: string; error?: string; error_description?: string }) => void
          }): {
            requestAccessToken(options?: { prompt?: string }): void
          }
          revoke(token: string, callback?: () => void): void
        }
      }
    }
  }
}

const GOOGLE_GSI_URL = 'https://accounts.google.com/gsi/client'
const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube',
]
const DESKTOP_OAUTH_POLL_INTERVAL_MS = 1250
const DESKTOP_OAUTH_TIMEOUT_MS = 3 * 60 * 1000

let gisLoader: Promise<void> | null = null

export function getYouTubeScopes(): string[] {
  return [...YOUTUBE_SCOPES]
}

export function loadGoogleIdentityServices(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google sign-in is only available in the browser.'))
  }
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (gisLoader) return gisLoader

  gisLoader = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GOOGLE_GSI_URL}"]`) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = GOOGLE_GSI_URL
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services.'))
    document.head.appendChild(script)
  })

  return gisLoader
}

type DesktopOauthStartResponse = {
  sessionId: string
  authUrl: string
}

type DesktopOauthPollResponse = {
  status: 'pending' | 'complete' | 'error' | 'missing'
  error?: string
  token?: {
    accessToken: string
    expiresIn: number
    scope: string
  } | null
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

async function openDesktopOauthBrowser(url: string): Promise<void> {
  const command = getDesktopOpenCommand(url)
  await launchPluginProgram(command.program, command.args)
}

function preopenOauthWindow(): Window | null {
  if (typeof window === 'undefined') return null
  return window.open('', '_blank', 'noopener,noreferrer')
}

async function startDesktopYouTubeOauth(clientId: string, oauthWindow: Window | null): Promise<YouTubeSession> {
  const startResponse = await fetch('/api/plugins/youtube/oauth/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: clientId.trim() }),
  })

  const startPayload = (await startResponse.json().catch(() => ({}))) as Partial<DesktopOauthStartResponse> & {
    error?: string
  }

  if (!startResponse.ok || !startPayload.sessionId || !startPayload.authUrl) {
    throw new Error(startPayload.error || 'Could not start desktop YouTube login.')
  }

  let opened = false
  if (oauthWindow && !oauthWindow.closed) {
    try {
      oauthWindow.location.href = startPayload.authUrl
      opened = true
    } catch {
      opened = false
    }
  }
  if (!opened) {
    await openDesktopOauthBrowser(startPayload.authUrl)
  }

  const startedAt = Date.now()
  while (Date.now() - startedAt < DESKTOP_OAUTH_TIMEOUT_MS) {
    await new Promise((resolve) => window.setTimeout(resolve, DESKTOP_OAUTH_POLL_INTERVAL_MS))

    const pollPayload = await fetchDesktopApiJson<DesktopOauthPollResponse>(
      `/api/plugins/youtube/oauth/poll?session=${encodeURIComponent(startPayload.sessionId)}`,
      10_000,
    )

    if (!pollPayload || pollPayload.status === 'pending') continue
    if (pollPayload.status === 'missing') {
      throw new Error('YouTube login session expired. Start the connection again.')
    }
    if (pollPayload.status === 'error') {
      throw new Error(pollPayload.error || 'YouTube login failed.')
    }
    if (pollPayload.status === 'complete' && pollPayload.token?.accessToken) {
      const channel = await fetchMyYouTubeChannel(pollPayload.token.accessToken)
      return {
        ...channel,
        accessToken: pollPayload.token.accessToken,
        scope: pollPayload.token.scope ?? '',
        expiresAt: Date.now() + (pollPayload.token.expiresIn ?? 3600) * 1000,
      }
    }
  }

  throw new Error('YouTube login timed out before Lumio received the session.')
}

async function requestYouTubeAccessToken(clientId: string, prompt: '' | 'consent'): Promise<{ access_token: string; expires_in?: number; scope?: string }> {
  if (!clientId.trim()) {
    throw new Error('Add a Google OAuth client ID first.')
  }

  await loadGoogleIdentityServices()
  return new Promise<{ access_token: string; expires_in?: number; scope?: string }>((resolve, reject) => {
    const tokenClient = window.google?.accounts?.oauth2?.initTokenClient({
      client_id: clientId.trim(),
      scope: YOUTUBE_SCOPES.join(' '),
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description || response.error || 'YouTube login failed.'))
          return
        }
        resolve({
          access_token: response.access_token,
          expires_in: response.expires_in,
          scope: response.scope,
        })
      },
    })

    if (!tokenClient) {
      reject(new Error('Could not initialize Google sign-in.'))
      return
    }

    tokenClient.requestAccessToken({ prompt })
  })
}

async function buildYouTubeSession(clientId: string, prompt: '' | 'consent'): Promise<YouTubeSession> {
  const authResponse = await requestYouTubeAccessToken(clientId, prompt)

  const channel = await fetchMyYouTubeChannel(authResponse.access_token)
  return {
    ...channel,
    accessToken: authResponse.access_token,
    scope: authResponse.scope ?? '',
    expiresAt: Date.now() + (authResponse.expires_in ?? 3600) * 1000,
  }
}

export async function connectYouTube(clientId: string): Promise<YouTubeSession> {
  const oauthWindow = isPluginDesktopHost() ? preopenOauthWindow() : null
  const session = isPluginDesktopHost()
    ? await startDesktopYouTubeOauth(clientId, oauthWindow)
    // Explicit connect should always open an interactive OAuth flow.
    // Silent re-auth is handled by tryRestoreYouTubeSession().
    : await buildYouTubeSession(clientId, 'consent')
  setYouTubeSession(session)
  setYouTubeAutoReconnectEnabled(true)
  return session
}

export async function disconnectYouTube(): Promise<void> {
  const session = getYouTubeSession()
  if (session?.accessToken && window.google?.accounts?.oauth2) {
    await new Promise<void>((resolve) => {
      window.google?.accounts?.oauth2?.revoke(session.accessToken, () => resolve())
    })
  }
  setYouTubeAutoReconnectEnabled(false)
  setYouTubeSession(null)
}

export async function tryRestoreYouTubeSession(clientId: string): Promise<YouTubeSession | null> {
  if (!clientId.trim() || !getYouTubeAutoReconnectEnabled() || !canAttemptYouTubeReconnect()) {
    return null
  }

  markYouTubeReconnectAttempt()

  try {
    const session = await buildYouTubeSession(clientId, '')
    setYouTubeSession(session)
    return session
  } catch {
    return null
  }
}
