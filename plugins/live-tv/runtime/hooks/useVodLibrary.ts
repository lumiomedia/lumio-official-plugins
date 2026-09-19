'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  listVodCategories,
  onVodChanged,
  queryVod,
  type VodCategory,
  type VodItem,
  type VodSort,
} from '../vod-client'

/** En sida i affischrutnätet. 120 titlar ≈ 17 rader à 7 — långt under taket. */
const PAGE_SIZE = 120

/**
 * Hur länge vyn väntar på en pågående import innan den frågar igen. Panelen
 * svarar med 49 000 titlar; några sekunder är normalt, och en tätare poll
 * skulle bara belasta värden medan den arbetar.
 */
const IMPORT_POLL_MS = 2_000

export interface VodLibraryCategories {
  categories: VodCategory[]
  total: number
  /** Falskt när källan inte finns i indexet — skilt från "panelen har ingen film". */
  known: boolean
  importing: boolean
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Kategorierna för en källa, med automatisk omfrågning så länge värden
 * hämtar.
 *
 * Kategorier och antal går att visa långt innan någon titel behövs — det är
 * hela vänsterkolumnen — så den här hämtas för sig och rutnätet för sig.
 */
export function useVodCategories(source: string | null): VodLibraryCategories {
  const [state, setState] = useState<Omit<VodLibraryCategories, 'reload'>>({
    categories: [],
    total: 0,
    known: false,
    importing: false,
    loading: true,
    error: null,
  })
  const [nonce, setNonce] = useState(0)
  const reload = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    /**
     * `null` betyder ALLA spellistor, inte "ingen".
     *
     * `model.activeSource` sätts bara i TV-läge (live-tv-model.ts) — på
     * skrivbordet och telefonen är den alltid null, precis som kanallistan
     * där visar hela indexet. Ett tidigt `return` här gjorde Biblioteket tomt
     * på varje yta utom TV, fast titlarna låg i indexet hela tiden.
     */
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const controller = new AbortController()

    const load = async () => {
      try {
        const result = await listVodCategories(source, controller.signal)
        if (cancelled) return
        setState({ ...result, loading: false, error: null })
        // Importen är igång: fråga igen om en stund i stället för att låta
        // vyn stå kvar på "inga titlar" tills användaren lämnar och kommer
        // tillbaka.
        if (result.importing) timer = setTimeout(load, IMPORT_POLL_MS)
      } catch (err) {
        if (cancelled || controller.signal.aborted) return
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : String(err),
        }))
      }
    }
    void load()

    // En import som blev klar någon annanstans (kanalimporten drar med sig
    // biblioteket) ska synas utan att vyn monteras om.
    const off = onVodChanged(load)
    return () => {
      cancelled = true
      controller.abort()
      if (timer) clearTimeout(timer)
      off()
    }
  }, [source, nonce])

  return useMemo(() => ({ ...state, reload }), [state, reload])
}

export interface VodLibraryPage {
  items: VodItem[]
  total: number
  known: boolean
  loading: boolean
  /** Sant medan nästa sida hämtas — rutnätet visar sina platshållare. */
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => void
}

/**
 * Affischrutnätets titlar: en sida i taget, med filter och sortering i
 * VÄRDEN.
 *
 * Varje ändring av kategori, sortering eller sökord börjar om från sida noll.
 * Den pågående hämtningen avbryts då — annars kunde en långsam sida ur den
 * FÖRRA kategorin landa efter den nya och skriva över rutnätet med fel
 * innehåll.
 */
export function useVodPage(opts: {
  source: string | null
  categoryId?: string | null
  kind?: 'movie' | 'series' | null
  q?: string
  sort: VodSort
  /** Sätt till false för att låta vyn ligga still (dold flik, stängd panel). */
  enabled?: boolean
  limit?: number
}): VodLibraryPage {
  const { source, categoryId, kind, q, sort, enabled = true, limit = PAGE_SIZE } = opts
  const [items, setItems] = useState<VodItem[]>([])
  const [total, setTotal] = useState(0)
  const [known, setKnown] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wanted, setWanted] = useState(1)

  // Sidnumret nollställs av filtret, inte av en effekt som råkar köra senare:
  // en `setWanted(1)` i samma effekt som hämtar hade gett ett extra varv.
  const filterKey = `${source ?? ''}|${categoryId ?? ''}|${kind ?? ''}|${q ?? ''}|${sort}`
  const lastFilter = useRef(filterKey)
  if (lastFilter.current !== filterKey) {
    lastFilter.current = filterKey
    if (wanted !== 1) setWanted(1)
  }

  useEffect(() => {
    // Samma regel som kategorierna: ingen källa = alla spellistor.
    if (!enabled) {
      setItems([])
      setTotal(0)
      setKnown(false)
      setLoading(false)
      return
    }
    let cancelled = false
    const controller = new AbortController()
    const first = wanted === 1
    if (first) setLoading(true)
    else setLoadingMore(true)

    void (async () => {
      try {
        const page = await queryVod({
          source: source ?? undefined,
          categoryId: categoryId ?? undefined,
          kind: kind ?? undefined,
          q: q?.trim() || undefined,
          sort,
          offset: 0,
          limit: limit * wanted,
          signal: controller.signal,
        })
        if (cancelled) return
        setItems(page.items)
        setTotal(page.total)
        setKnown(page.known)
        setError(null)
      } catch (err) {
        if (cancelled || controller.signal.aborted) return
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
    // `filterKey` bär source/kategori/kind/q/sort — de ligger inte var för sig
    // i listan för att en ändring av flera på en gång ska ge EN hämtning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, wanted, enabled, limit])

  const hasMore = items.length < total
  /**
   * Nästa sida hämtas som `offset 0, limit n×sidan` — hela listan om igen,
   * inte ett tillägg.
   *
   * Det låter slösaktigt och är det också (sida 5 = 600 titlar över en
   * localhost-brygga, någon hundra kilobyte). Det är priset för att svaret
   * alltid är internt konsekvent: sorteringen sker i värden, och en omimport
   * mitt i en rullning skulle med tilläggsvägen ge dubbletter och hål i
   * rutnätet — rader som flyttat sig mellan två offset. Byt först när sidorna
   * blir så många att det märks.
   */
  const loadMore = useCallback(() => {
    setWanted((n) => n + 1)
  }, [])

  return { items, total, known, loading, loadingMore, error, hasMore, loadMore }
}
