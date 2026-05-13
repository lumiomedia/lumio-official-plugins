import { useEffect, useState } from 'react'
import { onPluginStorageChanged } from '@/lib/plugin-sdk'
import { ensureFresh, readCache } from '../epg/cache'
import type { EpgCacheEntry } from '../epg/types'

const PLUGIN_ID = 'com.lumio.live-tv'

/**
 * Subscribe to the EPG cache for a list. Triggers a background fetch when
 * stale and re-renders whenever the cache is written.
 */
export function useLiveTvEpgCache(
  listId: string | null,
  urls: string[],
): EpgCacheEntry | null {
  const [entry, setEntry] = useState<EpgCacheEntry | null>(() =>
    listId ? readCache(listId) : null,
  )

  useEffect(() => {
    if (!listId) {
      setEntry(null)
      return
    }
    let cancelled = false
    const sync = () => {
      if (cancelled) return
      setEntry(readCache(listId))
    }
    sync()
    ensureFresh(listId, urls).then(sync).catch(sync)
    const off = onPluginStorageChanged(PLUGIN_ID, `epg_cache:${listId}`, sync)
    return () => {
      cancelled = true
      off()
    }
  }, [listId, urls.join('|')])

  return entry
}
