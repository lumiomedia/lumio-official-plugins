'use client'

import { useEffect, useState } from 'react'
import type { BrowsePageProps, FilterOptions, MediaFilters } from '@/lib/plugin-sdk'
import { useLang } from '@/lib/plugin-sdk'
import { PlexGrid } from './plex-grid'

const defaultFilterOptions: FilterOptions = {
  providers: [],
  genres: [],
  genreGroups: {
    movie: [],
    tv: [],
  },
  keywords: [],
  originalLanguages: [],
  yearRange: {
    min: 1900,
    max: new Date().getFullYear(),
  },
}

const defaultFilters: MediaFilters = {
  titleQuery: '',
  mediaType: 'all',
  genres: [],
  providers: [],
  keywords: [],
  originalLanguages: [],
  yearMin: 1900,
  yearMax: new Date().getFullYear(),
  ratingMin: 0,
  ratingMax: 10,
  sortBy: 'rating_desc',
  page: 1,
  pageSize: 24,
  popularMode: null,
}

export function PlexBrowsePage({ params, onOpenDetails }: BrowsePageProps) {
  const { t } = useLang()
  const [filters, setFilters] = useState<MediaFilters>(() => ({
    ...defaultFilters,
    titleQuery: params?.titleQuery ?? '',
  }))
  const [refreshRequestToken, setRefreshRequestToken] = useState(0)
  const [refreshingGrid, setRefreshingGrid] = useState(false)
  const [, setFilterOptions] = useState<FilterOptions>(defaultFilterOptions)
  const [gridEmpty, setGridEmpty] = useState(false)

  /**
   * Knappraden döljs bara när BIBLIOTEKET är tomt — inte när ett filter gav
   * noll träffar.
   *
   * Skillnaden är viktig: filtrerar man till Serier och får inget, och raden
   * försvinner, så finns ingen väg till "Rensa" längre. Då är användaren
   * inlåst i ett tomt läge. Ett tomt bibliotek har däremot inget att filtrera
   * på, och där är raden bara brus över ett tomläge.
   */
  const hasActiveFilters = filters.mediaType !== 'all'
    || filters.genres.length > 0
    || Boolean(filters.titleQuery)
  const showControls = !gridEmpty || hasActiveFilters

  useEffect(() => {
    const incoming = params?.titleQuery ?? ''
    setFilters((current) => current.titleQuery === incoming ? current : { ...current, titleQuery: incoming, page: 1 })
  }, [params?.titleQuery])

  const buttonBase = 'rounded-full border border-transparent bg-[#fcfcff14] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] backdrop-blur-md transition'
  const buttonActive = 'bg-[#fcfcff2e] text-white'
  const buttonInactive = 'text-slate-400 hover:bg-[#fcfcff22] hover:text-slate-200'

  return (
    <div className="space-y-4">
      {showControls ? (
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={buttonBase + ' ' + (filters.mediaType == 'all' ? buttonActive : buttonInactive)}
              onClick={() => setFilters((current) => ({ ...current, mediaType: 'all', page: 1 }))}
            >
              {t('all')}
            </button>
            <button
              type="button"
              className={buttonBase + ' ' + (filters.mediaType == 'movie' ? buttonActive : buttonInactive)}
              onClick={() => setFilters((current) => ({ ...current, mediaType: 'movie', page: 1 }))}
            >
              {t('movies')}
            </button>
            <button
              type="button"
              className={buttonBase + ' ' + (filters.mediaType == 'tv' ? buttonActive : buttonInactive)}
              onClick={() => setFilters((current) => ({ ...current, mediaType: 'tv', page: 1 }))}
            >
              {t('series')}
            </button>
          </div>
          <button
            type="button"
            className={`${buttonBase} ${buttonInactive} hidden sm:inline-flex`}
            onClick={() => setFilters(defaultFilters)}
          >
            {t('clear')}
          </button>
        </div>
        <button
          type="button"
          disabled={refreshingGrid}
          className={`${buttonBase} ${refreshingGrid ? 'text-slate-300/60 border-white/15 cursor-wait' : buttonInactive}`}
          onClick={() => setRefreshRequestToken((value) => value + 1)}
        >
          {refreshingGrid ? t('refreshing') : t('refresh')}
        </button>
      </div>
      ) : null}

      <PlexGrid
        filters={filters}
        onOpenDetails={onOpenDetails}
        refreshRequestToken={refreshRequestToken}
        onRefreshStateChange={setRefreshingGrid}
        onFilterOptionsChange={setFilterOptions}
        onEmptyChange={setGridEmpty}
        onGenreSelect={(genre) =>
          setFilters((current) => ({
            ...current,
            page: 1,
            genres: current.genres.includes(genre) ? current.genres : [...current.genres, genre],
          }))
        }
        onClearFilters={() => setFilters(defaultFilters)}
      />
    </div>
  )
}
