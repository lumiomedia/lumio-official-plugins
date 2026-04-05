'use client'

import type { YouTubeChannel, YouTubePlaylist, YouTubeSession, YouTubeVideo } from './youtube-types'
import {
  getYouTubeSettings,
  isYouTubeSessionValid,
  notifyYouTubePluginChanged,
  readYouTubeCache,
  readYouTubeCacheStale,
  writeYouTubeCache,
} from './youtube-storage'

const API_BASE = 'https://www.googleapis.com/youtube/v3'
const SUBSCRIPTIONS_CACHE_TTL_MS = 6 * 60 * 60 * 1000
const PLAYLISTS_CACHE_TTL_MS = 2 * 60 * 60 * 1000
const SEARCH_CACHE_TTL_MS = 12 * 60 * 60 * 1000
const VIDEO_LIST_CACHE_TTL_MS = 30 * 60 * 1000
const SHORTS_MAX_SECONDS = 180
const BACKGROUND_WARM_TTL_MS = 20 * 60 * 1000
const MAX_VIDEO_BATCH_RESULTS = 72
const FOLLOWING_FEED_RESULTS = 36

const inflightRequests = new Map<string, Promise<unknown>>()

interface YouTubeApiOptions {
  accessToken?: string | null
  apiKey?: string | null
  method?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
}

function normalizeYouTubeError(message?: string): string {
  const text = (message ?? 'YouTube request failed.')
    .replace(/<a [^>]+>/gi, '')
    .replace(/<\/a>/gi, '')
    .trim()

  if (/quota/i.test(text) || /quotaexceeded/i.test(text) || /exceeded your quota/i.test(text)) {
    return 'YouTube API-kvoten är slut för tillfället. Prova igen senare eller minska antalet YouTube-laddningar.'
  }

  return text
}

function getBestThumbnail(thumbnails: Record<string, { url?: string }> | undefined): string | null {
  return thumbnails?.maxres?.url
    ?? thumbnails?.standard?.url
    ?? thumbnails?.high?.url
    ?? thumbnails?.medium?.url
    ?? thumbnails?.default?.url
    ?? null
}

function parseIsoDurationSeconds(value?: string): number | null {
  if (!value) return null
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (!match) return null
  const hours = Number(match[1] ?? 0)
  const minutes = Number(match[2] ?? 0)
  const seconds = Number(match[3] ?? 0)
  return hours * 3600 + minutes * 60 + seconds
}

function inferShortFromMetadata(video: YouTubeVideo): boolean {
  const haystack = `${video.title} ${video.description ?? ''}`.toLowerCase()
  return haystack.includes('#shorts') || haystack.includes(' shorts')
}

function dedupeRequest<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const existing = inflightRequests.get(key) as Promise<T> | undefined
  if (existing) return existing

  const request = factory().finally(() => {
    inflightRequests.delete(key)
  })
  inflightRequests.set(key, request)
  return request
}

async function youtubeApi<T>(
  path: string,
  params: Record<string, string | number | undefined>,
  options: YouTubeApiOptions = {},
): Promise<T> {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  })

  if (!options.accessToken) {
    const settings = getYouTubeSettings()
    const apiKey = options.apiKey ?? settings.apiKey
    if (apiKey) query.set('key', apiKey)
  }

  const response = await fetch(`${API_BASE}/${path}?${query.toString()}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const payload = (await response.json()) as T & { error?: { message?: string } }
  if (!response.ok) {
    throw new Error(normalizeYouTubeError(payload.error?.message))
  }
  return payload
}

function getSessionAccessToken(session?: YouTubeSession | null): string {
  const resolved = session ?? null
  if (!isYouTubeSessionValid(resolved)) {
    throw new Error('YouTube session expired. Reconnect in Settings.')
  }
  return resolved!.accessToken
}

async function enrichVideosWithDetails(session: YouTubeSession, videos: YouTubeVideo[]): Promise<YouTubeVideo[]> {
  if (videos.length === 0) return videos

  const ids = [...new Set(videos.map((video) => video.id).filter(Boolean))]
  const details = new Map<string, { durationSeconds: number | null; isShort: boolean | null }>()

  for (let index = 0; index < ids.length; index += 50) {
    const batch = ids.slice(index, index + 50)
    const data = await youtubeApi<{
      items?: Array<{
        id?: string
        contentDetails?: { duration?: string }
      }>
    }>('videos', {
      part: 'contentDetails',
      id: batch.join(','),
      maxResults: batch.length,
    }, {
      accessToken: getSessionAccessToken(session),
    })

    for (const item of data.items ?? []) {
      if (!item.id) continue
      const durationSeconds = parseIsoDurationSeconds(item.contentDetails?.duration)
      details.set(item.id, {
        durationSeconds,
        isShort: durationSeconds != null ? durationSeconds <= SHORTS_MAX_SECONDS : null,
      })
    }
  }

  return videos.map((video) => {
    const detail = details.get(video.id)
    if (detail) {
      return { ...video, durationSeconds: detail.durationSeconds, isShort: detail.isShort ?? inferShortFromMetadata(video) }
    }
    return {
      ...video,
      isShort: inferShortFromMetadata(video),
    }
  })
}

async function fetchUploadsPlaylistIds(
  session: YouTubeSession,
  channelIds: string[],
): Promise<Map<string, string>> {
  const ids = [...new Set(channelIds.filter(Boolean))]
  const result = new Map<string, string>()

  for (let index = 0; index < ids.length; index += 50) {
    const batch = ids.slice(index, index + 50)
    const data = await youtubeApi<{
      items?: Array<{
        id?: string
        contentDetails?: { relatedPlaylists?: { uploads?: string } }
      }>
    }>('channels', {
      part: 'contentDetails',
      id: batch.join(','),
      maxResults: batch.length,
    }, {
      accessToken: getSessionAccessToken(session),
    })

    for (const item of data.items ?? []) {
      if (!item.id || !item.contentDetails?.relatedPlaylists?.uploads) continue
      result.set(item.id, item.contentDetails.relatedPlaylists.uploads)
    }
  }

  return result
}

export async function fetchMyYouTubeChannel(accessToken: string): Promise<YouTubeSession> {
  const data = await youtubeApi<{
    items?: Array<{
      id?: string
      snippet?: { title?: string; thumbnails?: Record<string, { url?: string }> }
      contentDetails?: { relatedPlaylists?: { uploads?: string; likes?: string; watchLater?: string } }
    }>
  }>('channels', {
    part: 'snippet,contentDetails',
    mine: 'true',
    maxResults: 1,
  }, { accessToken })

  const item = data.items?.[0]
  if (!item?.id || !item.snippet?.title) {
    throw new Error('Could not load your YouTube channel.')
  }

  return {
    accessToken,
    expiresAt: Date.now() + 55 * 60 * 1000,
    scope: '',
    channelId: item.id,
    channelTitle: item.snippet.title,
    channelThumbnailUrl: getBestThumbnail(item.snippet.thumbnails),
    uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads ?? null,
    likesPlaylistId: item.contentDetails?.relatedPlaylists?.likes ?? null,
    watchLaterPlaylistId: item.contentDetails?.relatedPlaylists?.watchLater ?? null,
  }
}

export async function fetchYouTubeSubscriptions(session: YouTubeSession): Promise<YouTubeChannel[]> {
  const cacheKey = `subscriptions:${session.channelId}`
  const cached = readYouTubeCache<YouTubeChannel[]>(cacheKey, SUBSCRIPTIONS_CACHE_TTL_MS)
  if (cached) return cached
  const stale = readYouTubeCacheStale<YouTubeChannel[]>(cacheKey)

  try {
    let pageToken: string | undefined
    const items: YouTubeChannel[] = []
    do {
      const data = await youtubeApi<{
        nextPageToken?: string
        items?: Array<{
          id?: string
          snippet?: {
            resourceId?: { channelId?: string }
            title?: string
            description?: string
            thumbnails?: Record<string, { url?: string }>
          }
        }>
      }>('subscriptions', {
        part: 'snippet',
        mine: 'true',
        maxResults: 50,
        pageToken,
      }, { accessToken: getSessionAccessToken(session) })

      for (const item of data.items ?? []) {
        const channelId = item.snippet?.resourceId?.channelId
        const title = item.snippet?.title
        if (!channelId || !title) continue
        items.push({
          id: channelId,
          title,
          description: item.snippet?.description,
          thumbnailUrl: getBestThumbnail(item.snippet?.thumbnails),
          subscriptionId: item.id ?? null,
        })
      }
      pageToken = data.nextPageToken
    } while (pageToken)

    writeYouTubeCache(cacheKey, items)
    return items
  } catch (error) {
    if (stale) return stale
    throw error
  }
}

export async function searchYouTubeChannels(
  session: YouTubeSession,
  query: string,
  existingSubscriptions: YouTubeChannel[] = [],
  limit = 12,
): Promise<YouTubeChannel[]> {
  const normalizedQuery = query.trim()
  if (!normalizedQuery) return []
  const cacheKey = `channel-search:${session.channelId}:${normalizedQuery.toLowerCase()}:${limit}`
  const cached = readYouTubeCache<YouTubeChannel[]>(cacheKey, SEARCH_CACHE_TTL_MS)
  if (cached) return cached
  const stale = readYouTubeCacheStale<YouTubeChannel[]>(cacheKey)

  const subscriptionMap = new Map(existingSubscriptions.map((channel) => [channel.id, channel]))
  try {
    const results = await dedupeRequest(cacheKey, async () => {
      const data = await youtubeApi<{
        items?: Array<{
          id?: { channelId?: string }
          snippet?: {
            title?: string
            description?: string
            thumbnails?: Record<string, { url?: string }>
          }
        }>
      }>('search', {
        part: 'snippet',
        type: 'channel',
        q: normalizedQuery,
        maxResults: Math.max(1, Math.min(limit, 25)),
      }, {
        accessToken: getSessionAccessToken(session),
      })

      const items = (data.items ?? []).flatMap((item) => {
        const channelId = item.id?.channelId
        const title = item.snippet?.title
        if (!channelId || !title) return []
        const existing = subscriptionMap.get(channelId)
        return [{
          id: channelId,
          title,
          description: item.snippet?.description,
          thumbnailUrl: getBestThumbnail(item.snippet?.thumbnails),
          subscriptionId: existing?.subscriptionId ?? null,
          subscriberCount: existing?.subscriberCount ?? null,
          videoCount: existing?.videoCount ?? null,
        }]
      })

      writeYouTubeCache(cacheKey, items)
      return items
    })

    return results
  } catch (error) {
    if (stale) return stale
    throw error
  }
}

export async function fetchYouTubePlaylists(session: YouTubeSession): Promise<YouTubePlaylist[]> {
  const cacheKey = `playlists:${session.channelId}`
  const cached = readYouTubeCache<YouTubePlaylist[]>(cacheKey, PLAYLISTS_CACHE_TTL_MS)
  if (cached) return cached
  const stale = readYouTubeCacheStale<YouTubePlaylist[]>(cacheKey)

  try {
    let pageToken: string | undefined
    const items: YouTubePlaylist[] = []
    do {
      const data = await youtubeApi<{
        nextPageToken?: string
        items?: Array<{
          id?: string
          snippet?: {
            title?: string
            description?: string
            channelTitle?: string
            thumbnails?: Record<string, { url?: string }>
          }
          contentDetails?: { itemCount?: number }
        }>
      }>('playlists', {
        part: 'snippet,contentDetails',
        mine: 'true',
        maxResults: 50,
        pageToken,
      }, { accessToken: getSessionAccessToken(session) })

      for (const item of data.items ?? []) {
        if (!item.id || !item.snippet?.title) continue
        items.push({
          id: item.id,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnailUrl: getBestThumbnail(item.snippet.thumbnails),
          itemCount: item.contentDetails?.itemCount ?? null,
          channelTitle: item.snippet.channelTitle ?? null,
        })
      }
      pageToken = data.nextPageToken
    } while (pageToken)

    writeYouTubeCache(cacheKey, items)
    return items
  } catch (error) {
    if (stale) return stale
    throw error
  }
}

export async function fetchYouTubePlaylistVideos(
  session: YouTubeSession,
  playlistId: string,
  maxResults = 24,
): Promise<YouTubeVideo[]> {
  const cacheKey = `playlist:${session.channelId}:${playlistId}`
  const cached = readYouTubeCache<YouTubeVideo[]>(cacheKey, VIDEO_LIST_CACHE_TTL_MS)
  if (cached && cached.length >= maxResults) return cached.slice(0, maxResults)
  const stale = readYouTubeCacheStale<YouTubeVideo[]>(cacheKey)

  try {
    const enriched = await dedupeRequest(cacheKey, async () => {
      let pageToken: string | undefined
      const items: YouTubeVideo[] = []

      while (items.length < maxResults && items.length < MAX_VIDEO_BATCH_RESULTS) {
        const remaining = Math.min(50, Math.max(maxResults, MAX_VIDEO_BATCH_RESULTS) - items.length)
        const data = await youtubeApi<{
          nextPageToken?: string
          items?: Array<{
            id?: string
            snippet?: {
              title?: string
              description?: string
              channelTitle?: string
              channelId?: string
              publishedAt?: string
              resourceId?: { videoId?: string }
              thumbnails?: Record<string, { url?: string }>
            }
          }>
        }>('playlistItems', {
          part: 'snippet',
          playlistId,
          maxResults: Math.min(50, Math.max(maxResults, MAX_VIDEO_BATCH_RESULTS) - items.length),
          pageToken,
        }, { accessToken: getSessionAccessToken(session) })

        items.push(
          ...(data.items ?? []).flatMap((item) => {
            const videoId = item.snippet?.resourceId?.videoId
            const title = item.snippet?.title
            if (!videoId || !title || title === 'Deleted video' || title === 'Private video') return []
            return [{
              id: videoId,
              title,
              description: item.snippet?.description,
              channelId: item.snippet?.channelId ?? null,
              channelTitle: item.snippet?.channelTitle ?? null,
              publishedAt: item.snippet?.publishedAt ?? null,
              thumbnailUrl: getBestThumbnail(item.snippet?.thumbnails),
              playlistItemId: item.id ?? null,
            }]
          }),
        )

        if (!data.nextPageToken) break
        pageToken = data.nextPageToken
      }

      const next = await enrichVideosWithDetails(session, items)
      writeYouTubeCache(cacheKey, next)
      return next
    })
    return enriched.slice(0, maxResults)
  } catch (error) {
    if (stale) return stale.slice(0, maxResults)
    throw error
  }
}

export async function fetchYouTubeChannelVideos(
  session: YouTubeSession,
  channelId: string,
  maxResults = 24,
): Promise<YouTubeVideo[]> {
  const cacheKey = `channel-videos:${session.channelId}:${channelId}`
  const cached = readYouTubeCache<YouTubeVideo[]>(cacheKey, VIDEO_LIST_CACHE_TTL_MS)
  if (cached && cached.length >= maxResults) return cached.slice(0, maxResults)
  const stale = readYouTubeCacheStale<YouTubeVideo[]>(cacheKey)

  try {
    const enriched = await dedupeRequest(cacheKey, async () => {
      const uploadsByChannel = await fetchUploadsPlaylistIds(session, [channelId])
      const uploadsPlaylistId = uploadsByChannel.get(channelId)
      if (!uploadsPlaylistId) {
        throw new Error('Could not load this channel playlist.')
      }

      let pageToken: string | undefined
      const items: YouTubeVideo[] = []

      while (items.length < maxResults && items.length < MAX_VIDEO_BATCH_RESULTS) {
        const data = await youtubeApi<{
          nextPageToken?: string
          items?: Array<{
            id?: string
            snippet?: {
              title?: string
              description?: string
              channelTitle?: string
              channelId?: string
              publishedAt?: string
              resourceId?: { videoId?: string }
              thumbnails?: Record<string, { url?: string }>
            }
          }>
        }>('playlistItems', {
          part: 'snippet',
          playlistId: uploadsPlaylistId,
          maxResults: Math.min(50, Math.max(maxResults, MAX_VIDEO_BATCH_RESULTS) - items.length),
          pageToken,
        }, {
          accessToken: getSessionAccessToken(session),
        })

        items.push(
          ...(data.items ?? []).flatMap((item) => {
            const videoId = item.snippet?.resourceId?.videoId
            const title = item.snippet?.title
            if (!videoId || !title || title === 'Deleted video' || title === 'Private video') return []
            return [{
              id: videoId,
              title,
              description: item.snippet?.description,
              channelId: item.snippet?.channelId ?? channelId,
              channelTitle: item.snippet?.channelTitle ?? null,
              publishedAt: item.snippet?.publishedAt ?? null,
              thumbnailUrl: getBestThumbnail(item.snippet?.thumbnails),
              playlistItemId: null,
            }]
          }),
        )

        if (!data.nextPageToken) break
        pageToken = data.nextPageToken
      }

      const next = await enrichVideosWithDetails(session, items)
      writeYouTubeCache(cacheKey, next)
      return next
    })
    return enriched.slice(0, maxResults)
  } catch (error) {
    if (stale) return stale.slice(0, maxResults)
    throw error
  }
}

export async function fetchYouTubeLatestFromSubscriptions(
  session: YouTubeSession,
  options: {
    channelLimit?: number
    maxResultsPerChannel?: number
    totalLimit?: number
  } = {},
): Promise<YouTubeVideo[]> {
  const totalLimit = Math.min(MAX_VIDEO_BATCH_RESULTS, options.totalLimit ?? FOLLOWING_FEED_RESULTS)
  const cacheKey = `following-latest:${session.channelId}`
  const cached = readYouTubeCache<YouTubeVideo[]>(cacheKey, VIDEO_LIST_CACHE_TTL_MS)
  if (cached && cached.length >= totalLimit) return cached.slice(0, totalLimit)
  const stale = readYouTubeCacheStale<YouTubeVideo[]>(cacheKey)

  try {
    const videos = await dedupeRequest(cacheKey, async () => {
      const subscriptions = await fetchYouTubeSubscriptions(session)
      const channelTarget = Math.min(
        subscriptions.length,
        Math.max(options.channelLimit ?? 12, Math.ceil(totalLimit / Math.max(options.maxResultsPerChannel ?? 6, 1))),
      )
      const maxResultsPerChannel = Math.max(options.maxResultsPerChannel ?? 6, Math.ceil(totalLimit / Math.max(channelTarget, 1)))
      const selectedChannels = subscriptions.slice(0, channelTarget)
      const uploadsByChannel = await fetchUploadsPlaylistIds(
        session,
        selectedChannels.map((channel) => channel.id),
      )

      const deduped = new Map<string, YouTubeVideo>()
      for (const channel of selectedChannels) {
        try {
          const uploadsPlaylistId = uploadsByChannel.get(channel.id)
          if (!uploadsPlaylistId) continue
          const next = await fetchYouTubePlaylistVideos(session, uploadsPlaylistId, maxResultsPerChannel)
          for (const video of next) {
            if (!deduped.has(video.id)) deduped.set(video.id, video)
          }
          if (deduped.size >= MAX_VIDEO_BATCH_RESULTS) break
        } catch {
          continue
        }
      }

      const items = [...deduped.values()]
        .sort((a, b) => {
          const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0
          const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0
          return bTime - aTime
        })
        .slice(0, MAX_VIDEO_BATCH_RESULTS)

      writeYouTubeCache(cacheKey, items)
      return items
    })

    return videos.slice(0, totalLimit)
  } catch (error) {
    if (stale) return stale.slice(0, totalLimit)
    throw error
  }
}

export async function warmYouTubeBackgroundCaches(session: YouTubeSession): Promise<void> {
  const warmKey = `background-warm:${session.channelId}`
  const warmedRecently = readYouTubeCache<boolean>(warmKey, BACKGROUND_WARM_TTL_MS)
  if (warmedRecently) return

  await fetchYouTubeSubscriptions(session)
  await fetchYouTubeLatestFromSubscriptions(session, {
    totalLimit: 54,
    channelLimit: 14,
    maxResultsPerChannel: 6,
  })
  writeYouTubeCache(warmKey, true)
  notifyYouTubePluginChanged()
}

export async function subscribeToYouTubeChannel(session: YouTubeSession, channelId: string): Promise<void> {
  await youtubeApi('subscriptions', {
    part: 'snippet',
  }, {
    accessToken: getSessionAccessToken(session),
    method: 'POST',
    body: {
      snippet: {
        resourceId: {
          kind: 'youtube#channel',
          channelId,
        },
      },
    },
  })
}

export async function unsubscribeFromYouTubeChannel(session: YouTubeSession, subscriptionId: string): Promise<void> {
  await youtubeApi('subscriptions', {
    id: subscriptionId,
  }, {
    accessToken: getSessionAccessToken(session),
    method: 'DELETE',
  })
}
