'use client'

import { fetchLibraryStatus, isLibraryScanRunning, runLibraryScan } from '@/lib/plugin-sdk'
import { getVodCategoryChoice, setVodCategoryChoice, type VodCategoryMerge } from './vod-category-filter'
import { vodStatus } from './vod-client'
import { vodLibraryProvider } from './vod-library-provider'
import { vodLibrarySourceId } from './vod-library-map'
import { vodSourceLabel } from './vod-library-rows'
import { vodHiddenForActivePlaylist } from './vod-home'

/** Hur länge valet väntar på en pågående genomgång eller import innan det ger upp. */
const WAIT_LIMIT_MS = 15 * 60_000
const WAIT_STEP_MS = 2_000

const sleep = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms) })

/** Senaste begäran per källa: ett nytt val medan ett äldre väntar tar över. */
const generation = new Map<string, number>()

/**
 * Sparar valet och låter biblioteket följa det med en FULL genomgång av just
 * den källan: motorn räknar bort det som inte kom med (bortvalda kategorier)
 * och lägger till det som valts tillbaka. Gäller även en källa som aldrig
 * byggts — det automatiska svepet körs bara en gång per installation, så en
 * andra spellista hade annars aldrig kommit in.
 *
 * En annan genomgång (eller en pågående import av källan) väntas ut i stället
 * för att valet tyst blir kvar ogenomfört. Valet är sparat och vyerna
 * filtrerade direkt; genomgången går i bakgrunden.
 */
export async function applyVodCategoryChoice(source: string, excluded: readonly string[], merges?: readonly VodCategoryMerge[]): Promise<void> {
  const before = getVodCategoryChoice(source)
  setVodCategoryChoice(source, excluded, merges)
  // Bara sammanslagningarna ändrades (eller inget alls på en redan vald
  // källa): de styr visningen, inte vad biblioteket innehåller.
  const sameExcluded = before.excluded.length === excluded.length && excluded.every((key) => before.excluded.includes(key))
  if (before.decided && sameExcluded) return
  const mine = (generation.get(source) ?? 0) + 1
  generation.set(source, mine)
  try {
    const libraryId = vodLibrarySourceId(source)
    const library = await fetchLibraryStatus()
    const built = library?.sources?.find((entry) => entry.id === libraryId && entry.lastFullSync) ?? null
    // "Dölj VOD helt": samma regel som det automatiska svepet — inget nytt
    // bibliotek byggs, men ett befintligt följer valet.
    if (!built && vodHiddenForActivePlaylist()) return

    const started = Date.now()
    for (;;) {
      if (generation.get(source) !== mine) return
      const importing = (await vodStatus().catch(() => [])).some((entry) => entry.id === source && entry.importing)
      if (!importing && !isLibraryScanRunning()) break
      if (Date.now() - started > WAIT_LIMIT_MS) {
        console.warn('[live-tv] VOD-kategorival: gav upp efter väntan på pågående genomgång')
        return
      }
      await sleep(WAIT_STEP_MS)
    }
    await runLibraryScan(
      vodLibraryProvider,
      { id: libraryId, name: vodSourceLabel(source), cursor: built?.cursor ?? null },
      { mode: 'full' },
    )
  } catch (err) {
    console.warn('[live-tv] VOD-kategorival', err)
  }
}
