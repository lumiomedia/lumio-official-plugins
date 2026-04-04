'use client'

import { getScopedStorageItem, setScopedStorageItem } from '@/lib/profile-storage'
import type { YouTubePluginSettings, YouTubeSession } from './youtube-types'

const SETTINGS_KEY = 'plugin_youtube_settings'
const SESSION_KEY = 'plugin_youtube_session'
const EVENT = 'lumio-youtube-plugin-changed'
const CACHE_PREFIX = 'plugin_youtube_cache'

const DEFAULT_SETTINGS: YouTubePluginSettings = {
  clientId: '',
  apiKey: '',
  hideShorts: false,
  homeRows: {
    following: true,
    watchLater: true,
    playlists: true,
  },
}

function emitChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT))
  }
}

export function getYouTubeSettings(): YouTubePluginSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = getScopedStorageItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<YouTubePluginSettings>
    return {
      clientId: typeof parsed.clientId === 'string' ? parsed.clientId : '',
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      hideShorts: parsed.hideShorts === true,
      homeRows: {
        following: parsed.homeRows?.following !== false,
        watchLater: parsed.homeRows?.watchLater !== false,
        playlists: parsed.homeRows?.playlists !== false,
      },
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function setYouTubeSettings(settings: YouTubePluginSettings): void {
  setScopedStorageItem(SETTINGS_KEY, JSON.stringify(settings))
  emitChanged()
}

export function getYouTubeSession(): YouTubeSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = getScopedStorageItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<YouTubeSession>
    if (
      typeof parsed.accessToken !== 'string'
      || typeof parsed.expiresAt !== 'number'
      || typeof parsed.channelId !== 'string'
      || typeof parsed.channelTitle !== 'string'
    ) {
      return null
    }
    return {
      accessToken: parsed.accessToken,
      expiresAt: parsed.expiresAt,
      scope: typeof parsed.scope === 'string' ? parsed.scope : '',
      channelId: parsed.channelId,
      channelTitle: parsed.channelTitle,
      channelThumbnailUrl: typeof parsed.channelThumbnailUrl === 'string' ? parsed.channelThumbnailUrl : null,
      uploadsPlaylistId: typeof parsed.uploadsPlaylistId === 'string' ? parsed.uploadsPlaylistId : null,
      likesPlaylistId: typeof parsed.likesPlaylistId === 'string' ? parsed.likesPlaylistId : null,
      watchLaterPlaylistId: typeof parsed.watchLaterPlaylistId === 'string' ? parsed.watchLaterPlaylistId : null,
    }
  } catch {
    return null
  }
}

export function setYouTubeSession(session: YouTubeSession | null): void {
  if (session) {
    setScopedStorageItem(SESSION_KEY, JSON.stringify(session))
  } else {
    setScopedStorageItem(SESSION_KEY, '')
  }
  emitChanged()
}

export function clearYouTubeSession(): void {
  setYouTubeSession(null)
}

export function isYouTubeSessionValid(session: YouTubeSession | null = getYouTubeSession()): boolean {
  return Boolean(session && session.expiresAt > Date.now() + 30_000)
}

export function readYouTubeCache<T>(key: string, maxAgeMs: number): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = getScopedStorageItem(`${CACHE_PREFIX}:${key}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { updatedAt?: number; data?: T }
    if (typeof parsed.updatedAt !== 'number' || Date.now() - parsed.updatedAt > maxAgeMs) {
      return null
    }
    return parsed.data ?? null
  } catch {
    return null
  }
}

export function readYouTubeCacheStale<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = getScopedStorageItem(`${CACHE_PREFIX}:${key}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { data?: T }
    return parsed.data ?? null
  } catch {
    return null
  }
}

export function writeYouTubeCache<T>(key: string, data: T): void {
  setScopedStorageItem(
    `${CACHE_PREFIX}:${key}`,
    JSON.stringify({
      updatedAt: Date.now(),
      data,
    }),
  )
}

export function clearYouTubeCache(): void {
  if (typeof window === 'undefined') return
  const keys: string[] = []
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (key && key.includes(CACHE_PREFIX)) keys.push(key)
  }
  for (const key of keys) {
    window.localStorage.removeItem(key)
  }
  emitChanged()
}

export function onYouTubePluginChanged(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
