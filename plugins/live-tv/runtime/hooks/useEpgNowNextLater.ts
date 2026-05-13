import { useEffect, useState } from 'react'
import { onPluginStorageChanged } from '@/lib/plugin-sdk'
import { ensureFresh, readCache } from '../epg/cache'
import { computeNowNextLater } from '../epg/lookup'
import { scheduleNextBoundary } from '../epg/auto-roll'
import type { NowNextLater } from '../epg/types'

const PLUGIN_ID = 'com.lumio.live-tv'
const EMPTY: NowNextLater = { now: null, next: null, later: null }

interface ChannelLike {
  tvgId: string | null
}

export function useEpgNowNextLater(
  channel: ChannelLike,
  listId: string | null,
  urls: string[],
): NowNextLater {
  const [data, setData] = useState<NowNextLater>(EMPTY)

  useEffect(() => {
    if (!listId || !channel.tvgId) {
      setData(EMPTY)
      return
    }
    let cancelled = false
    let cancelBoundary: () => void = () => {}
    const recompute = () => {
      if (cancelled) return
      const cache = readCache(listId)
      const next = computeNowNextLater(cache, channel.tvgId, Date.now())
      setData(next)
      cancelBoundary()
      cancelBoundary = scheduleNextBoundary(next, recompute)
    }
    recompute()
    ensureFresh(listId, urls).then(recompute).catch(recompute)
    const off = onPluginStorageChanged(PLUGIN_ID, `epg_cache:${listId}`, recompute)
    return () => {
      cancelled = true
      cancelBoundary()
      off()
    }
  }, [channel.tvgId, listId, urls.join('|')])

  return data
}
