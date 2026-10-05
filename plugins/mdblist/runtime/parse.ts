import type { RemoteEntry, RemoteWatched } from './types'

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => v != null && typeof v === 'object' && !Array.isArray(v)
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)
const idStr = (v: unknown): string | null =>
  typeof v === 'number' && Number.isFinite(v) ? String(v) : typeof v === 'string' && /^\d+$/.test(v) ? v : null

/** `accountKey` binder synkens snapshot till kontot: ett annat konto börjar om. */
export function parseUser(data: unknown): { username: string | null; supporter: boolean; accountKey: string | null } {
  if (!isObj(data)) return { username: null, supporter: false, accountKey: null }
  const username = str(data.username) ?? str(data.user_name) ?? str(data.name)
  const id = idStr(data.user_id)
  return {
    username,
    supporter: data.is_supporter === true,
    accountKey: id ? `id:${id}` : username ? `user:${username}` : null,
  }
}

/** Alla satta `*_at`-stämplar utom server_time — vilka som finns styr MDBList, inte vi. */
export function parseActivities(data: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (!isObj(data)) return out
  for (const [key, value] of Object.entries(data)) {
    if (key !== 'server_time' && key.endsWith('_at') && typeof value === 'string') out[key] = value
  }
  return out
}

/** OpenAPI-specen säger `watched_at`; MDBList:s Kodi-klient läser `last_watched_at`. Båda godtas. */
const watchedAtOf = (entry: Obj): string | null => str(entry.watched_at) ?? str(entry.last_watched_at)

export function parseWatched(pages: Record<string, unknown[]>): RemoteWatched {
  const movies: RemoteWatched['movies'] = []
  for (const entry of pages.movies ?? []) {
    if (!isObj(entry)) continue
    const ids = isObj(entry.movie) && isObj(entry.movie.ids) ? entry.movie.ids : {}
    const tmdbId = idStr(ids.tmdb)
    const imdbId = str(ids.imdb)
    if (!tmdbId && !imdbId) continue
    movies.push({ tmdbId, imdbId, watchedAt: watchedAtOf(entry) })
  }
  const episodes: RemoteWatched['episodes'] = []
  for (const entry of pages.episodes ?? []) {
    if (!isObj(entry) || !isObj(entry.episode)) continue
    const ep = entry.episode
    const show = isObj(ep.show) ? ep.show : isObj(entry.show) ? entry.show : {}
    const showIds = isObj(show.ids) ? show.ids : {}
    const tmdbId = idStr(showIds.tmdb)
    if (!tmdbId || typeof ep.season !== 'number' || typeof ep.number !== 'number') continue
    episodes.push({ tmdbId, season: ep.season, episode: ep.number, watchedAt: watchedAtOf(entry) })
  }
  return { movies, episodes }
}

export type MediaItem = { mediaType: 'movie' | 'tv'; tmdbId: string; imdbId: string | null; title: string }

export function parseMediaItems(pages: Record<string, unknown[]>): MediaItem[] {
  const raw = [...(pages.items ?? []), ...(pages.movies ?? []), ...(pages.shows ?? [])]
  const ranked = raw
    .filter(isObj)
    .map((entry, index) => ({ entry, index, rank: typeof entry.rank === 'number' ? entry.rank : Number.MAX_SAFE_INTEGER }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
  const out: MediaItem[] = []
  for (const { entry } of ranked) {
    const ids = isObj(entry.ids) ? entry.ids : {}
    const tmdbId = idStr(entry.id) ?? idStr(entry.tmdb_id) ?? idStr(ids.tmdb)
    if (!tmdbId) continue
    const kind = str(entry.mediatype) ?? str(entry.media_type) ?? str(entry.type)
    out.push({
      mediaType: kind === 'show' || kind === 'tv' || kind === 'series' ? 'tv' : 'movie',
      tmdbId,
      imdbId: str(entry.imdb_id) ?? str(ids.imdb),
      title: str(entry.title) ?? tmdbId,
    })
  }
  return out
}

export function parseWatchlist(pages: Record<string, unknown[]>): { shows: RemoteEntry[]; movies: RemoteEntry[] } {
  const shows: RemoteEntry[] = []
  const movies: RemoteEntry[] = []
  for (const item of parseMediaItems(pages)) {
    const entry = { tmdbId: item.tmdbId, imdbId: item.imdbId, title: item.title, posterUrl: null }
    if (item.mediaType === 'tv') shows.push(entry)
    else movies.push(entry)
  }
  return { shows, movies }
}

export type ListInfo = {
  id: string
  name: string
  description: string | null
  itemCount: number | null
  owner: string | null
  dynamic: boolean
  group?: { id: string; label: { en: string; sv: string } }
}

export function parseLists(data: unknown): ListInfo[] {
  const list = Array.isArray(data) ? data : isObj(data) && Array.isArray(data.lists) ? data.lists : isObj(data) ? [data] : []
  return list.filter(isObj).flatMap((entry) => {
    const id = idStr(entry.id)
    const name = str(entry.name)
    if (!id || !name) return []
    return [{
      id,
      name,
      description: str(entry.description),
      itemCount: typeof entry.items === 'number' ? entry.items : null,
      owner: str(entry.user_name) ?? str(entry.username),
      dynamic: entry.dynamic === true,
    }]
  })
}
