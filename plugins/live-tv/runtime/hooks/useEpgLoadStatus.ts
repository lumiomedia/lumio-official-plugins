import { useEffect, useState } from 'react'
import { fetchNowSnapshot, getCachedNowSnapshot, type NowSnapshot } from '../epg/now-snapshot'
import type { EpgLoadStatus } from '../epg/types'

/**
 * Vad vyerna ska säga medan tablån är på väg (spec 4.2).
 *
 * Statusen härleds ur nu-snapshotet från appen, som modellen också läser —
 * samma modulcache, så den här hooken kostar inget extra anrop när en modell
 * redan hämtat snapshotet.
 *
 * - `idle`: ingen lista (ingen EPG-källa konfigurerad alls)
 * - `empty`: inga EPG-URL:er, eller appen har hämtat men saknar program
 * - `loading`: snapshotet är på väg, eller appen har ännu inte hämtat
 * - `ready`: det finns program att visa
 * - `error`: anropet mot appen föll
 */
export function useEpgLoadStatus(listId: string | null, urls: string[]): EpgLoadStatus {
  const [snapshot, setSnapshot] = useState<NowSnapshot | null>(() =>
    listId ? getCachedNowSnapshot(listId, null) : null,
  )
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!listId) return
    let cancelled = false
    setFailed(false)
    fetchNowSnapshot(listId, null)
      .then((next) => {
        if (!cancelled) setSnapshot(next)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [listId, urls.join('|')])

  if (!listId) return 'idle'
  if (failed) return 'error'
  if (snapshot && Object.keys(snapshot.items).length > 0) return 'ready'
  if (urls.length === 0) return 'empty'
  if (snapshot && snapshot.fetchedAt !== null) return 'empty'
  return 'loading'
}
