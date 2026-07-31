'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useLang, type BrowsePageProps, type HomeRowProps, type PluginHeroProps } from '@/lib/plugin-sdk'
import { getTopStreams, thumb } from './twitch-client'
import { TwitchPlayerModal } from './twitch-player'
import type { TwitchStream } from './twitch-types'

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

function useTwitchTopStreams(active: boolean) {
  const [streams, setStreams] = useState<TwitchStream[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getTopStreams()
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
  }, [active])

  async function loadMore() {
    if (!cursor) return
    try {
      const result = await getTopStreams(cursor)
      setStreams((current) => [...current, ...result.streams])
      setCursor(result.cursor ?? null)
    } catch {
      // Keep current results on load-more failure; the button remains visible for retry.
    }
  }

  return { streams, loading, error, hasMore: Boolean(cursor), loadMore }
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
        <div className="absolute right-2 top-2 rounded-full border border-white/12 bg-black/50 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-200 backdrop-blur-sm">
          {formatViewerCount(stream.viewer_count)}
        </div>
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

export function TwitchBrowsePage({ onNavigate: _onNavigate }: BrowsePageProps) {
  const text = useTwitchText()
  const { streams, loading, error, hasMore, loadMore } = useTwitchTopStreams(true)
  const [playerStream, setPlayerStream] = useState<TwitchStream | null>(null)

  if (loading && streams.length === 0) {
    return <SectionPlaceholder title={text('liveNowTitle')} text={text('loading')} />
  }

  if (error && streams.length === 0) {
    return <SectionPlaceholder title={text('liveNowTitle')} text={text('loadError')} />
  }

  return (
    <div className="space-y-8">
      <TwitchGridShell title={text('liveNowTitle')} subtitle={text('liveNowSubtitle')}>
        {streams.length === 0 ? (
          <p className="text-sm text-slate-400">{text('empty')}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {streams.map((stream) => (
              <StreamCard key={stream.id} stream={stream} onPlay={setPlayerStream} />
            ))}
          </div>
        )}
      </TwitchGridShell>

      {hasMore ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => void loadMore()}
            className="h-10 rounded-full border border-white/[0.1] bg-white/[0.04] px-5 text-[0.65rem] font-normal uppercase tracking-[0.2em] text-slate-200 transition-all hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white"
          >
            {text('browseLive')}
          </button>
        </div>
      ) : null}

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

export function TwitchHero({ onNavigate, onActiveChange, onBackdropChange }: PluginHeroProps) {
  const text = useTwitchText()
  const { streams } = useTwitchTopStreams(true)
  const [playerStream, setPlayerStream] = useState<TwitchStream | null>(null)
  const stream = streams[0] ?? null

  useEffect(() => {
    onActiveChange(Boolean(stream))
    onBackdropChange(stream ? thumb(stream.thumbnail_url, 1920, 1080) : null)
    return () => {
      onActiveChange(false)
      onBackdropChange(null)
    }
  }, [stream, onActiveChange, onBackdropChange])

  if (!stream) return null

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
          <span>{formatViewerCount(stream.viewer_count)}</span>
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
