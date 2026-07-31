'use client'

import {
  getScopedStorageItem,
  notifyAuthCapabilitiesChanged,
  setScopedStorageItem,
} from '@/lib/plugin-sdk'

const SESSION_KEY = 'twitch_session_v1'
const EVENT = 'lumio-twitch-plugin-changed'

export interface TwitchSession {
  accessToken: string
  refreshToken: string
  expiresAt: number
  userId: string
  login: string
  displayName: string
}

function emitChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT))
  }
  notifyAuthCapabilitiesChanged()
}

export function getTwitchSession(): TwitchSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = getScopedStorageItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<TwitchSession>
    if (
      typeof parsed.accessToken !== 'string'
      || typeof parsed.refreshToken !== 'string'
      || typeof parsed.expiresAt !== 'number'
      || typeof parsed.userId !== 'string'
      || typeof parsed.login !== 'string'
      || typeof parsed.displayName !== 'string'
    ) {
      return null
    }
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresAt: parsed.expiresAt,
      userId: parsed.userId,
      login: parsed.login,
      displayName: parsed.displayName,
    }
  } catch {
    return null
  }
}

export function setTwitchSession(session: TwitchSession | null): void {
  if (session) {
    setScopedStorageItem(SESSION_KEY, JSON.stringify(session))
  } else {
    setScopedStorageItem(SESSION_KEY, '')
  }
  emitChanged()
}

export function clearTwitchSession(): void {
  setTwitchSession(null)
}

export function isTwitchSessionValid(session: TwitchSession | null = getTwitchSession()): boolean {
  return Boolean(session && session.expiresAt > Date.now() + 30_000)
}
