import type { MdblistIds, RemoteEntry, ScrobbleEvent } from './types'

export type WatchedPush =
  | { kind: 'movie'; tmdbId: string | null; imdbId: string | null; watchedAt: string }
  | { kind: 'episode'; tmdbId: string; season: number; episode: number; watchedAt: string }

export function toIds(tmdbId: string | null, imdbId: string | null): MdblistIds | null {
  const ids: MdblistIds = {}
  const tmdb = tmdbId != null && /^\d+$/.test(tmdbId) ? Number(tmdbId) : null
  if (tmdb != null) ids.tmdb = tmdb
  if (imdbId && /^tt\d+$/.test(imdbId)) ids.imdb = imdbId
  return ids.tmdb != null || ids.imdb != null ? ids : null
}

export function buildScrobblePayload(event: ScrobbleEvent): object | null {
  const ids = toIds(event.tmdbId, event.imdbId)
  if (!ids) return null
  if (event.mediaType === 'movie') return { movie: { ids }, progress: event.progress }
  if (event.season == null || event.episode == null) return null
  return {
    show: { ids, season: { number: event.season, episode: { number: event.episode } } },
    progress: event.progress,
  }
}

export function buildWatchedPayload(items: WatchedPush[]): { movies: object[]; shows: object[] } {
  const movies: object[] = []
  const shows = new Map<string, Map<number, Array<{ number: number; watched_at: string }>>>()
  for (const item of items) {
    if (item.kind === 'movie') {
      const ids = toIds(item.tmdbId, item.imdbId)
      if (ids) movies.push({ ids, watched_at: item.watchedAt })
      continue
    }
    if (!toIds(item.tmdbId, null)) continue
    const seasons = shows.get(item.tmdbId) ?? new Map<number, Array<{ number: number; watched_at: string }>>()
    const episodes = seasons.get(item.season) ?? []
    episodes.push({ number: item.episode, watched_at: item.watchedAt })
    seasons.set(item.season, episodes)
    shows.set(item.tmdbId, seasons)
  }
  return {
    movies,
    shows: [...shows.entries()].map(([tmdbId, seasons]) => ({
      ids: { tmdb: Number(tmdbId) },
      seasons: [...seasons.entries()].map(([number, episodes]) => ({ number, episodes })),
    })),
  }
}

export function buildWatchlistPayload(entries: RemoteEntry[], mediaType: 'show' | 'movie'): object {
  const ids = entries.map((entry) => toIds(entry.tmdbId, entry.imdbId)).filter((x): x is MdblistIds => x != null)
  return mediaType === 'show' ? { shows: ids } : { movies: ids }
}
