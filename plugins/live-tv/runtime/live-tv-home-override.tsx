'use client'

import { useEffect, useMemo, useState, type ComponentType } from 'react'
import type { HomeOverrideProps } from '@/lib/plugin-sdk'
import { LiveTvGrid } from './live-tv-grid'
import { LiveTvLogoImage } from './live-tv-logo-image'
import { NowNextLaterRow } from './now-next-later-row'
import {
  getLiveTvLists,
  getLiveTvLogoSrc,
  onLiveTvListsChanged,
  type LiveTvList,
  type M3uChannel,
} from './live-tv-data'

interface FocusedTarget {
  list: LiveTvList
  channel: M3uChannel
  index: number
  total: number
}

const PLACEHOLDER_NAME_RE = /^[\s=\-_*•·]+|=+/

function isPlayableChannel(channel: M3uChannel): boolean {
  if (!channel.url) return false
  const trimmedName = channel.name.trim()
  if (!trimmedName) return false
  // Common iptv-list separators look like "=== Sweden [SE] ===" / "── Sweden ──"
  // and have no real stream. Filter them out so the hero focuses something useful.
  if (PLACEHOLDER_NAME_RE.test(trimmedName) && !channel.tvgId) return false
  return true
}

function preferredChannels(lists: LiveTvList[]): Array<{ list: LiveTvList; channels: M3uChannel[] }> {
  return lists
    .map((list) => ({ list, channels: list.channels.filter(isPlayableChannel) }))
    .filter((entry) => entry.channels.length > 0)
}

export function LiveTvHomeOverride(_props: HomeOverrideProps) {
  const [lists, setLists] = useState<LiveTvList[]>([])
  const [focusedKey, setFocusedKey] = useState<string | null>(null)
  const [LiveTvPlayerComponent, setLiveTvPlayerComponent] = useState<
    ComponentType<{
      channel: M3uChannel
      onClose: () => void
      listId?: string | null
      epgUrls?: string[]
    }> | null
  >(null)
  const [activeChannel, setActiveChannel] = useState<M3uChannel | null>(null)
  const [activeList, setActiveList] = useState<LiveTvList | null>(null)

  useEffect(() => {
    const sync = () => setLists(getLiveTvLists())
    sync()
    return onLiveTvListsChanged(sync)
  }, [])

  const flat = useMemo(() => {
    const entries = preferredChannels(lists)
    if (entries.length === 0) return [] as Array<{ list: LiveTvList; channel: M3uChannel }>
    return entries.flatMap((entry) => entry.channels.map((channel) => ({ list: entry.list, channel })))
  }, [lists])

  const focused: FocusedTarget | null = useMemo(() => {
    if (flat.length === 0) return null
    let idx = flat.findIndex((entry) => `${entry.list.id}::${entry.channel.url}` === focusedKey)
    if (idx < 0) {
      // Default to first channel with tvgId across all lists, falling back
      // to the first playable channel.
      idx = flat.findIndex((entry) => Boolean(entry.channel.tvgId))
      if (idx < 0) idx = 0
    }
    const hit = flat[idx]
    return { list: hit.list, channel: hit.channel, index: idx, total: flat.length }
  }, [flat, focusedKey])

  useEffect(() => {
    if (!activeChannel || LiveTvPlayerComponent) return
    let cancelled = false
    void import('./live-tv-player')
      .then((mod) => {
        if (!cancelled) setLiveTvPlayerComponent(() => mod.LiveTvPlayer)
      })
      .catch(() => {
        if (!cancelled) setActiveChannel(null)
      })
    return () => {
      cancelled = true
    }
  }, [activeChannel, LiveTvPlayerComponent])

  function moveFocus(delta: number) {
    if (!focused || flat.length === 0) return
    const next = (focused.index + delta + flat.length) % flat.length
    const target = flat[next]
    setFocusedKey(`${target.list.id}::${target.channel.url}`)
  }

  function playFocused() {
    if (!focused) return
    setActiveList(focused.list)
    setActiveChannel(focused.channel)
  }

  const epgUrls = useMemo(() => {
    if (!focused) return [] as string[]
    return [focused.list.urlTvg, ...focused.list.epgUrls].filter(
      (url): url is string => Boolean(url),
    )
  }, [focused])

  const activeEpgUrls = useMemo(() => {
    if (!activeList) return [] as string[]
    return [activeList.urlTvg, ...activeList.epgUrls].filter(
      (url): url is string => Boolean(url),
    )
  }, [activeList])

  return (
    <div className="space-y-6">
      {focused ? (
        <div className="space-y-3 rounded-3xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex flex-wrap items-center gap-3">
            {(() => {
              const logoSrc = getLiveTvLogoSrc(focused.channel.logo)
              return logoSrc ? (
                <LiveTvLogoImage
                  src={logoSrc}
                  alt=""
                  className="h-10 w-10 rounded object-contain bg-slate-800/90 p-1"
                />
              ) : null
            })()}
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-white">{focused.channel.name}</p>
              {focused.channel.group ? (
                <p className="truncate text-xs text-slate-400">{focused.channel.group}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.22em] text-white/40">
                {focused.index + 1} / {focused.total}
              </span>
              <button
                type="button"
                onClick={() => moveFocus(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:border-white/35 hover:bg-white/10"
                aria-label="Föregående kanal"
                title="Föregående kanal"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => moveFocus(1)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:border-white/35 hover:bg-white/10"
                aria-label="Nästa kanal"
                title="Nästa kanal"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={playFocused}
                className="flex h-9 items-center gap-2 rounded-full border border-emerald-300/60 bg-emerald-400/15 px-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100 transition hover:border-emerald-200/80 hover:bg-emerald-400/25"
              >
                <svg className="h-3.5 w-3.5 translate-x-[1px]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Spela
              </button>
            </div>
          </div>
          <NowNextLaterRow
            channel={focused.channel}
            listId={focused.list.id}
            urls={epgUrls}
          />
        </div>
      ) : null}
      <LiveTvGrid />
      {activeChannel && LiveTvPlayerComponent ? (
        <LiveTvPlayerComponent
          channel={activeChannel}
          onClose={() => {
            setActiveChannel(null)
            setActiveList(null)
          }}
          listId={activeList?.id ?? null}
          epgUrls={activeEpgUrls}
        />
      ) : null}
    </div>
  )
}
