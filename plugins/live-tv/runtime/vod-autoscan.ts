import { fetchLibraryStatus, isLibraryScanRunning, readPluginJson, runLibraryScan, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from './live-tv-data'
import { vodStatus } from './vod-client'
import { vodLibraryProvider } from './vod-library-provider'
import { vodLibraryRows } from './vod-library-rows'
import { VOD_LIBRARY_PROVIDER_ID } from './vod-library-map'

const AUTOSCAN_KEY = 'live_tv_vod_autoscan_v1'

/** Skydd mot två samtidiga anrop inom samma session (flaggan skrivs först efter awaiten på status). */
let inFlight = false

/**
 * Indexerar VOD automatiskt, en enda gång.
 *
 * Flaggan sätts INNAN genomgången startar: en krasch eller ett fel ger då
 * aldrig en loop. Hoppar över om något index redan finns, om värden kör en
 * annan genomgång eller om det inte finns någon VOD-källa. Källorna körs i tur
 * och ordning, och ett fel avbryter inte nästa.
 */
export async function maybeAutoScanVod(): Promise<'started' | 'skipped'> {
  if (inFlight) return 'skipped'
  if (readPluginJson<boolean>(LIVE_TV_PLUGIN_ID, AUTOSCAN_KEY, false)) return 'skipped'
  if (isLibraryScanRunning()) return 'skipped'
  inFlight = true
  try {
    const [sources, library] = await Promise.all([vodStatus(), fetchLibraryStatus()])
    if (library?.sources?.some((entry) => entry.id.startsWith(`${VOD_LIBRARY_PROVIDER_ID}:`) && entry.lastFullSync)) return 'skipped'
    const rows = vodLibraryRows(sources, library).filter((row) => row.indexedTitles === null)
    if (rows.length === 0) return 'skipped'
    // Statusfrågorna tog tid — kolla låset igen precis innan vi startar.
    if (isLibraryScanRunning()) return 'skipped'
    writePluginJson(LIVE_TV_PLUGIN_ID, AUTOSCAN_KEY, true)
    for (const row of rows) {
      try {
        await runLibraryScan(vodLibraryProvider, { id: row.libraryId, name: row.label, cursor: null }, { mode: 'full' })
      } catch (err) {
        console.warn('[live-tv] VOD-autoindex', err)
      }
    }
    return 'started'
  } catch (err) {
    console.warn('[live-tv] VOD-autoindex', err)
    return 'skipped'
  } finally {
    inFlight = false
  }
}

/** Bara för tester: nollställ flaggan och vakten. */
export function resetVodAutoScanForTests(): void {
  inFlight = false
  writePluginJson(LIVE_TV_PLUGIN_ID, AUTOSCAN_KEY, false, { emitChange: false })
}
