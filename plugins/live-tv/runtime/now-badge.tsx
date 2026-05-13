'use client'

import { useEpgNowNextLater } from './hooks/useEpgNowNextLater'
import type { M3uChannel } from './live-tv-data'

interface Props {
  channel: M3uChannel
  listId: string | null
  urls: string[]
}

export function NowBadge({ channel, listId, urls }: Props) {
  const { now } = useEpgNowNextLater(channel, listId, urls)
  if (!now) return null
  return (
    <div className="w-full truncate text-center text-[11px] text-emerald-300/90">
      <span className="mr-1 text-[9px] uppercase tracking-wider text-emerald-300/70">Now</span>
      {now.title}
    </div>
  )
}
