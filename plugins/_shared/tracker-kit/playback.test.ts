import { describe, expect, it } from 'vitest'
import { normalizePlaybackRow, playbackRows, pullPlayback } from './playback'

describe('playback-rader', () => {
  it('SIMKL: tmdb som text, avsnitt under episode', () => {
    const row = normalizePlaybackRow({ id: 9, progress: 42.5, paused_at: '2026-10-24T20:00:00Z', type: 'episode',
      show: { title: 'S', ids: { simkl: 1, tmdb: '1399', imdb: 'tt0944947' } }, episode: { season: 2, episode: 4 } })
    expect(row).toMatchObject({ type: 'episode', show: { ids: { tmdb: 1399, imdb: 'tt0944947' } }, episode: { season: 2, number: 4 } })
  })

  it('MDBList: film, hinkar i svaret', () => {
    const rows = playbackRows({ movies: [{ id: 1, progress: 30, type: 'movie', movie: { title: 'X', ids: { tmdb: 767 } } }], episodes: [] })
    expect(rows).toHaveLength(1)
    expect(normalizePlaybackRow(rows[0])).toMatchObject({ type: 'movie', movie: { ids: { tmdb: 767 } } })
  })

  it('utan mottagare görs inget anrop', async () => {
    let called = false
    const n = await pullPlayback({ enabled: true, importer: null, fetch: async () => { called = true; return { ok: true, data: [] } }, log: () => {} })
    expect(n).toBe(0)
    expect(called).toBe(false)
  })
})
