'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { BrowsePageProps, HomeRowProps } from '@/lib/plugin-sdk'
import {
  fetchYouTubeChannelVideos,
  fetchYouTubeLatestFromSubscriptions,
  fetchYouTubePlaylistVideos,
  fetchYouTubePlaylists,
  fetchYouTubeSubscriptions,
  subscribeToYouTubeChannel,
  unsubscribeFromYouTubeChannel,
} from './youtube-client'
import {
  clearYouTubeCache,
  getYouTubeSettings,
  getYouTubeSession,
  isYouTubeSessionValid,
  onYouTubePluginChanged,
} from './youtube-storage'
import type { YouTubeChannel, YouTubePlaylist, YouTubeSession, YouTubeVideo } from './youtube-types'

type YouTubeBrowseMode = 'following' | 'channels' | 'playlists' | 'watch-later' | 'playlist' | 'channel'
type YouTubeHomeRowKind = 'following' | 'watch-later' | 'playlists'
const VIDEO_PAGE_SIZE = 18
const ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&#39;': "'",
  '&quot;': '"',
  '&lt;': '<',
  '&gt;': '>',
}

function getBrowseMode(pageId: string): YouTubeBrowseMode {
  if (pageId === 'youtube-following') return 'following'
  if (pageId === 'youtube-channels') return 'channels'
  if (pageId === 'youtube-watch-later') return 'watch-later'
  if (pageId === 'youtube-playlist') return 'playlist'
  if (pageId === 'youtube-channel') return 'channel'
  return 'playlists'
}

function useYouTubeSessionState() {
  const [session, setSession] = useState<YouTubeSession | null>(() => getYouTubeSession())
  const [settings, setSettings] = useState(() => getYouTubeSettings())

  useEffect(() => {
    const sync = () => {
      setSession(getYouTubeSession())
      setSettings(getYouTubeSettings())
    }
    sync()
    const offPlugin = onYouTubePluginChanged(sync)
    return () => {
      offPlugin()
    }
  }, [])

  return {
    session,
    settings,
    connected: isYouTubeSessionValid(session),
  }
}

function filterShorts(videos: YouTubeVideo[], hideShorts: boolean) {
  if (!hideShorts) return videos
  return videos.filter((video) => {
    if (video.isShort === true) return false
    const haystack = `${video.title} ${video.description ?? ''}`.toLowerCase()
    return !haystack.includes('#shorts') && !haystack.includes(' shorts')
  })
}

function useDeferredActivation() {
  const [active, setActive] = useState(false)
  const [node, setNode] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (active || !node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setActive(true)
      },
      { rootMargin: '240px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [active, node])

  return { active, setNode }
}

function decodeHtmlEntities(value: string) {
  return value.replace(/(&amp;|&#39;|&quot;|&lt;|&gt;)/g, (match) => ENTITY_MAP[match] ?? match)
}

function formatVideoMeta(video: YouTubeVideo) {
  const parts: string[] = []
  if (video.channelTitle) parts.push(video.channelTitle)
  if (video.publishedAt) {
    const date = new Date(video.publishedAt)
    if (!Number.isNaN(date.getTime())) {
      parts.push(date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' }))
    }
  }
  return parts.join(' · ') || 'YouTube'
}

function YouTubePlayerModal({
  videoId,
  title,
  onClose,
}: {
  videoId: string
  title: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/80 p-6 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" aria-label="Close video" onClick={onClose} />
      <div className="relative z-10 w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#090e1d] shadow-[0_30px_120px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-white">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-slate-400 transition hover:border-white/20 hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="aspect-video w-full">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  )
}

function SectionPlaceholder({ title, text }: { title: string; text: string }) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm text-slate-400">{text}</p>
    </section>
  )
}

function ChannelCard({
  channel,
  onToggleFollow,
  busy,
  onOpen,
}: {
  channel: YouTubeChannel
  onToggleFollow?: (channel: YouTubeChannel) => void
  busy?: boolean
  onOpen?: (channel: YouTubeChannel) => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen ? () => onOpen(channel) : undefined}
      onKeyDown={(event) => {
        if (!onOpen) return
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        onOpen(channel)
      }}
      className="w-full rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 text-left transition hover:-translate-y-1 hover:border-white/20"
      aria-label={channel.title}
    >
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 overflow-hidden rounded-full bg-slate-800">
          {channel.thumbnailUrl ? (
            <img src={channel.thumbnailUrl} alt={channel.title} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-white">{channel.title}</h3>
          {channel.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-slate-400">{channel.description}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">
              {channel.subscriptionId ? 'Following' : 'Channel'}
            </span>
            {onToggleFollow ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onToggleFollow(channel)
                }}
                disabled={busy}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-200 transition hover:border-white/20 hover:text-white disabled:opacity-50"
              >
                {channel.subscriptionId ? 'Unfollow' : 'Follow'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function PlaylistCard({
  playlist,
  onOpen,
}: {
  playlist: YouTubePlaylist
  onOpen: (playlist: YouTubePlaylist) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(playlist)}
      className="group w-full overflow-hidden bg-transparent text-left transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative aspect-video overflow-hidden bg-slate-800">
        {playlist.thumbnailUrl ? (
          <img
            src={playlist.thumbnailUrl}
            alt={playlist.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-90 transition group-hover:opacity-100" />
        <div className="absolute left-2 top-2 rounded-full border border-white/12 bg-black/50 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-200 backdrop-blur-sm">
          Playlist
        </div>
      </div>
      <div className="p-2.5">
        <p className="text-[9px] uppercase tracking-[0.22em] text-slate-300/60">
          {playlist.itemCount != null ? `${playlist.itemCount} videos` : 'Playlist'}
        </p>
        <h3 className="mt-0.5 line-clamp-2 text-[0.8rem] font-semibold leading-snug text-white">{decodeHtmlEntities(playlist.title)}</h3>
      </div>
    </button>
  )
}

function VideoCard({
  video,
  onPlay,
  onOpenChannel,
}: {
  video: YouTubeVideo
  onPlay: (video: YouTubeVideo) => void
  onOpenChannel?: (video: YouTubeVideo) => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onPlay(video)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        onPlay(video)
      }}
      className="group relative w-full overflow-hidden bg-transparent text-left transition-all duration-300 hover:-translate-y-1"
      aria-label={decodeHtmlEntities(video.title)}
    >
      <div className="relative aspect-video overflow-hidden bg-slate-800">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-90 transition group-hover:opacity-100" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition group-hover:scale-105 group-hover:bg-black/70">
            <svg className="ml-0.5 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </div>
        {onOpenChannel && video.channelId ? (
          <div
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation()
              onOpenChannel(video)
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return
              event.preventDefault()
              event.stopPropagation()
              onOpenChannel(video)
            }}
            className="absolute left-2 top-2 rounded-full border border-white/12 bg-black/50 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-200 backdrop-blur-sm transition hover:border-white/20 hover:bg-black/65 hover:text-white"
          >
            Kanal
          </div>
        ) : (
          <div className="absolute left-2 top-2 rounded-full border border-white/12 bg-black/50 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-200 backdrop-blur-sm">
            Video
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-[9px] uppercase tracking-[0.22em] text-slate-300/60">{formatVideoMeta(video)}</p>
        <h3 className="mt-0.5 line-clamp-2 text-[0.8rem] font-semibold leading-snug text-white">{decodeHtmlEntities(video.title)}</h3>
      </div>
    </div>
  )
}

function YouTubeGridShell({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

function useYouTubeData(pageId: string, params?: Record<string, string>, videoLimit = VIDEO_PAGE_SIZE, hideShorts = false) {
  const { session, connected } = useYouTubeSessionState()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [channels, setChannels] = useState<YouTubeChannel[]>([])
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([])
  const [videos, setVideos] = useState<YouTubeVideo[]>([])

  useEffect(() => {
    if (!connected || !session) {
      setChannels([])
      setPlaylists([])
      setVideos([])
      setLoading(false)
      return
    }

    let cancelled = false
    const activeSession = session

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const mode = getBrowseMode(pageId)
        if (mode === 'following' || mode === 'channels') {
          const nextChannels = await fetchYouTubeSubscriptions(activeSession)
          if (!cancelled) setChannels(nextChannels)
        }
        if (mode === 'following') {
          const nextVideos = await fetchYouTubeLatestFromSubscriptions(activeSession, {
            totalLimit: videoLimit,
            channelLimit: Math.max(8, Math.ceil(videoLimit / 3)),
            maxResultsPerChannel: 4,
          })
          if (!cancelled) setVideos(filterShorts(nextVideos, hideShorts))
        }
        if (mode === 'playlists') {
          const nextPlaylists = await fetchYouTubePlaylists(activeSession)
          if (!cancelled) setPlaylists(nextPlaylists)
        }
        if (mode === 'watch-later') {
          if (!activeSession.watchLaterPlaylistId) {
            throw new Error('Watch later is not available for this account.')
          }
          const nextVideos = await fetchYouTubePlaylistVideos(activeSession, activeSession.watchLaterPlaylistId, videoLimit)
          if (!cancelled) setVideos(filterShorts(nextVideos, hideShorts))
        }
        if (mode === 'playlist') {
          if (!params?.id) {
            throw new Error('Missing playlist id.')
          }
          const nextVideos = await fetchYouTubePlaylistVideos(activeSession, params.id, videoLimit)
          if (!cancelled) setVideos(filterShorts(nextVideos, hideShorts))
        }
        if (mode === 'channel') {
          if (!params?.id) {
            throw new Error('Missing channel id.')
          }
          const nextVideos = await fetchYouTubeChannelVideos(activeSession, params.id, videoLimit)
          if (!cancelled) setVideos(filterShorts(nextVideos, hideShorts))
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load YouTube data.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [pageId, params?.id, connected, session, videoLimit, hideShorts])

  return { session, connected, loading, error, channels, playlists, videos }
}

export function YouTubeBrowsePage({ pageId, params, onNavigate }: BrowsePageProps) {
  const { session, settings, connected } = useYouTubeSessionState()
  const [visibleCount, setVisibleCount] = useState(VIDEO_PAGE_SIZE)
  const [refreshNonce, setRefreshNonce] = useState(0)
  const { loading, error, channels, playlists, videos } = useYouTubeData(pageId, { ...(params ?? {}), __refresh: String(refreshNonce) }, visibleCount, settings.hideShorts)
  const [playerVideo, setPlayerVideo] = useState<YouTubeVideo | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<YouTubeChannel[]>([])
  const [actionChannelId, setActionChannelId] = useState<string | null>(null)

  const channelMap = useMemo(
    () => new Map(channels.map((channel) => [channel.id, channel])),
    [channels],
  )

  useEffect(() => {
    setVisibleCount(pageId === 'youtube-channels' || pageId === 'youtube-playlists' ? 12 : VIDEO_PAGE_SIZE)
  }, [pageId, params?.id])

  useEffect(() => {
    if (pageId !== 'youtube-channels') return
    const query = searchQuery.trim().toLowerCase()
    if (!query) {
      setSearchResults([])
      return
    }

    setSearchResults(
      channels.filter((channel) => {
        const haystack = `${channel.title} ${channel.description ?? ''}`.toLowerCase()
        return haystack.includes(query)
      }),
    )
  }, [searchQuery, pageId, channels])

  async function handleToggleFollow(channel: YouTubeChannel) {
    if (!session) return
    setActionChannelId(channel.id)
    try {
      if (channel.subscriptionId) {
        await unsubscribeFromYouTubeChannel(session, channel.subscriptionId)
      } else {
        await subscribeToYouTubeChannel(session, channel.id)
      }
      clearYouTubeCache()
      window.dispatchEvent(new CustomEvent('lumio-youtube-plugin-changed'))
    } finally {
      setActionChannelId(null)
    }
  }

  function openChannel(channel: YouTubeChannel) {
    onNavigate({
      pageId: 'youtube-channel',
      params: {
        id: channel.id,
        title: channel.title,
      },
    })
  }

  function openChannelFromVideo(video: YouTubeVideo) {
    if (!video.channelId) return
    onNavigate({
      pageId: 'youtube-channel',
      params: {
        id: video.channelId,
        title: video.channelTitle ?? 'Channel',
      },
    })
  }

  function handleRefresh() {
    clearYouTubeCache()
    setRefreshNonce((value) => value + 1)
  }

  const pageTitle = pageId === 'youtube-following'
    ? 'Following'
    : pageId === 'youtube-channels'
      ? 'Channels'
      : pageId === 'youtube-watch-later'
        ? 'Watch later'
        : pageId === 'youtube-channel'
          ? (params?.title ?? 'Channel')
        : pageId === 'youtube-playlist'
          ? (params?.title ?? 'Playlist')
          : 'Playlists'

  if (!settings.clientId.trim()) {
    return <SectionPlaceholder title="YouTube" text="Add your Google Desktop Client ID and YouTube API key in the YouTube plugin settings to get started." />
  }

  if (!connected || !session) {
    return <SectionPlaceholder title="YouTube" text="Connect YouTube in Settings to browse your subscriptions, playlists and Watch later." />
  }

  if (loading) {
    return <SectionPlaceholder title={pageTitle} text="Loading your YouTube data…" />
  }

  if (error) {
    return <SectionPlaceholder title={pageTitle} text={error} />
  }

  return (
    <div className="space-y-8">
      {pageId === 'youtube-following' ? (
        <YouTubeGridShell
          title="Following"
          subtitle="Latest videos from channels you follow."
          actions={(
            <button
              type="button"
              onClick={handleRefresh}
              className="h-10 rounded-full border border-white/[0.1] bg-white/[0.04] px-5 text-[0.65rem] font-normal uppercase tracking-[0.2em] text-slate-200 transition-all hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white"
            >
              Refresh
            </button>
          )}
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onPlay={setPlayerVideo}
                onOpenChannel={openChannelFromVideo}
              />
            ))}
          </div>
        </YouTubeGridShell>
      ) : null}

      {pageId === 'youtube-channels' ? (
        <YouTubeGridShell
          title="Channels"
          subtitle="Search for new channels and manage who you follow."
          actions={(
            <div className="flex flex-wrap gap-3">
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Filter your channels…"
                className="min-w-[240px] rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-white/20"
              />
              <button
                type="button"
                onClick={handleRefresh}
                className="h-10 rounded-full border border-white/[0.1] bg-white/[0.04] px-5 text-[0.65rem] font-normal uppercase tracking-[0.2em] text-slate-200 transition-all hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white"
              >
                Refresh
              </button>
            </div>
          )}
        >
          {searchQuery.trim() ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">Matching channels</p>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {searchResults.map((channel) => (
                  <ChannelCard
                    key={channel.id}
                    channel={channel}
                    onToggleFollow={handleToggleFollow}
                    busy={actionChannelId === channel.id}
                    onOpen={openChannel}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-4">
            <p className="text-sm text-slate-400">Your subscriptions</p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {channels.slice(0, visibleCount).map((channel) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  onToggleFollow={handleToggleFollow}
                  busy={actionChannelId === channel.id}
                  onOpen={openChannel}
                />
              ))}
            </div>
          </div>
        </YouTubeGridShell>
      ) : null}

      {pageId === 'youtube-playlists' ? (
        <YouTubeGridShell title="Playlists" subtitle="Your saved YouTube playlists." actions={(
          <button
            type="button"
            onClick={handleRefresh}
            className="h-10 rounded-full border border-white/[0.1] bg-white/[0.04] px-5 text-[0.65rem] font-normal uppercase tracking-[0.2em] text-slate-200 transition-all hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white"
          >
            Refresh
          </button>
        )}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {playlists.slice(0, visibleCount).map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                onOpen={(entry) => onNavigate({
                  pageId: 'youtube-playlist',
                  params: {
                    id: entry.id,
                    title: entry.title,
                  },
                })}
              />
            ))}
          </div>
        </YouTubeGridShell>
      ) : null}

      {pageId === 'youtube-watch-later' || pageId === 'youtube-playlist' || pageId === 'youtube-channel' ? (
        <YouTubeGridShell
          title={pageTitle}
          subtitle={
            pageId === 'youtube-watch-later'
              ? 'Your saved queue for later.'
              : pageId === 'youtube-channel'
                ? 'Latest videos from this channel.'
                : 'Playlist videos'
          }
          actions={(
            <button
              type="button"
              onClick={handleRefresh}
              className="h-10 rounded-full border border-white/[0.1] bg-white/[0.04] px-5 text-[0.65rem] font-normal uppercase tracking-[0.2em] text-slate-200 transition-all hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white"
            >
              Refresh
            </button>
          )}
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onPlay={setPlayerVideo}
                onOpenChannel={openChannelFromVideo}
              />
            ))}
          </div>
        </YouTubeGridShell>
      ) : null}

      {(
        (pageId === 'youtube-following' && videos.length >= visibleCount) ||
        (pageId === 'youtube-channel' && videos.length >= visibleCount) ||
        (pageId === 'youtube-watch-later' && videos.length >= visibleCount) ||
        (pageId === 'youtube-playlist' && videos.length >= visibleCount) ||
        (pageId === 'youtube-channels' && !searchQuery.trim() && channels.length > visibleCount) ||
        (pageId === 'youtube-playlists' && playlists.length > visibleCount)
      ) ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + VIDEO_PAGE_SIZE)}
            className="h-10 rounded-full border border-white/[0.1] bg-white/[0.04] px-5 text-[0.65rem] font-normal uppercase tracking-[0.2em] text-slate-200 transition-all hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white"
          >
            Load more
          </button>
        </div>
      ) : null}

      {playerVideo ? (
        <YouTubePlayerModal
          videoId={playerVideo.id}
          title={playerVideo.title}
          onClose={() => setPlayerVideo(null)}
        />
      ) : null}
    </div>
  )
}

function YouTubeHomeRowShell({
  title,
  subtitle,
  children,
  onOpenAll,
}: {
  title: string
  subtitle: string
  children: ReactNode
  onOpenAll: () => void
}) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onOpenAll}
          className="flex h-9 items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.03] px-4 text-[0.6rem] font-normal uppercase tracking-[0.2em] text-slate-200 transition-all hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-white"
        >
          Show all
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
      {children}
    </section>
  )
}

export function YouTubeHomeRow({
  kind,
  onNavigate,
}: HomeRowProps & {
  kind: YouTubeHomeRowKind
}) {
  const { settings, session, connected } = useYouTubeSessionState()
  const { active, setNode } = useDeferredActivation()
  const [channels, setChannels] = useState<YouTubeChannel[]>([])
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([])
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [playerVideo, setPlayerVideo] = useState<YouTubeVideo | null>(null)
  const [error, setError] = useState<string | null>(null)

  const rowEnabled = kind === 'following'
    ? settings.homeRows.following
    : kind === 'watch-later'
      ? settings.homeRows.watchLater
      : settings.homeRows.playlists

  useEffect(() => {
    if (!connected || !session || !rowEnabled || !active) return
    let cancelled = false
    const activeSession = session

    async function load() {
      setError(null)
      try {
        if (kind === 'following') {
          const next = await fetchYouTubeSubscriptions(activeSession)
          if (!cancelled) setChannels(next.slice(0, 12))
        }
        if (kind === 'playlists') {
          const next = await fetchYouTubePlaylists(activeSession)
          if (!cancelled) setPlaylists(next.slice(0, 8))
        }
        if (kind === 'watch-later' && activeSession.watchLaterPlaylistId) {
          const next = await fetchYouTubePlaylistVideos(activeSession, activeSession.watchLaterPlaylistId, 12)
          if (!cancelled) setVideos(next)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load YouTube row.')
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [connected, session, rowEnabled, kind, active])

  if (!rowEnabled || !connected || !session) return null
  if (error) return null

  if (kind === 'following') {
    return (
      <div ref={setNode}>
      <YouTubeHomeRowShell title="YouTube following" subtitle="Channels you follow" onOpenAll={() => onNavigate({ pageId: 'youtube-following' })}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {active ? channels.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              onOpen={(entry) => onNavigate({
                pageId: 'youtube-channel',
                params: { id: entry.id, title: entry.title },
              })}
            />
          )) : Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="aspect-[3/1] animate-pulse rounded-[1.5rem] bg-slate-800/50" />
          ))}
        </div>
      </YouTubeHomeRowShell>
      </div>
    )
  }

  if (kind === 'playlists') {
    return (
      <div ref={setNode}>
      <YouTubeHomeRowShell title="YouTube playlists" subtitle="Your saved lists" onOpenAll={() => onNavigate({ pageId: 'youtube-playlists' })}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {active ? playlists.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              onOpen={(entry) => onNavigate({
                pageId: 'youtube-playlist',
                params: { id: entry.id, title: entry.title },
              })}
            />
          )) : Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="aspect-video animate-pulse rounded-[1.5rem] bg-slate-800/50" />
          ))}
        </div>
      </YouTubeHomeRowShell>
      </div>
    )
  }

  return (
    <div ref={setNode}>
      <YouTubeHomeRowShell title="Watch later" subtitle="Your YouTube queue" onOpenAll={() => onNavigate({ pageId: 'youtube-watch-later' })}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {active ? videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onPlay={setPlayerVideo}
              onOpenChannel={(entry) => {
                if (!entry.channelId) return
                onNavigate({
                  pageId: 'youtube-channel',
                  params: {
                    id: entry.channelId,
                    title: entry.channelTitle ?? 'Channel',
                  },
                })
              }}
            />
          )) : Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="aspect-video animate-pulse rounded-[1.5rem] bg-slate-800/50" />
          ))}
        </div>
      </YouTubeHomeRowShell>
      {playerVideo ? (
        <YouTubePlayerModal
          videoId={playerVideo.id}
          title={playerVideo.title}
          onClose={() => setPlayerVideo(null)}
        />
      ) : null}
    </div>
  )
}
