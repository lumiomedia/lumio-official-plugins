'use client'

import type { MediaItem } from '@/lib/plugin-sdk'
import { fetchPlexLibraryItems } from './plex-sync'
import { getCachedPlexLibraryItems, getPlexAuth, getPlexSettings } from './plex-storage'

type PlexMediaItem = MediaItem & {
  source?: string
  plexRatingKey?: string | null
  plexPartKey?: string | null
  plexServerUri?: string | null
}

function normalizeTitle(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function getTmdbId(item: MediaItem): string | null {
  return item.id.match(/^(?:movie|tv)-(\d+)$/)?.[1] ?? null
}

function getConfiguredPlexServerUri(item: PlexMediaItem): string | null {
  const settings = getPlexSettings()
  const configuredUris = [
    settings.serverUri,
    ...(settings.serverUris ?? []),
    item.plexServerUri ?? null,
  ].filter((value): value is string => typeof value === 'string' && value.length > 0)

  if (configuredUris.length === 0) return item.plexServerUri ?? null

  const uniqueUris = Array.from(new Set(configuredUris.map((uri) => uri.replace(/\/+$/, ''))))

  const hostRank = (uri: string): number => {
    try {
      const parsed = new URL(uri)
      const host = parsed.hostname.toLowerCase()
      const isPlexDirect = host.endsWith('.plex.direct')
      const isPrivateIpv4 =
        /^10\./.test(host)
        || /^192\.168\./.test(host)
        || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
      // Prefer direct LAN/private hosts over plex.direct for mpv reliability.
      if (isPrivateIpv4) return 3
      if (!isPlexDirect) return 2
      return 1
    } catch {
      return 0
    }
  }

  const ranked = [...uniqueUris].sort((left, right) => hostRank(right) - hostRank(left))
  return ranked[0] ?? null
}

function isPlexPlaybackReady(item: PlexMediaItem): boolean {
  const settings = getPlexSettings()
  const auth = getPlexAuth()
  const token = auth?.authToken ?? settings.serverAccessToken ?? null
  const serverUri = getConfiguredPlexServerUri(item)
  if (!token || !serverUri) return false
  if (item.type === 'movie') return Boolean(item.plexPartKey)
  return Boolean(item.plexRatingKey)
}

async function getPlexLibraryItemsForMatching(fetchIfMissing: boolean): Promise<MediaItem[]> {
  const cached = getCachedPlexLibraryItems(240) ?? []
  if (cached.length > 0 || !fetchIfMissing) return cached
  return fetchPlexLibraryItems(240)
}

export async function findBestPlexMatch(
  item: MediaItem,
  options?: { fetchIfMissing?: boolean },
): Promise<MediaItem | null> {
  const plexItem = item as PlexMediaItem
  if (plexItem.source === 'plex') return item
  const settings = getPlexSettings()
  const auth = getPlexAuth()
  if (!settings.serverUri || settings.libraries.length === 0 || !auth) return null

  const libraryItems = await getPlexLibraryItemsForMatching(options?.fetchIfMissing ?? true)
  if (libraryItems.length === 0) return null

  const mediaType = item.type
  const tmdbId = getTmdbId(item)
  const imdbId = item.imdbId?.trim() ?? ''
  const titleKey = normalizeTitle(item.title)
  const year = item.year

  const candidates = libraryItems.filter((entry) => entry.type === mediaType)
  if (tmdbId) {
    const exactTmdb = candidates.find((entry) => getTmdbId(entry) === tmdbId)
    if (exactTmdb) return exactTmdb
  }
  if (imdbId) {
    const exactImdb = candidates.find((entry) => (entry.imdbId?.trim() ?? '') === imdbId)
    if (exactImdb) return exactImdb
  }
  if (!titleKey) return null

  const exactTitleYear = candidates.find((entry) =>
    normalizeTitle(entry.title) === titleKey
    && (year == null || entry.year == null || entry.year === year),
  )
  if (exactTitleYear) return exactTitleYear

  return candidates.find((entry) => normalizeTitle(entry.title) === titleKey) ?? null
}

export function getPlexPlaybackUrl(item: MediaItem): string | null {
  const plexItem = item as PlexMediaItem
  if (plexItem.source !== 'plex' || plexItem.type !== 'movie' || !plexItem.plexPartKey) return null
  const settings = getPlexSettings()
  const auth = getPlexAuth()
  const token = auth?.authToken ?? settings.serverAccessToken ?? null
  const serverUri = getConfiguredPlexServerUri(plexItem)
  if (!token || !serverUri) return null
  const separator = plexItem.plexPartKey.includes('?') ? '&' : '?'
  return `${serverUri}${plexItem.plexPartKey}${separator}download=0&X-Plex-Token=${encodeURIComponent(token)}`
}

export function isPlexItemPlayable(item: MediaItem | null | undefined): boolean {
  const plexItem = item as PlexMediaItem | null | undefined
  return Boolean(plexItem && plexItem.source === 'plex' && isPlexPlaybackReady(plexItem))
}
