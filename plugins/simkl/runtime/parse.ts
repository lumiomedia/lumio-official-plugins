type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => v != null && typeof v === 'object' && !Array.isArray(v)
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)
const idStr = (v: unknown): string | null =>
  typeof v === 'number' && Number.isFinite(v) ? String(v) : typeof v === 'string' && /^\d+$/.test(v) ? v : null
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : null)

export interface Activities {
  /** Topptiden — flyttar sig när något alls ändras. */
  all: string | null
  /** `typ.status` → tid, t.ex. `tv_shows.watching`. */
  buckets: Record<string, string>
}

export function parseActivities(data: unknown): Activities {
  const buckets: Record<string, string> = {}
  if (!isObj(data)) return { all: null, buckets }
  for (const type of ['tv_shows', 'anime', 'movies']) {
    const group = data[type]
    if (!isObj(group)) continue
    for (const [key, value] of Object.entries(group)) if (typeof value === 'string') buckets[`${type}.${key}`] = value
  }
  return { all: str(data.all), buckets }
}

export interface SimklItem {
  kind: 'movie' | 'show' | 'anime'
  /** Anime: `tv`, `movie`, `ova` … — en anime-film har ett TMDb-film-id. */
  animeType: string | null
  status: string | null
  simkl: number | null
  tmdbId: string | null
  imdbId: string | null
  title: string
  lastWatchedAt: string | null
  episodes: Array<{ season: number; episode: number; watchedAt: string | null }>
}

/** `/sync/all-items`-svar. Anime ligger under nyckeln `anime` men wrappas i `show`. `{}` = tomt. */
export function parseAllItems(data: unknown): SimklItem[] {
  if (!isObj(data)) return []
  const out: SimklItem[] = []
  for (const [key, kind, wrap] of [['movies', 'movie', 'movie'], ['shows', 'show', 'show'], ['anime', 'anime', 'show']] as const) {
    const list = data[key]
    if (!Array.isArray(list)) continue
    for (const entry of list) {
      if (!isObj(entry)) continue
      const media = isObj(entry[wrap]) ? entry[wrap] as Obj : {}
      const ids = isObj(media.ids) ? media.ids : {}
      const episodes: SimklItem['episodes'] = []
      for (const season of Array.isArray(entry.seasons) ? entry.seasons : []) {
        if (!isObj(season) || num(season.number) == null) continue
        for (const ep of Array.isArray(season.episodes) ? season.episodes : []) {
          if (!isObj(ep) || num(ep.number) == null) continue
          episodes.push({ season: num(season.number)!, episode: num(ep.number)!, watchedAt: str(ep.watched_at) })
        }
      }
      out.push({
        kind,
        animeType: str(entry.anime_type) ?? str(media.anime_type),
        status: str(entry.status),
        simkl: num(ids.simkl) ?? num(ids.simkl_id),
        tmdbId: idStr(ids.tmdb),
        imdbId: str(ids.imdb),
        title: str(media.title) ?? str(ids.slug) ?? '',
        lastWatchedAt: str(entry.last_watched_at),
        episodes,
      })
    }
  }
  return out
}

export type ListItem = { mediaType: 'movie' | 'tv'; tmdbId: string; imdbId: string | null; title: string; posterUrl: string | null }

/** CDN-filernas trendande i filens ordning; utan tmdb kan Lumio inte slå upp titeln. */
export function parseTrending(data: unknown, mediaType: 'movie' | 'tv'): ListItem[] {
  if (!Array.isArray(data)) return []
  return data.filter(isObj).flatMap((entry) => {
    const ids = isObj(entry.ids) ? entry.ids : {}
    const tmdbId = idStr(ids.tmdb)
    if (!tmdbId) return []
    const type = entry.anime_type === 'movie' ? 'movie' : mediaType
    return [{ mediaType: type, tmdbId, imdbId: str(ids.imdb), title: str(entry.title) ?? tmdbId, posterUrl: null }]
  })
}

/** `/users/settings`: namnet, kontots id (binder synkens snapshot) och planen. */
export function parseUser(data: unknown): { username: string | null; accountKey: string | null; supporter: boolean } {
  if (!isObj(data)) return { username: null, accountKey: null, supporter: false }
  const user = isObj(data.user) ? data.user : {}
  const account = isObj(data.account) ? data.account : {}
  const id = idStr(account.id)
  const username = str(user.name)
  return {
    username,
    accountKey: id ? `id:${id}` : username ? `user:${username}` : null,
    supporter: typeof account.type === 'string' && account.type !== 'free',
  }
}
