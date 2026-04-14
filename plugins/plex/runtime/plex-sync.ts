'use client'

import { createLanguageOption, type MediaItem } from '@/lib/plugin-sdk'
import {
  appendPlexDebugLog,
  clearPlexAuth,
  ensureCanonicalPlexSettings,
  getCachedPlexLibraryItems,
  getCachedPlexRecentlyAdded,
  getPlexAuth,
  getPlexSettings,
  setCachedPlexLibraryItems,
  setCachedPlexRecentlyAdded,
  setPlexLibraryLastError,
  setPlexAuth,
  setPlexSettings,
  type PlexAuthState,
  type PlexHomeUserOption,
  type PlexLibraryOption,
  type PlexServerOption,
} from './plex-storage'

export interface PlexPlaybackResolveFailure {
  itemId: string
  status: number | null
  error: string | null
  firstAttemptUrl: string | null
  firstAttemptError: string | null
}

export interface PlexPlaylist {
  key: string
  title: string
  itemCount: number
}

type PlexMediaItem = MediaItem & {
  source?: string
  plexRatingKey?: string | null
  plexPartKey?: string | null
  plexFilename?: string | null
  plexServerUri?: string | null
}

let lastPlexPlaybackResolveFailure: PlexPlaybackResolveFailure | null = null
const plexLibraryInFlight = new Map<string, Promise<MediaItem[]>>()
const plexLibraryCooldownUntil = new Map<string, number>()
const PLEX_LIBRARY_RETRY_COOLDOWN_MS = 15_000

function safeRandomId(): string {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      try {
        return crypto.randomUUID()
      } catch {
        // fall through to getRandomValues
      }
    }
    if (typeof crypto.getRandomValues === 'function') {
      try {
        const bytes = crypto.getRandomValues(new Uint8Array(16))
        return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
      } catch {
        // fall through to Date/Math
      }
    }
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function getLastPlexPlaybackResolveFailure(): PlexPlaybackResolveFailure | null {
  return lastPlexPlaybackResolveFailure
}

function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as any
  if (w.__TAURI__ || w.__TAURI_INTERNALS__ || w.__TAURI_IPC__ || w.__TAURI_METADATA__) return true
  const ua = navigator.userAgent ?? ''
  if (/Tauri|Wry|Lumio/i.test(ua)) return true
  const protocol = window.location?.protocol ?? ''
  if (protocol && protocol !== 'http:' && protocol !== 'https:') return true
  const host = window.location?.hostname ?? ''
  if (host === 'tauri.localhost' || host.endsWith('.tauri.localhost')) return true
  return false
}

function logPlexDebug(message: string, detail?: Record<string, unknown>) {
  const payload = detail ? `${message} ${JSON.stringify(detail)}` : message
  appendPlexDebugLog(payload)
}

function plexHeaders(clientIdentifier: string, authToken?: string): HeadersInit {
  return {
    Accept: 'application/json',
    'X-Plex-Product': 'Lumio',
    'X-Plex-Version': '0.1.0',
    'X-Plex-Device': 'Desktop',
    'X-Plex-Platform': 'Web',
    'X-Plex-Client-Identifier': clientIdentifier,
    ...(authToken ? { 'X-Plex-Token': authToken } : {}),
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

function deriveLocalUrisFromPlexDirect(uri: string): string[] {
  try {
    const parsed = new URL(uri)
    if (!parsed.hostname.endsWith('.plex.direct')) return []
    const firstLabel = parsed.hostname.split('.')[0] ?? ''
    if (!/^\d{1,3}(-\d{1,3}){3}$/.test(firstLabel)) return []
    const ip = firstLabel.split('-').join('.')
    const port = parsed.port || '32400'
    return [
      `http://${ip}:${port}`,
      `https://${ip}:${port}`,
    ]
  } catch {
    return []
  }
}

function normalizePlexUris(serverUriOrUris: string | string[]): string[] {
  const values = Array.isArray(serverUriOrUris) ? serverUriOrUris : [serverUriOrUris]
  const seen = new Set<string>()
  const uris: string[] = []
  for (const value of values) {
    const normalized = value.trim().replace(/\/+$/, '')
    if (!normalized) continue
    const derived = deriveLocalUrisFromPlexDirect(normalized)
    for (const candidate of [normalized, ...derived]) {
      if (!candidate || seen.has(candidate)) continue
      seen.add(candidate)
      uris.push(candidate)
    }
  }
  return uris.sort((a, b) => rankPlexUri(a) - rankPlexUri(b))
}

function buildPlexImageUrl(serverUri: string, thumb: string | null | undefined, authToken: string): string | null {
  if (!thumb) return null
  const directUrl = `${serverUri}${thumb}${thumb.includes('?') ? '&' : '?'}X-Plex-Token=${encodeURIComponent(authToken)}`
  return `/api/plugins/plex/image?url=${encodeURIComponent(directUrl)}`
}

function parsePlexGuid(guids: Array<{ id?: string | null }> | undefined, prefix: 'tmdb://' | 'imdb://'): string | null {
  const match = guids?.find((guid) => typeof guid.id === 'string' && guid.id.startsWith(prefix))
  return match?.id ? match.id.slice(prefix.length) : null
}

const PLEX_LANG3_TO_2: Record<string, string> = {
  eng: 'en', swe: 'sv', nor: 'no', dan: 'da', fin: 'fi',
  deu: 'de', ger: 'de', fra: 'fr', fre: 'fr', spa: 'es',
  ita: 'it', por: 'pt', nld: 'nl', dut: 'nl', pol: 'pl',
  rus: 'ru', ara: 'ar', zho: 'zh', chi: 'zh', jpn: 'ja',
  kor: 'ko', tur: 'tr', ces: 'cs', cze: 'cs', ron: 'ro', rum: 'ro',
  hun: 'hu', ell: 'el', gre: 'el', heb: 'he', ukr: 'uk', srp: 'sr',
  hrv: 'hr', slk: 'sk', bul: 'bg', vie: 'vi', tha: 'th', ind: 'id',
}

function normalizePlexLanguageCode(value: string | null | undefined): string | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  const base = normalized.split(/[-_]/)[0]
  if (base.length === 2) return base
  if (base.length === 3) return PLEX_LANG3_TO_2[base] ?? base
  return null
}

type PlexMetadataEntry = {
  ratingKey?: string
  type?: string
  grandparentRatingKey?: string
  title?: string
  titleSort?: string
  grandparentTitle?: string
  summary?: string
  thumb?: string | null
  art?: string | null
  grandparentThumb?: string | null
  grandparentArt?: string | null
  year?: number
  addedAt?: number
  audienceRating?: number | null
  rating?: number | null
  Genre?: Array<{ tag?: string }>
  Role?: Array<{
    id?: number | null
    tag?: string | null
    role?: string | null
    thumb?: string | null
  }>
  Guid?: Array<{ id?: string | null }>
  Media?: Array<{
    audioProfile?: string | null
    audioCodec?: string | null
    Part?: Array<{
      key?: string | null
      file?: string | null
      Stream?: Array<{
        streamType?: number | string | null
        selected?: number | boolean | null
        language?: string | null
        languageCode?: string | null
        languageTag?: string | null
      }>
    }>
  }>
}

function getPlexOriginalLanguage(media: PlexMetadataEntry['Media']) {
  const audioStreams = (media ?? []).flatMap((mediaItem) =>
    (mediaItem.Part ?? []).flatMap((part) =>
      (part.Stream ?? []).filter((stream) => String(stream.streamType ?? '') === '2'),
    ),
  )

  const preferredStream = audioStreams.find((stream) => stream.selected === 1 || stream.selected === true) ?? audioStreams[0]
  const code = normalizePlexLanguageCode(
    preferredStream?.languageTag ?? preferredStream?.languageCode ?? preferredStream?.language ?? null,
  )

  return code ? createLanguageOption({ code }) : null
}

function mapPlexMetadataEntries(
  entries: PlexMetadataEntry[],
  serverUri: string,
  authToken: string,
  forcedLibraryType?: 'movie' | 'show',
): MediaItem[] {
  return entries.map((entry) => {
    const isEpisodeEntry = forcedLibraryType === 'show' && entry.type === 'episode'
    const effectiveRatingKey = isEpisodeEntry
      ? (entry.grandparentRatingKey ?? entry.ratingKey)
      : entry.ratingKey
    const effectiveTitle = isEpisodeEntry
      ? (entry.grandparentTitle ?? entry.title)
      : entry.title
    const effectiveThumb = isEpisodeEntry
      ? (entry.grandparentThumb ?? entry.thumb)
      : entry.thumb
    const effectiveArt = isEpisodeEntry
      ? (entry.grandparentArt ?? entry.art ?? entry.grandparentThumb ?? entry.thumb)
      : (entry.art ?? entry.thumb)
    const tmdbId = parsePlexGuid(entry.Guid, 'tmdb://')
    const imdbId = parsePlexGuid(entry.Guid, 'imdb://')
    const type = forcedLibraryType === 'show'
      ? 'tv'
      : forcedLibraryType === 'movie'
        ? 'movie'
        : entry.type === 'show' || entry.type === 'episode'
          ? 'tv'
          : 'movie'
    const firstPart = entry.Media?.[0]?.Part?.[0]
    const rawFile = firstPart?.file ?? null
    const filename = rawFile
      ? rawFile.split(/[\\/]/).pop() ?? null
      : (firstPart?.key?.split('/').pop() ?? null)
    const castNames = (entry.Role ?? [])
      .map((role) => (role.tag ?? '').trim())
      .filter((name): name is string => Boolean(name))

    const source = 'plex' as unknown as MediaItem['source']

    const mapped: PlexMediaItem = {
      id: tmdbId ? `${type}-${tmdbId}` : `plex-${type}-${effectiveRatingKey ?? safeRandomId()}`,
      title: effectiveTitle ?? 'Untitled',
      searchTitles: [effectiveTitle, entry.title, entry.titleSort].filter((value): value is string => Boolean(value)),
      castNames,
      originalLanguage: getPlexOriginalLanguage(entry.Media),
      type,
      year: entry.year ?? null,
      imdbId,
      posterUrl: buildPlexImageUrl(serverUri, effectiveThumb, authToken),
      backdropUrl: buildPlexImageUrl(serverUri, effectiveArt, authToken),
      genres: (entry.Genre ?? []).map((genre) => genre.tag).filter((value): value is string => Boolean(value)),
      keywords: [],
      providers: ['Plex'],
      ratings: {
        imdb: null,
        metacritic: null,
        rottenTomatoes: null,
      },
      overview: entry.summary ?? '',
      source,
      discoveryScore: typeof entry.audienceRating === 'number'
        ? entry.audienceRating
        : typeof entry.rating === 'number'
          ? entry.rating
          : null,
      popularity: typeof entry.addedAt === 'number' ? entry.addedAt : undefined,
      plexRatingKey: effectiveRatingKey ?? null,
      plexPartKey: firstPart?.key ?? null,
      plexFilename: filename,
      plexServerUri: serverUri,
    }

    return mapped as MediaItem
  })
}

function candidateTokens(...values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const tokens: string[] = []
  for (const token of values) {
    const value = (token ?? '').trim()
    if (!value || seen.has(value)) continue
    seen.add(value)
    tokens.push(value)
  }
  return tokens
}

async function fetchPlexLibraryItemsDirect(limit: number): Promise<MediaItem[]> {
  const auth = getPlexAuth()
  const settings = getPlexSettings()
  if (!auth || !settings.serverUri || settings.libraries.length === 0) return []

  const uris = normalizePlexUris(settings.serverUris && settings.serverUris.length > 0
    ? settings.serverUris
    : settings.serverUri)
  const tokens = candidateTokens(auth.authToken, settings.serverAccessToken, auth.baseAuthToken)
  const perLibraryLimit = Math.max(50, Math.ceil(limit / Math.max(1, settings.libraries.length)))

  logPlexDebug('[plex-direct] start', {
    uris,
    libraries: settings.libraries.map((library) => `${library.type}:${library.key}:${library.title}`),
    tokenCount: tokens.length,
    perLibraryLimit,
  })

  for (const token of tokens) {
    const tokenLabel = token === auth.authToken
      ? 'authToken'
      : token === settings.serverAccessToken
        ? 'serverAccessToken'
        : 'baseAuthToken'
    logPlexDebug('[plex-direct] trying token', { token: tokenLabel })
    const responses = await Promise.all(
      settings.libraries.map(async (library) => {
        for (const serverUri of uris) {
          const items: MediaItem[] = []
          let start = 0

          try {
            while (items.length < perLibraryLimit) {
              const batchSize = Math.min(60, perLibraryLimit - items.length)
              const plexType = library.type === 'movie' ? 1 : 2
              const url = `${serverUri}/library/sections/${library.key}/all?type=${plexType}&sort=titleSort:asc&X-Plex-Container-Start=${start}&X-Plex-Container-Size=${batchSize}`
              logPlexDebug('[plex-direct] fetch', {
                library: `${library.title} (${library.key})`,
                uri: serverUri,
                start,
                batchSize,
              })
              const response = await fetchWithTimeoutAndRetry(
                url,
                {
                  headers: plexHeaders(auth.clientIdentifier, token),
                  cache: 'no-store',
                },
                { timeoutMs: 35_000, retries: 0 },
              )
              if (!response.ok) {
                logPlexDebug('[plex-direct] non-200', {
                  status: response.status,
                  library: `${library.title} (${library.key})`,
                  uri: serverUri,
                })
                break
              }

              const payload = (await response.json()) as {
                MediaContainer?: {
                  Metadata?: PlexMetadataEntry[]
                }
              }

              const metadata = payload.MediaContainer?.Metadata ?? []
              logPlexDebug('[plex-direct] metadata', {
                library: `${library.title} (${library.key})`,
                uri: serverUri,
                count: metadata.length,
                start,
              })
              if (metadata.length === 0) break

              items.push(...mapPlexMetadataEntries(metadata, serverUri, token, library.type))
              start += metadata.length
              if (metadata.length < batchSize) break
            }
          } catch (error) {
            logPlexDebug('[plex-direct] error', {
              library: `${library.title} (${library.key})`,
              uri: serverUri,
              message: error instanceof Error ? error.message : String(error),
            })
            items.length = 0
          }

          if (items.length > 0) {
            logPlexDebug('[plex-direct] success', {
              library: `${library.title} (${library.key})`,
              uri: serverUri,
              count: items.length,
            })
            return items
          }
        }

        return []
      }),
    )

    const items = responses
      .flat()
      .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true }))
      .slice(0, limit)

    if (items.length > 0) {
      logPlexDebug('[plex-direct] returning items', { count: items.length, token: tokenLabel })
      return items
    }
  }

  logPlexDebug('[plex-direct] no items found')
  return []
}

async function fetchWithTimeoutAndRetry(
  input: string,
  init: RequestInit,
  options?: {
    timeoutMs?: number
    retries?: number
    retryDelayMs?: number
  },
): Promise<Response> {
  const timeoutMs = options?.timeoutMs ?? 20_000
  const retries = options?.retries ?? 1
  const retryDelayMs = options?.retryDelayMs ?? 250
  let lastError: unknown = null

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), timeoutMs)

    try {
      return await fetch(input, {
        ...init,
        signal: controller.signal,
      })
    } catch (error) {
      lastError = error
      const isLastAttempt = attempt >= retries
      if (isLastAttempt) break
      await new Promise((resolve) => window.setTimeout(resolve, retryDelayMs))
    } finally {
      window.clearTimeout(timer)
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Network request failed')
}

export async function startPlexLogin(clientIdentifier: string): Promise<{ pinId: number; code: string; authUrl: string }> {
  const response = await fetch('/api/plugins/plex/pin/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientIdentifier }),
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error ?? `Plex login start failed (${response.status})`)
  }
  return response.json() as Promise<{ pinId: number; code: string; authUrl: string }>
}

export async function pollPlexLogin(pinId: number, clientIdentifier: string): Promise<PlexAuthState | null> {
  const response = await fetch('/api/plugins/plex/pin/poll', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pinId, clientIdentifier }),
  })
  if (response.status === 202) return null
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error ?? `Plex login poll failed (${response.status})`)
  }
  const payload = (await response.json()) as { auth?: PlexAuthState }
  if (!payload.auth) return null
  setPlexAuth(payload.auth)
  return payload.auth
}

export async function fetchPlexResources(): Promise<PlexServerOption[]> {
  const auth = getPlexAuth()
  if (!auth) return []
  const response = await fetchWithTimeoutAndRetry(
    '/api/plugins/plex/resources',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth }),
    },
    { timeoutMs: 15_000, retries: 1, retryDelayMs: 300 },
  )
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error ?? `Plex resources failed (${response.status})`)
  }
  const payload = (await response.json()) as { resources?: PlexServerOption[] }
  return payload.resources ?? []
}

export async function fetchPlexLibraries(serverUri: string, serverAccessToken: string | null, serverUris?: string[]): Promise<PlexLibraryOption[]> {
  const auth = getPlexAuth()
  if (!auth) return []
  const response = await fetchWithTimeoutAndRetry(
    '/api/plugins/plex/resources',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth,
        serverUri,
        serverUris,
        serverAccessToken,
      }),
    },
    { timeoutMs: 20_000, retries: 1, retryDelayMs: 350 },
  )
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error ?? `Plex libraries failed (${response.status})`)
  }
  const payload = (await response.json()) as { libraries?: PlexLibraryOption[] }
  return payload.libraries ?? []
}

export async function fetchPlexHomeUsers(): Promise<PlexHomeUserOption[]> {
  const auth = getPlexAuth()
  if (!auth) return []
  const response = await fetch('/api/plugins/plex/home-users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ auth }),
  })
  if (!response.ok) return []
  const payload = (await response.json()) as { users?: PlexHomeUserOption[] }
  return payload.users ?? []
}

export async function switchPlexHomeProfile(homeUserId: string, pin?: string): Promise<PlexAuthState> {
  const auth = getPlexAuth()
  if (!auth) throw new Error('Plex auth required')
  const response = await fetch('/api/plugins/plex/home-users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth,
      homeUserId,
      pin,
    }),
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error ?? `Plex profile switch failed (${response.status})`)
  }
  const payload = (await response.json()) as { auth?: PlexAuthState }
  if (!payload.auth) throw new Error('Plex profile switch returned no auth')
  setPlexAuth(payload.auth)
  return payload.auth
}

export async function fetchPlexRecentlyAdded(limit = 24): Promise<MediaItem[]> {
  const auth = getPlexAuth()
  const settings = ensureCanonicalPlexSettings()
  if (!auth || !settings.serverUri || settings.libraries.length === 0) return getCachedPlexRecentlyAdded(limit) ?? []
  const response = await fetch('/api/plugins/plex/recently-added', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth,
      settings,
      limit,
    }),
  })
  if (!response.ok) return getCachedPlexRecentlyAdded(limit) ?? []
  const payload = (await response.json()) as { items?: MediaItem[] }
  const items = payload.items ?? []
  setCachedPlexRecentlyAdded(limit, items)
  return items
}

export async function resolvePlexPlaybackUrl(item: MediaItem): Promise<string | null> {
  const plexItem = item as PlexMediaItem
  if (plexItem.source !== 'plex' || plexItem.type !== 'movie' || !plexItem.plexPartKey) return null
  const auth = getPlexAuth()
  let settings = ensureCanonicalPlexSettings()
  if (!auth || !settings.serverUri) return null

  const resolveWithSettings = async (
    settingsSnapshot: ReturnType<typeof getPlexSettings>,
  ): Promise<{
    url: string | null
    status: number | null
    error: string | null
    firstAttemptUrl: string | null
    firstAttemptError: string | null
  }> => {
    try {
      const response = await fetchWithTimeoutAndRetry(
        '/api/plugins/plex/playback-url',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            auth,
            settings: settingsSnapshot,
            item: {
              plexServerUri: plexItem.plexServerUri ?? null,
              plexPartKey: plexItem.plexPartKey,
            },
          }),
        },
        { timeoutMs: 20_000, retries: 0 },
      )
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string
          firstAttemptUrl?: string | null
          firstAttemptError?: string | null
        }
        return {
          url: null,
          status: response.status,
          error: payload.error ?? null,
          firstAttemptUrl: payload.firstAttemptUrl ?? null,
          firstAttemptError: payload.firstAttemptError ?? null,
        }
      }
      const payload = (await response.json()) as { url?: string }
      return {
        url: typeof payload.url === 'string' && payload.url.length > 0 ? payload.url : null,
        status: response.status,
        error: null,
        firstAttemptUrl: null,
        firstAttemptError: null,
      }
    } catch {
      return {
        url: null,
        status: null,
        error: 'network_error',
        firstAttemptUrl: null,
        firstAttemptError: null,
      }
    }
  }

  const firstAttempt = await resolveWithSettings(settings)
  if (firstAttempt.url) {
    lastPlexPlaybackResolveFailure = null
    return firstAttempt.url
  }

  console.warn('[plex] playback-url resolve failed', {
    status: firstAttempt.status,
    error: firstAttempt.error,
    firstAttemptUrl: firstAttempt.firstAttemptUrl,
    firstAttemptError: firstAttempt.firstAttemptError,
    itemId: item.id,
    plexPartKey: plexItem.plexPartKey,
    retryingAfterResourceRefresh: true,
  })

  try {
    const resources = await fetchPlexResources()
    if (resources.length === 0) return null
    const refreshedServer = resources.find((entry) => (
      (settings.serverId && entry.id === settings.serverId)
      || (settings.serverName && entry.name === settings.serverName)
      || entry.uri === settings.serverUri
      || (settings.serverUris ?? []).includes(entry.uri)
      || (entry.uris ?? []).some((uri) => (
        uri === settings.serverUri || (settings.serverUris ?? []).includes(uri)
      ))
    )) ?? resources[0]

    settings = {
      ...settings,
      serverId: refreshedServer.id,
      serverName: refreshedServer.name,
      serverUri: refreshedServer.uri,
      serverUris: refreshedServer.uris ?? [refreshedServer.uri],
      serverAccessToken: refreshedServer.accessToken ?? settings.serverAccessToken,
    }
    setPlexSettings(settings)

    const secondAttempt = await resolveWithSettings(settings)
    if (secondAttempt.url) {
      lastPlexPlaybackResolveFailure = null
      return secondAttempt.url
    }

    lastPlexPlaybackResolveFailure = {
      itemId: item.id,
      status: secondAttempt.status,
      error: secondAttempt.error,
      firstAttemptUrl: secondAttempt.firstAttemptUrl,
      firstAttemptError: secondAttempt.firstAttemptError,
    }

    console.warn('[plex] playback-url resolve failed after resource refresh', {
      status: secondAttempt.status,
      error: secondAttempt.error,
      firstAttemptUrl: secondAttempt.firstAttemptUrl,
      firstAttemptError: secondAttempt.firstAttemptError,
      itemId: item.id,
      plexPartKey: plexItem.plexPartKey,
      refreshedServerId: refreshedServer.id,
      refreshedServerUri: refreshedServer.uri,
    })
    return null
  } catch {
    lastPlexPlaybackResolveFailure = {
      itemId: item.id,
      status: firstAttempt.status,
      error: firstAttempt.error,
      firstAttemptUrl: firstAttempt.firstAttemptUrl,
      firstAttemptError: firstAttempt.firstAttemptError,
    }
    return null
  }
}

export async function fetchPlexLibraryItems(
  limit = 240,
  options?: { force?: boolean },
): Promise<MediaItem[]> {
  const auth = getPlexAuth()
  const settings = ensureCanonicalPlexSettings()
  const forceRefresh = options?.force === true
  const cachedItems = getCachedPlexLibraryItems(limit) ?? []
  if (!auth || !settings.serverUri || settings.libraries.length === 0) return cachedItems
  if (!forceRefresh && cachedItems.length > 0) return cachedItems
  const cooldownKey = JSON.stringify({
    serverId: settings.serverId,
    libraries: settings.libraries.map((l) => `${l.type}:${l.key}`).sort(),
    limit,
  })
  const existingRequest = plexLibraryInFlight.get(cooldownKey)
  if (existingRequest) {
    return existingRequest
  }
  if (!forceRefresh) {
    const now = Date.now()
    const cooldownUntil = plexLibraryCooldownUntil.get(cooldownKey) ?? 0
    if (cooldownUntil > now) {
      return getCachedPlexLibraryItems(limit) ?? []
    }
  } else {
    plexLibraryCooldownUntil.delete(cooldownKey)
  }

  const request = (async (): Promise<MediaItem[]> => {

    setPlexLibraryLastError(null)
    if (forceRefresh) {
      logPlexDebug('[plex-sync] server fetch start', {
        serverUri: settings.serverUri,
        uriCount: settings.serverUris?.length ?? 0,
        libraries: settings.libraries.map((l) => `${l.type}:${l.key}:${l.title}`),
        limit,
      })
    }

    async function fetchRecentlyAddedFallback(): Promise<MediaItem[]> {
      try {
        const recentlyAddedResponse = await fetchWithTimeoutAndRetry(
          '/api/plugins/plex/recently-added',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              auth,
              settings,
              limit,
            }),
          },
          { timeoutMs: 35_000, retries: 1, retryDelayMs: 350 },
        )
        if (!recentlyAddedResponse.ok) return getCachedPlexLibraryItems(limit) ?? []
        const recentlyAddedPayload = (await recentlyAddedResponse.json()) as { items?: MediaItem[] }
        const fallbackItems = recentlyAddedPayload.items ?? []
        if (fallbackItems.length > 0) {
          setCachedPlexLibraryItems(limit, fallbackItems)
          return fallbackItems
        }
      } catch {
        // fall through to cache below
      }

      return getCachedPlexLibraryItems(limit) ?? []
    }

    async function fetchDirectLibraryFallback(): Promise<MediaItem[]> {
      if (isTauriRuntime()) {
        logPlexDebug('[plex-direct] skipped in tauri (ATS)', {
          protocol: window.location?.protocol,
          host: window.location?.hostname,
          ua: navigator.userAgent,
        })
        return fetchRecentlyAddedFallback()
      }
      try {
        const directItems = await fetchPlexLibraryItemsDirect(limit)
        if (directItems.length > 0) {
          setCachedPlexLibraryItems(limit, directItems)
          return directItems
        }
      } catch (error) {
        logPlexDebug('[plex-direct] browser direct failed', {
          message: error instanceof Error ? error.message : String(error),
        })
      }

      return fetchRecentlyAddedFallback()
    }

    try {
      const response = await fetchWithTimeoutAndRetry(
        '/api/plugins/plex/library',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            auth,
            settings,
            limit,
          }),
        },
        { timeoutMs: 120_000, retries: 0, retryDelayMs: 500 },
      )
      if (!response.ok) {
        const errBody = await response.text().catch(() => '')
        logPlexDebug('[plex-sync] server fetch failed', {
          status: response.status,
          body: errBody.slice(0, 500),
        })
        setPlexLibraryLastError(`API ${response.status}: ${errBody.slice(0, 240) || 'No response body'}`)
        return fetchDirectLibraryFallback()
      }
      const payload = (await response.json()) as {
        items?: MediaItem[]
        debug?: { diagnostics?: Array<{ tokenLabel: string; serverUri: string; libraryKey: string; libraryTitle: string; status?: number; error?: string; result?: string }> }
      }
      const items = payload.items ?? []
      if (items.length > 0) {
        setPlexLibraryLastError(null)
        setCachedPlexLibraryItems(limit, items)
        return items
      }

      if (payload.debug?.diagnostics?.length) {
        const sample = payload.debug.diagnostics.find((entry) => entry.error || entry.status) ?? payload.debug.diagnostics[0]
        if (sample) {
          const detail = sample.error ?? (sample.status ? `HTTP ${sample.status}` : 'No items')
          setPlexLibraryLastError(`${detail} (${sample.libraryTitle || sample.libraryKey})`)
        }
      } else {
        setPlexLibraryLastError('No items returned from Plex library.')
      }
      return fetchDirectLibraryFallback()
    } catch (err) {
      setPlexLibraryLastError(err instanceof Error ? err.message : 'Plex library fetch failed')
      return fetchDirectLibraryFallback()
    }
  })()

  plexLibraryInFlight.set(cooldownKey, request)
  try {
    const result = await request
    if (result.length > 0) {
      plexLibraryCooldownUntil.delete(cooldownKey)
    } else {
      plexLibraryCooldownUntil.set(cooldownKey, Date.now() + PLEX_LIBRARY_RETRY_COOLDOWN_MS)
    }
    return result
  } finally {
    if (plexLibraryInFlight.get(cooldownKey) === request) {
      plexLibraryInFlight.delete(cooldownKey)
    }
  }
}

export async function fetchPlexPlaylists(): Promise<PlexPlaylist[]> {
  const auth = getPlexAuth()
  const settings = ensureCanonicalPlexSettings()
  if (!auth || !settings.serverUri) return []

  const response = await fetch('/api/plugins/plex/playlists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth,
      settings,
    }),
  })
  if (!response.ok) return []
  const payload = (await response.json()) as { playlists?: PlexPlaylist[] }
  return payload.playlists ?? []
}

export async function fetchPlexPlaylistItems(playlistId: string, limit = 240): Promise<MediaItem[]> {
  const auth = getPlexAuth()
  const settings = ensureCanonicalPlexSettings()
  if (!auth || !settings.serverUri || !playlistId.trim()) return []

  const response = await fetch('/api/plugins/plex/playlists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth,
      settings,
      playlistId,
      limit,
    }),
  })
  if (!response.ok) return []
  const payload = (await response.json()) as { items?: MediaItem[] }
  return payload.items ?? []
}

export function savePlexSelection(server: PlexServerOption | null, libraries: PlexLibraryOption[]): void {
  setPlexSettings({
    serverId: server?.id ?? null,
    serverName: server?.name ?? null,
    serverUri: server?.uri ?? null,
    serverUris: server?.uris ?? (server?.uri ? [server.uri] : []),
    serverAccessToken: server?.accessToken ?? null,
    libraries,
  })
}

export function disconnectPlex(): void {
  clearPlexAuth()
  setPlexSettings({
    serverId: null,
    serverName: null,
    serverUri: null,
    serverUris: [],
    serverAccessToken: null,
    libraries: [],
  })
}
