'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { channelKey, type M3uChannel } from '../live-tv-data'
import type { LiveTvModel } from '../live-tv-model'
import type { NowNextLater } from '../epg/types'
import { ChannelArt, Icons, TV, dp } from './tv-ui'
import type { TvStringKey } from './tv-strings'

export function useDebouncedChannel(channel: M3uChannel | null, ms = 300): M3uChannel | null {
  const [value, setValue] = useState(channel)
  useEffect(() => {
    const timer = window.setTimeout(() => setValue(channel), ms)
    return () => window.clearTimeout(timer)
  }, [channel, ms])
  return value
}

export const FAVS_GROUP = '__favs'
const MAX_GROUPS = 12

export function useGuideGroups(model: LiveTvModel, tt: (key: TvStringKey) => string) {
  return useMemo(() => [
    { key: null as string | null, label: tt('allGroups'), id: 'all' },
    ...(model.favouriteChannels.length ? [{ key: FAVS_GROUP, label: tt('favourites'), id: 'favs' }] : []),
    ...model.groups.slice(0, MAX_GROUPS).map((g) => ({ key: g, label: g, id: g })),
  ], [model.favouriteChannels.length, model.groups, tt])
}

export function filterByGroup(model: LiveTvModel, group: string | null): M3uChannel[] {
  if (group === FAVS_GROUP) return model.favouriteChannels
  if (group) return model.channels.filter((c) => c.group === group)
  return model.channels
}

export function ChannelCell({ channel, number, pinned, locked, quality, focused, width = dp(520) }: {
  channel: M3uChannel; number: number | null; pinned: boolean; locked: boolean; quality: string | null; focused: boolean; width?: number
}) {
  return (
    <div style={{ width, height: dp(72), borderRadius: dp(12), display: 'flex', alignItems: 'center', gap: dp(14), padding: `0 ${dp(12)}px`, background: focused ? TV.s10 : 'transparent', flexShrink: 0 }}>
      <span style={{ width: dp(44), fontSize: dp(18), color: 'rgba(243,244,248,0.5)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{number ?? ''}</span>
      <ChannelArt channel={channel} style={{ width: dp(88), height: dp(56), flexShrink: 0 }} radius={dp(8)} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: dp(21), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{channel.name}</div>
        <div style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{[channel.group, quality].filter(Boolean).join(' · ')}</div>
      </div>
      {pinned ? <span style={{ color: TV.acc }}><Icons.Heart size={dp(18)} filled /></span> : null}
      {locked ? <span style={{ color: 'rgba(243,244,248,0.5)' }}><Icons.Lock size={dp(18)} /></span> : null}
    </div>
  )
}

export function nowNextLabel(info: NowNextLater): ReactNode {
  return info.now ? info.now.title : null
}

export function keyOf(channel: M3uChannel): string {
  return channelKey(channel)
}
