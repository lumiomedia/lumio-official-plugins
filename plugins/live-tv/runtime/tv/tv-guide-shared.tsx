'use client'

import { useEffect, useMemo, useState } from 'react'
import type { M3uChannel } from '../live-tv-data'
import type { LiveTvModel } from '../live-tv-model'
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

/**
 * Kanalstationens bredd på skrivbord/TV (spec §3). Guidens rubrikkolumn
 * (`tv-guide.tsx`, kolumnrubrikerna) måste hålla SAMMA tal — annars glider
 * rubrik och innehåll isär. Se `channelCellWidth` för porträttvalet.
 */
export const CHANNEL_CELL_WIDTH_DP = 520

/**
 * Bredd efter yta: telefonen får full bredd (spec §3, "kanalstationen på 520
 * designpixlar blir full bredd"), skrivbord/TV behåller den fasta
 * stationsbredden. Delad funktion så att `ChannelCell` och guidens
 * rubrikkolumn alltid väljer samma tal.
 */
export function channelCellWidth(phone: boolean): number | string {
  return phone ? '100%' : dp(CHANNEL_CELL_WIDTH_DP)
}

export function ChannelCell({ channel, number, pinned, locked, quality, focused, width = dp(CHANNEL_CELL_WIDTH_DP) }: {
  channel: M3uChannel; number: number | null; pinned: boolean; locked: boolean; quality: string | null; focused: boolean; width?: number | string
}) {
  return (
    <div data-testid="guide-channel-cell" style={{ width, height: dp(72), borderRadius: dp(12), display: 'flex', alignItems: 'center', gap: dp(14), padding: `0 ${dp(12)}px`, background: focused ? TV.s10 : 'transparent', flexShrink: 0 }}>
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

