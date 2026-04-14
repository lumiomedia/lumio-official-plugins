'use client'

import { useEffect, useRef, useState } from 'react'
import type { EpisodeSidebarProps } from '@/lib/plugin-sdk'
import {
  getScopedStorageItem,
  getWatchedForSeries,
  onWatchedEpisodesChanged,
  setWatched,
  getAutoPlayNextEpisode,
  getNextEpPopupSeconds,
  getNextEpPreloadLeadSeconds,
  VideoPlayerModal,
  NextEpisodeCard,
} from '@/lib/plugin-sdk'
import type { MediaItem } from '@/lib/plugin-sdk'

interface PlexEpisode {
  ratingKey: string
  title: string
  index: number
  seasonIndex: number
  thumb: string | null
  duration: number | null
  summary: string | null
  partKey: string | null
  filename: string | null
}

interface PlexSeason {
  ratingKey: string
  title: string
  index: number
  episodeCount: number
}

function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / 60000)
  if (totalMin < 60) return `${totalMin} min`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function epKey(season: number, episode: number) {
  return `${season}:${episode}`
}

function toEpisodeSet(serialized: Set<string>): Set<string> {
  return new Set(
    Array.from(serialized)
      .map((key) => {
        const match = key.match(/-S(\d+)E(\d+)$/)
        return match ? epKey(Number(match[1]), Number(match[2])) : null
      })
      .filter((value): value is string => Boolean(value)),
  )
}

function readPlexConnection(): { serverUri: string; token: string } | null {
  try {
    const settingsRaw = getScopedStorageItem('plex_settings')
    const authRaw = getScopedStorageItem('plex_auth')
    if (!settingsRaw || !authRaw) return null
    const settings = JSON.parse(settingsRaw) as { serverUri?: string; serverAccessToken?: string }
    const auth = JSON.parse(authRaw) as { authToken?: string }
    const serverUri = settings.serverUri
    const token = settings.serverAccessToken ?? auth.authToken
    if (!serverUri || !token) return null
    return { serverUri, token }
  } catch {
    return null
  }
}

export function PlexEpisodeSidebar({
  item,
  resolvedTmdbId,
  initialSeasonNumber,
  initialEpisodeNumber,
  playRequestSeasonNumber,
  playRequestEpisodeNumber,
  initialTime = null,
  playRequestToken,
  onClose,
  onAutoPlayFallback,
}: EpisodeSidebarProps) {
  const [seasons, setSeasons] = useState<PlexSeason[]>([])
  const [selectedSeason, setSelectedSeason] = useState<PlexSeason | null>(null)
  const [episodes, setEpisodes] = useState<PlexEpisode[]>([])
  const [loadingSeasons, setLoadingSeasons] = useState(true)
  const [loadingEpisodes, setLoadingEpisodes] = useState(false)
  const [playingEpisode, setPlayingEpisode] = useState<PlexEpisode | null>(null)
  const [playerInitialTime, setPlayerInitialTime] = useState<number | undefined>(undefined)
  const [watchedSet, setWatchedSet] = useState<Set<string>>(new Set())
  const [nextEpCard, setNextEpCard] = useState<{
    season: number
    episode: number
    episodeTitle: string
    stillUrl: string | null
  } | null>(null)
  const [nextEpUrlReady, setNextEpUrlReady] = useState(false)
  const [, setNextEpPreloadState] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle')
  const [playerHideStartSplash, setPlayerHideStartSplash] = useState(false)
  const [playerAutoFullscreen, setPlayerAutoFullscreen] = useState(false)
  const playingEpisodeRef = useRef<PlexEpisode | null>(null)
  const nextEpisodeRef = useRef<PlexEpisode | null>(null)
  const nextEpPreloadStarted = useRef(false)
  const nextEpCardShown = useRef(false)
  const nextEpArmedRef = useRef(false)
  const nextEpPreloadRunRef = useRef(0)
  const sawEarlyPlaybackForEpisodeRef = useRef(false)
  const preferredStreamUrlByRatingKeyRef = useRef<Map<string, string>>(new Map())
  const watchedMarkedInSessionRef = useRef(false)
  const seasonEpisodesCacheRef = useRef<Map<string, PlexEpisode[]>>(new Map())
  const playbackStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const playbackStartedRef = useRef(false)
  const lastHandledPlayRequestRef = useRef<number | null>(null)
  const plexConnectionRef = useRef(readPlexConnection())

  const plexItem = item as MediaItem & { plexRatingKey?: string; plexPartKey?: string; plexFilename?: string; plexServerUri?: string }
  const ratingKey = plexItem.plexRatingKey
  const conn = plexConnectionRef.current

  useEffect(() => {
    if (!resolvedTmdbId) return
    const syncWatched = () => setWatchedSet(toEpisodeSet(getWatchedForSeries(resolvedTmdbId)))
    syncWatched()
    return onWatchedEpisodesChanged(syncWatched)
  }, [resolvedTmdbId])

  useEffect(() => {
    if (!ratingKey || !conn) return
    setLoadingSeasons(true)
    const params = new URLSearchParams({ ratingKey, serverUri: conn.serverUri, token: conn.token })
    void fetch(`/api/plugins/plex/episodes?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load Plex seasons')
        return r.json()
      })
      .then((data: { seasons?: PlexSeason[] }) => {
        const list = data.seasons ?? []
        setSeasons(list)
        const initial = initialSeasonNumber
          ? list.find((s) => s.index === initialSeasonNumber) ?? list[0]
          : list[0]
        if (initial) setSelectedSeason(initial)
      })
      .catch(() => {
        setSeasons([])
        setSelectedSeason(null)
      })
      .finally(() => setLoadingSeasons(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratingKey, conn?.serverUri, conn?.token])

  useEffect(() => {
    if (!selectedSeason || !conn) return
    setLoadingEpisodes(true)
    setEpisodes([])
    const params = new URLSearchParams({ ratingKey: ratingKey ?? '', serverUri: conn.serverUri, token: conn.token, seasonKey: selectedSeason.ratingKey })
    void fetch(`/api/plugins/plex/episodes?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load Plex episodes')
        return r.json()
      })
      .then((data: { episodes?: PlexEpisode[] }) => {
        const nextEpisodes = data.episodes ?? []
        seasonEpisodesCacheRef.current.set(selectedSeason.ratingKey, nextEpisodes)
        setEpisodes(nextEpisodes)
      })
      .catch(() => {
        setEpisodes([])
      })
      .finally(() => setLoadingEpisodes(false))
  }, [selectedSeason, ratingKey, conn])

  useEffect(() => {
    if (!playRequestToken || lastHandledPlayRequestRef.current === playRequestToken) return
    if (!playRequestSeasonNumber || !playRequestEpisodeNumber) return
    if (loadingSeasons) return
    if (!selectedSeason || selectedSeason.index !== playRequestSeasonNumber) {
      const targetSeason = seasons.find((season) => season.index === playRequestSeasonNumber) ?? null
      if (targetSeason) {
        setSelectedSeason(targetSeason)
      } else if (seasons.length > 0) {
        lastHandledPlayRequestRef.current = playRequestToken
        onAutoPlayFallback?.()
      }
    }
  }, [loadingSeasons, onAutoPlayFallback, playRequestEpisodeNumber, playRequestSeasonNumber, playRequestToken, seasons, selectedSeason])

  useEffect(() => {
    if (!selectedSeason || !playRequestToken) return
    if (lastHandledPlayRequestRef.current === playRequestToken) return
    if (!playRequestSeasonNumber || !playRequestEpisodeNumber) return
    if (selectedSeason.index !== playRequestSeasonNumber) return
    if (loadingEpisodes) return
    const match = episodes.find((episode) => (
      episode.seasonIndex === playRequestSeasonNumber && episode.index === playRequestEpisodeNumber
    ))
    if (match) {
      lastHandledPlayRequestRef.current = playRequestToken
      playEpisode(match, { initialTime })
    } else if (episodes.length > 0) {
      lastHandledPlayRequestRef.current = playRequestToken
      onAutoPlayFallback?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodes, initialTime, loadingEpisodes, onAutoPlayFallback, playRequestEpisodeNumber, playRequestSeasonNumber, playRequestToken, selectedSeason])

  useEffect(() => {
    return () => {
      if (playbackStartTimerRef.current) clearTimeout(playbackStartTimerRef.current)
    }
  }, [])

  function resetNextEpisodeState() {
    nextEpPreloadRunRef.current += 1
    setNextEpCard(null)
    setNextEpUrlReady(false)
    setNextEpPreloadState('idle')
    nextEpisodeRef.current = null
    nextEpPreloadStarted.current = false
    nextEpCardShown.current = false
    nextEpArmedRef.current = false
  }

  function clearPlaybackStartGuard() {
    if (playbackStartTimerRef.current) {
      clearTimeout(playbackStartTimerRef.current)
      playbackStartTimerRef.current = null
    }
  }

  function armPlaybackStartGuard(ep: PlexEpisode) {
    playbackStartedRef.current = false
    clearPlaybackStartGuard()
    playbackStartTimerRef.current = setTimeout(() => {
      if (playbackStartedRef.current) return
      if (playingEpisodeRef.current?.ratingKey !== ep.ratingKey) return
      playingEpisodeRef.current = null
      resetNextEpisodeState()
      setPlayerHideStartSplash(false)
      setPlayerAutoFullscreen(false)
      setPlayingEpisode(null)
      if (selectedSeason?.index !== ep.seasonIndex) {
        const fallbackSeason = seasons.find((season) => season.index === ep.seasonIndex) ?? null
        if (fallbackSeason) setSelectedSeason(fallbackSeason)
      }
    }, 12000)
  }

  function buildStreamUrl(ep: PlexEpisode): string | null {
    if (!conn) return null
    const preferred = preferredStreamUrlByRatingKeyRef.current.get(ep.ratingKey)
    if (preferred) return preferred
    if (!ep.partKey) return null
    const separator = ep.partKey.includes('?') ? '&' : '?'
    return `${conn.serverUri}${ep.partKey}${separator}download=0&X-Plex-Token=${encodeURIComponent(conn.token)}`
  }

  function buildStreamUrlVariants(ep: PlexEpisode): string[] {
    if (!conn || !ep.partKey) return []
    const separator = ep.partKey.includes('?') ? '&' : '?'
    const base = `${conn.serverUri}${ep.partKey}${separator}X-Plex-Token=${encodeURIComponent(conn.token)}`
    return Array.from(new Set([
      `${base}&download=0`,
      base,
      `${base}&download=1`,
    ]))
  }

  function markWatched(ep: PlexEpisode, watched: boolean) {
    if (!resolvedTmdbId) return
    setWatched(resolvedTmdbId, ep.seasonIndex, ep.index, watched, { imdbId: item.imdbId ?? null })
    setWatchedSet((prev) => {
      const next = new Set(prev)
      if (watched) next.add(epKey(ep.seasonIndex, ep.index))
      else next.delete(epKey(ep.seasonIndex, ep.index))
      return next
    })
  }

  function handlePlayerClose() {
    const ep = playingEpisodeRef.current
    if (ep && !watchedMarkedInSessionRef.current) markWatched(ep, true)
    playingEpisodeRef.current = null
    clearPlaybackStartGuard()
    resetNextEpisodeState()
    watchedMarkedInSessionRef.current = false
    setPlayerHideStartSplash(false)
    setPlayerAutoFullscreen(false)
    setPlayerInitialTime(undefined)
    setPlayingEpisode(null)
  }

  function playEpisode(ep: PlexEpisode, options?: { initialTime?: number | null }) {
    playingEpisodeRef.current = ep
    sawEarlyPlaybackForEpisodeRef.current = false
    armPlaybackStartGuard(ep)
    resetNextEpisodeState()
    watchedMarkedInSessionRef.current = false
    setPlayerHideStartSplash(false)
    setPlayerAutoFullscreen(false)
    setPlayerInitialTime(options?.initialTime ?? undefined)
    setPlayingEpisode(ep)
  }

  async function preloadNextEpisode() {
    if (nextEpPreloadStarted.current || !conn) return
    nextEpPreloadStarted.current = true
    const runId = nextEpPreloadRunRef.current

    const currentEpisode = playingEpisodeRef.current
    if (!currentEpisode || !selectedSeason) return

    let candidate = episodes.find((episode) => (
      episode.seasonIndex === currentEpisode.seasonIndex && episode.index === currentEpisode.index + 1
    )) ?? null

    if (!candidate) {
      const nextSeason = seasons.find((season) => season.index === currentEpisode.seasonIndex + 1)
      if (!nextSeason) return
      const cachedEpisodes = seasonEpisodesCacheRef.current.get(nextSeason.ratingKey)
      if (cachedEpisodes) {
        candidate = cachedEpisodes[0] ?? null
      } else {
        try {
          const params = new URLSearchParams({
            ratingKey: ratingKey ?? '',
            serverUri: conn.serverUri,
            token: conn.token,
            seasonKey: nextSeason.ratingKey,
          })
          const response = await fetch(`/api/plugins/plex/episodes?${params}`)
          if (!response.ok) return
          const data = (await response.json()) as { episodes?: PlexEpisode[] }
          const nextEpisodes = data.episodes ?? []
          seasonEpisodesCacheRef.current.set(nextSeason.ratingKey, nextEpisodes)
          candidate = nextEpisodes[0] ?? null
        } catch {
          return
        }
      }
    }

    const streamUrl = candidate ? buildStreamUrl(candidate) : null
    if (!candidate || !streamUrl) return

    if (runId !== nextEpPreloadRunRef.current) return
    nextEpisodeRef.current = candidate
    setNextEpPreloadState('loading')
    setNextEpUrlReady(false)

    const variantUrls = buildStreamUrlVariants(candidate)
    const ranges = ['bytes=0-65535', 'bytes=0-262143', 'bytes=1048576-1114111']
    const preloadDeadlineAt = Date.now() + 9000
    let selectedUrl: string | null = null

    for (const variantUrl of variantUrls) {
      if (Date.now() >= preloadDeadlineAt) break
      let variantReady = false
      for (const range of ranges) {
        if (Date.now() >= preloadDeadlineAt) break
        try {
          const res = await fetch('/api/plugins/plex/warmup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: variantUrl, range }),
          })
          const data = (await res.json()) as { ok?: boolean }
          if (data.ok) {
            variantReady = true
            break
          }
        } catch {
          // try next range/variant
        }
      }
      if (variantReady) {
        selectedUrl = variantUrl
        break
      }
    }

    if (runId !== nextEpPreloadRunRef.current) return
    if (selectedUrl) {
      preferredStreamUrlByRatingKeyRef.current.set(candidate.ratingKey, selectedUrl)
      setNextEpPreloadState('ready')
      setNextEpUrlReady(true)
    } else {
      setNextEpPreloadState('failed')
      setNextEpUrlReady(false)
    }
  }

  function handleTimeUpdate(current: number, duration: number) {
    const currentEpisode = playingEpisodeRef.current
    if (!currentEpisode || !isFinite(duration) || duration === 0) return

    if (!sawEarlyPlaybackForEpisodeRef.current) {
      if (current <= 15) {
        sawEarlyPlaybackForEpisodeRef.current = true
      } else {
        return
      }
    }

    if (!watchedMarkedInSessionRef.current) {
      const completionRatio = current / duration
      const secondsRemaining = duration - current
      if (completionRatio >= 0.92 || secondsRemaining <= 90) {
        markWatched(currentEpisode, true)
        watchedMarkedInSessionRef.current = true
      }
    }

    if (!getAutoPlayNextEpisode()) return
    if (!nextEpArmedRef.current) {
      if (current < 30) return
      const progressRatio = current / duration
      if (progressRatio > 0.25) return
      nextEpArmedRef.current = true
    }

    const remaining = duration - current
    const popupAt = getNextEpPopupSeconds()
    const preloadLead = getNextEpPreloadLeadSeconds()
    const preloadAt = popupAt + preloadLead

    if (remaining <= preloadAt && !nextEpPreloadStarted.current) {
      void preloadNextEpisode()
    }

    if (remaining <= popupAt && !nextEpCardShown.current && nextEpisodeRef.current) {
      nextEpCardShown.current = true
      setNextEpCard({
        season: nextEpisodeRef.current.seasonIndex,
        episode: nextEpisodeRef.current.index,
        episodeTitle: nextEpisodeRef.current.title,
        stillUrl: nextEpisodeRef.current.thumb,
      })
    }
  }

  function handlePlayNextEpisode() {
    const nextEpisode = nextEpisodeRef.current
    if (!nextEpisode) {
      setNextEpCard(null)
      nextEpCardShown.current = true
      return
    }
    const currentEpisode = playingEpisodeRef.current
    if (currentEpisode && !watchedMarkedInSessionRef.current) markWatched(currentEpisode, true)
    if (selectedSeason?.index !== nextEpisode.seasonIndex) {
      const nextSeason = seasons.find((season) => season.index === nextEpisode.seasonIndex) ?? null
      if (nextSeason) setSelectedSeason(nextSeason)
    }
    playingEpisodeRef.current = nextEpisode
    sawEarlyPlaybackForEpisodeRef.current = false
    armPlaybackStartGuard(nextEpisode)
    resetNextEpisodeState()
    watchedMarkedInSessionRef.current = false
    setPlayerHideStartSplash(true)
    setPlayerAutoFullscreen(true)
    setPlayerInitialTime(undefined)
    setPlayingEpisode(nextEpisode)
  }

  if (!conn) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">{item.title}</p>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition hover:text-white">✕</button>
        </div>
        <p className="px-4 py-8 text-center text-xs text-slate-500">Plex not connected</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">{item.title}</p>
        <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition hover:text-white">✕</button>
      </div>

      {seasons.length > 1 ? (
        <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-3 py-2 scrollbar-hide">
          {seasons.map((s) => (
            <button
              key={s.ratingKey}
              type="button"
              onClick={() => setSelectedSeason(s)}
              className={`flex-none rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] transition ${
                selectedSeason?.ratingKey === s.ratingKey
                  ? 'bg-accent-500 text-white'
                  : 'border border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              S{s.index}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loadingSeasons || loadingEpisodes ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3 rounded-xl p-2">
                <div className="h-14 w-24 flex-none animate-pulse rounded bg-slate-800" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-slate-800" />
                  <div className="h-2 w-1/2 animate-pulse rounded bg-slate-700" />
                </div>
              </div>
            ))}
          </div>
        ) : episodes.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-600">No episodes found</p>
        ) : (
          <div className="space-y-1">
            {episodes.map((ep) => {
              const streamUrl = buildStreamUrl(ep)
              const watched = watchedSet.has(epKey(ep.seasonIndex, ep.index))
              return (
                <div key={ep.ratingKey} className={`group flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/[0.04] ${watched ? 'opacity-50' : ''}`}>
                  <div className="relative h-14 w-24 flex-none overflow-hidden rounded-lg bg-slate-800">
                    {ep.thumb ? (
                      <img src={ep.thumb} alt={ep.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-600">
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                      </div>
                    )}
                    {streamUrl ? (
                      <button type="button" onClick={() => playEpisode(ep)} className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                        <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                      </button>
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-white">{ep.index}. {ep.title}</p>
                    {ep.duration ? <p className="mt-0.5 text-[10px] text-slate-500">{formatDuration(ep.duration)}</p> : null}
                  </div>
                  {resolvedTmdbId ? (
                    <button
                      type="button"
                      title={watched ? 'Mark as unwatched' : 'Mark as watched'}
                      onClick={() => markWatched(ep, !watched)}
                      className={`flex-none rounded-full border p-1.5 transition ${
                        watched ? 'border-emerald-400/40 text-emerald-400 hover:border-red-400/40 hover:text-red-400' : 'border-white/10 text-slate-600 hover:border-emerald-400/40 hover:text-emerald-400'
                      }`}
                    >
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12" /></svg>
                    </button>
                  ) : null}
                  {streamUrl ? (
                    <button type="button" onClick={() => playEpisode(ep)} className="flex-none rounded-full border border-white/10 p-1.5 text-slate-400 transition hover:border-accent-400/40 hover:text-white">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {playingEpisode ? (() => {
        const streamUrl = buildStreamUrl(playingEpisode)
        if (!streamUrl) return null
        const proxyUrl = `/api/proxy-stream?${new URLSearchParams({ url: streamUrl }).toString()}`
        return (
          <VideoPlayerModal
            key={`plex-episode-${playingEpisode.ratingKey}`}
            url={proxyUrl}
            filename={playingEpisode.filename ?? undefined}
            title={`${item.title} · S${playingEpisode.seasonIndex}E${playingEpisode.index} – ${playingEpisode.title}`}
            onClose={handlePlayerClose}
            onFirstPlay={() => {
              playbackStartedRef.current = true
              clearPlaybackStartGuard()
              if (playerHideStartSplash) setPlayerHideStartSplash(false)
              if (playerAutoFullscreen) setPlayerAutoFullscreen(false)
            }}
            tmdbId={resolvedTmdbId}
            posterUrl={item.posterUrl}
            backdropUrl={item.backdropUrl}
            year={item.year}
            mediaId={item.id}
            imdbId={item.imdbId}
            mediaType="tv"
            season={playingEpisode.seasonIndex}
            episode={playingEpisode.index}
            initialTime={playerInitialTime}
            forceProxy
            onTimeUpdate={handleTimeUpdate}
            hideStartSplash={playerHideStartSplash}
            autoFullscreen={playerAutoFullscreen}
            overlayContent={
              nextEpCard ? (
                <NextEpisodeCard
                  seriesTitle={item.title}
                  season={nextEpCard.season}
                  episode={nextEpCard.episode}
                  episodeTitle={nextEpCard.episodeTitle}
                  stillUrl={nextEpCard.stillUrl}
                  urlReady={nextEpUrlReady}
                  allowManualPlayWhenNotReady
                  onDismiss={() => { setNextEpCard(null); nextEpCardShown.current = true }}
                  onPlayNow={handlePlayNextEpisode}
                />
              ) : undefined
            }
          />
        )
      })() : null}
    </div>
  )
}
