import { useEffect, useState } from 'react'
import { getActiveNowSnapshot, subscribeNowSnapshot, type NowSnapshotState } from '../epg/now-snapshot'
import type { EpgLoadStatus } from '../epg/types'

/**
 * Vad vyerna ska säga medan tablån är på väg (spec 4.2).
 *
 * Statusen LÄSES ur det nu-snapshot modellen redan hämtat — hooken hämtar
 * ingenting själv. Tidigare hämtade den ett eget snapshot utan källa, parallellt
 * med modellens med aktiv källa: två svar på upp till 3 MB vid varje start, som
 * dessutom kunde säga olika saker.
 *
 * - `idle`: ingen lista (ingen EPG-källa konfigurerad alls)
 * - `empty`: inga EPG-URL:er, eller appen har hämtat men saknar program
 * - `loading`: modellens hämtning är på väg, eller appen har ännu inte hämtat
 * - `ready`: det finns program att visa
 * - `error`: anropet mot appen föll
 */
export function useEpgLoadStatus(listId: string | null, urls: string[]): EpgLoadStatus {
  const [state, setState] = useState<NowSnapshotState>(() => getActiveNowSnapshot())

  useEffect(() => {
    setState(getActiveNowSnapshot())
    return subscribeNowSnapshot(() => setState(getActiveNowSnapshot()))
  }, [])

  if (!listId) return 'idle'
  // `count` räknas en gång när svaret kommer, inte per render.
  if (state.snapshot && state.snapshot.count > 0) return 'ready'
  if (state.failed) return 'error'
  if (urls.length === 0) return 'empty'
  if (state.snapshot && state.snapshot.fetchedAt !== null) return 'empty'
  return 'loading'
}
