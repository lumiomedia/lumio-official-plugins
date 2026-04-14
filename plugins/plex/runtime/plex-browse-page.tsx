'use client'

import { useMemo, useState } from 'react'
import type { BrowsePageProps, FilterOptions, MediaFilters } from '@/lib/plugin-sdk'
import { useLang } from '@/lib/plugin-sdk'
import { PlexGrid } from './plex-grid'
import { getPlexSettings } from './plex-storage'

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

export function PlexBrowsePage({ onOpenDetails }: BrowsePageProps) {
  const { lang } = useLang()
  const [filters, setFilters] = useState<MediaFilters>(defaultFilters)
  const [, setFilterOptions] = useState<FilterOptions>(defaultFilterOptions)
  const settings = getPlexSettings()

  const labels = useMemo(() => {
    const isSv = lang === 'sv'
    return {
      all: isSv ? 'Alla' : 'All',
      movies: isSv ? 'Filmer' : 'Movies',
      series: isSv ? 'Serier' : 'Series',
      searchPlaceholder: isSv ? 'Sok titel' : 'Search title',
      clearFilters: isSv ? 'Rensa' : 'Clear',
      server: isSv ? 'Server' : 'Server',
      libraries: isSv ? 'Bibliotek' : 'Libraries',
    }
  }, [lang])

  const serverLabel = settings.serverName || settings.serverUri || ''
  const libraryLabel = settings.libraries.map((library) => library.title).filter(Boolean).join(' / ')

  const buttonBase = 'rounded-full border border-white/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition'
  const buttonActive = 'bg-white/15 text-white border-white/30'
  const buttonInactive = 'text-slate-400 hover:border-white/25 hover:text-slate-200'

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={buttonBase + ' ' + (filters.mediaType == 'all' ? buttonActive : buttonInactive)}
              onClick={() => setFilters((current) => ({ ...current, mediaType: 'all', page: 1 }))}
            >
              {labels.all}
            </button>
            <button
              type="button"
              className={buttonBase + ' ' + (filters.mediaType == 'movie' ? buttonActive : buttonInactive)}
              onClick={() => setFilters((current) => ({ ...current, mediaType: 'movie', page: 1 }))}
            >
              {labels.movies}
            </button>
            <button
              type="button"
              className={buttonBase + ' ' + (filters.mediaType == 'tv' ? buttonActive : buttonInactive)}
              onClick={() => setFilters((current) => ({ ...current, mediaType: 'tv', page: 1 }))}
            >
              {labels.series}
            </button>
          </div>
          <div className="flex min-w-[180px] flex-1 items-center">
            <input
              type="search"
              value={filters.titleQuery}
              onChange={(event) => setFilters((current) => ({ ...current, titleQuery: event.target.value, page: 1 }))}
              placeholder={labels.searchPlaceholder}
              className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 hover:border-white/20 focus:border-white/30"
            />
          </div>
          <button
            type="button"
            className={buttonBase + ' ' + buttonInactive}
            onClick={() => setFilters(defaultFilters)}
          >
            {labels.clearFilters}
          </button>
        </div>
        {(serverLabel || libraryLabel) ? (
          <div className="mt-2 text-xs text-slate-400">
            {serverLabel ? (labels.server + ': ' + serverLabel) : ''}
            {serverLabel && libraryLabel ? ' / ' : ''}
            {libraryLabel ? (labels.libraries + ': ' + libraryLabel) : ''}
          </div>
        ) : null}
      </div>

      <PlexGrid
        filters={filters}
        onOpenDetails={onOpenDetails}
        onFilterOptionsChange={setFilterOptions}
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
