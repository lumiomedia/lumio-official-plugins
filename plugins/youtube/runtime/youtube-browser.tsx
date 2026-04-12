'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLang, type BrowsePageProps, type HomeOverrideProps, type HomeRowProps, type PluginHeroProps } from '@/lib/plugin-sdk'
import {
  fetchYouTubeChannelVideos,
  fetchYouTubeLatestFromSubscriptions,
  fetchYouTubePlaylistVideos,
  fetchYouTubePlaylists,
  fetchYouTubeSubscriptions,
  searchYouTubeChannels,
  subscribeToYouTubeChannel,
  unsubscribeFromYouTubeChannel,
  warmYouTubeBackgroundCaches,
} from './youtube-client'
import {
  clearYouTubeCache,
  getDismissedYouTubeHeroVideoId,
  getYouTubeSettings,
  getYouTubeSession,
  isYouTubeSessionValid,
  markYouTubeVideoOpened,
  onYouTubePluginChanged,
  setDismissedYouTubeHeroVideoId,
  readYouTubeCacheStale,
} from './youtube-storage'
import type { YouTubeChannel, YouTubePlaylist, YouTubeSession, YouTubeVideo } from './youtube-types'

type YouTubeBrowseMode = 'following' | 'channels' | 'playlists' | 'playlist' | 'channel'
const VIDEO_PAGE_SIZE = 16
const ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&#39;': "'",
  '&quot;': '"',
  '&lt;': '<',
  '&gt;': '>',
}

function getLatestFollowingHeroVideo(session: YouTubeSession, hideShorts: boolean): YouTubeVideo | null {
  const cached = readYouTubeCacheStale<YouTubeVideo[]>(`following-latest:${session.channelId}`) ?? []
  return filterShorts(cached, hideShorts)[0] ?? null
}

function getBrowseMode(pageId: string): YouTubeBrowseMode {
  if (pageId === 'youtube-following') return 'following'
  if (pageId === 'youtube-channels') return 'channels'
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

function playYouTubeVideo(video: YouTubeVideo, onPlay: (video: YouTubeVideo) => void) {
  markYouTubeVideoOpened(video.id)
  onPlay(video)
}

function formatVideoMeta(video: YouTubeVideo) {
  const parts: string[] = []
  if (video.channelTitle) parts.push(video.channelTitle)
  if (video.publishedAt) {
    const date = new Date(video.publishedAt)
    if (!Number.isNaN(date.getTime())) {
      parts.push(date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }))
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
  const { t } = useLang()
  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/80 p-6 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" aria-label={t('close')} onClick={onClose} />
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
  const { t } = useLang()
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
              {channel.subscriptionId ? t('following') : t('pluginYoutubeChannelBadge')}
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
                {channel.subscriptionId ? t('pluginYoutubeUnfollow') : t('follow')}
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
  const { t } = useLang()
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
          {t('pluginYoutubePlaylistBadge')}
        </div>
      </div>
      <div className="p-2.5">
        <p className="text-[9px] uppercase tracking-[0.22em] text-slate-300/60">
          {playlist.itemCount != null ? `${playlist.itemCount} ${t('pluginYoutubeVideos')}` : t('pluginYoutubePlaylistBadge')}
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
  const { t } = useLang()
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
            {t('pluginYoutubeChannelBadge')}
          </div>
        ) : (
          <div className="absolute left-2 top-2 rounded-full border border-white/12 bg-black/50 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-200 backdrop-blur-sm">
            {t('pluginYoutubeVideoBadge')}
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
  const { t } = useLang()
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
            totalLimit: Math.max(videoLimit + 18, 36),
            channelLimit: Math.max(12, Math.ceil(videoLimit / 2)),
            maxResultsPerChannel: 6,
          })
          if (!cancelled) setVideos(filterShorts(nextVideos, hideShorts))
        }
        if (mode === 'playlists') {
          const nextPlaylists = await fetchYouTubePlaylists(activeSession)
          if (!cancelled) setPlaylists(nextPlaylists)
        }
        if (mode === 'playlist') {
          if (!params?.id) {
            throw new Error('Missing playlist id.')
          }
          const nextVideos = await fetchYouTubePlaylistVideos(activeSession, params.id, Math.max(videoLimit + 12, 36))
          if (!cancelled) setVideos(filterShorts(nextVideos, hideShorts))
        }
        if (mode === 'channel') {
          if (!params?.id) {
            throw new Error('Missing channel id.')
          }
          const nextVideos = await fetchYouTubeChannelVideos(activeSession, params.id, Math.max(videoLimit + 12, 36))
          if (!cancelled) setVideos(filterShorts(nextVideos, hideShorts))
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : t('pluginYoutubeLoadError'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [pageId, params?.id, connected, session, videoLimit, hideShorts, t])

  return { session, connected, loading, error, channels, playlists, videos }
}

export function YouTubeBrowsePage({ pageId, params, onNavigate }: BrowsePageProps) {
  const { t } = useLang()
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
    const query = searchQuery.trim()
    if (!query) {
      setSearchResults([])
      return
    }

    if (!session || !connected) {
      setSearchResults([])
      return
    }

    let cancelled = false
    const timeoutId = window.setTimeout(() => {
      void searchYouTubeChannels(session, query, channels).then((next) => {
        if (!cancelled) setSearchResults(next)
      }).catch(() => {
        if (!cancelled) setSearchResults([])
      })
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [searchQuery, pageId, channels, session, connected])

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
        title: video.channelTitle ?? t('pluginYoutubeChannelPage'),
      },
    })
  }

  function handleRefresh() {
    clearYouTubeCache()
    setRefreshNonce((value) => value + 1)
  }

  const navButtons: Array<{ id: 'youtube-following' | 'youtube-channels' | 'youtube-playlists'; label: string; params?: Record<string, string> }> = [
    { id: 'youtube-following', label: t('pluginYoutubeFollowingPage'), params: { __force: '1' } },
    { id: 'youtube-channels', label: t('pluginYoutubeChannelsPage') },
    { id: 'youtube-playlists', label: t('pluginYoutubePlaylistsPage') },
  ]

  const browseActions = (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {navButtons.map((button) => {
        const active = pageId === button.id
        return (
          <button
            key={button.id}
            type="button"
            onClick={() => onNavigate({ pageId: button.id, params: button.params })}
            className={`h-9 rounded-full border px-4 text-[0.6rem] font-normal uppercase tracking-[0.2em] transition-all whitespace-nowrap ${
              active
                ? 'border-white/[0.16] bg-white/[0.08] text-white'
                : 'border-white/[0.1] bg-white/[0.04] text-slate-200 hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            {button.label}
          </button>
        )
      })}
      <button
        type="button"
        onClick={handleRefresh}
        className="h-9 rounded-full border border-white/[0.1] bg-white/[0.04] px-4 text-[0.6rem] font-normal uppercase tracking-[0.2em] text-slate-200 transition-all whitespace-nowrap hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white"
      >
        {t('refreshStatus')}
      </button>
    </div>
  )

  const pageTitle = pageId === 'youtube-following'
    ? t('pluginYoutubeFollowingPage')
    : pageId === 'youtube-channels'
      ? t('pluginYoutubeChannelsPage')
      : pageId === 'youtube-channel'
          ? (params?.title ?? t('pluginYoutubeChannelPage'))
        : pageId === 'youtube-playlist'
          ? (params?.title ?? t('pluginYoutubePlaylistPage'))
          : t('pluginYoutubePlaylistsPage')

  if (!settings.clientId.trim()) {
    return <SectionPlaceholder title="YouTube" text={t('pluginYoutubeSetupPrompt')} />
  }

  if (!connected || !session) {
    return <SectionPlaceholder title="YouTube" text={t('pluginYoutubeConnectPrompt')} />
  }

  if (loading) {
    return <SectionPlaceholder title={pageTitle} text={t('pluginYoutubeLoading')} />
  }

  if (error) {
    return <SectionPlaceholder title={pageTitle} text={error} />
  }

  const subscriptionHeader = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-400">{t('pluginYoutubeYourSubscriptions')}</p>
      <input
        type="search"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder={t('pluginYoutubeSearchChannels')}
        className="w-full max-w-[320px] rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-white/20"
      />
    </div>
  )

  return (
    <div className="space-y-8">
      {pageId === 'youtube-following' ? (
        <YouTubeGridShell
          title={t('pluginYoutubeFollowingPage')}
          subtitle={t('pluginYoutubeFollowingSubtitle')}
          actions={browseActions}
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onPlay={(entry) => playYouTubeVideo(entry, setPlayerVideo)}
                onOpenChannel={openChannelFromVideo}
              />
            ))}
          </div>
        </YouTubeGridShell>
      ) : null}

      {pageId === 'youtube-channels' ? (
        <YouTubeGridShell
          title={t('pluginYoutubeChannelsPage')}
          subtitle={t('pluginYoutubeChannelsSubtitle')}
          actions={browseActions}
        >
          {subscriptionHeader}
          {searchQuery.trim() ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">{t('pluginYoutubeMatchingChannels')}</p>
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
        <YouTubeGridShell title={t('pluginYoutubePlaylistsPage')} subtitle={t('pluginYoutubePlaylistsSubtitle')} actions={browseActions}>
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

      {pageId === 'youtube-playlist' || pageId === 'youtube-channel' ? (
        <YouTubeGridShell
          title={pageTitle}
          subtitle={
            pageId === 'youtube-channel'
              ? t('pluginYoutubeChannelSubtitle')
              : t('pluginYoutubePlaylistSubtitle')
          }
          actions={browseActions}
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onPlay={(entry) => playYouTubeVideo(entry, setPlayerVideo)}
                onOpenChannel={openChannelFromVideo}
              />
            ))}
          </div>
        </YouTubeGridShell>
      ) : null}

      {(
        (pageId === 'youtube-following' && videos.length >= visibleCount) ||
        (pageId === 'youtube-channel' && videos.length >= visibleCount) ||
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
            {t('loadMore')}
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

export function YouTubeBackgroundBootstrap() {
  const { session, connected } = useYouTubeSessionState()

  useEffect(() => {
    if (!connected || !session) return

    let cancelled = false
    const run = () => {
      void warmYouTubeBackgroundCaches(session).catch(() => {})
    }

    const idleId = typeof window !== 'undefined' && 'requestIdleCallback' in window
      ? window.requestIdleCallback(() => {
          if (!cancelled) run()
        }, { timeout: 3000 })
      : null

    const timeoutId = idleId == null
      ? window.setTimeout(() => {
          if (!cancelled) run()
        }, 1200)
      : null

    return () => {
      cancelled = true
      if (idleId != null && 'cancelIdleCallback' in window) window.cancelIdleCallback(idleId)
      if (timeoutId != null) window.clearTimeout(timeoutId)
    }
  }, [connected, session])

  return null
}

export function YouTubeHomeOverride({ onNavigate }: HomeOverrideProps) {
  return (
    <YouTubeBrowsePage
      pageId="youtube-following"
      onNavigate={onNavigate}
    />
  )
}

export function YouTubeHeroBanner({ onNavigate, onActiveChange, onBackdropChange }: PluginHeroProps) {
  const { t } = useLang()
  const { settings, session, connected } = useYouTubeSessionState()
  const [video, setVideo] = useState<YouTubeVideo | null>(null)
  const [playerVideo, setPlayerVideo] = useState<YouTubeVideo | null>(null)

  useEffect(() => {
    const sync = () => {
      if (!connected || !session || !settings.hero) {
        setVideo(null)
        return
      }
      const latest = getLatestFollowingHeroVideo(session, settings.hideShorts)
      const dismissedId = getDismissedYouTubeHeroVideoId()
      if (!latest || (!settings.keepHero && latest.id === dismissedId)) {
        setVideo(null)
        return
      }
      setVideo(latest)
    }

    sync()
    const off = onYouTubePluginChanged(sync)
    return () => off()
  }, [connected, session, settings.hero, settings.hideShorts, settings.keepHero])

  useEffect(() => {
    onActiveChange(Boolean(video))
    onBackdropChange(video?.thumbnailUrl ?? null)
    return () => {
      onActiveChange(false)
      onBackdropChange(null)
    }
  }, [video, onActiveChange, onBackdropChange])

  if (!video) return null

  const openVideo = () => {
    if (!settings.keepHero) setDismissedYouTubeHeroVideoId(video.id)
    setPlayerVideo(video)
    if (!settings.keepHero) setVideo(null)
  }

  const openFollowing = () => {
    if (!settings.keepHero) setDismissedYouTubeHeroVideoId(video.id)
    if (!settings.keepHero) setVideo(null)
    onNavigate({ pageId: 'youtube-following', params: { __force: '1' } })
  }

  const openChannel = () => {
    if (!video.channelId) return
    if (!settings.keepHero) setDismissedYouTubeHeroVideoId(video.id)
    if (!settings.keepHero) setVideo(null)
    onNavigate({
      pageId: 'youtube-channel',
      params: {
        id: video.channelId,
        title: video.channelTitle ?? t('pluginYoutubeChannelPage'),
      },
    })
  }

  return (
    <div className="relative mb-4" style={{ minHeight: 380 }}>
      <div className="flex h-full min-h-[380px] flex-col justify-end p-6 sm:p-8 md:max-w-[60%]">
        <div className="mb-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={openFollowing}
            className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-300 transition hover:border-white/30 hover:bg-white/20 hover:text-white"
          >
            YouTube
          </button>
          {video.channelTitle ? (
            <button
              type="button"
              onClick={openChannel}
              className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-300 transition hover:border-white/30 hover:bg-white/20 hover:text-white"
            >
              {video.channelTitle}
            </button>
          ) : null}
        </div>

        <h2 className="mb-1 text-3xl font-bold leading-tight text-white drop-shadow-lg sm:text-4xl">
          {decodeHtmlEntities(video.title)}
        </h2>

        <div className="mb-3 flex items-center gap-3 text-sm text-slate-300">
          {video.channelTitle ? <span>{video.channelTitle}</span> : null}
          {video.publishedAt ? (
            <span>
              {new Date(video.publishedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          ) : null}
        </div>

        {video.description ? (
          <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-slate-300/80 sm:text-base">
            {decodeHtmlEntities(video.description)}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openVideo}
            className="flex h-10 items-center rounded-full bg-accent-500 px-6 text-sm font-semibold text-white transition hover:bg-accent-400"
          >
            <svg className="mr-1.5 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            {t('play')}
          </button>
          <button
            type="button"
            onClick={openFollowing}
            className="h-10 rounded-full border border-white/20 bg-white/[0.06] px-6 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            {t('pluginYoutubeOpenFeed')}
          </button>
        </div>
      </div>
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
  const { t } = useLang()
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
          {t('showAll')}
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
  onNavigate,
  layout = 'slider',
  count = 16,
  sliderCardWidth = 'calc((100% - 3 * 0.75rem) / 4)',
}: HomeRowProps) {
  const { t } = useLang()
  const { settings, session, connected } = useYouTubeSessionState()
  const { active, setNode } = useDeferredActivation()
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [playerVideo, setPlayerVideo] = useState<YouTubeVideo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!connected || !session || !active) return
    let cancelled = false
    const activeSession = session

    async function load() {
      setError(null)
      try {
        const next = await fetchYouTubeLatestFromSubscriptions(activeSession, {
          totalLimit: Math.max(count + 8, 24),
          channelLimit: Math.max(10, Math.ceil(count / 2)),
          maxResultsPerChannel: 4,
        })
        if (!cancelled) setVideos(filterShorts(next, settings.hideShorts))
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : t('pluginYoutubeRowLoadError'))
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [connected, session, active, settings.hideShorts, count, t])

  if (!connected || !session) return null
  if (error) return null

  return (
    <div ref={setNode}>
      <YouTubeHomeRowShell
        title={t('pluginYoutubeFollowingRow')}
        subtitle={t('pluginYoutubeFollowingSubtitle')}
        onOpenAll={() => onNavigate({ pageId: 'youtube-following', params: { __force: '1' } })}
      >
        <div
          className={layout === 'slider' ? 'flex gap-3 overflow-x-auto pb-3' : 'grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4'}
          style={layout === 'slider' ? { scrollbarWidth: 'none', msOverflowStyle: 'none' } : undefined}
        >
          {active ? videos.slice(0, count).map((video) => (
            <div
              key={video.id}
              className={layout === 'slider' ? 'flex-none' : 'w-full'}
              style={layout === 'slider' ? { width: sliderCardWidth } : undefined}
            >
              <VideoCard
                video={video}
                onPlay={(entry) => playYouTubeVideo(entry, setPlayerVideo)}
                onOpenChannel={(entry) => {
                  if (!entry.channelId) return
                  onNavigate({
                    pageId: 'youtube-channel',
                    params: {
                      id: entry.channelId,
                      title: entry.channelTitle ?? t('pluginYoutubeChannelPage'),
                    },
                  })
                }}
              />
            </div>
          )) : Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className={`animate-pulse rounded-[1.5rem] bg-slate-800/50 ${layout === 'slider' ? 'aspect-video flex-none' : 'aspect-video'}`}
              style={layout === 'slider' ? { width: sliderCardWidth } : undefined}
            />
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
