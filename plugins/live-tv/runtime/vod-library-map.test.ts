// runtime/vod-library-map.test.ts
//
// Bron mellan värdens VOD-index och kärnans biblioteksindex. Reglerna här är
// de som tystnar när de bryts: fel sourceId gör att batch_handler hoppar över
// titeln utan felmeddelande, och fel tidsenhet sorterar hela biblioteket fel.
import { describe, expect, it } from 'vitest'
import type { VodItem } from './vod-client'
import { seriesIdFromKey, vodItemToLibraryTitle, vodLibrarySourceId } from './vod-library-map'

const movie: VodItem = {
  key: 'vod:4211',
  kind: 'movie',
  title: 'Sicario',
  posterUrl: 'http://panel/poster.jpg',
  year: 2015,
  rating: 7.6,
  addedAt: 1_700_000_000,
  categoryId: '12',
  categoryName: 'MOVIE: Swedish',
  tmdbId: 273481,
  streamId: 4211,
  url: 'http://panel/movie/u/p/4211.mkv',
}

const series: VodItem = {
  key: 'series:88',
  kind: 'series',
  title: 'Dark Matter',
  categoryId: '30',
  categoryName: 'SERIES: Sci-Fi',
  seriesId: 88,
}

describe('vodLibrarySourceId', () => {
  it('ger en källa per Xtream-konto', () => {
    expect(vodLibrarySourceId('kkz')).toBe('xtream-vod:kkz')
    expect(vodLibrarySourceId('nordy')).toBe('xtream-vod:nordy')
  })
})

describe('vodItemToLibraryTitle', () => {
  it('prefixar nyckeln med källan, och sourceId matchar den', () => {
    // Matchar de inte varandra sväljer batch_handler titeln tyst — den
    // vanligaste tysta felkällan i hela kedjan.
    const out = vodItemToLibraryTitle(movie, 'kkz')!
    expect(out.key).toBe('xtream-vod:kkz:vod:4211')
    expect(out.sourceId).toBe('xtream-vod:kkz')
    expect(out.key.startsWith(`${out.sourceId}:`)).toBe(true)
  })

  it('ger filmen exakt en spelbar version med panelens url', () => {
    const out = vodItemToLibraryTitle(movie, 'kkz')!
    expect(out.media).toHaveLength(1)
    expect(out.media![0].playRef).toBe('http://panel/movie/u/p/4211.mkv')
  })

  it('låter en film utan url sakna version i stället för att låtsas', () => {
    const out = vodItemToLibraryTitle({ ...movie, url: undefined }, 'kkz')!
    expect(out.media).toEqual([])
  })

  it('ger serien inga versioner och inga avsnitt än', () => {
    const out = vodItemToLibraryTitle(series, 'kkz')!
    expect(out.kind).toBe('series')
    expect(out.media).toEqual([])
    expect(out.episodes).toEqual([])
  })

  it('markerar svansen utan TMDB-id som unmatched', () => {
    expect(vodItemToLibraryTitle(movie, 'kkz')!.matchState).toBe('matched')
    expect(vodItemToLibraryTitle({ ...movie, tmdbId: undefined }, 'kkz')!.matchState).toBe('unmatched')
    expect(vodItemToLibraryTitle({ ...movie, tmdbId: undefined, imdbId: 'tt123' }, 'kkz')!.matchState).toBe('matched')
  })

  it('lämnar addedAt i sekunder', () => {
    // Båda sidor räknar i Unix-sekunder. En konvertering till ms hade
    // multiplicerat tiden med tusen (se noten i vod-library-map.ts).
    expect(vodItemToLibraryTitle(movie, 'kkz')!.addedAt).toBe(1_700_000_000)
  })

  it('gör kategorinamnet till versionens etikett, aldrig till en genre', () => {
    const out = vodItemToLibraryTitle(movie, 'kkz')!
    expect(out.media![0].label).toBe('MOVIE: Swedish')
    expect(out.genres).toEqual([])
  })

  it('hoppar över poster utan nyckel eller titel', () => {
    expect(vodItemToLibraryTitle({ ...movie, key: '' }, 'kkz')).toBeNull()
    expect(vodItemToLibraryTitle({ ...movie, title: '   ' }, 'kkz')).toBeNull()
  })
})

describe('seriesIdFromKey', () => {
  it('läser serie-id:t ur nyckeln', () => {
    // Serie-id:t bärs av nyckeln i stället för av ett eget fält på
    // LibraryTitle — kärnan äger det kontraktet och ska inte få ett
    // Xtream-specifikt fält.
    expect(seriesIdFromKey('series:88')).toBe(88)
  })

  it('ger null för allt annat', () => {
    expect(seriesIdFromKey('vod:4211')).toBeNull()
    expect(seriesIdFromKey('series:')).toBeNull()
    expect(seriesIdFromKey('series:abc')).toBeNull()
  })
})
