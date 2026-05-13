import { useEffect, useState } from 'react'
import { onPluginStorageChanged } from '@/lib/plugin-sdk'
import { ensureFresh, readCache } from '../epg/cache'
import { computeNowNextLater } from '../epg/lookup'
import { scheduleNextBoundary } from '../epg/auto-roll'
import { buildNameToTvgIdIndex, resolveTvgId } from '../epg/name-match'
import type { NowNextLater } from '../epg/types'

const PLUGIN_ID = 'com.lumio.live-tv'
const EMPTY: NowNextLater = { now: null, next: null, later: null }

interface ChannelLike {
  tvgId: string | null
  name?: string
}

export function useEpgNowNextLater(
  channel: ChannelLike,
  listId: string | null,
  urls: string[],
): NowNextLater {
  const [data, setData] = useState<NowNextLater>(EMPTY)

  useEffect(() => {
    if (!listId) {
      setData(EMPTY)
      return
    }
    let cancelled = false
    let cancelBoundary: () => void = () => {}
    const recompute = () => {
      if (cancelled) return
      const cache = readCache(listId)
      const nameIndex = cache ? buildNameToTvgIdIndex(Object.keys(cache.index)) : new Map<string, string>()
      const resolvedTvgId = resolveTvgId(channel.tvgId, channel.name ?? '', nameIndex)
      if (!resolvedTvgId) {
        setData(EMPTY)
        cancelBoundary()
        cancelBoundary = () => {}
        return
      }
      const next = computeNowNextLater(cache, resolvedTvgId, Date.now())
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
  }, [channel.tvgId, channel.name, listId, urls.join('|')])

  return data
}
