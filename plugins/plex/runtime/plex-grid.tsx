'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Chip } from '@heroui/react'
import {
  applyFilters,
  createLanguageOption,
  getHideWatchedMoviesHome,
  getWatchedMovies,
  onPlaybackSettingsChanged,
  onWatchedMoviesChanged,
  ResultsLoadingIndicator,
  ResultsPagination,
  ResultsState,
  sortLanguageOptions,
  useLang,
  type FilterOptions,
  type MediaFilters,
  type MediaItem,
} from '@/lib/plugin-sdk'
import {
  fetchPlexLibraryItems,
} from './plex-sync'
import {
  getAnyCachedPlexLibrarySnapshot,
  getCachedPlexLibrarySnapshot,
  getPlexLibraryLastError,
  getPlexAuth,
  getPlexSettings,
  onPlexAuthChanged,
  onPlexLibraryErrorChanged,
  onPlexSettingsChanged,
} from './plex-storage'

interface PlexGridProps {
  filters: MediaFilters
  onOpenDetails: (item: MediaItem) => void
  onGenreSelect?: (genre: string) => void
  onClearFilters: () => void
  onFilterOptionsChange?: (options: FilterOptions) => void
  refreshRequestToken?: number
  onRefreshStateChange?: (refreshing: boolean) => void
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: 'base' }),
  )
}

function buildPlexLoadSignature(): string {
  const auth = getPlexAuth()
  const settings = getPlexSettings()
  return JSON.stringify({
    hasAuth: Boolean(auth?.authToken),
    serverId: settings.serverId,
    serverUri: settings.serverUri,
    libraries: settings.libraries.map((library) => `${library.type}:${library.key}`).sort(),
  })
}

function buildWatchedMovieKeys() {
  const keys = new Set<string>()
  const titleYears = new Set<string>()
  for (const entry of getWatchedMovies()) {
    const tmdbId = typeof entry.tmdbId === 'string' ? entry.tmdbId.trim() : ''
    const imdbId = typeof entry.imdbId === 'string' ? entry.imdbId.trim() : ''
    if (tmdbId) keys.add(`tmdb:${tmdbId}`)
    if (imdbId) keys.add(`imdb:${imdbId}`)
    if (typeof entry.title === 'string' && entry.title.trim() && typeof entry.year === 'number' && Number.isFinite(entry.year)) {
      titleYears.add(`${entry.title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}::${entry.year}`)
    }
  }
  return { keys, titleYears }
}

function isWatchedMovieItem(item: MediaItem, watchedMovieKeys: Set<string>, watchedMovieTitleYears: Set<string>) {
  if (item.type !== 'movie') return false
  const tmdbId = item.id.match(/^movie-(\d+)$/)?.[1] ?? null
  const imdbId = typeof item.imdbId === 'string' ? item.imdbId.trim() : ''
  const titleYear = typeof item.title === 'string' && item.title.trim() && typeof item.year === 'number' && Number.isFinite(item.year)
    ? `${item.title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}::${item.year}`
    : null
  return Boolean(
    (tmdbId && watchedMovieKeys.has(`tmdb:${tmdbId}`)) ||
    (imdbId && watchedMovieKeys.has(`imdb:${imdbId}`)) ||
    (titleYear && watchedMovieTitleYears.has(titleYear))
  )
}

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 10)
  const colorClass =
    pct >= 70 ? 'border-emerald-400/60 text-emerald-400 bg-black/70' :
    pct >= 50 ? 'border-yellow-400/60 text-yellow-400 bg-black/70' :
                'border-red-400/60 text-red-400 bg-black/70'
  return (
    <div className={`flex h-6 w-6 items-center justify-center rounded-full border backdrop-blur-sm text-[9px] font-bold ${colorClass}`}>
      {pct}
    </div>
  )
}

function PlexPosterCard({
  item,
  onPlay,
  onGenreSelect,
  eager,
}: {
  item: MediaItem
  onPlay: (item: MediaItem) => void
  onGenreSelect?: (genre: string) => void
  eager?: boolean
}) {
  const { t } = useLang()
  const metaLine = `${item.type === 'movie' ? t('movie') : t('series')}${item.year ? ` · ${item.year}` : ''}`

  return (
    <button
      type="button"
      onClick={() => onPlay(item)}
      className="group w-full cursor-pointer overflow-hidden bg-transparent text-left transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative aspect-[2/3] overflow-hidden">
        {item.posterUrl ? (
          <img
            src={item.posterUrl}
            alt={`${item.title} poster`}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            loading={eager ? 'eager' : 'lazy'}
          />
        ) : (
          <div className="flex h-full items-end bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 p-4">
            <span className="text-base font-semibold text-slate-100">{item.title}</span>
          </div>
        )}

        {/* Genre chips — bottom of poster */}
        {item.genres.length > 0 && (
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1 p-2">
            {item.genres.slice(0, 2).map((genre) => (
              <Chip
                key={genre}
                size="sm"
                variant="flat"
                onClick={onGenreSelect ? (e) => { e.stopPropagation(); onGenreSelect(genre) } : undefined}
                classNames={{
                  base: `bg-white/8 border border-white/12 h-5 backdrop-blur-sm ${onGenreSelect ? 'cursor-pointer hover:bg-white/15 hover:border-accent-400/40 transition-colors' : ''}`,
                  content: 'text-[10px] text-slate-300 px-1.5',
                }}
              >
                {genre}
              </Chip>
            ))}
          </div>
        )}

        {/* Score badge — top right */}
        {item.discoveryScore != null && item.discoveryScore > 0 && (
          <div className="absolute right-2 top-2">
            <ScoreBadge score={item.discoveryScore} />
          </div>
        )}
      </div>

      {/* Below-card info */}
      <div className="p-2.5">
        <p className="text-[9px] uppercase tracking-[0.22em] text-slate-300/60">{metaLine}</p>
        <h3 className="mt-0.5 line-clamp-2 text-[0.8rem] font-semibold leading-snug text-white">
          {item.title}
        </h3>
      </div>
    </button>
  )
}

// Module-level in-memory cache that survives unmounts (avoids jank on re-mount)
let memoryCache: { items: MediaItem[]; signature: string } | null = null

export function PlexGrid({
  filters,
  onOpenDetails,
  onGenreSelect,
  onFilterOptionsChange,
  refreshRequestToken,
  onRefreshStateChange,
}: PlexGridProps) {
  const { t } = useLang()
  const currentSignature = buildPlexLoadSignature()
  const signatureCache = (memoryCache && memoryCache.signature === currentSignature)
    ? memoryCache
    : getCachedPlexLibrarySnapshot(240)
  const fallbackCache = signatureCache ?? getAnyCachedPlexLibrarySnapshot()
  const [items, setItemsRaw] = useState<MediaItem[]>(() => fallbackCache?.items ?? [])
  const setItems = (next: MediaItem[]) => {
    setItemsRaw(next)
    memoryCache = { items: next, signature: buildPlexLoadSignature() }
  }
  const [loading, setLoading] = useState(() => (fallbackCache?.items.length ?? 0) === 0)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncError, setLastSyncError] = useState<string | null>(() => getPlexLibraryLastError()?.message ?? null)
  const [localPage, setLocalPage] = useState(1)
  const [hideWatchedMovies, setHideWatchedMovies] = useState(false)
  const [watchedMovieKeys, setWatchedMovieKeys] = useState<Set<string>>(() => new Set())
  const [watchedMovieTitleYears, setWatchedMovieTitleYears] = useState<Set<string>>(() => new Set())
  const [plexLoadSignature, setPlexLoadSignature] = useState(() => buildPlexLoadSignature())
  const loadIdRef = useRef(0)
  const loadingRef = useRef(false)
  const mountedRef = useRef(false)

  async function load(options?: { silent?: boolean; force?: boolean }) {
    // Prevent concurrent loads – only one at a time
    if (loadingRef.current) return
    loadingRef.current = true

    const thisLoadId = ++loadIdRef.current
    const silent = options?.silent === true
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    const MAX_RETRIES = 2
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      // Stale check – a newer load was requested
      if (thisLoadId !== loadIdRef.current) break

      try {
        const nextItems = await fetchPlexLibraryItems(240, { force: options?.force === true })
        if (thisLoadId !== loadIdRef.current) break
        setItems(nextItems)
        break
      } catch (nextError) {
        const message = nextError instanceof Error ? nextError.message : ''
        const isAbort = /abort/i.test(message)
        if (isAbort && attempt < MAX_RETRIES) {
          // Wait briefly then retry aborted requests
          await new Promise((r) => setTimeout(r, 500))
          continue
        }
        if (thisLoadId === loadIdRef.current) {
          setError(message || 'Plex load failed')
        }
        break
      }
    }

    if (thisLoadId === loadIdRef.current) {
      if (silent) {
        setRefreshing(false)
      } else {
        setLoading(false)
      }
    }
    loadingRef.current = false
  }

  // Single initial load on mount
  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true
    if ((fallbackCache?.items.length ?? 0) > 0) {
      setLoading(false)
      return
    }
    void load()
  }, [])

  // Listen for auth/settings changes
  useEffect(() => {
    const sync = () => {
      setPlexLoadSignature(buildPlexLoadSignature())
    }
    const offAuth = onPlexAuthChanged(sync)
    const offSettings = onPlexSettingsChanged(sync)
    const offError = onPlexLibraryErrorChanged(() => {
      setLastSyncError(getPlexLibraryLastError()?.message ?? null)
    })
    return () => {
      offAuth()
      offSettings()
      offError()
    }
  }, [])

  // Reload when signature changes (but skip the very first render – handled by mount effect)
  const prevSignatureRef = useRef(plexLoadSignature)
  useEffect(() => {
    if (prevSignatureRef.current === plexLoadSignature) return
    prevSignatureRef.current = plexLoadSignature
    const auth = getPlexAuth()
    const settings = getPlexSettings()
    if (!auth?.authToken || !settings.serverUri || settings.libraries.length === 0) return
    if (items.length > 0) {
      memoryCache = { items, signature: plexLoadSignature }
      return
    }
    void load()
  }, [items, plexLoadSignature])

  const prevRefreshRequestRef = useRef(refreshRequestToken ?? 0)
  useEffect(() => {
    if (refreshRequestToken == null) return
    if (refreshRequestToken === prevRefreshRequestRef.current) return
    prevRefreshRequestRef.current = refreshRequestToken
    void load({ silent: items.length > 0, force: true })
  }, [refreshRequestToken, items.length])

  useEffect(() => {
    onRefreshStateChange?.(loading || refreshing)
  }, [loading, refreshing, onRefreshStateChange])

  useEffect(() => {
    const sync = () => {
      setHideWatchedMovies(getHideWatchedMoviesHome())
      const next = buildWatchedMovieKeys()
      setWatchedMovieKeys(next.keys)
      setWatchedMovieTitleYears(next.titleYears)
    }
    sync()
    const offWatched = onWatchedMoviesChanged(() => {
      const next = buildWatchedMovieKeys()
      setWatchedMovieKeys(next.keys)
      setWatchedMovieTitleYears(next.titleYears)
    })
    const offSettings = onPlaybackSettingsChanged(() => setHideWatchedMovies(getHideWatchedMoviesHome()))
    return () => {
      offWatched()
      offSettings()
    }
  }, [])

  const derivedFilterOptions = useMemo<FilterOptions>(() => {
    const movieGenres = uniqueSorted(items.filter((item) => item.type === 'movie').flatMap((item) => item.genres))
    const tvGenres = uniqueSorted(items.filter((item) => item.type === 'tv').flatMap((item) => item.genres))
    const languageMap = new Map(
      items
        .flatMap((item) => item.originalLanguage?.code
          ? [[item.originalLanguage.code, createLanguageOption({ code: item.originalLanguage.code })] as const]
          : []),
    )
    const originalLanguages = sortLanguageOptions(Array.from(languageMap.values()))
    const years = items
      .map((item) => item.year)
      .filter((year): year is number => typeof year === 'number' && Number.isFinite(year))

    return {
      providers: uniqueSorted(items.flatMap((item) => item.providers)),
      genres: uniqueSorted([...movieGenres, ...tvGenres]),
      genreGroups: {
        movie: movieGenres,
        tv: tvGenres,
      },
      keywords: [],
      originalLanguages,
      yearRange: years.length > 0
        ? {
            min: Math.min(...years),
            max: Math.max(...years),
          }
        : {
            min: 1900,
            max: new Date().getFullYear(),
          },
    }
  }, [items])

  useEffect(() => {
    onFilterOptionsChange?.(derivedFilterOptions)
  }, [derivedFilterOptions, onFilterOptionsChange])

  const visibleSourceItems = useMemo(
    () => hideWatchedMovies
      ? items.filter((item) => !isWatchedMovieItem(item, watchedMovieKeys, watchedMovieTitleYears))
      : items,
    [hideWatchedMovies, items, watchedMovieKeys, watchedMovieTitleYears],
  )

  const baseFiltered = useMemo(
    () => applyFilters(visibleSourceItems, filters),
    [visibleSourceItems, filters],
  )

  const filteredItems = baseFiltered

  const paginationSignature = useMemo(
    () => JSON.stringify({
      titleQuery: filters.titleQuery,
      mediaType: filters.mediaType,
      yearMin: filters.yearMin,
      yearMax: filters.yearMax,
      genres: filters.genres,
      keywords: filters.keywords,
      originalLanguages: filters.originalLanguages,
      ratingMin: filters.ratingMin,
      ratingMax: filters.ratingMax,
      sortBy: filters.sortBy,
    }),
    [
      filters.titleQuery,
      filters.mediaType,
      filters.yearMin,
      filters.yearMax,
      filters.genres,
      filters.keywords,
      filters.originalLanguages,
      filters.ratingMin,
      filters.ratingMax,
      filters.sortBy,
    ],
  )

  useEffect(() => {
    setLocalPage(1)
  }, [paginationSignature])

  const safeCurrentPage = Math.max(1, localPage)
  const pageSize = Math.max(1, filters.pageSize)
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize))
  const currentPage = Math.min(safeCurrentPage, totalPages)
  const pagedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  useEffect(() => {
    if (safeCurrentPage !== currentPage) {
      setLocalPage(currentPage)
    }
  }, [currentPage, safeCurrentPage])


  if (loading && items.length === 0) {
    return (
      <div className="space-y-4">
        <ResultsLoadingIndicator title="Loading Plex" description="Fetching titles from your selected Plex libraries." />
      </div>
    )
  }

  if (!loading && items.length === 0) {
    return (
      <ResultsState
        title="No Plex titles"
        description={error ?? lastSyncError ?? 'No Plex titles were found in the selected libraries.'}
        actionLabel="Try again"
        onAction={() => { void load() }}
      />
    )
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          <span>Showing the latest Plex results. The refresh failed.</span>
          <button
            type="button"
            onClick={() => { void load() }}
            className="rounded-full border border-rose-200/30 px-3 py-1.5 text-xs uppercase tracking-[0.2em] transition hover:bg-white/10"
          >
            Try again
          </button>
        </div>
      ) : null}

      <div className="grid gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {pagedItems.map((item: MediaItem, i: number) => (
          <PlexPosterCard
            key={item.id}
            item={item}
            onPlay={onOpenDetails}
            onGenreSelect={onGenreSelect}
            eager={i < 18}
          />
        ))}
      </div>

      <ResultsPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setLocalPage} />
    </div>
  )
}
