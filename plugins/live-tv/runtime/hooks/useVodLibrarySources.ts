'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchLibraryStatus, isLibraryScanRunning, runLibraryScan } from '@/lib/plugin-sdk'
import type { LibraryStatus } from '@/lib/library/types'
import { onVodChanged, vodStatus, type VodSourceStatus } from '../vod-client'
import { vodLibraryBuildDisabled, vodLibraryRows, type VodLibraryRow } from '../vod-library-rows'
import { vodLibraryProvider } from '../vod-library-provider'

/**
 * "Använd som bibliotek" — tillståndet, delat av TV-inställningarna och
 * skrivbordskortet.
 *
 * Bor i en hook och inte i varje yta för sig: annars hade de två ytorna
 * kunnat visa olika antal för samma källa, och det är samma fel som
 * EPG-diagnostiken redan fått en gång (se kommentaren över `EpgTab`).
 */
export interface VodLibraryController {
  rows: VodLibraryRow[]
  /** Någon genomgång kör — värdens lås, inte bara vår egen knapp. */
  scanning: boolean
  progress: { libraryId: string; done: number } | null
  error: string | null
  build: (row: VodLibraryRow) => Promise<void>
  disabled: (row: VodLibraryRow) => boolean
}

export function useVodLibrarySources(): VodLibraryController {
  const [sources, setSources] = useState<VodSourceStatus[]>([])
  const [library, setLibrary] = useState<LibraryStatus | null>(null)
  /* VÅR knapp kör. Skilt från värdens lås nedan: den här styr förloppstexten. */
  const [ownScan, setOwnScan] = useState(false)
  /*
    VÄRDENS lås, avfrågat.
    `isLibraryScanRunning()` är en läsning utan händelse — schemaläggaren
    startar sitt delta var 15:e minut utan att säga till någon. Utan den här
    pollen var knappen avstängd bara medan VÅR egen genomgång körde, och ett
    tryck under schemaläggarens gjorde ingenting alls (build() returnerar
    tyst). En sekund räcker: panelen är öppen medan någon tittar på den, och
    läsningen är en boolean.
  */
  const [hostScan, setHostScan] = useState(false)
  useEffect(() => {
    const läs = () => setHostScan(isLibraryScanRunning())
    läs()
    const id = setInterval(läs, 1000)
    return () => clearInterval(id)
  }, [])
  const scanning = ownScan || hostScan
  const [progress, setProgress] = useState<{ libraryId: string; done: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    void vodStatus().then(setSources).catch(() => setSources([]))
    void fetchLibraryStatus().then(setLibrary).catch(() => setLibrary(null))
  }, [])

  useEffect(() => {
    refresh()
    // En avslutad import ändrar antalen — samma buss som rutnätet lyssnar på.
    return onVodChanged(refresh)
  }, [refresh])

  const rows = useMemo(() => vodLibraryRows(sources, library), [sources, library])

  const build = useCallback(async (row: VodLibraryRow) => {
    /* Värdens lås. Schemaläggarens delta var 15:e minut räknas också: två
       genomgångar mot samma källa hade skrivit batchar om varandra. */
    if (isLibraryScanRunning()) return
    setError(null)
    setOwnScan(true)
    setProgress({ libraryId: row.libraryId, done: 0 })
    try {
      const cursor = library?.sources.find((entry) => entry.id === row.libraryId)?.cursor ?? null
      await runLibraryScan(
        vodLibraryProvider,
        { id: row.libraryId, name: row.vodSource, cursor },
        { mode: 'full', onProgress: (state) => setProgress({ libraryId: row.libraryId, done: state.done }) },
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setOwnScan(false)
      setProgress(null)
      refresh()
    }
  }, [library, refresh])

  const disabled = useCallback((row: VodLibraryRow) => vodLibraryBuildDisabled(row, scanning), [scanning])

  return { rows, scanning, progress, error, build, disabled }
}
