'use client'

import { fetchLibraryStatus, isLibraryScanRunning, runLibraryScan } from '@/lib/plugin-sdk'
import { setVodCategoryChoice } from './vod-category-filter'
import { maybeAutoScanVod } from './vod-autoscan'
import { vodLibraryProvider } from './vod-library-provider'
import { vodLibrarySourceId } from './vod-library-map'
import { vodSourceLabel } from './vod-library-rows'

/**
 * Sparar valet och låter biblioteket följa det.
 *
 * Finns redan ett byggt bibliotek för källan görs en FULL genomgång: den tar
 * bort titlarna i kategorier som valts bort (motorn räknar bort det som inte
 * kom med) och lägger till de som valts tillbaka. Annars får det automatiska
 * svepet chansen — det väntade just på det här valet.
 *
 * Genomgången körs i bakgrunden; valet är sparat och vyerna filtrerade direkt.
 */
export async function applyVodCategoryChoice(source: string, excluded: readonly string[]): Promise<void> {
  setVodCategoryChoice(source, excluded)
  try {
    const libraryId = vodLibrarySourceId(source)
    const library = await fetchLibraryStatus()
    const built = library?.sources?.find((entry) => entry.id === libraryId && entry.lastFullSync)
    if (!built) {
      await maybeAutoScanVod()
      return
    }
    if (isLibraryScanRunning()) return
    await runLibraryScan(
      vodLibraryProvider,
      { id: libraryId, name: vodSourceLabel(source), cursor: built.cursor ?? null },
      { mode: 'full' },
    )
  } catch (err) {
    console.warn('[live-tv] VOD-kategorival', err)
  }
}
