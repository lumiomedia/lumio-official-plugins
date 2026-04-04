'use client'

import { fetchMyYouTubeChannel } from './youtube-client'
import { getYouTubeSession, setYouTubeSession } from './youtube-storage'
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

export async function connectYouTube(clientId: string): Promise<YouTubeSession> {
  if (!clientId.trim()) {
    throw new Error('Add a Google OAuth client ID first.')
  }

  await loadGoogleIdentityServices()
  const previousSession = getYouTubeSession()

  const authResponse = await new Promise<{ access_token: string; expires_in?: number; scope?: string }>((resolve, reject) => {
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

    tokenClient.requestAccessToken({
      prompt: previousSession?.accessToken ? '' : 'consent',
    })
  })

  const channel = await fetchMyYouTubeChannel(authResponse.access_token)
  const session: YouTubeSession = {
    ...channel,
    accessToken: authResponse.access_token,
    scope: authResponse.scope ?? '',
    expiresAt: Date.now() + (authResponse.expires_in ?? 3600) * 1000,
  }
  setYouTubeSession(session)
  return session
}

export async function disconnectYouTube(): Promise<void> {
  const session = getYouTubeSession()
  if (session?.accessToken && window.google?.accounts?.oauth2) {
    await new Promise<void>((resolve) => {
      window.google?.accounts?.oauth2?.revoke(session.accessToken, () => resolve())
    })
  }
  setYouTubeSession(null)
}
