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
    return `${h}h ${m}m left`
  }
  return `${mins}m left`
}

export function PlayerNowOverlay({ channel, listId, urls }: Props) {
  const { now } = useEpgNowNextLater(channel, listId, urls)
  if (!now) return null
  return (
    <div className="pointer-events-none absolute bottom-6 left-6 z-30 max-w-md rounded-xl bg-black/60 px-4 py-2 backdrop-blur">
      <div className="text-xs uppercase tracking-wider text-emerald-300">Now</div>
      <div className="text-base font-semibold text-white">{now.title}</div>
      <div className="text-xs text-white/60">{formatRemaining(now.stop)}</div>
    </div>
  )
}
