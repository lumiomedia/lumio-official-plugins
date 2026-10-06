import { describe, expect, it } from 'vitest'
import { buildAddToListPayload, buildHistoryPayload, buildRemovePayload, buildScrobblePayload, toIds } from './payloads'

describe('SIMKL-payloads', () => {
  it('id-objektet: tmdb som tal, imdb om giltigt, null utan id', () => {
    expect(toIds('603', 'tt0133093')).toEqual({ tmdb: 603, imdb: 'tt0133093' })
    expect(toIds(null, null)).toBeNull()
  })

  it('scrobble: film, och avsnitt med season/number', () => {
    expect(buildScrobblePayload({ action: 'start', mediaType: 'movie', tmdbId: '27205', imdbId: null, season: null, episode: null, progress: 12.5 }))
      .toEqual({ movie: { ids: { tmdb: 27205 } }, progress: 12.5 })
    expect(buildScrobblePayload({ action: 'pause', mediaType: 'episode', tmdbId: '1399', imdbId: null, season: 1, episode: 3, progress: 42 }))
      .toEqual({ show: { ids: { tmdb: 1399 } }, episode: { season: 1, number: 3 }, progress: 42 })
    expect(buildScrobblePayload({ action: 'pause', mediaType: 'episode', tmdbId: '1399', imdbId: null, season: null, episode: 3, progress: 42 })).toBeNull()
  })

  it('historik grupperas per serie och säsong', () => {
    expect(buildHistoryPayload([
      { kind: 'movie', tmdbId: '603', imdbId: null, watchedAt: 'T1' },
      { kind: 'episode', tmdbId: '1399', season: 1, episode: 1, watchedAt: 'T2' },
      { kind: 'episode', tmdbId: '1399', season: 1, episode: 2, watchedAt: 'T3' },
    ])).toEqual({
      movies: [{ ids: { tmdb: 603 }, watched_at: 'T1' }],
      shows: [{ ids: { tmdb: 1399 }, seasons: [{ number: 1, episodes: [{ number: 1, watched_at: 'T2' }, { number: 2, watched_at: 'T3' }] }] }],
    })
  })

  it('add-to-list har `to` per post (en toppnivå-`to` avvisas av SIMKL)', () => {
    const entry = { tmdbId: '1399', imdbId: null, title: 'GoT', posterUrl: null }
    expect(buildAddToListPayload([entry], 'show', 'plantowatch')).toEqual({ shows: [{ to: 'plantowatch', ids: { tmdb: 1399 } }] })
    expect(buildAddToListPayload([entry], 'movie', 'plantowatch')).toEqual({ movies: [{ to: 'plantowatch', ids: { tmdb: 1399 } }] })
  })

  it('borttagning ur biblioteket: bara ids', () => {
    expect(buildRemovePayload([{ tmdbId: '603', imdbId: null, title: 'M', posterUrl: null }], 'movie')).toEqual({ movies: [{ ids: { tmdb: 603 } }] })
  })
})
