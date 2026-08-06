'use client'

import { useLang } from '@/lib/plugin-sdk'
import { useEpgNowNextLater } from './hooks/useEpgNowNextLater'
import type { M3uChannel } from './live-tv-data'
import { useState } from 'react'

interface Props {
  channel: M3uChannel
  listId: string | null
  urls: string[]
}

export function NowBadge({ channel, listId, urls }: Props) {
  const { t } = useLang()
  const [requested, setRequested] = useState(false)
  const { now } = useEpgNowNextLater(channel, listId, urls, requested)
  if (!requested) {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setRequested(true)
        }}
        className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-slate-400 transition hover:border-emerald-300/40 hover:bg-emerald-400/10 hover:text-emerald-200"
        title={t('liveTvFetchEpgForChannel')}
      >
        EPG
      </button>
    )
  }
  if (!now) {
    return (
      <div className="w-full truncate text-center text-[10px] text-slate-500">
        {t('liveTvNoEpg')}
      </div>
    )
  }
  return (
    <div className="w-full truncate text-center text-[11px] text-emerald-300/90">
      <span className="mr-1 text-[9px] uppercase tracking-wider text-emerald-300/70">{t('liveTvNow')}</span>
      {now.title}
    </div>
  )
}
