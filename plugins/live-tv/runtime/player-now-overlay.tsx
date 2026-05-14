'use client'

import { useEpgNowNextLater } from './hooks/useEpgNowNextLater'
import type { M3uChannel } from './live-tv-data'

interface Props {
  channel: M3uChannel
  listId: string | null
  urls: string[]
}

function formatRemaining(stopMs: number): string {
  const remainingMs = Math.max(0, stopMs - Date.now())
  const mins = Math.round(remainingMs / 60_000)
  if (mins >= 60) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m > 0 ? `${h}h ${m}m kvar` : `${h}h kvar`
  }
  return `${mins}m kvar`
}

export function PlayerNowOverlay({ channel, listId, urls }: Props) {
  const { now } = useEpgNowNextLater(channel, listId, urls)
  if (!now) return null
  return (
    <span className="flex min-w-0 items-baseline gap-2 text-xs text-slate-300">
      <span className="h-1 w-1 shrink-0 self-center rounded-full bg-slate-600" />
      <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
        Nu
      </span>
      <span className="truncate font-medium text-white/90">{now.title}</span>
      <span className="shrink-0 text-white/45">{formatRemaining(now.stop)}</span>
    </span>
  )
}
