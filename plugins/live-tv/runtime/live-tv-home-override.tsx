'use client'

import { useEffect, useState } from 'react'
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
}

function pickFocused(lists: LiveTvList[]): FocusedTarget | null {
  for (const list of lists) {
    const hit = list.channels.find((channel) => channel.tvgId)
    if (hit) return { list, channel: hit }
  }
  const fallback = lists.find((list) => list.channels.length > 0)
  if (!fallback) return null
  return { list: fallback, channel: fallback.channels[0] }
}

export function LiveTvHomeOverride(_props: HomeOverrideProps) {
  const [focused, setFocused] = useState<FocusedTarget | null>(null)

  useEffect(() => {
    const sync = () => setFocused(pickFocused(getLiveTvLists()))
    sync()
    return onLiveTvListsChanged(sync)
  }, [])

  return (
    <div className="space-y-6">
      {focused ? (
        <div className="space-y-3 rounded-3xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center gap-3">
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
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-white">
                {focused.channel.name}
              </p>
              {focused.channel.group ? (
                <p className="truncate text-xs text-slate-400">{focused.channel.group}</p>
              ) : null}
            </div>
          </div>
          <NowNextLaterRow
            channel={focused.channel}
            listId={focused.list.id}
            urls={[focused.list.urlTvg, ...focused.list.epgUrls].filter(
              (url): url is string => Boolean(url),
            )}
          />
        </div>
      ) : null}
      <LiveTvGrid />
    </div>
  )
}
