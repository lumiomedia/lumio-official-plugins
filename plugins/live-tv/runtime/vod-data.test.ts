import { beforeEach, describe, expect, it } from 'vitest'
import { __resetPluginStorageForTests } from '@/lib/plugin-sdk'
import {
  canOpenDetails,
  getVodCategory,
  getVodMode,
  getVodSort,
  mediaItemIdFor,
  openVodItem,
  setVodCategory,
  setVodMode,
  setVodSort,
  VOD_MODE_DEFAULT,
  vodItemToMediaItem,
} from './vod-data'
import type { VodItem } from './vod-client'

function item(overrides: Partial<VodItem> = {}): VodItem {
  return {
    key: 'vod:1',
    kind: 'movie',
    title: 'Dune',
    categoryId: '5',
    categoryName: 'MOVIE: Swedish',
    ...overrides,
  }
}

describe('vod-data', () => {
  beforeEach(() => {
    __resetPluginStorageForTests?.()
  })

  it('börjar i läget link, så VOD aldrig smyger in i kanallistan', () => {
    expect(VOD_MODE_DEFAULT).toBe('link')
    expect(getVodMode('lista-1')).toBe('link')
    expect(getVodMode(null)).toBe('link')
  })

  it('håller läget per spellista', () => {
    setVodMode('lista-1', 'rows')
    setVodMode('lista-2', 'off')
    expect(getVodMode('lista-1')).toBe('rows')
    expect(getVodMode('lista-2')).toBe('off')
    expect(getVodMode('lista-3')).toBe('link')
  })

  it('faller tillbaka till link när lagringen bär skräp', () => {
    setVodMode('lista-1', 'rows')
    setVodMode('lista-1', 'hittepå' as never)
    expect(getVodMode('lista-1')).toBe('link')
  })

  it('håller vald kategori per spellista', () => {
    setVodCategory('lista-1', '5')
    setVodCategory('lista-2', '9')
    expect(getVodCategory('lista-1')).toBe('5')
    expect(getVodCategory('lista-2')).toBe('9')
    // En panel utan valet ska inte ärva en annan panels kategori-id.
    expect(getVodCategory('lista-3')).toBeNull()
  })

  it('sorterar på senast tillagda tills något annat väljs', () => {
    expect(getVodSort()).toBe('new')
    setVodSort('az')
    expect(getVodSort()).toBe('az')
    setVodSort('skräp' as never)
    expect(getVodSort()).toBe('new')
  })

  it('bygger appens id ur panelens tmdb-fält', () => {
    expect(mediaItemIdFor(item({ tmdbId: 438631 }))).toBe('movie-438631')
    expect(mediaItemIdFor(item({ kind: 'series', tmdbId: 1396 }))).toBe('tv-1396')
  })

  it('vägrar bygga ett id ur ett tomt eller orimligt tmdb-fält', () => {
    expect(mediaItemIdFor(item())).toBeNull()
    expect(mediaItemIdFor(item({ tmdbId: 0 }))).toBeNull()
    expect(mediaItemIdFor(item({ tmdbId: -1 }))).toBeNull()
    expect(mediaItemIdFor(item({ tmdbId: Number.NaN }))).toBeNull()
    expect(canOpenDetails(item())).toBe(false)
  })

  it('tar med panelens affisch men hittar inte på metadata', () => {
    const media = vodItemToMediaItem(item({ tmdbId: 438631, year: 2021, rating: 8.2, posterUrl: 'http://p/1.jpg' }))
    expect(media).toMatchObject({
      id: 'movie-438631',
      type: 'movie',
      year: 2021,
      posterUrl: 'http://p/1.jpg',
      source: 'tmdb',
    })
    // Detaljvyn hämtar sitt eget från TMDB — en påhittad handling hade bara
    // lyst fram tills den riktiga kom.
    expect(media?.overview).toBe('')
    expect(media?.genres).toEqual([])
  })

  it('öppnar detaljvyn genom appens seam', () => {
    const seen: unknown[] = []
    const handler = (event: Event) => seen.push((event as CustomEvent).detail)
    window.addEventListener('lumio-open-media-item', handler)
    try {
      expect(openVodItem(item({ tmdbId: 1396, kind: 'series' }))).toBe(true)
    } finally {
      window.removeEventListener('lumio-open-media-item', handler)
    }
    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({ source: 'live-tv-library', item: { id: 'tv-1396' } })
  })

  it('säger ifrån i stället för att tyst göra ingenting utan tmdb-id', () => {
    const seen: unknown[] = []
    const handler = () => seen.push(1)
    window.addEventListener('lumio-open-media-item', handler)
    try {
      expect(openVodItem(item())).toBe(false)
    } finally {
      window.removeEventListener('lumio-open-media-item', handler)
    }
    expect(seen).toHaveLength(0)
  })
})
