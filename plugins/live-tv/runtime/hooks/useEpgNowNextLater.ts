import { useEffect, useState } from 'react'
import { fetchSchedules, hourWindow } from '../epg/schedule-cache'
import { nowNextLaterFrom } from '../epg/lookup'
import { scheduleNextBoundary } from '../epg/auto-roll'
import { channelKey } from '../live-tv-data'
import type { EpgProgramme, NowNextLater } from '../epg/types'

const EMPTY: NowNextLater = { now: null, next: null, later: null }

interface ChannelLike {
  tvgId: string | null
  name?: string
  url?: string
}

/**
 * Nu/Härnäst/Senare för EN kanal (kort, spelaröverlägg, hemradens märke).
 *
 * Sedan lagring v2 kommer tablån från appen (`/api/live-tv/epg/schedule`) och
 * slås upp på KANALNYCKELN — namnmatchningen mot XMLTV-id:n görs i Rust, så
 * `tvgId` används inte längre här. `urls` står kvar i signaturen: anroparna
 * (och appens bro, `window.__LumioLiveTvEpg`) skickar den, och appen avgör
 * själv när EPG:t behöver hämtas om.
 *
 * Fönstret är −6 h … +24 h rundat till hel timme, samma post i modulcachen som
 * resten av vyerna delar. Rullningen till nästa program sker på programgränsen
 * (`scheduleNextBoundary`), inte på en minuttimer.
 */
export function useEpgNowNextLater(
  channel: ChannelLike,
  listId: string | null,
  urls: string[],
  enabled = true,
): NowNextLater {
  const [data, setData] = useState<NowNextLater>(EMPTY)
  const key = channel.url ? channelKey({ name: channel.name ?? '', url: channel.url }) : ''

  useEffect(() => {
    if (!enabled || !listId || !key) {
      setData(EMPTY)
      return
    }
    let cancelled = false
    let cancelBoundary: () => void = () => {}
    const apply = (programmes: EpgProgramme[]) => {
      if (cancelled) return
      const next = nowNextLaterFrom(programmes, Date.now())
      setData(next)
      cancelBoundary()
      cancelBoundary = scheduleNextBoundary(next, () => apply(programmes))
    }
    const { from, to } = hourWindow(Date.now(), 6, 24)
    fetchSchedules(listId, [key], from, to)
      .then((schedules) => apply(schedules[key] ?? []))
      .catch(() => {
        if (!cancelled) setData(EMPTY)
      })
    return () => {
      cancelled = true
      cancelBoundary()
    }
  }, [key, listId, urls.join('|'), enabled])

  return data
}
