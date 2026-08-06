'use client'

import { useLang } from '@/lib/plugin-sdk'
import { useEpgNowNextLater } from './hooks/useEpgNowNextLater'
import { useEpgLoadStatus } from './hooks/useEpgLoadStatus'
import type { EpgProgramme } from './epg/types'
import type { M3uChannel } from './live-tv-data'

interface Props {
  channel: M3uChannel
  listId: string
  urls: string[]
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function Card({
  label,
  programme,
  withProgress = false,
}: {
  label: string
  programme: EpgProgramme | null
  withProgress?: boolean
}) {
  if (!programme) {
    return (
      <div className="flex-1 rounded-2xl border border-white/5 bg-black/40 px-4 py-3 opacity-40">
        <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
        <div className="mt-1 text-sm text-white/60">—</div>
      </div>
    )
  }
  const progress = withProgress
    ? Math.min(
        100,
        Math.max(0, ((Date.now() - programme.start) / (programme.stop - programme.start)) * 100),
      )
    : null
  return (
    <div
      className={`relative flex-1 overflow-hidden rounded-2xl border px-4 py-3 ${
        withProgress ? 'border-emerald-400/60 bg-emerald-500/10' : 'border-white/5 bg-black/40'
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div
          className={`text-[10px] uppercase tracking-wider ${
            withProgress ? 'text-emerald-300' : 'text-white/40'
          }`}
        >
          {label}
        </div>
        <div className="text-[11px] text-white/70">{formatTime(programme.start)}</div>
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-white">{programme.title}</div>
      {programme.description ? (
        <div className="mt-0.5 line-clamp-2 text-xs text-white/60">{programme.description}</div>
      ) : null}
      {progress !== null ? (
        <div
          className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-400"
          style={{ width: `${progress}%` }}
        />
      ) : null}
    </div>
  )
}

export function NowNextLaterRow({ channel, listId, urls }: Props) {
  const { t } = useLang()
  const status = useEpgLoadStatus(listId, urls)
  const data = useEpgNowNextLater(channel, listId, urls)
  if ((status === 'empty' || status === 'error') && !data.now && !data.next && !data.later) {
    return (
      <div className="rounded-2xl border border-white/5 bg-black/40 px-4 py-3 text-sm text-white/40">
        {t('liveTvNoGuideAvailable')}
      </div>
    )
  }
  return (
    <div className="flex gap-3">
      <Card label={t('liveTvNow')} programme={data.now} withProgress />
      <Card label={t('next')} programme={data.next} />
      <Card label={t('liveTvLater')} programme={data.later} />
    </div>
  )
}
