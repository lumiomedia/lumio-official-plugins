import { useEffect, useState } from 'react'
import { onPluginStorageChanged } from '@/lib/plugin-sdk'
import { ensureFresh, readCache } from '../epg/cache'
import { getChannelSchedule } from '../epg/lookup'
import type { EpgProgramme } from '../epg/types'

const PLUGIN_ID = 'com.lumio.live-tv'

interface ChannelLike {
  tvgId: string | null
}

/**
 * Returns programmes for `channel` whose airing window overlaps
 * [now − `hoursBack`h, now + `hoursAhead`h]. Re-renders on the next
 * minute boundary, on EPG cache writes, and once a background fetch
 * completes.
 */
export function useChannelSchedule(
  channel: ChannelLike,
  listId: string | null,
  urls: string[],
  hoursAhead: number = 12,
  hoursBack: number = 1,
): EpgProgramme[] {
  const [programmes, setProgrammes] = useState<EpgProgramme[]>([])

  useEffect(() => {
    if (!listId || !channel.tvgId) {
      setProgrammes([])
      return
    }
    let cancelled = false
    const recompute = () => {
      if (cancelled) return
      const cache = readCache(listId)
      const now = Date.now()
      const from = now - hoursBack * 3_600_000
      const to = now + hoursAhead * 3_600_000
      setProgrammes(getChannelSchedule(cache, channel.tvgId, from, to))
    }
    recompute()
    ensureFresh(listId, urls).then(recompute).catch(recompute)
    const off = onPluginStorageChanged(PLUGIN_ID, `epg_cache:${listId}`, recompute)

    // Re-roll on the next minute boundary so progress bars / NOW selection
    // stay accurate without per-second timers.
    const msToNextMinute = 60_000 - (Date.now() % 60_000)
    const tickId = window.setTimeout(function tick() {
      recompute()
      // Re-arm every 60s after the first boundary.
      const next = window.setTimeout(tick, 60_000)
      cleanup.push(() => window.clearTimeout(next))
    }, msToNextMinute)
    const cleanup: Array<() => void> = [() => window.clearTimeout(tickId)]

    return () => {
      cancelled = true
      off()
      for (const fn of cleanup) fn()
    }
  }, [channel.tvgId, listId, urls.join('|'), hoursAhead, hoursBack])

  return programmes
}
