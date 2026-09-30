'use client'

import { getScopedStorageItem, setScopedStorageItem } from '@/lib/plugin-sdk'

/**
 * Pluginets sparade läge: server, inloggning och valda bibliotek. Allt per
 * profil via värdens profillagring. Token är användarens Emby-access-token.
 *
 * `serverUrl` är adressen användaren skrev; `apiBase` är den API-rot som
 * svarade vid anslutningen (`<server>/emby` eller `<server>`) — alla anrop går dit.
 */
const SETTINGS_KEY = 'emby_settings'
const DEVICE_KEY = 'emby_device_id'
const EVENT = 'lumio-emby-settings-changed'

export interface EmbyLibraryOption {
  id: string
  name: string
  type: 'movies' | 'tvshows'
}

export interface EmbySettings {
  serverUrl: string | null
  apiBase: string | null
  serverId: string | null
  serverName: string | null
  userId: string | null
  userName: string | null
  accessToken: string | null
  libraries: EmbyLibraryOption[]
}

const DEFAULTS: EmbySettings = {
  serverUrl: null,
  apiBase: null,
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

export function getEmbySettings(): EmbySettings {
  try {
    const raw = getScopedStorageItem(SETTINGS_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<EmbySettings>
    return {
      serverUrl: typeof parsed.serverUrl === 'string' ? parsed.serverUrl : null,
      apiBase: typeof parsed.apiBase === 'string' ? parsed.apiBase : null,
      serverId: typeof parsed.serverId === 'string' ? parsed.serverId : null,
      serverName: typeof parsed.serverName === 'string' ? parsed.serverName : null,
      userId: typeof parsed.userId === 'string' ? parsed.userId : null,
      userName: typeof parsed.userName === 'string' ? parsed.userName : null,
      accessToken: typeof parsed.accessToken === 'string' ? parsed.accessToken : null,
      libraries: Array.isArray(parsed.libraries)
        ? parsed.libraries.filter((entry): entry is EmbyLibraryOption => Boolean(entry && typeof entry.id === 'string' && typeof entry.name === 'string' && (entry.type === 'movies' || entry.type === 'tvshows')))
        : [],
    }
  } catch {
    return DEFAULTS
  }
}

export function setEmbySettings(next: EmbySettings): void {
  setScopedStorageItem(SETTINGS_KEY, JSON.stringify(next))
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENT))
}

export function clearEmbySettings(): void {
  setEmbySettings(DEFAULTS)
}

export function onEmbySettingsChanged(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}

export function isEmbyConnected(settings: EmbySettings = getEmbySettings()): boolean {
  return Boolean(settings.apiBase && settings.userId && settings.accessToken)
}

/** Stabilt enhets-id för Embys X-Emby-Device-Id (så sessioner inte staplas). */
export function ensureEmbyDeviceId(): string {
  const existing = getScopedStorageItem(DEVICE_KEY)
  if (existing) return existing
  const id = `lumio-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
  setScopedStorageItem(DEVICE_KEY, id)
  return id
}

/** Källans id i biblioteksindexet: en per server (och per användare). */
export function embySourceId(settings: EmbySettings): string | null {
  return settings.serverId && settings.userId ? `emby-${settings.serverId}-${settings.userId.slice(0, 8)}` : null
}
