import type { RemoteEntry, ScrobbleEvent, SimklIds } from './types'

export type WatchedPush =
  | { kind: 'movie'; tmdbId: string | null; imdbId: string | null; watchedAt: string }
  | { kind: 'episode'; tmdbId: string; season: number; episode: number; watchedAt: string }

export type ListStatus = 'watching' | 'plantowatch' | 'completed' | 'hold' | 'dropped'

export function toIds(tmdbId: string | null, imdbId: string | null): SimklIds | null {
  const ids: SimklIds = {}
  if (tmdbId != null && /^\d+$/.test(tmdbId)) ids.tmdb = Number(tmdbId)
  if (imdbId && /^tt\d+$/.test(imdbId)) ids.imdb = imdbId
  return ids.tmdb != null || ids.imdb != null ? ids : null
}

/** SIMKL löser serie eller anime själv ur id:na — `show` räcker för båda. */
export function buildScrobblePayload(event: ScrobbleEvent): object | null {
  const ids = toIds(event.tmdbId, event.imdbId)
  if (!ids) return null
  if (event.mediaType === 'movie') return { movie: { ids }, progress: event.progress }
  if (event.season == null || event.episode == null) return null
  return { show: { ids }, episode: { season: event.season, number: event.episode }, progress: event.progress }
}

export function buildHistoryPayload(items: WatchedPush[]): { movies: object[]; shows: object[] } {
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

/** `to` per post — SIMKL avvisar en ensam toppnivå-`to` med 400 empty_field. */
export function buildAddToListPayload(entries: RemoteEntry[], kind: 'show' | 'movie', to: ListStatus): object {
  const list = entries.flatMap((entry) => {
    const ids = toIds(entry.tmdbId, entry.imdbId)
    return ids ? [{ to, ids }] : []
  })
  return kind === 'show' ? { shows: list } : { movies: list }
}

/** Hela posten ur biblioteket (historik, lista, betyg) — bara ids, inga säsonger. */
export function buildRemovePayload(entries: RemoteEntry[], kind: 'show' | 'movie'): object {
  const list = entries.flatMap((entry) => {
    const ids = toIds(entry.tmdbId, entry.imdbId)
    return ids ? [{ ids }] : []
  })
  return kind === 'show' ? { shows: list } : { movies: list }
}
