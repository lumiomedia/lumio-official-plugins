'use client'

import { getScopedStorageItem, removeScopedStorageItem, setScopedStorageItem, type MediaItem } from '@/lib/plugin-sdk'

const AUTH_KEY = 'plex_auth'
const SETTINGS_KEY = 'plex_settings'
const CLIENT_KEY = 'plex_client_identifier'
const LIBRARY_CACHE_KEY = 'plex_library_cache'
const RECENT_CACHE_KEY = 'plex_recent_cache'
const DEBUG_KEY = 'plex_debug_log'
const AUTH_EVENT = 'lumio-plex-auth-changed'
const SETTINGS_EVENT = 'lumio-plex-settings-changed'
const DEBUG_EVENT = 'lumio-plex-debug-changed'
const CACHE_TTL_MS = 20 * 60 * 1000
const DEBUG_LIMIT = 50

const DEFAULT_PLEX_SETTINGS: PlexSettingsState = {
  serverId: null,
  serverName: null,
  serverUri: null,
  serverUris: [],
  serverAccessToken: null,
  libraries: [],
}

function safeRandomId(prefix = ''): string {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      try {
        return `${prefix}${crypto.randomUUID()}`
      } catch {
        // fall through to getRandomValues
      }
    }
    if (typeof crypto.getRandomValues === 'function') {
      try {
        const bytes = crypto.getRandomValues(new Uint8Array(16))
        const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
        return `${prefix}${hex}`
      } catch {
        // fall through to Date/Math
      }
    }
  }
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export interface PlexAuthState {
  authToken: string
  baseAuthToken?: string | null
  clientIdentifier: string
  userId?: number | null
  username?: string | null
  title?: string | null
  thumb?: string | null
  homeUserId?: string | null
}

export interface PlexHomeUserOption {
  id: string
  title: string
  username: string | null
  thumb: string | null
  protected: boolean
  admin: boolean
}

export interface PlexServerOption {
  id: string
  name: string
  uri: string
  uris?: string[]
  accessToken: string | null
}

export interface PlexLibraryOption {
  key: string
  title: string
  type: 'movie' | 'show'
}

export interface PlexSettingsState {
  serverId: string | null
  serverName: string | null
  serverUri: string | null
  serverUris?: string[]
  serverAccessToken: string | null
  libraries: PlexLibraryOption[]
}

interface PlexItemsCache {
  version: 1
  updatedAt: number
  signature: string
  items: MediaItem[]
}

export interface PlexItemsCacheSnapshot {
  items: MediaItem[]
  updatedAt: number
  isFresh: boolean
}

function emit(name: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(name))
  }
}

function rankPlexUri(uri: string): number {
  try {
    const parsed = new URL(uri)
    const host = parsed.hostname
    const firstLabel = host.split('.')[0] ?? ''
    const isPrivateIpHost =
      host.startsWith('192.168.')
      || host.startsWith('10.')
      || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    const isPrivatePlexDirectLabel =
      /^\d{1,3}(-\d{1,3}){3}$/.test(firstLabel)
      && (
        firstLabel.startsWith('192-168-')
        || firstLabel.startsWith('10-')
        || /^172-(1[6-9]|2\d|3[0-1])-/.test(firstLabel)
      )

    if (host.endsWith('.plex.direct')) {
      return isPrivatePlexDirectLabel ? 2 : 0
    }
    if (parsed.protocol === 'http:') {
      return isPrivateIpHost ? 3 : 1
    }
    if (parsed.protocol === 'https:') {
      return isPrivateIpHost ? 4 : 5
    }
  } catch {
    // fall through to default below
  }
  return 5
}

export function normalizePlexUris(serverUri: string | null | undefined, serverUris?: string[]): string[] {
  const values = [serverUri ?? '', ...(serverUris ?? [])]
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const value of values) {
    const candidate = value.trim().replace(/\/+$/, '')
    if (!candidate || seen.has(candidate)) continue
    seen.add(candidate)
    normalized.push(candidate)
  }

  return normalized.sort((a, b) => rankPlexUri(a) - rankPlexUri(b))
}

function parsePlexSettings(raw: string | null): PlexSettingsState {
  if (!raw) return DEFAULT_PLEX_SETTINGS

  try {
    const parsed = JSON.parse(raw) as Partial<PlexSettingsState>
    const normalizedUris = normalizePlexUris(
      typeof parsed.serverUri === 'string' ? parsed.serverUri : null,
      Array.isArray(parsed.serverUris)
        ? parsed.serverUris.filter((value): value is string => typeof value === 'string' && value.length > 0)
        : [],
    )

    return {
      serverId: typeof parsed.serverId === 'string' ? parsed.serverId : null,
      serverName: typeof parsed.serverName === 'string' ? parsed.serverName : null,
      serverUri: normalizedUris[0] ?? null,
      serverUris: normalizedUris,
      serverAccessToken: typeof parsed.serverAccessToken === 'string' ? parsed.serverAccessToken : null,
      libraries: Array.isArray(parsed.libraries)
        ? parsed.libraries.filter((library): library is PlexLibraryOption =>
            Boolean(
              library
              && typeof library === 'object'
              && typeof (library as PlexLibraryOption).key === 'string'
              && typeof (library as PlexLibraryOption).title === 'string'
              && ((library as PlexLibraryOption).type === 'movie' || (library as PlexLibraryOption).type === 'show'),
            ),
          )
        : [],
    }
  } catch {
    return DEFAULT_PLEX_SETTINGS
  }
}

function getCacheSignature(settings: PlexSettingsState, limit: number): string {
  return JSON.stringify({
    serverId: settings.serverId,
    serverUri: settings.serverUri,
    serverUris: normalizePlexUris(settings.serverUri, settings.serverUris),
    libraries: settings.libraries.map((library) => `${library.type}:${library.key}`).sort(),
    limit,
  })
}

function readItemsCache(baseKey: string, settings: PlexSettingsState, limit: number): PlexItemsCacheSnapshot | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = getScopedStorageItem(baseKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PlexItemsCache>
    if (
      parsed.version !== 1
      || typeof parsed.updatedAt !== 'number'
      || typeof parsed.signature !== 'string'
      || !Array.isArray(parsed.items)
      || parsed.signature !== getCacheSignature(settings, limit)
    ) {
      return null
    }
    return {
      items: parsed.items as MediaItem[],
      updatedAt: parsed.updatedAt,
      isFresh: Date.now() - parsed.updatedAt <= CACHE_TTL_MS,
    }
  } catch {
    return null
  }
}

function writeItemsCache(baseKey: string, settings: PlexSettingsState, limit: number, items: MediaItem[]): void {
  if (typeof window === 'undefined') return
  const payload: PlexItemsCache = {
    version: 1,
    updatedAt: Date.now(),
    signature: getCacheSignature(settings, limit),
    items,
  }
  setScopedStorageItem(baseKey, JSON.stringify(payload))
}

export function getPlexAuth(): PlexAuthState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = getScopedStorageItem(AUTH_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PlexAuthState>
    if (typeof parsed.authToken !== 'string' || typeof parsed.clientIdentifier !== 'string') return null
    return {
      authToken: parsed.authToken,
      baseAuthToken: typeof parsed.baseAuthToken === 'string' ? parsed.baseAuthToken : null,
      clientIdentifier: parsed.clientIdentifier,
      userId: typeof parsed.userId === 'number' ? parsed.userId : null,
      username: typeof parsed.username === 'string' ? parsed.username : null,
      title: typeof parsed.title === 'string' ? parsed.title : null,
      thumb: typeof parsed.thumb === 'string' ? parsed.thumb : null,
      homeUserId: typeof parsed.homeUserId === 'string' ? parsed.homeUserId : null,
    }
  } catch {
    return null
  }
}

export function setPlexAuth(auth: PlexAuthState | null): void {
  if (typeof window === 'undefined') return
  if (!auth) {
    removeScopedStorageItem(AUTH_KEY)
    emit(AUTH_EVENT)
    return
  }
  setScopedStorageItem(AUTH_KEY, JSON.stringify(auth))
  emit(AUTH_EVENT)
}

export function clearPlexAuth(): void {
  setPlexAuth(null)
}

export function getPlexSettings(): PlexSettingsState {
  if (typeof window === 'undefined') return DEFAULT_PLEX_SETTINGS
  return parsePlexSettings(getScopedStorageItem(SETTINGS_KEY))
}

export function ensureCanonicalPlexSettings(): PlexSettingsState {
  if (typeof window === 'undefined') return DEFAULT_PLEX_SETTINGS

  const currentRaw = getScopedStorageItem(SETTINGS_KEY)
  const normalizedSettings = parsePlexSettings(currentRaw)
  const normalizedRaw = JSON.stringify(normalizedSettings)

  if (currentRaw !== normalizedRaw) {
    setScopedStorageItem(SETTINGS_KEY, normalizedRaw)
  }

  return normalizedSettings
}

export function setPlexSettings(settings: PlexSettingsState): void {
  if (typeof window === 'undefined') return
  const normalizedUris = normalizePlexUris(settings.serverUri, settings.serverUris)
  const normalizedSettings: PlexSettingsState = {
    ...settings,
    serverUri: normalizedUris[0] ?? null,
    serverUris: normalizedUris,
  }
  const nextRaw = JSON.stringify(normalizedSettings)
  const currentRaw = getScopedStorageItem(SETTINGS_KEY)
  if (currentRaw === nextRaw) return
  setScopedStorageItem(SETTINGS_KEY, nextRaw)
  emit(SETTINGS_EVENT)
}

export function clearPlexSettings(): void {
  if (typeof window === 'undefined') return
  removeScopedStorageItem(SETTINGS_KEY)
  emit(SETTINGS_EVENT)
}

export function getCachedPlexLibraryItems(limit: number): MediaItem[] | null {
  return readItemsCache(LIBRARY_CACHE_KEY, getPlexSettings(), limit)?.items ?? null
}

export function setCachedPlexLibraryItems(limit: number, items: MediaItem[]): void {
  writeItemsCache(LIBRARY_CACHE_KEY, getPlexSettings(), limit, items)
}

export function getCachedPlexRecentlyAdded(limit: number): MediaItem[] | null {
  return readItemsCache(RECENT_CACHE_KEY, getPlexSettings(), limit)?.items ?? null
}

export function setCachedPlexRecentlyAdded(limit: number, items: MediaItem[]): void {
  writeItemsCache(RECENT_CACHE_KEY, getPlexSettings(), limit, items)
}

export function getCachedPlexLibrarySnapshot(limit: number): PlexItemsCacheSnapshot | null {
  return readItemsCache(LIBRARY_CACHE_KEY, getPlexSettings(), limit)
}

export function getCachedPlexRecentlyAddedSnapshot(limit: number): PlexItemsCacheSnapshot | null {
  return readItemsCache(RECENT_CACHE_KEY, getPlexSettings(), limit)
}

export function clearPlexLibraryCache(): void {
  if (typeof window === 'undefined') return
  removeScopedStorageItem(LIBRARY_CACHE_KEY)
}

export function clearPlexRecentCache(): void {
  if (typeof window === 'undefined') return
  removeScopedStorageItem(RECENT_CACHE_KEY)
}

export function clearPlexCaches(): void {
  clearPlexLibraryCache()
  clearPlexRecentCache()
}

export function ensurePlexClientIdentifier(): string {
  if (typeof window === 'undefined') return 'lumio-plex'
  const existing = getScopedStorageItem(CLIENT_KEY)
  if (existing) return existing
  const clientIdentifier = safeRandomId('lumio-plex-')
  setScopedStorageItem(CLIENT_KEY, clientIdentifier)
  return clientIdentifier
}

export function onPlexAuthChanged(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(AUTH_EVENT, listener)
  return () => window.removeEventListener(AUTH_EVENT, listener)
}

export function onPlexSettingsChanged(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(SETTINGS_EVENT, listener)
  return () => window.removeEventListener(SETTINGS_EVENT, listener)
}

export function getPlexDebugLog(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = getScopedStorageItem(DEBUG_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry): entry is string => typeof entry === 'string')
  } catch {
    return []
  }
}

export function appendPlexDebugLog(line: string): void {
  if (typeof window === 'undefined') return
  const next = [...getPlexDebugLog(), line].slice(-DEBUG_LIMIT)
  setScopedStorageItem(DEBUG_KEY, JSON.stringify(next))
  emit(DEBUG_EVENT)
}

export function clearPlexDebugLog(): void {
  if (typeof window === 'undefined') return
  removeScopedStorageItem(DEBUG_KEY)
  emit(DEBUG_EVENT)
}

export function onPlexDebugLogChanged(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(DEBUG_EVENT, listener)
  return () => window.removeEventListener(DEBUG_EVENT, listener)
}
