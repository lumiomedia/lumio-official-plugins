'use client'

/**
 * VOD som BIBLIOTEKSKÄLLA — leverantören.
 *
 * Fas A2 i `Moviefinder/docs/superpowers/plans/2026-09-20-vod-bibliotekslage.md`.
 *
 * Katalogen läses ur VÄRDENS redan importerade VOD-index, inte ur panelen:
 * `/api/live-tv/vod/query` svarar ur `live-tv-vod-index.json`, som Xtream-
 * importen redan fyllt. Skanningen gör alltså noll paneluppslag, kräver ingen
 * inloggning och kan inte läcka ett lösenord in i biblioteksindexet.
 *
 * Avsnitten är en annan sak — de kräver inloggning — och fylls lat i fas B.
 * Därför ligger leverantören i PLUGINET och inte i appen: inloggningarna bor
 * här (`getXtreamLogins()`), och värden sparar dem aldrig.
 */

import type { LibraryBatch, LibraryScanProgress, LibraryTitle } from '@/lib/library/types'
import { queryVod, vodStatus, type VodItem } from './vod-client'
import { vodItemToLibraryTitle, VOD_LIBRARY_PROVIDER_ID } from './vod-library-map'

/**
 * Batchstorlek.
 *
 * SDK:t säger «≤ ~200 titlar» per `emit`. En panel har 40 000 filmer, alltså
 * ~200 anrop — det är avsiktligt uppdelat så förloppsvyn rör sig och en
 * avbruten skanning inte kastar bort allt.
 */
export const VOD_SCAN_PAGE = 200

/** `xtream-vod:<konto>` → `<konto>`. */
export function vodSourceFromLibraryId(libraryId: string): string | null {
  const prefix = `${VOD_LIBRARY_PROVIDER_ID}:`
  return libraryId.startsWith(prefix) ? libraryId.slice(prefix.length) || null : null
}

export interface VodScanDeps {
  query: typeof queryVod
  status: typeof vodStatus
}

const defaultDeps: VodScanDeps = { query: queryVod, status: vodStatus }

export interface VodScanResult {
  titles: number
  /** `updatedAt` för källan när skanningen började — nästa deltas markör. */
  cursor: string | null
}

/**
 * Sidvis genomgång av en källas VOD-katalog.
 *
 * Markören läses FÖRE första sidan: hinner en import köra klart mitt i
 * skanningen ska nästa delta göra om jobbet, inte hoppa över det som hann
 * ändras.
 */
export async function scanVodSource(
  libraryId: string,
  emit: (batch: LibraryBatch) => Promise<void>,
  progress: (state: LibraryScanProgress) => void,
  signal: AbortSignal | undefined,
  deps: VodScanDeps = defaultDeps,
): Promise<VodScanResult> {
  const source = vodSourceFromLibraryId(libraryId)
  if (!source) return { titles: 0, cursor: null }

  const sources = await deps.status()
  const cursor = sources.find((entry) => entry.id === source)?.updatedAt ?? null

  let offset = 0
  let titles = 0
  progress({ phase: 'listing', done: 0 })
  for (;;) {
    if (signal?.aborted) break
    const page = await deps.query({ source, offset, limit: VOD_SCAN_PAGE, sort: 'new', signal })
    const upsert = page.items
      .map((item: VodItem) => vodItemToLibraryTitle(item, source))
      .filter((title): title is LibraryTitle => title !== null)
    if (upsert.length > 0) {
      await emit({ upsert })
      titles += upsert.length
      progress({ phase: 'titles', done: titles })
    }
    // Kortare sida än begärt = sista sidan. Att i stället lita på `total`
    // hade låst sig om en import växte katalogen mitt i genomgången.
    if (page.items.length < VOD_SCAN_PAGE) break
    offset += VOD_SCAN_PAGE
  }
  return { titles, cursor: cursor === null ? null : String(cursor) }
}

/**
 * Behöver källan gås igenom igen?
 *
 * Panelen ger ingen finare granularitet än «indexet ändrades» — `updatedAt` på
 * VOD-källan. Är den oförändrad mot markören finns inget att göra, och en full
 * genomgång av 40 000 titlar var kvart hade varit ren spilld tid.
 */
export function vodDeltaNeeded(cursor: string | null, updatedAt: number | null | undefined): boolean {
  if (updatedAt === null || updatedAt === undefined) return true
  if (!cursor) return true
  return String(updatedAt) !== cursor
}

/**
 * Spelbar adress för en version.
 *
 * VOD-filmer har en färdig URL i indexet, så det normala fallet är att lämna
 * tillbaka den. Kroken finns ändå kvar som leverantörens chans att hämta en
 * FÄRSK adress — panelernas länkar kan bära token som går ut, och då är det
 * här den nya hämtas i fas B.
 */
export function vodPlaybackUrl(playRef: string | null | undefined): string | null {
  const ref = typeof playRef === 'string' ? playRef.trim() : ''
  // Bara en riktig adress. En tom eller trasig `playRef` ska ge "ingen
  // uppspelning" i stället för att skicka skräp till spelaren.
  if (!/^https?:\/\//i.test(ref)) return null
  return ref
}

/**
 * Leverantörsobjektet.
 *
 * Typen kommer ur appens SDK; i pluginets tester pekar `@/lib/plugin-sdk` på
 * en stubb utan den, men en `import type` raderas vid körning så testerna rörs
 * inte. Formen kontrolleras vid pluginbygget, mot appens riktiga SDK.
 */
export const vodLibraryProvider = {
  id: VOD_LIBRARY_PROVIDER_ID,
  label: { en: 'Xtream VOD', sv: 'Xtream VOD' },
  pluginId: 'com.lumio.live-tv',
  async scanAll(
    source: { id: string },
    emit: (batch: LibraryBatch) => Promise<void>,
    progress: (state: LibraryScanProgress) => void,
    signal: AbortSignal,
  ) {
    const out = await scanVodSource(source.id, emit, progress, signal)
    return { titles: out.titles, cursor: out.cursor }
  },
  async scanDelta(
    source: { id: string },
    cursor: string | null,
    emit: (batch: LibraryBatch) => Promise<void>,
    progress: (state: LibraryScanProgress) => void,
    signal: AbortSignal,
  ) {
    // Panelen ger ingen finare granularitet än "indexet ändrades". Är det
    // oförändrat finns inget att göra — se `vodDeltaNeeded`.
    const account = vodSourceFromLibraryId(source.id)
    const updatedAt = account
      ? (await vodStatus()).find((entry) => entry.id === account)?.updatedAt ?? null
      : null
    if (!vodDeltaNeeded(cursor, updatedAt)) return { titles: 0, cursor }
    const out = await scanVodSource(source.id, emit, progress, signal)
    return { titles: out.titles, cursor: out.cursor }
  },
  async resolvePlayback(_source: unknown, media: { playRef?: string | null }) {
    const url = vodPlaybackUrl(media.playRef)
    return url ? { url } : null
  },
}
