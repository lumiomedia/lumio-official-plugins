import { describe, expect, it } from 'vitest'
import { buildScrobblePayload, buildWatchedPayload, buildWatchlistPayload, toIds } from './payloads'

describe('payloads', () => {
  it('toIds gör tmdb till tal och kräver minst ett id', () => {
    expect(toIds('603', 'tt0133093')).toEqual({ tmdb: 603, imdb: 'tt0133093' })
    expect(toIds(null, null)).toBeNull()
    expect(toIds('abc', null)).toBeNull()
  })

  it('scrobble för film och avsnitt', () => {
    expect(buildScrobblePayload({ action: 'start', mediaType: 'movie', tmdbId: '603', imdbId: null, season: null, episode: null, progress: 42.5 }))
      .toEqual({ movie: { ids: { tmdb: 603 } }, progress: 42.5 })
    expect(buildScrobblePayload({ action: 'pause', mediaType: 'episode', tmdbId: '1399', imdbId: null, season: 1, episode: 2, progress: 10 }))
      .toEqual({ show: { ids: { tmdb: 1399 }, season: { number: 1, episode: { number: 2 } } }, progress: 10 })
    expect(buildScrobblePayload({ action: 'pause', mediaType: 'episode', tmdbId: '1399', imdbId: null, season: null, episode: 2, progress: 10 })).toBeNull()
  })

  it('sedda grupperas per serie och säsong', () => {
    expect(buildWatchedPayload([
      { kind: 'movie', tmdbId: '603', imdbId: null, watchedAt: 'T1' },
      { kind: 'episode', tmdbId: '1399', season: 1, episode: 1, watchedAt: 'T2' },
      { kind: 'episode', tmdbId: '1399', season: 1, episode: 2, watchedAt: 'T3' },
      { kind: 'episode', tmdbId: '1399', season: 2, episode: 1, watchedAt: 'T4' },
    ])).toEqual({
      movies: [{ ids: { tmdb: 603 }, watched_at: 'T1' }],
      shows: [{
        ids: { tmdb: 1399 },
        seasons: [
          { number: 1, episodes: [{ number: 1, watched_at: 'T2' }, { number: 2, watched_at: 'T3' }] },
          { number: 2, episodes: [{ number: 1, watched_at: 'T4' }] },
        ],
      }],
    })
  })

  it('watchlist-payload per typ', () => {
    const entries = [{ tmdbId: '1399', imdbId: 'tt0944947', title: 'GoT', posterUrl: null }]
    expect(buildWatchlistPayload(entries, 'show')).toEqual({ shows: [{ tmdb: 1399, imdb: 'tt0944947' }] })
    expect(buildWatchlistPayload(entries, 'movie')).toEqual({ movies: [{ tmdb: 1399, imdb: 'tt0944947' }] })
  })
})
