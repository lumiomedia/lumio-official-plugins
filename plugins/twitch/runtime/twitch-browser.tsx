'use client'

import { useEffect, useState, type ReactNode } from 'react'
import {
  onAuthCapabilitiesChanged,
  useLang,
  type BrowsePageProps,
  type HomeRowProps,
  type PluginHeroProps,
} from '@/lib/plugin-sdk'
import {
  getTopStreams,
  getTopCategories,
  getStreamsByGame,
  getFollowedStreams,
  getFollowedChannels,
  getUsersByIds,
  searchChannels,
  searchCategories,
  getChannelVideos,
  getChannelClips,
  thumb,
} from './twitch-client'
import { TwitchPlayerModal } from './twitch-player'
import { ensureFreshTwitchSession, openTwitchUrl } from './twitch-auth'
import { getTwitchHeroEnabled, getTwitchSession, isTwitchSessionValid, onTwitchPluginChanged } from './twitch-storage'
import type { TwitchStream, TwitchCategory, TwitchVideo, TwitchClip, EnrichedFollowedChannel } from './twitch-types'

type StreamLanguage = '' | 'sv' | 'en'
type StreamSort = 'viewers-desc' | 'viewers-asc'
type FollowingTab = 'overview' | 'live' | 'channels' | 'videos'

// Cap the number of followed channels we fan out VOD requests to on the
// Following → Videos tab, to stay well within Helix rate limits.
const FOLLOWED_VIDEO_CHANNEL_CAP = 12

const TEXT = {
  liveNowTitle: { en: 'Twitch: Live now', sv: 'Twitch: Live nu' },
  liveNowSubtitle: {
    en: 'Top live channels on Twitch right now.',
    sv: 'Toppkanaler som är live på Twitch just nu.',
  },
  live: { en: 'LIVE', sv: 'LIVE' },
  loading: { en: 'Loading live channels…', sv: 'Laddar live-kanaler…' },
  loadError: { en: 'Could not load Twitch live channels.', sv: 'Kunde inte läsa in live-kanaler från Twitch.' },
  empty: { en: 'No live channels right now.', sv: 'Inga live-kanaler just nu.' },
  watchNow: { en: 'Watch now', sv: 'Titta nu' },
  browseLive: { en: 'Browse live', sv: 'Bläddra live' },
  categoriesTitle: { en: 'Twitch: Categories', sv: 'Twitch: Kategorier' },
  categoriesSubtitle: { en: 'Browse categories on Twitch.', sv: 'Bläddra bland kategorier på Twitch.' },
  loadingCategories: { en: 'Loading categories…', sv: 'Laddar kategorier…' },
  categoriesLoadError: { en: 'Could not load Twitch categories.', sv: 'Kunde inte läsa in kategorier från Twitch.' },
  categoriesEmpty: { en: 'No categories found.', sv: 'Inga kategorier hittades.' },
  streamsEmpty: {
    en: 'No live channels in this category right now.',
    sv: 'Inga live-kanaler i denna kategori just nu.',
  },
  back: { en: 'Back to categories', sv: 'Tillbaka till kategorier' },
  loadMore: { en: 'Load more', sv: 'Ladda fler' },
  searchTitle: { en: 'Twitch: Search', sv: 'Twitch: Sök' },
  searchSubtitle: { en: 'Find channels and categories on Twitch.', sv: 'Hitta kanaler och kategorier på Twitch.' },
  searchPlaceholder: { en: 'Search channels and categories…', sv: 'Sök kanaler och kategorier…' },
  searchPrompt: { en: 'Start typing to search Twitch.', sv: 'Börja skriva för att söka på Twitch.' },
  searching: { en: 'Searching…', sv: 'Söker…' },
  searchError: { en: 'Could not search Twitch.', sv: 'Kunde inte söka på Twitch.' },
  searchNoResults: { en: 'No channels or categories found.', sv: 'Inga kanaler eller kategorier hittades.' },
  channelsHeading: { en: 'Channels', sv: 'Kanaler' },
  categoriesHeading: { en: 'Categories', sv: 'Kategorier' },
  backToResults: { en: 'Back to search results', sv: 'Tillbaka till sökresultat' },
  vodsTab: { en: 'VODs', sv: 'VOD:er' },
  clipsTab: { en: 'Clips', sv: 'Klipp' },
  loadingVods: { en: 'Loading VODs…', sv: 'Laddar VOD:er…' },
  loadingClips: { en: 'Loading clips…', sv: 'Laddar klipp…' },
  vodsLoadError: { en: 'Could not load VODs.', sv: 'Kunde inte läsa in VOD:er.' },
  clipsLoadError: { en: 'Could not load clips.', sv: 'Kunde inte läsa in klipp.' },
  vodsEmpty: { en: 'No VODs found for this channel.', sv: 'Inga VOD:er hittades för denna kanal.' },
  clipsEmpty: { en: 'No clips found for this channel.', sv: 'Inga klipp hittades för denna kanal.' },
  followingTitle: { en: 'Twitch: Following', sv: 'Twitch: Följer' },
  followingSubtitle: {
    en: 'Live channels you follow on Twitch.',
    sv: 'Live-kanaler du följer på Twitch.',
  },
  followingConnectPrompt: {
    en: 'Connect Twitch in Settings to see who you follow.',
    sv: 'Anslut Twitch i Inställningar för att se vilka du följer.',
  },
  followingEmpty: {
    en: 'None of the channels you follow are live right now.',
    sv: 'Inga av kanalerna du följer är live just nu.',
  },
  // Filter bar (Live browse page). Stream language follows the app's own
  // language selector (useLang), so there is no Twitch-specific language chip.
  filterSort: { en: 'Sort by', sv: 'Sortera' },
  sortViewersDesc: { en: 'Most viewers', sv: 'Flest tittare' },
  sortViewersAsc: { en: 'Fewest viewers', sv: 'Färst tittare' },
  // Following tabs
  tabOverview: { en: 'Overview', sv: 'Översikt' },
  tabLive: { en: 'Live', sv: 'Live' },
  tabChannels: { en: 'Channels', sv: 'Kanaler' },
  tabVideos: { en: 'Videos', sv: 'Videor' },
  overviewLiveHeading: { en: 'Live now', sv: 'Live nu' },
  overviewChannelsHeading: { en: 'Channels you follow', sv: 'Kanaler du följer' },
  channelsLoading: { en: 'Loading channels…', sv: 'Laddar kanaler…' },
  channelsLoadError: { en: 'Could not load followed channels.', sv: 'Kunde inte läsa in följda kanaler.' },
  channelsEmpty: { en: "You don't follow any channels yet.", sv: 'Du följer inga kanaler ännu.' },
  followingVideosLoading: { en: 'Loading videos…', sv: 'Laddar videor…' },
  followingVideosError: { en: 'Could not load videos.', sv: 'Kunde inte läsa in videor.' },
  followingVideosEmpty: {
    en: 'No recent videos from channels you follow.',
    sv: 'Inga nya videor från kanaler du följer.',
  },
  liveBadge: { en: 'Live', sv: 'Live' },
  offlineBadge: { en: 'Offline', sv: 'Offline' },
  // Channel page
  watchLive: { en: 'Watch live', sv: 'Titta live' },
  openOnTwitch: { en: 'Open on Twitch', sv: 'Öppna på Twitch' },
  backToChannel: { en: 'Back', sv: 'Tillbaka' },
} as const

type TextKey = keyof typeof TEXT

function useTwitchText() {
  const { lang } = useLang()
  return (key: TextKey) => TEXT[key][lang] ?? TEXT[key].en
}

function formatViewerCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 10_000) return `${Math.round(count / 1000)}K`
  if (count >= 1_000) return `${(count / 1000).toFixed(1)}K`
  return String(count)
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

function useTwitchTopStreams(active: boolean, language: StreamLanguage = '') {
  const [streams, setStreams] = useState<TwitchStream[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getTopStreams(undefined, language)
      .then((result) => {
        if (cancelled) return
        setStreams(result.streams)
        setCursor(result.cursor ?? null)
      })
      .catch((loadError) => {
        if (cancelled) return
        setError(loadError instanceof Error ? loadError.message : 'error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [active, language])

  async function loadMore() {
    if (!cursor) return
    try {
      const result = await getTopStreams(cursor, language)
      setStreams((current) => [...current, ...result.streams])
      setCursor(result.cursor ?? null)
    } catch {
      // Keep current results on load-more failure; the button remains visible for retry.
    }
  }

  return { streams, loading, error, hasMore: Boolean(cursor), loadMore }
}

function useTwitchCategories() {
  const [categories, setCategories] = useState<TwitchCategory[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getTopCategories()
      .then((result) => {
        if (cancelled) return
        setCategories(result.categories)
        setCursor(result.cursor ?? null)
      })
      .catch((loadError) => {
        if (cancelled) return
        setError(loadError instanceof Error ? loadError.message : 'error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function loadMore() {
    if (!cursor) return
    try {
      const result = await getTopCategories(cursor)
      setCategories((current) => [...current, ...result.categories])
      setCursor(result.cursor ?? null)
    } catch {
      // Keep current results on load-more failure; the button remains visible for retry.
    }
  }

  return { categories, loading, error, hasMore: Boolean(cursor), loadMore }
}

function useTwitchCategoryStreams(gameId: string | null) {
  const [streams, setStreams] = useState<TwitchStream[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!gameId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setStreams([])
    setCursor(null)
    getStreamsByGame(gameId)
      .then((result) => {
        if (cancelled) return
        setStreams(result.streams)
        setCursor(result.cursor ?? null)
      })
      .catch((loadError) => {
        if (cancelled) return
        setError(loadError instanceof Error ? loadError.message : 'error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [gameId])

  async function loadMore() {
    if (!gameId || !cursor) return
    try {
      const result = await getStreamsByGame(gameId, cursor)
      setStreams((current) => [...current, ...result.streams])
      setCursor(result.cursor ?? null)
    } catch {
      // Keep current results on load-more failure; the button remains visible for retry.
    }
  }

  return { streams, loading, error, hasMore: Boolean(cursor), loadMore }
}

function useTwitchHeroEnabled() {
  const [enabled, setEnabled] = useState(() => getTwitchHeroEnabled())

  useEffect(() => {
    const sync = () => setEnabled(getTwitchHeroEnabled())
    sync()
    return onTwitchPluginChanged(sync)
  }, [])

  return enabled
}

function useTwitchSessionState() {
  const [session, setSession] = useState(() => getTwitchSession())

  useEffect(() => {
    const sync = () => setSession(getTwitchSession())
    sync()
    // A stored session whose access token has expired is silently renewed via
    // the refresh token whenever a Twitch surface mounts — the user connects
    // once, then opening Twitch just works. The refresh persists the rotated
    // session, which fires the auth-changed event and re-syncs this state.
    void ensureFreshTwitchSession()
    return onAuthCapabilitiesChanged(sync)
  }, [])

  return session
}

function useTwitchFollowedStreams(active: boolean, userId: string | null, userToken: string | null) {
  const [streams, setStreams] = useState<TwitchStream[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!active || !userId || !userToken) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getFollowedStreams(userId, userToken)
      .then((result) => {
        if (cancelled) return
        setStreams(result.streams)
        setCursor(result.cursor ?? null)
      })
      .catch((loadError) => {
        if (cancelled) return
        setError(loadError instanceof Error ? loadError.message : 'error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [active, userId, userToken])

  async function loadMore() {
    if (!cursor || !userId || !userToken) return
    try {
      const result = await getFollowedStreams(userId, userToken, cursor)
      setStreams((current) => [...current, ...result.streams])
      setCursor(result.cursor ?? null)
    } catch {
      // Keep current results on load-more failure; the button remains visible for retry.
    }
  }

  return { streams, loading, error, hasMore: Boolean(cursor), loadMore }
}

function useFollowedChannels(
  active: boolean,
  userId: string | null,
  userToken: string | null,
  liveById: Map<string, TwitchStream>,
) {
  const [rawChannels, setRawChannels] = useState<{ id: string; login: string; displayName: string }[]>([])
  const [profileById, setProfileById] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!active || !userId || !userToken) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getFollowedChannels(userId, userToken)
      .then(async (result) => {
        if (cancelled) return
        const mapped = result.channels.map((channel) => ({
          id: channel.broadcaster_id,
          login: channel.broadcaster_login,
          displayName: channel.broadcaster_name,
        }))
        setRawChannels(mapped)
        // Enrich with profile images (best-effort; cards still render without).
        const users = await getUsersByIds(mapped.map((channel) => channel.id)).catch(() => [])
        if (cancelled) return
        setProfileById(new Map(users.map((user) => [user.id, user.profile_image_url])))
      })
      .catch((loadError) => {
        if (cancelled) return
        setError(loadError instanceof Error ? loadError.message : 'error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [active, userId, userToken])

  const channels: EnrichedFollowedChannel[] = rawChannels.map((channel) => {
    const live = liveById.get(channel.id)
    return {
      id: channel.id,
      login: channel.login,
      displayName: channel.displayName,
      profileImageUrl: profileById.get(channel.id) ?? '',
      isLive: Boolean(live),
      gameName: live?.game_name,
      title: live?.title,
    }
  })
  // Surface live channels first, then alphabetical by display name.
  channels.sort((a, b) => {
    if (a.isLive !== b.isLive) return a.isLive ? -1 : 1
    return a.displayName.localeCompare(b.displayName)
  })

  return { channels, loading, error }
}

function useFollowedVideos(active: boolean, channelIds: string[]) {
  const [videos, setVideos] = useState<TwitchVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const key = channelIds.slice(0, FOLLOWED_VIDEO_CHANNEL_CAP).join(',')

  useEffect(() => {
    if (!active || !key) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    const ids = key.split(',')
    Promise.all(ids.map((id) => getChannelVideos(id).catch(() => [] as TwitchVideo[])))
      .then((lists) => {
        if (cancelled) return
        const merged = lists
          .flat()
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setVideos(merged)
      })
      .catch((loadError) => {
        if (cancelled) return
        setError(loadError instanceof Error ? loadError.message : 'error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [active, key])

  return { videos, loading, error }
}

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[0.6rem] font-normal uppercase tracking-[0.2em] text-slate-400">{label}</span>
      <div className="flex gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-0.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`h-8 rounded-full px-3.5 text-[0.6rem] font-normal uppercase tracking-[0.16em] transition-all ${
              value === option.value
                ? 'bg-white/[0.12] text-white'
                : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// The plugin surfaces four browse pages but the app menu only links the first,
// so — like the YouTube plugin — each page draws its own top tab bar and uses
// the passed `onNavigate` to switch between them. Without this, Categories /
// Search / Following are unreachable from the UI.
const TWITCH_PAGES: { id: string; label: { en: string; sv: string } }[] = [
  { id: 'twitch-live', label: { en: 'Live', sv: 'Live' } },
  { id: 'twitch-categories', label: { en: 'Categories', sv: 'Kategorier' } },
  { id: 'twitch-following', label: { en: 'Following', sv: 'Följer' } },
  { id: 'twitch-search', label: { en: 'Search', sv: 'Sök' } },
]

function TwitchPageNav({
  current,
  onNavigate,
}: {
  current: string
  onNavigate: (target: { pageId: string }) => void
}) {
  const { lang } = useLang()
  return (
    <div className="flex flex-wrap gap-2">
      {TWITCH_PAGES.map((page) => (
        <button
          key={page.id}
          type="button"
          onClick={() => {
            if (page.id !== current) onNavigate({ pageId: page.id })
          }}
          className={`h-9 rounded-full border px-4 text-[0.62rem] font-normal uppercase tracking-[0.2em] transition-all ${
            page.id === current
              ? 'border-white/[0.24] bg-white/[0.1] text-white'
              : 'border-white/[0.1] bg-white/[0.03] text-slate-300 hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-white'
          }`}
        >
          {page.label[lang] ?? page.label.en}
        </button>
      ))}
    </div>
  )
}

function StreamCard({
  stream,
  onPlay,
}: {
  stream: TwitchStream
  onPlay: (stream: TwitchStream) => void
}) {
  const text = useTwitchText()
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onPlay(stream)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        onPlay(stream)
      }}
      className="group relative w-full overflow-hidden bg-transparent text-left transition-all duration-300 hover:-translate-y-1"
      aria-label={stream.title}
    >
      <div className="relative aspect-video overflow-hidden bg-slate-800">
        {stream.thumbnail_url ? (
          <img
            src={thumb(stream.thumbnail_url, 440, 248)}
            alt={stream.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-90 transition group-hover:opacity-100" />
        <div className="absolute left-2 top-2 rounded-full border border-rose-400/30 bg-rose-600/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
          {text('live')}
        </div>
        {Number.isFinite(stream.viewer_count) ? (
          <div className="absolute right-2 top-2 rounded-full border border-white/12 bg-black/50 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-200 backdrop-blur-sm">
            {formatViewerCount(stream.viewer_count as number)}
          </div>
        ) : null}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition group-hover:scale-105 group-hover:bg-black/70">
            <svg className="ml-0.5 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </div>
      </div>
      <div className="p-2.5">
        <p className="text-[9px] uppercase tracking-[0.22em] text-slate-300/60">{stream.game_name || 'Twitch'}</p>
        <h3 className="mt-0.5 line-clamp-2 text-[0.8rem] font-semibold leading-snug text-white">{stream.user_name}</h3>
        <p className="mt-0.5 line-clamp-1 text-[0.7rem] text-slate-400">{stream.title}</p>
      </div>
    </div>
  )
}

function TwitchGridShell({
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

function SectionPlaceholder({ title, text }: { title: string; text: string }) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm text-slate-400">{text}</p>
    </section>
  )
}

function sortStreams(streams: TwitchStream[], sort: StreamSort): TwitchStream[] {
  const factor = sort === 'viewers-asc' ? 1 : -1
  return [...streams].sort((a, b) => factor * ((a.viewer_count ?? 0) - (b.viewer_count ?? 0)))
}

function StreamFilterBar({
  sort,
  onSortChange,
}: {
  sort: StreamSort
  onSortChange: (value: StreamSort) => void
}) {
  const text = useTwitchText()
  return (
    <div className="flex flex-wrap items-center gap-4">
      <SegmentedControl<StreamSort>
        label={text('filterSort')}
        value={sort}
        onChange={onSortChange}
        options={[
          { value: 'viewers-desc', label: text('sortViewersDesc') },
          { value: 'viewers-asc', label: text('sortViewersAsc') },
        ]}
      />
    </div>
  )
}

export function TwitchBrowsePage({ pageId, onNavigate }: BrowsePageProps) {
  const text = useTwitchText()
  const { lang } = useLang()
  const [sort, setSort] = useState<StreamSort>('viewers-desc')
  // Stream language follows the app-wide language selector, not a local chip.
  const { streams, loading, error, hasMore, loadMore } = useTwitchTopStreams(true, lang)
  const [selectedChannel, setSelectedChannel] = useState<SelectedChannel | null>(null)

  if (selectedChannel) {
    return (
      <ChannelDrilldown
        channel={selectedChannel}
        pageId={pageId}
        onNavigate={onNavigate}
        onBack={() => setSelectedChannel(null)}
      />
    )
  }

  const filterBar = <StreamFilterBar sort={sort} onSortChange={setSort} />
  const sorted = sortStreams(streams, sort)

  const body =
    loading && streams.length === 0 ? (
      <p className="text-sm text-slate-400">{text('loading')}</p>
    ) : error && streams.length === 0 ? (
      <p className="text-sm text-slate-400">{text('loadError')}</p>
    ) : sorted.length === 0 ? (
      <p className="text-sm text-slate-400">{text('empty')}</p>
    ) : (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {sorted.map((stream) => (
          <StreamCard key={stream.id} stream={stream} onPlay={(s) => setSelectedChannel(channelFromStream(s, true))} />
        ))}
      </div>
    )

  return (
    <div className="space-y-6">
      <TwitchPageNav current={pageId} onNavigate={onNavigate} />
      <TwitchGridShell title={text('liveNowTitle')} subtitle={text('liveNowSubtitle')} actions={filterBar}>
        {body}
      </TwitchGridShell>

      {hasMore && sorted.length > 0 ? <LoadMoreButton onClick={() => void loadMore()} label={text('loadMore')} /> : null}
    </div>
  )
}

function CategoryCard({
  category,
  onSelect,
}: {
  category: TwitchCategory
  onSelect: (category: TwitchCategory) => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(category)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        onSelect(category)
      }}
      className="group relative w-full cursor-pointer bg-transparent text-left transition-all duration-300 hover:-translate-y-1"
      aria-label={category.name}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-[0.75rem] bg-slate-800">
        {category.box_art_url ? (
          <img
            src={thumb(category.box_art_url, 285, 380)}
            alt={category.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-90 transition group-hover:opacity-100" />
      </div>
      <h3 className="mt-2 line-clamp-2 text-[0.8rem] font-semibold leading-snug text-white">{category.name}</h3>
    </div>
  )
}

function LoadMoreButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div className="flex justify-center pt-2">
      <button
        type="button"
        onClick={onClick}
        className="h-10 rounded-full border border-white/[0.1] bg-white/[0.04] px-5 text-[0.65rem] font-normal uppercase tracking-[0.2em] text-slate-200 transition-all hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white"
      >
        {label}
      </button>
    </div>
  )
}

export function TwitchCategoriesPage({ pageId, onNavigate }: BrowsePageProps) {
  const text = useTwitchText()
  const { categories, loading, error, hasMore, loadMore } = useTwitchCategories()
  const [selectedCategory, setSelectedCategory] = useState<TwitchCategory | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<SelectedChannel | null>(null)
  const {
    streams,
    loading: streamsLoading,
    error: streamsError,
    hasMore: streamsHasMore,
    loadMore: loadMoreStreams,
  } = useTwitchCategoryStreams(selectedCategory?.id ?? null)

  // Clicking this page's own chip while drilled in returns to the category grid
  // (navigating to the page we're already on won't remount it, so reset here).
  const handleNav = (target: { pageId: string }) => {
    if (target.pageId === pageId) {
      setSelectedCategory(null)
      setSelectedChannel(null)
    } else {
      onNavigate(target)
    }
  }
  const pageNav = <TwitchPageNav current={pageId} onNavigate={onNavigate} />
  const drillNav = <TwitchPageNav current="" onNavigate={handleNav} />

  if (selectedChannel) {
    return (
      <ChannelDrilldown
        channel={selectedChannel}
        pageId={pageId}
        onNavigate={handleNav}
        onBack={() => setSelectedChannel(null)}
      />
    )
  }

  if (selectedCategory) {
    const streamsBody =
      streamsLoading && streams.length === 0 ? (
        <SectionPlaceholder title={selectedCategory.name} text={text('loading')} />
      ) : streamsError && streams.length === 0 ? (
        <SectionPlaceholder title={selectedCategory.name} text={text('loadError')} />
      ) : (
        <TwitchGridShell title={selectedCategory.name}>
          {streams.length === 0 ? (
            <p className="text-sm text-slate-400">{text('streamsEmpty')}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {streams.map((stream) => (
                <StreamCard
                  key={stream.id}
                  stream={stream}
                  onPlay={(s) => setSelectedChannel(channelFromStream(s, true))}
                />
              ))}
            </div>
          )}
        </TwitchGridShell>
      )

    return (
      <div className="space-y-6">
        {drillNav}
        {streamsBody}
        {streamsHasMore && streams.length > 0 ? (
          <LoadMoreButton onClick={() => void loadMoreStreams()} label={text('loadMore')} />
        ) : null}
      </div>
    )
  }

  if (loading && categories.length === 0) {
    return (
      <div className="space-y-6">
        {pageNav}
        <SectionPlaceholder title={text('categoriesTitle')} text={text('loadingCategories')} />
      </div>
    )
  }

  if (error && categories.length === 0) {
    return (
      <div className="space-y-6">
        {pageNav}
        <SectionPlaceholder title={text('categoriesTitle')} text={text('categoriesLoadError')} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {pageNav}
      <TwitchGridShell title={text('categoriesTitle')} subtitle={text('categoriesSubtitle')}>
        {categories.length === 0 ? (
          <p className="text-sm text-slate-400">{text('categoriesEmpty')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} onSelect={setSelectedCategory} />
            ))}
          </div>
        )}
      </TwitchGridShell>

      {hasMore ? <LoadMoreButton onClick={() => void loadMore()} label={text('loadMore')} /> : null}
    </div>
  )
}

function ChannelAvatarCard({
  channel,
  onSelect,
}: {
  channel: EnrichedFollowedChannel
  onSelect: (channel: EnrichedFollowedChannel) => void
}) {
  const text = useTwitchText()
  const initial = (channel.displayName || channel.login || '?').charAt(0).toUpperCase()
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(channel)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        onSelect(channel)
      }}
      className="group flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.16] hover:bg-white/[0.05]"
      aria-label={channel.displayName || channel.login}
    >
      <div className="relative flex-none">
        <div className="h-12 w-12 overflow-hidden rounded-full bg-slate-700">
          {channel.profileImageUrl ? (
            <img src={channel.profileImageUrl} alt={channel.displayName} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">{initial}</span>
          )}
        </div>
        {channel.isLive ? (
          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full border border-rose-400/40 bg-rose-600 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-white">
            {text('liveBadge')}
          </span>
        ) : null}
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-white">{channel.displayName || channel.login}</h3>
        {channel.isLive && channel.gameName ? (
          <p className="truncate text-[0.7rem] text-slate-400">{channel.gameName}</p>
        ) : (
          <p className="text-[0.7rem] uppercase tracking-[0.18em] text-slate-500">{text('offlineBadge')}</p>
        )}
      </div>
    </div>
  )
}

export function TwitchFollowingPage({ pageId, onNavigate }: BrowsePageProps) {
  const text = useTwitchText()
  const pageNav = <TwitchPageNav current={pageId} onNavigate={onNavigate} />
  const session = useTwitchSessionState()
  const valid = isTwitchSessionValid(session)
  const userId = valid ? session!.userId : null
  const userToken = valid ? session!.accessToken : null

  const [tab, setTab] = useState<FollowingTab>('overview')
  const [selectedChannel, setSelectedChannel] = useState<SelectedChannel | null>(null)
  const [videoPlayer, setVideoPlayer] = useState<{ id: string; title: string } | null>(null)

  const live = useTwitchFollowedStreams(valid, userId, userToken)
  const liveById = new Map(live.streams.map((stream) => [stream.user_id, stream]))
  const channelsState = useFollowedChannels(valid, userId, userToken, liveById)
  const videosState = useFollowedVideos(
    valid && tab === 'videos',
    channelsState.channels.map((channel) => channel.id),
  )

  function openFollowedChannel(channel: EnrichedFollowedChannel) {
    setSelectedChannel({
      userId: channel.id,
      broadcasterId: channel.id,
      login: channel.login,
      displayName: channel.displayName,
      isLive: channel.isLive,
      liveTitle: channel.title,
    })
  }

  const handleNav = (target: { pageId: string }) => {
    if (target.pageId === pageId) setSelectedChannel(null)
    else onNavigate(target)
  }

  if (!valid) {
    return (
      <div className="space-y-6">
        {pageNav}
        <SectionPlaceholder title={text('followingTitle')} text={text('followingConnectPrompt')} />
      </div>
    )
  }

  if (selectedChannel) {
    return (
      <ChannelDrilldown
        channel={selectedChannel}
        pageId={pageId}
        onNavigate={handleNav}
        onBack={() => setSelectedChannel(null)}
      />
    )
  }

  const tabs: { key: FollowingTab; label: string }[] = [
    { key: 'overview', label: text('tabOverview') },
    { key: 'live', label: text('tabLive') },
    { key: 'channels', label: text('tabChannels') },
    { key: 'videos', label: text('tabVideos') },
  ]

  const liveGrid = (streams: TwitchStream[]) => (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {streams.map((stream) => (
        <StreamCard
          key={stream.id}
          stream={stream}
          onPlay={(s) => setSelectedChannel(channelFromStream(s, true))}
        />
      ))}
    </div>
  )
  const channelGrid = (channels: EnrichedFollowedChannel[]) => (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {channels.map((channel) => (
        <ChannelAvatarCard key={channel.id} channel={channel} onSelect={openFollowedChannel} />
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">{text('followingTitle')}</h2>
          <p className="mt-1 text-sm text-slate-400">{text('followingSubtitle')}</p>
        </div>
        {pageNav}
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setTab(entry.key)}
            className={`h-9 rounded-full border px-4 text-[0.6rem] font-normal uppercase tracking-[0.2em] transition-all ${
              tab === entry.key
                ? 'border-white/[0.24] bg-white/[0.1] text-white'
                : 'border-white/[0.1] bg-white/[0.03] text-slate-300 hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-white'
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="space-y-8">
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-white">{text('overviewLiveHeading')}</h3>
            {live.loading && live.streams.length === 0 ? (
              <p className="text-sm text-slate-400">{text('loading')}</p>
            ) : live.streams.length === 0 ? (
              <p className="text-sm text-slate-400">{text('followingEmpty')}</p>
            ) : (
              liveGrid(live.streams.slice(0, 8))
            )}
          </section>
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-white">{text('overviewChannelsHeading')}</h3>
            {channelsState.loading && channelsState.channels.length === 0 ? (
              <p className="text-sm text-slate-400">{text('channelsLoading')}</p>
            ) : channelsState.error && channelsState.channels.length === 0 ? (
              <p className="text-sm text-slate-400">{text('channelsLoadError')} — {channelsState.error}</p>
            ) : channelsState.channels.length === 0 ? (
              <p className="text-sm text-slate-400">{text('channelsEmpty')}</p>
            ) : (
              channelGrid(channelsState.channels.slice(0, 12))
            )}
          </section>
        </div>
      ) : tab === 'live' ? (
        <div className="space-y-8">
          {live.loading && live.streams.length === 0 ? (
            <p className="text-sm text-slate-400">{text('loading')}</p>
          ) : live.error && live.streams.length === 0 ? (
            <p className="text-sm text-slate-400">{text('loadError')}</p>
          ) : live.streams.length === 0 ? (
            <p className="text-sm text-slate-400">{text('followingEmpty')}</p>
          ) : (
            liveGrid(live.streams)
          )}
          {live.hasMore ? <LoadMoreButton onClick={() => void live.loadMore()} label={text('loadMore')} /> : null}
        </div>
      ) : tab === 'channels' ? (
        <div className="space-y-8">
          {channelsState.loading && channelsState.channels.length === 0 ? (
            <p className="text-sm text-slate-400">{text('channelsLoading')}</p>
          ) : channelsState.error && channelsState.channels.length === 0 ? (
            <p className="text-sm text-slate-400">{text('channelsLoadError')} — {channelsState.error}</p>
          ) : channelsState.channels.length === 0 ? (
            <p className="text-sm text-slate-400">{text('channelsEmpty')}</p>
          ) : (
            channelGrid(channelsState.channels)
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {videosState.loading && videosState.videos.length === 0 ? (
            <p className="text-sm text-slate-400">{text('followingVideosLoading')}</p>
          ) : videosState.error && videosState.videos.length === 0 ? (
            <p className="text-sm text-slate-400">{text('followingVideosError')}</p>
          ) : videosState.videos.length === 0 ? (
            <p className="text-sm text-slate-400">{text('followingVideosEmpty')}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {videosState.videos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onPlay={(v) => setVideoPlayer({ id: v.id, title: v.title })}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {videoPlayer ? (
        <TwitchPlayerModal
          kind="vod"
          id={videoPlayer.id}
          title={videoPlayer.title}
          onClose={() => setVideoPlayer(null)}
        />
      ) : null}
    </div>
  )
}

type SelectedChannel = {
  userId: string
  broadcasterId: string
  login: string
  displayName: string
  isLive?: boolean
  liveTitle?: string
}

function channelFromStream(stream: TwitchStream, isLive: boolean): SelectedChannel {
  return {
    userId: stream.user_id,
    broadcasterId: stream.user_id,
    login: stream.user_login,
    displayName: stream.user_name,
    isLive,
    liveTitle: stream.title,
  }
}

function useTwitchSearch(query: string) {
  const [channels, setChannels] = useState<TwitchStream[]>([])
  const [categories, setCategories] = useState<TwitchCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setChannels([])
      setCategories([])
      setLoading(false)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([searchChannels(trimmed), searchCategories(trimmed)])
      .then(([channelResults, categoryResults]) => {
        if (cancelled) return
        setChannels(channelResults)
        setCategories(categoryResults)
      })
      .catch((loadError) => {
        if (cancelled) return
        setError(loadError instanceof Error ? loadError.message : 'error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [query])

  return { channels, categories, loading, error }
}

function useChannelVideos(userId: string) {
  const [videos, setVideos] = useState<TwitchVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getChannelVideos(userId)
      .then((result) => {
        if (!cancelled) setVideos(result)
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  return { videos, loading, error }
}

function useChannelClips(broadcasterId: string) {
  const [clips, setClips] = useState<TwitchClip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!broadcasterId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getChannelClips(broadcasterId)
      .then((result) => {
        if (!cancelled) setClips(result)
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [broadcasterId])

  return { clips, loading, error }
}

// Twitch clip `id` values are already the embeddable slug (e.g. "AwkwardSalamander...").
// Only legacy numeric ids need the slug recovered from `embed_url` instead.
function resolveClipSlug(clip: TwitchClip): string {
  const idLooksLikeSlug = /^[A-Za-z][A-Za-z0-9_-]*$/.test(clip.id)
  if (idLooksLikeSlug) return clip.id
  const fromEmbed = clip.embed_url?.match(/clip=([^&]+)/)?.[1] ?? clip.embed_url?.match(/clips\.twitch\.tv\/([^/?&]+)/)?.[1]
  return fromEmbed ? decodeURIComponent(fromEmbed) : clip.id
}

function formatClipDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString()
}

function VideoCard({ video, onPlay }: { video: TwitchVideo; onPlay: (video: TwitchVideo) => void }) {
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
      aria-label={video.title}
    >
      <div className="relative aspect-video overflow-hidden rounded-[0.75rem] bg-slate-800">
        {video.thumbnail_url ? (
          <img
            src={thumb(video.thumbnail_url, 440, 248)}
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
      </div>
      <div className="p-2.5">
        <h3 className="line-clamp-2 text-[0.8rem] font-semibold leading-snug text-white">{video.title}</h3>
        <p className="mt-0.5 text-[0.7rem] text-slate-400">{formatClipDate(video.created_at)}</p>
      </div>
    </div>
  )
}

function ClipCard({ clip, onPlay }: { clip: TwitchClip; onPlay: (clip: TwitchClip) => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onPlay(clip)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        onPlay(clip)
      }}
      className="group relative w-full overflow-hidden bg-transparent text-left transition-all duration-300 hover:-translate-y-1"
      aria-label={clip.title}
    >
      <div className="relative aspect-video overflow-hidden rounded-[0.75rem] bg-slate-800">
        {clip.thumbnail_url ? (
          <img
            src={thumb(clip.thumbnail_url, 440, 248)}
            alt={clip.title}
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
      </div>
      <div className="p-2.5">
        <h3 className="line-clamp-2 text-[0.8rem] font-semibold leading-snug text-white">{clip.title}</h3>
      </div>
    </div>
  )
}

export function TwitchChannelPage({ userId, broadcasterId, login, displayName, isLive, liveTitle }: SelectedChannel) {
  const text = useTwitchText()
  const [tab, setTab] = useState<'vods' | 'clips'>('vods')
  const { videos, loading: videosLoading, error: videosError } = useChannelVideos(userId)
  const { clips, loading: clipsLoading, error: clipsError } = useChannelClips(broadcasterId)
  const [player, setPlayer] = useState<{ kind: 'vod' | 'clip'; id: string; title: string } | null>(null)
  const [liveOpen, setLiveOpen] = useState(false)

  function tabButtonClass(key: 'vods' | 'clips') {
    return `h-9 rounded-full border px-4 text-[0.6rem] font-normal uppercase tracking-[0.2em] transition-all ${
      tab === key
        ? 'border-white/[0.24] bg-white/[0.1] text-white'
        : 'border-white/[0.1] bg-white/[0.03] text-slate-300 hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-white'
    }`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-white">{displayName || login}</h2>
          {login ? <p className="text-sm text-slate-400">@{login}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isLive ? (
            <button
              type="button"
              onClick={() => setLiveOpen(true)}
              className="flex h-9 items-center rounded-full bg-accent-500 px-4 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-accent-400"
            >
              <svg className="mr-1.5 h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              {text('watchLive')}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void openTwitchUrl(`https://www.twitch.tv/${login}`)}
            className="h-9 rounded-full border border-white/[0.14] bg-white/[0.04] px-4 text-[0.6rem] font-normal uppercase tracking-[0.2em] text-slate-200 transition-all hover:border-white/[0.24] hover:bg-white/[0.08] hover:text-white"
          >
            {text('openOnTwitch')}
          </button>
          <button type="button" onClick={() => setTab('vods')} className={tabButtonClass('vods')}>
            {text('vodsTab')}
          </button>
          <button type="button" onClick={() => setTab('clips')} className={tabButtonClass('clips')}>
            {text('clipsTab')}
          </button>
        </div>
      </div>

      {liveOpen ? (
        <TwitchPlayerModal
          kind="live"
          id={login}
          title={liveTitle || displayName || login}
          onClose={() => setLiveOpen(false)}
        />
      ) : null}

      {tab === 'vods' ? (
        videosLoading && videos.length === 0 ? (
          <p className="text-sm text-slate-400">{text('loadingVods')}</p>
        ) : videosError && videos.length === 0 ? (
          <p className="text-sm text-slate-400">{text('vodsLoadError')}</p>
        ) : videos.length === 0 ? (
          <p className="text-sm text-slate-400">{text('vodsEmpty')}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onPlay={(v) => setPlayer({ kind: 'vod', id: v.id, title: v.title })}
              />
            ))}
          </div>
        )
      ) : clipsLoading && clips.length === 0 ? (
        <p className="text-sm text-slate-400">{text('loadingClips')}</p>
      ) : clipsError && clips.length === 0 ? (
        <p className="text-sm text-slate-400">{text('clipsLoadError')}</p>
      ) : clips.length === 0 ? (
        <p className="text-sm text-slate-400">{text('clipsEmpty')}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {clips.map((clip) => (
            <ClipCard
              key={clip.id}
              clip={clip}
              onPlay={(c) => setPlayer({ kind: 'clip', id: resolveClipSlug(c), title: c.title })}
            />
          ))}
        </div>
      )}

      {player ? (
        <TwitchPlayerModal kind={player.kind} id={player.id} title={player.title} onClose={() => setPlayer(null)} />
      ) : null}
    </div>
  )
}

function ChannelDrilldown({
  channel,
  pageId,
  onNavigate,
  onBack,
  backLabel,
}: {
  channel: SelectedChannel
  pageId: string
  onNavigate: (target: { pageId: string }) => void
  onBack: () => void
  backLabel?: string
}) {
  const text = useTwitchText()
  return (
    <div className="space-y-6">
      <TwitchPageNav current="" onNavigate={onNavigate} />
      <button
        type="button"
        onClick={onBack}
        className="flex h-9 items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.03] px-4 text-[0.6rem] font-normal uppercase tracking-[0.2em] text-slate-200 transition-all hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-white"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        {backLabel ?? text('backToChannel')}
      </button>
      <TwitchChannelPage {...channel} />
    </div>
  )
}

export function TwitchSearchPage({ pageId, onNavigate }: BrowsePageProps) {
  const text = useTwitchText()
  const pageNav = <TwitchPageNav current={pageId} onNavigate={onNavigate} />
  const [inputValue, setInputValue] = useState('')
  const [query, setQuery] = useState('')
  const { channels, categories, loading, error } = useTwitchSearch(query)
  const [selectedCategory, setSelectedCategory] = useState<TwitchCategory | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<SelectedChannel | null>(null)
  const {
    streams: categoryStreams,
    loading: categoryStreamsLoading,
    error: categoryStreamsError,
    hasMore: categoryStreamsHasMore,
    loadMore: loadMoreCategoryStreams,
  } = useTwitchCategoryStreams(selectedCategory?.id ?? null)
  useEffect(() => {
    const handle = setTimeout(() => setQuery(inputValue), 400)
    return () => clearTimeout(handle)
  }, [inputValue])

  function openChannel(stream: TwitchStream) {
    setSelectedChannel(channelFromStream(stream, Boolean(stream.is_live)))
  }

  const handleNav = (target: { pageId: string }) => {
    if (target.pageId === pageId) {
      setSelectedCategory(null)
      setSelectedChannel(null)
    } else {
      onNavigate(target)
    }
  }
  const drillNav = <TwitchPageNav current="" onNavigate={handleNav} />

  const backToResults = (
    <button
      type="button"
      onClick={() => {
        setSelectedCategory(null)
        setSelectedChannel(null)
      }}
      className="flex h-9 items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.03] px-4 text-[0.6rem] font-normal uppercase tracking-[0.2em] text-slate-200 transition-all hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-white"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      {text('backToResults')}
    </button>
  )

  if (selectedChannel) {
    return (
      <div className="space-y-6">
        {drillNav}
        {backToResults}
        <TwitchChannelPage {...selectedChannel} />
      </div>
    )
  }

  if (selectedCategory) {
    const streamsBody =
      categoryStreamsLoading && categoryStreams.length === 0 ? (
        <SectionPlaceholder title={selectedCategory.name} text={text('loading')} />
      ) : categoryStreamsError && categoryStreams.length === 0 ? (
        <SectionPlaceholder title={selectedCategory.name} text={text('loadError')} />
      ) : (
        <TwitchGridShell title={selectedCategory.name}>
          {categoryStreams.length === 0 ? (
            <p className="text-sm text-slate-400">{text('streamsEmpty')}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {categoryStreams.map((stream) => (
                <StreamCard
                  key={stream.id}
                  stream={stream}
                  onPlay={(s) => setSelectedChannel(channelFromStream(s, true))}
                />
              ))}
            </div>
          )}
        </TwitchGridShell>
      )

    return (
      <div className="space-y-6">
        {drillNav}
        {backToResults}
        {streamsBody}
        {categoryStreamsHasMore && categoryStreams.length > 0 ? (
          <LoadMoreButton onClick={() => void loadMoreCategoryStreams()} label={text('loadMore')} />
        ) : null}
      </div>
    )
  }

  const trimmedQuery = query.trim()
  const hasResults = channels.length > 0 || categories.length > 0

  return (
    <div className="space-y-6">
      {pageNav}
      <div>
        <h2 className="text-2xl font-semibold text-white">{text('searchTitle')}</h2>
        <p className="mt-1 text-sm text-slate-400">{text('searchSubtitle')}</p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          setQuery(inputValue)
        }}
      >
        <input
          type="search"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder={text('searchPlaceholder')}
          className="h-11 w-full rounded-full border border-white/[0.1] bg-white/[0.04] px-5 text-sm text-white placeholder:text-slate-500 outline-none transition-all focus:border-white/[0.2] focus:bg-white/[0.06] sm:max-w-md"
        />
      </form>

      {!trimmedQuery ? (
        <p className="text-sm text-slate-400">{text('searchPrompt')}</p>
      ) : loading && !hasResults ? (
        <p className="text-sm text-slate-400">{text('searching')}</p>
      ) : error && !hasResults ? (
        <p className="text-sm text-slate-400">{text('searchError')}</p>
      ) : !hasResults ? (
        <p className="text-sm text-slate-400">{text('searchNoResults')}</p>
      ) : (
        <div className="space-y-8">
          {channels.length > 0 ? (
            <TwitchGridShell title={text('channelsHeading')}>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {channels.map((stream) => (
                  <StreamCard key={stream.id} stream={stream} onPlay={openChannel} />
                ))}
              </div>
            </TwitchGridShell>
          ) : null}

          {categories.length > 0 ? (
            <TwitchGridShell title={text('categoriesHeading')}>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                {categories.map((category) => (
                  <CategoryCard key={category.id} category={category} onSelect={setSelectedCategory} />
                ))}
              </div>
            </TwitchGridShell>
          ) : null}
        </div>
      )}
    </div>
  )
}

function TwitchHomeRowShell({
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

export function TwitchLiveRow({
  onNavigate,
  layout = 'slider',
  count = 16,
  sliderCardWidth = 'calc((100% - 3 * 0.75rem) / 4)',
}: HomeRowProps) {
  const text = useTwitchText()
  const { active, setNode } = useDeferredActivation()
  const { streams, error } = useTwitchTopStreams(active)
  const [playerStream, setPlayerStream] = useState<TwitchStream | null>(null)

  if (error) return null

  return (
    <div ref={setNode}>
      <TwitchHomeRowShell
        title={text('liveNowTitle')}
        subtitle={text('liveNowSubtitle')}
        onOpenAll={() => onNavigate({ pageId: 'twitch-live' })}
      >
        <div
          className={layout === 'slider' ? 'flex gap-3 overflow-x-auto pb-3' : 'grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4'}
          style={layout === 'slider' ? { scrollbarWidth: 'none', msOverflowStyle: 'none' } : undefined}
        >
          {active ? streams.slice(0, count).map((stream) => (
            <div
              key={stream.id}
              className={layout === 'slider' ? 'flex-none' : 'w-full'}
              style={layout === 'slider' ? { width: sliderCardWidth } : undefined}
            >
              <StreamCard stream={stream} onPlay={setPlayerStream} />
            </div>
          )) : Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className={`animate-pulse rounded-[1.5rem] bg-slate-800/50 ${layout === 'slider' ? 'aspect-video flex-none' : 'aspect-video'}`}
              style={layout === 'slider' ? { width: sliderCardWidth } : undefined}
            />
          ))}
        </div>
      </TwitchHomeRowShell>
      {playerStream ? (
        <TwitchPlayerModal
          kind="live"
          id={playerStream.user_login}
          title={playerStream.title}
          onClose={() => setPlayerStream(null)}
        />
      ) : null}
    </div>
  )
}

export function TwitchFollowingRow({
  onNavigate,
  layout = 'slider',
  count = 16,
  sliderCardWidth = 'calc((100% - 3 * 0.75rem) / 4)',
}: HomeRowProps) {
  const text = useTwitchText()
  const session = useTwitchSessionState()
  const valid = isTwitchSessionValid(session)
  const { active, setNode } = useDeferredActivation()
  const { streams, error } = useTwitchFollowedStreams(
    active && valid,
    valid ? session!.userId : null,
    valid ? session!.accessToken : null,
  )
  const [playerStream, setPlayerStream] = useState<TwitchStream | null>(null)

  if (!valid) return null
  if (error) return null

  return (
    <div ref={setNode}>
      <TwitchHomeRowShell
        title={text('followingTitle')}
        subtitle={text('followingSubtitle')}
        onOpenAll={() => onNavigate({ pageId: 'twitch-following' })}
      >
        <div
          className={layout === 'slider' ? 'flex gap-3 overflow-x-auto pb-3' : 'grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4'}
          style={layout === 'slider' ? { scrollbarWidth: 'none', msOverflowStyle: 'none' } : undefined}
        >
          {active ? streams.slice(0, count).map((stream) => (
            <div
              key={stream.id}
              className={layout === 'slider' ? 'flex-none' : 'w-full'}
              style={layout === 'slider' ? { width: sliderCardWidth } : undefined}
            >
              <StreamCard stream={stream} onPlay={setPlayerStream} />
            </div>
          )) : Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className={`animate-pulse rounded-[1.5rem] bg-slate-800/50 ${layout === 'slider' ? 'aspect-video flex-none' : 'aspect-video'}`}
              style={layout === 'slider' ? { width: sliderCardWidth } : undefined}
            />
          ))}
        </div>
      </TwitchHomeRowShell>
      {playerStream ? (
        <TwitchPlayerModal
          kind="live"
          id={playerStream.user_login}
          title={playerStream.title}
          onClose={() => setPlayerStream(null)}
        />
      ) : null}
    </div>
  )
}

export function TwitchHero({ onNavigate, onActiveChange, onBackdropChange }: PluginHeroProps) {
  const text = useTwitchText()
  const heroEnabled = useTwitchHeroEnabled()
  const { streams } = useTwitchTopStreams(heroEnabled)
  const [playerStream, setPlayerStream] = useState<TwitchStream | null>(null)
  const stream = heroEnabled ? streams[0] ?? null : null

  useEffect(() => {
    onActiveChange(Boolean(stream))
    onBackdropChange(stream ? thumb(stream.thumbnail_url, 1920, 1080) : null)
    return () => {
      onActiveChange(false)
      onBackdropChange(null)
    }
  }, [stream, onActiveChange, onBackdropChange])

  if (!heroEnabled || !stream) return null

  return (
    <div className="relative mb-4" style={{ minHeight: 380 }}>
      <div className="flex h-full min-h-[380px] flex-col justify-end p-6 sm:p-8 md:max-w-[60%]">
        <div className="mb-3 flex flex-wrap gap-1.5">
          <span className="rounded-full border border-rose-400/30 bg-rose-600/85 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
            {text('live')}
          </span>
          <button
            type="button"
            onClick={() => onNavigate({ pageId: 'twitch-live' })}
            className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-300 transition hover:border-white/30 hover:bg-white/20 hover:text-white"
          >
            Twitch
          </button>
        </div>

        <h2 className="mb-1 text-3xl font-bold leading-tight text-white drop-shadow-lg sm:text-4xl">
          {stream.user_name}
        </h2>

        <div className="mb-3 flex items-center gap-3 text-sm text-slate-300">
          {stream.game_name ? <span>{stream.game_name}</span> : null}
          {Number.isFinite(stream.viewer_count) ? <span>{formatViewerCount(stream.viewer_count as number)}</span> : null}
        </div>

        <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-slate-300/80 sm:text-base">
          {stream.title}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPlayerStream(stream)}
            className="flex h-10 items-center rounded-full bg-accent-500 px-6 text-sm font-semibold text-white transition hover:bg-accent-400"
          >
            <svg className="mr-1.5 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            {text('watchNow')}
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ pageId: 'twitch-live' })}
            className="h-10 rounded-full border border-white/20 bg-white/[0.06] px-6 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            {text('browseLive')}
          </button>
        </div>
      </div>
      {playerStream ? (
        <TwitchPlayerModal
          kind="live"
          id={playerStream.user_login}
          title={playerStream.title}
          onClose={() => setPlayerStream(null)}
        />
      ) : null}
    </div>
  )
}
