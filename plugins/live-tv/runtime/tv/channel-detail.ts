'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { channelKey, type M3uChannel } from '../live-tv-data'
import { pinSupportAvailable, activeProfileHasPin } from '../channel-locks'
import { startOfLocalDay, type LiveTvModel } from '../live-tv-model'
import { buildTimeshiftUrl, catchUpForChannel } from '../catch-up'
import { isReminded, toggleReminder } from '../reminders'
import type { EpgProgramme } from '../epg/types'
import { sliceSchedule } from '../epg/lookup'
import { useSchedules } from '../hooks/useSchedules'
import type { TvNav } from './tv-shell'
import { useTvText } from './tv-strings'

/**
 * Delad av skrivbordets `tv-channel.tsx` och telefonens
 * `mobile/channel-phone.tsx` (Task 8) — av samma skäl som `hub-data.ts`/
 * `grid-rows.ts`/`list-tree.ts`: hade hooken bott i endera vy-filen hade
 * telefongrenen importerat skrivbordsvyn (eller tvärtom) och skapat en
 * importcykel. Ingen av vyerna importerar den andra — båda importerar hit.
 */
export const DAY_OFFSETS = [-2, -1, 0, 1, 2] as const
const DAY_MS = 86_400_000

/** Slår upp i model.byUrl först; sidans params är reservvägen. */
export function channelFromParams(params: Record<string, string>, byUrl: Map<string, M3uChannel>): M3uChannel | null {
  const url = params.url?.trim()
  if (!url) return null
  return byUrl.get(url) ?? {
    name: params.name?.trim() || 'Unknown',
    logo: params.logo?.trim() || null,
    group: params.group?.trim() || 'Other',
    url,
    tvgId: params.tvgId?.trim() || null,
  }
}

export type ChannelDetailKind = 'past' | 'now' | 'future'
export function kindOf(p: EpgProgramme, nowMs: number): ChannelDetailKind {
  if (p.stop <= nowMs) return 'past'
  if (p.start > nowMs) return 'future'
  return 'now'
}

export interface ChannelDetailRow { p: EpgProgramme; day: 'yesterday' | 'today' }

/**
 * Kanaldetaljens datalager — exakt logiken som tidigare låg inline i
 * `TvChannel` (fixrunda M-P4/2), oförändrad. `nav` behövs för `primary()`
 * (spelar/repriserar/påminner via `nav.play`), så hooken tar tre argument
 * trots att uppdraget nämner två — `primary` kan inte fungera utan den.
 */
export function useChannelDetail(model: LiveTvModel, nav: TvNav, params: Record<string, string>) {
  const { tt, locale } = useTvText()
  const channel = useMemo(() => channelFromParams(params, model.byUrl), [params, model.byUrl])
  const [dayOffset, setDayOffset] = useState(0)
  const [selectedStart, setSelectedStart] = useState<number | null>(params.programme ? Number(params.programme) : null)

  const dayStart = startOfLocalDay(model.nowMs, dayOffset)
  /**
   * Tablån hämtas från appen per fönster (spec 4.2). Ett fönster täcker både
   * dagen, gårdagens sista rader och — för arkivkanaler — hela reprisfönstret,
   * så kanalsidan gör EN hämtning i stället för tre.
   */
  const archiveDays = channel?.archive?.days ?? 0
  const windowFrom = dayStart - Math.max(1, archiveDays) * DAY_MS
  const windowTo = dayStart + DAY_MS
  const scheduleChannels = useMemo(() => (channel ? [channel] : []), [channel])
  const { schedules, loading: scheduleLoading } = useSchedules(scheduleChannels, windowFrom, windowTo)
  const schedule = channel ? schedules[channelKey(channel)] ?? [] : []
  const programmes = useMemo(
    () => sliceSchedule(schedule, dayStart, dayStart + DAY_MS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [schedule, dayStart],
  )
  // Igårs sista rader syns bara på "Idag" (samma fönster som guidens tablå) —
  // ingen egen "Igår"-rubrik behövs för andra dagar eftersom dagväljaren redan
  // bytt hela tablån till den dagen.
  const yesterday = useMemo(
    () => (dayOffset === 0 ? sliceSchedule(schedule, dayStart - DAY_MS, dayStart).slice(-2) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [schedule, dayStart, dayOffset],
  )
  const rows: ChannelDetailRow[] = useMemo(
    () => [...yesterday.map((p) => ({ p, day: 'yesterday' as const })), ...programmes.map((p) => ({ p, day: 'today' as const }))],
    [yesterday, programmes],
  )

  // Repriser är begränsade till arkivfönstret (channel.archive.days), inte
  // bara "kanalen har tv_archive": ett program utanför fönstret ger ingen
  // giltig timeshift-URL hos panelen även om kanalen i övrigt stöder catch-up.
  const catchUpByStart = useMemo(() => {
    if (!channel) return new Map<number, true>()
    const items = catchUpForChannel(channel, schedule, model.nowMs, 500)
    return new Map(items.map((item) => [item.programme.start, true as const]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, schedule, model.nowMs])

  const selected = useMemo(
    () => rows.find((r) => r.p.start === selectedStart)?.p ?? rows.find((r) => kindOf(r.p, model.nowMs) === 'now')?.p ?? rows[0]?.p ?? null,
    [rows, selectedStart, model.nowMs],
  )
  const kind = selected ? kindOf(selected, model.nowMs) : null
  const canReplaySelected = selected ? catchUpByStart.has(selected.start) : false
  const reminded = channel && selected && kind === 'future' ? isReminded(channel, selected) : false
  const key = channel ? channelKey(channel) : ''
  const pinned = model.pinnedSet.has(key)
  const locked = model.locked.has(key)
  const lockAvailable = pinSupportAvailable() && activeProfileHasPin()

  // Bytt dag → rensa valet, men inte vid första monteringen: annars slår
  // effekten (som körs efter initialrendret också) omedelbart bort
  // `programme`-parameterns förval innan användaren hunnit se det.
  const mountedRef = useRef(false)
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return }
    setSelectedStart(null)
  }, [dayOffset])

  const primary = () => {
    if (!channel) return
    if (!selected) { nav.play({ channel }); return }
    if (kind === 'now') { nav.play({ channel }); return }
    if (kind === 'past') {
      const url = canReplaySelected ? buildTimeshiftUrl(channel, selected.start, selected.stop - selected.start) : null
      if (url) nav.play({ channel, url, label: selected.title })
      else nav.play({ channel })
      return
    }
    toggleReminder(channel, selected, model.nowMs)
  }
  const primaryLabel = kind === 'past' ? (canReplaySelected ? tt('playReplay') : tt('watchNow')) : kind === 'future' ? (reminded ? tt('removeReminder') : tt('remindMe')) : tt('watchNow')

  const dayLabel = (offset: number) => {
    const d = new Date(model.nowMs + offset * DAY_MS)
    return { top: offset === 0 ? tt('today') : offset === -1 ? tt('yesterday') : offset === 1 ? tt('tomorrow') : d.toLocaleDateString(locale, { weekday: 'short' }), bottom: d.toLocaleDateString(locale, { day: 'numeric', month: 'short' }) }
  }

  return {
    channel, dayOffset, setDayOffset, rows, selected, setSelectedStart, kind, canReplaySelected, reminded,
    pinned, locked, lockAvailable, scheduleLoading, catchUpByStart, primary, primaryLabel, dayLabel,
  }
}
