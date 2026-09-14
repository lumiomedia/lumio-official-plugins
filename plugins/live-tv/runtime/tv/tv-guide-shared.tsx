'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { M3uChannel } from '../live-tv-data'
import type { LiveTvModel } from '../live-tv-model'
import { ChannelArt, Icons, TV, dp, phoneTextFloor } from './tv-ui'
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
 * Lösningen: samma flex-egenskaper på BÅDA ställena. Skrivbord/TV: fast
 * bredd, ingen krympning (som förut). Telefon: motsvarande `flex: 1` (skrivet
 * i långform — `flexGrow`/`flexShrink`/`flexBasis` — så testerna kan läsa
 * varje del för sig i stället för att lita på webbläsarens normalisering av
 * `flex`-kortformen) + `minWidth: 0` — kolumnen delar radens bredd med
 * NU/SEN/SENARE precis som rubrikens flex 1.2/1/1-kolumner redan gör, i
 * stället för att kräva HELA bredden. `ChannelCell` själv sätts alltid till
 * `width: '100%'` av sin förälder (som nu har en DEFINITIV bredd att fylla),
 * så dess egna `overflow: hidden` + `text-overflow: ellipsis` på namnet
 * fungerar i båda lägena — även med orimligt långa kanalnamn.
 */
/**
 * Kanalkolumnens BREDDGOLV på telefon (M-P4, granskningsfynd på M-P3):
 * kolumnen delar raden med tre andra (flex 1 mot 1,2/1/1 — ungefär en
 * fjärdedel av 780 designpixlars scenbredd), men `ChannelCell`s egna
 * icke-krympbara delar äter nästan hela den andelen själva:
 *
 *   ChannelArt (flexShrink: 0)        88 dp
 *   + cellens padding (12 dp × 2)     24 dp
 *   + `gap` mellan nummer/art/text    28 dp (2 × 14 dp, utan pin/lås)
 *   ————————————————————————————————————————
 *   = FAST overhead                 140 dp
 *
 * Numret (`width: dp(44)`) får krympa (ingen `flexShrink: 0`) och räknas
 * INTE in i overheaden ovan — utan ett golv på kolumnen själv är det annars
 * numret och namnet som delar det som blir kvar, ibland noll eller negativt.
 * Golvet nedan reserverar dessutom minst 44 dp åt numret och minst 96 dp åt
 * namnet (cirka sex tecken vid teckengolvets 28 dp/14 riktiga pixlar — nog
 * för korta kanalnamn som "BBC1"/"SVT2", ellipsen tar resten):
 *
 *   140 (overhead) + 44 (nummer) + 96 (namn, golv) = 280 dp
 *
 * Vid 780 dp scenbredd (padding 48 dp × 2 + tre 16 dp-mellanrum mellan de
 * fyra kolumnerna = 144 dp overhead) blir NU/SEN/SENARE tillsammans
 * 780 − 144 − 280 = 356 dp, fördelat 1,2/1/1 → ~133/111/111 dp vardera.
 * Tajt, men positivt — en kolumn som nätt och jämnt får plats väger mindre
 * än ett kanalnamn som faktiskt syns.
 */
export const CHANNEL_COLUMN_PHONE_MIN_DP = 280

export function channelColumnStyle(phone: boolean): CSSProperties {
  return phone
    ? { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: dp(CHANNEL_COLUMN_PHONE_MIN_DP) }
    : { width: dp(CHANNEL_CELL_WIDTH_DP), flexShrink: 0 }
}

export function ChannelCell({ channel, number, pinned, locked, quality, focused, width = dp(CHANNEL_CELL_WIDTH_DP), phone = false }: {
  channel: M3uChannel; number: number | null; pinned: boolean; locked: boolean; quality: string | null; focused: boolean; width?: number | string; phone?: boolean
}) {
  return (
    <div data-testid="guide-channel-cell" style={{ width, height: dp(72), borderRadius: dp(12), display: 'flex', alignItems: 'center', gap: dp(14), padding: `0 ${dp(12)}px`, background: focused ? TV.s10 : 'transparent', flexShrink: 0 }}>
      <span style={{ width: dp(44), fontSize: dp(phoneTextFloor(18, phone)), color: 'rgba(243,244,248,0.5)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{number ?? ''}</span>
      <ChannelArt channel={channel} style={{ width: dp(88), height: dp(56), flexShrink: 0 }} radius={dp(8)} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: dp(phoneTextFloor(21, phone)), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{channel.name}</div>
        <div style={{ fontSize: dp(phoneTextFloor(15, phone)), color: 'rgba(243,244,248,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{[channel.group, quality].filter(Boolean).join(' · ')}</div>
      </div>
      {pinned ? <span style={{ color: TV.acc }}><Icons.Heart size={dp(18)} filled /></span> : null}
      {locked ? <span style={{ color: 'rgba(243,244,248,0.5)' }}><Icons.Lock size={dp(18)} /></span> : null}
    </div>
  )
}

