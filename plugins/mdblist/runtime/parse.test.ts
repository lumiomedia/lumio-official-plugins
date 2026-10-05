import { describe, expect, it } from 'vitest'
import { parseActivities, parseLists, parseMediaItems, parseUser, parseWatched, parseWatchlist } from './parse'
import activities from './__fixtures__/last-activities.json'
import listBySlug from './__fixtures__/list-by-slug.json'
import listItems from './__fixtures__/list-items.json'
import user from './__fixtures__/user.json'
import watchlist from './__fixtures__/watchlist.json'

describe('parsning', () => {
  it('användarnamnet och supporternivån ur /user (fixtur)', () => {
    const parsed = parseUser(user)
    expect(typeof parsed.username).toBe('string')
    expect(parsed.supporter).toBe(false)
    expect(parseUser({ username: 'x', is_supporter: true }).supporter).toBe(true)
  })

  it('tidsstämplar: bara satta *_at utom server_time (fixtur)', () => {
    expect(parseActivities(activities)).toEqual({ watchlisted_at: '2026-08-16T17:12:50.734Z' })
    expect(parseActivities({ server_time: 'S', watched_at: 'A', journal_at: 'B', count: 3 }))
      .toEqual({ watched_at: 'A', journal_at: 'B' })
  })

  it('/sync/watched → filmer och avsnitt, watched_at eller last_watched_at', () => {
    expect(parseWatched({
      movies: [{ movie: { ids: { tmdb: 603, imdb: 'tt0133093' } }, watched_at: 'T1' }],
      episodes: [{ episode: { show: { ids: { tmdb: 1399 } }, season: 1, number: 2 }, last_watched_at: 'T2' }],
    })).toEqual({
      movies: [{ tmdbId: '603', imdbId: 'tt0133093', watchedAt: 'T1' }],
      episodes: [{ tmdbId: '1399', season: 1, episode: 2, watchedAt: 'T2' }],
    })
  })

  it('medieposter i båda formerna, ordnade efter rank', () => {
    const flat = parseMediaItems({ items: [
      { id: 2, imdb_id: 'tt2', title: 'B', mediatype: 'show', rank: 2 },
      { id: 1, imdb_id: 'tt1', title: 'A', mediatype: 'movie', rank: 1 },
    ] })
    expect(flat.map((x) => [x.tmdbId, x.mediaType])).toEqual([['1', 'movie'], ['2', 'tv']])
    const split = parseMediaItems({ movies: [{ id: 1, title: 'A', mediatype: 'movie' }], shows: [{ id: 2, title: 'B', mediatype: 'show' }] })
    expect(split.map((x) => x.tmdbId).sort()).toEqual(['1', '2'])
  })

  it('poster utan tmdb-id hoppas över', () => {
    expect(parseMediaItems({ items: [{ id: null, title: 'X', mediatype: 'movie' }] })).toEqual([])
  })

  it('watchlist delas per typ, även tom (fixtur)', () => {
    expect(parseWatchlist(watchlist as unknown as Record<string, unknown[]>)).toEqual({ shows: [], movies: [] })
    const result = parseWatchlist({ items: [
      { id: 1, title: 'A', mediatype: 'movie' },
      { id: 2, title: 'B', mediatype: 'show' },
    ] })
    expect(result.movies.map((x) => x.tmdbId)).toEqual(['1'])
    expect(result.shows.map((x) => x.tmdbId)).toEqual(['2'])
  })

  it('listposter (fixtur) har tmdb-id och typ, i rankordning', () => {
    const parsed = parseMediaItems(listItems as unknown as Record<string, unknown[]>)
    expect(parsed.length).toBeGreaterThan(0)
    for (const item of parsed) {
      expect(item.tmdbId).toMatch(/^\d+$/)
      expect(['movie', 'tv']).toContain(item.mediaType)
    }
    expect(parsed[0].tmdbId).toBe('502356')
  })

  it('listmetadata ur /lists/{user}/{slug} (fixtur)', () => {
    expect(parseLists(listBySlug)).toEqual([
      { id: '14', name: 'Top Watched Movies of The Week / >60', itemCount: 42, owner: '<scrubbed>', dynamic: true },
    ])
  })
})
