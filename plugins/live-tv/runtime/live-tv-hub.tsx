'use client'

import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { onPluginStorageChanged } from '@/lib/plugin-sdk'
import { LiveTvLogoImage } from './live-tv-logo-image'
import { useLiveTvEpgCache } from './hooks/useLiveTvEpgCache'
import { computeNowNextLater } from './epg/lookup'
import { buildNameToTvgIdIndex, resolveTvgId } from './epg/name-match'
import type { EpgProgramme, NowNextLater } from './epg/types'
import { useHubText } from './hub-strings'
import {
  getChannelHistory,
  onChannelHistoryChanged,
  topGroupsFromHistory,
  type ChannelHistoryEntry,
} from './channel-history'
import {
  LIVE_TV_GLOBAL_EPG_ID,
  LIVE_TV_PLUGIN_ID,
  channelKey,
  getAllLiveTvEpgUrls,
  getLiveTvLists,
  getLiveTvLogoSrc,
  getPinnedLiveTvKeys,
  onLiveTvListsChanged,
  onPinnedLiveTvKeysChanged,
  togglePinnedLiveTvChannel,
  type LiveTvList,
  type M3uChannel,
} from './live-tv-data'

/**
 * Live TV-hubben (handoff §1): nu spelas, favoriter, fortsätt titta,
 * rekommenderat, alla kanaler. Allt underlag är lokalt (kanallistor,
 * EPG-cachen som redan hämtas, kanalhistorik) — hubben lägger inga nya
 * uppslag mot leverantörer.
 */

const EMPTY: NowNextLater = { now: null, next: null, later: null }
const PLACEHOLDER_NAME_RE = /^[\s=\-_*•·]+|=+/
const MAX_GROUP_CHIPS = 8
const MAX_FAVORITES = 12
const MAX_RECOMMENDED = 12
const MAX_ALL_CHANNELS = 48

interface Props {
  onOpenGrid: () => void
}

type PlayerComponent = ComponentType<{
  channel: M3uChannel
  onClose: () => void
  listId?: string | null
  epgUrls?: string[]
}>

type GuideComponent = ComponentType<{
  open: boolean
  onClose: () => void
  onPlayChannel: (channel: M3uChannel) => void
}>

function isPlayableChannel(channel: M3uChannel): boolean {
  if (!channel.url) return false
  const trimmedName = channel.name.trim()
  if (!trimmedName) return false
  if (PLACEHOLDER_NAME_RE.test(trimmedName) && !channel.tvgId) return false
  return true
}

export function flattenChannels(lists: LiveTvList[]): M3uChannel[] {
  const seen = new Set<string>()
  const out: M3uChannel[] = []
  for (const list of lists) {
    for (const channel of list.channels) {
      if (!isPlayableChannel(channel)) continue
      const key = channelKey(channel)
      if (seen.has(key)) continue
      seen.add(key)
      out.push(channel)
    }
  }
  return out
}

export function topGroups(channels: M3uChannel[], limit = MAX_GROUP_CHIPS): string[] {
  const counts = new Map<string, number>()
  for (const channel of channels) {
    const group = channel.group?.trim()
    if (!group) continue
    counts.set(group, (counts.get(group) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([group]) => group)
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const letters = words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? '')
  return letters.join('') || '•'
}

function progressOf(programme: EpgProgramme | null, nowMs: number): number {
  if (!programme || programme.stop <= programme.start) return 0
  return Math.min(1, Math.max(0, (nowMs - programme.start) / (programme.stop - programme.start)))
}

function ChannelLogo({ channel, className }: { channel: M3uChannel; className: string }) {
  const [failed, setFailed] = useState(false)
  const src = getLiveTvLogoSrc(channel.logo)
  if (src && !failed) {
    return (
      <LiveTvLogoImage
        src={src}
        alt=""
        className={`${className} rounded object-contain bg-slate-800/90 p-1`}
        onError={() => setFailed(true)}
      />
    )
  }
  return (
    <div
      className={`${className} flex items-center justify-center rounded bg-slate-800/90 text-[11px] font-semibold text-white/70`}
      aria-hidden="true"
    >
      {initials(channel.name)}
    </div>
  )
}

function LiveTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-200">
      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
      {label}
    </span>
  )
}

function HeartButton({
  pinned,
  onToggle,
  labelPin,
  labelUnpin,
  className = '',
}: {
  pinned: boolean
  onToggle: () => void
  labelPin: string
  labelUnpin: string
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
      aria-pressed={pinned}
      aria-label={pinned ? labelUnpin : labelPin}
      title={pinned ? labelUnpin : labelPin}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:border-white/30 hover:text-white ${className}`}
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill={pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d="M12 21s-7-4.6-9.3-9A5.2 5.2 0 0 1 12 6.4 5.2 5.2 0 0 1 21.3 12C19 16.4 12 21 12 21z" />
      </svg>
    </button>
  )
}

function Section({
  title,
  count,
  action,
  children,
}: {
  title: string
  count?: number
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-baseline gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
          {title}
          {typeof count === 'number' ? <span className="text-xs font-normal tracking-normal text-white/40">{count}</span> : null}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}

export function LiveTvHub({ onOpenGrid }: Props) {
  const { h, locale } = useHubText()
  const [lists, setLists] = useState<LiveTvList[]>(() => getLiveTvLists())
  const [pinnedKeys, setPinnedKeys] = useState<string[]>(() => getPinnedLiveTvKeys())
  const [history, setHistory] = useState<ChannelHistoryEntry[]>(() => getChannelHistory())
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [activeChannel, setActiveChannel] = useState<M3uChannel | null>(null)
  const [PlayerComponent, setPlayerComponent] = useState<PlayerComponent | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [GuideComponentState, setGuideComponent] = useState<GuideComponent | null>(null)

  useEffect(() => {
    const sync = () => setLists(getLiveTvLists())
    sync()
    return onLiveTvListsChanged(sync)
  }, [])
  useEffect(() => onPinnedLiveTvKeysChanged(() => setPinnedKeys(getPinnedLiveTvKeys())), [])
  useEffect(() => onChannelHistoryChanged(() => setHistory(getChannelHistory())), [])
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  // Spelaren och guiden laddas först när de behövs (samma mönster som hemvyn).
  useEffect(() => {
    if (!activeChannel || PlayerComponent) return
    let cancelled = false
    void import('./live-tv-player')
      .then((mod) => {
        if (!cancelled) setPlayerComponent(() => mod.LiveTvPlayer)
      })
      .catch(() => {
        if (!cancelled) setActiveChannel(null)
      })
    return () => {
      cancelled = true
    }
  }, [activeChannel, PlayerComponent])
  useEffect(() => {
    if (!guideOpen || GuideComponentState) return
    let cancelled = false
    void import('./live-tv-guide')
      .then((mod) => {
        if (!cancelled) setGuideComponent(() => mod.LiveTvGuide)
      })
      .catch(() => {
        if (!cancelled) setGuideOpen(false)
      })
    return () => {
      cancelled = true
    }
  }, [guideOpen, GuideComponentState])

  const channels = useMemo(() => flattenChannels(lists), [lists])
  const byKey = useMemo(() => new Map(channels.map((channel) => [channelKey(channel), channel])), [channels])
  const groups = useMemo(() => topGroups(channels), [channels])
  const effectiveGroup = activeGroup && groups.includes(activeGroup) ? activeGroup : null

  const epgUrls = useMemo(() => getAllLiveTvEpgUrls(lists), [lists])
  const epgListId = epgUrls.length > 0 ? LIVE_TV_GLOBAL_EPG_ID : null
  const cache = useLiveTvEpgCache(epgListId, epgUrls)
  // Ett namnindex för hela hubben i stället för ett per kort.
  const nameIndex = useMemo(() => (cache ? buildNameToTvgIdIndex(cache) : new Map<string, string>()), [cache])
  const nowFor = useMemo(() => {
    const memo = new Map<string, NowNextLater>()
    return (channel: M3uChannel): NowNextLater => {
      if (!cache) return EMPTY
      const key = channelKey(channel)
      const hit = memo.get(key)
      if (hit) return hit
      const tvgId = resolveTvgId(channel.tvgId, channel.name, nameIndex)
      const value = tvgId ? computeNowNextLater(cache, tvgId, nowMs) : EMPTY
      memo.set(key, value)
      return value
    }
  }, [cache, nameIndex, nowMs])

  const pinnedSet = useMemo(() => new Set(pinnedKeys), [pinnedKeys])
  const favorites = useMemo(
    () =>
      pinnedKeys
        .map((key) => byKey.get(key))
        .filter((channel): channel is M3uChannel => Boolean(channel))
        .filter((channel) => !effectiveGroup || channel.group === effectiveGroup)
        .slice(0, MAX_FAVORITES),
    [pinnedKeys, byKey, effectiveGroup],
  )
  const recent = useMemo(
    () =>
      history.map((entry) => ({
        entry,
        channel:
          byKey.get(entry.key) ??
          ({ name: entry.name, url: entry.url, group: entry.group, logo: entry.logo, tvgId: entry.tvgId } as M3uChannel),
      })),
    [history, byKey],
  )
  const recommended = useMemo(() => {
    const preferredGroups = topGroupsFromHistory(history)
    if (preferredGroups.length === 0) return [] as Array<{ channel: M3uChannel; group: string }>
    const skip = new Set([...pinnedKeys, ...history.map((entry) => entry.key)])
    const out: Array<{ channel: M3uChannel; group: string }> = []
    for (const group of preferredGroups) {
      for (const channel of channels) {
        if (channel.group !== group || skip.has(channelKey(channel))) continue
        out.push({ channel, group })
        if (out.length >= MAX_RECOMMENDED) return out
      }
    }
    return out
  }, [history, pinnedKeys, channels])
  const filteredChannels = useMemo(
    () => (effectiveGroup ? channels.filter((channel) => channel.group === effectiveGroup) : channels),
    [channels, effectiveGroup],
  )

  const hero = useMemo(() => {
    const withProgramme = favorites.find((channel) => nowFor(channel).now)
    return (
      withProgramme ??
      favorites[0] ??
      recent[0]?.channel ??
      channels.find((channel) => nowFor(channel).now) ??
      channels.find((channel) => Boolean(channel.tvgId)) ??
      channels[0] ??
      null
    )
  }, [favorites, recent, channels, nowFor])

  const formatTime = (ms: number) => new Date(ms).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  const formatWatched = (ms: number) => {
    const sameDay = new Date(ms).toDateString() === new Date(nowMs).toDateString()
    const time = formatTime(ms)
    return h('hubWatchedAt', { time: sameDay ? time : `${h('hubYesterday')} ${time}` })
  }
  const play = (channel: M3uChannel) => setActiveChannel(channel)
  const togglePin = (channel: M3uChannel) => setPinnedKeys(togglePinnedLiveTvChannel(channel))

  const header = (
    <div className="flex flex-wrap items-center gap-3">
      <h2 className="text-xl font-semibold text-white">{h('hubTitle')}</h2>
      {groups.length > 0 ? (
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {[null, ...groups].map((group) => {
            const selected = group === effectiveGroup
            return (
              <button
                key={group ?? '__all'}
                type="button"
                onClick={() => setActiveGroup(group)}
                aria-pressed={selected}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  selected
                    ? 'border-white/60 bg-white/15 text-white'
                    : 'border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:text-white'
                }`}
              >
                {group ?? h('hubAllGroups')}
              </button>
            )
          })}
        </div>
      ) : null}
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
        >
          {h('hubOpenGuide')}
        </button>
        <button
          type="button"
          onClick={onOpenGrid}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
        >
          {h('hubOpenGrid')}
        </button>
      </div>
    </div>
  )

  if (channels.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-base font-semibold text-white">{h('hubEmptyTitle')}</p>
          <p className="mt-1 text-sm text-slate-400">{h('hubEmptyBody')}</p>
        </div>
      </div>
    )
  }

  const heroInfo = hero ? nowFor(hero) : EMPTY
  const heroProgress = progressOf(heroInfo.now, nowMs)

  return (
    <div className="space-y-6">
      {header}

      {hero ? (
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-800/90 to-slate-950 p-5 lg:col-span-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {heroInfo.now ? <LiveTag label={h('hubLive')} /> : null}
                {hero.group ? (
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white/60">
                    {hero.group}
                  </span>
                ) : null}
              </div>
              <HeartButton
                pinned={pinnedSet.has(channelKey(hero))}
                onToggle={() => togglePin(hero)}
                labelPin={h('hubPin')}
                labelUnpin={h('hubUnpin')}
              />
            </div>
            <div className="mt-4 flex items-center gap-4">
              <ChannelLogo channel={hero} className="h-14 w-14" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-2xl font-semibold text-white sm:text-3xl">{heroInfo.now?.title ?? hero.name}</p>
                <p className="mt-1 truncate text-sm text-white/70">
                  {heroInfo.now
                    ? `${hero.name} · ${formatTime(heroInfo.now.start)}–${formatTime(heroInfo.now.stop)}`
                    : h('hubNoProgramme')}
                </p>
              </div>
            </div>
            {heroInfo.now ? (
              <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.round(heroProgress * 100)}%` }} />
              </div>
            ) : null}
            {heroInfo.next ? (
              <p className="mt-2 truncate text-xs text-white/50">
                {h('hubNext')}: {formatTime(heroInfo.next.start)} · {heroInfo.next.title}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => play(hero)}
                className="flex h-10 items-center gap-2 rounded-full border border-emerald-300/60 bg-emerald-400/15 px-5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100 transition hover:bg-emerald-400/25"
              >
                <svg className="h-3.5 w-3.5 translate-x-[1px]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                {h('hubWatchNow')}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.02] p-5 text-left transition hover:border-white/30 lg:col-span-2"
          >
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">{h('hubGuideKicker')}</p>
              <p className="mt-2 text-lg font-semibold text-white">{h('hubGuideTitle')}</p>
              <p className="mt-2 text-sm text-slate-400">{h('hubGuideBody')}</p>
            </div>
            <span className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-white/10 px-5 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              {h('hubOpenGuide')}
            </span>
          </button>
        </div>
      ) : null}

      <Section title={h('hubFavorites')} count={favorites.length}>
        {favorites.length === 0 ? (
          <p className="text-sm text-slate-400">{h('hubFavoritesEmpty')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {favorites.map((channel) => {
              const info = nowFor(channel)
              return (
                <div
                  key={channelKey(channel)}
                  role="button"
                  tabIndex={0}
                  onClick={() => play(channel)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      play(channel)
                    }
                  }}
                  className="group flex cursor-pointer flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-3 transition hover:border-white/30"
                >
                  <div className="flex items-center gap-3">
                    <ChannelLogo channel={channel} className="h-10 w-10" />
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{channel.name}</p>
                    <HeartButton
                      pinned
                      onToggle={() => togglePin(channel)}
                      labelPin={h('hubPin')}
                      labelUnpin={h('hubUnpin')}
                    />
                  </div>
                  {info.now ? (
                    <div className="flex items-center gap-2">
                      <LiveTag label={h('hubLive')} />
                      <p className="truncate text-xs text-white/80">{info.now.title}</p>
                    </div>
                  ) : (
                    <p className="truncate text-xs text-white/40">{channel.group}</p>
                  )}
                  {info.next ? (
                    <p className="truncate text-[11px] text-white/50">
                      {h('hubNext')}: {formatTime(info.next.start)} · {info.next.title}
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </Section>

      <Section title={h('hubContinue')} count={recent.length}>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-400">{h('hubContinueEmpty')}</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recent.map(({ entry, channel }) => {
              const info = nowFor(channel)
              return (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => play(channel)}
                  className="w-56 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] text-left transition hover:border-white/30"
                >
                  <div className="relative flex h-28 items-center justify-center bg-gradient-to-br from-slate-800/80 to-slate-950">
                    <ChannelLogo channel={channel} className="h-12 w-12" />
                    <span className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white">
                      <svg className="h-3 w-3 translate-x-[1px]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                    {info.now ? (
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
                        <div className="h-full bg-emerald-400" style={{ width: `${Math.round(progressOf(info.now, nowMs) * 100)}%` }} />
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-0.5 p-3">
                    <p className="truncate text-sm font-semibold text-white">{info.now?.title ?? channel.name}</p>
                    <p className="truncate text-[11px] text-white/60">
                      {channel.name}
                      {channel.group ? ` · ${channel.group}` : ''}
                    </p>
                    <p className="truncate text-[11px] text-white/40">{formatWatched(entry.watchedAt)}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </Section>

      {recommended.length > 0 ? (
        <Section title={h('hubRecommended')}>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recommended.map(({ channel, group }) => {
              const info = nowFor(channel)
              return (
                <button
                  key={channelKey(channel)}
                  type="button"
                  onClick={() => play(channel)}
                  className="w-60 shrink-0 rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-left transition hover:border-white/30"
                >
                  <p className="truncate text-[10px] uppercase tracking-[0.18em] text-white/40">
                    {h('hubRecommendedBecause', { group })}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <ChannelLogo channel={channel} className="h-10 w-10" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{channel.name}</p>
                      <p className="truncate text-[11px] text-white/60">
                        {info.now ? `${formatTime(info.now.start)} · ${info.now.title}` : channel.group}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </Section>
      ) : null}

      <Section
        title={h('hubAllChannels')}
        count={filteredChannels.length}
        action={
          filteredChannels.length > MAX_ALL_CHANNELS ? (
            <button
              type="button"
              onClick={onOpenGrid}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 transition hover:border-white/30 hover:text-white"
            >
              {h('hubShowAllInGrid', { count: filteredChannels.length })}
            </button>
          ) : null
        }
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {filteredChannels.slice(0, MAX_ALL_CHANNELS).map((channel) => {
            const info = nowFor(channel)
            return (
              <button
                key={channelKey(channel)}
                type="button"
                onClick={() => play(channel)}
                className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-2 py-1.5 text-left transition hover:border-white/30"
              >
                <ChannelLogo channel={channel} className="h-8 w-8" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white">{channel.name}</p>
                  <p className="truncate text-[11px] text-white/50">{info.now?.title ?? channel.group}</p>
                </div>
              </button>
            )
          })}
        </div>
      </Section>

      {activeChannel && PlayerComponent ? (
        <PlayerComponent
          channel={activeChannel}
          onClose={() => setActiveChannel(null)}
          listId={epgListId}
          epgUrls={epgUrls}
        />
      ) : null}

      {guideOpen && GuideComponentState ? (
        <GuideComponentState
          open={guideOpen}
          onClose={() => setGuideOpen(false)}
          onPlayChannel={(channel) => {
            setGuideOpen(false)
            setActiveChannel(channel)
          }}
        />
      ) : null}
    </div>
  )
}

// Oanvänd import hålls medvetet: onPluginStorageChanged re-exporteras för
// tester som vill lyssna på hubbens nycklar via samma väg som datalagret.
void onPluginStorageChanged
