'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
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

/** Kanalstationens bredd på skrivbord/TV (spec §3). */
export const CHANNEL_CELL_WIDTH_DP = 520

/**
 * Kanalkolumnens LAYOUTKONTEXT — inte bara ett tal. Guidens rubrikkolumn
 * (`tv-guide.tsx`, kolumnrubrikerna) och radens wrapper
 * (`data-testid="guide-row"`) måste bära EXAKT den här stilen, båda, annars
 * glider rubrik och innehåll isär trots att `ChannelCell` fyller ut sin
 * förälder till 100 %.
 *
 * Fixrunda 1 (granskning av M-P3): ett gemensamt tal (`CHANNEL_CELL_WIDTH_DP`
 * + ett `width: '100%'` på `ChannelCell`) räckte INTE. `guide-row` saknade
 * egen bredd/flex-basis, så en procentbredd på dess enda barn föll tillbaka
 * på auto — cellen krympte till sitt innehåll i stället för att fylla raden.
 * Samtidigt åt rubrikens `width: '100%'` + `flexShrink: 0` hela radens
 * bredd och trängde ut NU/SEN/SENARE (som saknar `minWidth: 0`). Två
 * anropsställen med samma tal gav alltså olika renderad bredd — glidningen
 * kom via DOM-strukturen, inte via ett hårdkodat tal, och syntes aldrig i
 * jsdom.
 *
 * Lösningen: samma flex-egenskaper på BÅDA ställena: fast bredd, ingen
 * krympning. (Fas 2:s telefongren med krympbar kolumn och breddgolv är
 * borta — telefonen får en egen guide i fas 3 och använder inte den här
 * kolumnen.)
 */
export function channelColumnStyle(): CSSProperties {
  return { width: dp(CHANNEL_CELL_WIDTH_DP), flexShrink: 0 }
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

