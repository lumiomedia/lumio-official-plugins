'use client'

import { useEffect, useRef } from 'react'
import { useLang } from '@/lib/plugin-sdk'
import { useChannelSchedule } from './hooks/useChannelSchedule'
import type { EpgProgramme } from './epg/types'
import type { M3uChannel } from './live-tv-data'

interface Props {
  channel: M3uChannel
  listId: string | null
  urls: string[]
  open: boolean
  onClose: () => void
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function isNow(p: EpgProgramme, now: number): boolean {
  return p.start <= now && p.stop > now
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

export function PlayerScheduleOverlay({ channel, listId, urls, open, onClose }: Props) {
  const { t } = useLang()
  const programmes = useChannelSchedule(channel, listId, urls, 12, 1)
  const scrollRef = useRef<HTMLDivElement>(null)
  const nowMs = Date.now()
  const nowIndex = programmes.findIndex((p) => isNow(p, nowMs))

  useEffect(() => {
    if (!open || nowIndex < 0 || !scrollRef.current) return
    const container = scrollRef.current
    const target = container.querySelector<HTMLElement>(`[data-now="true"]`)
    if (target) target.scrollIntoView({ block: 'start', behavior: 'auto' })
  }, [open, nowIndex])

  if (!open) return null

  return (
    <div className="absolute inset-x-0 bottom-0 z-40 max-h-[55vh] overflow-hidden rounded-t-3xl border-t border-white/10 bg-black/85 backdrop-blur-xl shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-300/80">EPG</div>
          <div className="truncate text-sm font-semibold text-white">{channel.name}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-slate-200 transition hover:border-white/35 hover:text-white"
        >
          {t('close')}
        </button>
      </div>

      <div ref={scrollRef} className="thin-slider-scrollbar max-h-[calc(55vh-3.5rem)] overflow-y-auto">
        {programmes.length === 0 ? (
          <div className="px-5 py-6 text-sm text-white/50">
            {t('liveTvNoGuideForChannel')}
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {programmes.map((p, i) => {
              const live = isNow(p, nowMs)
              const past = p.stop <= nowMs
              const progress = live
                ? Math.min(100, Math.max(0, ((nowMs - p.start) / (p.stop - p.start)) * 100))
                : null
              return (
                <li
                  key={`${p.start}-${i}`}
                  data-now={live || undefined}
                  className={`relative grid grid-cols-[5rem_1fr_auto] gap-4 px-5 py-3 transition ${
                    live
                      ? 'bg-emerald-500/10'
                      : past
                        ? 'opacity-40 hover:opacity-60'
                        : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className={`text-sm tabular-nums ${live ? 'text-emerald-300' : 'text-white/70'}`}>
                      {formatTime(p.start)}
                    </span>
                    {live ? (
                      <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
                        {t('liveTvNow')}
                      </span>
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <div className={`truncate text-sm font-semibold ${live ? 'text-white' : 'text-slate-100'}`}>
                      {p.title}
                    </div>
                    {p.description ? (
                      <div className="mt-0.5 line-clamp-2 text-xs text-white/55">{p.description}</div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-start text-[11px] text-white/55">
                    {live
                      ? t('liveTvRemaining').replace('{time}', formatRemaining(p.stop, nowMs))
                      : formatTime(p.stop)}
                  </div>
                  {progress !== null ? (
                    <div
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-emerald-400"
                      style={{ width: `${progress}%` }}
                    />
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
