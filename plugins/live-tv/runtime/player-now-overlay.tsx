'use client'

import { useLang } from '@/lib/plugin-sdk'
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
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  return `${mins}m`
}

export function PlayerNowOverlay({ channel, listId, urls }: Props) {
  const { t } = useLang()
  const { now } = useEpgNowNextLater(channel, listId, urls)
  if (!now) return null
  return (
    <span className="flex min-w-0 items-baseline gap-2 text-xs text-slate-300" title={now.title}>
      <span className="h-1 w-1 shrink-0 self-center rounded-full bg-slate-600" />
      <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
        {t('liveTvNow')}
      </span>
      <span className="truncate font-medium text-white/90">{now.title}</span>
      <span className="shrink-0 text-white/45">
        {t('liveTvRemaining').replace('{time}', formatRemaining(now.stop))}
      </span>
    </span>
  )
}
