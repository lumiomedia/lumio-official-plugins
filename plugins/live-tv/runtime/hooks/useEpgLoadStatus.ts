import { useEffect, useReducer } from 'react'
import { onPluginStorageChanged } from '@/lib/plugin-sdk'
import { ensureFresh, readCache } from '../epg/cache'
import type { EpgLoadStatus } from '../epg/types'

const PLUGIN_ID = 'com.lumio.live-tv'

function deriveStatus(listId: string | null, urls: string[]): EpgLoadStatus {
  if (!listId) return 'idle'
  const cache = readCache(listId)
  if (cache && Object.keys(cache.index).length > 0) return 'ready'
  if (urls.length === 0) return 'empty'
  return 'loading'
}

export function useEpgLoadStatus(listId: string | null, urls: string[]): EpgLoadStatus {
  const [, bump] = useReducer((x: number) => x + 1, 0)

  useEffect(() => {
    if (!listId) return
    let cancelled = false
    const update = () => {
      if (!cancelled) bump()
    }
    ensureFresh(listId, urls).then(update).catch(update)
    const off = onPluginStorageChanged(PLUGIN_ID, `epg_cache:${listId}`, update)
    return () => {
      cancelled = true
      off()
    }
  }, [listId, urls.join('|')])

  return deriveStatus(listId, urls)
}
