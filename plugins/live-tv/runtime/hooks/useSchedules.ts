'use client'

import { useEffect, useMemo, useState } from 'react'
import { LIVE_TV_GLOBAL_EPG_ID, channelKey, type M3uChannel } from '../live-tv-data'
import { fetchSchedules, getCachedSchedules } from '../epg/schedule-cache'
import type { EpgProgramme } from '../epg/types'

export interface SchedulesResult {
  /** Tablå per kanalnyckel (`channelKey`). Saknad nyckel = inte hämtad ännu. */
  schedules: Record<string, EpgProgramme[]>
  loading: boolean
}

const EMPTY: Record<string, EpgProgramme[]> = {}

/**
 * Tablåer för ett FÖNSTER och en uppsättning kanaler (spec 4.2).
 *
 * Ersätter modellens `scheduleFor`: tablån bor inte längre i webviewn, så en
 * synkron uppslagsfunktion finns inte att ge vyerna. Den här hooken tar
 * kanalerna som faktiskt syns och hämtar deras fönster i EN begäran
 * (`epgSchedule` chunkar 200 nycklar per anrop) med modulcachen emellan.
 *
 * Avbrottet sker med en GENERATIONSRÄKNARE och inte med `AbortController`:
 * svaret som redan är på väg ska fortfarande hamna i modulcachen (nästa vy som
 * frågar om samma fönster ska slippa anropet) — det är bara `setState` som ska
 * hoppas över när komponenten hunnit byta fönster eller avmonteras.
 */
export function useSchedules(
  channels: readonly M3uChannel[],
  from: number,
  to: number,
  listId: string | null = LIVE_TV_GLOBAL_EPG_ID,
): SchedulesResult {
  const keys = useMemo(() => [...new Set(channels.map((channel) => channelKey(channel)))], [channels])
  const keysId = keys.join(',')

  const [state, setState] = useState<SchedulesResult>(() => ({ schedules: EMPTY, loading: false }))

  useEffect(() => {
    if (!listId || keys.length === 0 || !Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
      setState({ schedules: EMPTY, loading: false })
      return
    }
    let live = true
    const cached = getCachedSchedules(listId, keys, from, to)
    if (cached.missing.length === 0) {
      setState({ schedules: cached.schedules, loading: false })
      return
    }
    // Det cachade visas direkt; resten fylls på när svaret kommer.
    setState({ schedules: cached.schedules, loading: true })
    fetchSchedules(listId, keys, from, to)
      .then((schedules) => {
        if (live) setState({ schedules, loading: false })
      })
      .catch(() => {
        if (live) setState((prev) => ({ schedules: prev.schedules, loading: false }))
      })
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId, keysId, from, to])

  return state
}
