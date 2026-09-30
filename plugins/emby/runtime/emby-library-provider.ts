'use client'

import type { LibraryBatch, LibraryEpisode, LibraryMedia, LibraryProvider, LibraryScanProgress, LibrarySourceRef, LibraryTitle } from '@/lib/plugin-sdk'
import { fetchChangedEpisodes, fetchEpisodes, fetchLibraryItems, fetchSeriesByIds, imageUrl, markPlayed, reportPlaybackProgress, streamUrl, type EmbyItem, type EmbyMediaStream } from './emby-api'
import { getEmbySettings, isEmbyConnected, embySourceId, type EmbySettings } from './emby-storage'

/**
 * Emby som biblioteksleverantör: sidor om 200 titlar per valt bibliotek
 * översätts till kärnans LibraryTitle, serierna får sina avsnitt via
 * /Shows/{id}/Episodes, och spelvägen är serverns direktström. Kärnan äger
 * index, startsida, sök och spelare — här översätts bara Emby.
 */
export const EMBY_LIBRARY_PROVIDER_ID = 'emby'
const PAGE_SIZE = 200
const EPISODE_CONCURRENCY = 3

export function embyLibrarySourceRef(settings: EmbySettings): LibrarySourceRef | null {
  const id = embySourceId(settings)
  if (!id) return null
  return { id, name: settings.serverName ? `Emby · ${settings.serverName}` : 'Emby' }
}

const ticksToMs = (ticks: number | undefined | null) => (ticks ? Math.round(ticks / 10_000) : null)
const isoToUnix = (iso: string | undefined | null) => {
  if (!iso) return undefined
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : undefined
}

/**
 * Embys HDR-uppgift: `ExtendedVideoType` bär formatet (Hdr10, DolbyVision …),
 * `VideoRange` bara SDR/HDR. Jellyfins `VideoRangeType` finns inte här.
 */
const EXTENDED_VIDEO_LABEL: Record<string, string> = { Hdr10: 'HDR10', Hdr10Plus: 'HDR10+', HyperLogGamma: 'HLG', DolbyVision: 'DV' }
function dynamicRange(video: EmbyMediaStream): string | null {
  const extended = video.ExtendedVideoType && video.ExtendedVideoType !== 'None' ? EXTENDED_VIDEO_LABEL[video.ExtendedVideoType] ?? video.ExtendedVideoType : null
  if (extended) return extended
  return video.VideoRange && video.VideoRange !== 'SDR' ? video.VideoRange : null
}

function mediaLabel(source: NonNullable<EmbyItem['MediaSources']>[number]): string {
  const video = source.MediaStreams?.find((stream) => stream.Type === 'Video')
  const audio = source.MediaStreams?.find((stream) => stream.Type === 'Audio')
  const parts: string[] = []
  if (video?.Height) parts.push(video.Height >= 2000 ? '4K' : video.Height >= 1000 ? '1080p' : video.Height >= 700 ? '720p' : 'SD')
  const range = video ? dynamicRange(video) : null
  if (range) parts.push(range)
  if (video?.Codec) parts.push(video.Codec.toUpperCase())
  if (audio?.Codec) parts.push(`${audio.Codec.toUpperCase()}${audio.Channels ? ` ${audio.Channels === 6 ? '5.1' : audio.Channels === 8 ? '7.1' : audio.Channels}` : ''}`)
  return parts.join(' · ') || source.Container?.toUpperCase() || 'Video'
}

function mapMedia(settings: EmbySettings, item: EmbyItem, titleKey: string, episodeKey: string | null): LibraryMedia[] {
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
      // playRef bär item + mediakälla + container; resolvePlayback bygger URL:en med token.
      playRef: `${item.Id}|${source.Id}|${source.Container ?? ''}`,
      episodeKey,
    }
  })
}

function mapTitle(settings: EmbySettings, sourceId: string, item: EmbyItem, kind: 'movie' | 'series'): LibraryTitle {
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
    media: kind === 'movie' ? mapMedia(settings, item, key, null) : [],
    episodes: [],
  } as LibraryTitle
}

function mapEpisode(settings: EmbySettings, titleKey: string, item: EmbyItem): { episode: LibraryEpisode; media: LibraryMedia[] } | null {
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
  return { episode, media: mapMedia(settings, item, titleKey, key) }
}

async function scan(
  source: LibrarySourceRef,
  minDateLastSaved: string | null,
  emit: (batch: LibraryBatch) => Promise<void>,
  progress: (state: LibraryScanProgress) => void,
  signal: AbortSignal,
): Promise<{ cursor: string }> {
  const settings = getEmbySettings()
  if (!isEmbyConnected(settings)) throw new Error('Emby is not connected')
  const startedAt = new Date().toISOString()
  let done = 0
  for (const library of settings.libraries) {
    // Serier som redan lästs i det här passet — deltans avsnittssvep hoppar över dem.
    const seenSeries = new Set<string>()
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
        if (await attachEpisodes(settings, titles, signal)) return { cursor: minDateLastSaved ?? startedAt }
        for (const title of titles) seenSeries.add(title.key.split(':').pop() ?? '')
      }
      await emit({ upsert: titles })
      done += titles.length
      progress({ phase: 'titles', done, total: page.TotalRecordCount || undefined, section: library.name })
      startIndex += items.length
      if (startIndex >= (page.TotalRecordCount ?? startIndex)) break
    }

    // Delta: serier vars AVSNITT ändrats men som själva inte gjort det (ett
    // nytt avsnitt sparar inte om serien). Läses om i sin helhet så indexet
    // får avsnittet — annars väntade det på dygnets fullskanning.
    if (minDateLastSaved && library.type === 'tvshows') {
      const changedSeriesIds = new Set<string>()
      let episodeIndex = 0
      for (;;) {
        if (signal.aborted) return { cursor: minDateLastSaved }
        const page = await fetchChangedEpisodes(settings, library, episodeIndex, PAGE_SIZE, minDateLastSaved)
        const episodes = page.Items ?? []
        if (episodes.length === 0) break
        for (const episode of episodes) {
          if (episode.SeriesId && !seenSeries.has(episode.SeriesId)) changedSeriesIds.add(episode.SeriesId)
        }
        episodeIndex += episodes.length
        if (episodeIndex >= (page.TotalRecordCount ?? episodeIndex)) break
      }
      const ids = [...changedSeriesIds]
      for (let index = 0; index < ids.length; index += PAGE_SIZE) {
        if (signal.aborted) return { cursor: minDateLastSaved }
        const seriesItems = await fetchSeriesByIds(settings, ids.slice(index, index + PAGE_SIZE))
        const titles = seriesItems.map((item) => mapTitle(settings, source.id, item, 'series'))
        if (await attachEpisodes(settings, titles, signal)) return { cursor: minDateLastSaved }
        if (titles.length > 0) await emit({ upsert: titles })
        done += titles.length
        progress({ phase: 'titles', done, section: library.name })
      }
    }
  }
  return { cursor: startedAt }
}

/**
 * Avsnitten hämtas per serie, några i taget — en stor serie är ett anrop, och
 * tre parallella håller servern lagom upptagen. Returnerar true om skanningen
 * avbröts under tiden.
 *
 * Ett misslyckat avsnittsanrop FÄLLER skanningen i stället för att tyst ge
 * serien noll avsnitt: en tom serie i indexet ser ut som "avsnittet finns
 * inte i biblioteket" på detaljsidan och rättas inte förrän serien själv
 * ändras. Schemaläggaren försöker igen om fem minuter.
 */
async function attachEpisodes(settings: EmbySettings, titles: LibraryTitle[], signal: AbortSignal): Promise<boolean> {
  for (let index = 0; index < titles.length; index += EPISODE_CONCURRENCY) {
    if (signal.aborted) return true
    await Promise.all(
      titles.slice(index, index + EPISODE_CONCURRENCY).map(async (title) => {
        const seriesId = title.key.split(':').pop() ?? ''
        const episodes = await fetchEpisodes(settings, seriesId)
        for (const episodeItem of episodes) {
          const mapped = mapEpisode(settings, title.key, episodeItem)
          if (!mapped) continue
          title.episodes = [...(title.episodes ?? []), mapped.episode]
          title.media = [...(title.media ?? []), ...mapped.media]
        }
      }),
    )
  }
  return false
}

/**
 * Ett PlaySessionId per pågående uppspelning (item + mediakälla), så alla
 * progressrapporter under samma visning hör till samma session hos Emby.
 * Släpps när uppspelningen rapporteras som färdig.
 */
const playSessions = new Map<string, string>()
function playSessionFor(itemId: string, mediaSourceId: string): string {
  const key = `${itemId}|${mediaSourceId}`
  let id = playSessions.get(key)
  if (!id) {
    id = `lumio-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
    playSessions.set(key, id)
  }
  return id
}

export const embyLibraryProvider: LibraryProvider = {
  id: EMBY_LIBRARY_PROVIDER_ID,
  label: { en: 'Emby', sv: 'Emby' },
  pluginId: 'com.lumio.emby',
  scanAll: (source, emit, progress, signal) => scan(source, null, emit, progress, signal),
  scanDelta: (source, cursor, emit, progress, signal) => scan(source, cursor, emit, progress, signal),
  async resolvePlayback(_source, media) {
    const settings = getEmbySettings()
    const [itemId, mediaSourceId, container] = media.playRef.split('|')
    const url = itemId && mediaSourceId ? streamUrl(settings, itemId, mediaSourceId, container || null) : null
    return url ? { url } : null
  },
  async reportProgress(_source, ref, state) {
    const settings = getEmbySettings()
    if (!isEmbyConnected(settings)) return
    const [itemId, mediaSourceId] = ref.media.playRef.split('|')
    if (!itemId || !mediaSourceId) return
    if (state.finished) {
      playSessions.delete(`${itemId}|${mediaSourceId}`)
      await markPlayed(settings, itemId)
    } else {
      await reportPlaybackProgress(settings, itemId, mediaSourceId, playSessionFor(itemId, mediaSourceId), state.positionMs)
    }
  },
}
