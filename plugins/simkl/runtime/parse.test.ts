import { describe, expect, it } from 'vitest'
import { parseActivities, parseAllItems, parseTrending, parseUser } from './parse'
import activities from './__fixtures__/activities.json'
import full from './__fixtures__/all-items-full.json'
import idsOnly from './__fixtures__/all-items-ids-only-externals.json'
import movies from './__fixtures__/all-items-movies.json'
import trendingAnime from './__fixtures__/trending-anime-week.json'
import trendingMovies from './__fixtures__/trending-movies-today.json'

describe('SIMKL-parsning', () => {
  it('aktiviteter: topptiden och varje hink som "typ.status"', () => {
    const parsed = parseActivities(activities)
    expect(parsed.all).toBe('2026-05-14T07:12:20Z')
    expect(parsed.buckets['tv_shows.watching']).toBe('2026-05-04T19:40:58Z')
    expect(Object.keys(parsed.buckets).some((k) => k.startsWith('settings'))).toBe(false)
  })

  it('all-items: filmer med tmdb som sträng och status', () => {
    const items = parseAllItems(movies)
    expect(items[0]).toEqual(expect.objectContaining({ kind: 'movie', status: 'completed', imdbId: 'tt0068646', title: 'The Godfather' }))
  })

  it('all-items: serier med sedda avsnitt (extended=full)', () => {
    const items = parseAllItems(full)
    const withEpisodes = items.find((i) => i.episodes.length > 0)
    expect(withEpisodes?.episodes[0]).toEqual({ season: 1, episode: 2, watchedAt: '2026-05-15T00:32:20Z' })
  })

  it('all-items: ids_only med externa id:n ger tmdb', () => {
    expect(parseAllItems(idsOnly)[0]).toEqual(expect.objectContaining({ kind: 'movie', tmdbId: '238', simkl: 53434 }))
  })

  it('tomt svar ({}) är en tom lista', () => {
    expect(parseAllItems({})).toEqual([])
  })

  it('trendande: tmdb och typ, i filens ordning', () => {
    const items = parseTrending(trendingMovies, 'movie')
    expect(items[0]).toEqual({ mediaType: 'movie', tmdbId: '969681', imdbId: 'tt22084616', title: 'Spider-Man: Brand New Day', posterUrl: null })
    expect(parseTrending(trendingAnime, 'tv').every((i) => i.mediaType === 'tv')).toBe(true)
  })

  it('trendande anime-film slås upp som film', () => {
    expect(parseTrending([{ title: 'A', anime_type: 'movie', ids: { tmdb: '5' } }], 'tv')[0].mediaType).toBe('movie')
  })

  it('kontot ur /users/settings: namn, id och plan', () => {
    expect(parseUser({ user: { name: 'jane_doe' }, account: { id: 12345, type: 'free' } }))
      .toEqual({ username: 'jane_doe', accountKey: 'id:12345', supporter: false })
    expect(parseUser({ user: { name: 'x' }, account: { id: 1, type: 'vip' } }).supporter).toBe(true)
    expect(parseUser(null)).toEqual({ username: null, accountKey: null, supporter: false })
  })
})
