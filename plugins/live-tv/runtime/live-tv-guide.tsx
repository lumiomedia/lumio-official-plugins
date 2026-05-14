'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { LiveTvLogoImage } from './live-tv-logo-image'
import { useLiveTvEpgCache } from './hooks/useLiveTvEpgCache'
import { buildNameToTvgIdIndex, resolveTvgId } from './epg/name-match'
import {
  getAllLiveTvEpgUrls,
  getLiveTvLists,
  getLiveTvLogoSrc,
  LIVE_TV_GLOBAL_EPG_ID,
  onLiveTvListsChanged,
  type LiveTvList,
  type M3uChannel,
} from './live-tv-data'
import type { EpgProgramme } from './epg/types'

interface Props {
  open: boolean
  onClose: () => void
  onPlayChannel: (channel: M3uChannel, list: LiveTvList) => void
}

const ROW_HEIGHT = 56
const HOUR_WIDTH = 240 // px per hour
const PIXELS_PER_MS = HOUR_WIDTH / 3_600_000
const HEAD_HEIGHT = 32
const CHANNEL_COL_WIDTH = 220
const WINDOW_HOURS_BEFORE = 1
const WINDOW_HOURS_TOTAL = 12

function alignToHalfHour(ms: number): number {
  const date = new Date(ms)
  date.setMinutes(date.getMinutes() < 30 ? 0 : 30, 0, 0)
  return date.getTime()
}

function formatHour(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatRemaining(stopMs: number, now: number): string {
  const mins = Math.max(0, Math.round((stopMs - now) / 60_000))
  if (mins >= 60) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  return `${mins}m`
}

interface ChannelRow {
  channel: M3uChannel
  list: LiveTvList
  programmes: EpgProgramme[]
}

export function LiveTvGuide({ open, onClose, onPlayChannel }: Props) {
  const [lists, setLists] = useState<LiveTvList[]>(() => getLiveTvLists())
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [nowTick, setNowTick] = useState(() => Date.now())
  const [selectedChannel, setSelectedChannel] = useState<M3uChannel | null>(null)
  const [channelFilter, setChannelFilter] = useState<M3uChannel | null>(null)
  const [selectedProgramme, setSelectedProgramme] = useState<EpgProgramme | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const channelListRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sync = () => setLists(getLiveTvLists())
    sync()
    return onLiveTvListsChanged(sync)
  }, [])

  // Track time so the now-line / progress bars stay accurate.
  useEffect(() => {
    if (!open) return
    const ms = 60_000 - (Date.now() % 60_000)
    const id = window.setTimeout(function tick() {
      setNowTick(Date.now())
      window.setTimeout(tick, 60_000)
    }, ms)
    return () => window.clearTimeout(id)
  }, [open])

  // Keep the current list selection valid; null means the full Live TV library.
  useEffect(() => {
    if (!open) return
    if (!activeListId) return
    if (lists.some((list) => list.id === activeListId)) return
    setActiveListId(null)
  }, [open, lists, activeListId])

  const activeList = useMemo(
    () => lists.find((list) => list.id === activeListId) ?? null,
    [lists, activeListId],
  )

  const epgUrls = useMemo(() => getAllLiveTvEpgUrls(lists), [lists])

  const cache = useLiveTvEpgCache(epgUrls.length > 0 ? LIVE_TV_GLOBAL_EPG_ID : null, epgUrls)

  const windowStart = useMemo(
    () => alignToHalfHour(nowTick - WINDOW_HOURS_BEFORE * 3_600_000),
    [nowTick],
  )
  const windowEnd = windowStart + WINDOW_HOURS_TOTAL * 3_600_000

  const halfHourSlots = useMemo(() => {
    const slots: number[] = []
    for (let t = windowStart; t < windowEnd; t += 30 * 60_000) slots.push(t)
    return slots
  }, [windowStart, windowEnd])

  const nameIndex = useMemo(
    () => (cache ? buildNameToTvgIdIndex(cache) : new Map<string, string>()),
    [cache],
  )

  const allRows = useMemo<ChannelRow[]>(() => {
    const sourceRows: Array<{ channel: M3uChannel; list: LiveTvList }> = []
    const seen = new Set<string>()
    const sourceLists = activeList ? [activeList] : lists
    for (const list of sourceLists) {
      for (const channel of list.channels) {
        const key = `${channel.name}::${channel.url}`
        if (seen.has(key)) continue
        seen.add(key)
        sourceRows.push({ channel, list })
      }
    }

    const out: ChannelRow[] = []
    for (const { channel, list } of sourceRows) {
      const tvgId = resolveTvgId(channel.tvgId, channel.name, nameIndex)
      if (!tvgId) continue
      const programmes = cache?.index[tvgId] ?? []
      const sliced = programmes.filter((p) => p.stop > windowStart && p.start < windowEnd)
      if (sliced.length === 0) continue
      out.push({ channel, list, programmes: sliced })
    }
    return out
  }, [activeList, lists, cache, nameIndex, windowStart, windowEnd])

  const rows = useMemo<ChannelRow[]>(() => {
    if (!channelFilter) return allRows
    return allRows.filter((row) => row.channel.url === channelFilter.url)
  }, [allRows, channelFilter])

  useEffect(() => {
    if (!channelFilter) return
    if (!allRows.some((row) => row.channel.url === channelFilter.url)) {
      setChannelFilter(null)
    }
  }, [allRows, channelFilter])

  const guideStats = useMemo(() => {
    const sourceLists = activeList ? [activeList] : lists
    const sourceChannels = new Map<string, M3uChannel>()
    for (const list of sourceLists) {
      for (const channel of list.channels) {
        sourceChannels.set(`${channel.name}::${channel.url}`, channel)
      }
    }
    let matched = 0
    let totalProgrammes = 0
    for (const channel of sourceChannels.values()) {
      const tvgId = resolveTvgId(channel.tvgId, channel.name, nameIndex)
      if (!tvgId) continue
      matched += 1
      totalProgrammes += cache?.index[tvgId]?.length ?? 0
    }
    return {
      matched,
      totalProgrammes,
      sourceChannels: Object.keys(cache?.index ?? {}).length,
    }
  }, [activeList, lists, cache, nameIndex])

  // Scroll timeline so "now" sits ~15% from the left when (re)opened.
  useEffect(() => {
    if (!open) return
    const target = bodyRef.current
    if (!target) return
    const nowOffset = (Date.now() - windowStart) * PIXELS_PER_MS
    target.scrollLeft = Math.max(0, nowOffset - target.clientWidth * 0.15)
  }, [open, windowStart])

  useEffect(() => {
    if (!open) return
    if (bodyRef.current) bodyRef.current.scrollTop = 0
    if (channelListRef.current) channelListRef.current.scrollTop = 0
  }, [open, channelFilter])

  function syncVerticalScroll(source: 'body' | 'channels', scrollTop: number): void {
    const target = source === 'body' ? channelListRef.current : bodyRef.current
    if (target && Math.abs(target.scrollTop - scrollTop) > 1) target.scrollTop = scrollTop
  }

  if (!open) return null

  const nowLineLeft = (Date.now() - windowStart) * PIXELS_PER_MS
  const timelineWidth = (windowEnd - windowStart) * PIXELS_PER_MS
  const hasSources = epgUrls.length > 0
  const failures = cache?.failures ?? []
  const emptyMessage = lists.length === 0
    ? 'Ingen Live TV-lista finns ännu.'
    : !hasSources
      ? 'Ingen EPG-källa är kopplad till den här Live TV-listan.'
      : !cache
        ? 'Hämtar guidedata...'
        : failures.length > 0 && guideStats.sourceChannels === 0
          ? `EPG-källan kunde inte hämtas: ${failures.map((failure) => failure.error).join(', ')}`
          : guideStats.sourceChannels === 0
            ? 'EPG-källan hämtades men innehöll inga program.'
            : guideStats.matched === 0
              ? `EPG hämtad (${guideStats.sourceChannels} kanaler), men inga av listans kanaler matchade.`
              : `EPG hämtad (${guideStats.sourceChannels} kanaler, ${guideStats.matched} matchade), men inga program ligger i tidsfönstret.`

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[80] flex flex-col bg-slate-950/95 backdrop-blur-xl"
      style={{ top: -64, paddingTop: 64 }}
    >
      <div className="flex items-center justify-between gap-4 border-b border-white/5 px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.24em] text-emerald-300/80">EPG</span>
          <h2 className="truncate text-base font-semibold text-white">TV-tablå</h2>
          {lists.length > 0 ? (
            <select
              value={activeListId ?? ''}
              onChange={(event) => setActiveListId(event.target.value || null)}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-200 outline-none transition hover:border-white/30 focus:border-white/40"
            >
              <option value="" className="bg-slate-900">Alla</option>
              {lists.map((list) => (
                <option key={list.id} value={list.id} className="bg-slate-900">
                  {list.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setChannelFilter(null)}
            className={`rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] transition ${
              channelFilter
                ? 'border-white/15 bg-white/5 text-slate-300 hover:border-white/35 hover:text-white'
                : 'border-emerald-300/50 bg-emerald-400/15 text-emerald-200'
            }`}
          >
            Alla
          </button>
          <select
            value={channelFilter?.url ?? ''}
            onChange={(event) => {
              const next = allRows.find((row) => row.channel.url === event.target.value)?.channel ?? null
              setChannelFilter(next)
              if (next) setSelectedChannel(next)
            }}
            className="max-w-[16rem] rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-slate-200 outline-none transition hover:border-white/35 focus:border-white/40"
            title="Filtrera kanal"
          >
            <option value="" className="bg-slate-900">Alla kanaler</option>
            {allRows.map(({ channel }) => (
              <option key={channel.url} value={channel.url} className="bg-slate-900">
                {channel.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedChannel}
            onClick={() => selectedChannel && setChannelFilter(selectedChannel)}
            className={`max-w-[14rem] truncate rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition disabled:cursor-not-allowed disabled:opacity-35 ${
              channelFilter
                ? 'border-emerald-300/50 bg-emerald-400/15 text-emerald-200'
                : 'border-white/15 bg-white/5 text-slate-300 hover:border-white/35 hover:text-white'
            }`}
            title={selectedChannel?.name ?? 'Välj en kanal'}
          >
            {selectedChannel ? selectedChannel.name : 'Vald kanal'}
          </button>
          <button
            type="button"
            onClick={() => {
              const target = bodyRef.current
              if (!target) return
              target.scrollLeft = Math.max(0, nowLineLeft - target.clientWidth * 0.15)
            }}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] text-slate-200 transition hover:border-white/35 hover:text-white"
          >
            Nu
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] text-slate-200 transition hover:border-white/35 hover:text-white"
          >
            Stäng
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-white/50">
          {emptyMessage}
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex shrink-0 flex-col border-r border-white/5" style={{ width: CHANNEL_COL_WIDTH }}>
            <div className="border-b border-white/5 bg-black/40" style={{ height: HEAD_HEIGHT }} />
            <div
              className="thin-slider-scrollbar flex-1 overflow-y-auto"
              ref={channelListRef}
              onScroll={(event) => {
                syncVerticalScroll('channels', event.currentTarget.scrollTop)
              }}
            >
              {rows.map(({ channel, list }) => {
                const logoSrc = getLiveTvLogoSrc(channel.logo)
                const isSelected = selectedChannel === channel
                return (
                  <button
                    key={`${list.id}::${channel.url}`}
                    type="button"
                    onClick={() => onPlayChannel(channel, list)}
                    onDoubleClick={() => setChannelFilter(channel)}
                    onMouseEnter={() => setSelectedChannel(channel)}
                    onFocus={() => setSelectedChannel(channel)}
                    className={`flex w-full items-center gap-3 border-b border-white/5 px-3 text-left transition ${
                      channelFilter?.url === channel.url
                        ? 'bg-emerald-500/15'
                        : isSelected
                          ? 'bg-emerald-500/10'
                          : 'hover:bg-white/5'
                    }`}
                    style={{ height: ROW_HEIGHT }}
                  >
                    {logoSrc ? (
                      <LiveTvLogoImage
                        src={logoSrc}
                        alt=""
                        className="h-9 w-12 shrink-0 rounded object-contain bg-slate-800/90 p-0.5"
                      />
                    ) : (
                      <div className="h-9 w-12 shrink-0 rounded bg-slate-800" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-white">{channel.name}</p>
                      {channel.group ? (
                        <p className="truncate text-[10px] text-slate-500">{channel.group}</p>
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden">
            <div
              ref={timelineRef}
              className="thin-slider-scrollbar overflow-x-auto overflow-y-hidden border-b border-white/5 bg-black/40"
              style={{ height: HEAD_HEIGHT }}
            >
              <div className="relative flex" style={{ width: timelineWidth, height: HEAD_HEIGHT }}>
                {halfHourSlots.map((slot) => (
                  <div
                    key={slot}
                    className="flex h-full shrink-0 items-center border-r border-white/5 px-2 text-[10px] uppercase tracking-[0.18em] text-slate-400"
                    style={{ width: HOUR_WIDTH / 2 }}
                  >
                    {formatHour(slot)}
                  </div>
                ))}
              </div>
            </div>
            <div
              ref={bodyRef}
              onScroll={(event) => {
                if (timelineRef.current) {
                  timelineRef.current.scrollLeft = event.currentTarget.scrollLeft
                }
                syncVerticalScroll('body', event.currentTarget.scrollTop)
              }}
              className="thin-slider-scrollbar flex-1 overflow-auto"
              style={{ height: `calc(100% - ${HEAD_HEIGHT}px)` }}
            >
              <div className="relative" style={{ width: timelineWidth }}>
                {rows.map(({ channel, list, programmes }, rowIdx) => (
                  <div
                    key={`${list.id}::${channel.url}`}
                    className="relative border-b border-white/5"
                    style={{ height: ROW_HEIGHT }}
                  >
                    {programmes.map((p, i) => {
                      const startClamped = Math.max(p.start, windowStart)
                      const stopClamped = Math.min(p.stop, windowEnd)
                      const left = (startClamped - windowStart) * PIXELS_PER_MS
                      const width = Math.max(8, (stopClamped - startClamped) * PIXELS_PER_MS)
                      const isLive = p.start <= nowTick && p.stop > nowTick
                      const isPast = p.stop <= nowTick
                      const isSelected = selectedProgramme === p
                      const progress = isLive
                        ? Math.min(100, Math.max(0, ((nowTick - p.start) / (p.stop - p.start)) * 100))
                        : 0
                      return (
                        <button
                          key={`${rowIdx}-${p.start}-${i}`}
                          type="button"
                          onClick={() => {
                            setSelectedProgramme(p)
                            setSelectedChannel(channel)
                          }}
                          onDoubleClick={() => onPlayChannel(channel, list)}
                          className={`absolute top-1 flex flex-col justify-center overflow-hidden rounded-md border px-2 text-left transition ${
                            isLive
                              ? 'border-emerald-300/60 bg-emerald-500/15 hover:bg-emerald-500/25'
                              : isPast
                                ? 'border-white/5 bg-white/[0.02] text-white/40'
                                : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08]'
                          } ${isSelected ? 'ring-2 ring-emerald-300/60' : ''}`}
                          style={{ left, width, height: ROW_HEIGHT - 8 }}
                          title={p.title}
                        >
                          <div className={`truncate text-[12px] font-semibold ${isLive ? 'text-white' : 'text-slate-100'}`}>
                            {p.title}
                          </div>
                          <div className="truncate text-[10px] text-white/55">
                            {formatHour(p.start)}
                            {isLive ? ` • ${formatRemaining(p.stop, nowTick)} kvar` : ''}
                          </div>
                          {isLive ? (
                            <div
                              className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-400"
                              style={{ width: `${progress}%` }}
                            />
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                ))}
                {nowLineLeft >= 0 && nowLineLeft <= timelineWidth ? (
                  <div
                    className="pointer-events-none absolute top-0 bottom-0 z-[5] w-0.5 bg-red-500/80"
                    style={{ left: nowLineLeft }}
                  >
                    <div className="absolute -top-1 -left-[5px] h-3 w-3 rounded-full bg-red-500/90 shadow-[0_0_12px_rgba(239,68,68,0.7)]" />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedProgramme && selectedChannel ? (
        <div className="border-t border-white/5 bg-black/60 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-300/80">{formatHour(selectedProgramme.start)} – {formatHour(selectedProgramme.stop)}</div>
            <div className="text-sm font-semibold text-white">{selectedProgramme.title}</div>
            <span className="text-[11px] text-slate-400">på {selectedChannel.name}</span>
          </div>
          {selectedProgramme.description ? (
            <p className="mt-1 line-clamp-2 text-xs text-white/60">{selectedProgramme.description}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
