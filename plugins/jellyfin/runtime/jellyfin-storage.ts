'use client'

import { getScopedStorageItem, setScopedStorageItem } from '@/lib/plugin-sdk'

/**
 * Pluginets sparade läge: server, inloggning och valda bibliotek. Allt per
 * profil via värdens profillagring. Token är användarens Jellyfin-access-token.
 */
const SETTINGS_KEY = 'jellyfin_settings'
const DEVICE_KEY = 'jellyfin_device_id'
const EVENT = 'lumio-jellyfin-settings-changed'

export interface JellyfinLibraryOption {
  id: string
  name: string
  type: 'movies' | 'tvshows'
}

export interface JellyfinSettings {
  serverUrl: string | null
  serverId: string | null
  serverName: string | null
  userId: string | null
  userName: string | null
  accessToken: string | null
  libraries: JellyfinLibraryOption[]
}

const DEFAULTS: JellyfinSettings = {
  serverUrl: null,
  serverId: null,
  serverName: null,
  userId: null,
  userName: null,
  accessToken: null,
  libraries: [],
}

export function normalizeServerUrl(raw: string): string | null {
  const trimmed = raw.trim().replace(/\/+$/, '')
  if (!trimmed) return null
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`
  try {
    const parsed = new URL(withScheme)
    return parsed.origin + parsed.pathname.replace(/\/+$/, '')
  } catch {
    return null
  }
}

export function getJellyfinSettings(): JellyfinSettings {
  try {
    const raw = getScopedStorageItem(SETTINGS_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<JellyfinSettings>
    return {
      serverUrl: typeof parsed.serverUrl === 'string' ? parsed.serverUrl : null,
      serverId: typeof parsed.serverId === 'string' ? parsed.serverId : null,
      serverName: typeof parsed.serverName === 'string' ? parsed.serverName : null,
      userId: typeof parsed.userId === 'string' ? parsed.userId : null,
      userName: typeof parsed.userName === 'string' ? parsed.userName : null,
      accessToken: typeof parsed.accessToken === 'string' ? parsed.accessToken : null,
      libraries: Array.isArray(parsed.libraries)
        ? parsed.libraries.filter((entry): entry is JellyfinLibraryOption => Boolean(entry && typeof entry.id === 'string' && typeof entry.name === 'string' && (entry.type === 'movies' || entry.type === 'tvshows')))
        : [],
    }
  } catch {
    return DEFAULTS
  }
}

export function setJellyfinSettings(next: JellyfinSettings): void {
  setScopedStorageItem(SETTINGS_KEY, JSON.stringify(next))
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENT))
}

export function clearJellyfinSettings(): void {
  setJellyfinSettings(DEFAULTS)
}

export function onJellyfinSettingsChanged(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}

export function isJellyfinConnected(settings: JellyfinSettings = getJellyfinSettings()): boolean {
  return Boolean(settings.serverUrl && settings.userId && settings.accessToken)
}

/** Stabilt enhets-id för Jellyfins Authorization-huvud (så sessioner inte staplas). */
export function ensureJellyfinDeviceId(): string {
  const existing = getScopedStorageItem(DEVICE_KEY)
  if (existing) return existing
  const id = `lumio-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
  setScopedStorageItem(DEVICE_KEY, id)
  return id
}

/** Källans id i biblioteksindexet: en per server (och per användare). */
export function jellyfinSourceId(settings: JellyfinSettings): string | null {
  return settings.serverId && settings.userId ? `jellyfin-${settings.serverId}-${settings.userId.slice(0, 8)}` : null
}
