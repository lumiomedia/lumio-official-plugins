'use client'

import type { LibraryBatch, LibraryEpisode, LibraryMedia, LibraryProvider, LibraryScanProgress, LibrarySourceRef, LibraryTitle } from '@/lib/plugin-sdk'
import { fetchEpisodes, fetchLibraryItems, imageUrl, markPlayed, reportPlaybackProgress, streamUrl, type JellyfinItem } from './jellyfin-api'
import { getJellyfinSettings, isJellyfinConnected, jellyfinSourceId, type JellyfinSettings } from './jellyfin-storage'

/**
 * Jellyfin som biblioteksleverantör: sidor om 200 titlar per valt bibliotek
 * översätts till kärnans LibraryTitle, serierna får sina avsnitt via
 * /Shows/{id}/Episodes, och spelvägen är serverns direktström. Kärnan äger
 * index, startsida, sök och spelare — här översätts bara Jellyfin.
 */
export const JELLYFIN_LIBRARY_PROVIDER_ID = 'jellyfin'
const PAGE_SIZE = 200
const EPISODE_CONCURRENCY = 3

export function jellyfinLibrarySourceRef(settings: JellyfinSettings): LibrarySourceRef | null {
  const id = jellyfinSourceId(settings)
  if (!id) return null
  return { id, name: settings.serverName ? `Jellyfin · ${settings.serverName}` : 'Jellyfin' }
}

const ticksToMs = (ticks: number | undefined | null) => (ticks ? Math.round(ticks / 10_000) : null)
const isoToUnix = (iso: string | undefined | null) => {
  if (!iso) return undefined
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : undefined
}

function mediaLabel(source: NonNullable<JellyfinItem['MediaSources']>[number]): string {
  const video = source.MediaStreams?.find((stream) => stream.Type === 'Video')
  const audio = source.MediaStreams?.find((stream) => stream.Type === 'Audio')
  const parts: string[] = []
  if (video?.Height) parts.push(video.Height >= 2000 ? '4K' : video.Height >= 1000 ? '1080p' : video.Height >= 700 ? '720p' : 'SD')
  if (video?.VideoRangeType && video.VideoRangeType !== 'SDR') parts.push(video.VideoRangeType)
  if (video?.Codec) parts.push(video.Codec.toUpperCase())
  if (audio?.Codec) parts.push(`${audio.Codec.toUpperCase()}${audio.Channels ? ` ${audio.Channels === 6 ? '5.1' : audio.Channels === 8 ? '7.1' : audio.Channels}` : ''}`)
  return parts.join(' · ') || source.Container?.toUpperCase() || 'Video'
}

function mapMedia(item: JellyfinItem, titleKey: string, episodeKey: string | null): LibraryMedia[] {
  return (item.MediaSources ?? []).map((source, index) => {
    const video = source.MediaStreams?.find((stream) => stream.Type === 'Video')
    return {
      key: `${titleKey}:m${episodeKey ? `${episodeKey.split(':e').pop()}-` : ''}${index}`,
      label: mediaLabel(source),
      resolution: video?.Height ?? null,
      codec: video?.Codec ?? null,
      audio: (source.MediaStreams ?? []).filter((stream) => stream.Type === 'Audio').map((stream) => stream.Language ?? stream.Codec ?? '').filter(Boolean),
      subtitles: (source.MediaStreams ?? []).filter((stream) => stream.Type === 'Subtitle').map((stream) => stream.Language ?? '').filter(Boolean),
      sizeBytes: source.Size ?? null,
      // playRef bär item + mediakälla; resolvePlayback bygger URL:en med token.
      playRef: `${item.Id}|${source.Id}`,
      episodeKey,
    }
  })
}

function mapTitle(settings: JellyfinSettings, sourceId: string, item: JellyfinItem, kind: 'movie' | 'series'): LibraryTitle {
  const key = `${sourceId}:${item.Id}`
  const tmdb = item.ProviderIds?.Tmdb ? Number.parseInt(item.ProviderIds.Tmdb, 10) : NaN
  return {
    key,
    sourceId,
    kind,
    tmdbId: Number.isFinite(tmdb) ? tmdb : null,
    imdbId: item.ProviderIds?.Imdb ?? null,
    title: item.Name,
    year: item.ProductionYear ?? null,
    genres: item.Genres ?? [],
    rating: item.CommunityRating ?? null,
    runtimeMin: item.RunTimeTicks ? Math.max(0, Math.round(item.RunTimeTicks / 10_000 / 60_000)) : null,
    posterUrl: imageUrl(settings, item.Id, 'Primary', 600),
    backdropUrl: (item.BackdropImageTags?.length ?? 0) > 0 ? imageUrl(settings, item.Id, 'Backdrop', 1080) : null,
    overview: item.Overview ?? null,
    addedAt: isoToUnix(item.DateCreated),
    viewOffsetMs: kind === 'movie' ? ticksToMs(item.UserData?.PlaybackPositionTicks) : null,
    lastViewedAt: kind === 'movie' ? isoToUnix(item.UserData?.LastPlayedDate) ?? null : null,
    watched: kind === 'movie' ? Boolean(item.UserData?.Played) : false,
    media: kind === 'movie' ? mapMedia(item, key, null) : [],
    episodes: [],
  } as LibraryTitle
}

function mapEpisode(settings: JellyfinSettings, titleKey: string, item: JellyfinItem): { episode: LibraryEpisode; media: LibraryMedia[] } | null {
  if (item.ParentIndexNumber == null || item.IndexNumber == null) return null
  const key = `${titleKey}:e${item.Id}`
  const episode: LibraryEpisode = {
    key,
    season: item.ParentIndexNumber,
    episode: item.IndexNumber,
    title: item.Name,
    airDate: item.PremiereDate ? item.PremiereDate.slice(0, 10) : null,
    runtimeMin: item.RunTimeTicks ? Math.max(0, Math.round(item.RunTimeTicks / 10_000 / 60_000)) : null,
    addedAt: isoToUnix(item.DateCreated),
    stillUrl: item.ImageTags?.Primary ? imageUrl(settings, item.Id, 'Primary', 400) : null,
    viewOffsetMs: ticksToMs(item.UserData?.PlaybackPositionTicks),
    lastViewedAt: isoToUnix(item.UserData?.LastPlayedDate) ?? null,
    watched: Boolean(item.UserData?.Played),
  }
  return { episode, media: mapMedia(item, titleKey, key) }
}

async function scan(
  source: LibrarySourceRef,
  minDateLastSaved: string | null,
  emit: (batch: LibraryBatch) => Promise<void>,
  progress: (state: LibraryScanProgress) => void,
  signal: AbortSignal,
): Promise<{ cursor: string }> {
  const settings = getJellyfinSettings()
  if (!isJellyfinConnected(settings)) throw new Error('Jellyfin is not connected')
  const startedAt = new Date().toISOString()
  let done = 0
  for (const library of settings.libraries) {
    let startIndex = 0
    for (;;) {
      if (signal.aborted) return { cursor: minDateLastSaved ?? startedAt }
      progress({ phase: 'listing', done, section: library.name })
      const page = await fetchLibraryItems(settings, library, startIndex, PAGE_SIZE, minDateLastSaved)
      const items = page.Items ?? []
      if (items.length === 0) break
      const kind = library.type === 'movies' ? 'movie' : 'series'
      const titles = items.map((item) => mapTitle(settings, source.id, item, kind))
      if (kind === 'series') {
        // Avsnitten hämtas per serie, några i taget — en stor serie är ett
        // anrop, och tre parallella håller servern lagom upptagen.
        for (let index = 0; index < titles.length; index += EPISODE_CONCURRENCY) {
          if (signal.aborted) return { cursor: minDateLastSaved ?? startedAt }
          await Promise.all(
            titles.slice(index, index + EPISODE_CONCURRENCY).map(async (title) => {
              const seriesId = title.key.split(':').pop() ?? ''
              const episodes = await fetchEpisodes(settings, seriesId).catch(() => [])
              for (const episodeItem of episodes) {
                const mapped = mapEpisode(settings, title.key, episodeItem)
                if (!mapped) continue
                title.episodes = [...(title.episodes ?? []), mapped.episode]
                title.media = [...(title.media ?? []), ...mapped.media]
              }
            }),
          )
        }
      }
      await emit({ upsert: titles })
      done += titles.length
      progress({ phase: 'titles', done, total: page.TotalRecordCount || undefined, section: library.name })
      startIndex += items.length
      if (startIndex >= (page.TotalRecordCount ?? startIndex)) break
    }
  }
  return { cursor: startedAt }
}

export const jellyfinLibraryProvider: LibraryProvider = {
  id: JELLYFIN_LIBRARY_PROVIDER_ID,
  label: { en: 'Jellyfin', sv: 'Jellyfin' },
  pluginId: 'com.lumio.jellyfin',
  scanAll: (source, emit, progress, signal) => scan(source, null, emit, progress, signal),
  scanDelta: (source, cursor, emit, progress, signal) => scan(source, cursor, emit, progress, signal),
  async resolvePlayback(_source, media) {
    const settings = getJellyfinSettings()
    const [itemId, mediaSourceId] = media.playRef.split('|')
    const url = itemId && mediaSourceId ? streamUrl(settings, itemId, mediaSourceId) : null
    return url ? { url } : null
  },
  async reportProgress(_source, ref, state) {
    const settings = getJellyfinSettings()
    if (!isJellyfinConnected(settings)) return
    const [itemId, mediaSourceId] = ref.media.playRef.split('|')
    if (!itemId || !mediaSourceId) return
    if (state.finished) await markPlayed(settings, itemId)
    else await reportPlaybackProgress(settings, itemId, mediaSourceId, state.positionMs)
  },
}
