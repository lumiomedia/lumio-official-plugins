/**
 * VOD SOM BIBLIOTEKSKÄLLA — raderna i inställningarna.
 *
 * Fas A3 i `Moviefinder/docs/superpowers/plans/2026-09-20-vod-bibliotekslage.md`.
 *
 * Ren sammanslagning av två listor som kommer från olika håll: värdens
 * VOD-index (`/api/live-tv/vod/status`, vad panelen importerat) och kärnans
 * biblioteksindex (`/api/library/status`, vad som byggts av det). Ingen av dem
 * känner till den andra, och UI:t ska inte behöva para ihop dem själv.
 */

import type { LibraryStatus } from '@/lib/library/types'
import type { VodSourceStatus } from './vod-client'
import { vodLibrarySourceId } from './vod-library-map'

export interface VodLibraryRow {
  /** Xtream-kontots nyckel i VOD-indexet. */
  vodSource: string
  /** Samma källa i biblioteksindexet, `xtream-vod:<konto>`. */
  libraryId: string
  /** Antal titlar panelen importerat. */
  vodTitles: number
  /** Antal titlar som finns i biblioteket, eller null när det aldrig byggts. */
  indexedTitles: number | null
  /** Värden hämtar fortfarande katalogen — en genomgång nu blir ofullständig. */
  importing: boolean
}

/**
 * En rad per Xtream-källa som FAKTISKT har VOD.
 *
 * Källor utan poster filtreras bort i stället för att visas tomma: en ren
 * kanalpanel har ingen film att bygga ett bibliotek av, och en knapp som bara
 * kan skriva en tom källa i indexet är sämre än ingen knapp.
 */
export function vodLibraryRows(sources: readonly VodSourceStatus[], library: LibraryStatus | null): VodLibraryRow[] {
  return sources
    .filter((source) => source.total > 0)
    .map((source) => {
      const libraryId = vodLibrarySourceId(source.id)
      const entry = library?.sources.find((item) => item.id === libraryId)
      return {
        vodSource: source.id,
        libraryId,
        vodTitles: source.total,
        indexedTitles: entry ? entry.titles : null,
        importing: source.importing,
      }
    })
}

/**
 * Får knappen tryckas?
 *
 * `scanning` är VÄRDENS lås (`isLibraryScanRunning` via SDK-bryggan), inte ett
 * lokalt tillstånd: synkschemaläggaren kör delta var 15:e minut och den
 * genomgången hör lika mycket hit som en som startats härifrån.
 */
export function vodLibraryBuildDisabled(row: VodLibraryRow, scanning: boolean): boolean {
  return scanning || row.importing
}
