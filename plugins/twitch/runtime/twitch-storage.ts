'use client'

import {
  getScopedStorageItem,
  notifyAuthCapabilitiesChanged,
  setScopedStorageItem,
} from '@/lib/plugin-sdk'

const SESSION_KEY = 'twitch_session_v1'
const HERO_ENABLED_KEY = 'twitch_hero_enabled_v1'
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

// Opt-in pref, default OFF: the app must never show more than one plugin hero at once,
// so Twitch's hero banner only renders when the user explicitly enables it.
export function getTwitchHeroEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return getScopedStorageItem(HERO_ENABLED_KEY) === '1'
}

export function setTwitchHeroEnabled(enabled: boolean): void {
  setScopedStorageItem(HERO_ENABLED_KEY, enabled ? '1' : '')
  emitChanged()
}

// ── Home-row source config ─────────────────────────────────────────────────
// Which category / channels the "Twitch: Kategori" and "Twitch: Kanaler"
// home rows show. Configured in Settings → Twitch; empty = row hidden.

const HOME_CATEGORY_KEY = 'twitch_home_category_v1'
const HOME_CHANNELS_KEY = 'twitch_home_channels_v1'

export function getTwitchHomeCategory(): string {
  if (typeof window === 'undefined') return ''
  return (getScopedStorageItem(HOME_CATEGORY_KEY) ?? '').trim()
}

export function setTwitchHomeCategory(value: string): void {
  setScopedStorageItem(HOME_CATEGORY_KEY, value.trim())
  emitChanged()
}

export function getTwitchHomeChannels(): string {
  if (typeof window === 'undefined') return ''
  return (getScopedStorageItem(HOME_CHANNELS_KEY) ?? '').trim()
}

export function setTwitchHomeChannels(value: string): void {
  setScopedStorageItem(HOME_CHANNELS_KEY, value.trim())
  emitChanged()
}

/** "shroud, pokimane cohhcarnage" → ['shroud', 'pokimane', 'cohhcarnage'] */
export function parseTwitchHomeChannels(raw: string = getTwitchHomeChannels()): string[] {
  return [...new Set(
    raw
      .split(/[,\s]+/)
      .map((entry) => entry.trim().toLowerCase().replace(/^@/, ''))
      .filter(Boolean),
  )]
}

export function onTwitchPluginChanged(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
