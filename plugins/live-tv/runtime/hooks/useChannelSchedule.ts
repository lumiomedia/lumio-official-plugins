import { useEffect, useState } from 'react'
import { fetchSchedules, hourWindow } from '../epg/schedule-cache'
import { sliceSchedule } from '../epg/lookup'
import { channelKey } from '../live-tv-data'
import type { EpgProgramme } from '../epg/types'

interface ChannelLike {
  tvgId: string | null
  name?: string
  url?: string
}

/**
 * Programmen för `channel` som överlappar [nu − `hoursBack` h, nu + `hoursAhead` h].
 *
 * Tablån hämtas från appen (`/api/live-tv/epg/schedule`) via modulcachen;
 * fönstret rundas till hel timme så minuttickern nedan bara räknar om vilka av
 * de redan hämtade programmen som ligger i fönstret — den hämtar inte om.
 */
export function useChannelSchedule(
  channel: ChannelLike,
  listId: string | null,
  urls: string[],
  hoursAhead: number = 12,
  hoursBack: number = 1,
): EpgProgramme[] {
  const [programmes, setProgrammes] = useState<EpgProgramme[]>([])
  const key = channel.url ? channelKey({ name: channel.name ?? '', url: channel.url }) : ''

  useEffect(() => {
    if (!listId || !key) {
      setProgrammes([])
      return
    }
    let cancelled = false
    let fetched: EpgProgramme[] = []
    const recompute = () => {
      if (cancelled) return
      const now = Date.now()
      setProgrammes(sliceSchedule(fetched, now - hoursBack * 3_600_000, now + hoursAhead * 3_600_000))
    }
    const { from, to } = hourWindow(Date.now(), hoursBack + 1, hoursAhead + 1)
    fetchSchedules(listId, [key], from, to)
      .then((schedules) => {
        fetched = schedules[key] ?? []
        recompute()
      })
      .catch(() => {
        if (!cancelled) setProgrammes([])
      })

    const msToNextMinute = 60_000 - (Date.now() % 60_000)
    const timers: number[] = []
    const tick = () => {
      recompute()
      timers.push(window.setTimeout(tick, 60_000))
    }
    timers.push(window.setTimeout(tick, msToNextMinute))

    return () => {
      cancelled = true
      for (const timer of timers) window.clearTimeout(timer)
    }
  }, [key, listId, urls.join('|'), hoursAhead, hoursBack])

  return programmes
}
