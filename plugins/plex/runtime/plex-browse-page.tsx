'use client'

import { useState } from 'react'
import type { BrowsePageProps, FilterOptions, MediaFilters } from '@/lib/plugin-sdk'
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

export function PlexBrowsePage({ onOpenDetails }: BrowsePageProps) {
  const [filters, setFilters] = useState<MediaFilters>(defaultFilters)
  const [, setFilterOptions] = useState<FilterOptions>(defaultFilterOptions)

  return (
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
  )
}
